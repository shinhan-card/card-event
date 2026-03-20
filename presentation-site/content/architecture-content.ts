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
  technologies: readonly string[];
}

export interface ArchitectureStage {
  key: string;
  title: string;
  what: string;
  why: string;
  technology: readonly string[];
  description: string;
  next: string;
}

export interface OrchestrationGroupItem {
  key: string;
  title: string;
  summary: string;
  technologies: readonly string[];
}

export interface OrchestrationGroup {
  key: string;
  title: string;
  summary: string;
  label: string;
  items: readonly OrchestrationGroupItem[];
}

export interface DualAxisItem {
  key: string;
  title: string;
  summary: string;
  technologies: readonly string[];
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
  label: "현재 스냅샷",
  capturedOn: "2026-03-20",
  note: "발표 워크스페이스 기준으로 실제 이벤트 인텔리전스 구현과 승인된 상품/공시 축을 함께 반영했습니다."
} as const satisfies SnapshotMetadata;

const axes = [
  {
    key: "event-intelligence",
    title: "이벤트 인텔리전스",
    question: "경쟁 카드 이벤트에서 지금 무엇이 벌어지고 있고, 그 변화가 어떤 의미를 갖는가?"
  },
  {
    key: "product-intelligence",
    title: "상품 / 공시 인텔리전스",
    question: "카드 상품과 공시 문서에서 어떤 구조화 지식을 만들 수 있고, RAG 질의까지 어떻게 이어질 것인가?"
  }
] as const;

const conceptZones = [
  {
    key: "data-sources",
    title: "증거 수집면",
    summary: "카드사 이벤트 페이지, 공시 문서, PDF, HTML 원문이 모두 같은 출발점으로 들어옵니다.",
    technologies: ["HTML", "PDF", "이벤트 페이지", "공시 문서"]
  },
  {
    key: "collection-layer",
    title: "수집 레이어",
    summary: "커넥터와 브라우저 자동화가 페이지를 열고, 스케줄이 주기를 관리하며 원본 캡처를 남깁니다.",
    technologies: ["Playwright", "APScheduler", "커넥터"]
  },
  {
    key: "extraction-normalization",
    title: "추출 · 정규화",
    summary: "동적 HTML과 문서 본문을 읽어 구조 필드로 정리하고, 후속 단계가 믿을 수 있는 스키마를 만듭니다.",
    technologies: ["BeautifulSoup", "PDF/HTML extraction", "SQLAlchemy"]
  },
  {
    key: "intelligence-generation",
    title: "인텔리전스 생성",
    summary: "이벤트 축은 규칙 기반 분석과 Gemini 보강을 사용하고, 상품 축은 임베딩·검색·RAG 흐름으로 확장됩니다.",
    technologies: ["Gemini", "RAG", "ChromaDB", "규칙 기반 분석"]
  },
  {
    key: "delivery-surfaces",
    title: "공유 전달면",
    summary: "FastAPI가 브리핑, 분석, 발표 뷰에 같은 구조 출력을 공급해 두 축의 결과를 한 화면에서 연결합니다.",
    technologies: ["FastAPI", "브리핑", "애널리틱스"]
  }
] as const;

