import { architectureContent } from "@/content/architecture-content";

type SiteContent = {
  copy: typeof architectureContent.copy;
  snapshotMeta: {
    label: string;
    capturedOn: string;
    note: string;
  };
  navigation: readonly {
    key: string;
    label: string;
    href: string;
  }[];
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    primaryCta: {
      label: string;
      href: string;
    };
    secondaryCta: {
      label: string;
      href: string;
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
    title: string;
    summary: string;
  }[];
  decisionSurfaces: readonly {
    key: string;
    title: string;
    summary: string;
  }[];
  valueCards: readonly {
    key: string;
    title: string;
    description: string;
  }[];
};

const copy = architectureContent.copy;

const snapshotMeta = {
  label: "스냅샷 기준",
  capturedOn: "2026-03-20",
  note: "1번 작업 계약을 기준으로 랜딩과 딥다이브의 공개 스키마를 정렬했습니다."
} as const satisfies SiteContent["snapshotMeta"];

const navigation = [
  {
    key: "overview",
    label: copy.navOverview,
    href: "/"
  },
  {
    key: "architecture",
    label: copy.navArchitecture,
    href: "/deep-dive"
  },
  {
    key: "evidence",
    label: copy.navEvidence,
    href: "/deep-dive#module-map"
  },
  {
    key: "roadmap",
    label: copy.navRoadmap,
    href: "/deep-dive#roadmap"
  }
] as const satisfies SiteContent["navigation"];

const landingScenes = [
  {
    key: "thesis",
    title: "두 개의 인텔리전스 축을 한 장의 지도에 올립니다",
    summary: "첫 장면에서 이벤트 인텔리전스와 상품 지식 인텔리전스를 함께 제시하되, 질문은 섞지 않습니다."
  },
  {
    key: "tension",
    title: "시장 신호와 상품 근거는 다른 속도로 움직입니다",
    summary: "이벤트는 빠른 변화 신호를 다루고, 상품 지식은 긴 문서 근거를 다루기 때문에 다른 처리 축이 필요합니다."
  },
  {
    key: "dual-engine",
    title: "듀얼 엔진 구조로 수집과 해석을 분리합니다",
    summary: "이벤트 해석 엔진과 상품 지식 엔진이 같은 전달면으로 합류하지만, 처리 레인은 끝까지 분리됩니다."
  },
  {
    key: "decision-surfaces",
    title: "운영 판단이 필요한 화면만 남깁니다",
    summary: "브리핑, 분석, 발표 화면이 같은 구조 결과를 소비하도록 정렬해 의사결정 흐름을 짧게 만듭니다."
  },
  {
    key: "system-value",
    title: "가치는 근거 추적과 재사용성에서 나옵니다",
    summary: "어떤 근거가 어떤 응답으로 이어졌는지 설명 가능해야 시스템 가치가 유지됩니다."
  },
  {
    key: "deep-dive-handoff",
    title: "딥다이브에서 실제 모듈 경계와 증거 수준을 확인합니다",
    summary: "랜딩은 질문과 가치에 집중하고, 딥다이브는 보드 순서와 모듈 근거를 상세히 보여줍니다."
  }
] as const satisfies SiteContent["landingScenes"];

const decisionSurfaces = [
  {
    key: "event-intelligence",
    title: copy.eventAxisLabel,
    summary: "Playwright, BeautifulSoup, Gemini를 사용해 경쟁 카드 이벤트 변화를 읽고 운영 브리핑으로 전달합니다."
  },
  {
    key: "product-intelligence",
    title: copy.productAxisLabel,
    summary: "PDF/HTML extraction, ChromaDB, RAG를 사용해 상품 설명서와 공시를 검색 가능한 지식으로 전환합니다."
  },
  {
    key: "delivery-surface",
    title: copy.deliverySurfaceLabel,
    summary: "FastAPI, SQLite, SQLAlchemy를 통해 브리핑과 분석 화면이 같은 결과를 소비하도록 연결합니다."
  }
] as const satisfies SiteContent["decisionSurfaces"];

const valueCards = [
  {
    key: "clarity",
    title: "의사결정 흐름이 짧아집니다",
    description: "같은 보드 순서와 같은 복사 계약을 사용해 발표와 운영 판단이 한 언어로 이어집니다."
  },
  {
    key: "traceability",
    title: "근거 추적이 쉬워집니다",
    description: "모듈 맵에서 구현됨과 승인된 설계를 구분해, 어떤 경로가 실제 코드인지 바로 설명할 수 있습니다."
  },
  {
    key: "handoff",
    title: "랜딩에서 딥다이브로 자연스럽게 넘어갑니다",
    description: "랜딩은 가치와 장면 순서를 보여주고, 딥다이브는 실제 처리 축과 모듈 근거를 이어서 설명합니다."
  }
] as const satisfies SiteContent["valueCards"];

export const siteContent = {
  copy,
  snapshotMeta,
  navigation,
  hero: {
    eyebrow: "프레젠테이션 사이트",
    title: "카드 이벤트 인텔리전스를 실행 지도처럼 보여줍니다",
    summary:
      "랜딩은 질문의 축, 전달면, 시스템 가치를 먼저 정리해 의사결정자가 왜 이 구조가 필요한지 빠르게 이해하도록 돕습니다.",
    primaryCta: {
      label: copy.heroPrimaryCta,
      href: "/deep-dive"
    },
    secondaryCta: {
      label: copy.heroSecondaryCta,
      href: "/deep-dive#executive-blueprint"
    }
  },
  landingScenes,
  decisionSurfaces,
  valueCards
} as const satisfies SiteContent;
