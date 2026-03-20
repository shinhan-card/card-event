import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

export default function DualAxisMacro() {
  return (
    <SectionShell
      eyebrow="독립 축"
      title={architectureContent.copy.deepDiveDualAxis}
      summary={`${architectureContent.axes[0].title}와 ${architectureContent.axes[1].title}는 같은 전달면을 바라보지만, 질문과 해석 경로는 독립적으로 설계됩니다.`}
      id="dual-axis-macro"
    >
      <div className="dual-axis-macro-board" aria-label="이중 축 매크로 보드">
        {architectureContent.axes.map((axis, index) => (
          <article className="diagram-card dual-axis-macro-axis" key={axis.key}>
            <p className="section-shell-eyebrow">축 {String(index + 1).padStart(2, "0")}</p>
            <h3>{axis.title}</h3>
            <p className="dual-axis-macro-question">{axis.question}</p>
            <p>{axis.summary}</p>
            <div className="diagram-chip-row">
              {axis.technologyBadges.map((technology) => (
                <span className="diagram-chip" key={technology}>
                  {technology}
                </span>
              ))}
            </div>
          </article>
        ))}

        <article className="diagram-card dual-axis-macro-shared">
          <p className="section-shell-eyebrow">공유 전달면</p>
          <h3>두 축은 하나의 의사결정 표면으로 합류합니다</h3>
          <div className="dual-axis-macro-surface-list">
            {architectureContent.executiveBlueprint.deliverySurface.map((surface) => (
              <span className="diagram-chip diagram-chip--muted" key={surface}>
                {surface}
              </span>
            ))}
          </div>
        </article>
      </div>
    </SectionShell>
  );
}
