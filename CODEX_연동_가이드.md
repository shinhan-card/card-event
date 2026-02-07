# 카드 이벤트 인텔리전스 시스템 — Codex 연동 가이드

**아래 내용을 그대로 복사해 Codex(또는 다른 에이전트)에게 전달하면, 이어서 작업할 수 있습니다.**

---

## 1. 프로젝트 목표

- **경쟁사 카드 이벤트 인텔리전스 시스템**: 신한·삼성·현대·KB 등 주요 카드사의 이벤트를 자동 수집·정리하고, **담겨 있는 모든 마케팅 내용을 추출해 구조화**하여, **마케팅 인사이트**를 얻을 수 있게 하는 것.
- 전사 마케팅 담당자가 참고할 수 있는 대시보드 제공.
- 단순 제목·기간이 아니라, **혜택 상세, 참여방법, 유의사항, 파트너십, 혜택 금액/비율** 등 **모든 마케팅 콘텐츠**를 추출·정리하고, **혜택 수준·경쟁력 포인트·프로모션 전략** 등 인사이트를 도출하는 것이 최종 목표.

---

## 2. 지금까지 구현된 것

### 2.1 기술 스택
- **백엔드**: Python 3.10+, FastAPI, Uvicorn
- **크롤링**: Playwright (headless), playwright-stealth, BeautifulSoup4
- **DB**: SQLite, SQLAlchemy ORM
- **프론트**: Jinja2 + Tailwind CSS, Vanilla JS
- **AI(선택)**: Google Gemini API (vision/텍스트 분석용, 현재 메인 플로우에서는 비활성)

### 2.2 데이터 수집
- **삼성카드**: API 인터셉트(`pure_api_crawler.py`)로 목록 수집 후, 상세 URL은 `cms_id` 기반(`https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id=XXXX`). `sequential_cms_crawler.py`, `auto_samsung_crawler.py`로 cms_id 순차 탐색.
- **제목 추출**: API는 `cmpTitNm` 사용. HTML 상세 페이지에서는 `_extract_event_title()`로 본문 제목만 추출(사이트명·알림 문구 "이벤트에 응모되었습니다" 등 제외). `sequential_cms_crawler.py`, `auto_samsung_crawler.py`, `fix_samsung_titles_in_db.py`에 동일 로직 적용.
- **신한·현대·KB**: 크롤러/파서는 일부 있으나, 실제 자동 수집·저장 플로우는 미완성.

### 2.3 대시보드 (http://localhost:8000)
- **템플릿**: `templates/simple_dashboard.html` (메인).
- **기능**: 이벤트 목록(카드사/카테고리/기간/상태 필터), 통계, 엑셀 다운로드.
- **상세 보기**: 제목 클릭 시 모달 → **iframe**으로 해당 이벤트 URL 로드.
- **추출 버튼**: "이 페이지에서 내용 추출하여 반영" → `POST /api/events/{id}/extract-detail` 호출 → 백엔드에서 해당 URL을 Playwright로 열어 내용 추출 후 DB 갱신.

### 2.4 상세 내용 추출 (현재 구현)
- **파일**: `detail_extractor.py`
- **진입점**: `extract_from_url(url, wait_sec=3)` (async).
- **추출 항목**:
  - 제목, 기간, 혜택 문구, 조건, 대상 카드, 혜택 유형, 원문(`raw_text`).
  - **구조화 마케팅**: `marketing_content` (혜택_상세, 참여방법, 유의사항, 제한사항, 파트너십, 마케팅_메시지, 타겟_고객, 혜택_금액, 혜택_비율).
  - **인사이트**: `insights` (혜택_수준, 경쟁력_포인트, 타겟_명확도, 프로모션_전략).
- **DB**: `database.py`의 `CardEvent`에 `marketing_content`, `marketing_insights` (Text, JSON 문자열) 추가됨. 마이그레이션: `migrate_add_marketing_fields.py` 실행으로 기존 DB에 컬럼 추가.

