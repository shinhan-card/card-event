# Card Event Intelligence Architecture Docs Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `presentation-site/`의 최소 placeholder Next.js 앱을 개발자용 단일 아키텍처 문서 콘솔로 교체해, 전체 오케스트레이션, 카드사별 수집 차이, 현재 분석 경로와 목표 구조(OpenClaw 우선 -> Gemini API fallback), 상품·공시/RAG 파이프라인, 실제 파일 구조, 저장/전달 구조를 한 페이지에서 읽을 수 있게 만든다.

**Architecture:** 먼저 `presentation-site/app/architecture/page.tsx`에 임시 문서 콘솔 라우트를 세우고, 그 위에 `content/architecture-doc-content.ts`와 `content/module-map.ts`를 데이터 계약으로 고정한다. 이후 보드 컴포넌트는 두 묶음(core / supporting)으로 병렬 구현하고, 마지막 통합 단계에서 `/`를 문서 콘솔로 승격하고 `/deep-dive`를 동일 문서 별칭으로 정리한다. `현재 구현`과 `목표 구조`는 데이터 필드, 시각 스타일, 관련 파일 표기에서 분리하고, 아직 저장소에 없는 OpenClaw는 `설계 기준`으로만 드러낸다.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, Tailwind base imports, Vitest, React Testing Library, Playwright, npm

---

## Working Notes

- 모든 구현과 검증은 `presentation-site/` 루트에서 실행한다.
- 현재 baseline은 아래 4개 파일만 의미 있는 앱 코드를 가진 최소 상태다.
  - `presentation-site/app/layout.tsx`
  - `presentation-site/app/page.tsx`
  - `presentation-site/app/deep-dive/page.tsx`
  - `presentation-site/app/globals.css`
- 현재 단위 테스트는 `presentation-site/tests/unit/routes-smoke.test.tsx` 1개뿐이고, E2E는 `presentation-site/tests/e2e/bootstrap-placeholder.spec.ts`가 `test.skip` 상태다.
- 실제 구현 사실과 목표 구조를 혼동하지 않는다.
  - 현재 구현: `modules/insights.py` 기준 `Gemini 우선 -> rule fallback`
  - 목표 구조: `OpenClaw 우선 -> Gemini API fallback`
- 목표 구조 설명에서 아직 없는 파일을 실제 파일처럼 적지 않는다.
  - 실제 파일은 `relatedFiles` 또는 `implementedFiles`
  - 목표 구조 연결 지점은 `plannedHooks` 또는 `설계 기준` 설명
- `presentation-site/app/architecture/page.tsx`는 구현 중 검증용 임시 라우트다. 최종 통합 후에도 남겨둘 수 있지만, `/`가 기본 진입점이어야 한다.
- 메뉴, 캡션, 보드 제목, 범례는 한국어로 쓴다. 기술명, 라이브러리명, 파일 경로만 영어를 유지한다.

## File Map

### Existing Files To Modify

- `presentation-site/app/layout.tsx`
  - 한국어 metadata, `lang="ko"`, skip link, 문서 콘솔용 body shell 기준을 넣는다.
- `presentation-site/app/page.tsx`
  - 최종적으로 단일 문서 콘솔 메인 진입점으로 교체한다.
- `presentation-site/app/deep-dive/page.tsx`
  - 최종적으로 동일 문서를 재사용하는 별칭 라우트로 바꾼다.
- `presentation-site/app/globals.css`
  - 앱 전체 토큰, 문서 컨테이너, skip link, 공용 보드 기본 변수를 넣는다.
- `presentation-site/tests/unit/routes-smoke.test.tsx`
  - 기존 영어 placeholder 확인을 한국어 문서 콘솔 smoke test로 교체한다.
- `presentation-site/README.md`
  - 문서 콘솔 구조, 테스트, 유지보수 포인트를 갱신한다.

### Files To Delete

- `presentation-site/tests/e2e/bootstrap-placeholder.spec.ts`
  - skip 상태 placeholder E2E를 제거하고 실제 문서 콘솔 검증으로 대체한다.

### Files To Create

- `presentation-site/app/architecture/page.tsx`
  - 구현 중 검증용 문서 콘솔 라우트
- `presentation-site/content/architecture-doc-content.ts`
  - 메타, 사이드바, 범례, 섹션 순서, 보드 데이터, 기술 배지, 현재/목표 패널을 정의하는 단일 계약
- `presentation-site/content/module-map.ts`
  - 파일 군집, 구현 상태, planned hooks를 분리해서 담는 파일 구조 계약
- `presentation-site/components/docs-console/docs-console-page.tsx`
  - 전체 섹션 조립기. 초기에는 placeholder 섹션 프레임만, 마지막에는 실제 보드 registry를 연결한다.
