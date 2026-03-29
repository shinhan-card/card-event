# Entry Page Cinematic Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the entry-page into an APEX-style cinematic landing page with GSAP ScrollTrigger animations, per-section Spline 3D scenes, and rewritten Korean copy.

**Architecture:** Full rewrite of 3 files (`index.html`, `style.css`, `script.js`) in `entry-page/`. No build process — vanilla HTML/CSS/JS with GSAP loaded via CDN. Spline scenes embedded as lazy-loaded iframes. Progressive enhancement: all content readable without JS, animations layered on top.

**Tech Stack:** HTML5, CSS3 (custom properties, grid, clamp), GSAP 3 + ScrollTrigger (CDN), Spline (iframe), Pretendard font (CDN)

**Spec:** `docs/superpowers/specs/2026-03-29-entry-page-cinematic-redesign-design.md`

---

## File Structure

All changes are within `entry-page/`:

| File | Action | Responsibility |
|------|--------|---------------|
| `entry-page/index.html` | Full rewrite | 7-section semantic HTML, GSAP CDN links, Spline iframes |
| `entry-page/style.css` | Full rewrite | Color system, layout, component styles, responsive, reduced-motion |
| `entry-page/script.js` | Full rewrite | GSAP ScrollTrigger timelines, text splitting, countup, pointer tracking, lazy Spline loading |

No new files created. No build process. No package.json.

---

## Task 1: HTML Skeleton + GSAP CDN Setup

**Files:**
- Rewrite: `entry-page/index.html`

- [ ] **Step 1: Write the base HTML with all 7 sections (empty content)**

Replace entire `index.html` with the new skeleton. This establishes the section structure and loads dependencies. Each section has its `id`, `data-section`, and inner wrapper.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>카드사 경쟁 인텔리전스 | Vertical AI Platform</title>
  <link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" as="style" crossorigin
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
  <link rel="stylesheet" href="/entry-page/style.css">
</head>
<body data-page="entry-cinematic">

  <!-- Spline background (hero) -->
  <div class="spline-bg" id="spline-hero-bg" aria-hidden="true">
    <div class="spline-placeholder"></div>
    <div class="scene-wash"></div>
  </div>

  <main class="page-main">

    <!-- 01 HERO -->
    <section id="hero" class="sec sec--hero" data-section="hero">
      <div class="sec__inner">
        <!-- Content in Task 2 -->
      </div>
    </section>

    <!-- 02 SIGNAL -->
    <section id="signal" class="sec sec--signal" data-section="signal">
      <div class="sec__inner">
        <!-- Content in Task 3 -->
      </div>
    </section>

    <!-- 03 INTELLIGENCE -->
    <section id="intelligence" class="sec sec--intel" data-section="intelligence">
      <div class="sec__inner">
        <!-- Content in Task 4 -->
      </div>
    </section>

    <!-- 04 METRICS -->
    <section id="metrics" class="sec sec--metrics" data-section="metrics">
      <div class="sec__inner">
        <!-- Content in Task 5 -->
      </div>
    </section>

    <!-- 05 PROCESS -->
    <section id="process" class="sec sec--process" data-section="process">
      <div class="sec__inner">
        <!-- Content in Task 6 -->
      </div>
    </section>

    <!-- 06 PROOF -->
    <section id="proof" class="sec sec--proof" data-section="proof">
      <div class="sec__inner">
        <!-- Content in Task 7 -->
      </div>
    </section>

    <!-- 07 FINAL CTA -->
    <section id="cta" class="sec sec--cta" data-section="cta">
      <div class="sec__inner">
        <!-- Content in Task 8 -->
      </div>
    </section>

  </main>

  <!-- GSAP -->
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/ScrollTrigger.min.js"></script>
  <script src="/entry-page/script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write minimal CSS reset + variables**

Create a minimal `style.css` so the page renders without errors. Full styles come in later tasks.

```css
/* ── Reset ── */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: auto; /* GSAP controls scroll */ }
body {
  font-family: "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg-base);
  color: var(--text-primary);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ── Tokens ── */
:root {
  /* Backgrounds */
  --bg-base: #07111e;
  --bg-deep: #040b14;
  --bg-panel: rgba(8, 17, 29, 0.68);
  --bg-panel-strong: rgba(10, 19, 33, 0.86);
  --bg-line: rgba(196, 216, 255, 0.08);

  /* Text */
  --text-primary: rgba(247, 250, 255, 0.96);
  --text-secondary: rgba(214, 225, 243, 0.78);
  --text-muted: rgba(189, 201, 221, 0.58);
  --text-dim: rgba(120, 140, 170, 0.5);

  /* Accent palette */
  --accent: #4ade80;
  --accent-cyan: #22d3ee;
  --accent-indigo: #818cf8;
  --accent-red: #f87171;
  --accent-yellow: #facc15;
  --accent-purple: #c084fc;
  --accent-orange: #fb923c;
  --accent-glow: rgba(74, 222, 128, 0.2);

  /* Layout */
  --content-w: min(1180px, calc(100vw - 48px));
  --sec-gap: 124px;
  --radius-xl: 36px;
  --radius-lg: 24px;
  --radius-md: 18px;

  /* Pointer (JS-driven) */
  --ptr-x: 0;
  --ptr-y: 0;
}

/* ── Layout ── */
.page-main { position: relative; z-index: 1; }
.sec { position: relative; }
.sec__inner { width: var(--content-w); margin: 0 auto; }

/* ── Spline BG ── */
.spline-bg {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none;
}
.spline-placeholder {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 40%, #0a1e3a 0%, var(--bg-base) 70%);
}
.scene-wash {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 40%, var(--bg-base) 100%);
}
```

- [ ] **Step 3: Write minimal script.js with GSAP registration check**

```javascript
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /* ── GSAP registration ── */
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("[entry] GSAP or ScrollTrigger not loaded");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add("js-ready");
  console.log("[entry] GSAP ready, ScrollTrigger registered");
});
```

- [ ] **Step 4: Verify in browser**

Open `http://127.0.0.1:8000/entry-page/` — should see dark background, no errors in console, "[entry] GSAP ready" message.

Run: `node --check entry-page/script.js`
Expected: no output (syntax OK)

- [ ] **Step 5: Commit**

```bash
git add entry-page/index.html entry-page/style.css entry-page/script.js
git commit -m "feat(entry): scaffold cinematic redesign with GSAP CDN"
```

---

## Task 2: Hero Section — Content + Styles

**Files:**
- Modify: `entry-page/index.html` (hero section inner)
- Modify: `entry-page/style.css` (append hero styles)

