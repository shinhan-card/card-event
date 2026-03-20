import Link from "next/link";
import SectionShell from "@/components/chrome/section-shell";
import { siteContent } from "@/content/site-content";

export default function DeepDiveCtaScene() {
  return (
    <SectionShell
      eyebrow="Deep Dive"
      title="Take the handoff into the architecture view"
      summary="The landing showroom stops here. The deep dive opens the system map, module ownership, and orchestration boundaries in full."
    >
      <div className="scene-stack">
        <p className="scene-intro">
          The next step is the implementation shape behind the presentation:
          modules, routes, ownership, and the system boundaries that keep the
          two intelligence lanes legible.
        </p>

        <div className="scene-actions">
          <Link className="scene-button scene-button-primary" href={siteContent.hero.primaryCta.href}>
            Enter the Deep Dive
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
