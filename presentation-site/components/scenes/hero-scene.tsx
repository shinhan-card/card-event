import Link from "next/link";
import SectionShell from "@/components/chrome/section-shell";
import SignalNetwork from "@/components/diagrams/signal-network";
import { architectureContent } from "@/content/architecture-content";
import { siteContent } from "@/content/site-content";

export default function HeroScene() {
  return (
    <SectionShell
      eyebrow={siteContent.hero.eyebrow}
      title={siteContent.hero.title}
      summary={siteContent.hero.summary}
      id="overview"
      headingLevel={1}
    >
      <div className="scene-hero">
        <div className="scene-hero-copy">
          <p className="scene-intro">{siteContent.showroom.hero.intro}</p>

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

          <div className="scene-badge-row" aria-label="Intelligence lanes">
            {architectureContent.axes.map((axis) => (
              <span className="scene-badge" key={axis.key}>
                {axis.title}
              </span>
            ))}
          </div>
        </div>

        <SignalNetwork />
      </div>
    </SectionShell>
  );
}
