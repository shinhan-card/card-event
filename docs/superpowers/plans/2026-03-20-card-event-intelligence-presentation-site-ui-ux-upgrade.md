# Card Event Intelligence Presentation Site UI/UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `presentation-site/`를 한국어 중심의 `Executive Atlas` 프레젠테이션 사이트로 전면 개편해, 메인 `/`에서는 경영진/비개발자 설득력을 높이고 `/deep-dive`에서는 두 축 아키텍처와 세부 기술 원리를 diagram-first 방식으로 설명한다.

**Architecture:** `presentation-site/`는 계속 별도 Next.js 앱으로 유지하고, 모든 카피와 다이어그램 데이터는 `content/*.ts`에서 타입 안전하게 관리한다. `/`는 `이벤트 인텔리전스`와 `상품 / 공시 지식 축`을 병렬로 소개하는 쇼룸으로, `/deep-dive`는 7개의 구조 보드로 현재 코드베이스의 실제 책임 분리를 시각화하는 기술 리뷰 페이지로 재구성한다.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, SVG/React diagrams, Vitest, React Testing Library, Playwright, npm

---

## Working Notes

- 구현은 전용 worktree에서 진행한다. 상대 경로는 모두 worktree 루트 기준으로 동일하게 `presentation-site/...`를 사용한다.
- 이 사이트는 현재 시점의 정적 스냅샷을 설명하는 용도다. FastAPI 런타임이나 실시간 API에 직접 의존하지 않는다.
- 기술명, 파일명, 모듈명 외의 UI 노출 문구는 전부 한국어로 유지한다.
- `Event Intelligence`와 `Product / Disclosure Intelligence`는 같은 페이지 안에서도 반드시 서로 다른 레인으로 읽혀야 한다.
- 딥다이브는 카드 나열이 아니라 `총괄 청사진 -> 축 구조 -> 세부 보드 -> 근거 지도 -> 원칙/진화 보드` 흐름의 구조 문서처럼 보여야 한다.

## Explicit Data Contracts

구현 중 문자열 인코딩이나 암묵적 프로퍼티 추측으로 흔들리지 않도록, 아래 계약을 먼저 고정한다.

### 1. UI 문자열 리터럴 계약

아래 리터럴은 실제 화면에 노출될 정확한 값이다. 구현과 테스트에서는 이 상수만 참조한다.

```ts
export const uiCopy = {
  navOverview: "\uac1c\uc694",
  navAxes: "\ub450 \ucd95",
  navHowItWorks: "\uc791\ub3d9 \ubc29\uc2dd",
  navValue: "\uac00\uce58",
  navDeepDive: "\uad6c\uc870 \uc0c1\uc138",
  ctaPrimary: "\uad6c\uc870 \uc790\uc138\ud788 \ubcf4\uae30",
  ctaSecondary: "\ub450 \ucd95 \uba3c\uc800 \ubcf4\uae30",
  landingThesis: "\uc2dc\uc2a4\ud15c \uc120\uc5b8\uba74",
  landingTension: "\ub450 \ucd95\uc758 \uae34\uc7a5",
  landingEngine: "\uc774\uc911 \uc5d4\uc9c4 \ubcf4\ub4dc",
  landingDecision: "\ud310\ub2e8 \uc804\ub2ec\uba74",
  landingValue: "\uc2dc\uc2a4\ud15c \uac00\uce58",
  landingHandoff: "\ub515\ub2e4\uc774\ube0c \uc804\ud658",
  deepDiveExecutive: "\ucd1d\uad04 \uccad\uc0ac\uc9c4",
  deepDiveDualAxis: "\uc774\uc911 \ucd95 \uac70\uc2dc \uad6c\uc870\ub3c4",
  deepDiveEvent: "\uc774\ubca4\ud2b8 \ud574\uc11d \uad6c\uc870\ub3c4",
  deepDiveProduct: "\uc0c1\ud488 / \uacf5\uc2dc \uc9c0\uc2dd\ud654 \uad6c\uc870\ub3c4",
  deepDiveOrchestration: "\uc624\ucf00\uc2a4\ud2b8\ub808\uc774\uc158 \uc81c\uc5b4 \ubcf4\ub4dc",
  deepDiveModules: "\uadfc\uac70 \uae30\ubc18 \ubaa8\ub4c8 \uc9c0\ub3c4",
  deepDivePrinciples: "\uc6d0\uce59\uacfc \uc9c4\ud654 \ubcf4\ub4dc",
  snapshotLabel: "\ud604\uc7ac \uad6c\uc870 \uc2a4\ub0c5\uc0f7"
} as const;
```

### 2. `siteContent` 최종 형태

```ts
export interface SiteContent {
  copy: typeof uiCopy;
  snapshotMeta: {
    label: string;
    capturedOn: string;
    note: string;
  };
  navigation: readonly Array<{
    href: string;
    label: string;
  }>;
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    primaryCta: { href: string; label: string };
    secondaryCta: { href: string; label: string };
  };
  landingScenes: readonly Array<{
    key:
      | "thesis"
      | "tension"
      | "dual-engine"
      | "decision-surfaces"
      | "system-value"
      | "deep-dive-handoff";
    anchorId: string;
    title: string;
    summary: string;
  }>;
  decisionSurfaces: readonly Array<{
    title: string;
    summary: string;
  }>;
  valueCards: readonly Array<{
    title: string;
    summary: string;
  }>;
}
```

