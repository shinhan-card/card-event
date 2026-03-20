import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

const executiveBlueprint = architectureContent.executiveBlueprint;

const executiveSummary = `${executiveBlueprint.inputLanes.length}개의 입력 레인, ${executiveBlueprint.processingLanes.length}개의 처리 레인, ${executiveBlueprint.deliverySurface.length}개의 전달 표면으로 공개 계약 전체 흐름을 요약합니다.`;

const executiveEyebrow = `입력 ${executiveBlueprint.inputLanes.length} · 처리 ${executiveBlueprint.processingLanes.length} · 전달 ${executiveBlueprint.deliverySurface.length}`;

const blueprintLanes = [
  {
    key: "input",
    label: "입력 레인",
    items: executiveBlueprint.inputLanes,
  },
  {
    key: "processing",
    label: "처리 레인",
    items: executiveBlueprint.processingLanes,
  },
  {
    key: "delivery",
    label: "전달 표면",
    items: executiveBlueprint.deliverySurface,
  },
] as const;

export default function ExecutiveBlueprint() {
  return (
    <SectionShell
      eyebrow={executiveEyebrow}
      title={architectureContent.copy.deepDiveExecutive}
      summary={executiveSummary}
      id="executive-blueprint"
      headingLevel={1}
    >
      <div className="executive-blueprint-board" aria-label="이그제큐티브 블루프린트 보드">
        {blueprintLanes.map((lane) => (
          <article className="diagram-card executive-blueprint-lane" key={lane.key}>
            <p className="section-shell-eyebrow">{lane.label}</p>
            <div className="executive-blueprint-stack">
              {lane.items.map((item, index) => (
                <div className="executive-blueprint-step" key={`${lane.key}-${index}`}>
                  <span className="executive-blueprint-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </article>
        ))}

        <article className="diagram-card executive-blueprint-tech">
          <div>
            <p className="section-shell-eyebrow">기술 배지</p>
            <h2>입력, 처리, 전달을 잇는 공개 계약 기술 스택</h2>
          </div>
          <div className="diagram-chip-row">
            {executiveBlueprint.technologyBadges.map((technology) => (
              <span className="diagram-chip" key={technology}>
                {technology}
              </span>
            ))}
          </div>
        </article>
      </div>
    </SectionShell>
  );
}
