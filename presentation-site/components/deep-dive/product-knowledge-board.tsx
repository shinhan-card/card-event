import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

const productPhases = [
  {
    key: "source",
    label: "문서 수집층",
    steps: architectureContent.productKnowledge.steps.slice(0, 3),
  },
  {
    key: "vector",
    label: "벡터 지식층",
    steps: architectureContent.productKnowledge.steps.slice(3, 6),
  },
  {
    key: "response",
    label: "검색 응답층",
    steps: architectureContent.productKnowledge.steps.slice(6),
  },
] as const;

export default function ProductKnowledgeBoard() {
  return (
    <SectionShell
      eyebrow="상품 지식 흐름"
      title={architectureContent.copy.deepDiveProduct}
      summary="문서 수집부터 청크 분할, 임베딩, ChromaDB 저장, RAG 검색, 응답 조합까지 상품 지식 흐름을 단계별로 분해합니다."
      id="product-knowledge"
    >
      <div className="product-knowledge-board" aria-label="상품 지식 보드">
        {productPhases.map((phase) => (
          <article className="diagram-card product-knowledge-phase" key={phase.key}>
            <p className="section-shell-eyebrow">{phase.label}</p>
            <div className="product-knowledge-step-list">
              {phase.steps.map((step, index) => (
                <div className="product-knowledge-step" key={step.key}>
                  <div className="product-knowledge-step-head">
                    <span className="product-knowledge-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3>{step.title}</h3>
                  </div>
                  <p>{step.summary}</p>
                  <div className="diagram-chip-row">
                    {step.technologies.map((technology) => (
                      <span className="diagram-chip" key={technology}>
                        {technology}
                      </span>
                    ))}
                  </div>
                  <dl className="product-knowledge-output">
                    <dt>출력</dt>
                    <dd>{step.output}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
