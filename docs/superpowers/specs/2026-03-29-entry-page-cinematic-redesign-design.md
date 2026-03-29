# Entry Page Cinematic Redesign — Design Spec

**Date:** 2026-03-29
**Branch:** `codex/product-explorer-redesign`
**Status:** Draft

---

## 1. Overview

카드사 경쟁 인텔리전스 플랫폼의 entry-page를 APEX 스타일의 프리미엄 시네마틱 랜딩 페이지로 전면 업그레이드한다. 내외부 겸용(경영진/팀 + 잠재 고객)으로, "Vertical AI Platform for Payment Market"이라는 정체성을 강조한다.

### Goals

- GSAP ScrollTrigger 기반 풀 시네마틱 스크롤 애니메이션
- 섹션별 Spline 3D 씬 (4개)
- 임팩트 있는 한국어 카피 전면 리라이트
- 기존 바닐라 HTML/CSS/JS 구조 유지 (빌드 프로세스 없음)

### Non-Goals

- React/Vite 등 프레임워크 전환
- 상단 네비게이션 바 (불필요)
- 로그인/회원가입 기능

---

## 2. Tech Stack

| Layer | Choice | Note |
|-------|--------|------|
| Animation | GSAP 3 + ScrollTrigger + SplitText | CDN, ~45KB gzipped |
| 3D Scenes | Spline (iframe embed, 4 scenes) | 외부 호스팅 |
| Structure | Vanilla HTML/CSS/JS | 빌드 없음, 정적 서빙 |
| Font | Pretendard (CDN) | 기존 유지 |
| Accessibility | prefers-reduced-motion 지원 | 기존 패턴 확장 |

### Dependencies (CDN)

```
gsap.min.js
ScrollTrigger.min.js
SplitText.min.js (GSAP Club plugin — 또는 자체 split 구현)
```

> **SplitText 라이선스 참고:** GSAP SplitText는 Club GreenSock 유료 플러그인이다. 라이선스가 없으면 자체 text-split 유틸리티를 구현하거나, 무료 대안(splitting.js)을 사용한다.

---

## 3. Page Structure (7 Sections)

```
01 HERO        — 3D 지구본 + 임팩트 헤드라인 + CTA
02 SIGNAL      — 핵심 가치 전환 텍스트 모핑
03 INTELLIGENCE — 4축 모니터링 카드 그리드
04 METRICS     — 대형 숫자 임팩트 섹션
05 PROCESS     — 수평 스크롤 5단계 파이프라인
06 PROOF       — Before/After + 사회적 증거
07 FINAL CTA   — 마무리 전환 + 대시보드 진입
```

---

## 4. Section Details

### 4.1 HERO

**Layout:** 풀스크린, 중앙 정렬. 네비게이션 바 없음.

**Copy:**
```
[eyebrow]  VERTICAL AI PLATFORM FOR PAYMENT MARKET
[headline] 카드 시장의 모든 변화를 먼저 봅니다
[subtext]  4개 카드사의 이벤트와 상품 변화를 실시간으로 수집하고
           AI가 분석합니다. 경쟁사보다 먼저 움직이세요.
[cta-1]    대시보드 바로가기 →
[cta-2]    플랫폼 소개
```

**3D:** Spline Scene 1 — 지구본. 자동 회전, 스크롤에 따라 줌아웃 + 회전 가속, 포인터 연동 subtle rotation.

**Animation:**
- Headline: GSAP SplitText (또는 자체 구현) — 글자 단위 stagger reveal, 아래→위 마스킹 (duration: 0.8s, stagger: 0.03s)
- Subtext: headline 완료 후 0.3s delay, fade + translateY(20px→0)
- CTA: subtext 후 0.2s, scale(0.95→1) + opacity
- Scroll cue: 하단 bounce 화살표, 스크롤 시작 시 fade out
- Pointer: 마우스 위치에 따라 globe subtle rotation (기존 parallax 확장)

### 4.2 SIGNAL

**Layout:** 뷰포트 고정(pinned), 스크롤 진행도에 따라 텍스트 전환.

**Copy:**
```
[eyebrow]  FROM CHECKING TO DECIDING
[phase-1]  여러 곳에서 찾고        ← 취소선 애니메이션 후 fade out
[phase-2]  한곳에서 판단합니다      ← 글자 단위 reveal
[subtext]  4개 카드사의 변화를 매일 수집하고, AI가 읽고,
           당신은 판단만 하면 됩니다.
```

**Animation (scroll-scrubbed, pinned):**
- Phase 1 (0→0.3): "여러 곳에서 찾고" 등장 → 취소선 width 0→100%
- Phase 2 (0.3→0.7): 취소선 텍스트 fade + blur out, "한곳에서 판단합니다" SplitText reveal
- Phase 3 (0.7→1): 부제 fade in, 배경 그라디언트 미세 변화

### 4.3 INTELLIGENCE

**Layout:** 중앙 제목 + 2×2 카드 그리드. 카드 뒤에 Spline 크리스탈.

