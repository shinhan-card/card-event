import { executiveAtlasCopy, snapshotMeta } from "@/content/architecture-content";
import type { ExecutiveAtlasCopy, SnapshotMeta } from "@/content/architecture-content";

export interface NavigationItem {
  key: string;
  label: string;
  href: string;
}

export interface LandingScene {
  key: string;
  title: string;
  summary: string;
}

export interface DecisionSurface {
  key: string;
  title: string;
  summary: string;
  evidenceLabel: string;
}

export interface ValueCard {
  key: string;
  title: string;
  description: string;
}

export interface SiteContent {
  copy: ExecutiveAtlasCopy;
  snapshotMeta: SnapshotMeta;
  navigation: readonly NavigationItem[];
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
    badges: readonly string[];
  };
  landingScenes: readonly LandingScene[];
  decisionSurfaces: readonly DecisionSurface[];
  valueCards: readonly ValueCard[];
}

const navigation = [
  {
    key: "overview",
    label: executiveAtlasCopy.navigation.overview,
    href: "/"
  },
  {
    key: "architecture",
    label: executiveAtlasCopy.navigation.architecture,
    href: "/deep-dive"
  },
  {
    key: "evidence",
    label: executiveAtlasCopy.navigation.evidence,
    href: "/deep-dive#module-map"
  },
  {
    key: "roadmap",
    label: executiveAtlasCopy.navigation.roadmap,
    href: "/deep-dive#roadmap"
  }
] as const satisfies readonly NavigationItem[];

const landingScenes = [
  {
    key: "executive-blueprint",
    title: executiveAtlasCopy.boards["executive-blueprint"],
    summary: "첫 화면에서 두 축과 전달면을 함께 보여주며, 발표의 읽기 순서를 고정합니다."
  },
  {
    key: "dual-axis-macro",
    title: executiveAtlasCopy.boards["dual-axis-macro"],
    summary: "이벤트 해석 축과 상품 지식 축이 왜 다른 질문에 답하는지 큰 그림으로 설명합니다."
  },
  {
    key: "evidence-module-map",
    title: executiveAtlasCopy.boards["evidence-module-map"],
    summary: "실구현과 승인 스펙을 같은 지도 안에서 증거 등급으로 정직하게 구분합니다."
  }
] as const satisfies readonly LandingScene[];

const decisionSurfaces = [
  {
    key: "event-axis",
    title: executiveAtlasCopy.axes.event,
    summary: "Playwright, BeautifulSoup, Gemini로 이벤트 신호를 수집하고 운영 브리핑으로 요약합니다.",
    evidenceLabel: executiveAtlasCopy.evidence.implemented
  },
  {
    key: "product-axis",
    title: executiveAtlasCopy.axes.product,
    summary: "PDF/HTML extraction, ChromaDB, RAG로 상품 근거 문서를 검색 가능한 지식으로 바꿉니다.",
    evidenceLabel: executiveAtlasCopy.evidence.approved
  },
  {
    key: "delivery-surface",
    title: executiveAtlasCopy.axes.delivery,
    summary: "FastAPI, SQLite, SQLAlchemy를 통해 운영 화면과 발표 내러티브가 같은 상태를 소비합니다.",
    evidenceLabel: executiveAtlasCopy.evidence.implemented
  }
] as const satisfies readonly DecisionSurface[];

const valueCards = [
  {
    key: "executive-clarity",
    title: "의사결정 흐름이 짧아집니다",
    description: "보드 순서와 축 구분이 고정돼 있어, 발표와 운영 판단이 같은 언어로 이어집니다."
  },
  {
    key: "evidence-trace",
    title: "근거 추적이 쉬워집니다",
    description: "어떤 파일이 이미 구현됐는지, 어떤 경로가 승인만 된 상태인지 증거 등급으로 바로 확인할 수 있습니다."
  },
  {
    key: "roadmap-honesty",
    title: "확장 계획이 솔직해집니다",
    description: "현재 브랜치의 한계를 숨기지 않으면서도 승인 스펙이 요구하는 다음 단계까지 연결합니다."
  }
] as const satisfies readonly ValueCard[];

export const siteContent = {
  copy: executiveAtlasCopy,
  snapshotMeta,
  navigation,
  hero: {
    eyebrow: "프레젠테이션 사이트",
    title: "두 개의 인텔리전스 축을 한 장의 실행 지도에 올립니다",
    summary:
      "랜딩 화면은 이벤트 해석 축, 상품 지식 축, 공유 전달면을 같은 보드 순서로 소개해 발표와 구현 계약이 함께 읽히도록 설계했습니다.",
    primaryCta: {
      label: executiveAtlasCopy.cta.deepDive,
      href: "/deep-dive"
    },
    secondaryCta: {
      label: executiveAtlasCopy.cta.executiveSummary,
      href: "/deep-dive#executive-blueprint"
    },
    badges: ["Playwright", "Gemini", "RAG", "FastAPI"]
  },
  landingScenes,
  decisionSurfaces,
  valueCards
} as const satisfies SiteContent;
