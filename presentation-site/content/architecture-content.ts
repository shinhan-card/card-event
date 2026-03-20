export type EvidenceLevel = "implemented" | "approved";

export type BoardKey =
  | "executive-blueprint"
  | "dual-axis-macro"
  | "event-interpretation"
  | "product-knowledge"
  | "orchestration-control"
  | "evidence-module-map"
  | "principles-evolution";

export type EventInterpretationStepKey =
  | "collect"
  | "extract"
  | "structure"
  | "rule-interpretation"
  | "gemini-augmentation"
  | "briefing-summary"
  | "deliver";

export type ProductKnowledgeStepKey =
  | "collect-sources"
  | "store-raw"
  | "clean-document"
  | "chunk"
  | "embed"
  | "store-vector"
  | "retrieve-rag"
  | "compose-response"
  | "deliver";

export interface SnapshotMeta {
  label: string;
  capturedOn: string;
  note: string;
}

export interface ExecutiveAtlasCopy {
  productName: string;
  deckTitle: string;
  navigation: {
    overview: string;
    architecture: string;
    evidence: string;
    roadmap: string;
  };
  evidence: {
    implemented: string;
    approved: string;
  };
  axes: {
    event: string;
    product: string;
    delivery: string;
  };
  boards: Record<BoardKey, string>;
  cta: {
    deepDive: string;
    executiveSummary: string;
  };
}

export interface ArchitectureAxis {
  key: "event-axis" | "product-axis";
  title: string;
  summary: string;
  question: string;
  badges: readonly string[];
}

export interface BlueprintBoard {
  key: BoardKey;
  title: string;
  summary: string;
  output: string;
  badges: readonly string[];
}

export interface FlowStep<Key extends string> {
  key: Key;
  title: string;
  summary: string;
  badges: readonly string[];
}

export interface OrchestrationColumn {
  key: string;
  title: string;
  summary: string;
  responsibilities: readonly string[];
  badges: readonly string[];
}

export interface PrincipleItem {
  key: string;
  title: string;
  summary: string;
}

export interface RoadmapPhase {
  key: string;
  title: string;
  summary: string;
}

export interface ArchitectureContent {
  copy: ExecutiveAtlasCopy;
  boardOrder: readonly BoardKey[];
  axes: readonly ArchitectureAxis[];
  executiveBlueprint: {
    eyebrow: string;
    title: string;
    summary: string;
    boards: readonly BlueprintBoard[];
  };
  eventInterpretation: {
    title: string;
    summary: string;
    steps: readonly FlowStep<EventInterpretationStepKey>[];
  };
  productKnowledge: {
    title: string;
    summary: string;
    steps: readonly FlowStep<ProductKnowledgeStepKey>[];
  };
  orchestrationColumns: readonly OrchestrationColumn[];
  principles: {
    title: string;
    summary: string;
    items: readonly PrincipleItem[];
  };
  roadmap: {
    title: string;
    summary: string;
    phases: readonly RoadmapPhase[];
  };
}

export const snapshotMeta = {
  label: "스냅샷 기준",
  capturedOn: "2026-03-20",
  note: "1번 작업 승인 스펙을 기준으로 프레젠테이션 계약을 재정의했고, 현재 브랜치 구현 여부는 증거 등급으로 구분했습니다."
} as const satisfies SnapshotMeta;

export const executiveAtlasCopy = {
  productName: "카드 이벤트 인텔리전스",
  deckTitle: "실행 아틀라스",
  navigation: {
    overview: "개요",
    architecture: "아키텍처",
    evidence: "근거 모듈 맵",
    roadmap: "로드맵"
  },
  evidence: {
    implemented: "구현됨",
    approved: "승인된 설계"
  },
  axes: {
    event: "이벤트 해석 축",
    product: "상품 지식 축",
    delivery: "공유 전달면"
  },
  boards: {
    "executive-blueprint": "이그제큐티브 블루프린트",
    "dual-axis-macro": "듀얼 축 매크로",
    "event-interpretation": "이벤트 해석",
    "product-knowledge": "상품 지식",
    "orchestration-control": "오케스트레이션 제어",
    "evidence-module-map": "근거 모듈 맵",
    "principles-evolution": "원칙과 진화"
  },
  cta: {
    deepDive: "딥다이브 보기",
    executiveSummary: "핵심 흐름 요약 보기"
  }
} as const satisfies ExecutiveAtlasCopy;

