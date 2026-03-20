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
            <p className="section-shell-eyebrow">단계 {String(index + 1).padStart(2, "0")}</p>
            <h3>{stage.title}</h3>
            <div className="diagram-chip-row">
              {stage.technology.map((technology) => (
                <span className="diagram-chip" key={technology}>
                  {technology}
                </span>
              ))}
            </div>
            <dl className="deep-dive-stage-metrics">
              <div>
                <dt>무엇을 하나</dt>
                <dd>{stage.what}</dd>
              </div>
              <div>
                <dt>왜 필요한가</dt>
                <dd>{stage.why}</dd>
              </div>
              <div>
                <dt>다음 핸드오프</dt>
                <dd>{stage.next}</dd>
              </div>
            </dl>
            {index < architectureContent.stageBreakdown.cards.length - 1 ? (
              <div className="deep-dive-stage-connector" aria-hidden="true" />
            ) : null}
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
