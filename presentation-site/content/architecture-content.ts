type BoardKey =
  | "executive-blueprint"
  | "dual-axis-macro"
  | "event-interpretation"
  | "product-knowledge"
  | "orchestration-control"
  | "evidence-module-map"
  | "principles-evolution";

type AxisKey = "event-intelligence" | "product-intelligence";

type EventInterpretationStepKey =
  | "collect"
  | "extract"
  | "structure"
  | "rule-interpretation"
  | "gemini-augmentation"
  | "briefing-summary"
  | "deliver";

type ProductKnowledgeStepKey =
  | "collect-sources"
  | "store-raw"
  | "clean-document"
  | "chunk"
  | "embed"
  | "store-vector"
  | "retrieve-rag"
  | "compose-response"
  | "deliver";

type CopyContract = {
  productName: string;
  deckTitle: string;
  navOverview: string;
  navArchitecture: string;
  navEvidence: string;
  navRoadmap: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  eventAxisLabel: string;
  productAxisLabel: string;
  deliverySurfaceLabel: string;
  evidenceImplemented: string;
  evidenceApproved: string;
  boardExecutiveBlueprint: string;
  boardDualAxisMacro: string;
  boardEventInterpretation: string;
  boardProductKnowledge: string;
  boardOrchestrationControl: string;
  boardEvidenceModuleMap: string;
  boardPrinciplesEvolution: string;
};

type ArchitectureContent = {
  copy: CopyContract;
  boardOrder: readonly BoardKey[];
  axes: readonly {
    key: AxisKey;
    title: string;
    question: string;
    technologyBadges: readonly string[];
  }[];
  executiveBlueprint: {
    inputLanes: readonly { title: string; summary: string }[];
    processingLanes: readonly { title: string; summary: string }[];
    deliverySurface: { title: string; summary: string };
    technologyBadges: readonly string[];
  };
  eventInterpretation: {
    steps: readonly {
      key: EventInterpretationStepKey;
      title: string;
      summary: string;
      technologies: readonly string[];
      output: string;
    }[];
  };
  productKnowledge: {
    steps: readonly {
      key: ProductKnowledgeStepKey;
      title: string;
      summary: string;
      technologies: readonly string[];
      output: string;
    }[];
  };
  orchestrationColumns: readonly {
    title: string;
    nodes: readonly string[];
    technologies: readonly string[];
  }[];
  principles: readonly string[];
  roadmap: readonly string[];
};

const copyContract = {
  productName: "카드 이벤트 인텔리전스",
  deckTitle: "실행 아틀라스",
  navOverview: "개요",
  navArchitecture: "아키텍처",
  navEvidence: "근거 모듈 맵",
  navRoadmap: "로드맵",
  heroPrimaryCta: "딥다이브 보기",
  heroSecondaryCta: "핵심 흐름 보기",
  eventAxisLabel: "이벤트 인텔리전스",
  productAxisLabel: "상품 지식 인텔리전스",
  deliverySurfaceLabel: "공유 전달면",
  evidenceImplemented: "구현됨",
  evidenceApproved: "승인된 설계",
  boardExecutiveBlueprint: "이그제큐티브 블루프린트",
  boardDualAxisMacro: "듀얼 축 매크로",
  boardEventInterpretation: "이벤트 해석",
  boardProductKnowledge: "상품 지식",
  boardOrchestrationControl: "오케스트레이션 제어",
  boardEvidenceModuleMap: "근거 모듈 맵",
  boardPrinciplesEvolution: "원칙과 진화"
} as const satisfies CopyContract;

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
    key: "event-intelligence",
    title: copyContract.eventAxisLabel,
    question: "경쟁 카드 이벤트에서 지금 무엇이 벌어지고 있고, 그 변화가 어떤 의미를 가지는가?",
    technologyBadges: ["Playwright", "BeautifulSoup", "Gemini"]
  },
  {
    key: "product-intelligence",
    title: copyContract.productAxisLabel,
    question: "상품 설명서와 공시 문서에서 어떤 구조화 지식을 만들고 RAG 질의로 연결할 수 있는가?",
    technologyBadges: ["PDF/HTML extraction", "RAG", "ChromaDB"]
  }
] as const satisfies ArchitectureContent["axes"];

