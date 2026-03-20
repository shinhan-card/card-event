export type LandingSceneKey =
  | "hero"
  | "problem"
  | "signal-flow"
  | "outcomes"
  | "orchestration"
  | "deep-dive-cta";

export interface LandingScene {
  key: LandingSceneKey;
  title: string;
  summary: string;
}

export interface SiteContent {
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    primaryCta: {
      href: string;
      label: string;
    };
    secondaryCta: {
      href: string;
      label: string;
    };
  };
  landingScenes: readonly LandingScene[];
}

export const siteContent = {
  hero: {
    eyebrow: "Showroom preview",
    title: "Event and disclosure intelligence, staged as a living presentation",
    summary:
      "The landing page introduces two distinct intelligence tracks and shows how they travel through the system, from crawl to enrichment to briefing.",
    primaryCta: {
      href: "/deep-dive",
      label: "Open Deep Dive"
    },
    secondaryCta: {
      href: "#problem",
      label: "See the problem"
    }
  },
  landingScenes: [
    {
      key: "hero",
      title: "Hero",
      summary: "A showroom entrance that frames the two intelligence tracks."
    },
    {
      key: "problem",
      title: "Problem",
      summary: "Why event signal and structured disclosure knowledge need separate treatment."
    },
    {
      key: "signal-flow",
      title: "Signal Flow",
      summary: "How raw events become normalized, enriched, and explainable."
    },
    {
      key: "outcomes",
      title: "Outcomes",
      summary: "What the system delivers once the intelligence pipeline is orchestrated."
    },
    {
      key: "orchestration",
      title: "Orchestration",
      summary: "How the runtime components coordinate collection, extraction, and delivery."
    },
    {
      key: "deep-dive-cta",
      title: "Deep Dive CTA",
      summary: "A clear transition into the architecture section for implementation details."
    }
  ]
} as const satisfies SiteContent;
