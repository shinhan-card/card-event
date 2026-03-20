import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

const roadmapStageLabel = {
  now: "지금",
  next: "다음",
  later: "이후",
} as const;

export default function PrinciplesEvolutionBoard() {
  return (
    <SectionShell
      eyebrow={`원칙 ${architectureContent.principles.length} · 진화 ${architectureContent.roadmap.length}`}
      title={architectureContent.copy.deepDivePrinciples}
      summary="설계 원칙과 진화 로드맵을 같은 계약 보드에 배치해, 별도 레거시 섹션 없이 현재 판단 기준과 다음 확장 방향을 함께 읽을 수 있게 합니다."
      id="principles-evolution"
    >
      <div className="principles-evolution-layout">
        <div className="principles-evolution-column">
          <article className="diagram-card principles-evolution-intro">
            <p className="section-shell-eyebrow">설계 원칙</p>
            <h3>공개 계약을 읽는 기준</h3>
            <p>
              사용자가 어떤 질문을 던지더라도, 해석 경로와 근거 표현 방식은 이 원칙들에 맞춰
              일관되게 유지됩니다.
            </p>
          </article>

          <div className="diagram-grid">
            {architectureContent.principles.map((principle) => (
              <article className="diagram-card deep-dive-principle-card" key={principle.title}>
                <h3>{principle.title}</h3>
                <p>{principle.caption}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="principles-evolution-column">
          <article className="diagram-card principles-evolution-intro">
            <p className="section-shell-eyebrow">진화 로드맵</p>
            <h3>다음 구현으로 이어지는 순서</h3>
            <p>
              원칙을 유지한 채 어떤 영역을 먼저 고정하고, 어떤 승인 경로를 실제 구현으로 끌어올릴지
              같은 보드 안에서 이어서 보여줍니다.
            </p>
          </article>

          <div className="diagram-grid">
            {architectureContent.roadmap.map((item) => (
              <article className="diagram-card deep-dive-roadmap-card" key={item.title}>
                <p className="section-shell-eyebrow">{roadmapStageLabel[item.stage]}</p>
                <h3>{item.title}</h3>
                <p>{item.caption}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