- [ ] **Step 1: Add hero HTML content**

Replace the `<!-- Content in Task 2 -->` comment inside `#hero > .sec__inner`:

```html
<div class="hero__content">
  <span class="eyebrow">VERTICAL AI PLATFORM FOR PAYMENT MARKET</span>
  <h1 class="hero__title">카드 시장의 모든 변화를<br>먼저 봅니다</h1>
  <p class="hero__sub">
    4개 카드사의 이벤트와 상품 변화를 실시간으로 수집하고
    AI가 분석합니다. 경쟁사보다 먼저 움직이세요.
  </p>
  <div class="hero__actions">
    <a href="/" class="btn btn--primary">대시보드 바로가기 <span class="btn__arrow">→</span></a>
    <a href="#signal" class="btn btn--ghost">플랫폼 소개</a>
  </div>
  <div class="hero__scroll-cue" aria-hidden="true">
    <span class="scroll-cue__line"></span>
  </div>
</div>
```

- [ ] **Step 2: Append hero CSS to style.css**

```css
/* ── Hero ── */
.sec--hero {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 0 80px;
  text-align: center;
}

.hero__content {
  position: relative;
  z-index: 2;
  max-width: 720px;
  margin: 0 auto;
}

.eyebrow {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: var(--accent);
  margin-bottom: 24px;
}

.hero__title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.04em;
  color: var(--text-primary);
  margin-bottom: 24px;
}

/* Each character wrapper created by JS split */
.hero__title .char {
  display: inline-block;
  opacity: 0;
  transform: translateY(40px);
}

.hero__sub {
  font-size: clamp(1rem, 2vw, 1.15rem);
  line-height: 1.7;
  color: var(--text-muted);
  margin-bottom: 40px;
  max-width: 520px;
  margin-left: auto;
  margin-right: auto;
}

/* ── Buttons ── */
.hero__actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.btn--primary {
  background: var(--accent);
  color: var(--bg-base);
  box-shadow: 0 0 24px var(--accent-glow);
}
.btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 40px var(--accent-glow);
}

.btn__arrow {
  transition: transform 180ms ease;
}
.btn--primary:hover .btn__arrow {
  transform: translateX(4px);
}

.btn--ghost {
  border: 1px solid var(--bg-line);
  color: var(--text-secondary);
  background: transparent;
}
.btn--ghost:hover {
  border-color: rgba(196, 216, 255, 0.24);
  color: var(--text-primary);
}

/* ── Scroll cue ── */
.hero__scroll-cue {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
}
.scroll-cue__line {
  display: block;
  width: 1px;
  height: 48px;
  background: linear-gradient(180deg, var(--accent) 0%, transparent 100%);
  animation: scrollPulse 2s ease-in-out infinite;
}
@keyframes scrollPulse {
  0%, 100% { opacity: 0.3; transform: scaleY(0.6); }
  50% { opacity: 1; transform: scaleY(1); }
}
```

- [ ] **Step 3: Verify hero renders correctly in browser**

Open page. Should see: dark background, green eyebrow, large Korean headline, subtitle, two buttons (green primary + ghost), scroll cue line animating.

- [ ] **Step 4: Commit**

```bash
git add entry-page/index.html entry-page/style.css
git commit -m "feat(entry): add hero section content and styles"
```

---

## Task 3: Hero GSAP Animation — Text Split + Entrance Timeline

**Files:**
- Modify: `entry-page/script.js`

- [ ] **Step 1: Add text-split utility and hero entrance timeline**

Replace `script.js` content with the full hero animation setup:

```javascript
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /* ── Guard: GSAP ── */
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    document.body.classList.add("no-gsap");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ── Reduced motion ── */
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isDesktop = () => window.innerWidth > 760;

  if (prefersReduced.matches) {
    document.body.classList.add("js-ready", "reduced-motion");
    return; /* All content visible via CSS fallback */
  }
  document.body.classList.add("js-ready");

  /* ── Utility: split text into <span class="char"> wrappers ── */
  function splitChars(el) {
    const text = el.textContent;
    el.innerHTML = "";
    el.setAttribute("aria-label", text);
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      if (ch === "\n") continue;
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.setAttribute("aria-hidden", "true");
      frag.appendChild(span);
    }
    el.appendChild(frag);
    return el.querySelectorAll(".char");
  }

  /* ── Hero entrance timeline ── */
  function initHero() {
    const title = document.querySelector(".hero__title");
    const sub = document.querySelector(".hero__sub");
    const actions = document.querySelector(".hero__actions");
    const cue = document.querySelector(".hero__scroll-cue");
    const eyebrow = document.querySelector(".sec--hero .eyebrow");
    if (!title) return;

    const chars = splitChars(title);

    const tl = gsap.timeline({ delay: 0.3 });

    tl.from(eyebrow, {
      opacity: 0, y: 10, duration: 0.5, ease: "power2.out"
    })
    .from(chars, {
      opacity: 0, y: 40, duration: 0.6,
      stagger: 0.025, ease: "power3.out"
    }, "-=0.2")
    .from(sub, {
      opacity: 0, y: 20, duration: 0.6, ease: "power2.out"
    }, "-=0.3")
    .from(actions, {
      opacity: 0, y: 16, scale: 0.97, duration: 0.5, ease: "power2.out"
    }, "-=0.3")
    .from(cue, {
      opacity: 0, duration: 0.6
    }, "-=0.2");

    /* Fade scroll cue on scroll */
    if (cue) {
      gsap.to(cue, {
        opacity: 0,
        scrollTrigger: {
          trigger: ".sec--hero",
          start: "top top",
          end: "+=200",
          scrub: true
        }
      });
    }
  }

  /* ── Pointer parallax (hero) ── */
  function initPointer() {
    const hero = document.querySelector(".sec--hero");
    const bg = document.querySelector(".spline-bg");
    if (!hero || !bg) return;

    hero.addEventListener("mousemove", (e) => {
      if (!isDesktop()) return;
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      document.documentElement.style.setProperty("--ptr-x", x);
      document.documentElement.style.setProperty("--ptr-y", y);
    });

    hero.addEventListener("mouseleave", () => {
      gsap.to(document.documentElement, {
        "--ptr-x": 0, "--ptr-y": 0, duration: 0.6, ease: "power2.out"
      });
    });
  }

  /* ── Init ── */
  initHero();
  initPointer();
});
```

- [ ] **Step 2: Add CSS for reduced-motion and no-gsap fallbacks**

Append to `style.css`:

```css
/* ── Reduced motion / no-JS fallbacks ── */
.no-gsap .char,
.reduced-motion .char {
  opacity: 1 !important;
  transform: none !important;
}

.reduced-motion .hero__sub,
.reduced-motion .hero__actions,
.reduced-motion .hero__scroll-cue,
.reduced-motion .eyebrow {
  opacity: 1 !important;
  transform: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-cue__line { animation: none; opacity: 0.5; }
}

/* ── Spline BG pointer reaction ── */
.spline-placeholder {
  transition: transform 400ms ease-out;
  transform: translate3d(
    calc(var(--ptr-x) * -12px),
    calc(var(--ptr-y) * -12px),
    0
  ) scale(1.04);
}
```

- [ ] **Step 3: Verify animation plays**

Open browser. On load: eyebrow fades in → title characters stagger up → subtitle fades → buttons scale in → scroll cue appears. Scroll down: cue fades out. Mouse movement shifts background.

Run: `node --check entry-page/script.js`

- [ ] **Step 4: Commit**

```bash
git add entry-page/script.js entry-page/style.css
git commit -m "feat(entry): add hero GSAP entrance animation and pointer parallax"
```

---

## Task 4: Signal Section — Pinned Text Morph

**Files:**
- Modify: `entry-page/index.html` (signal section)
- Modify: `entry-page/style.css` (signal styles)
- Modify: `entry-page/script.js` (signal timeline)

- [ ] **Step 1: Add signal HTML**

Replace `<!-- Content in Task 3 -->` inside `#signal > .sec__inner`:

```html
<div class="signal__wrap">
  <span class="eyebrow">FROM CHECKING TO DECIDING</span>
  <p class="signal__old">여러 곳에서 찾고</p>
  <h2 class="signal__new">한곳에서 판단합니다</h2>
  <p class="signal__sub">
    4개 카드사의 변화를 매일 수집하고, AI가 읽고,<br>
    당신은 판단만 하면 됩니다.
  </p>
</div>
```

- [ ] **Step 2: Add signal CSS**

```css
/* ── Signal ── */
.sec--signal {
  min-height: 200vh; /* scroll room for pin */
  display: flex;
  align-items: flex-start;
}

.signal__wrap {
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
  padding: 20vh 0;
}

.signal__old {
  font-size: clamp(2rem, 5vw, 2.8rem);
  font-weight: 800;
  color: var(--text-dim);
  letter-spacing: -0.03em;
  position: relative;
  display: inline-block;
}

/* Animated strikethrough via pseudo-element */
.signal__old::after {
  content: "";
  position: absolute;
  left: 0; top: 50%;
  width: 0%;
  height: 3px;
  background: var(--accent-red);
  transition: none; /* GSAP controls */
}

.signal__new {
  font-size: clamp(2.5rem, 6vw, 3.5rem);
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  margin-top: 16px;
  opacity: 0; /* GSAP reveals */
}

.signal__new .char {
  display: inline-block;
  opacity: 0;
  transform: translateY(30px);
}

.signal__sub {
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: var(--text-muted);
  line-height: 1.7;
  margin-top: 28px;
  opacity: 0; /* GSAP reveals */
}

/* Reduced motion */
.reduced-motion .signal__old::after { width: 100%; }
.reduced-motion .signal__new,
.reduced-motion .signal__new .char,
.reduced-motion .signal__sub { opacity: 1; transform: none; }
```

- [ ] **Step 3: Add signal GSAP timeline to script.js**

Add `initSignal()` function and call it from init block:

```javascript
function initSignal() {
  const wrap = document.querySelector(".signal__wrap");
  const old = document.querySelector(".signal__old");
  const newH = document.querySelector(".signal__new");
  const sub = document.querySelector(".signal__sub");
  if (!wrap || !old || !newH) return;

  const chars = splitChars(newH);
  newH.style.opacity = "1"; /* container visible, chars still hidden */
  old.style.setProperty("--strike-w", "0%");

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".sec--signal",
      start: "top top",
      end: "+=150%",
      pin: ".signal__wrap",
      scrub: 0.8,
    }
  });

  tl.from(old, { opacity: 0, y: 20, duration: 0.2, ease: "none" })
    .fromTo(old, { "--strike-w": "0%" }, { "--strike-w": "100%", duration: 0.3, ease: "none" })
    .to(old, { opacity: 0, filter: "blur(4px)", duration: 0.2, ease: "none" })
    .from(chars, {
      opacity: 0, y: 30, duration: 0.4,
      stagger: 0.02, ease: "none"
    }, "-=0.1")
    .from(sub, { opacity: 0, y: 16, duration: 0.3, ease: "none" });
}
```

The CSS variable `--strike-w` drives the pseudo-element width:

Update CSS `.signal__old::after` to:
```css
.signal__old::after {
  width: var(--strike-w, 0%);
}
```

- [ ] **Step 4: Verify signal animation**

Scroll past hero. Signal section pins. "여러 곳에서 찾고" appears → strikethrough animates → fades/blurs → "한곳에서 판단합니다" chars stagger in → subtitle fades.

Run: `node --check entry-page/script.js`

- [ ] **Step 5: Commit**

```bash
git add entry-page/
git commit -m "feat(entry): add signal section with pinned text morph animation"
```

---

## Task 5: Intelligence Section — Card Grid + 3D Tilt

**Files:**
- Modify: `entry-page/index.html` (intelligence section)
- Modify: `entry-page/style.css` (card grid styles)
- Modify: `entry-page/script.js` (stagger reveal + tilt)

- [ ] **Step 1: Add intelligence HTML**

Replace `<!-- Content in Task 4 -->` inside `#intelligence > .sec__inner`:

