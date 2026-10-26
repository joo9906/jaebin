import asyncio
import json
import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.crawler import article_details, article_url, normalized_date
from app.main import create_app
from app.rules import has_word, keyword_match
from app.service import KST
from app.settings import SOURCE_BY_ID

TITLE = "캐논메디칼 MRI 장비 도입 및 연구 협력 발표"
BODY = "캐논메디칼은 새로운 자기공명영상 장비를 도입하고 환자의 검사 시간을 단축하기 위한 진료 서비스를 시작했다고 밝혔습니다."
LISTING = f'<html><a href="/news/articleView.html?idxno=123&utm_source=test">{TITLE}</a></html>'
AI_SUMMARY = "- MRI 장비 도입\n시사점: 검사 시간 단축 사례"
ARTICLE = f'<html><meta property="article:published_time" content="2026-10-24T07:00:00+09:00"><div class="article-head-sub">새로운 장비 도입</div><div id="article-view-content-div"><p>{BODY}</p></div></html>'


class AppTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.db_path = Path(self.directory.name) / "news.db"
        self.requests = []
        self.article = ARTICLE

        def transport(request):
            self.requests.append(str(request.url))
            if request.url.host == "hooks-fail.example.com":
                return httpx.Response(500)
            if request.url.host == "api.openai.com":
                return httpx.Response(200, json={"choices": [{"message": {"content": AI_SUMMARY}}]})
            content = self.article if request.url.path == "/news/articleView.html" else LISTING
            return httpx.Response(200, text=content, headers={"content-type": "text/html; charset=utf-8"})

        self.client_http = httpx.AsyncClient(transport=httpx.MockTransport(transport))
        self.app = create_app(self.db_path, self.client_http, run_scheduler=False)
        self.client = TestClient(self.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        asyncio.run(self.client_http.aclose())
        self.directory.cleanup()

    def post(self, path, **payload):
        return self.client.post(path, json=payload)

    def test_home_and_assets(self):
        page = self.client.get("/")
        self.assertEqual(page.status_code, 200)
        self.assertIn("SMD 뉴스 클리핑", page.text)
        self.assertNotIn("940875", page.text)
        for asset in ("articles.js", "automation.js", "collect.js", "style.css"):
            self.assertEqual(self.client.get("/static/" + asset).status_code, 200)
        self.assertEqual(self.client.head("/").content, b"")
        self.assertEqual(self.client.get("/api/health").json()["storage"], "SQLite")

    def test_collect_publish_and_deduplicate(self):
        collected = self.post("/api/collect", source_id="S012")
        self.assertEqual(collected.status_code, 200, collected.text)
        self.assertEqual(collected.json()["saved"], 1)
        self.assertEqual(self.post("/api/collect", source_id="S012").status_code, 409)
        read = self.post("/api/read-body", source_id="S012").json()
        self.assertEqual(read["error"], "")
        articles = self.client.get("/api/articles").json()
        self.assertEqual(articles["count"], 1)
        self.assertEqual(articles["articles"][0]["summary"], BODY)
        self.assertEqual(articles["articles"][0]["category"], "company")
        self.assertEqual(self.post("/api/read-body", source_id="S012").json()["message"], "처리할 기사 없음")
        candidates = self.client.get("/api/candidates?source_id=S012").json()["candidates"]
        self.assertEqual(candidates[0]["fetch_status"], "success")
        self.assertNotIn("body_text", candidates[0])
        # 서버를 다시 열어도 같은 SQLite 파일의 기사가 유지됩니다.
        with TestClient(create_app(self.db_path, self.client_http, run_scheduler=False)) as other:
            self.assertEqual(other.get("/api/articles").json()["count"], 1)

    def test_ai_summary(self):
        # API 키가 있으면 GPT 요약이 저장되고, 없으면 빈 요약으로 기사만 저장됩니다.
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            self.post("/api/collect", source_id="S012")
            self.post("/api/read-body", source_id="S012")
        article = self.client.get("/api/articles").json()["articles"][0]
        self.assertEqual(article["ai_summary"], AI_SUMMARY)
        self.assertTrue(any("api.openai.com" in url for url in self.requests))

    def test_no_api_key_skips_ai_summary(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            self.post("/api/collect", source_id="S012")
            self.post("/api/read-body", source_id="S012")
        self.assertEqual(self.client.get("/api/articles").json()["articles"][0]["ai_summary"], "")
        self.assertFalse(any("api.openai.com" in url for url in self.requests))

    def test_missing_date_is_error_and_can_retry_after_collection(self):
        self.article = ARTICLE.replace('property="article:published_time"', 'property="ignored"')
        self.post("/api/collect", source_id="S012")
        result = self.post("/api/read-body", source_id="S012").json()
        self.assertIn("발행일", result["error"])
        self.assertEqual(self.client.get("/api/articles").json()["count"], 0)
        db = self.app.state.service.db
        self.assertEqual(db.first("SELECT fetch_status FROM news_candidates")["fetch_status"], "error")
        self.article = ARTICLE
        db.execute("UPDATE collection_runs SET started_at=datetime('now','-11 minutes')")
        db.execute("UPDATE news_candidates SET body_fetched_at=NULL")
        self.post("/api/collect", source_id="S012")
        self.assertEqual(self.post("/api/read-body", source_id="S012").json()["error"], "")

    def test_input_validation_and_cross_origin(self):
        self.assertEqual(self.post("/api/collect", source_id="unknown").status_code, 400)
        self.assertEqual(self.client.get("/api/candidates?source_id=unknown").status_code, 400)
        self.assertEqual(self.client.post("/api/collect", json=[], headers={"Origin": "http://testserver"}).status_code, 400)
        self.assertEqual(self.client.post("/api/collect", json={}, headers={"Origin": "https://evil.example"}).status_code, 403)
        self.assertEqual(self.client.post("/api/collect", content="{", headers={"Content-Type": "application/json"}).status_code, 400)
        self.assertEqual(self.client.post("/api/collect", json={"source_id": "x" * 250}).status_code, 413)

    def test_automation_one_step_and_limits(self):
        with patch.dict(os.environ, {"AUTO_ENABLED": "false", "AUTO_SOURCE_LIMIT": "1"}):
            status = self.client.get("/api/automation-status").json()
            self.assertFalse(status["settings"]["enabled"])
            self.assertEqual(status["source_count"], 1)
            first = self.post("/api/automation-step").json()
            self.assertEqual(first["kind"], "list")
            second = self.post("/api/automation-step").json()
            self.assertEqual(second["kind"], "body")
            third = self.post("/api/automation-step").json()
            self.assertEqual(third["status"], "idle")
            status = self.client.get("/api/automation-status").json()
            self.assertEqual((status["lists_done"], status["bodies_done"]), (1, 1))
            self.assertEqual(self.client.get("/api/articles").json()["count"], 1)

    def test_disabled_and_before_seven(self):
        with patch.dict(os.environ, {"AUTO_ENABLED": "false"}):
            result = self.client.portal.call(self.app.state.service.scheduled_step)
            self.assertEqual(result["status"], "disabled")
        with patch.dict(os.environ, {"AUTO_ENABLED": "true"}):
            result = self.client.portal.call(self.app.state.service.scheduled_step, False, datetime(2026, 10, 24, 6, tzinfo=KST))
            self.assertEqual(result["status"], "waiting")

    def collect_one_article(self):
        self.post("/api/collect", source_id="S012")
        self.post("/api/read-body", source_id="S012")
        return self.client.get("/api/articles").json()["articles"][0]

    def test_csv_export(self):
        self.collect_one_article()
        response = self.client.get("/api/export.csv")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.content.startswith("﻿".encode("utf-8")))
        self.assertIn(TITLE, response.text)

    def test_star_and_memo(self):
        article = self.collect_one_article()
        self.assertEqual(article["starred"], 0)
        self.assertEqual(self.post("/api/article-star", id=article["id"], starred=True).status_code, 200)
        self.assertEqual(self.post("/api/article-memo", id=article["id"], memo="회의 때 공유").status_code, 200)
        saved = self.client.get("/api/articles").json()["articles"][0]
        self.assertEqual((saved["starred"], saved["memo"]), (1, "회의 때 공유"))
        self.assertIn("회의 때 공유", self.client.get("/api/export.csv").text)
        self.assertEqual(self.post("/api/article-star", id="x", starred=True).status_code, 400)
        self.assertEqual(self.post("/api/article-memo", id=article["id"], memo=5).status_code, 400)

    def test_hide_and_show_again(self):
        article = self.collect_one_article()
        self.assertFalse(article["hidden"])
        self.assertTrue(article["saved_at"])
        self.assertEqual(self.post("/api/article-hide", id=article["id"], hidden=True).status_code, 200)
        self.assertTrue(self.client.get("/api/articles").json()["articles"][0]["hidden"])
        # 숨긴 기사는 CSV에 나오지 않습니다.
        self.assertNotIn(TITLE, self.client.get("/api/export.csv").text)
        self.post("/api/article-hide", id=article["id"], hidden=False)
        self.assertFalse(self.client.get("/api/articles").json()["articles"][0]["hidden"])
        self.assertEqual(self.post("/api/article-hide", id=article["id"], hidden="yes").status_code, 400)

    def test_weekly_report(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            self.collect_one_article()
            # 테스트 기사 날짜(2026-10-24) 기준 주간이 되도록 날짜를 정해 부릅니다.
            result = self.client.portal.call(self.app.state.service.make_weekly_report, "2026-10-26")
        self.assertEqual(result["article_count"], 1)
        self.assertEqual(result["report"], AI_SUMMARY)

    def test_weekly_report_without_key_or_articles(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            response = self.post("/api/weekly-report")
            self.assertEqual(response.status_code, 503)
            self.collect_one_article()
            result = self.client.portal.call(self.app.state.service.make_weekly_report, "2026-10-26")
        self.assertIn("OPENAI_API_KEY", result["error"])

    def test_daily_briefing_sent_once(self):
        with patch.dict(os.environ, {"AUTO_SOURCE_LIMIT": "1", "BRIEFING_WEBHOOK_URL": "https://hooks.example.com/test"}):
            for _ in range(5):
                self.post("/api/automation-step")
        self.assertEqual(sum("hooks.example.com" in url for url in self.requests), 1)

    def test_failed_briefing_is_not_retried_every_minute(self):
        with patch.dict(os.environ, {"AUTO_SOURCE_LIMIT": "1", "BRIEFING_WEBHOOK_URL": "https://hooks-fail.example.com/test"}):
            for _ in range(5):
                self.post("/api/automation-step")
        self.assertEqual(sum("hooks-fail.example.com" in url for url in self.requests), 1)

    def test_csv_cells_are_not_formulas(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            article = self.collect_one_article()
        self.post("/api/article-memo", id=article["id"], memo="=1+1")
        text = self.client.get("/api/export.csv").text
        self.assertIn("• MRI 장비 도입", text)
        self.assertIn("'=1+1", text)

    def test_lock_released_on_failure(self):
        async def check():
            service = self.app.state.service
            with self.assertRaises(RuntimeError):
                async with service.collector_lock():
                    with self.assertRaises(ValueError):
                        async with service.collector_lock():
                            pass
                    raise RuntimeError("failure")
            async with service.collector_lock():
                pass
        self.client.portal.call(check)


class ParserTests(unittest.TestCase):
    def test_title_rules_match_original_priority(self):
        self.assertTrue(has_word("MRI 도입", "MRI"))
        self.assertFalse(has_word("GEOMETRY", "GE"))
        source = SOURCE_BY_ID["S012"]
        self.assertEqual(keyword_match("캐논메디칼 지멘스 MRI 협력", source)[0]["category"], "competitor")
        self.assertFalse(keyword_match("캐논메디칼 프린터 공개", source))
        self.assertEqual(keyword_match("캐논메디칼 소식", source)[0]["matchLevel"], "main")

    def test_url_allowlist_and_canonicalization(self):
        source = SOURCE_BY_ID["S012"]
        self.assertEqual(article_url("/news/articleView.html?utm_source=x&idxno=123", source), "https://www.docdocdoc.co.kr/news/articleView.html?idxno=123")
        for url in ("https://evil.example/news/articleView.html?idxno=123", "javascript:alert(1)", "https://www.docdocdoc.co.kr:9000/news/articleView.html?idxno=123"):
            self.assertIsNone(article_url(url, source))

    def test_extraction_and_dates(self):
        result = article_details(ARTICLE, SOURCE_BY_ID["S012"], TITLE)
        self.assertEqual(result["date"], "2026-10-24")
        self.assertEqual(result["excerpt"]["subtitle"], "새로운 장비 도입")
        self.assertIsNone(normalized_date("2026-02-30"))
        self.assertEqual(normalized_date("2026. 1. 2"), "2026-01-02")


if __name__ == "__main__":
    unittest.main()
