export type ModuleClusterKey = "event-pipeline" | "product-rag" | "shared";

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
        "modules/connectors/*",
        "modules/pipeline.py",
        "modules/event_enrichment.py"
      ]
    },
    {
      key: "product-rag",
      title: "Product / Disclosure RAG",
      summary:
        "Owns product, disclosure, and retrieval surfaces for the presentation workspace.",
      files: ["routers/rag.py", "routers/disclosures.py", "modules/rag/*"]
    },
    {
      key: "shared",
      title: "Shared Intelligence",
      summary:
        "Cross-cutting analytics and briefing surfaces used by both intelligence lanes.",
      files: ["modules/insights.py", "modules/briefing.py"]
    }
  ]
} as const satisfies ModuleMap;