### 3. `architectureContent` 최종 형태

```ts
export interface ArchitectureContent {
  copy: typeof uiCopy;
  boardOrder: readonly [
    "executive-blueprint",
    "dual-axis-macro",
    "event-interpretation",
    "product-knowledge",
    "orchestration-control",
    "evidence-module-map",
    "principles-evolution"
  ];
  axes: readonly Array<{
    key: "event-intelligence" | "product-intelligence";
    title: string;
    question: string;
    summary: string;
    technologyBadges: readonly string[];
  }>;
  executiveBlueprint: {
    inputLanes: readonly string[];
    processingLanes: readonly string[];
    deliverySurface: readonly string[];
    technologyBadges: readonly string[];
  };
  eventInterpretation: {
    title: string;
    steps: readonly Array<{
      key:
        | "collect"
        | "extract"
        | "structure"
        | "rule-interpretation"
        | "gemini-augmentation"
        | "briefing-summary"
        | "deliver";
      title: string;
      summary: string;
      technologies: readonly string[];
      output: string;
    }>;
  };
  productKnowledge: {
    title: string;
    steps: readonly Array<{
      key:
        | "collect-sources"
        | "store-raw"
        | "clean-document"
        | "chunk"
        | "embed"
        | "store-vector"
        | "retrieve-rag"
        | "compose-response"
        | "deliver";
      title: string;
      summary: string;
      technologies: readonly string[];
      output: string;
    }>;
  };
  orchestrationColumns: readonly Array<{
    title: string;
    nodes: readonly string[];
    technologies: readonly string[];
  }>;
  principles: readonly Array<{
    title: string;
    caption: string;
  }>;
  roadmap: readonly Array<{
    title: string;
    caption: string;
    stage: "now" | "next" | "later";
  }>;
}
```

### 4. `moduleMap` 최종 형태

```ts
export interface ModuleMap {
  clusters: readonly Array<{
    key: string;
    group: "shared-core" | "event-axis" | "product-axis" | "delivery-surfaces";
    title: string;
    summary: string;
    evidenceLevel: "implemented" | "approved";
    files: readonly string[];
  }>;
}
```

### 5. 컴포넌트와 데이터 경계

중복 로직을 막기 위해 각 보드는 아래 데이터만 직접 받는다.

- `HeroScene`, `AxisTensionScene`, `DualEngineScene`, `DecisionSurfaceScene`, `SystemValueScene`, `DeepDiveHandoffScene`
  - `siteContent`
- `ExecutiveBlueprint`
  - `architectureContent.executiveBlueprint`
- `DualAxisMacro`
  - `architectureContent.axes`
- `EventInterpretationBoard`
  - `architectureContent.eventInterpretation`
- `ProductKnowledgeBoard`
  - `architectureContent.productKnowledge`
- `OrchestrationControlBoard`
  - `architectureContent.orchestrationColumns`
- `EvidenceModuleMap`
  - `moduleMap.clusters`
- `PrinciplesEvolutionBoard`
  - `architectureContent.principles`
  - `architectureContent.roadmap`

## File Map

### Existing files to modify

- `presentation-site/app/layout.tsx`
  - `lang`, metadata, skip link, 공용 셸 진입점으로 개편.
- `presentation-site/app/globals.css`
  - 다크 네이비 기반 토큰, 구조선, 패널, 모션 안전 규칙, 반응형 레이아웃 규칙 추가.
- `presentation-site/app/page.tsx`
  - 메인 쇼룸 장면 조합 진입점으로 교체.
- `presentation-site/app/deep-dive/page.tsx`
  - 7개 딥다이브 구조 보드 조합 진입점으로 교체.
- `presentation-site/content/site-content.ts`
  - 메인 내비게이션, 히어로, 장면 카피, CTA, 스냅샷 메타데이터를 한국어 중심으로 재정의.
- `presentation-site/content/architecture-content.ts`
  - 이벤트 축, 상품/RAG 축, 기술 배지, 오케스트레이션 컬럼, 원칙/진화 데이터를 세분화.
- `presentation-site/content/module-map.ts`
  - 실제 모듈 책임 지도와 근거 레벨을 반영하도록 확장.
- `presentation-site/tests/unit/routes-smoke.test.tsx`
  - 한국어 UI, 메인/딥다이브 핵심 구조 노출 여부를 확인하는 스모크 테스트로 재작성.
- `presentation-site/tests/unit/content.test.ts`
  - 2축 분리, 7개 구조 보드, 기술 배지, 한국어 UI 계약을 검증하도록 확장.
- `presentation-site/README.md`
  - 카피/다이어그램 수정 포인트, 검증 절차, 2축 유지 규칙을 문서화.

### Files to create

#### App and shared chrome

- `presentation-site/app/icon.svg`
  - 사이트 파비콘.
