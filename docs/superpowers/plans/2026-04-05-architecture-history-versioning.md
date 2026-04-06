# Architecture History And Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 아키텍처 페이지에서 진입 가능한 `작업 히스토리 / 버전 페이지`를 만들고, Git + spec/plan 문서 + OMX 로그 + 파일 시각을 바탕으로 과거 이력을 최대한 복원해 정적 JSON으로 관리한다.

**Architecture:** `showcase-site/history/index.html`을 정적 페이지로 추가하고, 데이터는 `showcase-site/data/project-history.json`에서 읽는다. 이 JSON은 `scripts/rebuild_project_history.py`가 Git 로그, `docs/superpowers`, `.omx/logs`, 로컬 파일 시각을 스캔해 생성하고, 수동 보강이 필요한 항목은 낮은 confidence로 남긴다. 아키텍처 페이지에는 히스토리 진입 버튼을 추가하고, contract test로 링크와 데이터 구조를 잠근다.

**Tech Stack:** Static HTML/CSS/JS, Python standard library, git CLI, existing pytest suite

---

## Working Notes

- 기준 원본은 로컬 `showcase-site/architecture/index.html`이다.
- GitHub 동기화나 Vercel 재배포는 이번 계획의 필수 범위가 아니다.
- 새 dependency는 추가하지 않는다.
- 복원 정확도보다 중요한 것은 `근거 표시`와 `confidence 표시`다.
- 과거 이력은 완전 자동화가 아니라 `자동 복원 + 수동 정리 가능` 구조로 간다.

## File Map

### Files To Modify

- `showcase-site/architecture/index.html`
  - hero 또는 footer에 히스토리 페이지 진입 링크 추가
- `showcase-site/vercel.json`
  - 필요 시 `/history` rewrite 추가
- `tests/test_showcase_site_contract.py`
  - 히스토리 링크 존재와 기본 구조 검증 추가

### Files To Create

- `showcase-site/history/index.html`
  - 작업 히스토리 정적 페이지
- `showcase-site/data/project-history.json`
  - 복원된 히스토리 데이터 계약
- `scripts/rebuild_project_history.py`
  - Git / docs / OMX / file timestamp 기반 초기 데이터 생성기
- `tests/test_project_history_contract.py`
  - JSON 스키마/핵심 seed 검증

## Task 1: Freeze The History Data Contract

**Files:**
- Create: `showcase-site/data/project-history.json`
- Create: `tests/test_project_history_contract.py`

- [ ] **Step 1: Write the failing contract test**

`tests/test_project_history_contract.py`를 만들어 아래를 검증한다.

- `meta`, `workstreams`, `versions`, `items` 키 존재
- `architecture-docs`, `entry-showcase`, `dashboard-ops`, `deployment-sharing` workstream 존재
- `items` 중 하나 이상이 `confidence`와 `evidence`를 가짐
- `showcase split` 또는 동등한 2026-04 버전 그룹 존재

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/test_project_history_contract.py -q`

Expected: FAIL because the JSON file does not exist yet.

- [ ] **Step 3: Create the minimal seed JSON**

초기 `project-history.json`을 만든다.

필수 포함:

- source priority
- 7~8개 기본 workstream
- 현재까지 복원한 주요 version groups
- 최소 1~2개의 micro item 예시

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/test_project_history_contract.py -q`

Expected: PASS

## Task 2: Build The Reconstruction Script

**Files:**
- Create: `scripts/rebuild_project_history.py`
- Modify: `showcase-site/data/project-history.json`

- [ ] **Step 1: Write a focused failing test or dry-run assertion**

테스트에서 스크립트를 실행해 최소 아래가 생성되는지 검증한다.

- 2026-03-21 architecture docs console group
- 2026-03-29/30 entry cinematic group
- 2026-04-04 showcase split group

- [ ] **Step 2: Implement source collectors**

스크립트는 아래 collector를 가진다.

