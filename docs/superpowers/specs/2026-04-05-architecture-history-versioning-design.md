# Architecture History And Versioning Design

## Goal

로컬 아키텍처 페이지에서 바로 진입할 수 있는 `작업 히스토리 / 버전 페이지`를 추가해, 이 프로젝트의 과거 변화와 앞으로의 변화가 뒤죽박죽 사라지지 않도록 만든다.

핵심은 두 가지다.

1. 과거 이력을 최대한 많이 복원한다.
2. 앞으로의 사소한 변경까지도 일관된 규칙으로 축적한다.

이 페이지는 단순 changelog가 아니라, `무슨 작업이 언제 왜 있었고`, `어떤 파일과 브랜치와 문서와 스레드 로그가 근거인지`, `확정 이력인지 복원 이력인지`를 함께 보여주는 로컬 기준 운영 문서여야 한다.

## Background

현재 이 프로젝트의 히스토리는 여러 층에 흩어져 있다.

- Git commit history
- 로컬에만 남아 있는 spec / plan 문서
- `.omx/logs/turns-*.jsonl` 작업 로그
- 브랜치 이름과 worktree 흔적
- 파일 생성 시각과 마지막 수정 시각
- 외부 공유용으로 분리된 `showcase-site`

문제는 이 흔적들이 서로 연결되지 않아, 나중에 보면 "무엇이 먼저였고 무엇이 파생본인지", "사소한 수정이 어떤 큰 작업 흐름에 속하는지", "Git에 안 올라간 로컬 작업은 어떤 게 있었는지"를 파악하기 어렵다는 점이다.

특히 현재 확인된 흐름만 봐도 아래처럼 여러 스트림이 섞여 있다.

- 초기 카드 이벤트 수집기 / FastAPI / SQLite 코어
- briefing / ops console / report studio 개선
- product explorer / product document search / RAG 관련 설계
- presentation site / architecture docs console
- entry cinematic redesign
- showcase-site 분리와 외부 공유용 정적 페이지 배포
- dashboard snapshot, weekly changes, AI detail UI 보정

따라서 새 히스토리 페이지는 `큰 버전 흐름`과 `자잘한 변화`를 동시에 담아야 한다.

## Scope

이번 설계의 범위는 로컬 기준으로 아래 세 가지를 포함한다.

1. `showcase-site/architecture/index.html`에서 진입 가능한 히스토리 페이지 설계
2. 과거 이력 복원 규칙 설계
3. 앞으로 버전과 작업 이력을 쌓는 운영 규칙 설계

## Non-Goals

이번 범위에 포함하지 않는 것:

- GitHub 원격 저장소 정리나 history rewrite
- 모든 과거 이력의 완전 자동 복원 보장
- semver 기반 배포 버전 체계 강제
- 현재 FastAPI 내부 운영 UI를 history 시스템으로 직접 통합
- DB 테이블 기반의 실시간 changelog 시스템 추가

## Local-First Decision

이번 기능의 기준 원본은 로컬의 아키텍처 페이지다.

- 기준 진입 파일: `showcase-site/architecture/index.html`
- 기준 아키텍처 원문: `docs/architecture/as-is-to-be-architecture.html`
- 외부 공유/GitHub 동기화는 이후 단계에서 별도로 맞춘다.

즉 이 기능은 먼저 `로컬에서 가장 신뢰할 수 있는 작업 아카이브`가 되는 것이 목표다.

## Chosen Direction

추천 방향은 `정적 history page + JSON 데이터 계약 + 복원 스크립트 + 수동 큐레이션 레이어`의 4단 구조다.

### Why this direction

- 현재 `showcase-site`가 정적 사이트라 가장 적은 리스크로 붙일 수 있다.
- 과거 이력은 완전 자동화보다 `자동 수집 + 수동 정리`가 더 정확하다.
- Git에 없는 로컬 작업도 OMX 로그와 파일 시각으로 어느 정도 복원할 수 있다.
- 나중에 GitHub/Vercel에 동기화할 때도 정적 자산과 JSON만 옮기면 된다.

## Information Architecture

히스토리 페이지는 `버전 릴리스 목록`이 아니라 `작업 아카이브 콘솔`이어야 한다.