- `presentation-site/components/chrome/page-shell.tsx`
  - 공용 레이아웃 프레임.
- `presentation-site/components/chrome/site-header.tsx`
  - 한국어 상단 내비게이션과 현재 위치 강조.
- `presentation-site/components/chrome/site-footer.tsx`
  - 현재 스냅샷 메타데이터, 딥다이브 진입/복귀 링크.
- `presentation-site/components/chrome/section-frame.tsx`
  - 섹션 제목, 캡션, 비주얼 슬롯 정렬용 공용 래퍼.
- `presentation-site/components/chrome/sticky-visual-layout.tsx`
  - 메인 쇼룸의 좌우 분할/스티키 장면 레이아웃.

#### Landing showroom scenes

- `presentation-site/components/scenes/hero-scene.tsx`
  - 시스템 선언면.
- `presentation-site/components/scenes/axis-tension-scene.tsx`
  - 두 축의 긴장 장면.
- `presentation-site/components/scenes/dual-engine-scene.tsx`
  - 병렬 미니 레인 + 공유 전달면 보드.
- `presentation-site/components/scenes/decision-surface-scene.tsx`
  - 브리핑/애널리틱스/운영 판단면 장면.
- `presentation-site/components/scenes/system-value-scene.tsx`
  - 가치와 기대효과 장면.
- `presentation-site/components/scenes/deep-dive-handoff-scene.tsx`
  - `/deep-dive` 전환 장면.

#### Deep-dive sections

- `presentation-site/components/deep-dive/executive-blueprint.tsx`
  - 총괄 청사진 보드.
- `presentation-site/components/deep-dive/dual-axis-macro.tsx`
  - 이중 축 거시 구조도.
- `presentation-site/components/deep-dive/event-interpretation-board.tsx`
  - 이벤트 해석 구조도.
- `presentation-site/components/deep-dive/product-knowledge-board.tsx`
  - 상품 / 공시 지식화 구조도.
- `presentation-site/components/deep-dive/orchestration-control-board.tsx`
  - 오케스트레이션 제어 보드.
- `presentation-site/components/deep-dive/evidence-module-map.tsx`
  - 실제 파일/모듈 기반 근거 지도.
- `presentation-site/components/deep-dive/principles-evolution-board.tsx`
  - 설계 원칙과 진화 보드.

#### Shared diagram primitives

- `presentation-site/components/diagrams/signal-network.tsx`
  - 얇은 구조선 기반 배경 네트워크.
- `presentation-site/components/diagrams/dual-lane-board.tsx`
  - 두 축 병렬 레인을 그리는 공용 보드.
- `presentation-site/components/diagrams/technology-rail.tsx`
  - 단계별 기술 배지 정렬 컴포넌트.
- `presentation-site/components/diagrams/control-board.tsx`
  - 오케스트레이션 컬럼/노드 보드.
- `presentation-site/components/diagrams/module-map-diagram.tsx`
  - 실제 모듈 군집 지도.
- `presentation-site/components/diagrams/diagram-legend.tsx`
  - 실선/점선/배지 색/근거 레벨 범례.

#### Tests

- `presentation-site/tests/e2e/showroom.spec.ts`
  - 메인 쇼룸 흐름과 CTA 내비게이션 검증.
- `presentation-site/tests/e2e/deep-dive.spec.ts`
  - 딥다이브 7개 구조 보드와 핵심 기술 노출 검증.

### Files to delete or replace

- `presentation-site/tests/e2e/bootstrap-placeholder.spec.ts`
  - 실제 E2E 커버리지로 대체 후 제거.

## Implementation Notes

- `site-content.ts`는 UI 문구와 장면 순서를 담당하고, `architecture-content.ts`는 기술 단계/구조 보드 데이터를 담당한다. 카피와 구조 데이터를 컴포넌트 내부에 하드코딩하지 않는다.
- 이벤트 축과 상품/RAG 축은 이름만 다른 것이 아니라 입력 소스, 처리 단계, 기술 배지, 출력면까지 별도 데이터 구조로 유지한다.
- `Gemini`, `Playwright`, `BeautifulSoup`, `FastAPI`, `APScheduler`, `SQLite`, `SQLAlchemy`, `ChromaDB`, `RAG`, `PDF/HTML extraction`은 실제 기술명 그대로 노출한다.
- `/deep-dive`는 반드시 아래 7개 보드를 모두 렌더링해야 한다.
  1. `총괄 청사진`
  2. `이중 축 거시 구조도`
  3. `이벤트 해석 구조도`
  4. `상품 / 공시 지식화 구조도`
  5. `오케스트레이션 제어 보드`
  6. `근거 기반 모듈 지도`
  7. `원칙과 진화 보드`

## Task 1: 콘텐츠 계약과 한국어 정보 구조를 재정의한다

**Files:**
- Modify: `presentation-site/content/site-content.ts`
- Modify: `presentation-site/content/architecture-content.ts`
- Modify: `presentation-site/content/module-map.ts`
- Modify: `presentation-site/tests/unit/content.test.ts`

- [ ] **Step 1: 실패하는 콘텐츠 계약 테스트를 먼저 작성한다**

