import ConceptArchitecture from "@/components/deep-dive/concept-architecture";
import OrchestrationMap from "@/components/deep-dive/orchestration-map";
import DualAxisArchitecture from "@/components/deep-dive/dual-axis-architecture";
import DesignPrinciples from "@/components/deep-dive/design-principles";
import EvolutionRoadmap from "@/components/deep-dive/evolution-roadmap";
import RealModuleMap from "@/components/deep-dive/real-module-map";
import StageBreakdown from "@/components/deep-dive/stage-breakdown";
import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

export default function DeepDivePage() {
  return (
    <>
      <SectionShell
        eyebrow={architectureContent.deepDive.eyebrow}
        title={architectureContent.deepDive.title}
        summary={architectureContent.deepDive.summary}
        id="executive-blueprint"
        headingLevel={1}
      >
        <section className="deep-dive-overview" aria-label="딥다이브 개요 다이어그램">
          <article className="diagram-card deep-dive-overview-card">
            <p className="section-shell-eyebrow">구조 스냅샷</p>
            <h2>증거 입력 {"->"} 처리 레일 {"->"} 공유 전달면</h2>
            <p>{architectureContent.conceptArchitecture.summary}</p>
            <div className="diagram-chip-row">
              <span className="diagram-chip">이벤트 인텔리전스</span>
              <span className="diagram-chip">상품 / 공시 인텔리전스</span>
              <span className="diagram-chip">공유 전달면</span>
            </div>
          </article>

          <article className="diagram-card deep-dive-overview-card">
            <p className="section-shell-eyebrow">핵심 기술</p>
            <h2>Playwright {"->"} BeautifulSoup {"->"} SQLAlchemy {"->"} Gemini {"->"} FastAPI</h2>
            <p>
              Playwright, Gemini, FastAPI, APScheduler, SQLite, SQLAlchemy, BeautifulSoup,
              PDF/HTML extraction, ChromaDB, RAG가 어느 단계에 놓이는지 한 장에서 읽을 수 있게
              배치합니다.
            </p>
            <div className="diagram-chip-row">
              <span className="diagram-chip">Playwright</span>
              <span className="diagram-chip">BeautifulSoup</span>
              <span className="diagram-chip">Gemini</span>
              <span className="diagram-chip">FastAPI</span>
            </div>
          </article>

          <article className="diagram-card deep-dive-overview-card">
            <p className="section-shell-eyebrow">근거 레벨</p>
            <h2>실제 코드와 승인된 축 설계를 분리해서 보여줍니다</h2>
            <p>
              이벤트 축은 현재 워크트리의 구현 근거를 따르고, 상품 / 공시 축은 승인된 발표 구조를
              유지하면서 기술 레이어를 분명하게 표시합니다.
            </p>
            <div className="diagram-chip-row">
              <span className="diagram-chip diagram-chip--muted">실제 코드</span>
              <span className="diagram-chip diagram-chip--muted">승인된 축 설계</span>
            </div>
          </article>
        </section>
      </SectionShell>

      <ConceptArchitecture />
      <StageBreakdown />
      <OrchestrationMap />
      <DualAxisArchitecture />
      <RealModuleMap />
      <DesignPrinciples />
      <EvolutionRoadmap />
    </>
  );
}
