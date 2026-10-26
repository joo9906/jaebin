import asyncio
import csv
import io
import json
import logging
import os
from contextlib import asynccontextmanager, suppress
from datetime import datetime
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException

from .db import Database
from .service import KST, NewsService
from .settings import CONFIG, ROOT, SOURCE_BY_ID, SOURCES, database_path, integer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def scheduler(service):
    while True:
        try:
            result = await service.scheduled_step()
            if result["status"] not in ("disabled", "waiting", "idle"):
                logger.info("Scheduled collection: %s", result)
        except Exception:
            logger.exception("Scheduled collection failed")
        await asyncio.sleep(integer("AUTO_INTERVAL_SECONDS", 60, 10, 3600))


def safe_cell(value):
    """엑셀이 =, +, -, @로 시작하는 칸을 수식으로 읽어 오류(#NAME?)가 나지 않게 앞에 '를 붙입니다."""
    value = str(value)
    return "'" + value if value[:1] in ("=", "+", "-", "@") else value


def create_app(db_path=None, client=None, run_scheduler=True):
    @asynccontextmanager
    async def lifespan(application):
        db = Database(db_path if db_path is not None else database_path())
        db.initialize()
        owned_client = client is None
        http_client = client or httpx.AsyncClient(timeout=30, trust_env=False)
        application.state.service = NewsService(db, http_client)
        task = asyncio.create_task(scheduler(application.state.service)) if run_scheduler else None
        try:
            yield
        finally:
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task
            if owned_client:
                await http_client.aclose()

    application = FastAPI(title="SMD News Monitor", lifespan=lifespan)

    @application.middleware("http")
    async def response_headers(request, call_next):
        response = await call_next(request)
        response.headers.update({
            "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Content-Security-Policy": "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        })
        if request.url.path in ("/docs", "/redoc"):
            response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://cdn.redoc.ly 'unsafe-inline'; style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data: https://fastapi.tiangolo.com; worker-src blob:; frame-ancestors 'none'"
        return response

    @application.exception_handler(HTTPException)
    async def http_error(request, exc):
        return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)

    @application.get("/api/health")
    async def health(request: Request):
        request.app.state.service.db.first("SELECT 1")
        return {"status": "ok", "storage": "SQLite"}

    @application.get("/api/articles")
    async def articles(request: Request):
        rows = request.app.state.service.articles()
        return {"storage": "SQLite", "count": len(rows), "limit": 200, "articles": rows}

    @application.get("/api/export.csv")
    async def export_csv(request: Request):
        # 엑셀에서 한글이 깨지지 않도록 utf-8-sig(BOM 포함)로 만듭니다.
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["발행일", "카테고리", "회사·기관", "출처", "제목", "AI 요약", "첫 문단", "키워드", "중요", "메모", "원문 링크"])
        names = {c["id"]: c["name"] for c in CONFIG["categories"]}
        for a in request.app.state.service.visible_articles():
            # AI 요약의 "- " 줄머리는 엑셀에서 수식으로 읽히므로 "• "로 바꿉니다.
            ai_summary = "\n".join("• " + line[2:] if line.startswith("- ") else line for line in a["ai_summary"].split("\n"))
            row = [a["date"], names.get(a["category"], a["category"]), a["entity"], a["source"], a["title"],
                   ai_summary, a["summary"], ", ".join(a["tags"]), "★" if a["starred"] else "", a["memo"], a["url"]]
            writer.writerow([safe_cell(v) for v in row])
        headers = {"Content-Disposition": 'attachment; filename="smd-news.csv"'}
        return Response("\ufeff" + out.getvalue(), media_type="text/csv; charset=utf-8", headers=headers)

    @application.post("/api/article-star")
    async def article_star(request: Request):
        payload = await read_json(request)
        if not isinstance(payload.get("id"), int) or not isinstance(payload.get("starred"), bool):
            raise HTTPException(400, "기사 번호와 중요 여부가 필요합니다.")
        request.app.state.service.set_star(payload["id"], payload["starred"])
        return {"ok": True}

    @application.post("/api/article-memo")
    async def article_memo(request: Request):
        payload = await read_json(request, 3000)
        memo = payload.get("memo")
        if not isinstance(payload.get("id"), int) or not isinstance(memo, str):
            raise HTTPException(400, "기사 번호와 메모가 필요합니다.")
        request.app.state.service.set_memo(payload["id"], memo.strip()[:300])
        return {"ok": True}

    @application.post("/api/article-hide")
    async def article_hide(request: Request):
        payload = await read_json(request)
        if not isinstance(payload.get("id"), int) or not isinstance(payload.get("hidden"), bool):
            raise HTTPException(400, "기사 번호와 숨김 여부가 필요합니다.")
        request.app.state.service.set_hidden(payload["id"], payload["hidden"])
        return {"ok": True}

    @application.post("/api/weekly-report")
    async def make_weekly_report(request: Request):
        await read_json(request)
        today = datetime.now(KST).date().isoformat()
        result = await request.app.state.service.make_weekly_report(today)
        if "error" in result:
            raise HTTPException(503, result["error"])
        return result

    @application.get("/api/sources")
    async def sources():
        return {"sources": [{"id": s["id"], "name": s.get("label", s["name"])} for s in SOURCES]}

    @application.get("/api/candidates")
    async def candidates(request: Request, source_id: str | None = None):
        if source_id and source_id not in SOURCE_BY_ID:
            raise HTTPException(400, "등록되지 않은 정보원")
        return {"candidates": request.app.state.service.candidates(source_id)}

    @application.get("/api/automation-status")
    async def automation_status(request: Request):
        return request.app.state.service.automation_status()

    async def read_json(request, max_bytes=200):
        # 브라우저의 다른 사이트에서 로컬 수집 API를 호출하지 못하게 합니다.
        origin = request.headers.get("origin")
        allowed = {v.strip().rstrip("/") for v in os.getenv("ALLOWED_ORIGINS", "").split(",") if v.strip()}
        target = str(request.base_url).rstrip("/")
        if origin and origin.rstrip("/") not in allowed | {target}:
            raise HTTPException(403, "등록된 사이트에서 실행해 주세요.")
        # Origin 없는 요청은 로컬 CLI만 허용합니다.
        if not origin and urlsplit(target).hostname not in ("localhost", "127.0.0.1", "::1", "testserver"):
            raise HTTPException(403, "사이트의 수집 버튼으로 실행해 주세요.")
        if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
            raise HTTPException(415, "application/json 형식이 필요합니다.")
        data = bytearray()
        async for part in request.stream():
            if len(data) + len(part) > max_bytes:
                raise HTTPException(413, "요청이 너무 큽니다.")
            data.extend(part)
        try:
            payload = json.loads(data)
        except (ValueError, UnicodeDecodeError):
            raise HTTPException(400, "요청 형식 오류") from None
        if not isinstance(payload, dict):
            raise HTTPException(400, "JSON 객체가 필요합니다.")
        return payload

    async def command(request, operation):
        payload = await read_json(request)
        service = request.app.state.service
        try:
            if operation == "automation":
                return await service.scheduled_step(manual=True)
            source_id = payload.get("source_id")
            if not isinstance(source_id, str) or source_id not in SOURCE_BY_ID:
                raise HTTPException(400, "등록되지 않은 정보원")
            async with service.collector_lock():
                return await service.collect_source(SOURCE_BY_ID[source_id]) if operation == "collect" else await service.read_body(SOURCE_BY_ID[source_id])
        except ValueError as exc:
            raise HTTPException(409 if "10분 후" in str(exc) or "실행 중" in str(exc) else 503, str(exc)[:300]) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(503, "정보원 연결 실패: " + str(exc)[:200]) from exc

    @application.post("/api/collect")
    async def collect(request: Request):
        return await command(request, "collect")

    @application.post("/api/read-body")
    async def read_body(request: Request):
        return await command(request, "body")

    @application.post("/api/automation-step")
    async def automation_step(request: Request):
        return await command(request, "automation")

    @application.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
    @application.api_route("/index.html", methods=["GET", "HEAD"], include_in_schema=False)
    async def index(request: Request):
        if request.method == "HEAD":
            return Response(media_type="text/html")
        return FileResponse(ROOT / "static/index.html")

    application.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
    return application


app = create_app()