const stages = [
  {
    key: "collect",
    title: "수집",
    what: "카드사 이벤트 페이지와 문서 소스를 열어 원본 HTML, 텍스트, 스냅샷을 확보합니다.",
    why: "증거를 먼저 잡지 않으면 후속 해석 단계가 전부 추정에 머물게 됩니다.",
    technology: ["Playwright", "APScheduler"],
    description: "브라우저 자동화와 스케줄링이 이벤트 축의 실제 입력을 안정적으로 모읍니다.",
    next: "캡처한 원문을 추출 단계로 넘깁니다."
  },
  {
    key: "extract",
    title: "추출",
    what: "페이지 본문과 문서 내용을 읽어 혜택, 조건, 대상, 기간 같은 핵심 사실을 뽑아냅니다.",
    why: "텍스트 그대로는 비교가 어렵기 때문에, 사람과 모델이 모두 읽기 쉬운 중간 구조가 필요합니다.",
    technology: ["BeautifulSoup", "PDF/HTML extraction"],
    description: "HTML 본문과 문서 콘텐츠를 이벤트/상품 사실 단위로 분해합니다.",
    next: "필드를 정규화하고 저장 가능한 형태로 고정합니다."
  },
  {
    key: "normalize",
    title: "정규화",
    what: "수집 결과를 일관된 테이블과 상태 필드로 맞춰 후속 조회와 분석에서 재사용합니다.",
    why: "카드사마다 다른 포맷을 그대로 두면 오케스트레이션과 비교 분석이 금방 흔들립니다.",
    technology: ["SQLite", "SQLAlchemy"],
    description: "이벤트 스냅샷, 섹션, 인사이트, 잡 상태를 공통 스키마로 정리합니다.",
    next: "축별 인텔리전스 규칙과 AI 보강을 얹습니다."
  },
  {
    key: "enrich",
    title: "강화",
    what: "규칙 기반 해석에 Gemini 보강을 더해 위협도, 요약, 분류, 임베딩 가능 구조를 만듭니다.",
    why: "단순 구조 데이터만으로는 운영자가 왜 중요한지 빠르게 이해하기 어렵습니다.",
    technology: ["Gemini", "RAG", "ChromaDB"],
    description: "이벤트 축은 Gemini 인사이트를, 상품 축은 검색·임베딩·RAG 레이어를 통해 의미를 덧붙입니다.",
    next: "운영 화면과 발표용 전달면으로 결과를 공개합니다."
  },
  {
    key: "deliver",
    title: "전달",
    what: "브리핑, 분석, 발표 화면에 두 축의 결과를 공통 인터페이스로 전달합니다.",
    why: "운영자가 바로 읽고 판단할 수 있어야 시스템 가치가 완성됩니다.",
    technology: ["FastAPI", "브리핑", "애널리틱스"],
    description: "공유 전달면이 축별 결과를 하나의 의사결정 경험으로 묶습니다.",
    next: "같은 구조 출력을 브리프, 대시보드, 발표 자료에 재활용합니다."
  }
] as const;

const orchestrationGroups = [
  {
    key: "scheduler",
    title: "제어 평면",
    summary: "실행 타이밍과 잡 상태를 관리해 전체 파이프라인이 끊기지 않도록 유지합니다.",
    label: "control plane",
    items: [
      {
        key: "timed-runs",
        title: "주기 실행",
        summary: "정해진 주기로 수집을 시작해 이벤트 축의 입력을 갱신합니다.",
        technologies: ["APScheduler"]
      },
      {
        key: "work-queue",
        title: "잡 추적",
        summary: "추출·강화·재시도 상태를 DB에 기록해 운영자가 흐름을 따라갈 수 있게 합니다.",
        technologies: ["SQLite", "SQLAlchemy"]
      }
    ]
  },
  {
    key: "routers",
    title: "라우팅 평면",
    summary: "FastAPI 엔드포인트가 이벤트 흐름과 상품/공시 흐름을 각각의 책임 경로로 보냅니다.",
    label: "routing",
    items: [
      {
        key: "event-router",
        title: "이벤트 경로",
        summary: "이벤트 URL, 수집, 상세 추출, 인사이트 계산을 이벤트 파이프라인으로 연결합니다.",
        technologies: ["FastAPI", "modules/pipeline.py"]
      },
      {
        key: "product-router",
        title: "상품 / 공시 경로",
        summary: "승인된 상품 축 설계 기준으로 공시 동기화, 임베딩, RAG 질의를 별도 축으로 유지합니다.",
        technologies: ["FastAPI", "RAG", "공시 라우트"]
      }
    ]
  },
  {
    key: "lane-processing",
    title: "축별 처리 평면",
    summary: "여기서부터 이벤트 축과 상품/공시 축이 갈라지며, 다시 공유 전달면으로 합류합니다.",
    label: "lane processing",
    items: [
      {
        key: "event-pipeline",
        title: "이벤트 파이프라인",
        summary: "Playwright 수집과 PDF/HTML extraction, 정규화, Gemini 강화가 이벤트 축을 실제로 구동합니다.",
        technologies: ["Playwright", "PDF/HTML extraction", "Gemini"]
      },
      {
        key: "disclosures",
        title: "공시 해석",
        summary: "상품 축에서는 공시/PDF 원문을 구조화하고 검색 가능한 단위로 자르는 흐름이 자리합니다.",
        technologies: ["PDF/HTML extraction", "Gemini"]
      },
      {
        key: "rag",
        title: "검색 · 생성",
        summary: "상품 지식 축은 임베딩, 벡터 저장소, 검색 결과 합성을 통해 RAG 응답을 만드는 구조를 가집니다.",
        technologies: ["ChromaDB", "RAG", "Gemini"]
      }
    ]
  },
  {
    key: "delivery",
    title: "공유 전달 평면",
    summary: "브리핑, 분석, 발표 사이트가 같은 결과 구조를 받아 운영자에게 전달합니다.",
    label: "delivery",
    items: [
      {
        key: "briefing",
        title: "브리핑",
        summary: "의사결정용 서술과 핵심 포인트를 빠르게 확인하는 전달면입니다.",
        technologies: ["FastAPI", "Gemini"]
      },
      {
        key: "analytics",
        title: "애널리틱스",
        summary: "트렌드, 비교, 잡 상태를 구조적으로 읽는 운영 관제면입니다.",
        technologies: ["FastAPI", "SQLite"]
      }
    ]
  }
] as const;