- `presentation-site/components/docs-console/docs-shell.tsx`
  - 좌측 내비 + 우측 본문 shell
- `presentation-site/components/docs-console/docs-sidebar.tsx`
  - 목차, 현재 위치 표시, 섹션 링크
- `presentation-site/components/docs-console/docs-shell.module.css`
  - shell 전용 grid / sticky / responsive CSS
- `presentation-site/components/docs-console/boards/board.module.css`
  - 모든 보드가 공유하는 패널, 노드, 라인, 범례, badge 스타일
- `presentation-site/components/docs-console/boards/overview-header.tsx`
  - 문서 상단 개요와 범례 보드
- `presentation-site/components/docs-console/boards/overall-orchestration.tsx`
  - 전체 오케스트레이션 구조도
- `presentation-site/components/docs-console/boards/event-pipeline.tsx`
  - 카드사별 connector lane과 공통 ingest/extract/normalize 흐름
- `presentation-site/components/docs-console/boards/analysis-compare.tsx`
  - 현재 분석 경로 vs 목표 구조 비교 보드
- `presentation-site/components/docs-console/boards/product-rag.tsx`
  - 상품·공시 수집/적재/청킹/임베딩/RAG 보드
- `presentation-site/components/docs-console/boards/file-structure.tsx`
  - 실제 파일 군집과 책임 지도를 보여주는 보드
- `presentation-site/components/docs-console/boards/storage-delivery.tsx`
  - 저장, 브리핑, 전달면 구조 보드
- `presentation-site/components/docs-console/boards/extensions-legend.tsx`
  - 확장 포인트와 범례 보드
- `presentation-site/tests/unit/content-contract.test.ts`
  - 콘텐츠 계약과 module map 계약 검증
- `presentation-site/tests/unit/docs-shell.test.tsx`
  - shell / 사이드바 / placeholder 섹션 골격 검증
- `presentation-site/tests/unit/core-boards.test.tsx`
  - overview / orchestration / event / analysis 보드 렌더 검증
- `presentation-site/tests/unit/supporting-boards.test.tsx`
  - product-rag / file-structure / storage-delivery / extensions 보드 렌더 검증
- `presentation-site/tests/e2e/architecture-docs.spec.ts`
  - 실사용 뷰포트, hash navigation, 별칭 라우트, 오버플로 방지 E2E

## Suggested Task Ownership

- `Mill`: Task 1
- `Bacon`: Task 2
- `Dirac`: Task 3
- `Gibbs`: Task 4
- `Darwin`: Task 5

### Dependency Order

1. Task 1 완료
2. Task 2 완료
3. Task 3 + Task 4 병렬 실행
4. Task 5 통합 및 검증

Task 3과 Task 4는 서로 다른 보드 파일과 서로 다른 테스트 파일만 만진다. `presentation-site/components/docs-console/docs-console-page.tsx`, `presentation-site/app/page.tsx`, `presentation-site/app/deep-dive/page.tsx`, E2E 스펙 교체는 모두 Task 5로 모아 merge 충돌을 피한다.

### Task 1: Freeze the Content Contract and File Map

**Owner:** `Mill`

**Files:**
- Create: `presentation-site/content/architecture-doc-content.ts`
- Create: `presentation-site/content/module-map.ts`
- Create: `presentation-site/tests/unit/content-contract.test.ts`
- Test: `presentation-site/tests/unit/content-contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

Create `presentation-site/tests/unit/content-contract.test.ts` with assertions that lock the approved document order, technology badges, and current-vs-target separation.

```ts
import { architectureDocContent } from "@/content/architecture-doc-content";
import { moduleMapGroups } from "@/content/module-map";