- git commit collector
- docs spec/plan collector
- omx turn log collector
- file timestamp collector

- [ ] **Step 3: Implement normalization rules**

아래를 처리한다.

- 작업 스트림 분류
- version group 묶기
- micro item 분류
- confidence 계산
- evidence 배열 생성

- [ ] **Step 4: Support manual preservation**

스크립트 재실행 시 사람이 손으로 보강한 필드를 완전히 잃지 않도록 아래 중 하나를 구현한다.

- manual section merge
- `is_manual` 항목 preserve

- [ ] **Step 5: Generate the JSON and verify**

Run: `python scripts/rebuild_project_history.py`

Expected: `showcase-site/data/project-history.json`이 재생성되거나 갱신된다.

## Task 3: Build The Static History Page

**Files:**
- Create: `showcase-site/history/index.html`

- [ ] **Step 1: Add page shell**

페이지 상단에 아래를 둔다.

- 제목
- 짧은 설명
- 요약 카드
- confidence / evidence 범례

- [ ] **Step 2: Add filter controls**

최소 아래 필터를 둔다.

- 전체
- 아키텍처
- 엔트리/쇼케이스
- 대시보드/운영
- 브리핑/리포트
- 상품/RAG
- 배포/공유

- [ ] **Step 3: Render version groups**

각 그룹에는 아래를 보여준다.

- label
- 기간
- 요약
- confidence
- 대표 근거
- micro item count

- [ ] **Step 4: Render micro item details**

확장 시 아래가 보이게 한다.

- title
- summary
- files
- commits
- evidence
- reconstructed/manual 여부

- [ ] **Step 5: Add missing evidence section**

confidence가 낮거나 evidence가 약한 항목을 따로 모은다.

## Task 4: Link It From The Architecture Page

**Files:**
- Modify: `showcase-site/architecture/index.html`
- Modify: `showcase-site/vercel.json`
- Modify: `tests/test_showcase_site_contract.py`

- [ ] **Step 1: Add hero-level entry**

`작업 히스토리 보기` 링크를 아키텍처 페이지 상단에 추가한다.

- [ ] **Step 2: Add footer-level entry**

footer에도 히스토리 링크를 추가한다.

- [ ] **Step 3: Add rewrite if needed**

`/history`가 정적으로 열리도록 rewrite를 추가한다.

- [ ] **Step 4: Lock the contract with tests**

`tests/test_showcase_site_contract.py`에 아래 검증을 추가한다.

- architecture page contains history link
- history route string exists in source
- link text is stable enough for future maintenance

## Task 5: Verify The Recovery Result

**Files:**
- Modify: `showcase-site/data/project-history.json`
- Modify: `tests/test_project_history_contract.py`

- [ ] **Step 1: Run the reconstruction script**

Run: `python scripts/rebuild_project_history.py`

- [ ] **Step 2: Manually inspect high-value recovered groups**

반드시 아래가 보여야 한다.

- presentation / architecture docs
- entry command center / cinematic redesign
- showcase split and share
- dashboard stabilization

- [ ] **Step 3: Verify small-change capture**

아래 예시 성격의 micro item이 실제 데이터에 존재하는지 확인한다.

- CTA copy change
- signal visibility fix
- platform intro button removal
- snapshot recovery / recent product news recovery

- [ ] **Step 4: Final verification**

Run: `pytest tests/test_showcase_site_contract.py tests/test_project_history_contract.py -q`

Expected: PASS

## Success Criteria

- 로컬 아키텍처 페이지에서 히스토리 페이지로 이동 가능하다.
- 히스토리 데이터 계약이 테스트로 잠겨 있다.
- Git + docs + OMX + file timestamp를 조합한 초기 복원이 작동한다.
- 큰 버전 흐름과 사소한 수정이 모두 보인다.
- 각 항목에 confidence와 evidence가 붙는다.
- 나중에 GitHub/Vercel 동기화 없이도 로컬 기준으로 history를 계속 축적할 수 있다.
