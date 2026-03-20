import { architectureContent } from "@/content/architecture-content";

type SiteHref =
  | "/"
  | "/#axes"
  | "/#how-it-works"
  | "/#value"
  | "/deep-dive"
  | "/deep-dive#executive-blueprint";

type PublicSiteContent = {
  copy: typeof architectureContent.copy;
  snapshotMeta: {
    label: string;
    capturedOn: string;
    note: string;
  };
  navigation: readonly {
    href: SiteHref;
    label: string;
  }[];
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    primaryCta: {
      label: string;
      href: SiteHref;
    };
    secondaryCta: {
      label: string;
      href: SiteHref;
    };
  };
  landingScenes: readonly {
    key:
      | "thesis"
      | "tension"
      | "dual-engine"
      | "decision-surfaces"
      | "system-value"
      | "deep-dive-handoff";
    anchorId: string;
    title: string;
    summary: string;
  }[];
  decisionSurfaces: readonly {
    title: string;
    summary: string;
  }[];
  valueCards: readonly {
    title: string;
    summary: string;
  }[];
};

type LegacySiteContent = PublicSiteContent & {
  snapshot: PublicSiteContent["snapshotMeta"];
  showroom: {
    hero: {
      intro: string;
    };
    problem: {
      eyebrow: string;
      title: string;
      summary: string;
      cards: readonly {
        title: string;
        description: string;
      }[];
    };
    signalFlow: {
      eyebrow: string;
      title: string;
      summary: string;
    };
    orchestration: {
      eyebrow: string;
      title: string;
      summary: string;
      sharedDeliveryLabel: string;
      sharedDeliverySummary: string;
    };
    outcomes: {
      eyebrow: string;
      title: string;
      summary: string;
      cards: readonly {
        title: string;
        description: string;
      }[];
    };
    deepDiveCta: {
      eyebrow: string;
      title: string;
      summary: string;
      supportingCopy: string;
      cta: {
        label: string;
        href: SiteHref;
      };
    };
  };
};

const defineHidden = <T extends object, K extends PropertyKey, V>(
  target: T,
  key: K,
  value: V,
): T & Record<K, V> => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
    writable: false,
  });

  return target as T & Record<K, V>;
};

const copy = architectureContent.copy;

const snapshotMeta = {
  label: copy.snapshotLabel,
  capturedOn: "2026-03-20",
  note: "Task 1 공개 계약을 기준으로 랜딩과 딥다이브의 콘텐츠 스키마를 다시 맞췄습니다.",
} as const satisfies PublicSiteContent["snapshotMeta"];

const navigation = [
  { href: "/", label: copy.navOverview },
  { href: "/#axes", label: copy.navAxes },
  { href: "/#how-it-works", label: copy.navHowItWorks },
  { href: "/#value", label: copy.navValue },
  { href: "/deep-dive", label: copy.navDeepDive },
] as const satisfies PublicSiteContent["navigation"];

const hero = {
  eyebrow: "프레젠테이션 사이트",
  title: "카드 이벤트 인텔리전스를 실행 지도처럼 보여줍니다",
  summary:
    "랜딩은 질문의 축, 전달면, 시스템 가치를 먼저 정리해 의사결정자가 왜 이 구조가 필요한지 빠르게 이해하도록 돕습니다.",
  primaryCta: {
    label: copy.ctaPrimary,
    href: "/deep-dive",
  },
  secondaryCta: {
    label: copy.ctaSecondary,
    href: "/deep-dive#executive-blueprint",
  },
} as const satisfies PublicSiteContent["hero"];

const landingScenes = [
  {
    key: "thesis",
    anchorId: "overview",
    title: copy.landingThesis,
    summary: "이벤트 변화 신호와 상품 문서 근거를 함께 보여주되, 질문은 섞지 않고 분리해서 설명합니다.",
  },
  {
    key: "tension",
    anchorId: "axes",
    title: copy.landingTension,
    summary: "이벤트는 빠른 변화 신호를 다루고, 상품 지식은 긴 문서 근거를 다루기 때문에 다른 처리 축이 필요합니다.",
  },
  {
    key: "dual-engine",
    anchorId: "how-it-works",
    title: copy.landingEngine,
    summary: "이벤트 해석 엔진과 상품 지식 엔진이 같은 전달면으로 합류하지만, 처리 레인은 끝까지 분리됩니다.",
  },
  {
    key: "decision-surfaces",
    anchorId: "decision-surfaces",
    title: copy.landingDecision,
    summary: "브리핑, 분석, 발표 화면이 같은 구조 결과를 소비하도록 정렬해 의사결정 흐름을 짧게 만듭니다.",
  },
  {
    key: "system-value",
    anchorId: "value",
    title: copy.landingValue,
    summary: "어떤 근거가 어떤 응답으로 이어졌는지 설명 가능해야 시스템 가치가 유지됩니다.",
  },
  {
    key: "deep-dive-handoff",
    anchorId: "deep-dive-cta",
    title: copy.landingHandoff,
    summary: "랜딩은 질문과 가치에 집중하고, 딥다이브는 보드 순서와 모듈 근거를 상세히 보여줍니다.",
  },
] as const satisfies PublicSiteContent["landingScenes"];