describe("architecture docs content contract", () => {
  it("defines the approved section order and technology badges", () => {
    expect(architectureDocContent.sections.map((section) => section.id)).toEqual([
      "overview",
      "overall-orchestration",
      "event-pipeline",
      "analysis-compare",
      "product-rag",
      "file-structure",
      "storage-delivery",
      "extensions",
    ]);

    expect(
      architectureDocContent.sections.find((section) => section.id === "event-pipeline")
        ?.technologyBadges,
    ).toEqual(expect.arrayContaining(["Playwright", "BeautifulSoup", "FastAPI"]));

    expect(
      architectureDocContent.sections.find((section) => section.id === "analysis-compare")
        ?.panels,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "current", title: "현재 구현" }),
        expect.objectContaining({ status: "target", title: "목표 구조" }),
      ]),
    );
  });

  it("keeps implemented files and planned hooks separate", () => {
    expect(
      moduleMapGroups.find((group) => group.id === "event-collection")?.implementedFiles,
    ).toEqual(
      expect.arrayContaining([
        "modules/connectors/shinhan.py",
        "modules/connectors/hyundai.py",
        "modules/connectors/kb.py",
        "modules/connectors/samsung.py",
      ]),
    );

    expect(
      moduleMapGroups.find((group) => group.id === "target-analysis")?.plannedHooks,
    ).toEqual(expect.arrayContaining(["modules/insights.py", "modules/pipeline.py"]));

    expect(
      moduleMapGroups.find((group) => group.id === "product-rag-target")?.plannedHooks,
    ).toEqual(
      expect.arrayContaining([
        "routers/disclosures.py",
        "routers/rag.py",
        "modules/rag/collector.py",
        "modules/rag/catalog_summary.py",
        "modules/rag/chunker.py",
        "modules/rag/embedder.py",
        "modules/rag/product_scraper.py",
      ]),
    );

    expect(
      moduleMapGroups.find((group) => group.id === "analytics-target")?.plannedHooks,
    ).toEqual(
      expect.arrayContaining(["modules/analytics_service.py", "routers/analytics.py"]),
    );
  });
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `npm.cmd run test -- tests/unit/content-contract.test.ts`

Expected: FAIL because neither the content contract nor the module map exists yet.

- [ ] **Step 3: Create the minimal typed content contract**

Create `presentation-site/content/architecture-doc-content.ts` with explicit types and a skeleton object that other tasks can extend without changing the contract shape.

```ts
export type SectionPanelStatus = "current" | "target" | "implemented" | "planned";

export type DocsSection = {
  id: string;
  title: string;
  summary: string;
  board: string;
  technologyBadges: string[];
  relatedFiles: string[];
  plannedHooks?: string[];
  panels?: Array<{
    status: SectionPanelStatus;
    title: string;
    bullets: string[];
    note?: string;
  }>;
};

export const architectureDocContent = {
  meta: {
    title: "카드 이벤트 인텔리전스 아키텍처 문서",
    summary: "실제 구현과 목표 구조를 함께 읽는 개발자용 단일 문서",
    snapshotDate: "2026-03-21",
  },
  legend: [],
  sidebar: [],
  sections: [],
} satisfies {
  meta: { title: string; summary: string; snapshotDate: string };
  legend: Array<{ key: string; label: string; tone: string }>;
  sidebar: Array<{ href: string; label: string }>;
  sections: DocsSection[];
};
```

- [ ] **Step 4: Fill the contract with approved content**

Populate `architectureDocContent` with:

- `overview`와 `extensions`를 포함한 8개 섹션
- 기술 배지
  - event: `Playwright`, `BeautifulSoup`, `FastAPI`
  - analysis: `Gemini`, `OpenClaw`, `rule fallback`
  - product-rag: `BeautifulSoup`, `PDF/HTML extraction`, `ChromaDB`, `RAG`
- `analysis-compare`의 두 패널
  - `현재 구현`: `Gemini 우선`, `rule fallback`
  - `목표 구조`: `OpenClaw 1차 분석`, `Gemini API fallback`, `설계 기준`
- `product-rag`와 `storage-delivery` 섹션에 `plannedHooks` 필드 추가
  - `product-rag`: `routers/disclosures.py`, `routers/rag.py`, `modules/rag/collector.py`, `modules/rag/catalog_summary.py`, `modules/rag/chunker.py`, `modules/rag/embedder.py`, `modules/rag/product_scraper.py`
  - `storage-delivery`: `modules/analytics_service.py`, `routers/analytics.py`
- `event-pipeline`의 connector-specific lane
  - `신한 JSON 우선`
  - `현대 DOM/API 병행`
  - `KB POST pagination`
  - `삼성 상세 페이지 직접 조회`

Create `presentation-site/content/module-map.ts` with file clusters and explicit separation:

```ts
export const moduleMapGroups = [
  {
    id: "event-collection",
    title: "이벤트 수집 계층",
    status: "implemented",
    implementedFiles: [
      "modules/connectors/base.py",
      "modules/connectors/shinhan.py",
      "modules/connectors/hyundai.py",
      "modules/connectors/kb.py",
      "modules/connectors/samsung.py",
      "modules/pipeline.py",
    ],
    plannedHooks: [],
  },
  {
    id: "target-analysis",
    title: "목표 분석 확장",
    status: "planned",
    implementedFiles: [],
    plannedHooks: ["modules/insights.py", "modules/pipeline.py"],
    note: "OpenClaw 파일은 아직 저장소에 없고, 위 hook 위치가 설계 기준이다.",
  },
  {
    id: "product-rag-target",
    title: "상품·공시 / RAG 목표 축",
    status: "planned",
    implementedFiles: [],
    plannedHooks: [
      "routers/disclosures.py",
      "routers/rag.py",
      "modules/rag/collector.py",
      "modules/rag/catalog_summary.py",
      "modules/rag/chunker.py",
      "modules/rag/embedder.py",
      "modules/rag/product_scraper.py",
    ],
    note: "현재 저장소에는 modules/rag 구현이 없고, 위 경로는 설계 기준이다.",
  },
  {
    id: "analytics-target",
    title: "분석 활용면 목표 축",
    status: "planned",
    implementedFiles: [],
    plannedHooks: ["modules/analytics_service.py", "routers/analytics.py"],
    note: "분석 서비스와 analytics 라우터는 아직 저장소에 없고, 설계 기준으로만 표시한다.",
  },
];
```

- [ ] **Step 5: Run the contract test to verify it passes**

Run: `npm.cmd run test -- tests/unit/content-contract.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add presentation-site/content/architecture-doc-content.ts presentation-site/content/module-map.ts presentation-site/tests/unit/content-contract.test.ts
git commit -m "feat: add architecture docs content contract"
```

### Task 2: Build the Docs Shell and Temporary Route Skeleton

**Owner:** `Bacon`

**Files:**
- Create: `presentation-site/app/architecture/page.tsx`
- Create: `presentation-site/components/docs-console/docs-console-page.tsx`
- Create: `presentation-site/components/docs-console/docs-shell.tsx`
- Create: `presentation-site/components/docs-console/docs-sidebar.tsx`
- Create: `presentation-site/components/docs-console/docs-shell.module.css`
- Create: `presentation-site/components/docs-console/boards/board.module.css`
- Create: `presentation-site/tests/unit/docs-shell.test.tsx`
- Modify: `presentation-site/app/layout.tsx`
- Modify: `presentation-site/app/globals.css`
- Test: `presentation-site/tests/unit/docs-shell.test.tsx`

- [ ] **Step 1: Write the failing shell test**

Create `presentation-site/tests/unit/docs-shell.test.tsx` that verifies the shell and placeholder section skeleton render from the Task 1 contract.

```ts
import { render, screen } from "@testing-library/react";
import ArchitecturePage from "@/app/architecture/page";

describe("docs shell", () => {
  it("renders the sidebar and section anchors in Korean", () => {
    render(<ArchitecturePage />);

    expect(screen.getByRole("navigation", { name: "문서 목차" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "목차 열기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "이벤트 파이프라인" })).toHaveAttribute(
      "href",
      "#event-pipeline",
    );
    expect(document.getElementById("overview")).toBeInTheDocument();
    expect(document.getElementById("extensions")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `npm.cmd run test -- tests/unit/docs-shell.test.tsx`

Expected: FAIL because the temporary route and shell do not exist.

- [ ] **Step 3: Create the shared shell and placeholder page assembler**

Create `presentation-site/components/docs-console/docs-shell.tsx` and a client-side `presentation-site/components/docs-console/docs-sidebar.tsx`.

```tsx
export function DocsShell({
  sidebar,
  children,
}: {
  sidebar: Array<{ href: string; label: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <DocsSidebar items={sidebar} />
      <main id="main-content" className={styles.content}>
        {children}
      </main>
    </div>
  );
}
```

`docs-sidebar.tsx` should be a client component with a toggle button and responsive modes:

```tsx
"use client";

export default function DocsSidebar({ items }: { items: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={styles.sidebarShell}>
      <button
        type="button"
        className={styles.sidebarToggle}
        aria-expanded={open}
        aria-controls="docs-toc"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "목차 닫기" : "목차 열기"}
      </button>
      <nav id="docs-toc" aria-label="문서 목차" data-open={open}>
        ...
      </nav>
    </aside>
  );
}
```

Create `presentation-site/components/docs-console/docs-console-page.tsx` with placeholder section frames that only use the content contract for now.

```tsx
export default function DocsConsolePage() {
  return (
    <DocsShell sidebar={architectureDocContent.sidebar}>
      {architectureDocContent.sections.map((section) => (
        <section key={section.id} id={section.id} data-section={section.id}>
          <header>
            <p>{section.summary}</p>
            <h2>{section.title}</h2>
          </header>
        </section>
      ))}
    </DocsShell>
  );
}
```

- [ ] **Step 4: Add the temporary route and app-wide document tokens**

Create `presentation-site/app/architecture/page.tsx`:

```tsx
import DocsConsolePage from "@/components/docs-console/docs-console-page";