const executiveBlueprint = {
  inputLanes: [
    {
      title: "이벤트 입력 레인",
      summary: "카드사 이벤트 페이지와 커넥터 신호를 모아 변화의 시작점을 확보합니다."
    },
    {
      title: "상품 근거 레인",
      summary: "상품 설명서, 공시, PDF, HTML 원문을 근거 묶음으로 모읍니다."
    }
  ],
  processingLanes: [
    {
      title: "이벤트 해석 레인",
      summary: "수집, 추출, 구조화, 규칙 해석, Gemini 보강을 거쳐 운영 판단 문장으로 만듭니다."
    },
    {
      title: "상품 지식 레인",
      summary: "원문 저장, 문서 정제, 청크, 임베딩, RAG 검색을 거쳐 응답 가능한 지식으로 만듭니다."
    }
  ],
  deliverySurface: {
    title: copyContract.deliverySurfaceLabel,
    summary: "브리핑, 분석, 발표 화면이 같은 구조화 결과를 소비하도록 맞춥니다."
  },
  technologyBadges: [
    "Playwright",
    "BeautifulSoup",
    "Gemini",
    "FastAPI",
    "APScheduler",
    "SQLite",
    "SQLAlchemy",
    "ChromaDB",
    "RAG",
    "PDF/HTML extraction"
  ]
} as const satisfies ArchitectureContent["executiveBlueprint"];

const eventInterpretationSteps = [
  {
    key: "collect",
    title: "수집",
    summary: "Playwright 커넥터와 스케줄러가 카드사 이벤트 원문을 수집합니다.",
    technologies: ["Playwright", "APScheduler"],
    output: "이벤트 원문과 수집 기준 시각"
  },
  {
    key: "extract",
    title: "추출",
    summary: "본문과 첨부 문서에서 읽을 수 있는 핵심 텍스트를 뽑아냅니다.",
    technologies: ["BeautifulSoup", "PDF/HTML extraction"],
    output: "혜택 후보 문장과 문서 단락"
  },
  {
    key: "structure",
    title: "구조화",
    summary: "혜택 기간, 대상, 조건, 채널을 구조화된 사실로 정리합니다.",
    technologies: ["SQLite", "SQLAlchemy"],
    output: "정규화된 이벤트 필드"
  },
  {
    key: "rule-interpretation",
    title: "규칙 해석",
    summary: "규칙 기반 해석으로 운영상 비교 포인트와 위험 신호를 고정합니다.",
    technologies: ["FastAPI", "rules_engine.py"],
    output: "규칙 기반 해석 결과"
  },
  {
    key: "gemini-augmentation",
    title: "Gemini 보강",
    summary: "Gemini가 운영 인사이트와 맥락 문장을 더해 브리핑 준비도를 높입니다.",
    technologies: ["Gemini", "modules/insights.py"],
    output: "해석 보강 요약"
  },
  {
    key: "briefing-summary",
    title: "브리핑 요약",
    summary: "운영자가 바로 읽을 수 있는 브리핑 문장과 우선순위를 정리합니다.",
    technologies: ["FastAPI", "modules/briefing.py"],
    output: "운영 브리핑 초안"
  },
  {
    key: "deliver",
    title: "전달",
    summary: "대시보드와 발표 화면에서 같은 결과를 소비할 수 있게 전달합니다.",
    technologies: ["FastAPI", "dashboard.js"],
    output: "공유 전달면 결과"
  }
] as const satisfies ArchitectureContent["eventInterpretation"]["steps"];

