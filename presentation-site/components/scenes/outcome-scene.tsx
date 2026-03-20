import SectionShell from "@/components/chrome/section-shell";
import { siteContent } from "@/content/site-content";

export default function OutcomeScene() {
  return (
    <SectionShell
      eyebrow={siteContent.showroom.outcomes.eyebrow}
      title={siteContent.showroom.outcomes.title}
      summary={siteContent.showroom.outcomes.summary}
    >
      <div className="outcome-grid">
        {siteContent.showroom.outcomes.cards.map((outcome) => (
          <article className="diagram-card outcome-card" key={outcome.title}>
            <p className="section-shell-eyebrow">{outcome.title}</p>
            <p>{outcome.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