const boardOrder = [
  "executive-blueprint",
  "dual-axis-macro",
  "event-interpretation",
  "product-knowledge",
  "orchestration-control",
  "evidence-module-map",
  "principles-evolution"
] as const satisfies readonly BoardKey[];

const axes = [
  {
    key: "event-axis",
    title: executiveAtlasCopy.axes.event,
    summary:
      "카드사 이벤트를 수집하고, 조건과 혜택을 구조화한 뒤, 규칙과 Gemini 해석으로 운영 판단을 돕는 축입니다.",
    question: "지금 어떤 이벤트가 왜 중요한지, 운영자가 바로 읽을 수 있게 만들 수 있는가?",
    badges: ["Playwright", "BeautifulSoup", "Gemini"]
  },
  {
    key: "product-axis",
    title: executiveAtlasCopy.axes.product,
    summary:
      "상품 설명서와 공시 문서를 PDF/HTML extraction으로 정제하고, RAG 질의가 가능한 지식 축으로 바꾸는 흐름입니다.",
    question: "상품 근거 문서에서 비교 가능한 사실과 응답 가능한 지식을 어떻게 누적할 것인가?",
    badges: ["PDF/HTML extraction", "RAG", "ChromaDB"]
  }
] as const satisfies readonly ArchitectureAxis[];

const executiveBlueprintBoards = [
  {
    key: "executive-blueprint",
    title: executiveAtlasCopy.boards["executive-blueprint"],
    summary: "의사결정자가 전체 판을 한 장에서 읽도록, 입력 축과 전달면을 먼저 정렬합니다.",
    output: "핵심 질문, 입력 소스, 전달 결과를 한눈에 보여주는 첫 보드",
    badges: ["FastAPI", "실행 아틀라스"]
  },
  {
    key: "dual-axis-macro",
    title: executiveAtlasCopy.boards["dual-axis-macro"],
    summary: "이벤트 해석 축과 상품 지식 축이 왜 분리돼야 하는지 거시 흐름으로 설명합니다.",
    output: "두 축의 질문과 기술 스택을 구분하는 시야 확보",
    badges: ["Playwright", "RAG"]
  },
  {
    key: "event-interpretation",
    title: executiveAtlasCopy.boards["event-interpretation"],
    summary: "수집부터 브리핑 요약까지 이벤트 해석 파이프라인을 단계별로 보여줍니다.",
    output: "운영용 이벤트 브리핑과 해석 단계의 책임 경계",
    badges: ["BeautifulSoup", "Gemini"]
  },
  {
    key: "product-knowledge",
    title: executiveAtlasCopy.boards["product-knowledge"],
    summary: "상품 문서가 검색 가능한 지식과 응답으로 바뀌는 제품 축 흐름을 설명합니다.",
    output: "상품 근거 문서, 벡터 저장소, 응답 조합의 연결 구조",
    badges: ["ChromaDB", "RAG"]
  },
  {
    key: "orchestration-control",
    title: executiveAtlasCopy.boards["orchestration-control"],
    summary: "스케줄링, 저장, API 전달이 두 축을 어떻게 조율하는지 보여줍니다.",
    output: "운영 제어면과 파이프라인 제어면의 역할 정리",
    badges: ["APScheduler", "SQLite", "SQLAlchemy"]
  },
  {
    key: "evidence-module-map",
    title: executiveAtlasCopy.boards["evidence-module-map"],
    summary: "실구현 파일과 승인 스펙 파일을 증거 등급으로 분리해 근거를 정직하게 드러냅니다.",
    output: "구현됨과 승인된 설계가 공존하는 모듈 증거판",
    badges: ["FastAPI", "PDF/HTML extraction"]
  },
  {
    key: "principles-evolution",
    title: executiveAtlasCopy.boards["principles-evolution"],
    summary: "왜 이 구조를 유지해야 하는지와 앞으로 어떤 확장을 허용할지 연결합니다.",
    output: "설계 원칙과 로드맵의 연결 고리",
    badges: ["Gemini", "RAG"]
  }
] as const satisfies readonly BlueprintBoard[];

