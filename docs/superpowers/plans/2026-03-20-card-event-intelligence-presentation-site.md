# Card Event Intelligence Presentation Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone presentation microsite that sells the value of `Card Event Intelligence` to non-technical viewers on the landing page and offers a deeper architecture explanation on a separate `/deep-dive` route.

**Architecture:** Create a separate `presentation-site/` Next.js app inside the repository. Keep the site static-first by storing copy, architecture metadata, and module maps in typed local content files rather than coupling to live FastAPI APIs. The landing route uses theatrical scroll scenes, while the deep-dive route uses calmer diagram-driven sections with an explicit split between the `Event Intelligence` axis and the `Product / Disclosure Intelligence` axis.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, SVG/React diagrams, Vitest, React Testing Library, Playwright, npm

---

## File Map

### Existing files to modify

- `.gitignore`
  - Add ignores for the standalone frontend app (`node_modules`, `.next`, Playwright artifacts, coverage output).

### New files to create

#### App bootstrap and tooling

- `presentation-site/package.json`
  - Separate frontend dependency graph and scripts (`dev`, `build`, `lint`, `test`, `test:e2e`).
- `presentation-site/tsconfig.json`
  - TypeScript config with `@/*` alias.
- `presentation-site/next.config.mjs`
  - Next.js app config.
- `presentation-site/postcss.config.mjs`
  - Tailwind/PostCSS config entry.
- `presentation-site/tailwind.config.ts`
  - Token scanning config.
- `presentation-site/vitest.config.ts`
  - Unit test configuration for React and content modules.
- `presentation-site/playwright.config.ts`
  - E2E test runner config.
- `presentation-site/tests/setup.ts`
  - Testing-library and environment setup.
- `presentation-site/README.md`
  - Local run, build, test, and content update guide.

#### Route shell

- `presentation-site/app/layout.tsx`
  - Global layout, metadata, font wiring, skip link, and site chrome.
- `presentation-site/app/page.tsx`
  - Landing showroom route.
- `presentation-site/app/deep-dive/page.tsx`
  - Technical deep-dive route.
- `presentation-site/app/globals.css`
  - Design tokens, layout primitives, motion-safe utilities, and scene-level styling.

#### Content and architecture metadata

- `presentation-site/content/site-content.ts`
  - Hero copy, scene copy, CTA labels, outcome cards, and page-level narrative text.
- `presentation-site/content/architecture-content.ts`
  - Concept architecture zones, stage descriptions, orchestration nodes, design principles, and roadmap items.
- `presentation-site/content/module-map.ts`
  - Real module clusters, file responsibilities, and dual-axis assignments.

#### Shared components

- `presentation-site/components/chrome/site-header.tsx`
  - Top navigation shared by both routes.
- `presentation-site/components/chrome/site-footer.tsx`
  - Minimal footer and deep-dive return links.
- `presentation-site/components/chrome/section-shell.tsx`
  - Shared section wrapper with label, title, body, and slot layout.
- `presentation-site/components/chrome/sticky-stage-layout.tsx`
  - Shared sticky narrative layout for scroll scenes.

#### Landing page scenes

- `presentation-site/components/scenes/hero-scene.tsx`
  - Immersive opening with signal background and primary CTAs.
- `presentation-site/components/scenes/problem-scene.tsx`
  - Fragmented-source problem setup.
- `presentation-site/components/scenes/signal-flow-scene.tsx`
  - `Collect -> Extract -> Normalize -> Enrich -> Deliver` interactive scene.
- `presentation-site/components/scenes/outcome-scene.tsx`
  - Bento grid of business-facing outcomes.
- `presentation-site/components/scenes/orchestration-scene.tsx`
  - Conceptual engine loop without file names.
- `presentation-site/components/scenes/deep-dive-cta-scene.tsx`
  - Handoff into `/deep-dive`.

#### Deep-dive sections

- `presentation-site/components/deep-dive/concept-architecture.tsx`
  - High-level architecture explanation.
- `presentation-site/components/deep-dive/stage-breakdown.tsx`
  - Stage-by-stage responsibilities and technologies.
