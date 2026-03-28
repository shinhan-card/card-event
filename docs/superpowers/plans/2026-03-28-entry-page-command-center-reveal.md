# Entry Page Command Center Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `entry-page`를 기존 단일 히어로 진입 화면에서, 기존 3D Spline 씬을 유지한 채 `프리미엄 전략 플랫폼형 싱글 스크롤 랜딩`으로 재구성한다.

**Architecture:** 기존 iframe 기반 3D scene을 페이지 전체의 persistent background로 유지하고, 전면은 `Hero Command Layer -> Sticky Signal Bar -> Intelligence Reveal -> Briefing Preview -> Process Narrative -> Final CTA` 순서의 semantically separated sections로 재구성한다. HTML은 섹션 골격과 접근성 hook을 담당하고, CSS는 톤/레이아웃/반응형/레이어링을 담당하며, JS는 scroll state, counter, section focus, reduced-motion-aware interaction을 최소 범위로 담당한다.

**Tech Stack:** static HTML, CSS, vanilla JS, existing FastAPI static mount, pytest, optional Playwright/manual browser verification

---

## File Structure

- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\index.html`
  - 새 싱글 스크롤 섹션 구조, signal modules, preview blocks, CTA hierarchy, semantic ids/data-attrs
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\style.css`
  - color/type token 재정의, split hero, sticky bar, section grammar, responsive layout, reduced-motion styles
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\script.js`
  - scroll reveal, active section state, KPI count-up, hover/focus enhancement, 3D/content input ownership 보조
- Create: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\tests\test_entry_page_contract.py`
  - required section ids, hero budget guardrails, CTA hierarchy markers, reduced-motion hooks, semantic structure 검증
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\tests\test_app_routes.py`
  - `/entry-page/index.html` 또는 `/entry-page/` static delivery 회귀 보강

## Task 1: Entry page information architecture를 HTML에 고정

**Files:**
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\index.html`
- Create: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\tests\test_entry_page_contract.py`

- [ ] **Step 1: failing contract tests 작성**
  - 필수 section id 존재 여부를 검증:
    - `hero-command`
    - `signal-bar`
    - `intelligence-reveal`
    - `briefing-preview`
    - `process-narrative`
    - `final-cta`
  - hero 내부에 primary CTA 1개와 secondary action 1개만 있는지 검증
  - 4개 monitoring axis가 hero 또는 early signal layer에 존재하는지 검증

- [ ] **Step 2: 테스트를 실패시키기**
  - Run: `pytest tests/test_entry_page_contract.py -q`
  - Expected: section id 또는 semantic hook 부재로 FAIL

- [ ] **Step 3: HTML 골격 재구성**
  - 현재 중앙 집중형 hero를 split composition 기반 hero shell로 변경
  - 기존 edge feature pill은 유지 여부를 결정하되, 새 hero budget 안에서 의미 있는 signal module로 승격하거나 통합
  - 각 섹션에 semantic id와 `data-section` 속성 부여
  - sticky signal bar, briefing preview, process narrative, final CTA 마크업 추가

- [ ] **Step 4: hero budget guardrail 반영**
  - 첫 화면에 동급 위계 카드 다수 배치 금지
  - hero에서 완성형 브리핑 패널 전체를 노출하지 않음
  - primary CTA는 `플랫폼 입장`, secondary action은 별도 보조 스타일 hook 부여

- [ ] **Step 5: 테스트 재실행**
  - Run: `pytest tests/test_entry_page_contract.py -q`
  - Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add entry-page/index.html tests/test_entry_page_contract.py
git commit -m "feat: add entry page command center structure"
```

## Task 2: Premium command center visual system을 CSS로 재정의