const dualAxisLanes = [
  {
    key: "event-intelligence",
    title: "이벤트 인텔리전스",
    summary: "현재 리포에서 가장 강하게 구현된 축으로, 경쟁사 이벤트 변화와 마케팅 신호를 실시간에 가깝게 읽어냅니다.",
    items: [
      {
        key: "event-sources",
        title: "이벤트 소스",
        summary: "카드사 이벤트 페이지, 프로모션 표면, 운영 중인 공지 소스를 수집합니다.",
        technologies: ["Playwright", "HTML"]
      },
      {
        key: "event-pipeline",
        title: "파이프라인 정제",
        summary: "상세 본문에서 혜택·조건·기간을 추출하고 공통 스키마로 정규화합니다.",
        technologies: ["PDF/HTML extraction", "SQLite", "SQLAlchemy"]
      },
      {
        key: "event-enrichment",
        title: "인사이트 강화",
        summary: "규칙 기반 분석과 Gemini 보강으로 위협도와 의미를 붙입니다.",
        technologies: ["Gemini", "규칙 기반 분석"]
      }
    ]
  },
  {
    key: "product-intelligence",
    title: "상품 / 공시 인텔리전스",
    summary: "승인된 축 분리를 유지하기 위해 상품/공시 흐름을 별도 다이어그램으로 보여주며, PDF 기반 지식화를 중심에 둡니다.",
    items: [
      {
        key: "disclosures-sync",
        title: "공시 동기화",
        summary: "상품/공시 문서를 따로 수집해 이벤트 축과 다른 증거 계층을 형성합니다.",
        technologies: ["FastAPI", "PDF"]
      },
      {
        key: "pdf-collection",
        title: "문서 수집 · 추출",
        summary: "PDF와 HTML 문서를 가져와 검색 가능한 텍스트 단위로 전환합니다.",
        technologies: ["PDF/HTML extraction", "Gemini"]
      },
      {
        key: "chunk-embed",
        title: "청킹 · 임베딩",
        summary: "상품 설명을 검색 가능한 청크로 나누고 벡터 저장소에 적재합니다.",
        technologies: ["ChromaDB", "Gemini"]
      },
      {
        key: "rag-summary",
        title: "RAG 질의 응답",
        summary: "문서 검색 결과를 바탕으로 상품 비교와 요약 응답을 만듭니다.",
        technologies: ["RAG", "Gemini"]
      }
    ]
  }
] as const;

const bridgeItems = [
  {
    key: "analytics",
    title: "애널리틱스",
    summary: "축별 결과를 비교형 시각으로 읽는 면",
    technologies: ["FastAPI", "SQLite"]
  },
  {
    key: "dashboard",
    title: "대시보드",
    summary: "운영 상태를 한눈에 보는 면",
    technologies: ["FastAPI"]
  },
  {
    key: "briefing",
    title: "브리핑",
    summary: "의사결정용 요약을 전달하는 면",
    technologies: ["Gemini", "FastAPI"]
  },
  {
    key: "operator-view",
    title: "운영자 검토",
    summary: "사람이 최종 판단과 수정에 개입하는 면",
    technologies: ["FastAPI", "SQLAlchemy"]
  }
] as const;

const principleCards = [
  {
    key: "separate-axes",
    title: "두 축을 섞지 않는다",
    summary: "이벤트 변화 추적과 상품 지식화는 연결되지만 같은 파이프라인처럼 보이면 안 됩니다."
  },
  {
    key: "structured-first",
    title: "서술보다 구조를 먼저 만든다",
    summary: "브리핑 문장은 마지막 단계이고, 그 전에는 구조 필드와 증거 연결이 우선입니다."
  },
  {
    key: "visible-handoffs",
    title: "핸드오프를 화면에 보이게 만든다",
    summary: "스케줄, 저장, 강화, 전달이 어디서 바뀌는지 다이어그램에서 바로 읽혀야 합니다."
  }
] as const;

