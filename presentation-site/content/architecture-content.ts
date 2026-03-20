export type ArchitectureAxisKey = "event-intelligence" | "product-intelligence";

export interface SnapshotMetadata {
  label: string;
  capturedOn: string;
  note: string;
}

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

export interface OrchestrationGroupItem {
  key: string;
  title: string;
  summary: string;
}

export interface OrchestrationGroup {
  key: string;
  title: string;
  summary: string;
  items: readonly OrchestrationGroupItem[];
}

export interface DualAxisItem {
  key: string;
  title: string;
  summary: string;
}

export interface DualAxisLane {
  key: ArchitectureAxisKey;
  title: string;
  summary: string;
  items: readonly DualAxisItem[];
}

export interface DualAxisArchitecture {
  eyebrow: string;
  title: string;
  summary: string;
  lanes: readonly DualAxisLane[];
  bridge: {
    title: string;
    summary: string;
    items: readonly DualAxisItem[];
  };
}

export interface PrincipleCard {
  key: string;
  title: string;
  summary: string;
}

export interface RoadmapPhase {
  key: string;
  title: string;
  summary: string;
  next: string;
}

export interface ArchitectureContent {
  snapshot: SnapshotMetadata;
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
  dualAxisArchitecture: DualAxisArchitecture;
  orchestration: {
    title: string;
    summary: string;
  };
  orchestrationMap: {
    eyebrow: string;
    title: string;
    summary: string;
    groups: readonly OrchestrationGroup[];
  };
  principlesSection: {
    eyebrow: string;
    title: string;
    summary: string;
    cards: readonly PrincipleCard[];
  };
  evolutionRoadmap: {
    eyebrow: string;
    title: string;
    summary: string;
    phases: readonly RoadmapPhase[];
  };
  designPrinciples: readonly string[];
}

export const snapshotMetadata = {
  label: "Current snapshot",
  capturedOn: "2026-03-20",
  note: "Authoring guide and architecture maps are current as of this presentation workspace snapshot."
} as const satisfies SnapshotMetadata;

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

const orchestrationGroups = [
  {
    key: "scheduler",
    title: "Scheduler",
    summary: "Launches timed runs and keeps the control plane in motion.",
    items: [
      {
        key: "timed-runs",
        title: "Timed runs",
        summary: "Start collection on a predictable cadence."
      },
      {
        key: "work-queue",
        title: "Work queue",
        summary: "Move the right task to the next processing step."
      }
    ]
  },
  {
    key: "routers",
    title: "Routers",
    summary: "Route requests into the event and product paths.",
    items: [
      {
        key: "event-router",
        title: "Event route",
        summary: "Send event signals into the event pipeline."
      },
      {
        key: "product-router",
        title: "Product route",
        summary: "Send disclosures and retrieval work into the product lane."
      }
    ]
  },
  {
    key: "lane-processing",
    title: "Lane-specific processing",
    summary: "Event and product intelligence diverge here before the shared handoff.",
    items: [
      {
        key: "event-pipeline",
        title: "Event Pipeline",
        summary: "Owns event capture, normalization, and enrichment."
      },
      {
        key: "disclosures",
        title: "Disclosures",
        summary: "Interprets product documents and structured disclosures."
      },
      {
        key: "rag",
        title: "RAG",
        summary: "Supports product intelligence with retrieval and generation."
      }
    ]
  },
  {
    key: "delivery",
    title: "Delivery surfaces",
    summary: "Briefing and analytics consume the shared shaped output.",
    items: [
      {
        key: "briefing",
        title: "Briefing",
        summary: "Turn structured output into decision-ready summaries."
      },
      {
        key: "analytics",
        title: "Analytics",
        summary: "Surface trends, comparisons, and reporting views."
      }
    ]
  }
] as const;