기본 구조는 아래 순서를 추천한다.

1. 페이지 헤더
2. 히스토리 요약 카드
3. 복원 기준 / 근거 범례
4. 작업 스트림 필터
5. 버전 그룹 타임라인
6. 확장 가능한 사소 변경 목록
7. 누락 의심 / 추가 확인 필요 섹션
8. 유지보수 규칙 섹션

## Navigation Entry Design

아키텍처 페이지에서의 진입은 너무 숨기면 안 되고, 그렇다고 본문보다 튀면 안 된다.

권장 위치는 두 군데다.

1. Hero 상단 또는 hero pill 근처
   - 라벨: `작업 히스토리 보기`
   - 성격: 주요 보조 CTA
2. Footer
   - 라벨: `Project History`
   - 성격: 보조 재진입 링크

이중 진입으로 두는 이유:

- 첫 방문자는 hero에서 바로 진입 가능
- 문서를 다 읽은 사람은 footer에서 자연스럽게 이동 가능

## Route Structure

로컬 정적 showcase 구조 기준으로 아래처럼 두는 것이 가장 단순하다.

- `showcase-site/index.html`
- `showcase-site/architecture/index.html`
- `showcase-site/history/index.html`
- `showcase-site/data/project-history.json`

추가적으로 정적 rewrite는 아래만 있으면 충분하다.

- `/architecture` -> `/architecture/index.html`
- `/history` -> `/history/index.html`

## History Model

이 시스템에서 가장 중요한 건 "버전" 정의를 명확히 하는 것이다.

이번 설계에서는 `버전 = 배포 릴리스`가 아니라 `하나의 작업 흐름을 대표하는 큐레이션된 묶음`으로 정의한다.

즉 아래 둘을 동시에 가진다.

1. `Version group`
   - 예: `2026-03 Entry Cinematic Redesign`
   - 큰 흐름
2. `History item`
   - 예: hero copy 수정
   - 신호 텍스트 가시성 수정
   - platform intro 버튼 제거
   - 캐시 이슈 때문에 script version bump

큰 작업 아래에 작은 변경이 매달리는 구조가 맞다.

## Top-Level JSON Schema

`project-history.json`은 아래 4개 루트를 가진다.

```json
{
  "meta": {},
  "workstreams": [],
  "versions": [],
  "items": []
}
```

### `meta`

- `generated_at`
- `source_priority`
- `local_source_of_truth`
- `notes`

### `workstreams`

작업을 묶는 축이다.

권장 기본값:

- `core-platform`
- `architecture-docs`
- `entry-showcase`
- `dashboard-ops`
- `briefing-reporting`
- `product-rag`
- `deployment-sharing`
- `data-connectors`

### `versions`

버전 그룹 정보다.

필드:

- `id`
- `label`
- `workstream`
- `start_date`
- `end_date`
- `summary`
- `status`
  - `confirmed`
  - `reconstructed`
  - `active`
- `confidence`
  - `high`
  - `medium`
  - `low`
- `primary_evidence`
- `tags`

### `items`

실제 변경 단위다.

필드:

- `id`
- `version_id`
- `title`
- `date`
- `granularity`
  - `major`
  - `minor`
  - `micro`
- `kind`
  - `spec`
  - `plan`
  - `implementation`
  - `bugfix`
  - `copy`
  - `ui-polish`
  - `deploy`
  - `recovery-note`
- `summary`
- `details`
- `files`
- `branches`
- `commits`
- `evidence`
- `confidence`
- `source_origin`
- `is_manual`
- `is_reconstructed`

## Evidence Model

각 item은 "이건 뭘 근거로 적었나"가 보여야 한다.

`evidence`는 아래 타입을 가진다.

- `git-commit`
- `git-branch`
- `spec-doc`
- `plan-doc`
- `omx-turn-log`
- `file-timestamp`
- `manual-note`

각 evidence entry는 아래를 가진다.

- `type`
- `label`
- `path`
- `ref`
- `timestamp`
- `excerpt`

## Confidence Rules

복원된 이력은 자신감 점수가 반드시 필요하다.

### High

아래 중 2개 이상이 동시에 맞으면 `high`

