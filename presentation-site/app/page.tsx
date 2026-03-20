import Link from "next/link";
import { siteContent } from "@/content/site-content";
import SectionShell from "@/components/chrome/section-shell";
import StickyStageLayout from "@/components/chrome/sticky-stage-layout";

export default function HomePage() {
  return (
    <>
      <SectionShell
        eyebrow={siteContent.hero.eyebrow}
        title={siteContent.hero.title}
        summary={siteContent.hero.summary}
        id="overview"
      >
        <div className="scene-stack">
          <Link href={siteContent.hero.primaryCta.href}>
            {siteContent.hero.primaryCta.label}
          </Link>
          <Link href={siteContent.hero.secondaryCta.href}>
            {siteContent.hero.secondaryCta.label}
          </Link>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Problem"
        title="Why the lanes stay separate"
        summary="Event intelligence and product / disclosure intelligence solve related but different problems, so the presentation keeps them visually distinct."
        id="problem"
      >
        <div className="diagram-card">
          <p className="section-shell-eyebrow">Anchor target</p>
          <p>
            This section exists so the secondary CTA can land on a real problem
            block without interfering with the how-it-works navigation.
          </p>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Landing scenes"
        title="Showroom flow"
        summary="The landing page keeps clear placeholders for each scene in the narrative."
        id="how-it-works"
      >
        <div className="diagram-grid">
          {siteContent.landingScenes.map((scene) => (
            <article className="diagram-card" key={scene.key}>
              <p className="section-shell-eyebrow">{scene.key}</p>
              <h3>{scene.title}</h3>
              <p>{scene.summary}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      <StickyStageLayout
        eyebrow="How It Works"
        title="Shared presentation shell"
        summary="Future scene work can drop into this split text-and-visual pattern without changing the route structure."
      >
        <div className="diagram-card">
          <p className="section-shell-eyebrow">Landing zone</p>
          <p>Reserved for hero visuals, animated diagrams, and storytelling panels.</p>
        </div>
      </StickyStageLayout>
    </>
  );
}