**Files:**
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\style.css`
- Reference: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\docs\superpowers\specs\2026-03-28-entry-page-command-center-reveal-design.md`
- Test: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\tests\test_entry_page_contract.py`

- [ ] **Step 1: visual token 정리**
  - 배경, panel, border, text, accent, muted, glow를 semantic custom property로 재정의
  - 기존 단일 파란 강조색 구조를 `deep navy + graphite + silver + ice blue` 계열로 재구성
  - hero display, UI sans, numeric/data 역할별 token 추가

- [ ] **Step 2: layout baseline 변경**
  - `body`의 `overflow: hidden` 제거 또는 싱글 스크롤 구조에 맞게 재정의
  - `spline-container`를 persistent background layer로 유지
  - `ui-overlay`는 전체 높이 스크롤 콘텐츠 컨테이너로 재설계
  - pointer-events 구조를 hero 구간과 본문 구간에 맞게 분리

- [ ] **Step 3: section grammar 구현**
  - hero: split composition
  - signal bar: thin sticky strip
  - intelligence reveal: equal 4-up grid 대신 staggered/focusable module layout
  - briefing preview: full-width editorial sheet
  - process narrative: narrow rail/timeline
  - final CTA: calm closing composition

- [ ] **Step 4: hero typography와 hierarchy 구현**
  - 현재 모든 텍스트가 center-locked로 보이는 구조를 완화
  - hero headline과 body text의 type personality 분리
  - 영문 subtitle, 한글 headline, data label의 weight/tracking 분리

- [ ] **Step 5: responsive와 reduced-motion 스타일 추가**
  - 모바일에서 3D가 과하지 않도록 overlay contrast 강화
  - touch target 44px 이상 유지
  - `@media (prefers-reduced-motion: reduce)` 대응 추가

- [ ] **Step 6: 최소 계약 테스트 보강**
  - reduced-motion 관련 class/hook 또는 data attr 존재를 검사
  - secondary CTA style hook 존재 여부 검사

- [ ] **Step 7: 테스트 재실행**
  - Run: `pytest tests/test_entry_page_contract.py -q`
  - Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add entry-page/style.css tests/test_entry_page_contract.py
git commit -m "style: add premium command center visual system"
```

## Task 3: Scroll-driven interaction과 3D ownership 보조 로직 추가

**Files:**
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\script.js`
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\index.html`
- Test: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\tests\test_entry_page_contract.py`

- [ ] **Step 1: JS interaction contract test 추가**
  - active section을 표시할 수 있는 hook 존재 여부
  - count-up target data attr 존재 여부
  - script가 reduced-motion일 때 heavy animation path를 피할 수 있는 guard를 갖는지 검증

- [ ] **Step 2: 테스트를 실패시키기**
  - Run: `pytest tests/test_entry_page_contract.py -q -k "script or interaction"`
  - Expected: FAIL

- [ ] **Step 3: interaction scaffold 구현**
  - `IntersectionObserver`로 section reveal 및 active state 관리
  - sticky signal bar 활성 상태 토글
  - KPI count-up 로직 추가
  - hover/focus 시 signal module 강조 로직 추가

- [ ] **Step 4: input ownership model 보조**
  - hero 구간과 본문 구간에서 class/state를 달리해 CSS가 pointer-events를 제어할 수 있게 함
  - 모바일 또는 reduced-motion 환경에서는 parallax/active motion 강도 축소

- [ ] **Step 5: graceful fallback 보장**
  - JS가 없어도 모든 콘텐츠가 순서대로 읽히는 구조 유지
  - 초기 로드에서 핵심 hero/CTA가 숨겨진 채로 남지 않게 방지

- [ ] **Step 6: 테스트 재실행**
  - Run: `pytest tests/test_entry_page_contract.py -q -k "script or interaction"`
  - Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add entry-page/index.html entry-page/script.js tests/test_entry_page_contract.py
git commit -m "feat: add entry page scroll interaction states"
```

## Task 4: FastAPI static delivery와 구조 회귀를 고정

**Files:**
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\tests\test_app_routes.py`
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\tests\test_entry_page_contract.py`