- `presentation-site/components/deep-dive/dual-axis-architecture.tsx`
  - Explicit split between event and product/disclosure intelligence.
- `presentation-site/components/deep-dive/orchestration-map.tsx`
  - Runtime relationship map across scheduler, routers, modules, and outputs.
- `presentation-site/components/deep-dive/real-module-map.tsx`
  - File/module responsibility map drawn from the current codebase.
- `presentation-site/components/deep-dive/design-principles.tsx`
  - Architecture reasoning section.
- `presentation-site/components/deep-dive/evolution-roadmap.tsx`
  - Reliability and future-expansion section.

#### Diagram components

- `presentation-site/components/diagrams/signal-network.tsx`
  - Reusable animated line/node background.
- `presentation-site/components/diagrams/process-rail.tsx`
  - Reusable staged process diagram for landing and deep dive.
- `presentation-site/components/diagrams/dual-axis-map.tsx`
  - Left/right lane diagram showing the two intelligence axes plus bridge surfaces.
- `presentation-site/components/diagrams/module-cluster-map.tsx`
  - SVG cluster map for real file/module groupings.

#### Tests

- `presentation-site/tests/unit/content.test.ts`
  - Content-shape guards, axis separation, and module-map consistency.
- `presentation-site/tests/unit/routes-smoke.test.tsx`
  - Route-level rendering assertions for key headings and CTAs.
- `presentation-site/tests/e2e/showroom.spec.ts`
  - Landing-page CTA flow, section presence, and responsive smoke.
- `presentation-site/tests/e2e/deep-dive.spec.ts`
  - Deep-dive navigation and axis/module-map smoke.

## Implementation Notes

- Keep the presentation app fully independent of FastAPI runtime code. It may reference file names and current architecture, but it should not import Python artifacts or fetch live APIs during the initial implementation.
- Treat `presentation-site/content/*.ts` as the single source of truth for narrative copy and diagram data. Components should render from structured content objects rather than hard-coded text.
- The `Event Intelligence` axis and the `Product / Disclosure Intelligence` axis must remain visually distinct in both the landing explanation and the deep-dive diagrams.
- Use motion to create emphasis, not novelty. Respect `prefers-reduced-motion`, and ensure the deep-dive page stays calm and readable.
- Because the repository does not currently include a Node frontend workspace, toolchain bootstrap comes before meaningful component-level TDD. Start route/component tests as soon as the Next/Vitest harness exists, then keep the rest of the work test-first.
- Keep the initial route scope to two pages only: `/` and `/deep-dive`. Additional deep-dive subroutes can remain future work.

## Task 1: Bootstrap The Standalone Frontend Workspace

**Files:**
- Modify: `.gitignore`
- Create: `presentation-site/package.json`
- Create: `presentation-site/tsconfig.json`
- Create: `presentation-site/next.config.mjs`
- Create: `presentation-site/postcss.config.mjs`
- Create: `presentation-site/tailwind.config.ts`
- Create: `presentation-site/vitest.config.ts`
- Create: `presentation-site/playwright.config.ts`
- Create: `presentation-site/tests/setup.ts`
- Create: `presentation-site/app/layout.tsx`
- Create: `presentation-site/app/page.tsx`
- Create: `presentation-site/app/deep-dive/page.tsx`
- Create: `presentation-site/app/globals.css`
- Create: `presentation-site/README.md`

- [ ] **Step 1: Create the workspace skeleton and dependency manifest**

Create `presentation-site/package.json` with the minimal dependency set:

```json
{
  "name": "card-event-intelligence-presentation-site",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "framer-motion": "^12.0.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.8.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Add workspace config files and ignore rules**

Create `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, and `playwright.config.ts`, then extend root `.gitignore`:

```gitignore
presentation-site/node_modules/
presentation-site/.next/
presentation-site/playwright-report/
presentation-site/test-results/
presentation-site/coverage/
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Workdir: `presentation-site`

Expected: install completes and creates `presentation-site/package-lock.json`.

- [ ] **Step 4: Write the first failing route smoke test**

Create `presentation-site/tests/unit/routes-smoke.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";

