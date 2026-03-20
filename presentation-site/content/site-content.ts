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

export interface SceneCardContent {
  title: string;
  description: string;
}

export interface SceneCtaContent {
  href: string;
  label: string;
}

export interface LandingShowroomContent {
  hero: {
    intro: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    summary: string;
    cards: readonly SceneCardContent[];
  };
  signalFlow: {
    eyebrow: string;
    title: string;
    summary: string;
  };
  outcomes: {
    eyebrow: string;
    title: string;
    summary: string;
    cards: readonly SceneCardContent[];
  };
  orchestration: {
    eyebrow: string;
    title: string;
    summary: string;
    sharedDeliveryLabel: string;
    sharedDeliverySummary: string;
  };
  deepDiveCta: {
    eyebrow: string;
    title: string;
    summary: string;
    supportingCopy: string;
    cta: SceneCtaContent;
  };
}

export interface SiteContent {
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    primaryCta: SceneCtaContent;
    secondaryCta: SceneCtaContent;
  };
  showroom: LandingShowroomContent;
  landingScenes: readonly LandingScene[];
}

const openDeepDiveCta = {
  href: "/deep-dive",
  label: "Open Deep Dive"
} as const;

export const siteContent = {
  hero: {
    eyebrow: "Showroom preview",
    title: "Event and disclosure intelligence, staged as a living presentation",
    summary:
      "The landing page introduces two distinct intelligence tracks and shows how they travel through the system, from crawl to enrichment to briefing.",
    primaryCta: openDeepDiveCta,
    secondaryCta: {
      href: "#problem",
      label: "See the problem"
    }
  },
  showroom: {
    hero: {
      intro:
        "Event intelligence and disclosure intelligence share a showroom, but they do not share a lane. The introduction makes that distinction visible from the first scroll."
    },
    problem: {
      eyebrow: "Problem",
      title: "The market is noisy because the evidence is split",
      summary:
        "One lane tracks what is happening in the market. The other lane tracks what products actually exist. The landing page keeps both truths visible.",
      cards: [
        {
          title: "Event chaos",
          description:
            "Market moves arrive as loose signals: launches, pricing shifts, promos, app changes, and service updates."
        },
        {
          title: "Disclosure depth",
          description:
            "Product research spans PDFs, filings, and support material that need separate extraction and interpretation."
        }
      ]
    },
    signalFlow: {
      eyebrow: "How It Works",
      title: "Collect -> Extract -> Normalize -> Enrich -> Deliver",
      summary: "The pipeline stage rail turns raw signals into readable, explainable output."
    },
    outcomes: {
      eyebrow: "Outcomes",
      title: "The runway ends in usable operator value",
      summary:
        "When the pipeline is staged correctly, the output is not just a summary. It is evidence, context, and a decision-ready handoff.",
      cards: [
        {
          title: "Faster operator review",
          description:
            "The presentation surfaces the right context up front so an operator can move from signal to decision sooner."
        },
        {
          title: "Cleaner evidence trails",
          description:
            "Each result keeps its source and interpretation legible, which makes follow-up and validation easier."
        },
        {
          title: "Reusable outputs",
          description:
            "The same structured artifacts can flow into dashboards, briefs, or downstream automation."
        }
      ]
    },
    orchestration: {
      eyebrow: "Orchestration",
      title: "Shared orchestration keeps the lanes honest",
      summary:
        "The runtime coordinates capture, normalization, enrichment, and delivery without collapsing the two intelligence tracks into one blob.",
      sharedDeliveryLabel: "Shared delivery",
      sharedDeliverySummary:
        "Briefing, analytics, and presentation layers receive consistent structured output from both lanes."
    },
    deepDiveCta: {
      eyebrow: "Deep Dive",
      title: "Take the handoff into the architecture view",
      summary:
        "The landing showroom stops here. The deep dive opens the system map, module ownership, and orchestration boundaries in full.",
      supportingCopy:
        "The next step is the implementation shape behind the presentation: modules, routes, ownership, and the system boundaries that keep the two intelligence lanes legible.",
      cta: {
        href: "/deep-dive",
        label: "Continue to the Deep Dive"
      }
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
