import StickyStageLayout from "@/components/chrome/sticky-stage-layout";
import { architectureContent } from "@/content/architecture-content";

export default function OrchestrationScene() {
  return (
    <StickyStageLayout
      eyebrow={architectureContent.orchestration.title}
      title="Shared orchestration keeps the lanes honest"
      summary="The runtime coordinates capture, normalization, enrichment, and delivery without collapsing the two intelligence tracks into one blob."
    >
      <div className="orchestration-map">
        {architectureContent.axes.map((axis) => (
          <article className="diagram-card orchestration-card" key={axis.key}>
            <p className="section-shell-eyebrow">{axis.title}</p>
            <p>{axis.question}</p>
          </article>
        ))}

        <article className="diagram-card orchestration-card orchestration-card--shared">
          <p className="section-shell-eyebrow">Shared delivery</p>
          <p>
            Briefing, analytics, and presentation layers receive consistent
            structured output from both lanes.
          </p>
          <ul className="orchestration-principles">
            {architectureContent.designPrinciples.map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ul>
        </article>
      </div>
    </StickyStageLayout>
  );
}