describe("route smoke", () => {
  it("renders landing CTAs", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /open deep dive/i })).toBeInTheDocument();
  });

  it("renders deep dive heading", () => {
    render(<DeepDivePage />);
    expect(screen.getByRole("heading", { name: /architecture deep dive/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the smoke test to verify it fails**

Run: `npm run test -- --run tests/unit/routes-smoke.test.tsx`

Workdir: `presentation-site`

Expected: FAIL because the route files and exported page components do not exist yet.

- [ ] **Step 6: Create the minimal Next route shell**

Add barebones route files that export React components and load `globals.css`:

```tsx
// presentation-site/app/page.tsx
export default function HomePage() {
  return (
    <main>
      <a href="/deep-dive">Open Deep Dive</a>
    </main>
  );
}
```

```tsx
// presentation-site/app/deep-dive/page.tsx
export default function DeepDivePage() {
  return (
    <main>
      <h1>Architecture Deep Dive</h1>
    </main>
  );
}
```

- [ ] **Step 7: Re-run the smoke test, then build the app**

Run:

- `npm run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm run build`

Workdir: `presentation-site`

Expected: PASS for the smoke tests and a successful production build.

- [ ] **Step 8: Commit**

```bash
git add .gitignore presentation-site
git commit -m "feat: scaffold presentation site workspace"
```

## Task 2: Model Static Content And Architecture Metadata

**Files:**
- Create: `presentation-site/content/site-content.ts`
- Create: `presentation-site/content/architecture-content.ts`
- Create: `presentation-site/content/module-map.ts`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Create: `presentation-site/tests/unit/content.test.ts`

- [ ] **Step 1: Write the failing content-shape tests**

Create `presentation-site/tests/unit/content.test.ts`:

```tsx
import { siteContent } from "@/content/site-content";
import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";

describe("content contracts", () => {
  it("keeps both intelligence axes distinct", () => {
    const axisKeys = architectureContent.axes.map((axis) => axis.key);
    expect(axisKeys).toEqual(["event-intelligence", "product-intelligence"]);
  });

  it("includes landing scenes in order", () => {
    expect(siteContent.landingScenes.map((scene) => scene.key)).toEqual([
      "hero",
      "problem",
      "signal-flow",
      "outcomes",
      "orchestration",
      "deep-dive-cta"
    ]);
  });

  it("maps real modules into named clusters", () => {
    expect(moduleMap.clusters.some((cluster) => cluster.key === "event-pipeline")).toBe(true);
    expect(moduleMap.clusters.some((cluster) => cluster.key === "product-rag")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the content tests to verify they fail**

Run: `npm run test -- --run tests/unit/content.test.ts`

Workdir: `presentation-site`

Expected: FAIL because the content modules do not exist yet.

- [ ] **Step 3: Create typed narrative and architecture content files**

Implement structured exports rather than loose objects:

```ts
// presentation-site/content/architecture-content.ts
export const architectureContent = {
  axes: [
    {
      key: "event-intelligence",
      title: "Event Intelligence",
      question: "What is happening in competitor card events, and what does it mean?"
    },
    {
      key: "product-intelligence",
      title: "Product / Disclosure Intelligence",
      question: "What card products exist, and what structured knowledge can we derive from disclosures and PDFs?"
    }
  ],
  stages: [
    { key: "collect", title: "Collect", technology: "Playwright connectors" },
    { key: "extract", title: "Extract", technology: "detail extraction" },
    { key: "normalize", title: "Normalize", technology: "structured event fields" },
    { key: "enrich", title: "Enrich", technology: "rules + AI" },
    { key: "deliver", title: "Deliver", technology: "analytics + briefing" }
  ]
} as const;
```

Ensure `module-map.ts` captures the real codebase split:

- `app.py`
- `database.py`
- `routers/*`
- `modules/connectors/*`
- `modules/pipeline.py`
- `modules/event_enrichment.py`
- `modules/insights.py`
- `modules/briefing.py`
- `modules/rag/*`

- [ ] **Step 4: Add one route test that consumes real content**

Extend `routes-smoke.test.tsx` to assert that content-backed CTA text is visible once the route renders from `siteContent`:

```tsx
import { siteContent } from "@/content/site-content";
...
expect(screen.getByRole("link", { name: new RegExp(siteContent.hero.primaryCta.label, "i") })).toBeInTheDocument();
```

- [ ] **Step 5: Re-run the content and smoke tests**

Run:

- `npm run test -- --run tests/unit/content.test.ts`
- `npm run test -- --run tests/unit/routes-smoke.test.tsx`

Workdir: `presentation-site`

Expected: PASS for content-shape assertions.

- [ ] **Step 6: Commit**

```bash
git add presentation-site/content presentation-site/tests/unit
git commit -m "feat: add presentation content models"
```

## Task 3: Build The Shared Design System And Route Chrome

**Files:**
- Modify: `presentation-site/app/layout.tsx`
- Modify: `presentation-site/app/globals.css`
- Create: `presentation-site/components/chrome/site-header.tsx`
- Create: `presentation-site/components/chrome/site-footer.tsx`
- Create: `presentation-site/components/chrome/section-shell.tsx`
- Create: `presentation-site/components/chrome/sticky-stage-layout.tsx`
- Modify: `presentation-site/app/page.tsx`
- Modify: `presentation-site/app/deep-dive/page.tsx`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`

- [ ] **Step 1: Write the failing shell tests**

Extend `routes-smoke.test.tsx` to verify shared navigation and deep-dive link presence:

```tsx
it("renders shared navigation", () => {
  render(<HomePage />);
  expect(screen.getByRole("navigation", { name: /primary/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /deep dive/i })).toHaveAttribute("href", "/deep-dive");
});
```

- [ ] **Step 2: Run the shell tests to verify they fail**

Run: `npm run test -- --run tests/unit/routes-smoke.test.tsx`

Workdir: `presentation-site`

Expected: FAIL because the current placeholder pages have no shared chrome.

- [ ] **Step 3: Build the global layout and chrome components**

Implement:

- `layout.tsx` with metadata, `<html lang="ko">`, skip link, and shell wrapper
- `site-header.tsx` with `Overview`, `How It Works`, `Deep Dive`
- `site-footer.tsx` with return links and current-state note
- `section-shell.tsx` for consistent labels/titles
- `sticky-stage-layout.tsx` for split-text/visual scroll sections

Use non-default fonts in `layout.tsx`, for example:

```tsx
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
```

- [ ] **Step 4: Establish global visual tokens in `globals.css`**

Define CSS custom properties and reusable classes:

```css
:root {
  --bg: #08111d;
  --bg-soft: #0d1828;
  --surface: rgba(255, 255, 255, 0.06);
  --line: rgba(155, 211, 255, 0.18);
  --signal: #7ee0ff;
  --signal-warm: #ffb36a;
  --text: #f5f7fb;
  --text-muted: rgba(245, 247, 251, 0.72);
}
```

Also add:

- focus styles
- reduced-motion fallbacks
- scene spacing utilities
- grid primitives for diagram sections

- [ ] **Step 5: Wire the routes into the shared shell**

Update `app/page.tsx` and `app/deep-dive/page.tsx` to render section placeholders inside the new shell so future scene work lands cleanly.

- [ ] **Step 6: Re-run tests and build**

Run:

- `npm run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm run build`

Workdir: `presentation-site`

Expected: PASS and successful build.

- [ ] **Step 7: Commit**

```bash
git add presentation-site/app presentation-site/components/chrome presentation-site/tests/unit/routes-smoke.test.tsx
git commit -m "feat: add presentation site shell"
```

## Task 4: Implement The Landing Showroom Narrative

**Files:**
- Create: `presentation-site/components/diagrams/signal-network.tsx`
- Create: `presentation-site/components/diagrams/process-rail.tsx`
- Create: `presentation-site/components/scenes/hero-scene.tsx`
- Create: `presentation-site/components/scenes/problem-scene.tsx`
- Create: `presentation-site/components/scenes/signal-flow-scene.tsx`
- Create: `presentation-site/components/scenes/outcome-scene.tsx`
- Create: `presentation-site/components/scenes/orchestration-scene.tsx`
- Create: `presentation-site/components/scenes/deep-dive-cta-scene.tsx`
- Modify: `presentation-site/app/page.tsx`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Create: `presentation-site/tests/e2e/showroom.spec.ts`

- [ ] **Step 1: Write failing landing-route tests**

Add route and E2E assertions:

```tsx
it("renders the signal flow stage labels", () => {
  render(<HomePage />);
  expect(screen.getByText(/collect/i)).toBeInTheDocument();
  expect(screen.getByText(/deliver/i)).toBeInTheDocument();
});
```

```ts
// presentation-site/tests/e2e/showroom.spec.ts
import { test, expect } from "@playwright/test";

test("landing page links to deep dive", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /card event intelligence/i })).toBeVisible();
  await page.getByRole("link", { name: /open deep dive/i }).click();
  await expect(page).toHaveURL(/\/deep-dive$/);
});
```

- [ ] **Step 2: Run the landing tests to verify they fail**

Run:

- `npm run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm run test:e2e -- --grep "landing page links to deep dive"`

Workdir: `presentation-site`

Expected: FAIL because the landing route still has placeholders and Playwright navigation is not wired.

- [ ] **Step 3: Build the landing scenes from structured content**

Implement `app/page.tsx` as ordered scenes:

```tsx
export default function HomePage() {
  return (
    <main>
      <HeroScene />
      <ProblemScene />
      <SignalFlowScene />
      <OutcomeScene />
      <OrchestrationScene />
      <DeepDiveCtaScene />
    </main>
  );
}
```

Each scene should consume data from `siteContent` rather than embedding freeform strings.

- [ ] **Step 4: Add theatrical but bounded motion**

Use `framer-motion` for:

- hero network entrance
- stage highlighting in `SignalFlowScene`
- subtle card stagger in `OutcomeScene`
- CTA reveal near the deep-dive handoff

Avoid animating layout-critical dimensions; prefer `opacity`, `transform`, and SVG stroke animations.

- [ ] **Step 5: Re-run landing tests and build**

Run:

- `npm run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm run test:e2e -- --grep "landing page links to deep dive"`
- `npm run build`

Workdir: `presentation-site`

Expected: PASS for landing page smoke, CTA navigation, and build.

- [ ] **Step 6: Commit**

```bash
git add presentation-site/app/page.tsx presentation-site/components/scenes presentation-site/components/diagrams presentation-site/tests
git commit -m "feat: build landing showroom narrative"
```

## Task 5: Build The Deep-Dive Concept And Stage Sections

**Files:**
- Create: `presentation-site/components/deep-dive/concept-architecture.tsx`
- Create: `presentation-site/components/deep-dive/stage-breakdown.tsx`
- Create: `presentation-site/components/deep-dive/orchestration-map.tsx`
- Modify: `presentation-site/app/deep-dive/page.tsx`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Create: `presentation-site/tests/e2e/deep-dive.spec.ts`

- [ ] **Step 1: Write failing deep-dive tests for concept and stages**

Add assertions:

```tsx
it("renders the deep-dive stage breakdown", () => {
  render(<DeepDivePage />);
  expect(screen.getByRole("heading", { name: /concept architecture/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /stage breakdown/i })).toBeInTheDocument();
});
```

```ts
import { test, expect } from "@playwright/test";

test("deep dive shows concept architecture and stage breakdown", async ({ page }) => {
  await page.goto("/deep-dive");
  await expect(page.getByRole("heading", { name: /concept architecture/i })).toBeVisible();
  await expect(page.getByText(/collect/i)).toBeVisible();
  await expect(page.getByText(/enrich/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the deep-dive tests to verify they fail**

Run:

- `npm run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm run test:e2e -- --grep "deep dive shows concept architecture and stage breakdown"`

Workdir: `presentation-site`

Expected: FAIL because the page still renders only a heading.

- [ ] **Step 3: Build the concept architecture section**

Render the top-level architecture zones from `architectureContent` with a calm diagram treatment:

- data sources
- collection layer
- extraction and normalization
- intelligence generation
- delivery surfaces

- [ ] **Step 4: Build the stage breakdown and orchestration sections**

Implement:

- stage cards with `what / why / technology / next`
- a runtime relationship map covering scheduler, routers, event pipeline, briefing, analytics, disclosures, and RAG

Use structured content objects like:

```ts
{
  key: "normalize",
  title: "Normalize",
  why: "Raw event text becomes comparable structure.",
  technology: ["structured parsing", "field normalization"],
  next: "Feeds enrichment, analytics, and briefing payloads."
}
```

- [ ] **Step 5: Re-run deep-dive tests and build**

Run:

- `npm run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm run test:e2e -- --grep "deep dive shows concept architecture and stage breakdown"`
- `npm run build`

Workdir: `presentation-site`

Expected: PASS for concept and stage sections.

- [ ] **Step 6: Commit**

```bash
git add presentation-site/app/deep-dive/page.tsx presentation-site/components/deep-dive presentation-site/tests
git commit -m "feat: add deep dive concept sections"
```

## Task 6: Implement The Dual-Axis And Real Module Architecture Views

**Files:**
- Create: `presentation-site/components/diagrams/dual-axis-map.tsx`
- Create: `presentation-site/components/diagrams/module-cluster-map.tsx`
- Create: `presentation-site/components/deep-dive/dual-axis-architecture.tsx`
- Create: `presentation-site/components/deep-dive/real-module-map.tsx`
- Create: `presentation-site/components/deep-dive/design-principles.tsx`
- Create: `presentation-site/components/deep-dive/evolution-roadmap.tsx`
- Modify: `presentation-site/app/deep-dive/page.tsx`
- Modify: `presentation-site/tests/unit/content.test.ts`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Modify: `presentation-site/tests/e2e/deep-dive.spec.ts`

- [ ] **Step 1: Write failing tests for the axis split and module map**

Add unit assertions:

```tsx
it("shows event and product intelligence as separate sections", () => {
  render(<DeepDivePage />);
  expect(screen.getByText(/event intelligence/i)).toBeInTheDocument();
  expect(screen.getByText(/product \/ disclosure intelligence/i)).toBeInTheDocument();
});
```

Add content consistency assertions:

```tsx
it("does not assign the same cluster to both axis roots", () => {
  const roots = moduleMap.clusters.filter((cluster) => cluster.level === "axis-root");
  expect(roots.map((cluster) => cluster.key)).toEqual(["event-pipeline", "product-rag"]);
});
```

- [ ] **Step 2: Run the axis/module tests to verify they fail**

Run:

- `npm run test -- --run tests/unit/content.test.ts`
- `npm run test -- --run tests/unit/routes-smoke.test.tsx`

Workdir: `presentation-site`

Expected: FAIL because the dual-axis and module-map sections are not rendered yet.

- [ ] **Step 3: Build the explicit two-axis architecture section**

Implement `DualAxisArchitecture` using the exact conceptual split approved in the spec:

- left lane: `Event Intelligence`
- right lane: `Product / Disclosure Intelligence`
- bridge area: `Analytics / Dashboard / Briefing / Operator View`

Make sure the right lane includes:

- disclosures sync
- PDF/catalog collection
- chunking
- embedding
- RAG/catalog summary

- [ ] **Step 4: Build the real module cluster map from `moduleMap`**

Cluster at least the following groups:

- bootstrap: `app.py`, `database.py`
- API surface: `routers/*`
- event collection: `modules/connectors/*`
- event pipeline: `modules/pipeline.py`, `modules/extraction.py`, `modules/normalization.py`
- enrichment: `modules/event_enrichment.py`, `modules/insights.py`, `modules/classification.py`
- briefing and analytics: `modules/briefing.py`, `modules/analytics_service.py`
- product intelligence: `modules/rag/*`, `routers/disclosures.py`, `routers/rag.py`
- UI layer: `templates/*`, `static/js/*`

- [ ] **Step 5: Add design principles and evolution sections**

Render structured cards for:

- connector abstraction
- extraction vs interpretation separation
- rule + AI fallback strategy
- shared data, multiple surfaces
- distinct event/product axes

Then render roadmap cards for:

- issuer expansion
- briefing intelligence refinement
- product knowledge growth
- reliability and maintainability

- [ ] **Step 6: Re-run unit, E2E, and build verification**

Run:

- `npm run test -- --run tests/unit/content.test.ts`
- `npm run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm run test:e2e -- --grep "deep dive"`
- `npm run build`

Workdir: `presentation-site`

Expected: PASS for axis split, module map, and deep-dive smoke.

- [ ] **Step 7: Commit**

```bash
git add presentation-site/components/deep-dive presentation-site/components/diagrams presentation-site/content/module-map.ts presentation-site/tests
git commit -m "feat: add deep dive architecture maps"
```

## Task 7: Polish Motion, Accessibility, And Responsive Behavior

**Files:**
- Modify: `presentation-site/app/globals.css`
- Modify: `presentation-site/components/scenes/*.tsx`
- Modify: `presentation-site/components/deep-dive/*.tsx`
- Modify: `presentation-site/tests/e2e/showroom.spec.ts`
- Modify: `presentation-site/tests/e2e/deep-dive.spec.ts`

- [ ] **Step 1: Write failing responsive and accessibility smoke tests**

Add Playwright coverage for mobile navigation and deep-dive readability:

```ts
test("landing page remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /open deep dive/i })).toBeVisible();
});

test("deep dive exposes both axis titles on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/deep-dive");
  await expect(page.getByText(/event intelligence/i)).toBeVisible();
  await expect(page.getByText(/product \/ disclosure intelligence/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E suite to verify the new tests fail**

Run: `npm run test:e2e`

Workdir: `presentation-site`

Expected: FAIL on one or more viewport/layout assertions before responsive polish.

- [ ] **Step 3: Improve responsive layout and motion safety**

Adjust styles and component layout to ensure:

- no horizontal scroll on `390px` width
- sticky sections collapse gracefully on tablet/mobile
- diagram labels remain readable on small screens
- `prefers-reduced-motion` disables non-essential motion
- focus rings remain visible for keyboard navigation

- [ ] **Step 4: Re-run lint, unit tests, E2E tests, and build**

Run:

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

Workdir: `presentation-site`

Expected: PASS across lint, unit, E2E, and production build.

- [ ] **Step 5: Commit**

```bash
git add presentation-site/app/globals.css presentation-site/components presentation-site/tests
git commit -m "feat: polish presentation site responsiveness"
```

## Task 8: Add Authoring Guidance And Final Verification

**Files:**
- Modify: `presentation-site/README.md`
- Modify: `presentation-site/content/site-content.ts`
- Modify: `presentation-site/content/architecture-content.ts`
- Modify: `presentation-site/content/module-map.ts`

- [ ] **Step 1: Document the content update workflow**

Update `presentation-site/README.md` with:

- local run instructions
- build/test commands
- where to edit landing copy
- where to edit architecture/module content
- how to keep the dual-axis split accurate as the backend evolves

- [ ] **Step 2: Add explicit snapshot metadata to content files**

Expose a current-state marker that can be rendered in the footer:

```ts
export const snapshotMeta = {
  label: "Current Architecture Snapshot",
  capturedOn: "2026-03-20",
  note: "Curated from the current codebase; not live-coupled to runtime APIs."
} as const;
```

- [ ] **Step 3: Run final verification**

Run:

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

Workdir: `presentation-site`

Expected: PASS and ready for review/demo.

- [ ] **Step 4: Commit**

```bash
git add presentation-site/README.md presentation-site/content
git commit -m "docs: add presentation site authoring guide"
```

## Verification Checklist

Before calling the work complete, verify all of the following in `presentation-site/`:

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

Also manually confirm:

- landing route feels theatrical but still readable
- `/deep-dive` is calmer and more structured than `/`
- `Event Intelligence` and `Product / Disclosure Intelligence` appear as clearly separate lanes
- the real module map includes the current Python code areas without collapsing the two axes into one
- the site still makes sense if the user never opens `/deep-dive`
