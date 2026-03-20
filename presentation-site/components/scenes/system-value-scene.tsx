import SectionShell from "@/components/chrome/section-shell";
import { siteContent } from "@/content/site-content";
import { getLandingScene } from "@/components/scenes/landing-scene-content";

const valueScene = getLandingScene("system-value");

const valueBadges = [
  ["운영 브리핑", "발표용 스토리보드"],
  ["추적 가능", "설명 가능"],
  ["랜딩", "딥다이브"],
] as const;

export default function SystemValueScene() {
  return (
    <SectionShell
      eyebrow="시스템 가치"
      title={valueScene.title}
      summary={valueScene.summary}
      id={valueScene.anchorId}
    >
      <div className="outcome-grid">
        {siteContent.valueCards.map((card, index) => (
          <article className="diagram-card outcome-card" key={card.title}>
            <p className="section-shell-eyebrow">가치 {String(index + 1).padStart(2, "0")}</p>
            <p>{card.title}</p>
            <p>{card.summary}</p>
            <div className="diagram-chip-row">
              {valueBadges[index].map((badge) => (
                <span className="diagram-chip diagram-chip--muted" key={badge}>
                  {badge}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
