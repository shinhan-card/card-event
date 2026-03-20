import { moduleMap } from "@/content/module-map";

function ClusterCard({
  title,
  summary,
  technologies,
  evidence,
  files,
  keyLabel
}: {
  title: string;
  summary: string;
  technologies: readonly string[];
  evidence: string;
  files: readonly string[];
  keyLabel: string;
}) {
  return (
    <article className="diagram-card module-cluster-map-cluster">
      <p className="module-cluster-map-cluster-key">{keyLabel}</p>
      <h4>{title}</h4>
      <p>{summary}</p>
      <div className="diagram-chip-row">
        <span className="diagram-chip diagram-chip--muted">{evidence}</span>
        {technologies.map((technology) => (
          <span className="diagram-chip" key={technology}>
            {technology}
          </span>
        ))}
      </div>
      <ul className="module-cluster-map-files">
        {files.map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ul>
    </article>
  );
}

export default function ModuleClusterMap() {
  const sharedSections = moduleMap.sections.filter((section) =>
    section.clusters.some((cluster) => cluster.key === "shared")
  );
  const eventSections = moduleMap.sections.filter((section) =>
    section.clusters.some((cluster) => cluster.key === "event-pipeline")
  );
  const productSections = moduleMap.sections.filter((section) =>
    section.clusters.some((cluster) => cluster.key === "product-rag")
  );

  const columns = [
    {
      key: "shared",
      label: "공유 코어",
      title: "공유 코어",
      summary: "앱 초기화, 저장, API, 전달면이 두 축을 받쳐 줍니다.",
      sections: sharedSections
    },
    {
      key: "event",
      label: "이벤트 인텔리전스",
      title: "이벤트 축",
      summary: "현재 워크트리의 실코드 근거가 가장 강한 수집-정제-강화 흐름입니다.",
      sections: eventSections
    },
    {
      key: "product",
      label: "상품 / 공시 인텔리전스",
      title: "상품 / 공시 축",
      summary: "발표에서 승인된 PDF·임베딩·RAG 레인을 별도 구조로 유지합니다.",
      sections: productSections
    }
  ] as const;

  return (
    <div className="module-cluster-map" aria-label="모듈 관계 지도">
      {columns.map((column) => (
        <section className="module-cluster-map-column" key={column.key}>
          <article className="diagram-card module-cluster-map-column-head">
            <p className="module-cluster-map-step-label">{column.label}</p>
            <h3>{column.title}</h3>
            <p>{column.summary}</p>
          </article>

          <div className="module-cluster-map-column-body">
            {column.sections.map((section) => (
              <article className="diagram-card module-cluster-map-section" key={section.key}>
                <p className="module-cluster-map-step-label">{section.title}</p>
                <p>{section.summary}</p>
                <div className="module-cluster-map-clusters">
                  {section.clusters.map((cluster) => (
                    <ClusterCard
                      key={cluster.title}
                      keyLabel={cluster.key}
                      title={cluster.title}
                      summary={cluster.summary}
                      technologies={cluster.technologies}
                      evidence={cluster.evidence}
                      files={cluster.files}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>

          {column.key !== "product" ? (
            <div className="module-cluster-map-connector module-cluster-map-connector--horizontal" aria-hidden="true">
              <span />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