const eventInterpretationSteps = [
  {
    key: "collect",
    title: "이벤트 소스 수집",
    summary: "Playwright 기반 커넥터가 카드사 이벤트 페이지를 주기적으로 방문해 원본 신호를 확보합니다.",
    badges: ["Playwright", "APScheduler"]
  },
  {
    key: "extract",
    title: "본문 추출",
    summary: "BeautifulSoup와 PDF/HTML extraction으로 페이지 본문과 첨부 문서에서 읽을 수 있는 텍스트를 꺼냅니다.",
    badges: ["BeautifulSoup", "PDF/HTML extraction"]
  },
  {
    key: "structure",
    title: "조건 구조화",
    summary: "혜택 기간, 대상, 조건, 채널 정보를 SQLite와 SQLAlchemy 스키마에 맞는 사실 단위로 정리합니다.",
    badges: ["SQLite", "SQLAlchemy"]
  },
  {
    key: "rule-interpretation",
    title: "규칙 해석",
    summary: "규칙 엔진이 이벤트 조건을 해석해 운영 리스크와 비교 포인트를 먼저 고정합니다.",
    badges: ["규칙 엔진", "FastAPI"]
  },
  {
    key: "gemini-augmentation",
    title: "Gemini 보강",
    summary: "Gemini가 규칙 기반 결과에 맥락 문장과 운영 인사이트를 덧붙여 브리핑 품질을 끌어올립니다.",
    badges: ["Gemini", "인사이트"]
  },
  {
    key: "briefing-summary",
    title: "브리핑 요약",
    summary: "운영자가 바로 읽을 수 있는 일일 브리핑 요약으로 정리해 공유 전달면에 넘깁니다.",
    badges: ["FastAPI", "브리핑"]
  },
  {
    key: "deliver",
    title: "운영 전달",
    summary: "대시보드와 발표 화면으로 연결해 이벤트 해석 결과를 빠르게 소비할 수 있게 합니다.",
    badges: ["FastAPI", "대시보드"]
  }
] as const satisfies readonly FlowStep<EventInterpretationStepKey>[];

const productKnowledgeSteps = [
  {
    key: "collect-sources",
    title: "상품 소스 수집",
    summary: "상품 설명서, 공시, 상세 안내 링크를 수집 대상 큐로 모읍니다.",
    badges: ["FastAPI", "상품 링크"]
  },
  {
    key: "store-raw",
    title: "원문 저장",
    summary: "수집한 PDF와 HTML 원문을 나중에 재검증할 수 있도록 저장합니다.",
    badges: ["SQLite", "SQLAlchemy"]
  },
  {
    key: "clean-document",
    title: "문서 정제",
    summary: "PDF/HTML extraction으로 문서 노이즈를 줄이고 비교 가능한 본문 단위로 정돈합니다.",
    badges: ["PDF/HTML extraction", "BeautifulSoup"]
  },
  {
    key: "chunk",
    title: "청크 분할",
    summary: "질의 가능한 길이로 문서를 나누고, 섹션 맥락을 잃지 않도록 청크 메타데이터를 붙입니다.",
    badges: ["RAG", "청크 분할"]
  },
  {
    key: "embed",
    title: "임베딩 생성",
    summary: "검색 가능한 의미 벡터를 만들어 질의 응답의 회수 품질을 올립니다.",
    badges: ["Gemini", "임베딩"]
  },
  {
    key: "store-vector",
    title: "벡터 저장",
    summary: "ChromaDB에 문서 청크와 메타데이터를 저장해 상품 지식 축의 검색 기반을 만듭니다.",
    badges: ["ChromaDB", "RAG"]
  },
  {
    key: "retrieve-rag",
    title: "RAG 검색",
    summary: "질문에 맞는 근거 청크를 골라 응답 구성에 필요한 증거를 되돌려줍니다.",
    badges: ["RAG", "검색기"]
  },
  {
    key: "compose-response",
    title: "응답 조합",
    summary: "검색 결과와 상품 맥락을 묶어 설명 가능한 상품 응답으로 조합합니다.",
    badges: ["Gemini", "FastAPI"]
  },
  {
    key: "deliver",
    title: "지식 전달",
    summary: "운영 화면과 발표 자료에서 상품 근거를 그대로 추적할 수 있는 응답으로 전달합니다.",
    badges: ["FastAPI", "상품 지식"]
  }
] as const satisfies readonly FlowStep<ProductKnowledgeStepKey>[];