const roadmapPhases = [
  {
    key: "concept-foundation",
    title: "축 분리 고정",
    summary: "이벤트 축과 상품/공시 축의 질문, 증거, 전달면을 명확하게 나눕니다.",
    next: "수집-추출-정규화-강화-전달 흐름을 더 구조적으로 보여줍니다."
  },
  {
    key: "module-ownership",
    title: "모듈 책임 가시화",
    summary: "실제 파일과 승인된 축 설계가 어디에 매핑되는지 보여줘 발표와 구현이 어긋나지 않게 합니다.",
    next: "공유 코어와 축별 처리의 경계를 강화합니다."
  },
  {
    key: "operational-maturity",
    title: "운영 전달면 연결",
    summary: "브리핑·애널리틱스·발표 사이트가 같은 구조 출력을 재사용하도록 마감합니다.",
    next: "상품 축 실구현이 늘어나면 벡터 저장소와 RAG 모듈 근거를 더 구체화합니다."
  }
] as const;

export const architectureContent = {
  snapshot: snapshotMetadata,
  deepDive: {
    eyebrow: "시스템 아틀라스",
    title: "아키텍처 딥다이브",
    summary:
      "실제 이벤트 인텔리전스 구현을 중심에 두고, 승인된 상품 / 공시 축과 공유 전달면까지 한 장의 구조도로 정리한 뷰입니다."
  },
  axes,
  conceptArchitecture: {
    eyebrow: "개념 아키텍처",
    title: "개념 아키텍처",
    summary:
      "증거 입력부터 전달면까지를 레이어로 나누고, 각 레이어마다 어떤 기술이 책임을 지는지 바로 읽히도록 만든 구조도입니다.",
    zones: conceptZones
  },
  stages,
  stageBreakdown: {
    eyebrow: "처리 단계 구조",
    title: "처리 단계 구조",
    summary:
      "수집에서 전달까지 다섯 단계가 정확히 어떤 변환을 맡고, 다음 단계로 무엇을 넘기는지 보이도록 구성했습니다.",
    cards: stages
  },
  dualAxisArchitecture: {
    eyebrow: "이중 축 아키텍처",
    title: "이중 축 아키텍처",
    summary:
      "왼쪽은 이벤트 인텔리전스, 오른쪽은 상품 / 공시 인텔리전스, 가운데는 두 축이 만나는 공유 전달면입니다.",
    lanes: dualAxisLanes,
    bridge: {
      title: "공유 전달 브리지",
      summary: "두 축의 결과가 같은 운영 화면으로 합류하지만, 수집과 해석 책임은 끝까지 분리됩니다.",
      items: bridgeItems
    }
  },
  orchestration: {
    title: "오케스트레이션",
    summary:
      "하나의 런타임이 스케줄링, 잡 상태, 축별 처리, 공유 전달을 조율하지만 이벤트 축과 상품/공시 축의 책임선은 유지합니다."
  },
  orchestrationMap: {
    eyebrow: "오케스트레이션 맵",
    title: "오케스트레이션 맵",
    summary:
      "제어 평면에서 시작해 라우팅, 축별 처리, 공유 전달로 이어지는 실제 운영 흐름을 단계별 컬럼으로 배치했습니다.",
    groups: orchestrationGroups
  },
  principlesSection: {
    eyebrow: "설계 원칙",
    title: "설계 원칙",
    summary: "발표가 커져도 구조가 흐려지지 않도록 붙잡아 주는 기준입니다.",
    cards: principleCards
  },
  evolutionRoadmap: {
    eyebrow: "진화 로드맵",
    title: "진화 로드맵",
    summary: "현재 구현 강도와 승인된 축 설계를 함께 보여주며 다음 확장 지점을 정리합니다.",
    phases: roadmapPhases
  },
  designPrinciples: [
    "이벤트 인텔리전스와 상품 / 공시 인텔리전스를 끝까지 분리해 보여준다.",
    "브리핑 문장보다 구조 필드와 근거 연결을 먼저 드러낸다.",
    "스케줄링, 저장, 강화, 전달의 핸드오프를 다이어그램에서 바로 읽히게 만든다."
  ]
} as const satisfies ArchitectureContent;