const dualAxisLanes = [
  {
    key: "event-intelligence",
    title: "Event Intelligence",
    summary: "Tracks live market motion and turns it into structured event signals.",
    items: [
      {
        key: "event-sources",
        title: "Signal sources",
        summary: "Competitor events, market updates, and live surfaces"
      },
      {
        key: "event-pipeline",
        title: "Event pipeline",
        summary: "Extraction and normalization for the event lane"
      },
      {
        key: "event-enrichment",
        title: "Enrichment",
        summary: "Classification and context for event intelligence"
      }
    ]
  },
  {
    key: "product-intelligence",
    title: "Product / Disclosure Intelligence",
    summary:
      "Turns disclosures and catalogs into searchable product understanding and RAG-backed summaries.",
    items: [
      {
        key: "disclosures-sync",
        title: "Disclosures sync",
        summary: "Keep product and disclosure records aligned"
      },
      {
        key: "pdf-collection",
        title: "PDF / catalog collection",
        summary: "Collect disclosure PDFs and catalog artifacts"
      },
      {
        key: "chunk-embed",
        title: "Chunking and embedding",
        summary: "Prepare content for retrieval and comparison"
      },
      {
        key: "rag-summary",
        title: "RAG / catalog summary",
        summary: "Surface catalog summaries for operator review"
      }
    ]
  }
] as const;

const bridgeItems = [
  {
    key: "analytics",
    title: "Analytics",
    summary: "Trends and comparisons"
  },
  {
    key: "dashboard",
    title: "Dashboard",
    summary: "At-a-glance state"
  },
  {
    key: "briefing",
    title: "Briefing",
    summary: "Decision-ready writeups"
  },
  {
    key: "operator-view",
    title: "Operator View",
    summary: "The action layer for review"
  }
] as const;

const principleCards = [
  {
    key: "separate-axes",
    title: "Keep the lanes distinct",
    summary: "Event intelligence and product intelligence are related, but they are not the same surface."
  },
  {
    key: "structured-first",
    title: "Structure first, prose second",
    summary: "The system should shape data before it narrates outcomes."
  },
  {
    key: "explainable-steps",
    title: "Make each step explainable",
    summary: "Every stage and handoff should have a visible reason."
  }
] as const;

const roadmapPhases = [
  {
    key: "concept-foundation",
    title: "Concept foundation",
    summary: "Keep the axis split clear and the stage flow explicit.",
    next: "Add module ownership and lane-specific views."
  },
  {
    key: "module-ownership",
    title: "Module ownership",
    summary: "Map the real repo into shared and lane-specific clusters.",
    next: "Tighten runtime boundaries and orchestration."
  },
  {
    key: "operational-maturity",
    title: "Operational maturity",
    summary: "Wire the live system to the deep-dive concepts without losing clarity.",
    next: "Refine analytics, briefing, and operator handoff."
  }
] as const;

export const architectureContent = {
  snapshot: snapshotMetadata,
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
  dualAxisArchitecture: {
    eyebrow: "Dual Axis Architecture",
    title: "Dual Axis Architecture",
    summary:
      "The left lane handles event intelligence, the right lane handles product and disclosure intelligence, and the bridge holds the shared operator surfaces.",
    lanes: dualAxisLanes,
    bridge: {
      title: "Bridge Area",
      summary: "Shared surfaces show the same shaped output to different operators.",
      items: bridgeItems
    }
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
    groups: orchestrationGroups
  },
  principlesSection: {
    eyebrow: "Design Principles",
    title: "Design Principles",
    summary: "Rules that keep the deep-dive legible as the system grows.",
    cards: principleCards
  },
  evolutionRoadmap: {
    eyebrow: "Evolution Roadmap",
    title: "Evolution Roadmap",
    summary: "The architecture evolves from concept to ownership to delivery depth.",
    phases: roadmapPhases
  },
  designPrinciples: [
    "Keep event intelligence and product intelligence separate.",
    "Prefer structured outputs before narrative summaries.",
    "Make each stage explainable, testable, and easy to extend."
  ]
} as const satisfies ArchitectureContent;
