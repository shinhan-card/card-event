export type ModuleClusterKey = "event-pipeline" | "product-rag";

export interface ModuleCluster {
  key: ModuleClusterKey;
  title: string;
  summary: string;
  files: readonly string[];
}

export interface ModuleMap {
  clusters: readonly ModuleCluster[];
}

export const moduleMap = {
  clusters: [
    {
      key: "event-pipeline",
      title: "Event Pipeline",
      summary:
        "Coordinates capture, normalization, enrichment, and delivery for event intelligence.",
      files: [
        "app.py",
        "database.py",
        "routers/*",
        "modules/connectors/*",
        "modules/pipeline.py",
        "modules/event_enrichment.py"
      ]
    },
    {
      key: "product-rag",
      title: "Product / Disclosure RAG",
      summary:
        "Organizes structured disclosure knowledge, retrieval, and briefing outputs.",
      files: ["modules/insights.py", "modules/briefing.py", "modules/rag/*"]
    }
  ]
} as const satisfies ModuleMap;