`presentation-site/tests/unit/content.test.ts`를 아래 방향으로 확장한다.

```ts
import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";
import { siteContent } from "@/content/site-content";

describe("content contracts", () => {
  it("keeps UI navigation labels in Korean", () => {
    expect(siteContent.navigation.map((item) => item.label)).toEqual([
      siteContent.copy.navOverview,
      siteContent.copy.navAxes,
      siteContent.copy.navHowItWorks,
      siteContent.copy.navValue,
      siteContent.copy.navDeepDive
    ]);
  });

  it("defines all seven deep-dive boards", () => {
    expect(architectureContent.boardOrder).toEqual([
      "executive-blueprint",
      "dual-axis-macro",
      "event-interpretation",
      "product-knowledge",
      "orchestration-control",
      "evidence-module-map",
      "principles-evolution"
    ]);
  });

  it("keeps the two axis roots distinct", () => {
    expect(architectureContent.axes.map((axis) => axis.key)).toEqual([
      "event-intelligence",
      "product-intelligence"
    ]);
  });

  it("includes detailed product knowledge steps", () => {
    expect(architectureContent.productKnowledge.steps.map((step) => step.key)).toEqual([
      "collect-sources",
      "store-raw",
      "clean-document",
      "chunk",
      "embed",
      "store-vector",
      "retrieve-rag",
      "compose-response",
      "deliver"
    ]);
  });

  it("includes detailed event interpretation steps", () => {
    expect(architectureContent.eventInterpretation.steps.map((step) => step.key)).toEqual([
      "collect",
      "extract",
      "structure",
      "rule-interpretation",
      "gemini-augmentation",
      "briefing-summary",
      "deliver"
    ]);
  });
});
```

- [ ] **Step 2: 테스트를 실행해 실제로 실패하는지 확인한다**

Run: `npm.cmd run test -- --run tests/unit/content.test.ts`

Workdir: `presentation-site`

Expected: FAIL because current content models are still 영어 위주이고 7개 보드/세부 단계 구조가 없다.

- [ ] **Step 3: 콘텐츠 타입과 실제 데이터를 최소 구현으로 재정의한다**

`site-content.ts`, `architecture-content.ts`, `module-map.ts`는 위 `Explicit Data Contracts` 섹션의 타입과 키 이름을 그대로 구현한다.

`site-content.ts`는 아래와 같은 형태를 시작점으로 둔다.

```ts
export const siteContent = {
  copy: uiCopy,
  snapshotMeta: {
    label: uiCopy.snapshotLabel,
    capturedOn: "2026-03-20",
    note: "현재 코드베이스를 기준으로 큐레이션한 설명입니다."
  },
  navigation: [
    { href: "#개요", label: uiCopy.navOverview },
    { href: "#두-축", label: uiCopy.navAxes },
    { href: "#작동-방식", label: uiCopy.navHowItWorks },
    { href: "#가치", label: uiCopy.navValue },
    { href: "/deep-dive", label: uiCopy.navDeepDive }
  ],
  hero: {
    eyebrow: "카드 이벤트 인텔리전스",
    title: "흩어진 카드사 이벤트와 상품 근거를 하나의 인텔리전스 구조로 정리합니다.",
    primaryCta: { href: "/deep-dive", label: uiCopy.ctaPrimary },
    secondaryCta: { href: "#두-축", label: uiCopy.ctaSecondary }
  }
} as const;
```

`architecture-content.ts`에는 `copy`, `boardOrder`, `executiveBlueprint`, `eventInterpretation`, `productKnowledge`, `orchestrationColumns`, `principles`, `roadmap`를 모두 포함하고, `module-map.ts`는 `shared-core`, `event-axis`, `product-axis`, `delivery-surfaces` 식으로 군집을 나눈다.

- [ ] **Step 4: 콘텐츠 계약 테스트를 다시 실행한다**

Run: `npm.cmd run test -- --run tests/unit/content.test.ts`

Workdir: `presentation-site`

Expected: PASS with both axis separation, 7-board order, Korean labels, and detailed product/event steps.

- [ ] **Step 5: 커밋한다**

```bash
git add presentation-site/content presentation-site/tests/unit/content.test.ts
git commit -m "feat: define executive atlas content contracts"
```

## Task 2: 전역 셸과 시각 시스템을 깐다

**Files:**
- Modify: `presentation-site/app/layout.tsx`
- Modify: `presentation-site/app/globals.css`
- Modify: `presentation-site/app/page.tsx`
- Modify: `presentation-site/app/deep-dive/page.tsx`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Create: `presentation-site/app/icon.svg`
- Create: `presentation-site/components/chrome/page-shell.tsx`
- Create: `presentation-site/components/chrome/site-header.tsx`
- Create: `presentation-site/components/chrome/site-footer.tsx`
- Create: `presentation-site/components/chrome/section-frame.tsx`
- Create: `presentation-site/components/chrome/sticky-visual-layout.tsx`

- [ ] **Step 1: 셸용 스모크 테스트를 먼저 작성한다**

`presentation-site/tests/unit/routes-smoke.test.tsx`를 아래처럼 확장한다.

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";
import { architectureContent } from "@/content/architecture-content";
import { siteContent } from "@/content/site-content";

