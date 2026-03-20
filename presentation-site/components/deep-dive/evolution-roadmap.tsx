import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

export default function EvolutionRoadmap() {
  return (
    <SectionShell
      eyebrow={architectureContent.evolutionRoadmap.eyebrow}
      title={architectureContent.evolutionRoadmap.title}
      summary={architectureContent.evolutionRoadmap.summary}
    >
      <div className="diagram-grid">
        {architectureContent.evolutionRoadmap.phases.map((phase) => (
          <article className="diagram-card deep-dive-roadmap-card" key={phase.key}>
            <p className="section-shell-eyebrow">{phase.next}</p>
            <h3>{phase.title}</h3>
            <p>{phase.summary}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
