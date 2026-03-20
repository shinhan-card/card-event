import StickyStageLayout from "@/components/chrome/sticky-stage-layout";
import { architectureContent } from "@/content/architecture-content";
import { siteContent } from "@/content/site-content";

export default function OrchestrationScene() {
  return (
    <StickyStageLayout
      eyebrow={siteContent.showroom.orchestration.eyebrow}
      title={siteContent.showroom.orchestration.title}
      summary={siteContent.showroom.orchestration.summary}
    >
      <div className="orchestration-map">
        {architectureContent.axes.map((axis) => (
          <article className="diagram-card orchestration-card" key={axis.key}>
            <p className="section-shell-eyebrow">{axis.title}</p>
            <p>{axis.question}</p>
          </article>
        ))}

        <article className="diagram-card orchestration-card orchestration-card--shared">
          <p className="section-shell-eyebrow">
            {siteContent.showroom.orchestration.sharedDeliveryLabel}
          </p>
          <p>{siteContent.showroom.orchestration.sharedDeliverySummary}</p>
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
