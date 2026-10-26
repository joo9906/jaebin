import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from .ai_summary import summarize, weekly_report
from .briefing import build_briefing, send_briefing
from .crawler import Crawler
from .rules import article_tags, host_of, keyword_match, selection, selection_level
from .settings import CONFIG, SOURCE_BY_ID, SOURCES, automation_settings

log = logging.getLogger(__name__)
KST = timezone(timedelta(hours=9))


def parse_excerpt(value):
    try:
        result = json.loads(value)
        if isinstance(result, dict) and result.get("format") == "excerpt":
            return result
    except (ValueError, TypeError):
        pass
    return {"format": "excerpt", "subtitle": "", "first_paragraph": ""}


def dumps(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


class NewsService:
    def __init__(self, db, client):
        self.db = db
        self.client = client
        self.crawler = Crawler(client)
        self.local_lock = asyncio.Lock()

    @asynccontextmanager
    async def collector_lock(self):
        if self.local_lock.locked():
            raise ValueError("다른 수집 작업이 실행 중입니다. 잠시 후 다시 시도해 주세요.")
        async with self.local_lock:
            token = uuid.uuid4().hex
            now = time.time()
            claimed = self.db.first("UPDATE monitor_control SET lock_token=?,lock_until=? WHERE id=1 AND lock_until<=? RETURNING id", (token, now + 120, now))
            if not claimed:
                raise ValueError("다른 수집 작업이 실행 중입니다. 잠시 후 다시 시도해 주세요.")
            try:
                yield
            finally:
                self.db.execute("UPDATE monitor_control SET lock_token='',lock_until=0 WHERE id=1 AND lock_token=?", (token,))

    async def collect_source(self, source, scheduled=False):
        db = self.db
        db.execute("DELETE FROM news_candidates WHERE expires_at<=CURRENT_TIMESTAMP")
        db.execute("DELETE FROM collection_runs WHERE started_at<=datetime('now','-7 days')")
        if not scheduled and db.first("SELECT id FROM collection_runs WHERE source_id=? AND source_name=? AND started_at>datetime('now','-10 minutes')", (source["id"], source["name"])):
            raise ValueError("같은 정보원은 10분 후 다시 수집할 수 있습니다.")
        run_id = db.execute("INSERT INTO collection_runs(source_id,source_name) VALUES(?,?)", (source["id"], source["name"]))
        try:
            items = await self.crawler.candidates(source)
            matched = [a for a in items if a["groups"]][:30]
            saved = selected = 0
            with db.connect() as connection:
                known = {r[0] for r in connection.execute("SELECT url FROM news_candidates")}
                available = max(0, 500 - len(known))
                for a in matched:
                    is_new = a["url"] not in known
                    if is_new and available <= 0:
                        continue
                    if is_new:
                        available -= 1
                        saved += 1
                    selected += 1
                    snippet = dumps({"match_level": a["matchLevel"], "config_version": ""})
                    connection.execute("""INSERT INTO news_candidates(source_id,source_name,title,url,suggested_category,matched_keyword_groups_json,snippet)
                        VALUES(?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET
                        source_id=excluded.source_id,source_name=excluded.source_name,title=excluded.title,
                        suggested_category=excluded.suggested_category,matched_keyword_groups_json=excluded.matched_keyword_groups_json,
                        snippet=CASE WHEN news_candidates.fetch_status='success' THEN news_candidates.snippet ELSE excluded.snippet END,
                        processing_status='pending',fetch_status=CASE WHEN news_candidates.fetch_status='error' THEN 'pending' ELSE news_candidates.fetch_status END,
                        last_collected_at=CURRENT_TIMESTAMP,expires_at=datetime('now','+7 days')""",
                        (source["id"], source["name"], a["title"], a["url"], a["category"], dumps(a["groups"]), snippet))
                connection.execute("UPDATE collection_runs SET finished_at=CURRENT_TIMESTAMP,run_status='success',found_count=?,saved_count=? WHERE id=?", (len(items), saved, run_id))
            return {"source": source.get("label", source["name"]), "found": len(items), "selected": selected,
                    "saved": saved, "lists": 1, "warning": "후보 저장 상한 500건으로 일부 새 기사를 저장하지 못했습니다." if selected < len(matched) else ""}
        except Exception as exc:
            db.execute("UPDATE collection_runs SET finished_at=CURRENT_TIMESTAMP,run_status='error',error_message=? WHERE id=?", (str(exc)[:300], run_id))
            raise

    def pending(self, source, article_id=None):
        return self.db.first("""SELECT * FROM news_candidates WHERE source_id=? AND source_name=?
            AND (? IS NULL OR id=?) AND expires_at>CURRENT_TIMESTAMP AND processing_status='pending'
            AND (fetch_status='pending' OR (fetch_status='success' AND snippet NOT LIKE ?))
            AND (body_fetched_at IS NULL OR body_fetched_at<=datetime('now','-1 minute'))
            ORDER BY CASE WHEN snippet LIKE '%"match_level":"full"%' THEN 0 ELSE 1 END,first_collected_at,id LIMIT 1""",
            (source["id"], source["name"], article_id, article_id, '%"config_version":"' + CONFIG["version"] + '"%'))

    async def read_body(self, source, article_id=None):
        candidate = self.pending(source, article_id)
        if not candidate:
            return {"message": "처리할 기사 없음"}
        groups = keyword_match(candidate["title"], source)
        if not groups:
            self.db.execute("UPDATE news_candidates SET processing_status='excluded' WHERE id=?", (candidate["id"],))
            return {"skipped": True}
        self.db.execute("UPDATE news_candidates SET body_fetched_at=CURRENT_TIMESTAMP WHERE id=?", (candidate["id"],))
        try:
            cached = parse_excerpt(candidate["snippet"])
            if cached.get("first_paragraph") and candidate["published_date"]:
                detail = {"date": candidate["published_date"], "body": candidate["body_text"], "excerpt": cached}
            else:
                detail = await self.crawler.article(candidate["url"], source, candidate["title"])
            if not detail.get("date") or not detail["excerpt"].get("first_paragraph"):
                raise ValueError("발행일 또는 첫 문단을 확인하지 못했습니다.")
            excerpt = {**detail["excerpt"], "source_id": source["id"], "config_version": CONFIG["version"], "match_level": selection_level(groups)}
            # 아직 AI 요약이 없는 기사만 GPT에 요약을 요청합니다.
            if not excerpt.get("ai_summary"):
                excerpt["ai_summary"] = await summarize(self.client, candidate["title"], detail["body"])
            # 게시와 후보 갱신을 한 트랜잭션으로 처리합니다.
            with self.db.connect() as connection:
                connection.execute("""INSERT INTO articles(category,entity,published_date,source,title,url,summary,tags_json)
                    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET category=excluded.category,entity=excluded.entity,
                    published_date=excluded.published_date,source=excluded.source,title=excluded.title,summary=excluded.summary,
                    tags_json=excluded.tags_json,is_sample=0,updated_at=CURRENT_TIMESTAMP""",
                    (groups[0]["category"], groups[0]["mainMatches"][0], detail["date"], source["name"], candidate["title"], candidate["url"], dumps(excerpt), dumps(article_tags(groups))))
                connection.execute("""UPDATE news_candidates SET published_date=?,body_text=?,snippet=?,fetch_status='success',
                    fetch_error='',body_fetched_at=CURRENT_TIMESTAMP,suggested_category=?,matched_keyword_groups_json=? WHERE id=?""",
                    (detail["date"], detail["body"], dumps(excerpt), groups[0]["category"], dumps([g["id"] for g in groups]), candidate["id"]))
            error = ""
        except Exception as exc:
            log.warning("Article extraction failed: %s: %s", candidate["url"], exc)
            error = str(exc)[:300]
            self.db.execute("UPDATE news_candidates SET fetch_status='error',fetch_error=?,body_fetched_at=CURRENT_TIMESTAMP WHERE id=?", (error, candidate["id"]))
            detail = {"date": None}
        return {"source": source.get("label", source["name"]), "title": candidate["title"], "published_date": detail["date"],
                "groups": [g["id"] for g in groups], "error": error}

    def candidates(self, source_id=None):
        source = SOURCE_BY_ID.get(source_id)
        sql = "SELECT *,LENGTH(body_text) AS body_length FROM news_candidates WHERE expires_at>CURRENT_TIMESTAMP"
        args = ()
        if source:
            sql += " AND source_id=? AND source_name=?"
            args = (source_id, source["name"])
        rows = self.db.all(sql + " ORDER BY first_collected_at DESC,id DESC LIMIT 50", args)
        result = []
        for row in rows:
            current = SOURCE_BY_ID.get(row["source_id"])
            if not current or current["name"] != row["source_name"] or host_of(row["url"]) != host_of(current["url"]):
                continue
            chosen = selection(row["title"], current)
            if chosen["selected"]:
                row.pop("body_text", None)
                result.append({**row, "selection": chosen, "excerpt": parse_excerpt(row["snippet"])})
        return result

    def articles(self):
        # 숨긴 기사(hidden)도 함께 보내고, 화면에서 보일지 말지 정합니다.
        rows = self.db.all("SELECT * FROM articles WHERE review_status IN ('published','hidden') AND is_sample=0 ORDER BY published_date DESC,id DESC")
        result = []
        for row in rows:
            excerpt = parse_excerpt(row["summary"])
            if not excerpt.get("first_paragraph"):
                continue
            sources = [s for s in SOURCES if host_of(row["url"]) == host_of(s["url"]) and
                       (s["id"] == excerpt.get("source_id") or s["name"] == row["source"])]
            sources.sort(key=lambda s: s["id"] != excerpt.get("source_id"))
            groups = next((g for s in sources if (g := keyword_match(row["title"], s))), [])
            if not groups:
                continue
            result.append({"id": row["id"], "category": groups[0]["category"], "match_level": selection_level(groups),
                           "entity": groups[0]["mainMatches"][0], "date": row["published_date"], "source": row["source"],
                           "title": row["title"], "url": row["url"], "subtitle": excerpt.get("subtitle", ""),
                           "summary": excerpt["first_paragraph"], "ai_summary": excerpt.get("ai_summary", ""), "tags": article_tags(groups), "track": None,
                           "is_sample": 0, "content_type": "excerpt",
                           "starred": row["starred"], "memo": row["memo"],
                           "hidden": row["review_status"] == "hidden", "saved_at": row["created_at"]})
            if len(result) == 200:
                break
        return result

    def set_star(self, article_id, starred):
        self.db.execute("UPDATE articles SET starred=? WHERE id=?", (1 if starred else 0, article_id))

    def set_memo(self, article_id, memo):
        self.db.execute("UPDATE articles SET memo=? WHERE id=?", (memo, article_id))

    def set_hidden(self, article_id, hidden):
        self.db.execute("UPDATE articles SET review_status=? WHERE id=?", ("hidden" if hidden else "published", article_id))

    def visible_articles(self):
        """숨기지 않은 기사만 돌려줍니다. (CSV·브리핑·주간 리포트용)"""
        return [a for a in self.articles() if not a["hidden"]]

    async def make_weekly_report(self, day):
        """최근 7일 기사로 GPT 주간 리포트를 만듭니다. ⭐ 기사가 있으면 그것만 씁니다."""
        since = (datetime.fromisoformat(day) - timedelta(days=6)).date().isoformat()
        week = [a for a in self.visible_articles() if a["date"] >= since and a["match_level"] != "main"]
        starred = [a for a in week if a["starred"]]
        # 비용을 줄이기 위해 최대 30건만 보냅니다.
        chosen = (starred or week)[:30]
        if not chosen:
            return {"error": "최근 7일 동안 리포트에 쓸 기사가 없습니다."}
        text = await weekly_report(self.client, chosen)
        if not text:
            return {"error": "리포트를 만들지 못했습니다. OPENAI_API_KEY 설정과 인터넷 연결을 확인해 주세요."}
        return {"report": text, "article_count": len(chosen), "only_starred": bool(starred), "since": since, "until": day}

    async def send_daily_briefing(self, day):
        """오늘 아직 브리핑을 안 보냈다면 웹훅으로 보냅니다. 보냈으면 True."""
        if not os.getenv("BRIEFING_WEBHOOK_URL", "").strip():
            return False
        control = self.db.first("SELECT briefing_day FROM monitor_control WHERE id=1")
        if control["briefing_day"] == day:
            return False
        # 실패해도 1분마다 다시 보내지 않도록, 보내기 전에 오늘 날짜를 먼저 기록합니다. (하루 한 번만 시도)
        self.db.execute("UPDATE monitor_control SET briefing_day=? WHERE id=1", (day,))
        return await send_briefing(self.client, build_briefing(self.visible_articles(), day))

    def automation_sources(self):
        return [SOURCE_BY_ID[s] for s in CONFIG["auto_order"] if s in SOURCE_BY_ID][:automation_settings()["sourceLimit"]]

    def automation_status(self):
        settings, sources = automation_settings(), self.automation_sources()
        day = datetime.now(KST).date().isoformat()
        control = self.db.first("SELECT * FROM monitor_control WHERE id=1")
        jobs = self.db.all("SELECT * FROM monitor_jobs WHERE run_day=? ORDER BY started_at DESC,job_key DESC", (day,))
        active = {s["id"] for s in sources}
        recent = [{**j, "source": SOURCE_BY_ID.get(j["source_id"], {}).get("label", j["source_id"])} for j in jobs[:8]]
        return {"setupRequired": False, "settings": settings, "day": day, "paused": control["pause_day"] == day,
                "last_tick": control["last_tick"], "last_message": control["last_message"], "source_count": len(sources),
                "sources": [s.get("label", s["name"]) for s in sources],
                "lists_done": sum(j["kind"] == "list" and j["source_id"] in active for j in jobs),
                "bodies_done": sum(j["kind"] == "body" for j in jobs),
                "failed": sum(j["status"] in ("error", "aborted") for j in jobs), "recent": recent}

    async def scheduled_step(self, manual=False, now=None):
        clock = now or datetime.now(KST)
        day, settings = clock.date().isoformat(), automation_settings()
        if not manual and not settings["enabled"]:
            return {"status": "disabled", "message": "자동 수집 꺼짐"}
        if not manual and clock.hour < 7:
            return {"status": "waiting", "message": "한국시간 오전 7시부터 처리합니다."}
        async with self.collector_lock():
            db = self.db
            db.execute("UPDATE monitor_jobs SET status='aborted',finished_at=CURRENT_TIMESTAMP,message='이전 작업 중단' WHERE status='running' AND started_at<=datetime('now','-3 minutes')")
            db.execute("DELETE FROM monitor_jobs WHERE run_day<date(?,'-7 days')", (day,))
            control = db.first("SELECT * FROM monitor_control WHERE id=1")
            daily = db.all("SELECT * FROM monitor_jobs WHERE run_day=?", (day,))
            if control["pause_day"] == day:
                return {"status": "paused", "message": "오늘 자동 수집이 중지되어 있습니다."}
            if sum(j["status"] in ("error", "aborted") for j in daily) >= 10:
                db.execute("UPDATE monitor_control SET pause_day=?,last_tick=CURRENT_TIMESTAMP,last_message='하루 실패 10회로 중지' WHERE id=1", (day,))
                return {"status": "paused", "message": "하루 실패 10회로 중지"}
            sources = self.automation_sources()
            source = next((s for s in sources if not any(j["kind"] == "list" and j["source_id"] == s["id"] for j in daily)), None)
            kind, candidate = "list", None
            if source is None:
                if sum(j["kind"] == "body" for j in daily) >= settings["maxBodies"]:
                    # 하루 처리 상한에 걸려도 오늘 수집은 끝난 것이므로 브리핑을 보냅니다.
                    await self.send_daily_briefing(day)
                    return {"status": "limit", "message": "오늘 기사 처리 상한에 도달했습니다."}
                kind = "body"
                for s in sources:
                    if sum(j["source_id"] == s["id"] and j["status"] in ("error", "aborted") for j in daily) >= 3:
                        continue
                    # 같은 날 이미 시도한 후보는 제외하고 다음 후보를 찾습니다.
                    rows = db.all("""SELECT id FROM news_candidates WHERE source_id=? AND source_name=?
                        AND expires_at>CURRENT_TIMESTAMP AND processing_status='pending'
                        AND (fetch_status='pending' OR (fetch_status='success' AND snippet NOT LIKE ?))
                        AND (body_fetched_at IS NULL OR body_fetched_at<=datetime('now','-1 minute'))
                        AND NOT EXISTS(SELECT 1 FROM monitor_jobs j WHERE j.run_day=? AND j.kind='body' AND j.article_id=news_candidates.id)
                        ORDER BY CASE WHEN snippet LIKE '%"match_level":"full"%' THEN 0 ELSE 1 END,first_collected_at,id LIMIT 1""",
                        (s["id"], s["name"], '%"config_version":"' + CONFIG["version"] + '"%', day))
                    if rows:
                        source, candidate = s, rows[0]
                        break
                if source is None:
                    # 오늘 할 수집이 모두 끝났으니 아침 브리핑을 보냅니다.
                    await self.send_daily_briefing(day)
                    db.execute("UPDATE monitor_control SET last_tick=CURRENT_TIMESTAMP,last_message='처리할 작업 없음' WHERE id=1")
                    return {"status": "idle", "message": "처리할 작업 없음"}
            key = f'{day}:{kind}:{candidate["id"] if candidate else source["id"]}'
            claimed = db.first("INSERT OR IGNORE INTO monitor_jobs(job_key,run_day,kind,source_id,article_id,status) VALUES(?,?,?,?,?,'running') RETURNING job_key", (key, day, kind, source["id"], candidate["id"] if candidate else None))
            if not claimed:
                return {"status": "skipped", "message": "이미 처리한 작업"}
            db.execute("UPDATE monitor_control SET last_tick=CURRENT_TIMESTAMP,last_message=? WHERE id=1", (source["name"] + " · 처리 중",))
            try:
                result = await self.collect_source(source, True) if kind == "list" else await self.read_body(source, candidate["id"])
                message = result.get("error") or result.get("warning") or result.get("message") or (f'목록 확인 완료 · 새 기사 {result["saved"]}건' if kind == "list" else "기사 확인 완료")
                status = "error" if result.get("error") else "skipped" if result.get("skipped") or result.get("message") else "success"
            except Exception as exc:
                status, message = "error", str(exc)[:300]
            db.execute("UPDATE monitor_jobs SET status=?,message=?,finished_at=CURRENT_TIMESTAMP WHERE job_key=?", (status, message, key))
            db.execute("UPDATE monitor_control SET last_message=? WHERE id=1", (source["name"] + " · " + message,))
            return {"status": status, "kind": kind, "source": source.get("label", source["name"]), "message": message}
