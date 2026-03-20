import Link from "next/link";
import SectionShell from "@/components/chrome/section-shell";
import SignalNetwork from "@/components/diagrams/signal-network";
import { siteContent } from "@/content/site-content";
import { getLandingScene } from "@/components/scenes/landing-scene-content";

const thesisScene = getLandingScene("thesis");

const heroTechnologies = ["Playwright", "BeautifulSoup", "Gemini", "FastAPI"] as const;

export default function HeroScene() {
  return (
    <SectionShell
      eyebrow={siteContent.hero.eyebrow}
      title={siteContent.hero.title}
      summary={siteContent.hero.summary}
      id={thesisScene.anchorId}
      headingLevel={1}
    >
      <div className="scene-hero">
        <div className="scene-hero-copy">
          <p className="scene-intro">{thesisScene.title}</p>
          <p className="scene-intro">{thesisScene.summary}</p>

          <div className="scene-actions">
            <Link
              className="scene-button scene-button-primary"
              href={siteContent.hero.primaryCta.href}
            >
              {siteContent.hero.primaryCta.label}
            </Link>
            <Link
              className="scene-button scene-button-secondary"
              href={siteContent.hero.secondaryCta.href}
            >
              {siteContent.hero.secondaryCta.label}
            </Link>
          </div>

          <div className="scene-badge-row" aria-label="핵심 기술">
            {heroTechnologies.map((technology) => (
              <span className="scene-badge" key={technology}>
                {technology}
              </span>
            ))}
          </div>
        </div>

        <SignalNetwork />
      </div>
    </SectionShell>
  );
}
