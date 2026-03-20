import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

export default function ConceptArchitecture() {
  return (
    <SectionShell
      eyebrow={architectureContent.conceptArchitecture.eyebrow}
      title={architectureContent.conceptArchitecture.title}
      summary={architectureContent.conceptArchitecture.summary}
      id="concept-architecture"
    >
      <div className="deep-dive-concept-grid">
        {architectureContent.conceptArchitecture.zones.map((zone, index) => (
          <article className="diagram-card deep-dive-concept-card" key={zone.key}>
            <p className="section-shell-eyebrow">Zone {String(index + 1).padStart(2, "0")}</p>
            <h3>{zone.title}</h3>
            <p>{zone.summary}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
