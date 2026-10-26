import logging
import os
from datetime import date, timedelta

log = logging.getLogger(__name__)

CATEGORY_NAMES = [("company", "우리회사 뉴스"), ("policy", "정책"), ("hospital", "학회&병원"), ("competitor", "경쟁사")]
PER_CATEGORY = 3  # 카테고리마다 보낼 기사 수


def build_briefing(articles, day):
    """어제~오늘 기사 중 카테고리별 상위 몇 건을 메시지 글로 만듭니다."""
    since = (date.fromisoformat(day) - timedelta(days=1)).isoformat()
    # 메인 키워드만 맞은 기사(덜 중요한 기사)는 화면 기본값처럼 빼고 보냅니다.
    recent = [a for a in articles if a["date"] >= since and a["match_level"] != "main"]
    lines = ["[SMD 뉴스 브리핑] " + day]
    for category_id, name in CATEGORY_NAMES:
        rows = [a for a in recent if a["category"] == category_id][:PER_CATEGORY]
        lines.append("")
        lines.append("■ " + name + " (" + str(len(rows)) + "건)")
        for a in rows:
            lines.append("- " + a["title"] + " (" + a["source"] + ")")
            lines.append("  " + a["url"])
    return "\n".join(lines)


async def send_briefing(client, text):
    """웹훅 주소(.env의 BRIEFING_WEBHOOK_URL)로 메시지를 보냅니다. 성공하면 True."""
    url = os.getenv("BRIEFING_WEBHOOK_URL", "").strip()
    if not url:
        # 주소가 없으면 브리핑 없이 기존처럼 동작합니다.
        return False
    try:
        # Slack과 Teams 모두 {"text": "..."} 형식을 받습니다.
        response = await client.post(url, json={"text": text}, timeout=15)
        response.raise_for_status()
        return True
    except Exception as exc:
        log.warning("브리핑 전송 실패: %s", exc)
        return False
