import StickyStageLayout from "@/components/chrome/sticky-stage-layout";
import { architectureContent } from "@/content/architecture-content";

export default function OrchestrationMap() {
  return (
    <StickyStageLayout
      eyebrow={architectureContent.orchestrationMap.eyebrow}
      title={architectureContent.orchestrationMap.title}
      summary={architectureContent.orchestrationMap.summary}
    >
      <div className="deep-dive-orchestration-grid">
        {architectureContent.orchestrationMap.nodes.map((node) => (
          <article className="diagram-card deep-dive-node-card" key={node.key}>
            <p className="section-shell-eyebrow">{node.title}</p>
            <p>{node.summary}</p>
          </article>
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
