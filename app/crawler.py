"""Source allowlists, bounded HTTP fetching, and article extraction."""
import asyncio
import html
import json
import re
from datetime import date
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup

from .rules import host_of, keyword_match, selection_level


def text(value):
    return re.sub(r"\s+", " ", html.unescape(str(value))).strip()


def article_url(href, source, allow_alternate=False):
    address = urlsplit(urljoin(source["listingUrl"], html.unescape(href)))
    if address.scheme not in ("http", "https") or host_of(address.geturl()) != host_of(source["url"]):
        return None
    if address.username or address.password or address.port:
        return None
    p, q, k = address.path, parse_qs(address.query), source["kind"]
    keys = []
    def has(key):
        return bool(q.get(key, [""])[0])
    valid = False
    if k == "bosa":
        valid = p == "/news/articleView.html" and bool(re.fullmatch(r"\d+", q.get("idxno", [""])[0]))
        keys = ["idxno"]
    elif k == "gate":
        valid = bool(re.fullmatch(r"/news/\d+", p))
    elif k == "medicaltimes":
        valid = p.lower() == "/main/news/newsview.html" and has("ID")
        keys = ["ID"]
    elif k == "dailypharm":
        valid = bool(re.fullmatch(r"/user/news/\d+", p))
    elif k == "mohw":
        valid = p == "/board.es" and q.get("act") == ["view"] and has("list_no")
        keys = ["mid", "bid", "act", "list_no"]
    elif k == "mfds":
        valid = bool(re.search(r"/brd/m_\d+/view.do$", p)) and has("seq")
        keys = ["seq"]
    elif k == "hira":
        valid = p.endswith("/bbsDummy.do") and has("brdBltNo")
        keys = ["pgmid", "brdScnBltNo", "brdBltNo"]
    elif k in ("nhis", "kha", "sev"):
        valid = q.get("mode") == ["view"] and has("articleNo") and p == urlsplit(source["listingUrl"]).path
        keys = ["mode", "articleNo"]
    elif k == "amc":
        valid = p == "/news/con/detail.do" and has("cntId")
        keys = ["cntId", "pressChk"]
    elif k == "snuh":
        valid = p.endswith("/view.do") and has("bbs_no") and ("/press/" in p or
                (p == "/board/B003/view.do" and (allow_alternate or "/board/B003/list.do" in source["listingUrl"])))
        keys = ["bbs_no", "viewType"]
    elif k == "cmc":
        valid = bool(re.fullmatch(r"/page/board/news/\d+", p))
    elif k == "etnews":
        valid = bool(re.fullmatch(r"/20\d{12}", p))
    elif k == "yna":
        valid = bool(re.fullmatch(r"/view/AKR\d+", p))
    elif k == "yakup":
        valid = p == "/news/index.html" and q.get("mode") == ["view"] and has("nid")
        keys = ["mode", "cat", "cat2", "nid"]
    elif k == "whosaeng":
        valid = bool(re.fullmatch(r"/\d+", p)) or (p.endswith("/read.php") and has("uid"))
        keys = ["uid"]
    elif k == "medipana":
        if p == "/news/articleView.html" and has("idxno"):
            valid, keys = True, ["idxno"]
        elif p.endswith("articleView.php") and has("news_idx"):
            valid, keys = True, ["news_idx"]
        elif p.endswith("article/view.php") and (has("news_idx") or has("idxno")):
            valid, keys = True, ["news_idx", "idxno"]
    if not valid:
        return None
    base = urlsplit(source["url"])
    return urlunsplit((base.scheme, base.netloc, p, urlencode(sorted((key, q[key][0]) for key in keys if has(key))), ""))


