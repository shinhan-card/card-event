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
      <div className="deep-dive-concept-grid" aria-label="개념 아키텍처 레이어">
        {architectureContent.conceptArchitecture.zones.map((zone, index) => (
          <article className="diagram-card deep-dive-concept-card" key={zone.key}>
            <p className="section-shell-eyebrow">레이어 {String(index + 1).padStart(2, "0")}</p>
            <h3>{zone.title}</h3>
            <p>{zone.summary}</p>
            <div className="diagram-chip-row">
              {zone.technologies.map((technology) => (
                <span className="diagram-chip" key={technology}>
                  {technology}
                </span>
              ))}
            </div>
            {index < architectureContent.conceptArchitecture.zones.length - 1 ? (
              <div className="deep-dive-inline-connector" aria-hidden="true" />
            ) : null}
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