const decisionSurfaces = [
  {
    title: architectureContent.axes[0].title,
    summary: "Playwright, BeautifulSoup, Gemini를 통해 경쟁 카드 이벤트 변화를 읽고 운영 브리핑으로 전달합니다.",
  },
  {
    title: architectureContent.axes[1].title,
    summary: "PDF/HTML extraction, ChromaDB, RAG를 통해 상품 설명서와 공시를 검색 가능한 지식으로 전환합니다.",
  },
  {
    title: "공유 전달면",
    summary: "FastAPI, SQLite, SQLAlchemy를 통해 브리핑과 분석 화면이 같은 결과를 소비하도록 연결합니다.",
  },
] as const satisfies PublicSiteContent["decisionSurfaces"];

const valueCards = [
  {
    title: "의사결정 흐름이 짧아집니다",
    summary: "같은 보드 순서와 같은 복사 계약을 사용해 발표와 운영 판단이 한 언어로 이어집니다.",
  },
  {
    title: "근거 추적이 쉬워집니다",
    summary: "모듈 맵에서 구현된 경로와 승인된 설계를 함께 읽어 현재 상태를 바로 설명할 수 있습니다.",
  },
  {
    title: "랜딩에서 딥다이브로 자연스럽게 넘어갑니다",
    summary: "랜딩은 가치와 장면 순서를 보여주고, 딥다이브는 실제 처리 축과 모듈 근거를 이어서 설명합니다.",
  },
] as const satisfies PublicSiteContent["valueCards"];

const publicSiteContent = {
  copy,
  snapshotMeta,
  navigation,
  hero,
  landingScenes,
  decisionSurfaces,
  valueCards,
} as const satisfies PublicSiteContent;

export const siteContent: LegacySiteContent = defineHidden(
  defineHidden(publicSiteContent, "snapshot", snapshotMeta),
  "showroom",
  {
    hero: {
      intro:
        "이 사이트는 두 개의 인텔리전스 축이 왜 분리되어야 하는지와, 그 결과가 어떤 전달면으로 이어지는지를 첫 화면부터 설명합니다.",
    },
    problem: {
      eyebrow: "질문 분리",
      title: "서로 다른 속도의 질문을 같은 흐름으로 섞지 않습니다",
      summary: "시장의 빠른 이벤트 변화와 상품 문서의 느린 근거 축을 분리해 해석 품질과 추적 가능성을 지킵니다.",
      cards: [
        {
          title: "이벤트 신호",
          description: "경쟁 카드 이벤트는 빠르게 변하므로 수집과 해석의 리듬이 짧아야 합니다.",
        },
        {
          title: "상품 근거",
          description: "상품 설명서와 공시는 설명 가능한 원문 근거를 오래 유지해야 합니다.",
        },
      ],
    },
    signalFlow: {
      eyebrow: "핵심 흐름",
      title: "신호를 근거와 전달면으로 연결합니다",
      summary: "수집에서 전달까지의 흐름을 이벤트 해석 축 기준으로 먼저 보여주고, 동일한 구조를 상품 지식 축에도 적용합니다.",
    },
    orchestration: {
      eyebrow: "공유 전달면",
      title: "두 축은 같은 의사결정 표면으로 수렴합니다",
      summary: "오케스트레이션은 분리된 질문을 유지하면서도 운영자가 보는 결과 화면은 하나의 언어로 맞춥니다.",
      sharedDeliveryLabel: "공유 전달면",
      sharedDeliverySummary:
        "브리핑, 분석, 발표 화면이 같은 구조 결과를 소비하도록 정렬하면 전달 비용이 줄고 설명 가능성이 올라갑니다.",
    },
    outcomes: {
      eyebrow: "시스템 가치",
      title: "근거와 재사용성이 남는 구조를 선택합니다",
      summary: "결과 화면만 예쁘게 만드는 대신, 같은 결과를 여러 표면에서 다시 설명할 수 있는 구조를 강조합니다.",
      cards: valueCards.map((card) => ({
        title: card.title,
        description: card.summary,
      })),
    },
    deepDiveCta: {
      eyebrow: "딥다이브 이동",
      title: "실제 보드 순서와 모듈 근거를 이어서 확인합니다",
      summary: "딥다이브는 랜딩에서 소개한 축과 전달면이 실제 모듈 구조에서 어떻게 드러나는지 보여줍니다.",
      supportingCopy:
        "공개 계약은 좁게 유지하되, 현재 컴포넌트가 읽는 보조 문맥은 숨겨진 호환 계층으로 남겨 두었습니다.",
      cta: {
        label: "아키텍처 딥다이브 보기",
        href: hero.primaryCta.href,
      },
    },
  },
);