class Crawler:
    def __init__(self, client):
        self.client = client

    async def fetch(self, url, source, max_size=750_000, json_response=False):
        async def bounded_fetch():
            target = url
            for _ in range(4):
                address = urlsplit(target)
                if (address.scheme not in ("http", "https") or host_of(target) != host_of(source["url"])
                        or address.username or address.password or address.port):
                    raise ValueError("등록된 정보원 주소가 아닙니다.")
                async with self.client.stream("GET", target, follow_redirects=False,
                        headers={"User-Agent": "SMDNewsMonitor/1.0", "Accept": "application/json" if json_response else "text/html"}) as response:
                    if response.status_code in (301, 302, 303, 307, 308):
                        if "location" not in response.headers:
                            raise ValueError("이동 주소 없음")
                        target = urljoin(target, response.headers["location"])
                        continue
                    if not response.is_success:
                        raise ValueError(f"정보원 HTTP {response.status_code} · 서버가 수집 요청을 받지 못했습니다.")
                    content_type = response.headers.get("content-type", "")
                    if ("json" if json_response else "text/html") not in content_type.lower():
                        raise ValueError("응답 형식이 맞지 않습니다.")
                    data = bytearray()
                    async for chunk in response.aiter_bytes():
                        if len(data) + len(chunk) > max_size:
                            raise ValueError("페이지 크기 제한 초과")
                        data.extend(chunk)
                    charset = re.search(r"charset\s*=\s*[\"']?([\w-]+)", content_type, re.I)
                    if not charset:
                        charset = re.search(r"charset\s*=\s*[\"']?([\w-]+)", data[:4096].decode("ascii", "ignore"), re.I)
                    encoding = charset[1] if charset else "utf-8"
                    if encoding.lower() in ("euc-kr", "ks_c_5601-1987"):
                        encoding = "cp949"
                    result = data.decode(encoding, errors="replace")
                    if len(result) < 5000 and re.search(r"Web Application Firewall page block|웹방화벽|접근이 차단되었습니다|비정상적인 접근으로 인해 차단", result, re.I):
                        raise ValueError("정보원 방화벽에서 접속을 제한했습니다.")
                    return result
            raise ValueError("이동 횟수 제한 초과")
        try:
            return await asyncio.wait_for(bounded_fetch(), 30 if source["kind"] == "mfds" else 15)
        except (TimeoutError, httpx.TimeoutException) as exc:
            raise ValueError("정보원 응답 대기시간 초과") from exc

    async def candidates(self, source):
        try:
            page = await self.fetch(source["listingUrl"], source)
        except (ValueError, httpx.HTTPError):
            if source["id"] != "S001" or not source["listingUrl"].startswith("https:"):
                raise
            page = await self.fetch(source["listingUrl"].replace("https:", "http:", 1), source)
        items = parse_candidates(page, source)
        if not items and source["kind"] == "gate":
            data = json.loads(await self.fetch(urljoin(source["url"], "/section/date?date=&allOfDateFlag=Y"), source, 400_000, True))
            anchors = []
            for day in data.get("list", []):
                for item in day.get("newsList", []):
                    if re.fullmatch(r"\d+", str(item.get("news_id", ""))):
                        anchors.append(f'<a href="/news/{item["news_id"]}">{html.escape(str(item.get("display_title", "")))}</a>')
            items = parse_candidates("".join(anchors), source)
        if not items and source["kind"] == "snuh":
            alternate = {**source, "listingUrl": urljoin(source["url"], "/board/B003/list.do?viewType=true")}
            items = parse_candidates(await self.fetch(alternate["listingUrl"], alternate), alternate)
        if not items:
            raise ValueError("기사 링크를 찾지 못했습니다. 동적 목록·접속 제한·주소 변경 여부를 확인해 주세요.")
        return items

    async def article(self, url, source, title):
        if not article_url(url, source, True):
            raise ValueError("등록된 기사 주소가 아닙니다.")
        return article_details(await self.fetch(url, source), source, title)


def parse_candidates(page, source):
    soup = BeautifulSoup(page, "html.parser")
    if source["kind"] == "etnews":
        soup = soup.select_one(".col_left")
        if soup is None:
            raise ValueError("전자신문 AI·SW 목록 영역을 찾지 못했습니다.")
    for node in soup.select("script,style"):
        node.decompose()
    unique = {}
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if source["kind"] == "snuh" and re.match(r"javascript:viewPage", href, re.I):
            match = re.search(r"viewPage\(['\"](\d+)", href, re.I)
            if match:
                href = f"/board/B003/view.do?bbs_no={match[1]}&viewType=true"
        url = article_url(href, source)
        if not url:
            continue
        heading = a.find(re.compile(r"^(h[1-6]|strong)$"))
        title = text((heading or a).get_text(" ", strip=True))
        attr = a.get("title", "")
        if (len(title) < 8 or source["kind"] == "sev") and attr and not re.search("자세히보기|바로가기|다운로드", attr):
            title = text(re.sub(r"\s*자세히 보기$", "", attr))
        title = re.sub(r"^새글\s*|\s+New\s+\d{4}-\d{2}-\d{2}.*$", "", title, flags=re.I).strip()
        if not 8 <= len(title) <= 220:
            continue
        groups = keyword_match(title, source)
        level = selection_level(groups)
        row = {"title": title, "url": url, "groups": [g["id"] for g in groups],
               "category": groups[0]["category"] if groups else None, "matchLevel": level,
               "priority": {"full": 2, "main": 1, "none": 0}[level]}
        if url not in unique or row["priority"] > unique[url]["priority"]:
            unique[url] = row
    return sorted(unique.values(), key=lambda row: -row["priority"])


def normalized_date(value):
    match = re.search(r"\b(20\d{2})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})(?!\d)", str(value or ""))
    if match:
        try:
            return date(*map(int, match.groups())).isoformat()
        except ValueError:
            pass
    return None


