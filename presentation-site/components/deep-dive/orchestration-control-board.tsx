import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

const highlightedTechnologies = ["APScheduler", "FastAPI", "SQLite", "SQLAlchemy"] as const;

export default function OrchestrationControlBoard() {
  const columns = architectureContent.orchestrationColumns;
  const surfacedTechnologies = highlightedTechnologies.filter((technology) =>
    columns.some((column) => column.technologies.includes(technology)),
  );

  return (
    <SectionShell
      eyebrow={`공개 계약 ${columns.length}열`}
      title={architectureContent.copy.deepDiveOrchestration}
      summary={`${columns[0].title}부터 ${columns.at(-1)?.title}까지, 스케줄링과 API 실행이 두 개의 인텔리전스 축과 전달면을 같은 제어 보드로 묶습니다.`}
      id="orchestration-control"
    >
      <div className="diagram-card orchestration-control-summary">
        <p>
          APScheduler, FastAPI, SQLite, SQLAlchemy가 실제 실행 순서를 제어하고, 각 컬럼의 노드는
          이벤트 해석과 상품 근거화를 거쳐 같은 전달면으로 이어집니다.
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
              <p className="section-shell-eyebrow">{`COLUMN 0${index + 1}`}</p>
              <h3>{column.title}</h3>
              <p>{`${column.nodes.length}개 노드가 같은 컬럼 안에서 순차적으로 연결됩니다.`}</p>
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
