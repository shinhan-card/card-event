import StickyStageLayout from "@/components/chrome/sticky-stage-layout";
import DualAxisMap from "@/components/diagrams/dual-axis-map";
import { getLandingScene } from "@/components/scenes/landing-scene-content";

const dualEngineScene = getLandingScene("dual-engine");

const flowLabels = ["수집", "추출", "구조화", "Gemini 보강", "RAG 검색", "전달"] as const;

export default function DualEngineScene() {
  return (
    <StickyStageLayout
      id={dualEngineScene.anchorId}
      eyebrow="듀얼 엔진"
      title={dualEngineScene.title}
      summary={dualEngineScene.summary}
    >
      <div className="scene-stack">
        <DualAxisMap />

        <article className="diagram-card">
          <p className="section-shell-eyebrow">처리 시퀀스</p>
          <p>
            이벤트 해석 축과 상품 지식 축은 다른 처리 체인을 타지만, 운영 브리핑과 분석 화면에서
            다시 만나도록 설계되어 있습니다.
          </p>
          <div className="scene-badge-row" style={{ marginTop: "1rem" }}>
            {flowLabels.map((label) => (
              <span className="scene-badge" key={label}>
                {label}
              </span>
            ))}
          </div>
        </article>
      </div>
    </StickyStageLayout>
  );
}
