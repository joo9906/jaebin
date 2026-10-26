import logging
import os

log = logging.getLogger(__name__)

OPENAI_URL = "https://api.openai.com/v1/chat/completions"

# GPT에게 보낼 요청 문구입니다. 요약 형식을 바꾸고 싶으면 여기를 고치세요.
PROMPT = """당신은 캐논메디칼시스템즈코리아 전략마케팅팀의 뉴스 담당자입니다.
아래 의료 업계 기사를 읽고 다음 형식으로 한국어로 정리하세요.

- 핵심 내용 1
- 핵심 내용 2
- 핵심 내용 3
시사점: 우리 회사(의료영상 장비: CT, MRI, 초음파 등) 입장에서 눈여겨볼 점 한 문장

각 줄은 짧게 쓰고, 기사에 없는 내용은 지어내지 마세요."""

# 주간 리포트용 요청 문구입니다.
WEEKLY_PROMPT = """당신은 캐논메디칼시스템즈코리아 전략마케팅팀의 뉴스 담당자입니다.
아래는 이번 주에 모은 의료 업계 기사 목록입니다. 주간 회의에서 읽을 리포트를 한국어로 쓰세요.

[이번 주 동향]
- 가장 중요한 흐름 5줄 (각 줄 끝에 관련 매체 이름을 괄호로)

[경쟁사 움직임]
- 1~3줄 (없으면 "특이사항 없음")

[다음 주에 지켜볼 점]
- 1~3줄

기사 목록에 없는 내용은 지어내지 마세요."""


async def ask_gpt(client, system_prompt, user_text, timeout=60):
    """GPT에 질문을 보내 답을 받아옵니다. 키가 없거나 실패하면 빈 문자열을 돌려줍니다."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        # API 키가 없으면 GPT 없이 기존처럼 동작합니다.
        return ""
    try:
        response = await client.post(
            OPENAI_URL,
            headers={"Authorization": "Bearer " + api_key},
            json={
                "model": os.getenv("OPENAI_MODEL", "gpt-5-mini"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_text},
                ],
            },
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        # 실패해도 다른 기능은 계속되도록 오류를 기록만 합니다.
        log.warning("GPT 요청 실패: %s", exc)
        return ""


async def summarize(client, title, body):
    """기사 제목과 본문을 GPT에 보내 요약을 받아옵니다. 실패하면 빈 문자열을 돌려줍니다."""
    # 비용을 줄이기 위해 본문은 앞부분 3000자만 보냅니다.
    article = "제목: " + title + "\n\n본문:\n" + body[:3000]
    return await ask_gpt(client, PROMPT, article)


async def weekly_report(client, articles):
    """기사 목록(제목·매체·AI 요약)을 GPT에 보내 주간 리포트를 받아옵니다."""
    lines = []
    for a in articles:
        lines.append("■ " + a["date"] + " " + a["title"] + " (" + a["source"] + ")")
        if a["ai_summary"]:
            lines.append(a["ai_summary"])
    # 리포트는 글이 길어 시간이 더 걸리므로 120초까지 기다립니다.
    return await ask_gpt(client, WEEKLY_PROMPT, "\n".join(lines), timeout=120)
