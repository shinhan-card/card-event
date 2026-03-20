import { snapshotMetadata } from "@/content/architecture-content";
import type { SnapshotMetadata } from "@/content/architecture-content";

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
  snapshot: SnapshotMetadata;
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
  label: "딥다이브 보기"
} as const;

export const siteContent = {
  snapshot: snapshotMetadata,
  hero: {
    eyebrow: "발표 프리뷰",
    title: "이벤트와 공시 인텔리전스를 한 화면에, 그러나 같은 축으로는 섞지 않게",
    summary:
      "랜딩 페이지는 이벤트 인텔리전스와 상품 / 공시 인텔리전스를 한국어 중심으로 소개하고, 수집부터 브리핑까지의 구조를 짧게 예고합니다.",
    primaryCta: openDeepDiveCta,
    secondaryCta: {
      href: "#problem",
      label: "문제부터 보기"
    }
  },
  showroom: {
    hero: {
      intro:
        "이 발표는 같은 쇼룸 안에 두 축을 올려두지만, 흐름은 절대 하나로 뭉개지지 않게 구성합니다. 첫 화면부터 이벤트 축과 상품 / 공시 축의 질문이 다르다는 점을 보여주는 것이 핵심입니다."
    },
    problem: {
      eyebrow: "문제 정의",
      title: "시장 신호와 상품 근거가 서로 다른 이유를 먼저 보여줘야 합니다",
      summary:
        "한 축은 경쟁 이벤트의 움직임을 따라가고, 다른 축은 실제 상품과 공시 문서를 구조화합니다. 두 문제를 같은 카드 뉴스처럼 보여주면 전달력이 떨어집니다.",
      cards: [
        {
          title: "이벤트 신호의 혼잡함",
          description:
            "출시, 할인, 프로모션, 앱 변화 같은 움직임은 빠르지만 느슨한 신호로 들어오므로 별도의 수집과 해석이 필요합니다."
        },
        {
          title: "상품 / 공시 근거의 깊이",
          description:
            "상품 연구는 PDF, 공시, 안내 문서, HTML 본문을 길게 읽어야 하므로 추출과 검색 구조가 따로 필요합니다."
        }
      ]
    },
    signalFlow: {
      eyebrow: "작동 흐름",
      title: "수집 -> 추출 -> 정규화 -> 강화 -> 전달",
      summary: "영문 카드 나열이 아니라 실제 처리 단계를 한국어 레일과 기술 배지로 보여줍니다."
    },
    outcomes: {
      eyebrow: "운영 결과",
      title: "마지막에는 사람이 바로 판단할 수 있는 전달면이 남아야 합니다",
      summary:
        "좋은 파이프라인은 요약 한 줄이 아니라 증거, 맥락, 비교 가능 구조, 그리고 브리핑 가능한 결과를 남깁니다.",
      cards: [
        {
          title: "더 빠른 운영 검토",
          description:
            "수집과 인사이트의 책임선이 보이면 운영자는 원문과 해석을 오가며 훨씬 빠르게 판단할 수 있습니다."
        },
        {
          title: "더 깨끗한 근거 추적",
          description:
            "각 결과가 어떤 HTML/PDF 증거와 어떤 해석 단계에서 만들어졌는지 발표 화면에서도 읽히게 됩니다."
        },
        {
          title: "재사용 가능한 출력",
          description:
            "같은 구조 결과를 대시보드, 브리핑, 후속 자동화, 발표 자료에 다시 쓸 수 있습니다."
        }
      ]
    },
    orchestration: {
      eyebrow: "오케스트레이션",
      title: "공유 런타임은 유지하되 두 축의 책임은 끝까지 분리합니다",
      summary:
        "실행 스케줄, 저장, 강화, 전달은 하나의 런타임에서 조율하지만 이벤트 축과 상품 / 공시 축은 다른 레인으로 남겨둡니다.",
      sharedDeliveryLabel: "공유 전달면",
      sharedDeliverySummary:
        "브리핑, 애널리틱스, 발표 사이트는 두 축의 구조 결과를 같은 인터페이스로 받되, 생성 경로는 명확히 구분됩니다."
    },
    deepDiveCta: {
      eyebrow: "딥다이브",
      title: "이제 개념 설명을 넘어서 실제 구조도로 들어갑니다",
      summary:
        "랜딩은 문제와 흐름을 소개하는 곳까지입니다. 딥다이브에서는 실제 기술, 축 분리, 모듈 책임, 오케스트레이션 흐름을 한층 더 구조적으로 펼칩니다.",
      supportingCopy:
        "다음 화면에서는 Playwright, Gemini, FastAPI, APScheduler, SQLite, SQLAlchemy 같은 실제 기술이 어느 단계에 놓이는지와 상품 / 공시 축의 승인된 RAG 구조까지 함께 확인할 수 있습니다.",
      cta: {
        href: "/deep-dive",
        label: "아키텍처 딥다이브로 이동"
      }
    }
  },
  landingScenes: [
    {
      key: "hero",
      title: "히어로",
      summary: "두 인텔리전스 축을 발표 첫 화면에서 분리해 보이게 만드는 장면입니다."
    },
    {
      key: "problem",
      title: "문제 정의",
      summary: "이벤트 신호와 상품 / 공시 근거가 왜 별도 처리되어야 하는지 설명합니다."
    },
    {
      key: "signal-flow",
      title: "신호 흐름",
      summary: "수집부터 전달까지 실제 처리 단계를 레일 구조로 소개합니다."
    },
    {
      key: "outcomes",
      title: "운영 결과",
      summary: "구조화된 출력이 어떤 운영 가치로 이어지는지 보여줍니다."
    },
    {
      key: "orchestration",
      title: "오케스트레이션",
      summary: "공유 런타임과 축별 책임 경계를 동시에 소개합니다."
    },
    {
      key: "deep-dive-cta",
      title: "딥다이브 CTA",
      summary: "실제 구조도와 기술 레이어로 넘어가는 명확한 전환 장면입니다."
    }
  ]
} as const satisfies SiteContent;