describe("route smoke", () => {
  it("renders Korean navigation and primary CTA on the landing page", () => {
    render(<HomePage />);
    expect(screen.getByRole("navigation", { name: "주요 섹션" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: siteContent.copy.ctaPrimary })).toHaveAttribute(
      "href",
      "/deep-dive"
    );
  });

  it("renders the deep dive shell and snapshot footer", () => {
    render(<DeepDivePage />);
    expect(
      screen.getByRole("heading", { name: architectureContent.copy.deepDiveExecutive })
    ).toBeInTheDocument();
    expect(screen.getByText(siteContent.snapshotMeta.label)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run: `npm.cmd run test -- --run tests/unit/routes-smoke.test.tsx`

Workdir: `presentation-site`

Expected: FAIL because current routes are placeholder links/headings only and there is no shared chrome.

- [ ] **Step 3: 공용 레이아웃과 다크 네이비 디자인 토큰을 구현한다**

최소 구현 기준:

- `layout.tsx`
  - `<html lang="ko">`
  - 한국어 metadata
  - skip link
  - `PageShell` 래퍼 사용
- `globals.css`
  - 다크 네이비 / 아이스 블루 / 브라스 토큰
  - 얇은 구조선, 패널, 포커스 링, reduced-motion 규칙
  - 모바일에서 가로 스크롤이 생기지 않는 기본 그리드
- `site-header.tsx`
  - `개요`, `두 축`, `작동 방식`, `가치`, `구조 상세`
- `site-footer.tsx`
  - 스냅샷 라벨/날짜/설명 노출

예시 토큰:

```css
:root {
  --bg: #07111d;
  --bg-soft: #0d1828;
  --surface: rgba(255, 255, 255, 0.05);
  --line: rgba(126, 224, 255, 0.18);
  --signal: #7ee0ff;
  --signal-warm: #d6a261;
  --text: #f4f7fb;
  --text-muted: rgba(244, 247, 251, 0.72);
}
```

- [ ] **Step 4: 라우트 엔트리포인트를 셸에 연결한다**

`app/page.tsx`와 `app/deep-dive/page.tsx`는 아직 전체 장면을 다 만들지 않더라도, 최소한 `PageShell`, `SectionFrame`, 한국어 제목 자리표시자를 렌더링하도록 바꾼다.

- [ ] **Step 5: 스모크 테스트와 빌드를 다시 돌린다**

Run:

- `npm.cmd run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm.cmd run build`

Workdir: `presentation-site`

Expected: PASS. 레이아웃 셸과 한국어 내비게이션, 스냅샷 footer가 보이고 빌드도 통과한다.

- [ ] **Step 6: 커밋한다**

```bash
git add presentation-site/app presentation-site/components/chrome presentation-site/tests/unit/routes-smoke.test.tsx
git commit -m "feat: add executive atlas shell"
```

## Task 3: 메인 쇼룸 장면을 재구성한다

**Files:**
- Modify: `presentation-site/app/page.tsx`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Create: `presentation-site/components/scenes/hero-scene.tsx`
- Create: `presentation-site/components/scenes/axis-tension-scene.tsx`
- Create: `presentation-site/components/scenes/dual-engine-scene.tsx`
- Create: `presentation-site/components/scenes/decision-surface-scene.tsx`
- Create: `presentation-site/components/scenes/system-value-scene.tsx`
- Create: `presentation-site/components/scenes/deep-dive-handoff-scene.tsx`
- Create: `presentation-site/components/diagrams/signal-network.tsx`
- Create: `presentation-site/components/diagrams/dual-lane-board.tsx`
- Create: `presentation-site/tests/e2e/showroom.spec.ts`

- [ ] **Step 1: 메인 장면용 단위/E2E 테스트를 먼저 작성한다**

`routes-smoke.test.tsx`에 메인 장면 확인을 추가한다.

```tsx
import { siteContent } from "@/content/site-content";

it("renders the landing showroom scenes in Korean", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: siteContent.copy.landingTension })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: siteContent.copy.landingEngine })).toBeInTheDocument();
  expect(screen.getByText("Playwright")).toBeInTheDocument();
  expect(screen.getByText("Gemini")).toBeInTheDocument();
});
```

`presentation-site/tests/e2e/showroom.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { siteContent } from "../../content/site-content";

test("main showroom guides users into the deep dive", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: siteContent.copy.landingThesis })).toBeVisible();
  await expect(page.getByRole("link", { name: siteContent.copy.ctaPrimary })).toBeVisible();
  await page.getByRole("link", { name: siteContent.copy.ctaPrimary }).click();
  await expect(page).toHaveURL(/\/deep-dive$/);
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run:

- `npm.cmd run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm.cmd run test:e2e -- --grep "main showroom guides users into the deep dive"`

Workdir: `presentation-site`

Expected: FAIL because the landing route still has placeholder content and no dedicated scenes.

- [ ] **Step 3: 메인 쇼룸 장면들을 구현한다**

`app/page.tsx`는 아래 순서로 구성한다.

```tsx
export default function HomePage() {
  return (
    <main>
      <HeroScene />
      <AxisTensionScene />
      <DualEngineScene />
      <DecisionSurfaceScene />
      <SystemValueScene />
      <DeepDiveHandoffScene />
    </main>
  );
}
```

구현 조건:

- `HeroScene`은 구조선 배경과 큰 한국어 헤드라인을 사용한다.
- `AxisTensionScene`은 이벤트 축과 상품/공시 축이 서로 다른 질문이라는 점을 보여준다.
- `DualEngineScene`은 `이벤트 레인`과 `상품 / 공시 레인`을 나란히 두고, 공유 전달면에서만 합류하게 만든다.
- 기술 배지는 `Playwright`, `BeautifulSoup`, `Gemini`, `FastAPI`를 노출한다.
- `DecisionSurfaceScene`은 브리핑/애널리틱스/운영 판단면을 보여준다.

- [ ] **Step 4: 메인 장면 검증을 다시 돌린다**

Run:

- `npm.cmd run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm.cmd run test:e2e -- --grep "main showroom guides users into the deep dive"`
- `npm.cmd run build`

Workdir: `presentation-site`

Expected: PASS. 메인은 한국어 장면 제목과 기술 배지를 포함하고, CTA로 `/deep-dive` 이동이 가능하다.

- [ ] **Step 5: 커밋한다**

```bash
git add presentation-site/app/page.tsx presentation-site/components/scenes presentation-site/components/diagrams presentation-site/tests
git commit -m "feat: build korean executive showroom"
```

## Task 4: 딥다이브의 상단 4개 보드를 구현한다

**Files:**
- Modify: `presentation-site/app/deep-dive/page.tsx`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Create: `presentation-site/components/deep-dive/executive-blueprint.tsx`
- Create: `presentation-site/components/deep-dive/dual-axis-macro.tsx`
- Create: `presentation-site/components/deep-dive/event-interpretation-board.tsx`
- Create: `presentation-site/components/deep-dive/product-knowledge-board.tsx`
- Create: `presentation-site/components/diagrams/technology-rail.tsx`
- Create: `presentation-site/tests/e2e/deep-dive.spec.ts`

- [ ] **Step 1: 딥다이브 상단 구조 보드 테스트를 먼저 작성한다**

`routes-smoke.test.tsx`에 다음을 추가한다.

```tsx
import { architectureContent } from "@/content/architecture-content";

it("renders the first four deep-dive boards", () => {
  render(<DeepDivePage />);
  expect(screen.getByRole("heading", { name: architectureContent.copy.deepDiveExecutive })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: architectureContent.copy.deepDiveDualAxis })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: architectureContent.copy.deepDiveEvent })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: architectureContent.copy.deepDiveProduct })).toBeInTheDocument();
});
```

`presentation-site/tests/e2e/deep-dive.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { architectureContent } from "../../content/architecture-content";