const productKnowledgeSteps = [
  {
    key: "collect-sources",
    title: "소스 수집",
    summary: "상품 설명서, 공시, 링크 목록을 지식 축 입력으로 수집합니다.",
    technologies: ["FastAPI", "product_links.py"],
    output: "상품 근거 소스 목록"
  },
  {
    key: "store-raw",
    title: "원문 저장",
    summary: "수집한 PDF와 HTML 원문을 재검증 가능한 상태로 저장합니다.",
    technologies: ["SQLite", "SQLAlchemy"],
    output: "원문 저장 레코드"
  },
  {
    key: "clean-document",
    title: "문서 정제",
    summary: "문서 노이즈를 줄이고 비교 가능한 본문 단위로 정리합니다.",
    technologies: ["PDF/HTML extraction", "BeautifulSoup"],
    output: "정제된 문서 본문"
  },
  {
    key: "chunk",
    title: "청크 분할",
    summary: "질의 가능한 길이로 문서를 분할하고 맥락 정보를 남깁니다.",
    technologies: ["RAG", "chunker.py"],
    output: "청크와 메타데이터"
  },
  {
    key: "embed",
    title: "임베딩 생성",
    summary: "검색 가능한 의미 벡터를 생성합니다.",
    technologies: ["Gemini", "embedder.py"],
    output: "임베딩 벡터"
  },
  {
    key: "store-vector",
    title: "벡터 저장",
    summary: "문서 청크와 임베딩을 벡터 저장소에 적재합니다.",
    technologies: ["ChromaDB", "RAG"],
    output: "벡터 인덱스"
  },
  {
    key: "retrieve-rag",
    title: "RAG 검색",
    summary: "질문에 맞는 근거 청크를 골라 응답 준비 재료를 모읍니다.",
    technologies: ["RAG", "collector.py"],
    output: "검색된 근거 청크"
  },
  {
    key: "compose-response",
    title: "응답 조합",
    summary: "검색 결과와 상품 맥락을 묶어 설명 가능한 응답으로 정리합니다.",
    technologies: ["Gemini", "FastAPI"],
    output: "상품 응답 초안"
  },
  {
    key: "deliver",
    title: "전달",
    summary: "운영 화면과 발표 자료에서 상품 근거를 바로 추적할 수 있게 전달합니다.",
    technologies: ["FastAPI", "rag.py"],
    output: "상품 지식 전달 결과"
  }
] as const satisfies ArchitectureContent["productKnowledge"]["steps"];

const orchestrationColumns = [
  {
    title: "제어면",
    nodes: ["스케줄 트리거", "실행 상태 추적", "API 분기"],
    technologies: ["APScheduler", "FastAPI", "SQLite"]
  },
  {
    title: "이벤트 처리면",
    nodes: ["이벤트 수집", "본문 추출", "규칙 해석", "Gemini 보강"],
    technologies: ["Playwright", "BeautifulSoup", "Gemini"]
  },
  {
    title: "상품 지식 처리면",
    nodes: ["원문 저장", "청크 분할", "임베딩", "RAG 검색"],
    technologies: ["PDF/HTML extraction", "ChromaDB", "RAG"]
  },
  {
    title: copyContract.deliverySurfaceLabel,
    nodes: ["브리핑", "분석", "발표 화면"],
    technologies: ["FastAPI", "SQLite", "SQLAlchemy"]
  }
] as const satisfies ArchitectureContent["orchestrationColumns"];

const principles = [
  "이벤트 인텔리전스와 상품 지식 인텔리전스는 끝까지 분리된 질문으로 유지한다.",
  "브리핑 문장보다 먼저 구조화된 사실과 추적 가능한 근거를 확보한다.",
  "구현된 경로와 승인된 경로를 같은 지도에서 솔직하게 구분한다."
] as const satisfies ArchitectureContent["principles"];

const roadmap = [
  "공개 계약을 고정해 랜딩과 딥다이브가 같은 복사 계약과 보드 순서를 소비하게 한다.",
  "모듈 맵에서 구현됨과 승인된 설계를 근거 수준으로 구분한다.",
  "승인 상태의 라우터와 RAG 경로가 코드로 채워지면 구현됨으로 승격한다."
] as const satisfies ArchitectureContent["roadmap"];

export const architectureContent = {
  copy: copyContract,
  boardOrder,
  axes,
  executiveBlueprint,
  eventInterpretation: {
    steps: eventInterpretationSteps
  },
  productKnowledge: {
    steps: productKnowledgeSteps
  },
  orchestrationColumns,
  principles,
  roadmap
} as const satisfies ArchitectureContent;
