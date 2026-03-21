# Card Event Intelligence Architecture Docs Console Design

## 1. 배경

현재 프레젠테이션 사이트에 대한 사용자 피드백 기준으로 다음 문제가 남아 있다.

- 폰트 크기와 카드 밀도가 과해 일부 구간이 겹치거나 지저분하게 보인다.
- 정보가 여러 장면으로 분산돼 있어 개발자가 전체 구조를 한 번에 따라가기가 어렵다.
- 이벤트 축의 카드사별 수집 로직 차이가 충분히 구조적으로 드러나지 않는다.
- 분석 계층은 사용자가 원하는 `OpenClaw 우선 -> Gemini fallback` 목표 구조와, 실제 코드상 `Gemini 우선 -> rule fallback` 현재 구현이 구분되어 보이지 않는다.
- 파일 구조도와 저장/전달 구조가 개발자 관점에서는 아직 얕다.

이번 리디자인은 현재 프레젠테이션 앱을 `한 페이지짜리 개발자용 아키텍처 문서 콘솔`로 재구성하는 설계다.

## 2. 목표

이번 작업의 목표는 다음 네 가지다.

- `한 페이지 통합`: 쇼룸형 흐름 대신 단일 문서형 아키텍처 페이지에서 전체 구조를 끝까지 읽을 수 있게 한다.
- `가독성 회복`: 겹침, 과도한 타이포, 카드 남발을 줄이고 문서형 정보 위계를 확립한다.
- `개발자용 상세화`: 카드사별 커넥터 차이, 실제 파일 구조, 저장/전달 구조를 더 구체적으로 보여준다.
- `정직한 구조 표기`: 현재 구현과 목표 구조를 혼동 없이 동시에 설명한다.

## 3. 비목표

이번 작업은 아래를 목표로 하지 않는다.

- FastAPI 운영 UI 자체의 전면 개편
- 실시간 데이터 연동 추가
- OpenClaw 백엔드 실제 구현
- 기존 대시보드 기능 확장
- 제품 소개용 마케팅 랜딩 재구축

## 4. 사실 기준

이 문서형 페이지는 실제 코드 기준과 목표 구조를 분리해서 보여줘야 한다.

### 4.1 현재 구현 사실

- 이벤트 수집 커넥터는 `Samsung`, `Shinhan`, `Hyundai`, `KB` 4개다.
- 커넥터 레지스트리는 `modules/connectors/__init__.py`에 있고, 파이프라인은 이를 사용해 수집을 실행한다.
- 카드사별 수집 로직은 서로 다르다.
  - `modules/connectors/shinhan.py`: 정적 JSON 우선, 이후 mobile AJAX, 마지막 DOM fallback
  - `modules/connectors/hyundai.py`: DOM 목록 수집, 더보기 클릭, 필요 시 API POST 폴백
  - `modules/connectors/kb.py`: `pageCount` 기반 POST pagination + `javascript:goDetail(...)` 파싱
  - `modules/connectors/samsung.py`: `cms_id` 기반 상세 페이지 직접 순회
- 현재 이벤트 인사이트 경로는 `modules/insights.py` 기준 `Gemini 우선 -> 실패 시 rule fallback`이다.
- 현재 코드 검색 기준으로 `OpenClaw` 참조는 없다.

### 4.2 목표 구조 사실

- 사용자가 원하는 목표 분석 구조는 `OpenClaw 우선 -> Gemini API fallback`이다.
- 따라서 페이지에서는 `현재 구현`과 `목표 구조`를 분리 표기해야 한다.
- 목표 구조를 현재 구현처럼 말하거나, 이미 코드에 존재하는 것처럼 표현하면 안 된다.

## 5. 핵심 하드 룰

### 5.1 페이지 구조

- 최종 결과는 `한 페이지`여야 한다.
- 최종 병합 상태의 기본 진입점은 `/` 하나로 고정한다.
- 구현 중에는 임시 그림자 라우트(`/architecture`)를 둘 수 있지만, 최종 병합 전에 `/`로 전환해야 한다.
- 기존 `/deep-dive`는 최종 병합 시 새 단일 문서의 앵커로 리다이렉트하거나 동일 문서를 렌더링하는 호환 경로로 흡수한다.
- 관련 테스트와 네비게이션도 위 라우트 결정에 맞춰 함께 갱신해야 한다.

### 5.2 레이아웃

- 좌측 고정 내비게이션 + 우측 문서 본문 구조를 사용한다.
- 본문은 과도하게 넓어지지 않도록 명확한 `max-width`를 둔다.
- 각 섹션은 `보드 1개 + 짧은 설명 + 관련 파일 근거` 구조를 기본으로 한다.

### 5.3 언어 정책

- 메뉴, 사이드바, 섹션 제목, 버튼, 캡션, 범례, 보조 설명은 한국어로 표기한다.
- 기술명, 라이브러리명, 파일명, 모듈명만 실제 영어 표기를 유지한다.
- 번역투가 강한 표현은 금지한다.

### 5.4 다이어그램 정책