- [ ] **Step 1: static route 회귀 테스트 작성**
  - `/entry-page/index.html` 또는 `/entry-page/` 요청이 200을 반환하는지 검증
  - 응답 body에 새 핵심 섹션 id가 포함되는지 검증
  - entry page에서 새 primary CTA 라벨이 포함되는지 검증

- [ ] **Step 2: 테스트를 실패시키기**
  - Run: `pytest tests/test_app_routes.py -q -k entry_page`
  - Expected: route assertion missing 또는 새 구조 부재로 FAIL

- [ ] **Step 3: 테스트가 기대하는 경로를 현재 static mount와 맞추기**
  - `app.py`의 `/entry-page` mount 계약을 기준으로 테스트 경로를 고정
  - 필요시 `/entry-page/`와 `/entry-page/index.html` 둘 다 지원 여부를 확인

- [ ] **Step 4: tests 재실행**
  - Run: `pytest tests/test_app_routes.py -q -k entry_page`
  - Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/test_app_routes.py tests/test_entry_page_contract.py
git commit -m "test: lock entry page static delivery contract"
```

## Task 5: Visual verification and polish pass

**Files:**
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\index.html`
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\style.css`
- Modify: `C:\Users\82104\Desktop\Cursor\card-event-intelligence\entry-page\script.js`

- [ ] **Step 1: 로컬 서버 실행 경로 확인**
  - Run: `python app.py`
  - Expected: FastAPI server boot, `/entry-page` static mount available

- [ ] **Step 2: 데스크톱 visual smoke**
  - Open: `http://localhost:8000/entry-page/index.html`
  - 확인 항목:
    - 3D가 전체 페이지 배경으로 유지되는지
    - 첫 화면이 포스터처럼 읽히는지
    - 첫 화면이 대시보드처럼 과밀하지 않은지
    - CTA hierarchy가 명확한지

- [ ] **Step 3: 모바일 visual smoke**
  - 375px 너비에서 확인:
    - headline line-break 자연스러움
    - horizontal scroll 없음
    - CTA touch target 충분
    - 3D가 텍스트를 가리지 않음

- [ ] **Step 4: reduced motion smoke**
  - `prefers-reduced-motion` 환경에서 reveal/count-up이 과격하지 않게 축소되는지 확인

- [ ] **Step 5: polish fix 적용**
  - spacing/hierarchy/contrast에서 마지막 미세 조정
  - 카드가 반복돼 보이면 레이아웃 문법 우선으로 조정

- [ ] **Step 6: 전체 테스트 재실행**
  - Run: `pytest tests/test_entry_page_contract.py tests/test_app_routes.py -q`
  - Expected: PASS

- [ ] **Step 7: Final commit**

```bash
git add entry-page/index.html entry-page/style.css entry-page/script.js tests/test_entry_page_contract.py tests/test_app_routes.py
git commit -m "feat: launch command center reveal entry page"
```

## Verification Checklist

- [ ] `/entry-page` 또는 `/entry-page/index.html`이 로컬 서버에서 정상 렌더링된다
- [ ] 첫 화면에서 플랫폼 위상과 monitoring scope가 동시에 전달된다
- [ ] 기존 Spline 3D가 제거되지 않고 persistent background로 유지된다
- [ ] hero가 과밀한 mini-dashboard처럼 보이지 않는다
- [ ] sticky signal bar, reveal sections, briefing preview, process narrative, final CTA가 모두 순서대로 존재한다
- [ ] 모바일 375px에서 horizontal scroll이 없다
- [ ] reduced-motion 환경에서 과한 모션이 줄어든다

## Recommended Next Step

이 plan file이 준비되면 다음 순서로 진행한다.

1. `CEO / design / eng` 자동 리뷰 파이프라인을 entry page plan에 적용
2. 리뷰에서 taste decision이 남으면 정리
3. 구현 실행
