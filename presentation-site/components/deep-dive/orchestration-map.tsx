import StickyStageLayout from "@/components/chrome/sticky-stage-layout";
import { architectureContent } from "@/content/architecture-content";

export default function OrchestrationMap() {
  return (
    <StickyStageLayout
      eyebrow={architectureContent.orchestrationMap.eyebrow}
      title={architectureContent.orchestrationMap.title}
      summary={architectureContent.orchestrationMap.summary}
    >
      <div className="deep-dive-orchestration-flow" aria-label="오케스트레이션 관계도">
        {architectureContent.orchestrationMap.groups.map((group, index) => (
          <div className="deep-dive-orchestration-column" key={group.key}>
            <article className="diagram-card deep-dive-orchestration-group-card">
              <p className="section-shell-eyebrow">{group.label}</p>
              <h3>{group.title}</h3>
              <p>{group.summary}</p>
            </article>

            <div className="deep-dive-orchestration-items">
              {group.items.map((item) => (
                <article className="diagram-card deep-dive-orchestration-item-card" key={item.key}>
                  <h4>{item.title}</h4>
                  <p>{item.summary}</p>
                  <div className="diagram-chip-row">
                    {item.technologies.map((technology) => (
                      <span className="diagram-chip" key={technology}>
                        {technology}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {index < architectureContent.orchestrationMap.groups.length - 1 ? (
              <div className="deep-dive-orchestration-connector" aria-hidden="true">
                <span />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="deep-dive-principles">
        {architectureContent.designPrinciples.map((principle) => (
          <article className="diagram-card deep-dive-principle-card" key={principle}>
            <p>{principle}</p>
          </article>
        ))}
      </div>
    </StickyStageLayout>
  );
}