SELECTORS = {
    "bosa": "#article-view-content-div", "gate": ".contarea", "medicaltimes": ".view_cont",
    "dailypharm": "#newsContent", "mohw": ".board_view .contents", "mfds": ".bv_cont",
    "hira": ".viewCont .view", "nhis": ".post-content", "kha": ".board-view__txt",
    "sev": ".fr-view", "amc": ".editArea", "yakup": ".article_text_con", "yna": ".story-news",
    "medipana": "#articleBody, #article-view-content-div, .article-content",
    "whosaeng": "#textinput, #news_body_area, .news_body", "etnews": "#articleBody",
    "snuh": ".boardViewContents, .viewContent", "cmc": ".board-view__txt, .board-view-content",
}
DATE_SELECTORS = {"gate": ".newsinfo", "medicaltimes": ".date_info", "mohw": ".board_view .info",
                  "mfds": ".bv_txt01, .bv_info", "hira": ".viewCont .writer", "amc": ".contViewTit",
                  "yakup": ".info_con", "whosaeng": ".view_info"}
SUBTITLE_SELECTORS = {"bosa": ".article-head-sub", "gate": ".subtxt", "medicaltimes": ".subTit", "yakup": ".sstitle_con"}


def article_details(page, source, title=""):
    soup = BeautifulSoup(page, "html.parser")
    published = None
    for meta in soup.find_all("meta"):
        if (meta.get("property") or meta.get("name")) in ("article:published_time", "date", "datePublished", "pubdate"):
            published = normalized_date(meta.get("content"))
            if published:
                break
    if not published:
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                value = json.loads(script.string or script.get_text())
                queue = value[:] if isinstance(value, list) else [value]
                for item in queue:
                    if not isinstance(item, dict):
                        continue
                    queue.extend(item.get("@graph", []))
                    if re.search("NewsArticle|Article|ReportageNewsArticle", str(item.get("@type", ""))):
                        published = normalized_date(item.get("datePublished"))
                        if published:
                            break
            except (ValueError, TypeError):
                continue
            if published:
                break
    for node in soup.select("script,style,iframe,noscript"):
        node.decompose()
    if not published:
        header = soup.select_one(DATE_SELECTORS.get(source["kind"], "time"))
        header_text = text(header.get_text(" ")) if header else ""
        if source["kind"] == "gate":
            short = re.search(r"기사입력시간\s*(\d{2}[./-]\d{2}[./-]\d{2})", header_text)
            if short:
                header_text = "20" + short[1]
        published = normalized_date(header_text)
        if not published and source["kind"] == "mfds":
            registered = re.search(r"등록일\s*[:：]?\s*(20\d{2}[-.]\d{1,2}[-.]\d{1,2})", soup.get_text(" "))
            published = normalized_date(registered[1]) if registered else None
    section = None
    for node in soup.select(SELECTORS.get(source["kind"], "article")):
        section = node
        if len(text(node.get_text(" "))) >= 50:
            break
    if section is None:
        raise ValueError("공개 본문을 찾지 못했습니다. 페이지 구조를 확인해 주세요.")
    fold = lambda value: re.sub(r"[\W_]", "", value, flags=re.UNICODE)
    for p in section.find_all("p"):
        if (title and fold(text(p.get_text(" "))) == fold(title)) or (source["kind"] in ("hira", "mohw", "mfds") and re.search(r"text-align\s*:\s*center", p.get("style", ""), re.I)):
            p.decompose()
    body = text(section.get_text(" "))
    if len(body) < 50 or len(re.findall("[가-힣]", body)) < 15:
        raise ValueError("공개 본문을 찾지 못했습니다. 첨부파일·로그인·동적 본문 여부를 확인해 주세요.")
    if len(body) > 20_000:
        raise ValueError("본문 20,000자 제한을 초과했습니다.")
    subtitle_node = soup.select_one(SUBTITLE_SELECTORS.get(source["kind"], ".smd-no-subtitle"))
    subtitle = text(subtitle_node.get_text(" "))[:400] if subtitle_node else ""
    for node in section.select("figure,figcaption"):
        node.decompose()
    def valid(value):
        return len(value) >= 8 and not re.match(r"^(사진|자료|출처)\s*[=:：]|^\[[^\]]+\]$", value)
    first = ""
    for p in section.find_all("p"):
        if re.search("caption|photo|credit", str(p.attrs), re.I):
            continue
        value = text(p.get_text(" "))
        if valid(value):
            first = value
            break
    if not first:
        first = next((value for part in section.get_text("\n").splitlines() if valid(value := text(part))), "")
    if not first:
        raise ValueError("첫 문단을 확인하지 못했습니다.")
    if not published:
        raise ValueError("발행일을 확인하지 못했습니다. 기사 날짜 영역을 확인해 주세요.")
    return {"date": published, "body": body, "excerpt": {"format": "excerpt", "excerpt_version": 2,
            "subtitle": subtitle, "first_paragraph": first if len(first) <= 300 else first[:299].rstrip() + "…"}}
