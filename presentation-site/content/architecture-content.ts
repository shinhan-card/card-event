type BoardKey =
  | "executive-blueprint"
  | "dual-axis-macro"
  | "event-interpretation"
  | "product-knowledge"
  | "orchestration-control"
  | "evidence-module-map"
  | "principles-evolution";

type AxisKey = "event-intelligence" | "product-intelligence";
type RoadmapStage = "now" | "next" | "later";

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
  navAxes: string;
  navHowItWorks: string;
  navValue: string;
  navDeepDive: string;
  ctaPrimary: string;
  ctaSecondary: string;
  landingThesis: string;
  landingTension: string;
  landingEngine: string;
  landingDecision: string;
  landingValue: string;
  landingHandoff: string;
  deepDiveExecutive: string;
  deepDiveDualAxis: string;
  deepDiveEvent: string;
  deepDiveProduct: string;
  deepDiveOrchestration: string;
  deepDiveModules: string;
  deepDivePrinciples: string;
  snapshotLabel: string;
};

type PublicAxis = {
  key: AxisKey;
  title: string;
  question: string;
  summary: string;
  technologyBadges: readonly string[];
};

type PublicArchitectureContent = {
  copy: CopyContract;
  boardOrder: readonly BoardKey[];
  axes: readonly PublicAxis[];
  executiveBlueprint: {
    inputLanes: readonly string[];
    processingLanes: readonly string[];
    deliverySurface: readonly string[];
    technologyBadges: readonly string[];
  };
  eventInterpretation: {
    title: string;
    steps: readonly {
      key: EventInterpretationStepKey;
      title: string;
      summary: string;
      technologies: readonly string[];
      output: string;
    }[];
  };
  productKnowledge: {
    title: string;
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
  principles: readonly {
    title: string;
    caption: string;
  }[];
  roadmap: readonly {
    title: string;
    caption: string;
    stage: RoadmapStage;
  }[];
};

type LegacyArchitectureContent = PublicArchitectureContent & {
  deepDive: {
    eyebrow: string;
    title: string;
    summary: string;
  };
  conceptArchitecture: {
    eyebrow: string;
    title: string;
    summary: string;
    zones: readonly {
      key: string;
      title: string;
      summary: string;
      technologies: readonly string[];
    }[];
  };
  stageBreakdown: {
    eyebrow: string;
    title: string;
    summary: string;
    cards: readonly {
      key: string;
      title: string;
      technology: readonly string[];
      what: string;
      why: string;
      next: string;
    }[];
  };
  orchestrationMap: {
    eyebrow: string;
    title: string;
    summary: string;
    groups: readonly {
      key: string;
      label: string;
      title: string;
      summary: string;
      items: readonly {
        key: string;
        title: string;
        summary: string;
        technologies: readonly string[];
      }[];
    }[];
  };
  designPrinciples: readonly string[];
  principlesSection: {
    eyebrow: string;
    title: string;
    summary: string;
    cards: readonly {
      key: string;
      title: string;
      summary: string;
    }[];
  };
  dualAxisArchitecture: {
    eyebrow: string;
    title: string;
    summary: string;
    lanes: readonly {
      title: string;
      summary: string;
      items: readonly {
        key: string;
        title: string;
        summary: string;
        technologies: readonly string[];
      }[];
    }[];
    bridge: {
      title: string;
      summary: string;
      items: readonly {
        key: string;
        title: string;
        summary: string;
        technologies: readonly string[];
      }[];
    };
  };
  evolutionRoadmap: {
    eyebrow: string;
    title: string;
    summary: string;
    phases: readonly {
      key: string;
      title: string;
      summary: string;
      next: string;
    }[];
  };
  stages: readonly {
    key: string;
    title: string;
    technology: readonly string[];
    description: string;
  }[];
  orchestration: {
    summary: string;
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

const copy = {
  productName: "카드 이벤트 인텔리전스",
  deckTitle: "실행 아틀라스",
  navOverview: "개요",
  navAxes: "두 축",
  navHowItWorks: "작동 흐름",
  navValue: "가치",
  navDeepDive: "딥다이브",
  ctaPrimary: "딥다이브 보기",
  ctaSecondary: "핵심 흐름 보기",
  landingThesis: "두 개의 인텔리전스 축을 한 장의 지도에 올립니다",
  landingTension: "시장 신호와 상품 근거는 다른 속도로 움직입니다",
  landingEngine: "듀얼 엔진 구조로 수집과 해석을 분리합니다",
  landingDecision: "운영 판단이 필요한 화면만 남깁니다",
  landingValue: "가치는 근거 추적과 재사용성에서 나옵니다",
  landingHandoff: "딥다이브에서 실제 모듈 경계와 증거 수준을 확인합니다",
  deepDiveExecutive: "이그제큐티브 블루프린트",
  deepDiveDualAxis: "듀얼 축 매크로",
  deepDiveEvent: "이벤트 해석",
  deepDiveProduct: "상품 지식",
  deepDiveOrchestration: "오케스트레이션 제어",
  deepDiveModules: "근거 모듈 맵",
  deepDivePrinciples: "원칙과 진화",
  snapshotLabel: "스냅샷 기준",
} as const satisfies CopyContract;

const boardOrder = [
  "executive-blueprint",
  "dual-axis-macro",
  "event-interpretation",
  "product-knowledge",
  "orchestration-control",
  "evidence-module-map",
  "principles-evolution",
] as const satisfies readonly BoardKey[];

const axes = [
  {
    key: "event-intelligence",
    title: "이벤트 인텔리전스",
    question: "경쟁 카드 이벤트에서 지금 무엇이 달라지고 있고, 운영자는 무엇을 먼저 읽어야 하는가?",
    summary: "빠르게 변하는 시장 신호를 수집하고 해석해 운영 브리핑으로 연결하는 축입니다.",
    technologyBadges: ["Playwright", "BeautifulSoup", "Gemini"],
  },
  {
    key: "product-intelligence",
    title: "상품 지식 인텔리전스",
    question: "상품 설명서와 공시 원문에서 어떤 근거를 구조화해 검색 가능한 지식으로 바꿀 것인가?",
    summary: "느리지만 깊은 문서 근거를 정리해 설명 가능한 응답으로 전달하는 축입니다.",
    technologyBadges: ["PDF/HTML extraction", "RAG", "ChromaDB"],
  },
] as const satisfies PublicArchitectureContent["axes"];

const executiveBlueprint = {
  inputLanes: [
    "이벤트 페이지와 커넥터 신호를 수집합니다.",
    "상품 설명서와 공시 원문을 근거 묶음으로 확보합니다.",
  ],
  processingLanes: [
    "이벤트 축은 추출, 구조화, 규칙 해석, Gemini 보강으로 이어집니다.",
    "상품 축은 정제, 청크, 임베딩, RAG 검색으로 이어집니다.",
  ],
  deliverySurface: ["운영 브리핑", "분석 화면", "발표용 스토리보드"],
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
    "PDF/HTML extraction",
  ],
} as const satisfies PublicArchitectureContent["executiveBlueprint"];

const eventInterpretation = {
  title: copy.deepDiveEvent,
  steps: [
    {
      key: "collect",
      title: "수집",
      summary: "Playwright 커넥터와 스케줄러가 카드사 이벤트 원문을 안정적으로 모읍니다.",
      technologies: ["Playwright", "APScheduler"],
      output: "이벤트 원문과 수집 시각",
    },
    {
      key: "extract",
      title: "추출",
      summary: "본문과 첨부 문서에서 읽을 수 있는 핵심 문장을 뽑아냅니다.",
      technologies: ["BeautifulSoup", "PDF/HTML extraction"],
      output: "혜택 후보 문장과 문서 단락",
    },
    {
      key: "structure",
      title: "구조화",
      summary: "기간, 대상, 조건, 채널을 비교 가능한 사실로 정리합니다.",
      technologies: ["SQLite", "SQLAlchemy"],
      output: "정규화된 이벤트 필드",
    },
    {
      key: "rule-interpretation",
      title: "규칙 해석",
      summary: "운영상 중요한 비교 포인트와 위험 신호를 규칙으로 고정합니다.",
      technologies: ["FastAPI", "rules_engine.py"],
      output: "규칙 기반 해석 결과",
    },
    {
      key: "gemini-augmentation",
      title: "Gemini 보강",
      summary: "Gemini가 맥락 문장과 운영 인사이트를 더해 브리핑 준비도를 높입니다.",
      technologies: ["Gemini", "modules/insights.py"],
      output: "해석 보강 요약",
    },
    {
      key: "briefing-summary",
      title: "브리핑 요약",
      summary: "운영자가 바로 읽을 수 있는 문장과 우선순위를 정리합니다.",
      technologies: ["FastAPI", "modules/briefing.py"],
      output: "운영 브리핑 초안",
    },
    {
      key: "deliver",
      title: "전달",
      summary: "대시보드와 발표 화면이 같은 결과를 소비하도록 전달합니다.",
      technologies: ["FastAPI", "dashboard.js"],
      output: "공유 전달면 결과",
    },
  ],
} as const satisfies PublicArchitectureContent["eventInterpretation"];

const productKnowledge = {
  title: copy.deepDiveProduct,
  steps: [
    {
      key: "collect-sources",
      title: "소스 수집",
      summary: "상품 설명서, 공시, 링크 목록을 지식 축 입력으로 모읍니다.",
      technologies: ["FastAPI", "product_links.py"],
      output: "상품 근거 소스 목록",
    },
    {
      key: "store-raw",
      title: "원문 저장",
      summary: "수집한 PDF와 HTML 원문을 다시 검증할 수 있는 상태로 보관합니다.",
      technologies: ["SQLite", "SQLAlchemy"],
      output: "원문 저장 레코드",
    },
    {
      key: "clean-document",
      title: "문서 정제",
      summary: "문서 노이즈를 줄이고 비교 가능한 본문 단위로 정리합니다.",
      technologies: ["PDF/HTML extraction", "BeautifulSoup"],
      output: "정제된 문서 본문",
    },
    {
      key: "chunk",
      title: "청크 분할",
      summary: "질의 가능한 길이로 문서를 나누고 맥락 정보를 붙입니다.",
      technologies: ["RAG", "chunker.py"],
      output: "청크와 메타데이터",
    },
    {
      key: "embed",
      title: "임베딩 생성",
      summary: "검색 가능한 의미 벡터를 만들어 이후 검색 정확도를 높입니다.",
      technologies: ["Gemini", "embedder.py"],
      output: "임베딩 벡터",
    },
    {
      key: "store-vector",
      title: "벡터 저장",
      summary: "문서 청크와 임베딩을 벡터 저장소에 적재합니다.",
      technologies: ["ChromaDB", "RAG"],
      output: "벡터 인덱스",
    },
    {
      key: "retrieve-rag",
      title: "RAG 검색",
      summary: "질문에 맞는 근거 청크를 골라 응답 재료를 모읍니다.",
      technologies: ["RAG", "collector.py"],
      output: "검색된 근거 청크",
    },
    {
      key: "compose-response",
      title: "응답 조합",
      summary: "검색 결과와 상품 맥락을 묶어 설명 가능한 응답으로 정리합니다.",
      technologies: ["Gemini", "FastAPI"],
      output: "상품 응답 초안",
    },
    {
      key: "deliver",
      title: "전달",
      summary: "운영 화면과 발표 자료에서 상품 근거를 바로 추적할 수 있게 전달합니다.",
      technologies: ["FastAPI", "rag.py"],
      output: "상품 지식 전달 결과",
    },
  ],
} as const satisfies PublicArchitectureContent["productKnowledge"];

const orchestrationColumns = [
  {
    title: "제어면",
    nodes: ["스케줄 트리거", "실행 상태 추적", "API 분기"],
    technologies: ["APScheduler", "FastAPI", "SQLite"],
  },
  {
    title: "이벤트 처리면",
    nodes: ["이벤트 수집", "본문 추출", "규칙 해석", "Gemini 보강"],
    technologies: ["Playwright", "BeautifulSoup", "Gemini"],
  },
  {
    title: "상품 지식 처리면",
    nodes: ["원문 저장", "청크 분할", "임베딩", "RAG 검색"],
    technologies: ["PDF/HTML extraction", "ChromaDB", "RAG"],
  },
  {
    title: "공유 전달면",
    nodes: ["브리핑", "분석", "발표 화면"],
    technologies: ["FastAPI", "SQLite", "SQLAlchemy"],
  },
] as const satisfies PublicArchitectureContent["orchestrationColumns"];

const principles = [
  {
    title: "질문은 끝까지 분리합니다",
    caption: "이벤트 변화 신호와 상품 근거 질문을 한 흐름으로 섞지 않고 각 축의 책임을 유지합니다.",
  },
  {
    title: "근거를 먼저 확보합니다",
    caption: "브리핑 문장보다 앞서 구조화된 사실과 추적 가능한 원문 근거를 남깁니다.",
  },
  {
    title: "증거 수준을 솔직하게 드러냅니다",
    caption: "구현된 경로와 승인된 경로를 같은 지도에서 구분해 기대와 현실을 함께 설명합니다.",
  },
] as const satisfies PublicArchitectureContent["principles"];

const roadmap = [
  {
    title: "공개 계약 고정",
    caption: "랜딩과 딥다이브가 같은 복사 계약과 보드 순서를 소비하도록 공개 계약을 고정합니다.",
    stage: "now",
  },
  {
    title: "모듈 근거 정렬",
    caption: "구현됨과 승인된 설계를 같은 지도에서 읽되, 공용 계약은 단순하게 유지합니다.",
    stage: "next",
  },
  {
    title: "승인 경로 구현 승격",
    caption: "라우터와 RAG 경로가 코드로 채워지면 승인된 설계를 구현된 흐름으로 올립니다.",
    stage: "later",
  },
] as const satisfies PublicArchitectureContent["roadmap"];

const publicArchitectureContent = {
  copy,
  boardOrder,
  axes,
  executiveBlueprint,
  eventInterpretation,
  productKnowledge,
  orchestrationColumns,
  principles,
  roadmap,
} as const satisfies PublicArchitectureContent;

const legacyStages: LegacyArchitectureContent["stages"] = eventInterpretation.steps.map((step) => ({
  key: step.key,
  title: step.title,
  technology: step.technologies,
  description: step.summary,
}));

export const architectureContent: LegacyArchitectureContent = defineHidden(
  defineHidden(
    defineHidden(
      defineHidden(
        defineHidden(
          defineHidden(
            defineHidden(
              defineHidden(
                defineHidden(
                  defineHidden(
                    publicArchitectureContent,
                    "deepDive",
                    {
                      eyebrow: "아키텍처 딥다이브",
                      title: "아키텍처 딥다이브",
                      summary:
                        "질문을 분리한 두 개의 인텔리전스 축과 이를 연결하는 공유 전달면을 실제 모듈 근거와 함께 살펴봅니다.",
                    },
                  ),
                  "conceptArchitecture",
                  {
                    eyebrow: "개념 아키텍처",
                    title: "개념 아키텍처",
                    summary:
                      "입력 레인에서 처리 레인, 그리고 공유 전달면으로 이어지는 전체 구조를 한눈에 보여줍니다.",
                    zones: [
                      {
                        key: "inputs",
                        title: "입력 레인",
                        summary: "이벤트 페이지 신호와 상품 설명서 원문이 각 축의 시작점으로 들어옵니다.",
                        technologies: ["Playwright", "PDF/HTML extraction", "FastAPI"],
                      },
                      {
                        key: "processing",
                        title: "처리 레인",
                        summary: "이벤트 해석과 상품 지식 처리가 각자의 도구 체인으로 끝까지 분리됩니다.",
                        technologies: ["BeautifulSoup", "Gemini", "RAG", "ChromaDB"],
                      },
                      {
                        key: "delivery",
                        title: "공유 전달면",
                        summary: "브리핑, 분석, 발표 화면이 같은 결과를 소비하는 마지막 면입니다.",
                        technologies: ["FastAPI", "SQLite", "SQLAlchemy"],
                      },
                    ],
                  },
                ),
                "stageBreakdown",
                {
                  eyebrow: "처리 단계 구조",
                  title: "처리 단계 구조",
                  summary: "입력 확보, 해석 조합, 전달 정렬의 세 단계로 나눠 현재 앱이 설명하는 흐름을 유지합니다.",
                  cards: [
                    {
                      key: "capture",
                      title: "신호 확보",
                      technology: ["Playwright", "PDF/HTML extraction"],
                      what: "이벤트 원문과 상품 근거 원문을 각각 모읍니다.",
                      why: "빠른 시장 변화와 느린 문서 근거를 섞지 않기 위해서입니다.",
                      next: "추출과 정규화",
                    },
                    {
                      key: "interpret",
                      title: "해석 조합",
                      technology: ["BeautifulSoup", "Gemini", "RAG"],
                      what: "추출, 구조화, 규칙 해석, 검색을 통해 운영 판단 재료를 만듭니다.",
                      why: "브리핑보다 먼저 설명 가능한 사실과 근거를 확보하기 위해서입니다.",
                      next: "공유 전달면",
                    },
                    {
                      key: "deliver",
                      title: "전달 정렬",
                      technology: ["FastAPI", "SQLite", "SQLAlchemy"],
                      what: "브리핑, 분석, 발표 화면이 같은 결과를 읽도록 정렬합니다.",
                      why: "의사결정 언어를 하나로 맞추기 위해서입니다.",
                      next: "모듈 근거 추적",
                    },
                  ],
                },
              ),
              "orchestrationMap",
              {
                eyebrow: "오케스트레이션 맵",
                title: "오케스트레이션 맵",
                summary: "제어면이 두 개의 처리 축과 공유 전달면을 엮어 운영 가능한 시스템으로 만듭니다.",
                groups: orchestrationColumns.map((column, index) => ({
                  key: ["control", "event", "product", "delivery"][index] ?? `group-${index}`,
                  label: column.title,
                  title: column.title,
                  summary:
                    index === 0
                      ? "실행 순서와 상태를 조절해 두 축이 같은 주기로 흘러가게 만듭니다."
                      : index === 1
                        ? "이벤트 변화 신호를 운영 브리핑으로 바꾸는 처리면입니다."
                        : index === 2
                          ? "상품 문서 근거를 검색 가능한 지식으로 바꾸는 처리면입니다."
                          : "브리핑과 분석, 발표 화면이 같은 결과를 소비하는 전달면입니다.",
                  items: column.nodes.map((node, nodeIndex) => ({
                    key: `${column.title}-${nodeIndex}`,
                    title: node,
                    summary: `${node} 단계가 다음 처리면으로 이어질 수 있도록 결과를 정리합니다.`,
                    technologies: column.technologies,
                  })),
                })),
              },
            ),
            "designPrinciples",
            principles.map((principle) => principle.title),
          ),
          "principlesSection",
          {
            eyebrow: "설계 원칙",
            title: "설계 원칙",
            summary: "공개 계약은 좁게 유지하면서도 현재 소비자에게 필요한 설명 축은 그대로 이어지도록 설계했습니다.",
            cards: principles.map((principle, index) => ({
              key: `principle-${index + 1}`,
              title: principle.title,
              summary: principle.caption,
            })),
          },
        ),
        "dualAxisArchitecture",
        {
          eyebrow: "이중 축 아키텍처",
          title: "이벤트와 상품 지식의 분리된 엔진",
          summary: "두 축은 같은 전달면을 바라보지만, 처리 단계와 질문 문맥은 끝까지 따로 유지됩니다.",
          lanes: [
            {
              title: "이벤트 인텔리전스",
              summary: axes[0].summary,
              items: eventInterpretation.steps.slice(0, 4).map((step) => ({
                key: step.key,
                title: step.title,
                summary: step.summary,
                technologies: step.technologies,
              })),
            },
            {
              title: "상품 / 공시 인텔리전스",
              summary: axes[1].summary,
              items: productKnowledge.steps.slice(0, 4).map((step) => ({
                key: step.key,
                title: step.title,
                summary: step.summary,
                technologies: step.technologies,
              })),
            },
          ],
          bridge: {
            title: "공유 전달면",
            summary: "두 축의 결과가 브리핑, 분석, 발표 화면으로 다시 정렬되는 공용 연결부입니다.",
            items: [
              {
                key: "shared-briefing",
                title: "공유 브리핑",
                summary: "운영자가 바로 읽을 수 있는 핵심 변화와 근거를 묶습니다.",
                technologies: ["FastAPI", "SQLite"],
              },
              {
                key: "shared-presentations",
                title: "공유 발표면",
                summary: "모듈 근거와 시스템 가치 설명이 같은 순서로 이어집니다.",
                technologies: ["SQLAlchemy", "dashboard.js"],
              },
            ],
          },
        },
      ),
      "evolutionRoadmap",
      {
        eyebrow: "로드맵",
        title: "로드맵",
        summary: "이번 복구 이후 어떤 순서로 승인 경로를 실제 코드로 채울지 정리합니다.",
        phases: roadmap.map((item, index) => ({
          key: `roadmap-${index + 1}`,
          title: item.title,
          summary: item.caption,
          next: item.stage,
        })),
      },
    ),
    "stages",
    legacyStages,
  ),
  "orchestration",
  {
    summary:
      "구현된 경로와 승인된 경로를 같은 지도에서 보여주면, 현재 시스템이 어디까지 살아 있고 다음 구현이 어디에 들어갈지 바로 설명할 수 있습니다.",
  },
);