### 2.5 API
- `GET /api/events` — 목록 (필터: company, category, threat_level). **정보 없는 이벤트는 제외** (`database.has_meaningful_info()`: 기간 없음/정보없음, 제목 "이벤트에 응모되었습니다" 등 제외).
- `GET /api/events/{id}` — 단건 상세.
- `POST /api/events/{id}/extract-detail` — 해당 이벤트 URL로 상세 페이지 크롤링 후, 제목·기간·혜택·조건·`marketing_content`·`marketing_insights` 등 갱신.

### 2.6 목록 품질
- **정보 없음/기간 없음** 이벤트는 목록에서 숨김 (`database.py`: `has_meaningful_info()`, `_is_empty_value()`).
- **제목이 "이벤트에 응모되었습니다"** 등 알림 문구인 경우 목록 제외.
- **제목 수정**: `fix_samsung_titles_in_db.py` — DB에 잘못된 제목(삼성카드/응모 문구 등)으로 저장된 삼성 이벤트를 상세 페이지 다시 방문해 제목 재추출 후 갱신.

### 2.7 실행 방법
- **대시보드**: `cd card-event-intelligence` → `.\venv\Scripts\Activate.ps1` → `python -m uvicorn app:app --host 0.0.0.0 --port 8000` (또는 `대시보드_실행.bat`).
- **Playwright**: `playwright install chromium` (venv 활성화 후 한 번 실행).
- **추출 테스트**: 이벤트 클릭 → "이 페이지에서 내용 추출하여 반영" 클릭.

---

## 3. 아직 미흡한 부분 (Codex에서 이어갈 작업)

### 3.1 마케팅 내용 추출이 비어 있음 (최우선)
- **현상**: `detail_extractor.py`의 `_extract_sections()`, `_collect_blocks()`로 수집한 **혜택_상세, 참여방법, 유의사항** 등이 실제 페이지에서 **0건**으로 나옴. `raw_text`는 5000자 정도 잘 쌓임.
- **원인 후보**:  
  - 삼성 상세 페이지가 SPA/동적 렌더링이라 BeautifulSoup으로 파싱한 HTML에 본문 텍스트가 적게 남음.  
  - 또는 키워드 매칭/블록 수집 로직이 해당 사이트 DOM 구조와 맞지 않음.
- **요청 작업**:
  1. **동적 본문 확보**: Playwright로 `page.content()` 가져오는 시점을 **스크롤·대기 후**로 조정하거나, `page.inner_text('body')` 등으로 이미 렌더된 텍스트를 먼저 수집해 `_extract_sections()`의 입력으로 사용.
  2. **raw_text 기반 폴백**: `raw_text`(또는 `page.inner_text('body')`)를 줄/문단 단위로 쪼갠 뒤, 키워드(혜택, 참여, 유의, 제한, 파트너 등)가 포함된 문장을 `marketing_content`의 섹션별 리스트에 넣는 로직을 추가.
  3. **금액/비율**: `_extract_amounts_and_percentages()`는 구현되어 있으나, 실제 추출 문구가 비어 있어 쓰이지 않음. 위 1·2가 해결되면 자동으로 활용될 수 있음.

### 3.2 마케팅 인사이트가 항상 기본값
- **현상**: `_extract_marketing_insights()`에서 **혜택_수준: "보통", 경쟁력_포인트: [], 프로모션_전략: []** 만 나옴.
- **이유**: `benefit_value` 등에 실제 문장이 거의 없어서, 금액/비율 추출 및 전략 분류가 동작하지 않음.
- **요청**: 3.1이 해결되면 인사이트는 자연스럽게 개선될 가능성이 큼. 추가로, **raw_text 일부를 인사이트 생성 함수에 직접 넘기거나**, 키워드/정규식 기반으로라도 혜택 수준·전략을 채우는 로직을 보강.

### 3.3 대시보드 UI
- **현재**: 모달에 "원본 페이지 / 추출된 내용 / 마케팅 인사이트" 탭이 있고, `marketing_content`·`insights`를 JSON으로 받아 섹션별로 표시.
- **미흡**: 실제로 추출 데이터가 비어 있어서 "아직 추출된 내용이 없습니다"만 보임. 3.1·3.2가 해결되면 같은 UI로 내용이 쌓이면 됨.

