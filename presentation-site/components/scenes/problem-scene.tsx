import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";
import { siteContent } from "@/content/site-content";

export default function ProblemScene() {
  return (
    <SectionShell
      eyebrow={siteContent.showroom.problem.eyebrow}
      title={siteContent.showroom.problem.title}
      summary={siteContent.showroom.problem.summary}
      id="problem"
    >
      <div className="problem-grid">
        {architectureContent.axes.map((axis, index) => (
          <article className="diagram-card problem-card" key={axis.key}>
            <p className="section-shell-eyebrow">Lane {String(index + 1).padStart(2, "0")}</p>
            <h3>{axis.title}</h3>
            <p>{axis.question}</p>
          </article>
        ))}

        {siteContent.showroom.problem.cards.map((item) => (
          <article className="diagram-card problem-card" key={item.title}>
            <p className="section-shell-eyebrow">{item.title}</p>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
