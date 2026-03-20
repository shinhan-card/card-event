import Link from "next/link";
import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";
import { siteContent } from "@/content/site-content";
import { getLandingScene } from "@/components/scenes/landing-scene-content";

const handoffScene = getLandingScene("deep-dive-handoff");

const deepDiveStops = [
  architectureContent.copy.deepDiveExecutive,
  architectureContent.copy.deepDiveDualAxis,
  architectureContent.copy.deepDiveModules,
] as const;

export default function DeepDiveHandoffScene() {
  return (
    <SectionShell
      eyebrow="딥다이브 핸드오프"
      title={handoffScene.title}
      summary={handoffScene.summary}
      id={handoffScene.anchorId}
    >
      <div className="scene-stack">
        <p className="scene-intro">{siteContent.showroom.deepDiveCta.supportingCopy}</p>

        <div className="diagram-grid">
          {deepDiveStops.map((stop) => (
            <article className="diagram-card" key={stop}>
              <p className="section-shell-eyebrow">딥다이브 보드</p>
              <h3>{stop}</h3>
              <p>랜딩에서 본 구조를 실제 보드 순서와 모듈 근거로 이어서 확인할 수 있습니다.</p>
            </article>
          ))}
        </div>

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