```html
<div class="intel__header">
  <span class="eyebrow">INTELLIGENCE COVERAGE</span>
  <h2 class="sec__title">놓치는 변화가 없도록</h2>
  <p class="sec__sub">4개 축으로 카드 시장을 입체적으로 모니터링합니다</p>
</div>

<!-- Spline crystal (placeholder) -->
<div class="spline-layer spline-layer--intel" aria-hidden="true">
  <div class="spline-placeholder spline-placeholder--crystal"></div>
</div>

<div class="intel__grid">
  <article class="intel__card" data-accent="green">
    <div class="intel__icon" style="background:var(--accent);">📡</div>
    <h3>이벤트 변화</h3>
    <p>신규 런칭, 조건 변경, 종료 예정 — 카드사별 이벤트 변동을 실시간 감지</p>
    <div class="intel__stats">
      <div class="intel__stat"><strong data-countup="24">0</strong><span>h 수집 주기</span></div>
      <div class="intel__stat"><strong data-countup="4">0</strong><span>카드사</span></div>
    </div>
  </article>

  <article class="intel__card" data-accent="indigo">
    <div class="intel__icon" style="background:var(--accent-indigo);">💳</div>
    <h3>상품 출시</h3>
    <p>신상품 출시, 발급중단, 혜택 변경 — 상품 라이프사이클 전체 추적</p>
    <div class="intel__stats">
      <div class="intel__stat"><strong data-countup="150">0</strong><span>+ 추적 상품</span></div>
      <div class="intel__stat"><strong data-countup="7">0</strong><span>d 출시일 추정</span></div>
    </div>
  </article>

  <article class="intel__card" data-accent="red">
    <div class="intel__icon" style="background:var(--accent-red);">⚔️</div>
    <h3>경쟁사 비교</h3>
    <p>동일 기간, 동일 기준으로 카드사별 전략 변화를 횡단면 비교</p>
    <div class="intel__stats">
      <div class="intel__stat"><strong data-countup="4">0</strong><span>비교 카드사</span></div>
      <div class="intel__stat"><strong data-countup="7">0</strong><span>분석 카테고리</span></div>
    </div>
  </article>

  <article class="intel__card" data-accent="yellow">
    <div class="intel__icon" style="background:var(--accent-yellow);">📊</div>
    <h3>시장 반응</h3>
    <p>검색 트렌드, 관심도 변화, 뉴스 시그널로 시장 온도를 측정</p>
    <div class="intel__stats">
      <div class="intel__stat"><strong>실시간</strong><span>시그널 수집</span></div>
    </div>
  </article>
</div>
```

- [ ] **Step 2: Add intelligence CSS**

```css
/* ── Intelligence ── */
.sec--intel {
  padding: var(--sec-gap) 0;
  position: relative;
}

.intel__header {
  text-align: center;
  margin-bottom: 48px;
}

.sec__title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--text-primary);
  margin-top: 12px;
}

.sec__sub {
  font-size: clamp(0.95rem, 1.8vw, 1.1rem);
  color: var(--text-muted);
  margin-top: 12px;
}

/* Spline crystal placeholder */
.spline-layer--intel {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 500px; height: 500px;
  z-index: 0;
  pointer-events: none;
}
.spline-placeholder--crystal {
  width: 100%; height: 100%;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.06) 0%, transparent 60%);
  border-radius: 50%;
  filter: blur(40px);
}

/* Card grid */
.intel__grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.intel__card {
  background: linear-gradient(135deg, rgba(15, 26, 42, 0.9) 0%, rgba(10, 18, 32, 0.9) 100%);
  border: 1px solid var(--bg-line);
  border-radius: var(--radius-lg);
  padding: 28px;
  position: relative;
  overflow: hidden;
  transform-style: preserve-3d;
  transition: transform 300ms ease, box-shadow 300ms ease;
}

.intel__card:hover {
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

/* Corner glow per accent */
.intel__card::before {
  content: "";
  position: absolute;
  top: -30px; right: -30px;
  width: 100px; height: 100px;
  border-radius: 50%;
  opacity: 0.15;
  pointer-events: none;
}
.intel__card[data-accent="green"]::before { background: var(--accent); }
.intel__card[data-accent="indigo"]::before { background: var(--accent-indigo); }
.intel__card[data-accent="red"]::before { background: var(--accent-red); }
.intel__card[data-accent="yellow"]::before { background: var(--accent-yellow); }

.intel__icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  margin-bottom: 16px;
}

.intel__card h3 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.intel__card p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.intel__stats {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--bg-line);
}

.intel__stat strong {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.intel__stat span {
  display: block;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-top: 2px;
}
```

- [ ] **Step 3: Add intelligence JS — stagger reveal + 3D tilt + countup**

Add to `script.js`:

```javascript
/* ── Countup utility ── */
function animateCountup(el) {
  if (el.dataset.counted) return;
  el.dataset.counted = "true";
  const target = parseInt(el.dataset.countup, 10);
  if (isNaN(target)) return;
  const dur = 1.2;
  gsap.fromTo(el, { innerText: 0 }, {
    innerText: target,
    duration: dur,
    ease: "power3.out",
    snap: { innerText: 1 },
    onUpdate() {
      el.textContent = Math.round(parseFloat(el.textContent)).toLocaleString("ko-KR");
    }
  });
}

/* ── Intelligence section ── */
function initIntel() {
  const cards = gsap.utils.toArray(".intel__card");
  if (!cards.length) return;

  /* Stagger reveal */
  gsap.from(cards, {
    opacity: 0, y: 50,
    duration: 0.7,
    stagger: 0.15,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".intel__grid",
      start: "top 80%",
    }
  });

  /* Countup on reveal */
  document.querySelectorAll(".intel__card [data-countup]").forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => animateCountup(el),
    });
  });

  /* 3D tilt on hover (desktop only) */
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      if (!isDesktop()) return;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
      gsap.to(card, {
        rotateX: y, rotateY: x,
        duration: 0.3, ease: "power2.out",
        transformPerspective: 800,
      });
    });
    card.addEventListener("mouseleave", () => {
      gsap.to(card, {
        rotateX: 0, rotateY: 0,
        duration: 0.5, ease: "power2.out",
      });
    });
  });
}
```

- [ ] **Step 4: Verify intelligence section**

Scroll to intelligence section. 4 cards stagger in. Numbers count up. Hover cards for 3D tilt.

Run: `node --check entry-page/script.js`

- [ ] **Step 5: Commit**

```bash
git add entry-page/
git commit -m "feat(entry): add intelligence card grid with stagger, countup, 3D tilt"
```

---

## Task 6: Metrics Section — Pinned Number Reveal

**Files:**
- Modify: `entry-page/index.html` (metrics section)
- Modify: `entry-page/style.css`
- Modify: `entry-page/script.js`

- [ ] **Step 1: Add metrics HTML**

Replace `<!-- Content in Task 5 -->` inside `#metrics > .sec__inner`:

```html
<div class="metrics__wrap">
  <div class="metrics__hero-num">
    <strong class="metrics__big" data-countup="2400">0</strong>
    <span class="metrics__big-plus">+</span>
  </div>
  <p class="metrics__big-label">분석된 이벤트 &amp; 상품 변화</p>

  <div class="metrics__row">
    <div class="metrics__item">
      <strong data-countup="4">0</strong>
      <span>모니터링 카드사</span>
    </div>
    <div class="metrics__divider"></div>
    <div class="metrics__item">
      <strong>24h</strong>
      <span>수집 주기</span>
    </div>
    <div class="metrics__divider"></div>
    <div class="metrics__item">
      <strong data-countup="7">0</strong>
      <span>분석 카테고리</span>
    </div>
    <div class="metrics__divider"></div>
    <div class="metrics__item">
      <strong>AI</strong>
      <span>Gemini 기반 인사이트</span>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add metrics CSS**

```css
/* ── Metrics ── */
.sec--metrics {
  min-height: 150vh; /* scroll room for pin */
  display: flex;
  align-items: flex-start;
}

.metrics__wrap {
  text-align: center;
  padding: 30vh 0;
}

.metrics__hero-num {
  display: inline-flex;
  align-items: baseline;
}

.metrics__big {
  font-size: clamp(4rem, 12vw, 7rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--accent), var(--accent-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metrics__big-plus {
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--accent-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metrics__big-label {
  font-size: clamp(0.95rem, 2vw, 1.15rem);
  color: var(--text-muted);
  margin-top: 8px;
}

.metrics__row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 48px;
  margin-top: 56px;
}

.metrics__item strong {
  display: block;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.metrics__item span {
  display: block;
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-top: 4px;
}

.metrics__divider {
  width: 1px;
  height: 0; /* GSAP animates to 48px */
  background: var(--bg-line);
}
```

- [ ] **Step 3: Add metrics JS**

```javascript
function initMetrics() {
  const wrap = document.querySelector(".metrics__wrap");
  const big = document.querySelector(".metrics__big");
  const items = gsap.utils.toArray(".metrics__item strong");
  const dividers = gsap.utils.toArray(".metrics__divider");
  if (!wrap || !big) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".sec--metrics",
      start: "top top",
      end: "+=120%",
      pin: ".metrics__wrap",
      scrub: 0.6,
    }
  });

  /* Big number */
  tl.fromTo(big, { innerText: 0 }, {
    innerText: 2400,
    duration: 1,
    ease: "none",
    snap: { innerText: 1 },
    onUpdate() {
      big.textContent = Math.round(parseFloat(big.textContent)).toLocaleString("ko-KR");
    }
  })
  .from(".metrics__big-plus", { opacity: 0, x: -10, duration: 0.2, ease: "none" }, "-=0.2")
  .from(".metrics__big-label", { opacity: 0, y: 10, duration: 0.2, ease: "none" })

  /* Sub metrics + dividers cascade */
  .from(items, { opacity: 0, y: 20, duration: 0.3, stagger: 0.1, ease: "none" })
  .to(dividers, { height: 48, duration: 0.3, stagger: 0.1, ease: "none" }, "<");
}
```

- [ ] **Step 4: Verify metrics pinned scroll animation**

Scroll to metrics. Section pins. Big number counts 0→2,400. "+", label appear. Sub metrics cascade in, dividers grow.

Run: `node --check entry-page/script.js`

- [ ] **Step 5: Commit**

```bash
git add entry-page/
git commit -m "feat(entry): add metrics section with pinned scroll countup"
```

---

## Task 7: Process Section — Horizontal Scroll Pipeline

**Files:**
- Modify: `entry-page/index.html` (process section)
- Modify: `entry-page/style.css`
- Modify: `entry-page/script.js`

- [ ] **Step 1: Add process HTML**

Replace `<!-- Content in Task 6 -->` inside `#process > .sec__inner`:

```html
<div class="process__header">
  <span class="eyebrow">HOW IT WORKS</span>
  <h2 class="sec__title">AI가 일하고, 당신은 판단합니다</h2>
</div>

<div class="process__track-wrapper">
  <div class="process__track">
    <article class="process__card" data-step="1" style="--step-color:var(--accent);">
      <div class="process__num"><span>01</span></div>
      <span class="process__label">COLLECT</span>
      <h3>수집</h3>
      <p>4개 카드사의 이벤트, 상품, 공시 데이터를 자동으로 크롤링합니다</p>
      <div class="process__detail">신한 · 삼성 · 현대 · KB<br><em>하나 · 우리 · BC — coming soon</em></div>
    </article>

    <article class="process__card" data-step="2" style="--step-color:var(--accent-indigo);">
      <div class="process__num"><span>02</span></div>
      <span class="process__label">ANALYZE</span>
      <h3>분석</h3>
      <p>Gemini AI가 변화의 맥락을 읽고 카테고리별로 분류합니다</p>
      <div class="process__detail">할인/적립 · 여행 · 프리미엄 · 생활 · 제휴 · 금융</div>
    </article>

    <article class="process__card" data-step="3" style="--step-color:var(--accent-orange);">
      <div class="process__num"><span>03</span></div>
      <span class="process__label">ORGANIZE</span>
      <h3>정리</h3>
      <p>중복을 제거하고 타임라인 위에 배치해 한눈에 볼 수 있게 정리합니다</p>
      <div class="process__detail">Gantt 타임라인 · 카드사별 뷰</div>
    </article>

    <article class="process__card" data-step="4" style="--step-color:var(--accent-cyan);">
      <div class="process__num"><span>04</span></div>
      <span class="process__label">BRIEF</span>
      <h3>브리핑</h3>
      <p>주간/일간 AI 브리핑으로 핵심 변화만 요약해 전달합니다</p>
      <div class="process__detail">주간 리포트 · 일간 알림 · 이메일</div>
    </article>

    <article class="process__card" data-step="5" style="--step-color:var(--accent-red);">
      <div class="process__num"><span>05</span></div>
      <span class="process__label">DECIDE</span>
      <h3>대응</h3>
      <p>찾는 시간을 줄이고, 경쟁사보다 먼저 전략적 판단을 내립니다</p>
      <div class="process__detail">경쟁 우위 · 선제 대응 · 전략 수립</div>
    </article>
  </div>

  <div class="process__progress">
    <div class="process__progress-fill"></div>
  </div>
</div>
```

- [ ] **Step 2: Add process CSS**