- 구조도는 카드 나열이 아니라 `보드 내부에서 완결되는 연결형 다이어그램`이어야 한다.
- 섹션을 가로지르는 절대 위치 연결선은 금지한다.
- 연결선은 각 보드 내부 SVG 또는 보드 내부 grid 레이아웃 안에서만 관리한다.
- `현재 구현`과 `목표 구조`는 색, 선 스타일, 범례로 명확히 구분한다.

### 5.5 가독성 정책

- 초대형 쇼룸형 헤드라인은 제거하고 문서형 타이포 위계로 낮춘다.
- 본문에서 한 화면의 주인공 다이어그램은 하나만 둔다.
- 파일 목록과 기술 배지는 구조도를 보조해야지 구조도보다 먼저 튀면 안 된다.

## 6. 대상 사용자

1차 대상은 개발자, 운영자, 기술 검토자다.

이들은 다음 질문에 빠르게 답을 얻어야 한다.

- 전체 시스템은 어떤 레이어로 연결되는가
- 이벤트 축과 상품·공시 축은 어떻게 다른가
- 카드사별 커넥터 차이는 무엇인가
- 현재 분석 경로와 목표 분석 경로는 무엇인가
- 실제 코드 파일은 어느 역할을 맡는가
- 저장과 전달은 어떤 경로로 흐르는가

## 7. 정보구조

최종 문서는 아래 순서의 단일 페이지로 구성한다.

1. 문서 헤더
2. 전체 오케스트레이션 구조도
3. 이벤트 인텔리전스 파이프라인
4. 분석 계층 비교
5. 상품·공시 / RAG 파이프라인
6. 실제 파일 구조도
7. 저장 / 전달 구조도
8. 확장 포인트와 범례

좌측 사이드바는 위 섹션에 즉시 점프할 수 있어야 한다.

## 8. 섹션 상세 설계

### 8.1 문서 헤더

목적:

- 이 페이지가 무엇을 설명하는지 한 문장으로 정의
- 기준 시점 제공
- `현재 구현 / 목표 구조` 범례를 먼저 노출

필수 요소:

- 페이지 제목
- 짧은 소개 문장
- 기준 시점
- 범례

### 8.2 전체 오케스트레이션 구조도

형태:

- 좌측 입력 소스
- 중앙 처리 레이어
- 우측 활용 화면
- 상단 공통 제어층
- 하단 저장/전달면

입력 레인:

- 카드사 이벤트 소스
- 상품 설명서 / 공시 소스

처리 레이어:

- 이벤트 축
- 상품·공시 축

활용 화면:

- 운영 브리핑
- 분석 대시보드
- 발표 자료

이 보드는 페이지 전체를 한 장으로 요약하는 역할을 한다.

### 8.3 이벤트 인텔리전스 파이프라인

목적:

- 카드사마다 수집 로직이 다르다는 점을 명확히 보여준다.

구성:

- 왼쪽: 카드사별 커넥터 4레인
  - 신한 JSON 수집
  - 현대 DOM/API 병행
  - KB 스크립트 목록 파싱
  - 삼성 상세 페이지 순회
- 가운데: `RawEvent` 공통 스키마 합류
- 오른쪽: 본문 추출 -> 구조화 -> 인사이트 생성 -> 브리핑 전달

관련 파일을 함께 노출한다.

- `modules/connectors/base.py`
- `modules/connectors/shinhan.py`
- `modules/connectors/hyundai.py`
- `modules/connectors/kb.py`
- `modules/connectors/samsung.py`
- `modules/pipeline.py`
- `modules/extraction.py`
- `modules/normalization.py`

### 8.4 분석 계층 비교

목적:

- `현재 구현`과 `목표 구조`를 정직하게 비교한다.

좌측 `현재 구현`:

- `extract_detail`
- `generate_hybrid_insight`
- `Gemini 우선`
- `rule fallback`
- DB 저장 및 브리핑 전달

우측 `목표 구조`:

- 구조화 결과
- `OpenClaw 1차 분석`
- `Gemini API fallback`
- 브리핑 전달

표현 규칙:

- 현재 구현: 실선, 채움
- 목표 구조: 점선, 아웃라인
- 목표 구조 카드에는 `설계 기준` 배지를 명시

관련 파일:

- `modules/insights.py`
- `modules/pipeline.py`
- `database.py`
- `gemini_insight.py`

### 8.5 상품·공시 / RAG 파이프라인

목적:

- 상품 수집, 적재, 청킹, 임베딩, 검색, 응답 조합을 개발자 관점에서 충분히 상세하게 설명한다.

단계:

1. 소스 수집
2. 원문 적재
3. 문서 정제
4. 청킹
5. 임베딩
6. 벡터 저장
7. 검색
8. 응답 조합
9. 활용 화면 전달

기술 표기 예:

- `PDF/HTML extraction`
- `BeautifulSoup`
- `ChromaDB`
- `RAG`
- 실제 임베딩/모델 표기

관련 파일:

- 현재 구현 파일:
  - `modules/product_links.py`
