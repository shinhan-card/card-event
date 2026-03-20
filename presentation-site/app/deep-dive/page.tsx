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
        id="deep-dive"
        headingLevel={1}
      >
        <div className="diagram-grid">
          <article className="diagram-card">
            <p className="section-shell-eyebrow">Concept map</p>
            <p>{architectureContent.conceptArchitecture.summary}</p>
          </article>
          <article className="diagram-card">
            <p className="section-shell-eyebrow">Stage map</p>
            <p>{architectureContent.stageBreakdown.summary}</p>
          </article>
        </div>
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