**Copy (4 cards):**

| Card | Title | Description | Stats |
|------|-------|-------------|-------|
| 이벤트 변화 | 신규/변경/종료 감지 | 24h 수집, **4** 카드사 |
| 상품 출시 | 출시/중단/혜택 변경 추적 | 150+ 추적 상품, 7d 출시일 추정 |
| 경쟁사 비교 | 카드사별 전략 횡단면 비교 | **4** 비교 카드사, 7 분석 카테고리 |
| 시장 반응 | 검색 트렌드/관심도/뉴스 | 실시간 시그널 |

**3D:** Spline Scene 2 — 추상 크리스탈. 카드 그리드 뒤에서 천천히 자전, 스크롤 scale 변화.

**Animation:**
- Card stagger: 진입 시 4장 0.15s 간격 순차 reveal (translateY(40px→0) + opacity)
- 3D tilt: 각 카드 호버 시 perspective(800px) rotateX/Y(±5deg)
- Number countup: 뷰포트 진입 시 0→값 카운트업
- Glow pulse: 각 카드 아이콘 색상 subtle pulse

### 4.4 METRICS

**Layout:** 중앙 정렬, 대형 주요 숫자 + 하단 보조 숫자 행.

**Copy:**
```
[big-number]   2,400+        ← 그라디언트 텍스트 (green→cyan)
[big-label]    분석된 이벤트 & 상품 변화

[sub-1]  4          모니터링 카드사
[sub-2]  24h        수집 주기
[sub-3]  7          분석 카테고리
[sub-4]  AI         Gemini 기반 인사이트
```

**Animation (scroll-pinned):**
- Big number: 0→2,400+ GSAP countup (1.5s, power3.out)
- Sub metrics: 메인 완료 후 0.2s 간격 좌→우 cascade countup
- Divider grow: 구분선 height 0→100%
- Background pulse: 숫자 완성 시 subtle radial gradient pulse

### 4.5 PROCESS

**Layout:** 수평 스크롤 (세로 스크롤 → 가로 이동 변환). 5개 스텝 카드.

**Copy (5 steps):**

| # | EN Label | KR Title | Description | Detail |
|---|----------|----------|-------------|--------|
| 01 | COLLECT | 수집 | 4개 카드사의 이벤트, 상품, 공시 데이터를 자동 크롤링 | 신한 · 삼성 · 현대 · KB (하나 · 우리 · BC — coming soon) |
| 02 | ANALYZE | 분석 | Gemini AI가 변화의 맥락을 읽고 카테고리별 분류 | 할인/적립 · 여행 · 프리미엄 · 생활 · 제휴 · 금융 |
| 03 | ORGANIZE | 정리 | 중복 제거, 타임라인 배치로 한눈에 정리 | Gantt 타임라인 · 카드사별 뷰 |
| 04 | BRIEF | 브리핑 | 주간/일간 AI 브리핑으로 핵심 변화만 요약 전달 | 주간 리포트 · 일간 알림 · 이메일 |
| 05 | DECIDE | 대응 | 찾는 시간 줄이고 경쟁사보다 먼저 전략적 판단 | 경쟁 우위 · 선제 대응 · 전략 수립 |

**Animation (scroll-scrubbed, pinned):**
- ScrollTrigger pin + scrub: 세로 스크롤 → 가로 이동
- Step reveal: 현재 스텝만 full opacity, 나머지 dimmed
- Progress bar: 그라디언트 width 0→100% 스크롤 연동
- Number pulse: 현재 활성 스텝 번호에 glow
- Color shift: 배경 그라디언트가 현재 스텝 색상으로 미세 변화
- Mobile fallback: < 760px에서는 pin/scrub 해제, 5개 카드 세로 스택으로 전환

### 4.6 PROOF

**Layout:** Before/After 스플릿 + 대형 증거 숫자.

**Copy:**
```
[eyebrow]  TRANSFORMATION
[headline] 업무가 달라집니다

BEFORE:
  ❌ 카드사 4곳 개별 방문
  ❌ 수동으로 변화 취합
  ❌ Excel에 정리하는 데 반나절
  ❌ 이미 지나간 변화를 뒤늦게 발견
  ❌ "경쟁사가 뭘 했지?" 매번 처음부터

AFTER:
  ✅ 한 화면에서 전체 파악
  ✅ AI가 자동 수집 + 분류
  ✅ 대시보드 열면 즉시 확인
  ✅ 변화 발생 당일 알림
  ✅ 주간 AI 브리핑으로 트렌드 파악

[big-number]  80%
[label]       경쟁사 모니터링에 쓰던 시간 절감
```

**3D:** Spline Scene 3 — 얽힌 실 → 정돈된 크리스탈 변환 (스크롤 기반 morph).

**Animation:**
- Split wipe: Before 먼저 등장, 중앙에서 After wipe 전환
- List stagger: 각 항목 0.1s 간격 순차 fade-in
- 80% countup: pinned, 0→80 카운트, 그라디언트 glow
- Spline morph: 스크롤 기반 형태 변환

