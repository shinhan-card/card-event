import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";
import { siteContent } from "@/content/site-content";
import { getLandingScene } from "@/components/scenes/landing-scene-content";

const decisionScene = getLandingScene("decision-surfaces");

const decisionTechnologies = [
  architectureContent.axes[0].technologyBadges,
  architectureContent.axes[1].technologyBadges,
  ["FastAPI", "SQLite", "SQLAlchemy"],
] as const;

export default function DecisionSurfaceScene() {
  return (
    <SectionShell
      eyebrow="의사결정 표면"
      title={decisionScene.title}
      summary={decisionScene.summary}
      id={decisionScene.anchorId}
    >
      <div className="orchestration-map">
        {siteContent.decisionSurfaces.map((surface, index) => (
          <article className="diagram-card orchestration-card" key={surface.title}>
            <p className="section-shell-eyebrow">표면 {String(index + 1).padStart(2, "0")}</p>
            <h3>{surface.title}</h3>
            <p>{surface.summary}</p>
            <div className="diagram-chip-row">
              {decisionTechnologies[index].map((technology) => (
                <span
                  className={`diagram-chip${index === 2 ? " diagram-chip--muted" : ""}`}
                  key={technology}
                >
                  {technology}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