```css
/* ── Process ── */
.sec--process {
  padding: var(--sec-gap) 0 0;
}

.process__header {
  text-align: center;
  margin-bottom: 48px;
}

.process__track-wrapper {
  overflow: hidden;
}

.process__track {
  display: flex;
  gap: 24px;
  /* Total width: 5 cards × 300px + 4 gaps × 24px = 1596px */
  width: max-content;
  padding: 0 calc((100vw - var(--content-w)) / 2);
}

.process__card {
  width: 300px;
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(15, 26, 42, 0.8) 0%, rgba(10, 18, 32, 0.9) 100%);
  border: 1px solid var(--bg-line);
  border-radius: var(--radius-lg);
  padding: 32px;
}

.process__num {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--step-color);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}

.process__num span {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--bg-base);
}

.process__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--step-color);
}

.process__card h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 8px 0;
}

.process__card p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.process__detail {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--bg-line);
  font-size: 0.8rem;
  color: var(--text-dim);
  line-height: 1.6;
}
.process__detail em {
  color: var(--accent);
  font-style: normal;
  font-size: 0.75rem;
}

/* Progress bar */
.process__progress {
  height: 3px;
  background: rgba(255,255,255,0.05);
  border-radius: 2px;
  margin-top: 32px;
  overflow: hidden;
}
.process__progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), var(--accent-indigo), var(--accent-orange), var(--accent-cyan), var(--accent-red));
  border-radius: 2px;
}

/* Mobile: vertical stack */
@media (max-width: 760px) {
  .process__track {
    flex-direction: column;
    width: 100%;
    padding: 0;
  }
  .process__card { width: 100%; }
}
```

- [ ] **Step 3: Add process horizontal scroll JS**

```javascript
function initProcess() {
  const track = document.querySelector(".process__track");
  const fill = document.querySelector(".process__progress-fill");
  if (!track || window.innerWidth <= 760) return;

  const totalScroll = track.scrollWidth - window.innerWidth;

  gsap.to(track, {
    x: () => -totalScroll,
    ease: "none",
    scrollTrigger: {
      trigger: ".sec--process",
      start: "top top",
      end: () => "+=" + totalScroll,
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (fill) fill.style.width = (self.progress * 100) + "%";
      }
    }
  });

  /* Highlight active card — opacity based on scroll progress */
  const cards = gsap.utils.toArray(".process__card");
  ScrollTrigger.create({
    trigger: ".sec--process",
    start: "top top",
    end: () => "+=" + totalScroll,
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      cards.forEach((card, i) => {
        const cardP = (i + 0.5) / cards.length;
        const dist = Math.abs(p - cardP);
        const opacity = Math.max(0.35, 1 - dist * 2.5);
        card.style.opacity = opacity;
      });
    }
  });
}
```

- [ ] **Step 4: Verify horizontal scroll**

On desktop: scroll to process section. It pins. Cards scroll horizontally. Progress bar fills. Active card brighter. On mobile (< 760px): vertical stack, no pin.

Run: `node --check entry-page/script.js`

- [ ] **Step 5: Commit**

```bash
git add entry-page/
git commit -m "feat(entry): add process section with horizontal scroll pipeline"
```

---

## Task 8: Proof Section — Before/After + Evidence Number

**Files:**
- Modify: `entry-page/index.html` (proof section)
- Modify: `entry-page/style.css`
- Modify: `entry-page/script.js`

- [ ] **Step 1: Add proof HTML**

Replace `<!-- Content in Task 7 -->` inside `#proof > .sec__inner`:

```html
<div class="proof__header">
  <span class="eyebrow">TRANSFORMATION</span>
  <h2 class="sec__title">업무가 달라집니다</h2>
</div>

<!-- Spline morph (placeholder) -->
<div class="spline-layer spline-layer--proof" aria-hidden="true">
  <div class="spline-placeholder spline-placeholder--morph"></div>
</div>

<div class="proof__split">
  <div class="proof__before">
    <div class="proof__badge proof__badge--before">BEFORE</div>
    <ul>
      <li>❌ 카드사 4곳 개별 방문</li>
      <li>❌ 수동으로 변화 취합</li>
      <li>❌ Excel에 정리하는 데 반나절</li>
      <li>❌ 이미 지나간 변화를 뒤늦게 발견</li>
      <li>❌ "경쟁사가 뭘 했지?" 매번 처음부터</li>
    </ul>
  </div>
  <div class="proof__after">
    <div class="proof__badge proof__badge--after">AFTER</div>
    <ul>
      <li>✅ 한 화면에서 전체 파악</li>
      <li>✅ AI가 자동 수집 + 분류</li>
      <li>✅ 대시보드 열면 즉시 확인</li>
      <li>✅ 변화 발생 당일 알림</li>
      <li>✅ 주간 AI 브리핑으로 트렌드 파악</li>
    </ul>
  </div>
</div>

<div class="proof__evidence">
  <span class="proof__evidence-label">시간 절약 효과</span>
  <strong class="proof__big-num" data-countup="80">0</strong>
  <span class="proof__big-pct">%</span>
  <p class="proof__evidence-sub">경쟁사 모니터링에 쓰던 시간 절감</p>
</div>
```

- [ ] **Step 2: Add proof CSS**

```css
/* ── Proof ── */
.sec--proof {
  padding: var(--sec-gap) 0;
}

.proof__header {
  text-align: center;
  margin-bottom: 48px;
}

.proof__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 40px;
}

.proof__before,
.proof__after {
  padding: 32px;
}

.proof__before {
  background: rgba(12, 10, 18, 0.9);
  border: 1px solid rgba(248,113,113,0.1);
}

.proof__after {
  background: rgba(10, 18, 12, 0.9);
  border: 1px solid rgba(74,222,128,0.1);
}

.proof__badge {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  margin-bottom: 20px;
}
.proof__badge--before { color: var(--accent-red); }
.proof__badge--after { color: var(--accent); }

.proof__split ul {
  list-style: none;
  padding: 0;
}

.proof__split li {
  font-size: 0.95rem;
  line-height: 2.2;
}

.proof__before li { color: var(--text-muted); }
.proof__after li { color: var(--text-secondary); }

/* Evidence */
.proof__evidence {
  text-align: center;
  padding: 40px;
  background: rgba(8, 12, 20, 0.9);
  border: 1px solid var(--bg-line);
  border-radius: var(--radius-lg);
}

.proof__evidence-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-purple);
  margin-bottom: 12px;
}

.proof__big-num {
  font-size: clamp(3.5rem, 10vw, 5rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--accent-purple), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.proof__big-pct {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent-purple), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.proof__evidence-sub {
  font-size: 1rem;
  color: var(--text-muted);
  margin-top: 8px;
}

@media (max-width: 760px) {
  .proof__split { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Add proof JS**

```javascript
function initProof() {
  const before = document.querySelector(".proof__before");
  const after = document.querySelector(".proof__after");
  const items = gsap.utils.toArray(".proof__split li");
  const evidence = document.querySelector(".proof__evidence");
  const bigNum = document.querySelector(".proof__big-num");

  if (!before || !after) return;

  /* Split wipe: before first, after slides in */
  gsap.from(before, {
    opacity: 0, x: -40, duration: 0.7, ease: "power3.out",
    scrollTrigger: { trigger: ".proof__split", start: "top 75%" }
  });
  gsap.from(after, {
    opacity: 0, x: 40, duration: 0.7, ease: "power3.out", delay: 0.2,
    scrollTrigger: { trigger: ".proof__split", start: "top 75%" }
  });

  /* List items stagger */
  gsap.from(items, {
    opacity: 0, y: 12, duration: 0.4,
    stagger: 0.06, ease: "power2.out",
    scrollTrigger: { trigger: ".proof__split", start: "top 70%" }
  });

  /* Evidence countup */
  if (bigNum) {
    ScrollTrigger.create({
      trigger: evidence,
      start: "top 80%",
      once: true,
      onEnter: () => animateCountup(bigNum),
    });
  }
}
```

- [ ] **Step 4: Verify proof section**

Scroll to proof. Before panel slides left→center, After slides right→center. List items stagger. 80% counts up with gradient.

Run: `node --check entry-page/script.js`

- [ ] **Step 5: Commit**

```bash
git add entry-page/
git commit -m "feat(entry): add proof section with before/after split and evidence countup"
```

---

## Task 9: Final CTA Section

**Files:**
- Modify: `entry-page/index.html` (cta section)
- Modify: `entry-page/style.css`
- Modify: `entry-page/script.js`

- [ ] **Step 1: Add CTA HTML**

Replace `<!-- Content in Task 8 -->` inside `#cta > .sec__inner`:

```html
<div class="cta__wrap">
  <div class="cta__glow" aria-hidden="true"></div>
  <span class="eyebrow">VERTICAL AI PLATFORM</span>
  <h2 class="cta__line1">경쟁사보다 먼저.</h2>
  <h2 class="cta__line2">판단은 더 빠르게.</h2>
  <p class="cta__sub">
    카드 시장의 변화를 AI가 수집하고 정리합니다.<br>
    당신은 대시보드를 열기만 하면 됩니다.
  </p>
  <a href="/" class="btn btn--primary btn--lg">대시보드 시작하기 <span class="btn__arrow">→</span></a>
  <p class="cta__note">로그인 없이 바로 확인</p>
</div>

<!-- Spline energy field (placeholder) -->
<div class="spline-layer spline-layer--cta" aria-hidden="true">
  <div class="spline-placeholder spline-placeholder--energy"></div>
</div>
```

- [ ] **Step 2: Add CTA CSS**

```css
/* ── Final CTA ── */
.sec--cta {
  padding: var(--sec-gap) 0 80px;
  position: relative;
  overflow: hidden;
}

.cta__wrap {
  text-align: center;
  position: relative;
  z-index: 2;
  max-width: 600px;
  margin: 0 auto;
}

.cta__glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 400px; height: 400px;
  background: radial-gradient(circle, var(--accent-glow) 0%, transparent 60%);
  pointer-events: none;
  opacity: 0; /* GSAP reveals */
}

.cta__line1 {
  font-size: clamp(2.2rem, 6vw, 3.2rem);
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  margin-top: 24px;
}

.cta__line2 {
  font-size: clamp(2.2rem, 6vw, 3.2rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--accent), var(--accent-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 24px;
}

.cta__sub {
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  color: var(--text-muted);
  line-height: 1.7;
  margin-bottom: 40px;
}

.btn--lg {
  padding: 16px 40px;
  font-size: 1.1rem;
  border-radius: 12px;
}

.cta__note {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-top: 16px;
}

/* Spline energy placeholder */
.spline-layer--cta {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.spline-placeholder--energy {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 60%, rgba(74,222,128,0.04) 0%, transparent 60%);
}
```

- [ ] **Step 3: Add CTA JS**

```javascript
function initCta() {
  const line1 = document.querySelector(".cta__line1");
  const line2 = document.querySelector(".cta__line2");
  const sub = document.querySelector(".cta__sub");
  const glow = document.querySelector(".cta__glow");
  const btn = document.querySelector(".sec--cta .btn--primary");
  if (!line1) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".sec--cta",
      start: "top 70%",
    }
  });

  tl.from(line1, { opacity: 0, y: 30, duration: 0.6, ease: "power3.out" })
    .from(line2, { opacity: 0, y: 30, duration: 0.6, ease: "power3.out" }, "-=0.3")
    .from(sub, { opacity: 0, y: 16, duration: 0.5, ease: "power2.out" }, "-=0.3")
    .from(btn, { opacity: 0, scale: 0.95, duration: 0.5, ease: "power2.out" }, "-=0.2")
    .to(glow, { opacity: 1, scale: 1.1, duration: 1.2, ease: "power2.out" }, "-=0.8");

  /* Glow pulse loop */
  if (glow) {
    gsap.to(glow, {
      scale: 1.15,
      opacity: 0.8,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }
}
```

- [ ] **Step 4: Verify CTA section**

Scroll to CTA. Lines cascade in. Gradient text on line 2. Glow pulses. Button has hover effect.

Run: `node --check entry-page/script.js`

- [ ] **Step 5: Commit**

```bash
git add entry-page/
git commit -m "feat(entry): add final CTA section with cascade animation and glow"
```

---

## Task 10: Spline Integration + Lazy Loading

**Files:**
- Modify: `entry-page/index.html` (update Spline containers)
- Modify: `entry-page/script.js` (lazy iframe loading)
- Modify: `entry-page/style.css` (Spline iframe styles)

- [ ] **Step 1: Update HTML — add data-spline-src attributes**

On the hero Spline container (`#spline-hero-bg`), add a `data-spline-src` attribute. Add similar containers for other sections. The actual Spline URLs will be filled in when scenes are created — for now, use the existing hero nebula URL and empty strings for others.

In `.spline-bg#spline-hero-bg`, add inside the div:
```html
<iframe class="spline-iframe" data-spline-src="https://my.spline.design/particlenebula-FmTId8FDbY8eWvqPNBbVSBDl/" loading="lazy" title="3D Background" aria-hidden="true"></iframe>
```

In `.spline-layer--intel`, add:
```html
<iframe class="spline-iframe" data-spline-src="" loading="lazy" title="3D Crystal" aria-hidden="true"></iframe>
```