export default function ArchitecturePage() {
  return <DocsConsolePage />;
}
```

Update `presentation-site/app/layout.tsx`:

- `title`, `description`를 한국어로 교체
- `<html lang="ko">`
- skip link 추가

Update `presentation-site/app/globals.css`:

- `:root`에 문서 콘솔 색상 변수 추가
- `.skip-link`, `.docs-page`, `.docs-section`, `.docs-muted` 같은 공용 클래스 추가

- [ ] **Step 5: Implement the shell layout and shared board primitives**

In `presentation-site/components/docs-console/docs-shell.module.css`, define the document layout:

```css
.shell {
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr);
  gap: 24px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}

.sidebar {
  position: sticky;
  top: 24px;
  align-self: start;
}

.content {
  min-width: 0;
}

@media (max-width: 1080px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .sidebarToggle {
    display: inline-flex;
  }

  .sidebar nav[data-open="false"] {
    display: none;
  }
}

@media (max-width: 768px) {
  .sidebar nav[data-open="true"] {
    position: fixed;
    inset: 0 0 auto 0;
    max-height: 70vh;
    overflow: auto;
  }
}
```

In `presentation-site/components/docs-console/boards/board.module.css`, add only shared primitives that both board task groups can consume without further edits:

```css
.board { border: 1px solid rgba(126, 224, 255, 0.14); border-radius: 20px; }
.boardHeader { display: grid; gap: 8px; }
.badgeRow { display: flex; flex-wrap: wrap; gap: 8px; }
.statusCurrent { border-style: solid; }
.statusTarget { border-style: dashed; }
.flowGrid { display: grid; gap: 16px; }
```

- [ ] **Step 6: Run the shell test to verify it passes**

Run: `npm.cmd run test -- tests/unit/docs-shell.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add presentation-site/app/architecture/page.tsx presentation-site/components/docs-console/docs-console-page.tsx presentation-site/components/docs-console/docs-shell.tsx presentation-site/components/docs-console/docs-sidebar.tsx presentation-site/components/docs-console/docs-shell.module.css presentation-site/components/docs-console/boards/board.module.css presentation-site/app/layout.tsx presentation-site/app/globals.css presentation-site/tests/unit/docs-shell.test.tsx
git commit -m "feat: add docs console shell and temporary route"
```

### Task 3: Implement the Core Boards

**Owner:** `Dirac`

**Files:**
- Create: `presentation-site/components/docs-console/boards/overview-header.tsx`
- Create: `presentation-site/components/docs-console/boards/overall-orchestration.tsx`
- Create: `presentation-site/components/docs-console/boards/event-pipeline.tsx`
- Create: `presentation-site/components/docs-console/boards/analysis-compare.tsx`
- Create: `presentation-site/tests/unit/core-boards.test.tsx`
- Test: `presentation-site/tests/unit/core-boards.test.tsx`

- [ ] **Step 1: Write the failing core-board test**

Create `presentation-site/tests/unit/core-boards.test.tsx` and render the board components directly.

```ts
import { render, screen } from "@testing-library/react";
import OverviewHeader from "@/components/docs-console/boards/overview-header";
import EventPipelineBoard from "@/components/docs-console/boards/event-pipeline";
import AnalysisCompareBoard from "@/components/docs-console/boards/analysis-compare";

