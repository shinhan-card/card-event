export type ArchitectureAxisKey = "event-intelligence" | "product-intelligence";

export interface ArchitectureAxis {
  key: ArchitectureAxisKey;
  title: string;
  question: string;
}

export interface ArchitectureStage {
  key: string;
  title: string;
  technology: string;
  description: string;
}

export interface ArchitectureContent {
  axes: readonly ArchitectureAxis[];
  stages: readonly ArchitectureStage[];
  orchestration: {
    title: string;
    summary: string;
  };
  designPrinciples: readonly string[];
}

export const architectureContent = {
  axes: [
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
  ],
  stages: [
    {
      key: "collect",
      title: "Collect",
      technology: "Playwright connectors",
      description: "Gather market and disclosure signals from the source systems."
    },
    {
      key: "extract",
      title: "Extract",
      technology: "detail extraction",
      description: "Turn the raw capture into readable event and product facts."
    },
    {
      key: "normalize",
      title: "Normalize",
      technology: "structured event fields",
      description: "Shape the signals into stable fields the rest of the app can trust."
    },
    {
      key: "enrich",
      title: "Enrich",
      technology: "rules + AI",
      description: "Add inference, classification, and supporting context."
    },
    {
      key: "deliver",
      title: "Deliver",
      technology: "analytics + briefing",
      description: "Package the results for review, reporting, and decision-making."
    }
  ],
  orchestration: {
    title: "Orchestration",
    summary:
      "A single pipeline coordinates capture, normalization, enrichment, and delivery while keeping the event and product tracks distinct."
  },
  designPrinciples: [
    "Keep event intelligence and product intelligence separate.",
    "Prefer structured outputs before narrative summaries.",
    "Make each stage explainable, testable, and easy to extend."
  ]
} as const satisfies ArchitectureContent;