- 목표 구조 파일 (`설계 기준`으로만 표기):
  - `routers/disclosures.py`
  - `routers/rag.py`
  - `modules/rag/collector.py`
  - `modules/rag/chunker.py`
  - `modules/rag/embedder.py`
  - `modules/rag/product_scraper.py`
  - `modules/rag/catalog_summary.py`

### 8.6 실제 파일 구조도

목적:

- 단순 폴더트리가 아니라 책임 중심으로 실제 파일을 묶어 보여준다.

클러스터:

- 앱 / 공유 코어
- 이벤트 수집
- 이벤트 해석
- 상품·공시 / RAG
- 활용 화면

각 클러스터는 아래를 포함한다.

- 맡는 책임
- 핵심 파일
- 연결되는 다음 레이어
- 구현됨 / 설계됨 상태

### 8.7 저장 / 전달 구조도

목적:

- 어떤 데이터가 어디에 저장되고 어떤 화면이 그것을 소비하는지 보여준다.

표현 요소:

- 적재 시점
- DB 저장
- 브리핑 생성
- 애널리틱스 읽기
- 대시보드 / 발표 자료 재사용

관련 파일:

- 현재 구현 파일:
  - `database.py`
  - `modules/briefing.py`
  - `routers/briefing.py`
  - `templates/*`
  - `static/js/*`
- 목표 구조 파일 (`설계 기준`으로만 표기):
  - `modules/analytics_service.py`
  - `routers/analytics.py`

### 8.8 확장 포인트와 범례

포함할 것:

- 새 카드사 추가 지점
- OpenClaw 연결 지점
- RAG 고도화 지점
- 범례
  - 현재 구현
  - 목표 구조
  - 구현됨
  - 설계됨

## 9. 시각 시스템

기조는 사용자가 승인한 `다크 네이비 + 절제된 럭셔리` 방향을 유지하되, 쇼룸형 연출을 줄이고 문서형 밀도를 올린다.

### 9.1 타이포

- 페이지 헤더 1회만 강한 display 스타일 허용
- 나머지는 문서형 제목 위계
- 파일 경로와 기술명은 mono 계열 스타일

### 9.2 컴포넌트 톤

- 두꺼운 카드보다 얇은 라인과 구조선 중심
- radius와 shadow는 기존보다 줄인다
- 강한 강조색은 보드당 1개만 사용한다

### 9.3 반응형

- 데스크톱: 좌측 고정 내비 + 우측 본문
- 태블릿: 상단 접이식 내비 + 본문 1열
- 모바일: 목차 drawer + 세로 스택 다이어그램

## 10. 구현 구조 제안

새 문서형 화면은 현재 Next 앱 루트 `presentation-site/` 안에서 기존 쇼룸 컴포넌트와 충돌을 줄이기 위해 별도 폴더로 구성한다.

제안 구조:

- `presentation-site/app/page.tsx`
- `presentation-site/app/architecture/page.tsx` (`구현 중 임시 라우트`, 최종 병합 전 제거 또는 흡수)
- `presentation-site/app/deep-dive/page.tsx` (`호환 진입점` 또는 리다이렉트 경로)
- `presentation-site/components/docs-console/docs-shell.tsx`
- `presentation-site/components/docs-console/docs-sidebar.tsx`
- `presentation-site/components/docs-console/boards/overall-orchestration.tsx`
- `presentation-site/components/docs-console/boards/event-pipeline.tsx`
- `presentation-site/components/docs-console/boards/analysis-compare.tsx`
- `presentation-site/components/docs-console/boards/product-rag.tsx`
- `presentation-site/components/docs-console/boards/file-structure.tsx`
- `presentation-site/components/docs-console/boards/storage-delivery.tsx`
- `presentation-site/content/architecture-doc-content.ts`

스타일은 가능하면 `globals.css` 대규모 확장 대신 보드별 CSS module을 우선 사용한다.

## 11. 테스트와 검증

최소 검증 기준:

- 사이드바 앵커 이동 동작
- 데스크톱/태블릿/모바일에서 겹침 없음
- `현재 구현`과 `목표 구조` 범례 노출
- 카드사별 커넥터 명시 노출
- 파일 구조도에 실제 경로 노출
- 검증 명령은 `presentation-site/` 앱 루트에서 실행한다.
- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run test:e2e`
- `npm.cmd run build`
- 현재 E2E가 placeholder 수준이면, 이번 작업 범위에 맞는 문서 콘솔 전용 E2E로 교체하거나 보강해야 한다.

## 12. 성공 기준

아래가 만족되면 성공이다.

- 한 페이지에서 시스템 전체 구조를 끝까지 읽을 수 있다.
- 겹침과 과도한 크기 때문에 지저분해 보이는 구간이 없다.
- 개발자가 카드사별 수집 차이와 실제 코드 위치를 즉시 파악할 수 있다.
- `현재 구현`과 `목표 구조(OpenClaw 우선 -> Gemini fallback)`가 혼동 없이 분리된다.
- 파일 구조도와 저장/전달 구조가 실제 코드 탐색에 도움이 된다.