const orchestrationColumns = [
  {
    key: "control-plane",
    title: "제어면",
    summary: "스케줄과 API 라우팅을 조율해 두 축이 같은 리듬으로 움직이도록 합니다.",
    responsibilities: ["수집 타이밍 제어", "실행 상태 추적", "호출 경로 정리"],
    badges: ["APScheduler", "FastAPI"]
  },
  {
    key: "event-axis",
    title: "이벤트 해석 처리면",
    summary: "Playwright 수집, BeautifulSoup 추출, Gemini 보강으로 이벤트 해석 축을 완성합니다.",
    responsibilities: ["이벤트 수집", "조건 추출", "운영 인사이트 보강"],
    badges: ["Playwright", "BeautifulSoup", "Gemini"]
  },
  {
    key: "product-axis",
    title: "상품 지식 처리면",
    summary: "문서 정제, 임베딩, ChromaDB 저장, RAG 검색으로 상품 지식 축을 유지합니다.",
    responsibilities: ["문서 정제", "벡터 저장", "근거 검색"],
    badges: ["PDF/HTML extraction", "ChromaDB", "RAG"]
  },
  {
    key: "delivery-surface",
    title: executiveAtlasCopy.axes.delivery,
    summary: "SQLite와 SQLAlchemy 기반 상태를 FastAPI 화면과 브리핑으로 전달해 운영 사용성을 만듭니다.",
    responsibilities: ["브리핑 제공", "대시보드 제공", "발표용 내러티브 제공"],
    badges: ["FastAPI", "SQLite", "SQLAlchemy"]
  }
] as const satisfies readonly OrchestrationColumn[];

const principleItems = [
  {
    key: "separate-questions",
    title: "질문이 다른 축은 분리한다",
    summary: "이벤트 해석은 지금 일어나는 변화에 답하고, 상품 지식은 문서 근거와 비교 응답에 답합니다."
  },
  {
    key: "evidence-first",
    title: "항상 근거가 먼저다",
    summary: "브리핑 문장보다 먼저 구조화된 사실과 추적 가능한 근거 파일 경로를 확보합니다."
  },
  {
    key: "honest-status",
    title: "구현 상태를 숨기지 않는다",
    summary: "현재 브랜치에 없는 항목도 승인된 설계로 유지해, 승인 스펙과 구현 간격을 드러냅니다."
  }
] as const satisfies readonly PrincipleItem[];

const roadmapPhases = [
  {
    key: "phase-1",
    title: "축 계약 고정",
    summary: "사이트와 딥다이브가 같은 문구 계약과 같은 보드 순서를 소비하도록 먼저 고정합니다."
  },
  {
    key: "phase-2",
    title: "모듈 근거 연결",
    summary: "실구현 파일과 승인된 라우터/모듈 경로를 증거 등급으로 나눠 모듈 맵을 유지합니다."
  },
  {
    key: "phase-3",
    title: "백엔드 실체화",
    summary: "승인 상태의 라우터, RAG, 브리핑 경로가 실제 코드로 채워지면 즉시 구현됨으로 승격합니다."
  }
] as const satisfies readonly RoadmapPhase[];

export const architectureContent = {
  copy: executiveAtlasCopy,
  boardOrder,
  axes,
  executiveBlueprint: {
    eyebrow: "보드 순서",
    title: "의사결정자를 위한 이그제큐티브 블루프린트",
    summary:
      "한 장의 아틀라스에서 먼저 보여줘야 할 보드 순서를 고정해, 발표 흐름과 구현 흐름이 같은 방향으로 읽히게 합니다.",
    boards: executiveBlueprintBoards
  },
  eventInterpretation: {
    title: "이벤트 해석 축",
    summary:
      "이벤트 신호를 수집하고, 조건을 해석하고, 운영 브리핑으로 전달하는 흐름을 단계별로 설명합니다.",
    steps: eventInterpretationSteps
  },
  productKnowledge: {
    title: "상품 지식 축",
    summary:
      "상품 문서를 저장 가능한 사실과 검색 가능한 지식으로 바꿔, RAG 응답과 근거 추적이 가능한 구조를 만듭니다.",
    steps: productKnowledgeSteps
  },
  orchestrationColumns,
  principles: {
    title: "설계 원칙",
    summary: "프레젠테이션이 예쁘게 보이는 것보다, 구조와 상태를 정확하게 드러내는 것을 우선합니다.",
    items: principleItems
  },
  roadmap: {
    title: "진화 로드맵",
    summary: "현재 브랜치의 구현 상태를 유지하면서도 승인 스펙이 향후 어디까지 확장될지 보여줍니다.",
    phases: roadmapPhases
  }
} as const satisfies ArchitectureContent;
