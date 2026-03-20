import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

export default function OrchestrationControlBoard() {
  const columns = architectureContent.orchestrationColumns;
  const surfacedTechnologies = Array.from(
    new Set(columns.flatMap((column) => column.technologies)),
  );

  return (
    <SectionShell
      eyebrow={`공개 계약 ${columns.length}열`}
      title={architectureContent.copy.deepDiveOrchestration}
      summary={`${columns[0].title}부터 ${columns.at(-1)?.title}까지, 계약에 포함된 노드와 기술 배지를 그대로 연결해 제어 흐름을 펼칩니다.`}
      id="orchestration-control"
    >
      <div className="diagram-card orchestration-control-summary">
        <p>
          각 제어 열의 노드와 기술 배지는 모두 공개 계약 데이터에서 바로 읽어 오며, 같은 순서로
          아래 제어 보드에 다시 배치됩니다.
        </p>
        <div className="diagram-chip-row">
          {surfacedTechnologies.map((technology) => (
            <span className="diagram-chip" key={technology}>
              {technology}
            </span>
          ))}
        </div>
      </div>

      <div className="deep-dive-orchestration-flow" aria-label="오케스트레이션 제어 보드">
        {columns.map((column, index) => (
          <div className="deep-dive-orchestration-column" key={column.title}>
            <article className="diagram-card deep-dive-orchestration-group-card">
              <p className="section-shell-eyebrow">{`제어 열 0${index + 1}`}</p>
              <h3>{column.title}</h3>
              <p>{`${column.nodes.length}개 노드가 같은 열 안에서 순차적으로 연결됩니다.`}</p>
              <div className="diagram-chip-row">
                {column.technologies.map((technology) => (
                  <span className="diagram-chip" key={technology}>
                    {technology}
                  </span>
                ))}
              </div>
            </article>

            <div className="deep-dive-orchestration-items">
              {column.nodes.map((node, nodeIndex) => (
                <article className="diagram-card deep-dive-orchestration-item-card" key={node}>
                  <h4>{node}</h4>
                  <p>{`${column.title}의 ${nodeIndex + 1}번째 노드로, 다음 실행 단위에 넘길 컨텍스트를 정리합니다.`}</p>
                </article>
              ))}
            </div>

            {index < columns.length - 1 ? (
              <div className="deep-dive-orchestration-connector" aria-hidden="true">
                <span />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
