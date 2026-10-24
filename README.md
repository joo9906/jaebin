# SMD News Monitor — 로컬 FastAPI 버전

기존 `start.js`의 화면을 유지하면서 기사 수집·제목 분류·발췌·저장·예약 실행을 Python 서버로 옮겼습니다. 기존 Worker 파일은 참고용으로 보존했으며 실행에 필요하지 않습니다. Node.js와 Cloudflare 계정 없이 실행됩니다.

## 실행

프로젝트 폴더의 PowerShell에서 실행하세요.

```powershell
.\run.cmd
```

`run.cmd`를 더블클릭해도 실행됩니다. 직접 실행하려면 다음 명령을 사용하세요.

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- 화면: http://127.0.0.1:8000
- API 문서: http://127.0.0.1:8000/docs
- 종료: 실행한 터미널에서 `Ctrl+C`
- 개발 중 자동 재시작: `.\run.ps1 -Reload`

PowerShell 스크립트 실행이 허용된 환경에서는 `.\run.ps1`도 사용할 수 있습니다. 현재 PC에서는 PowerShell 실행 정책에 영향을 받지 않는 `run.cmd`를 사용하세요.

새 환경에서는 Python 3.11 이상을 설치하고 `python -m venv venv`로 가상환경을 먼저 만들 수 있습니다. 서버는 단일 프로세스로 실행하세요.

## 수집과 저장

화면 아래에서 정보원을 선택하고 **기사 수집**을 누르면 목록 최대 30건을 선별하고 본문을 확인합니다. 상단 기사 목록도 자동 갱신됩니다. 최초 실행은 빈 DB로 시작하며 기존 Cloudflare D1 데이터는 자동 복사하지 않습니다.

SQLite DB는 `data/news.db`에 자동 생성됩니다. 서버를 재시작해도 데이터가 유지됩니다. 별도 SQL 실행은 필요하지 않습니다. 데이터 백업은 서버를 종료한 뒤 `data` 폴더를 복사하세요. 후보 보관 기간은 7일이며 게시 기사는 별도로 유지합니다.

키워드와 정보원은 `app/config.json`에서 수정하고 서버를 재시작하세요. 원본의 27개 정보원·12개 활성 정보원·9개 규칙과 분류 우선순위를 유지했습니다. 제목으로 분류하며 AI API를 사용하지 않습니다. 발행일 추출에 실패한 기사는 오류로 기록하고 게시하지 않습니다. 오류 후보는 이후 해당 정보원의 목록 재수집으로 다시 처리할 수 있습니다. 매체 접속 제한이나 HTML 개편은 별도 파서 조정이 필요할 수 있습니다.

## 예약 수집

`.env.example`의 설정을 `.env`에 넣고 서버를 재시작하세요. 자동 수집은 기본적으로 꺼져 있습니다.

```dotenv
AUTO_ENABLED=true
AUTO_SOURCE_LIMIT=12
AUTO_MAX_BODY_PER_DAY=120
AUTO_INTERVAL_SECONDS=60
```

서버 실행 중 한국시간 오전 7시 이후 60초마다 목록 한 곳 또는 기사 한 건을 처리합니다. 정보원별 목록은 하루 한 번 시도한 뒤 본문을 순서대로 처리합니다. 기본 본문 상한은 하루 120회이며 오류·건너뜀도 시도 횟수에 포함됩니다. 하루 실패 10회면 당일 자동 수집을 중지합니다. 서버가 꺼져 있는 동안 예약 작업은 실행되지 않습니다. **예약 작업 1회 시험**은 자동 수집 활성화 및 오전 7시 조건을 건너뛰지만 당일 중지와 처리 상한은 유지합니다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `app/main.py` | FastAPI 라우트, 서버 시작·종료, 예약 루프 |
| `app/service.py` | 수집·게시·조회·예약 작업 및 동시 실행 잠금 |
| `app/crawler.py` | HTTP 요청, 기사 URL 검증, 매체별 본문·날짜 추출 |
| `app/rules.py` | 제목 키워드 분류 |
| `app/db.py` | SQLite 스키마와 트랜잭션 |
| `app/config.json` | 기존 정보원·키워드 설정 |
| `static/` | 기존 화면의 HTML, CSS, JavaScript |

## Cloudflare 연결

로컬 FastAPI 화면을 외부에 보여주려면 `cloudflared` 설치 후 별도 터미널에서 다음 명령을 실행할 수 있습니다. 임시 외부 주소가 출력됩니다.

```powershell
cloudflared tunnel --url http://127.0.0.1:8000
```

이는 로컬 서버를 외부에 연결하는 방식이며 PC·FastAPI·Tunnel이 모두 실행 중이어야 합니다. 앱 자체에 사용자 로그인을 추가하지 않았으므로 사내 공유 시 Cloudflare Access를 연결하세요. 실제 외부 주소를 `.env`의 `ALLOWED_ORIGINS`에 추가하고 서버를 재시작하면 프록시 연결에서도 수집 API의 Origin 검사를 통과할 수 있습니다. Tunnel은 이 작업에서 실제 개설하지 않았습니다.

Cloudflare Python Workers도 FastAPI를 지원하지만 이 로컬 앱을 그대로 배포하는 것은 아닙니다. SQLite 파일 저장, 로컬 정적 파일 제공, 백그라운드 예약 루프를 D1·Assets·예약 트리거에 맞춰 별도 이식해야 합니다.

참고: [Cloudflare FastAPI 지원](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/), [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/).

## 검증

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

테스트는 임시 DB와 모의 HTTP 응답을 사용하며 운영 데이터와 외부 매체에 영향을 주지 않습니다.