describe("core boards", () => {
  it("renders connector-specific event lanes and the current-vs-target analysis split", () => {
    render(
      <>
        <OverviewHeader />
        <EventPipelineBoard />
        <AnalysisCompareBoard />
      </>,
    );

    expect(screen.getByText("신한 JSON 우선")).toBeInTheDocument();
    expect(screen.getByText("현대 DOM/API 병행")).toBeInTheDocument();
    expect(screen.getByText("KB POST pagination")).toBeInTheDocument();
    expect(screen.getByText("삼성 상세 페이지 직접 조회")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "현재 구현" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "목표 구조" })).toBeInTheDocument();
    expect(screen.getByText("OpenClaw 1차 분석")).toBeInTheDocument();
    expect(screen.getByText("Gemini API fallback")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the core-board test to verify it fails**

Run: `npm.cmd run test -- tests/unit/core-boards.test.tsx`

Expected: FAIL because the board components do not exist yet.

- [ ] **Step 3: Implement the overview and orchestration boards**

Create `overview-header.tsx` and `overall-orchestration.tsx` so they render from `architectureDocContent`, not hardcoded prose blocks.

`overview-header.tsx` should include:

- 문서 제목
- snapshot date
- 범례 chips (`현재 구현`, `목표 구조`, `구현됨`, `설계 기준`)

`overall-orchestration.tsx` should include one board with:

- 좌측 입력 소스
- 중앙 처리 레일
- 우측 활용 화면
- 상단 제어 계층
- 하단 저장/전달 계층

Keep connector lines inside the component via CSS grid or inline SVG only within the board bounds.

- [ ] **Step 4: Implement the event pipeline and analysis compare boards**

Create `event-pipeline.tsx` and `analysis-compare.tsx`, both reading from `architectureDocContent`.

The event board must explicitly show:

- 4 connector lanes
- merge into a shared `RawEvent` / 공통 ingest node
- extraction / normalization / insight / briefing sequence
- technology badges for `Playwright`, `BeautifulSoup`, `FastAPI`

The analysis board must show two separate panels:

```tsx
<article data-status="current">
  <h3>현재 구현</h3>
  <ul>
    <li>generate_hybrid_insight</li>
    <li>Gemini 우선</li>
    <li>rule fallback</li>
  </ul>
</article>
<article data-status="target">
  <h3>목표 구조</h3>
  <ul>
    <li>OpenClaw 1차 분석</li>
    <li>Gemini API fallback</li>
    <li>설계 기준</li>
  </ul>
</article>
```

- [ ] **Step 5: Run the core-board test to verify it passes**

Run: `npm.cmd run test -- tests/unit/core-boards.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add presentation-site/components/docs-console/boards/overview-header.tsx presentation-site/components/docs-console/boards/overall-orchestration.tsx presentation-site/components/docs-console/boards/event-pipeline.tsx presentation-site/components/docs-console/boards/analysis-compare.tsx presentation-site/tests/unit/core-boards.test.tsx
git commit -m "feat: add architecture docs core boards"
```

### Task 4: Implement the Supporting Boards

**Owner:** `Gibbs`

**Files:**
- Create: `presentation-site/components/docs-console/boards/product-rag.tsx`
- Create: `presentation-site/components/docs-console/boards/file-structure.tsx`
- Create: `presentation-site/components/docs-console/boards/storage-delivery.tsx`
- Create: `presentation-site/components/docs-console/boards/extensions-legend.tsx`
- Create: `presentation-site/tests/unit/supporting-boards.test.tsx`
- Test: `presentation-site/tests/unit/supporting-boards.test.tsx`

- [ ] **Step 1: Write the failing supporting-board test**

Create `presentation-site/tests/unit/supporting-boards.test.tsx` and render the supporting boards directly.

```ts
import { render, screen } from "@testing-library/react";
import ProductRagBoard from "@/components/docs-console/boards/product-rag";
import FileStructureBoard from "@/components/docs-console/boards/file-structure";
import StorageDeliveryBoard from "@/components/docs-console/boards/storage-delivery";
import ExtensionsLegendBoard from "@/components/docs-console/boards/extensions-legend";

describe("supporting boards", () => {
  it("renders the product pipeline, file map, storage flow, and extension legend", () => {
    render(
      <>
        <ProductRagBoard />
        <FileStructureBoard />
        <StorageDeliveryBoard />
        <ExtensionsLegendBoard />
      </>,
    );

    expect(screen.getByText("원문 적재")).toBeInTheDocument();
    expect(screen.getByText("청킹")).toBeInTheDocument();
    expect(screen.getByText("임베딩")).toBeInTheDocument();
    expect(screen.getByText("RAG 응답")).toBeInTheDocument();
    expect(screen.getByText("modules/connectors/shinhan.py")).toBeInTheDocument();
    expect(screen.getByText("routers/disclosures.py")).toBeInTheDocument();
    expect(screen.getByText("routers/rag.py")).toBeInTheDocument();
    expect(screen.getByText("modules/rag/catalog_summary.py")).toBeInTheDocument();
    expect(screen.getByText("modules/analytics_service.py")).toBeInTheDocument();
    expect(screen.getByText("routers/analytics.py")).toBeInTheDocument();
    expect(screen.getByText("database.py")).toBeInTheDocument();
    expect(screen.getByText("확장 포인트")).toBeInTheDocument();
    expect(screen.getAllByText("설계 기준").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the supporting-board test to verify it fails**

Run: `npm.cmd run test -- tests/unit/supporting-boards.test.tsx`

Expected: FAIL because the supporting board components do not exist yet.

- [ ] **Step 3: Implement the product-rag board**

Create `product-rag.tsx` so it renders the approved sequence and labels from `architectureDocContent`:

- 상품/공시 소스 수집
- 원문 적재
- 문서 정제
- 청킹
- 임베딩
- 벡터 저장
- 검색
- RAG 응답
- 활용 화면 연결

The board should visually separate:

- 현재 구현 근거 (`modules/product_links.py`)
- 목표 구조 설명 (`설계 기준`)
- planned hook 목록 (`routers/disclosures.py`, `routers/rag.py`, `modules/rag/*`, `modules/rag/catalog_summary.py`)

- [ ] **Step 4: Implement the file-structure and storage-delivery boards**

Create `file-structure.tsx` from `moduleMapGroups`.

It must show grouped clusters with:

- 군집 제목
- 구현 상태
- `implementedFiles`
- `plannedHooks`
- `설계 기준` 상태 chip

Create `storage-delivery.tsx` to show:

- `database.py`
- `modules/briefing.py`
- 브리핑 생성
- 전달면
- dashboard / 발표 자료 / 운영 검토
- planned analytics hook (`modules/analytics_service.py`, `routers/analytics.py`)

- [ ] **Step 5: Implement the extensions and legend board**

Create `extensions-legend.tsx` that combines:

- 확장 포인트 목록
  - 카드사 추가
  - OpenClaw 연결
  - RAG 고도화
- 범례 chips
  - 현재 구현
  - 목표 구조
  - 구현됨
  - 설계 기준

- [ ] **Step 6: Run the supporting-board test to verify it passes**

Run: `npm.cmd run test -- tests/unit/supporting-boards.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add presentation-site/components/docs-console/boards/product-rag.tsx presentation-site/components/docs-console/boards/file-structure.tsx presentation-site/components/docs-console/boards/storage-delivery.tsx presentation-site/components/docs-console/boards/extensions-legend.tsx presentation-site/tests/unit/supporting-boards.test.tsx
git commit -m "feat: add architecture docs supporting boards"
```

### Task 5: Integrate the Boards, Promote `/`, and Replace Placeholder E2E

**Owner:** `Darwin`

**Files:**
- Modify: `presentation-site/components/docs-console/docs-console-page.tsx`
- Modify: `presentation-site/app/page.tsx`
- Modify: `presentation-site/app/deep-dive/page.tsx`
- Modify: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Modify: `presentation-site/README.md`
- Delete: `presentation-site/tests/e2e/bootstrap-placeholder.spec.ts`
- Create: `presentation-site/tests/e2e/architecture-docs.spec.ts`
- Test: `presentation-site/tests/unit/routes-smoke.test.tsx`
- Test: `presentation-site/tests/e2e/architecture-docs.spec.ts`

- [ ] **Step 1: Write the failing integration and E2E tests**

Update `presentation-site/tests/unit/routes-smoke.test.tsx` so it checks the final developer-facing routes instead of the English placeholder copy.

```ts
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";

describe("route smoke", () => {
  it("renders the architecture docs console on the home route", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "카드 이벤트 인텔리전스 아키텍처 문서" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "문서 목차" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-section]").length).toBe(8);
  });

  it("renders the same docs console on the deep-dive alias route", () => {
    render(<DeepDivePage />);
    expect(screen.getByText("전체 오케스트레이션")).toBeInTheDocument();
  });
});
```

Create `presentation-site/tests/e2e/architecture-docs.spec.ts` with concrete viewport and anchor assertions.

```ts
import { expect, test } from "@playwright/test";

test("desktop hash navigation lands on the analysis board", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1280 });
  await page.goto("/");
  await page.getByRole("link", { name: "분석 계층 비교" }).click();
  await expect(page).toHaveURL(/#analysis-compare$/);

  const box = await page.locator("#analysis-compare").boundingBox();
  expect(box?.y ?? 9999).toBeLessThan(220);
});

test("tablet layout stacks the navigation above the document body without overlap", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.goto("/");

  await page.getByRole("button", { name: "목차 열기" }).click();
  const navBox = await page.getByRole("navigation", { name: "문서 목차" }).boundingBox();
  const firstBoardBox = await page.locator("#overview").boundingBox();

  expect((navBox?.bottom ?? 0) <= (firstBoardBox?.top ?? 0)).toBeTruthy();
  await page.getByRole("button", { name: "목차 닫기" }).click();
});

test("mobile layout avoids horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "목차 열기" }).click();
  await expect(page.getByRole("navigation", { name: "문서 목차" })).toBeVisible();
  await page.getByRole("button", { name: "목차 닫기" }).click();

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
});
```

Add at least these additional checks in the same spec:

- tablet `1024x1366`: `목차 열기` 버튼으로 접이식 내비를 열고 닫을 수 있음
- mobile `390x844`: drawer형 목차를 열고 닫은 뒤 `document.documentElement.scrollWidth <= window.innerWidth + 1`
- `/deep-dive`: same 문서 heading visible

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm.cmd run test -- tests/unit/routes-smoke.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/architecture-docs.spec.ts`

Expected:

- unit test FAIL because `/` and `/deep-dive` still point at the placeholder pages
- E2E FAIL because the real docs console is not wired to `/` yet

- [ ] **Step 3: Integrate the final board registry into `docs-console-page.tsx`**

Replace the placeholder section frames with a board registry keyed by `section.id`.

```tsx
const boardRegistry = {
  overview: OverviewHeader,
  "overall-orchestration": OverallOrchestrationBoard,
  "event-pipeline": EventPipelineBoard,
  "analysis-compare": AnalysisCompareBoard,
  "product-rag": ProductRagBoard,
  "file-structure": FileStructureBoard,
  "storage-delivery": StorageDeliveryBoard,
  extensions: ExtensionsLegendBoard,
} satisfies Record<string, React.ComponentType>;
```

Each section should render:

- section header
- technology badges
- board component
- actual related files
- planned hook note when present

- [ ] **Step 4: Promote the architecture docs console to `/` and alias `/deep-dive`**

Update `presentation-site/app/page.tsx`:

```tsx
import DocsConsolePage from "@/components/docs-console/docs-console-page";

export default function HomePage() {
  return <DocsConsolePage />;
}
```

Update `presentation-site/app/deep-dive/page.tsx` to reuse the same page instead of keeping a separate placeholder.

```tsx
export { default } from "../page";
```

Keep `presentation-site/app/architecture/page.tsx` as a stable preview / alias route that also renders the same component.

- [ ] **Step 5: Replace the placeholder E2E and refresh README**

Delete `presentation-site/tests/e2e/bootstrap-placeholder.spec.ts`.

Create `presentation-site/tests/e2e/architecture-docs.spec.ts` with the assertions from Step 1, including:

- desktop hash navigation
- tablet foldable TOC interaction
- mobile no horizontal overflow
- mobile drawer TOC interaction
- `/deep-dive` alias rendering

Update `presentation-site/README.md` to describe:

- 단일 문서 콘솔 구조
- 임시 `/architecture` alias
- 콘텐츠 계약 파일
- board 컴포넌트 위치
- unit / e2e test commands

- [ ] **Step 6: Run focused tests to verify integration passes**

Run: `npm.cmd run test -- tests/unit/routes-smoke.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/architecture-docs.spec.ts`

Expected: PASS

- [ ] **Step 7: Run the full verification suite**

Run: `npm.cmd run lint`

Run: `npm.cmd run test`

Run: `npm.cmd run test:e2e`

Run: `npm.cmd run build`

Expected:

- lint PASS
- vitest PASS
- Playwright PASS
- next build PASS

- [ ] **Step 8: Commit**

```bash
git add presentation-site/components/docs-console/docs-console-page.tsx presentation-site/app/page.tsx presentation-site/app/deep-dive/page.tsx presentation-site/tests/unit/routes-smoke.test.tsx presentation-site/tests/e2e/architecture-docs.spec.ts presentation-site/README.md
git rm presentation-site/tests/e2e/bootstrap-placeholder.spec.ts
git commit -m "feat: launch architecture docs console"
```

## Verification Checklist

- `presentation-site/tests/unit/content-contract.test.ts` proves the content contract includes all 8 sections, technology badges, and current-vs-target separation.
- `presentation-site/tests/unit/docs-shell.test.tsx` proves the Korean sidebar and section anchors exist on the temporary route.
- `presentation-site/tests/unit/core-boards.test.tsx` proves connector-specific event lanes and analysis split render correctly.
- `presentation-site/tests/unit/supporting-boards.test.tsx` proves product/RAG, file map, storage flow, and extensions boards render.
- `presentation-site/tests/unit/routes-smoke.test.tsx` proves `/` and `/deep-dive` expose the same document console.
- `presentation-site/tests/e2e/architecture-docs.spec.ts` proves:
  - desktop hash navigation lands on the right board
  - tablet layout stays readable
  - mobile layout avoids horizontal overflow
  - `/deep-dive` works as an alias
- `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run test:e2e`, `npm.cmd run build` all pass from `presentation-site/`.

## Success Criteria

- `/` becomes the primary single-page architecture document.
- `/deep-dive` no longer diverges from the main page.
- 문서가 카드형 쇼케이스가 아니라 좌측 목차 + 우측 보드형 문서 도구 구조로 읽힌다.
- 이벤트 수집 보드에 카드사별 connector 차이가 명시된다.
- 분석 비교 보드에 `현재 구현`과 `목표 구조(OpenClaw 우선 -> Gemini API fallback)`가 혼동 없이 분리된다.
- 파일 구조도와 저장/전달 구조도가 실제 코드 탐색에 도움이 되는 수준으로 구체적이다.
- placeholder E2E가 제거되고 실제 아키텍처 문서 검증으로 대체된다.