- 관련 Git commit 존재
- 관련 spec/plan 문서 존재
- OMX turn log에 직접적인 작업 설명 존재
- 파일 생성/수정 시각이 해당 흐름과 일치

### Medium

아래 중 2개 정도만 맞으면 `medium`

- Git commit은 없지만 spec/plan + OMX log 존재
- 파일 생성 시각 + OMX log 존재
- 브랜치 이름 + 문서 흔적 존재

### Low

아래처럼 간접 단서만 있으면 `low`

- 파일 시각만 존재
- 브랜치 이름만 존재
- 로그 문장만 있고 산출물 연결이 약함

UI에는 `확정`, `복원`, `추정`처럼 번역된 badge로 보이는 것이 좋다.

## Recovery Sources And Parsing Rules

### 1. Git commits

가장 강한 근거다.

추출 대상:

- commit date
- subject
- changed files
- branch association가 추정 가능한 경우 branch

용도:

- 구현 milestone 복원
- 사소한 bugfix / copy 수정 복원
- entry redesign 같은 세부 흐름 복원

### 2. Spec / plan documents

큰 작업의 시작 신호로 가장 중요하다.

추출 대상:

- 파일명 날짜
- 제목
- 설계 목적
- 관련 주제

용도:

- 작업 흐름 시작점 고정
- "무슨 문제를 풀려고 했는가" 설명 보강

### 3. OMX turn logs

Git에 안 남은 로컬 작업과 디버깅 맥락을 복원하는 핵심 소스다.

추출 대상:

- 사용자의 요구 문장
- 에이전트의 조치 요약
- 서버 재시작 / 배포 / 복구 / 외부 공유 분리 같은 작업 서술

용도:

- Git 미커밋 작업 복원
- showcase 분리, vercel 배포, UI 미세 수정 맥락 보강
- "왜 이 수정이 생겼는가" 설명 보강

### 4. File timestamps

가장 약하지만, Git 밖 산출물에 매우 중요하다.

특히 아래에 유효하다.

- `showcase-site/*`
- `docs/architecture/*`
- `docs/superpowers/specs/*`
- `docs/superpowers/plans/*`

용도:

- 산출물 생성 시점 추정
- 파생본 생성 순서 확인

## Reconstruction Heuristics

이력 묶음은 아래 규칙으로 생성한다.

### Rule 1. 문서가 먼저면 작업 스트림의 시작점으로 본다

예:

- `2026-03-21-card-event-intelligence-architecture-docs-console-design.md`
- `2026-03-21-card-event-intelligence-architecture-docs-console.md`

이 둘은 `architecture-docs` 스트림의 시작 그룹이 된다.

### Rule 2. 같은 날의 spec + plan + 여러 commit은 하나의 version group으로 묶는다

예:

- `entry-page-cinematic-redesign` spec/plan
- 같은 날 또는 다음날 이어진 entry 관련 커밋들

이것은 하나의 버전 그룹 아래 major/minor/micro item으로 묶는다.

### Rule 3. 사소한 변경은 micro item으로 남긴다

예:

- CTA 문구 수정
- signal opacity 수정
- countup zero 표시 수정
- 플랫폼 소개 버튼 제거
- script cache bust 버전 변경

이런 것들은 버전 그룹 안에 숨기지 말고 확장 가능한 micro timeline으로 보이게 한다.

### Rule 4. 로컬 파생본은 parent-child 관계를 남긴다

예:

- `docs/architecture/as-is-to-be-architecture.html`
- `showcase-site/architecture/index.html`

후자는 전자의 파생본이라는 관계를 metadata로 남긴다.

### Rule 5. 배포/공유 작업은 implementation과 분리해 기록한다

예:

- `showcase-site` 분리
- Vercel 배포

이는 UI 구현 자체와 다른 성격이므로 `deployment-sharing` 스트림 또는 별도 item kind로 분리한다.

## Small Change Capture Policy

사용자가 특별히 요청한 "사소한 것들도 잘 정리"를 위해 작은 변화도 버리지 않는다.

다만 작은 변화를 전부 독립 버전으로 만들면 오히려 가독성이 나빠지므로, 아래 규칙으로 관리한다.

### Keep as micro items

