import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

export default function StageBreakdown() {
  return (
    <SectionShell
      eyebrow={architectureContent.stageBreakdown.eyebrow}
      title={architectureContent.stageBreakdown.title}
      summary={architectureContent.stageBreakdown.summary}
      id="stage-breakdown"
    >
      <div className="deep-dive-stage-grid">
        {architectureContent.stageBreakdown.cards.map((stage, index) => (
          <article className="diagram-card deep-dive-stage-card" key={stage.key}>
            <p className="section-shell-eyebrow">Stage {String(index + 1).padStart(2, "0")}</p>
            <h3>{stage.title}</h3>
            <dl className="deep-dive-stage-metrics">
              <div>
                <dt>What</dt>
                <dd>{stage.what}</dd>
              </div>
              <div>
                <dt>Why</dt>
                <dd>{stage.why}</dd>
              </div>
              <div>
                <dt>Technology</dt>
                <dd>{stage.technology}</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>{stage.next}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
