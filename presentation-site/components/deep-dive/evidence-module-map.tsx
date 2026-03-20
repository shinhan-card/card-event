import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";
import { moduleMap, resolveModulePathStatus } from "@/content/module-map";

const groupLabels = {
  "shared-core": "공유 코어",
  "event-axis": "이벤트 축",
  "product-axis": "상품 축",
  "delivery-surfaces": "전달면",
} as const;

const evidenceLabels = {
  implemented: "구현됨",
  approved: "승인 경로",
} as const;

export default function EvidenceModuleMap() {
  return (
    <SectionShell
      eyebrow={`근거 클러스터 ${moduleMap.clusters.length}개`}
      title={architectureContent.copy.deepDiveModules}
      summary="공개 계약에 포함된 파일 경로를 클러스터별 근거 수준과 함께 배치하고, 각 경로는 실제 워크트리 존재 여부에 따라 별도 provenance를 표시합니다."
      id="evidence-module-map"
    >
      <div className="diagram-grid evidence-module-map-grid" aria-label="근거 모듈 맵">
        {moduleMap.clusters.map((cluster) => (
          <article
            className="diagram-card evidence-module-map-card"
            data-cluster-group={cluster.group}
            data-evidence-level={cluster.evidenceLevel}
            key={cluster.key}
          >
            <p className="module-cluster-map-step-label">{groupLabels[cluster.group]}</p>
            <h3>{cluster.title}</h3>
            <p>{cluster.summary}</p>
            <div className="diagram-chip-row">
              <span className="diagram-chip diagram-chip--muted">
                {evidenceLabels[cluster.evidenceLevel]}
              </span>
              <span className="diagram-chip">{groupLabels[cluster.group]}</span>
            </div>
            <ul className="module-cluster-map-files">
              {cluster.files.map((file) => {
                const pathStatus = resolveModulePathStatus(file);

                return (
                  <li data-path-status={pathStatus} key={file}>
                    <span>{file}</span>
                    <span className="diagram-chip diagram-chip--muted">
                      {evidenceLabels[pathStatus]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
