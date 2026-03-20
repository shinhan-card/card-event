import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";
import { siteContent } from "@/content/site-content";
import { getLandingScene } from "@/components/scenes/landing-scene-content";

const tensionScene = getLandingScene("tension");

export default function AxisTensionScene() {
  return (
    <SectionShell
      eyebrow="축 긴장"
      title={tensionScene.title}
      summary={tensionScene.summary}
      id={tensionScene.anchorId}
    >
      <div className="problem-grid">
        {architectureContent.axes.map((axis) => (
          <article className="diagram-card problem-card" key={axis.key}>
            <p className="section-shell-eyebrow">{axis.title}</p>
            <h3>{axis.question}</h3>
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

        <article className="diagram-card problem-card">
          <p className="section-shell-eyebrow">공유 전달면</p>
          <h3>{siteContent.decisionSurfaces[2].title}</h3>
          <p>{siteContent.decisionSurfaces[2].summary}</p>
          <div className="diagram-chip-row">
            {["FastAPI", "SQLite", "SQLAlchemy"].map((technology) => (
              <span className="diagram-chip diagram-chip--muted" key={technology}>
                {technology}
              </span>
            ))}
          </div>
        </article>
      </div>
    </SectionShell>
  );
}
