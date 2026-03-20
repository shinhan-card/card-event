import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

export default function DesignPrinciples() {
  return (
    <SectionShell
      eyebrow={architectureContent.principlesSection.eyebrow}
      title={architectureContent.principlesSection.title}
      summary={architectureContent.principlesSection.summary}
      id="principles-evolution"
    >
      <div className="diagram-grid">
        {architectureContent.principlesSection.cards.map((card) => (
          <article className="diagram-card deep-dive-principle-card" key={card.key}>
            <h3>{card.title}</h3>
            <p>{card.summary}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
