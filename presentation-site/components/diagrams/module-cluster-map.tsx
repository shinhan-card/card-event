import { moduleMap } from "@/content/module-map";

function ClusterCard({
  title,
  summary,
  files,
  keyLabel
}: {
  title: string;
  summary: string;
  files: readonly string[];
  keyLabel: string;
}) {
  return (
    <article className="diagram-card module-cluster-map-cluster">
      <p className="module-cluster-map-cluster-key">{keyLabel}</p>
      <h4>{title}</h4>
      <p>{summary}</p>
      <ul className="module-cluster-map-files">
        {files.map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ul>
    </article>
  );
}

export default function ModuleClusterMap() {
  return (
    <div className="module-cluster-map" aria-label="Module relationship map">
      {moduleMap.sections.map((section, index) => (
        <div className="module-cluster-map-step" key={section.key}>
          <article className="diagram-card module-cluster-map-section">
            <p className="module-cluster-map-step-label">
              Step {String(index + 1).padStart(2, "0")}
            </p>
            <h3>{section.title}</h3>
            <p>{section.summary}</p>
            <div className="module-cluster-map-clusters">
              {section.clusters.map((cluster) => (
                <ClusterCard
                  key={cluster.title}
                  keyLabel={cluster.key}
                  title={cluster.title}
                  summary={cluster.summary}
                  files={cluster.files}
                />
              ))}
            </div>
          </article>

          {index < moduleMap.sections.length - 1 ? (
            <div className="module-cluster-map-connector" aria-hidden="true">
              <span />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
