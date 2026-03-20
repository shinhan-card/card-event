export type ModuleClusterKey = "event-pipeline" | "product-rag" | "shared";

export interface ModuleAxisRoot {
  key: "event-pipeline" | "product-rag";
  title: string;
  summary: string;
}

export interface ModuleCluster {
  key: ModuleClusterKey;
  title: string;
  summary: string;
  files: readonly string[];
}

export interface ModuleSection {
  key: string;
  title: string;
  summary: string;
  clusters: readonly ModuleCluster[];
}

export interface ModuleMap {
  axisRoots: readonly ModuleAxisRoot[];
  clusters: readonly ModuleCluster[];
  sections: readonly ModuleSection[];
}

const bootstrapCluster = {
  key: "shared",
  title: "Bootstrap",
  summary: "Shared application bootstrap and storage surfaces.",
  files: ["app.py", "database.py"]
} as const satisfies ModuleCluster;

const apiSurfaceCluster = {
  key: "shared",
  title: "API Surface",
  summary: "Router entry points for the app surface.",
  files: ["routers/*"]
} as const satisfies ModuleCluster;

const eventCollectionCluster = {
  key: "shared",
  title: "Event Collection",
  summary: "Connectors and crawlers that gather event inputs.",
  files: ["modules/connectors/*"]
} as const satisfies ModuleCluster;

const eventPipelineCluster = {
  key: "event-pipeline",
  title: "Event Pipeline",
  summary: "Extraction and normalization responsibilities for event intelligence.",
  files: ["modules/pipeline.py"],
} as const satisfies ModuleCluster;

const enrichmentCluster = {
  key: "shared",
  title: "Enrichment",
  summary: "Event enrichment, insights, and classification responsibilities.",
  files: ["modules/event_enrichment.py", "modules/insights.py"]
} as const satisfies ModuleCluster;

const briefingAnalyticsCluster = {
  key: "shared",
  title: "Briefing and Analytics",
  summary: "Shared delivery surfaces for operator-facing reporting and review.",
  files: ["modules/briefing.py", "modules/analytics_service.py"]
} as const satisfies ModuleCluster;

const productRagCluster = {
  key: "product-rag",
  title: "Product Intelligence",
  summary:
    "Disclosures sync, PDF/catalog collection, chunking, embedding, and RAG-backed catalog summary.",
  files: ["routers/disclosures.py", "routers/rag.py", "modules/rag/*"]
} as const satisfies ModuleCluster;

const uiLayerCluster = {
  key: "shared",
  title: "UI Layer",
  summary: "Presentation templates and client-side scripts.",
  files: ["templates/*", "static/js/*"]
} as const satisfies ModuleCluster;

export const moduleMap = {
  axisRoots: [
    {
      key: "event-pipeline",
      title: "Event Intelligence Root",
      summary: "The runtime path for event capture, normalization, and enrichment."
    },
    {
      key: "product-rag",
      title: "Product / Disclosure Intelligence Root",
      summary: "The runtime path for disclosures sync, PDF/catalog collection, and RAG."
    }
  ],
  clusters: [
    bootstrapCluster,
    apiSurfaceCluster,
    eventCollectionCluster,
    eventPipelineCluster,
    enrichmentCluster,
    briefingAnalyticsCluster,
    productRagCluster,
    uiLayerCluster
  ],
  sections: [
    {
      key: "bootstrap",
      title: "Bootstrap",
      summary: "Shared application bootstrap and storage surfaces.",
      clusters: [bootstrapCluster]
    },
    {
      key: "api-surface",
      title: "API Surface",
      summary: "Router entry points for the app surface.",
      clusters: [apiSurfaceCluster]
    },
    {
      key: "event-collection",
      title: "Event Collection",
      summary: "Connectors and crawlers that gather event inputs.",
      clusters: [eventCollectionCluster]
    },
    {
      key: "event-pipeline",
      title: "Event Pipeline",
      summary: "Extraction and normalization responsibilities for event intelligence.",
      clusters: [eventPipelineCluster]
    },
    {
      key: "enrichment",
      title: "Enrichment",
      summary: "Event enrichment, insights, and classification responsibilities.",
      clusters: [enrichmentCluster]
    },
    {
      key: "briefing-analytics",
      title: "Briefing and Analytics",
      summary: "Shared delivery surfaces for operator-facing reporting and review.",
      clusters: [briefingAnalyticsCluster]
    },
    {
      key: "product-intelligence",
      title: "Product Intelligence",
      summary:
        "Disclosures sync, PDF/catalog collection, chunking, embedding, and RAG-backed catalog summary.",
      clusters: [productRagCluster]
    },
    {
      key: "ui-layer",
      title: "UI Layer",
      summary: "Presentation templates and client-side scripts.",
      clusters: [uiLayerCluster]
    }
  ]
} as const satisfies ModuleMap;
