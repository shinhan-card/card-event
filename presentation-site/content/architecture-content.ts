export type ArchitectureAxisKey = "event-intelligence" | "product-intelligence";

export interface ArchitectureAxis {
  key: ArchitectureAxisKey;
  title: string;
  question: string;
}

export interface ConceptZone {
  key: string;
  title: string;
  summary: string;
}

export interface ArchitectureStage {
  key: string;
  title: string;
  what: string;
  why: string;
  technology: string;
  description: string;
  next: string;
}

export interface OrchestrationNode {
  key: string;
  title: string;
  summary: string;
}

export interface ArchitectureContent {
  deepDive: {
    eyebrow: string;
    title: string;
    summary: string;
  };
  axes: readonly ArchitectureAxis[];
  conceptArchitecture: {
    eyebrow: string;
    title: string;
    summary: string;
    zones: readonly ConceptZone[];
  };
  stages: readonly ArchitectureStage[];
  stageBreakdown: {
    eyebrow: string;
    title: string;
    summary: string;
    cards: readonly ArchitectureStage[];
  };
  orchestration: {
    title: string;
    summary: string;
  };
  orchestrationMap: {
    eyebrow: string;
    title: string;
    summary: string;
    nodes: readonly OrchestrationNode[];
  };
  designPrinciples: readonly string[];
}

const axes = [
  {
    key: "event-intelligence",
    title: "Event Intelligence",
    question: "What is happening in competitor card events, and what does it mean?"
  },
  {
    key: "product-intelligence",
    title: "Product / Disclosure Intelligence",
    question:
      "What card products exist, and what structured knowledge can we derive from disclosures and PDFs?"
  }
] as const;

const conceptZones = [
  {
    key: "data-sources",
    title: "Data Sources",
    summary: "External sites, filings, disclosures, and market surfaces are the evidence layer."
  },
  {
    key: "collection-layer",
    title: "Collection Layer",
    summary: "Connectors and crawlers gather raw signals without deciding their meaning yet."
  },
  {
    key: "extraction-normalization",
    title: "Extraction and Normalization",
    summary: "Captured content is turned into structured facts with stable fields."
  },
  {
    key: "intelligence-generation",
    title: "Intelligence Generation",
    summary: "Rules, retrieval, and analysis transform structure into useful insight."
  },
  {
    key: "delivery-surfaces",
    title: "Delivery Surfaces",
    summary: "Briefings, analytics, and presentation views consume the same shaped output."
  }
] as const;

const stages = [
  {
    key: "collect",
    title: "Collect",
    what: "Acquire market and disclosure signals from the source systems.",
    why: "You cannot reason about the lane until the underlying evidence is in hand.",
    technology: "Playwright connectors",
    description: "Gather market and disclosure signals from the source systems.",
    next: "Pass the raw capture into extraction."
  },
  {
    key: "extract",
    title: "Extract",
    what: "Pull useful facts out of pages, PDFs, and structured responses.",
    why: "The output needs stable facts before it can be normalized or compared.",
    technology: "detail extraction",
    description: "Turn the raw capture into readable event and product facts.",
    next: "Shape the extracted facts into stable fields."
  },
  {
    key: "normalize",
    title: "Normalize",
    what: "Shape signals into a repeatable schema the rest of the app can trust.",
    why: "Downstream views should not depend on the quirks of any one source.",
    technology: "structured event fields",
    description: "Shape the signals into stable fields the rest of the app can trust.",
    next: "Layer interpretation and classification on top."
  },
  {
    key: "enrich",
    title: "Enrich",
    what: "Add inference, classification, and supporting context.",
    why: "Structured data is stronger when the system explains what changed and why it matters.",
    technology: "rules + AI",
    description: "Add inference, classification, and supporting context.",
    next: "Publish the enriched result into delivery surfaces."
  },
  {
    key: "deliver",
    title: "Deliver",
    what: "Package the results for review, reporting, and decision-making.",
    why: "The system only matters if operators can consume the result quickly.",
    technology: "analytics + briefing",
    description: "Package the results for review, reporting, and decision-making.",
    next: "Feed the same shaped output into briefs and dashboards."
  }
] as const;

const orchestrationNodes = [
  {
    key: "scheduler",
    title: "Scheduler",
    summary: "Coordinates when capture and downstream processing run."
  },
  {
    key: "routers",
    title: "Routers",
    summary: "Direct requests and results into the correct lane."
  },
  {
    key: "event-pipeline",
    title: "Event Pipeline",
    summary: "Owns event capture, normalization, and enrichment."
  },
  {
    key: "briefing",
    title: "Briefing",
    summary: "Turns structured output into decision-ready summaries."
  },
  {
    key: "analytics",
    title: "Analytics",
    summary: "Surfaces trends, comparisons, and reporting views."
  },
  {
    key: "disclosures",
    title: "Disclosures",
    summary: "Interprets product documents and source disclosures."
  },
  {
    key: "rag",
    title: "RAG",
    summary: "Retrieval and generation support product intelligence questions."
  }
] as const;

export const architectureContent = {
  deepDive: {
    eyebrow: "Systems Atlas",
    title: "Architecture Deep Dive",
    summary: "A structured view of the system zones, stage flow, and orchestration surfaces."
  },
  axes,
  conceptArchitecture: {
    eyebrow: "Concept Architecture",
    title: "Concept Architecture",
    summary:
      "A calm diagram of the core zones that move from sources to delivery without collapsing the two intelligence lanes.",
    zones: conceptZones
  },
  stages,
  stageBreakdown: {
    eyebrow: "Stage Breakdown",
    title: "Stage Breakdown",
    summary:
      "Each stage owns a single transformation and explains why that transformation exists.",
    cards: stages
  },
  orchestration: {
    title: "Orchestration",
    summary:
      "A single pipeline coordinates capture, normalization, enrichment, and delivery while keeping the event and product tracks distinct."
  },
  orchestrationMap: {
    eyebrow: "Orchestration Map",
    title: "Orchestration Map",
    summary:
      "These surfaces coordinate scheduling, routing, and lane-specific delivery without erasing ownership boundaries.",
    nodes: orchestrationNodes
  },
  designPrinciples: [
    "Keep event intelligence and product intelligence separate.",
    "Prefer structured outputs before narrative summaries.",
    "Make each stage explainable, testable, and easy to extend."
  ]
} as const satisfies ArchitectureContent;
