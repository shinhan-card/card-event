import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

const productPhaseLabels = {
  source: "문서 수집층",
  vector: "벡터 지식층",
  response: "검색 응답층",
} as const;

const productPhaseByStepKey = {
  "collect-sources": "source",
  "store-raw": "source",
  "clean-document": "source",
  chunk: "vector",
  embed: "vector",
  "store-vector": "vector",
  "retrieve-rag": "response",
  "compose-response": "response",
  deliver: "response",
} as const;

const productPhases = (
  Object.keys(productPhaseLabels) as Array<keyof typeof productPhaseLabels>
).map((phaseKey) => ({
  key: phaseKey,
  label: productPhaseLabels[phaseKey],
  steps: architectureContent.productKnowledge.steps.filter((step) => {
    const resolvedPhase = productPhaseByStepKey[step.key];

    if (!resolvedPhase) {
      throw new Error(`Unhandled product knowledge step: ${step.key}`);
    }

    return resolvedPhase === phaseKey;
  }),
}));

const productSummary =
  "문서 수집부터 청크 분할, 임베딩, ChromaDB 저장, RAG 검색, 응답 조합, 전달까지 상품 지식 흐름을 단계별로 분해합니다.";

export default function ProductKnowledgeBoard() {
  return (
    <SectionShell
      eyebrow="상품 지식 흐름"
      title={architectureContent.copy.deepDiveProduct}
      summary={productSummary}
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