### 3.4 다른 카드사(신한·현대·KB) 수집
- **현재**: 삼성 위주. 신한·현대·KB는 URL/API/크롤러가 부분만 구현됨.
- **요청**: 카드사별로 상세 페이지 URL 패턴·DOM(또는 API)을 조사한 뒤, `detail_extractor.py`를 카드사별 분기하거나, 공통 인터페이스(URL → 제목/기간/혜택/조건/마케팅_내용)를 유지하면서 사이트별 파서를 확장.

### 3.5 DB·API
- **EventResponse**에 `marketing_content`, `marketing_insights` 필드 있음.  
- **GET /api/events/{id}** 응답에 두 필드가 포함되도록 되어 있음.  
- **저장**: `POST /api/events/{id}/extract-detail`에서 `extract_from_url()` 결과의 `marketing_content`, `insights`를 JSON 문자열로 DB에 저장.  
- **마이그레이션**: 기존 DB에는 `migrate_add_marketing_fields.py` 실행 필요.

---

## 4. Codex에게 줄 한 줄 지시 (복사용)

```
프로젝트: card-event-intelligence (경쟁사 카드 이벤트 인텔리전스 시스템).
경로: c:\Users\82104\Desktop\Cursor\card-event-intelligence

목표: 이벤트 상세 페이지(iframe에 보이는 페이지)에서 제목뿐 아니라 담겨 있는 모든 마케팅 내용(혜택 상세, 참여방법, 유의사항, 파트너십, 금액/비율 등)을 추출해 구조화하고, 마케팅 인사이트(혜택 수준, 경쟁력 포인트, 프로모션 전략)를 도출하는 것.

지금까지: FastAPI 대시보드, 삼성카드 수집(cms_id 순차+API), 상세 iframe, "이 페이지에서 내용 추출하여 반영" 버튼으로 POST /api/events/{id}/extract-detail 호출 → detail_extractor.extract_from_url()로 Playwright 크롤링 후 DB 갱신. marketing_content, marketing_insights 컬럼 추가됨.

미흡한 점:
1) detail_extractor.py에서 _extract_sections()/_collect_blocks()가 실제 페이지에서 혜택_상세·참여방법·유의사항 등을 0건만 반환함. raw_text는 약 5000자 수집됨. → Playwright로 본문 텍스트(예: page.inner_text('body'))를 확실히 가져온 뒤, raw_text 기반으로 키워드(혜택, 참여, 유의, 제한, 파트너 등) 포함 문장을 섹션별로 분류하는 로직을 추가해, marketing_content에 실제로 값이 들어가도록 수정해줘.
2) 그 결과로 마케팅 인사이트(혜택_수준, 경쟁력_포인트, 프로모션_전략)가 채워지도록 _extract_marketing_insights()를 raw_text 또는 추출된 benefit_value 등과 연동해 개선해줘.
3) (선택) 신한·현대·KB 카드사 상세 페이지 수집·추출 로직을 조사해 동일한 추출 플로우에 연동할 수 있는지 검토하고, 가능하면 확장해줘.

참고: CODEX_연동_가이드.md 파일에 위 내용이 더 자세히 정리되어 있음.
```

---

## 5. 주요 파일 위치 (참고)

| 역할 | 경로 |
|------|------|
| 대시보드·API | `app.py` |
| DB 모델·조회·필터 | `database.py` |
| 상세 페이지 전체 추출 | `detail_extractor.py` |
| 대시보드 HTML | `templates/simple_dashboard.html` |
| 삼성 순차 크롤러 | `sequential_cms_crawler.py`, `auto_samsung_crawler.py` |
| 제목 수정 스크립트 | `fix_samsung_titles_in_db.py` |
| DB 마이그레이션(마케팅 필드) | `migrate_add_marketing_fields.py` |

---

**이 문서 전체 또는 "4. Codex에게 줄 한 줄 지시" 블록을 복사해 Codex에 붙여넣으면, 이어서 작업할 수 있습니다.**
