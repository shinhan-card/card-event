import Link from "next/link";
import SectionShell from "@/components/chrome/section-shell";
import { siteContent } from "@/content/site-content";

export default function DeepDiveCtaScene() {
  return (
    <SectionShell
      eyebrow={siteContent.showroom.deepDiveCta.eyebrow}
      title={siteContent.showroom.deepDiveCta.title}
      summary={siteContent.showroom.deepDiveCta.summary}
      id="deep-dive-cta"
    >
      <div className="scene-stack">
        <p className="scene-intro">{siteContent.showroom.deepDiveCta.supportingCopy}</p>

        <div className="scene-actions">
          <Link
            className="scene-button scene-button-primary"
            href={siteContent.showroom.deepDiveCta.cta.href}
          >
            {siteContent.showroom.deepDiveCta.cta.label}
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