### 4.7 FINAL CTA

**Layout:** 중앙 정렬, 에너지 글로우 배경.

**Copy:**
```
[eyebrow]  VERTICAL AI PLATFORM
[line-1]   경쟁사보다 먼저.
[line-2]   판단은 더 빠르게.          ← 그라디언트 텍스트
[subtext]  카드 시장의 변화를 AI가 수집하고 정리합니다.
           당신은 대시보드를 열기만 하면 됩니다.
[cta]      대시보드 시작하기 →
[note]     로그인 없이 바로 확인
```

**3D:** Spline Scene 4 — 파티클 에너지 필드. 포인터 반응.

**Animation:**
- Text cascade: "경쟁사보다 먼저." → 0.4s 후 "판단은 더 빠르게." 그라디언트 reveal
- Background energy: 진입 시 radial glow pulse (scale + opacity)
- CTA button: glow shadow 스크롤 연동 증가, hover scale(1.05)
- Footer fade: CTA 아래 "Vertical AI Platform" 서서히 등장

---

## 5. Spline 3D Scenes (4)

| # | Name | Section | Behavior |
|---|------|---------|----------|
| 1 | Globe | Hero | 자전 + 스크롤 줌아웃 + 포인터 rotation |
| 2 | Crystal | Intelligence | 천천히 자전 + 스크롤 scale 변화 |
| 3 | Morph | Proof | 얽힌 형태 → 크리스탈 스크롤 morph |
| 4 | Energy | Final CTA | 파티클 필드 + 포인터 반응 |

각 씬은 Spline에서 별도 생성 후 iframe embed. `loading="lazy"`로 성능 최적화.

**개발 시 Spline 대체:** Spline 씬 URL이 준비되기 전에는 각 씬 위치에 CSS 그라디언트 + blur 배경의 placeholder를 표시한다. iframe `src`는 빈 문자열로 두고, Spline URL이 확정되면 교체한다.

---

## 6. Color System

기존 CSS 변수 체계를 확장한다.

```
--bg-base:         #07111e (기존 유지)
--bg-deep:         #040b14 (기존 유지)
--accent:          #4ade80 (green — CTA, 주요 강조)
--accent-cyan:     #22d3ee (그라디언트 보조)
--accent-indigo:   #818cf8 (상품/분석 카드)
--accent-red:      #f87171 (경쟁사/경고)
--accent-yellow:   #facc15 (프로세스/시장반응)
--accent-purple:   #c084fc (증거/변환)
--accent-orange:   #fb923c (정리 단계)
--text-primary:    #ffffff
--text-secondary:  #94a3b8
--text-muted:      #64748b
--text-dim:        #475569
```

---

## 7. Responsive Breakpoints

기존 breakpoint 체계 유지:

| Breakpoint | Behavior |
|------------|----------|
| > 1100px | Full layout — 2×2 그리드, 수평 스크롤, 모든 Spline 활성 |
| 760–1100px | 그리드 1열 전환, Spline 축소 |
| < 760px | 모바일 — 수평 스크롤→세로 스택, Spline hero만 유지 (나머지 숨김), 포인터 트래킹 비활성 |
| prefers-reduced-motion | 모든 GSAP 애니메이션 즉시 완료, Spline 자전 정지, 스크롤 pin 해제 |

---

## 8. Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 3.0s |
| Total JS (excl. Spline) | < 200KB gzipped |
| Spline iframes | lazy-loaded, 뷰포트 근처에서만 로드 |
| CLS | < 0.1 |

Spline은 무거우므로:
- `loading="lazy"` + IntersectionObserver로 뷰포트 근접 시만 iframe src 설정
- 모바일(< 760px)에서 hero 외 Spline 비활성
- `prefers-reduced-motion` 시 Spline 정적 스크린샷 fallback 고려

---

## 9. File Structure

```
entry-page/
├── index.html          ← 전면 재작성
├── style.css           ← 전면 재작성
├── script.js           ← 전면 재작성 (GSAP 통합)
└── (no build process)
```

외부 의존성은 모두 CDN으로 로드:
- GSAP core + ScrollTrigger: `cdn.jsdelivr.net/npm/gsap`
- Pretendard font: 기존 CDN 유지
- Spline scenes: Spline 퍼블리시 URL (iframe)

---

## 10. Data Accuracy Notes

- **모니터링 카드사**: 현재 4개사 (신한 · 삼성 · 현대 · KB)
- **예정**: 하나 · 우리 · BC — coming soon으로 표기
- **카테고리**: 할인/적립, 여행/항공, 프리미엄, 생활/편의, 제휴/멤버십, 금융, 기타 (7개)
- **"경쟁 과열도" 카테고리는 삭제 상태 유지**
- 수치(2,400+, 150+, 80% 등)는 실제 데이터 기반으로 조정 가능