In `.spline-layer--cta`, add:
```html
<iframe class="spline-iframe" data-spline-src="" loading="lazy" title="3D Energy" aria-hidden="true"></iframe>
```

- [ ] **Step 2: Add Spline CSS**

```css
/* ── Spline iframes ── */
.spline-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1s ease;
}

.spline-iframe.is-loaded {
  opacity: 1;
}

/* Hero BG pointer reaction */
.spline-bg .spline-iframe {
  transform: translate3d(
    calc(var(--ptr-x) * -14px),
    calc(var(--ptr-y) * -14px),
    0
  ) scale(1.06);
  transition: opacity 1s ease, transform 400ms ease-out;
}

/* Hide Spline on mobile (except hero) */
@media (max-width: 760px) {
  .spline-layer--intel .spline-iframe,
  .spline-layer--cta .spline-iframe {
    display: none;
  }
}

/* Hide Spline badge */
.spline-bg::after {
  content: "";
  position: absolute;
  bottom: 0; right: 0;
  width: 160px; height: 50px;
  background: var(--bg-base);
  z-index: 2;
}
```

- [ ] **Step 3: Add Spline lazy-load JS**

```javascript
function initSplineLazy() {
  const iframes = document.querySelectorAll(".spline-iframe[data-spline-src]");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const iframe = entry.target;
      const src = iframe.dataset.splineSrc;
      if (!src) return; /* Empty = placeholder, skip */
      iframe.src = src;
      iframe.addEventListener("load", () => iframe.classList.add("is-loaded"), { once: true });
      observer.unobserve(iframe);
    });
  }, { rootMargin: "200px" });

  iframes.forEach(iframe => observer.observe(iframe));
}
```

- [ ] **Step 4: Verify Spline loads**

Open page. Hero Spline iframe loads when page loads (within 200px margin). Other Spline sections show gradient placeholders (since URLs are empty). No console errors.

Run: `node --check entry-page/script.js`

- [ ] **Step 5: Commit**

```bash
git add entry-page/
git commit -m "feat(entry): add Spline lazy-loading with placeholder fallbacks"
```

---

## Task 11: Responsive + Reduced Motion + Final Polish

**Files:**
- Modify: `entry-page/style.css` (responsive rules)
- Modify: `entry-page/script.js` (responsive guards)

- [ ] **Step 1: Add comprehensive responsive CSS**

```css
/* ── Responsive: Tablet ── */
@media (max-width: 1100px) {
  .intel__grid { grid-template-columns: 1fr 1fr; gap: 16px; }
  .metrics__row { gap: 32px; }
}

/* ── Responsive: Mobile ── */
@media (max-width: 760px) {
  :root { --sec-gap: 80px; }

  .sec--hero { padding: 80px 0 60px; min-height: 100svh; }
  .hero__title { font-size: clamp(2rem, 8vw, 2.8rem); }

  .intel__grid { grid-template-columns: 1fr; }

  .sec--metrics { min-height: auto; }
  .metrics__wrap { padding: 60px 0; }
  .metrics__row {
    flex-direction: column;
    gap: 24px;
  }
  .metrics__divider {
    width: 48px; height: 1px;
  }

  .proof__split { grid-template-columns: 1fr; }

  .cta__glow { width: 250px; height: 250px; }

  /* Disable pointer parallax */
  .spline-bg .spline-iframe,
  .spline-placeholder {
    transform: none !important;
  }
}

@media (max-width: 520px) {
  .btn { width: 100%; justify-content: center; }
  .hero__actions { flex-direction: column; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.reduced-motion .sec__title,
.reduced-motion .sec__sub,
.reduced-motion .eyebrow,
.reduced-motion .intel__card,
.reduced-motion .proof__before,
.reduced-motion .proof__after,
.reduced-motion .proof__split li,
.reduced-motion .cta__line1,
.reduced-motion .cta__line2,
.reduced-motion .cta__sub,
.reduced-motion .cta__glow {
  opacity: 1 !important;
  transform: none !important;
}
```

- [ ] **Step 2: Add ScrollTrigger responsive handling in JS**

At the end of `script.js`, before the init calls, add:

```javascript
/* ── Responsive: kill pinned sections on mobile ── */
function handleResize() {
  if (window.innerWidth <= 760) {
    ScrollTrigger.getAll().forEach(st => {
      if (st.pin) st.kill();
    });
  }
}

/* Re-init on resize (debounced) */
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 250);
});
```

- [ ] **Step 3: Ensure all init functions are called**

Verify the init block at the bottom of the DOMContentLoaded listener calls all functions:

```javascript
/* ── Init all sections ── */
initHero();
initPointer();
initSignal();
initIntel();
initMetrics();
initProcess();
initProof();
initCta();
initSplineLazy();
handleResize(); /* Kill pins on initial mobile load */
```

- [ ] **Step 4: Full verification**

1. Desktop (> 1100px): All animations, pins, horizontal scroll working
2. Tablet (760–1100px): Grid collapses, animations still work
3. Mobile (< 760px): Vertical stacks, no pins, no pointer parallax
4. Reduced motion: All content visible immediately, no animation
5. Console: No errors

Run: `node --check entry-page/script.js`

- [ ] **Step 5: Commit**

```bash
git add entry-page/
git commit -m "feat(entry): add responsive breakpoints and reduced-motion support"
```

---

## Task 12: Final Cleanup + Full Test

**Files:**
- All `entry-page/` files — read-through for consistency

- [ ] **Step 1: Verify HTML validity**

Review `index.html` for:
- All sections have proper closing tags
- All `aria-hidden` attributes on decorative elements
- `lang="ko"` on html
- No duplicate IDs

- [ ] **Step 2: Verify CSS consistency**

Review `style.css` for:
- No unused variables
- All color references use CSS variables (not hardcoded hex in component styles, except for gradient definitions)
- No duplicate selectors
- Proper cascade (base → component → responsive → reduced-motion)

- [ ] **Step 3: Verify JS syntax and structure**

Run: `node --check entry-page/script.js`

Ensure:
- Single DOMContentLoaded listener wrapping everything
- All functions defined before init calls
- No global scope pollution (everything inside the listener)
- GSAP/ScrollTrigger guard at top
- Reduced motion early return with CSS fallback

- [ ] **Step 4: Run project test suite**

```bash
python -m pytest tests/test_dashboard_regressions.py tests/test_app_routes.py tests/test_runtime_baseline.py -q
```

Ensure entry-page changes don't break the main app.

- [ ] **Step 5: Final commit**

```bash
git add entry-page/
git commit -m "chore(entry): final cleanup and consistency review"
```