test("deep dive shows the top architecture boards", async ({ page }) => {
  await page.goto("/deep-dive");
  await expect(
    page.getByRole("heading", { name: architectureContent.copy.deepDiveExecutive })
  ).toBeVisible();
  await expect(page.getByText(architectureContent.eventInterpretation.steps[3].title)).toBeVisible();
  await expect(page.getByText(architectureContent.eventInterpretation.steps[4].title)).toBeVisible();
  await expect(page.getByText(architectureContent.productKnowledge.steps[3].title)).toBeVisible();
  await expect(page.getByText("ChromaDB")).toBeVisible();
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run:

- `npm.cmd run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm.cmd run test:e2e -- --grep "deep dive shows the top architecture boards"`

Workdir: `presentation-site`

Expected: FAIL because `/deep-dive`는 아직 하나의 heading만 렌더링한다.

- [ ] **Step 3: 상단 4개 보드를 구현한다**

`app/deep-dive/page.tsx`는 최소 아래 순서를 가져야 한다.

```tsx
export default function DeepDivePage() {
  return (
    <main>
      <ExecutiveBlueprint />
      <DualAxisMacro />
      <EventInterpretationBoard />
      <ProductKnowledgeBoard />
    </main>
  );
}
```

구현 조건:

- `ExecutiveBlueprint`는 단일 파이프라인이 아니라 병렬 청사진으로 보여야 한다.
- `ExecutiveBlueprint`는 `architectureContent.executiveBlueprint`만 props로 받아 input/processing/delivery lanes를 렌더링한다.
- `DualAxisMacro`는 `architectureContent.axes`만 props로 받아 축 질문, 요약, 기술 배지를 렌더링한다.
- `EventInterpretationBoard`는 `수집 -> 추출 -> 구조 필드 정리 -> 규칙 기반 해석 -> Gemini 보강 -> 브리핑용 요약 -> 전달`을 드러낸다.
- `EventInterpretationBoard`는 `architectureContent.eventInterpretation`만 props로 받아 각 step의 `title`, `summary`, `technologies`, `output`을 그대로 쓴다.
- `ProductKnowledgeBoard`는 `소스 수집 -> 원문 적재 -> 문서 정제 -> 청킹 -> 임베딩 -> 벡터 저장 -> 검색 / RAG -> 응답 구성 -> 전달`을 드러낸다.
- `ProductKnowledgeBoard`는 `architectureContent.productKnowledge`만 props로 받아 각 step의 `title`, `summary`, `technologies`, `output`을 그대로 쓴다.
- `TechnologyRail`로 기술 배지를 단계 옆에 정렬한다.

- [ ] **Step 4: 단위/E2E/빌드를 다시 실행한다**

Run:

- `npm.cmd run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm.cmd run test:e2e -- --grep "deep dive shows the top architecture boards"`
- `npm.cmd run build`

Workdir: `presentation-site`

Expected: PASS. 상단 보드 4개와 이벤트/상품 세부 단계, 핵심 기술명이 실제 화면에 나타난다.

- [ ] **Step 5: 커밋한다**

```bash
git add presentation-site/app/deep-dive/page.tsx presentation-site/components/deep-dive presentation-site/components/diagrams presentation-site/tests
git commit -m "feat: add deep dive architecture boards"
```

## Task 5: 오케스트레이션, 실제 모듈 지도, 원칙/진화 보드를 마무리한다

**Files:**
- Modify: `presentation-site/app/deep-dive/page.tsx`
- Modify: `presentation-site/content/module-map.ts`
- Modify: `presentation-site/tests/unit/content.test.ts`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Modify: `presentation-site/tests/e2e/deep-dive.spec.ts`
- Create: `presentation-site/components/deep-dive/orchestration-control-board.tsx`
- Create: `presentation-site/components/deep-dive/evidence-module-map.tsx`
- Create: `presentation-site/components/deep-dive/principles-evolution-board.tsx`
- Create: `presentation-site/components/diagrams/control-board.tsx`
- Create: `presentation-site/components/diagrams/module-map-diagram.tsx`
- Create: `presentation-site/components/diagrams/diagram-legend.tsx`

- [ ] **Step 1: 나머지 3개 보드에 대한 실패 테스트를 작성한다**

`content.test.ts`와 `routes-smoke.test.tsx`를 확장한다.

```ts
it("separates module clusters into shared, event, product, and delivery groups", () => {
  expect(moduleMap.clusters.map((cluster) => cluster.group)).toEqual([
    "shared-core",
    "event-axis",
    "product-axis",
    "delivery-surfaces"
  ]);
});
```

```tsx
import { architectureContent } from "@/content/architecture-content";

it("renders orchestration, module map, and principles boards", () => {
  render(<DeepDivePage />);
  expect(
    screen.getByRole("heading", { name: architectureContent.copy.deepDiveOrchestration })
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: architectureContent.copy.deepDiveModules })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: architectureContent.copy.deepDivePrinciples })
  ).toBeInTheDocument();
  expect(screen.getByText("APScheduler")).toBeInTheDocument();
  expect(screen.getByText("modules/pipeline.py")).toBeInTheDocument();
  expect(screen.getByText("modules/rag/*")).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run:

- `npm.cmd run test -- --run tests/unit/content.test.ts`
- `npm.cmd run test -- --run tests/unit/routes-smoke.test.tsx`

Workdir: `presentation-site`

Expected: FAIL because module map과 남은 보드들이 아직 구현되지 않았다.

- [ ] **Step 3: 오케스트레이션/모듈/원칙 보드를 구현한다**

구현 조건:

- `OrchestrationControlBoard`
  - 컬럼: 스케줄, 라우팅, 축별 처리, 저장, 전달, 운영 확인
  - 기술 배지: `APScheduler`, `FastAPI`, `SQLite`, `SQLAlchemy`
- `EvidenceModuleMap`
  - `shared-core`
    - `app.py`
    - `database.py`
    - `routers/health.py`
    - `modules/api_utils.py`
  - `event-axis`
    - `routers/events.py`
    - `routers/pipeline.py`
    - `routers/jobs.py`
    - `modules/connectors/*`
    - `modules/extraction.py`
    - `modules/normalization.py`
    - `modules/pipeline.py`
    - `modules/event_enrichment.py`
    - `modules/classification.py`
    - `modules/condition_facts.py`
    - `modules/rules_engine.py`
    - `modules/insights.py`
  - `product-axis`
    - `routers/disclosures.py`
    - `routers/rag.py`
    - `modules/product_links.py`
    - `modules/rag/collector.py`
    - `modules/rag/chunker.py`
    - `modules/rag/embedder.py`
    - `modules/rag/product_scraper.py`
    - `modules/rag/catalog_summary.py`
  - `delivery-surfaces`
    - `routers/analytics.py`
    - `routers/briefing.py`
    - `routers/pages.py`
    - `modules/analytics_service.py`
    - `modules/briefing.py`
    - `templates/dashboard_luxury.html`
    - `templates/dashboard_pro.html`
    - `templates/email_daily_briefing.html`
    - `templates/weekly_report.html`
    - `static/js/dashboard.js`
    - `static/js/dashboard_extras.js`
  - 실선 = 현재 구현, 점선 = 승인된 설계
- `PrinciplesEvolutionBoard`
  - 설계 원칙: 두 축 분리, 규칙 기반 안전망, 공유 전달면, 실제 코드/승인 설계 구분
  - 진화 로드맵: 브리핑 인텔리전스, 상품 지식 확장, 운영자 판단면 강화

- [ ] **Step 4: 딥다이브 전체 구조 검증을 다시 실행한다**

Run:

- `npm.cmd run test -- --run tests/unit/content.test.ts`
- `npm.cmd run test -- --run tests/unit/routes-smoke.test.tsx`
- `npm.cmd run test:e2e -- --grep "deep dive"`
- `npm.cmd run build`

Workdir: `presentation-site`

Expected: PASS. `/deep-dive`는 7개 구조 보드를 모두 렌더링하고, 실제 모듈/기술명이 구조적으로 보인다.

- [ ] **Step 5: 커밋한다**

```bash
git add presentation-site/app/deep-dive/page.tsx presentation-site/components/deep-dive presentation-site/components/diagrams presentation-site/content/module-map.ts presentation-site/tests
git commit -m "feat: complete deep dive evidence boards"
```

## Task 6: 접근성, 반응형, 한국어 스윕, 문서화를 마감한다

**Files:**
- Modify: `presentation-site/app/globals.css`
- Modify: `presentation-site/app/layout.tsx`
- Modify: `presentation-site/components/scenes/*.tsx`
- Modify: `presentation-site/components/deep-dive/*.tsx`
- Modify: `presentation-site/tests/e2e/showroom.spec.ts`
- Modify: `presentation-site/tests/e2e/deep-dive.spec.ts`
- Modify: `presentation-site/README.md`
- Delete: `presentation-site/tests/e2e/bootstrap-placeholder.spec.ts`

- [ ] **Step 1: 마감용 반응형/접근성 테스트를 먼저 추가한다**

Playwright 테스트를 다음 수준까지 확장한다.

```ts
test("landing page stays readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: siteContent.copy.ctaPrimary })).toBeVisible();
  const noHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth;
  });
  expect(noHorizontalOverflow).toBe(true);
});

test("deep dive keeps Korean chrome and both axis labels on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/deep-dive");
  await expect(page.getByRole("navigation", { name: "주요 섹션" })).toBeVisible();
  await expect(page.getByText(architectureContent.axes[0].title)).toBeVisible();
  await expect(page.getByText(architectureContent.axes[1].title)).toBeVisible();
});
```

- [ ] **Step 2: 전체 E2E를 실행해 실패 지점을 확인한다**

Run: `npm.cmd run test:e2e`

Workdir: `presentation-site`

Expected: FAIL on one or more layout, motion, or untranslated-copy assertions before final polish.
주의: 이 red step은 Step 1에서 추가한 `showroom.spec.ts` / `deep-dive.spec.ts`가 저장된 상태를 전제로 한다. 여전히 초록이면 placeholder spec만 남아 있거나 신규 spec이 아직 추가되지 않은 것이다.

- [ ] **Step 3: 반응형/모션/문구 스윕과 README 정리를 한다**

완료 조건:

- 모바일에서 가로 스크롤 없음
- `prefers-reduced-motion`에서 핵심 정보가 사라지지 않음
- 메뉴, 버튼, 보조 캡션, footer 문구에 영어 UI 잔여물이 없음
- `README.md`에 수정 포인트가 문서화됨
  - 어디서 메인 카피를 수정하는지
  - 어디서 딥다이브 단계/기술명을 수정하는지
  - 어디서 모듈 지도를 수정하는지
  - 두 축 분리 규칙을 어떻게 유지하는지
- `bootstrap-placeholder.spec.ts` 삭제

- [ ] **Step 4: 최종 검증을 전부 실행한다**

Run:

- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run test:e2e`
- `npm.cmd run build`

Workdir: `presentation-site`

Expected: PASS across lint, unit, E2E, and production build.

- [ ] **Step 5: 커밋한다**

```bash
git add presentation-site/app presentation-site/components presentation-site/tests presentation-site/README.md
git rm presentation-site/tests/e2e/bootstrap-placeholder.spec.ts
git commit -m "feat: polish presentation site uiux upgrade"
```

## Verification Checklist

최종 완료 선언 전 아래를 반드시 확인한다.

- `presentation-site/`에서 `npm.cmd run lint`
- `presentation-site/`에서 `npm.cmd run test`
- `presentation-site/`에서 `npm.cmd run test:e2e`
- `presentation-site/`에서 `npm.cmd run build`

수동 확인 항목:

- 메인 `/`는 텍스트 나열이 아니라 구조와 가치가 먼저 보인다.
- `/deep-dive`는 7개 구조 보드가 순서대로 읽힌다.
- 이벤트 축과 상품 / 공시 지식 축이 시각적으로 끝까지 분리된다.
- `Playwright`, `Gemini`, `FastAPI`, `APScheduler`, `SQLite`, `SQLAlchemy`, `ChromaDB`, `RAG`가 자연스럽게 노출된다.
- 메뉴/CTA/footer/보조 문구에는 영어 UI가 남지 않는다.
- 실제 파일/모듈 지도는 현재 코드베이스 책임 분리와 충돌하지 않는다.