- 문구 수정
- badge 텍스트 수정
- 버튼 제거
- spacing / fade / opacity / placeholder 교정
- 캐시 bust 버전 변경
- 서버 startup 병목 수정
- 특정 카드/상품/주간 변화 표시 오류 수정

### Promote to version group when

- 새 라우트 추가
- 새 화면 추가
- 새 데이터 모델 추가
- 새 운영 흐름 추가
- 큰 구조 전환

즉 `구조 변경은 version`, `다듬기와 보정은 item`이 맞다.

## UI Behavior

### Summary cards

상단 요약 카드에는 아래를 추천한다.

- 총 버전 그룹 수
- 총 복원 item 수
- 확정 이력 수
- 복원 이력 수
- 작업 스트림 수

### Filters

필터는 최소 아래가 있어야 한다.

- 전체
- 아키텍처
- 엔트리/쇼케이스
- 대시보드/운영
- 브리핑/리포트
- 상품/RAG
- 배포/공유
- 데이터/커넥터

### Search

검색은 제목만이 아니라 아래도 같이 찾게 하는 것이 좋다.

- 파일 경로
- 브랜치명
- 커밋 subject
- 문서 제목
- 태그

### Expandable detail

각 item을 누르면 아래 정보가 보여야 한다.

- 무엇을 바꿨는지
- 왜 바꿨는지
- 관련 파일
- 관련 브랜치 / 커밋
- 근거 문서 / 로그
- confidence

### Missing evidence panel

하단에는 `누락 의심 이력` 섹션을 둔다.

예:

- 브랜치는 있는데 커밋이 약한 경우
- 문서는 있는데 산출물이 약한 경우
- 파일은 있는데 맥락이 약한 경우

이 영역은 이후 수동 보강용 inbox 역할을 한다.

## Initial Recovered Version Groups

현재 확인 기준으로 초기 seed는 아래처럼 잡는 것이 좋다.

1. `2026-02 Core Foundation`
2. `2026-03 Briefing And Ops Console`
3. `2026-03 Presentation Site`
4. `2026-03 Architecture Docs Console`
5. `2026-03 Product Explorer / Document Search / Snapshot Refresh`
6. `2026-03 Entry Command Center`
7. `2026-03 Entry Cinematic Redesign`
8. `2026-04 Showcase Split And Share`
9. `2026-04 Dashboard Stabilization`

이 그룹 아래에 실제 micro items를 붙여 넣는다.

## Future Operating Rules

앞으로는 새 기능을 만들 때 history도 같이 남기게 해야 한다.

### Rule A. spec/plan 문서가 생기면 version seed를 만든다

설계 문서가 생긴 시점에 version group 초안을 자동 추가한다.

### Rule B. 큰 구현 commit은 version summary를 갱신한다

새 commit이 들어오면 해당 버전 그룹의 `implementation` item으로 추가한다.

### Rule C. 사소한 수정도 1줄 요약으로 추가한다

작은 수정이더라도 아래 형식의 1줄 item은 남긴다.

- 날짜
- 한 줄 제목
- 관련 파일 1~3개
- confidence

### Rule D. 수동 정리는 허용하되 evidence는 남긴다

나중에 사람이 손으로 적은 항목도 근거 링크 또는 메모를 남긴다.

## No New Dependency Rule

이번 기능은 정적 HTML/CSS/JS와 Python 표준 라이브러리 수준의 스크립트로 처리하는 것이 좋다.

- history page는 순수 정적 페이지
- 데이터 생성은 Python 스크립트
- 테스트는 기존 Python contract test 또는 간단한 fixture 검증

새 패키지 추가는 피한다.

## Success Criteria

아래를 만족하면 성공이다.

- 로컬 아키텍처 페이지에서 히스토리 페이지로 바로 이동할 수 있다.
- 히스토리 페이지에서 큰 작업 흐름과 사소한 변경을 함께 볼 수 있다.
- 각 항목에 근거와 confidence가 붙는다.
- Git에 없는 로컬 작업도 일정 수준 복원된다.
- `showcase-site`와 `docs/architecture`의 parent-child 관계가 드러난다.
- 앞으로 새 작업을 추가할 때 규칙이 명확하다.
