import { snapshotMetadata } from "@/content/architecture-content";
import type { SnapshotMetadata } from "@/content/architecture-content";

export type ModuleClusterKey = "event-pipeline" | "product-rag" | "shared";

export interface ModuleAxisRoot {
  key: "event-pipeline" | "product-rag";
  title: string;
  summary: string;
}

export interface ModuleCluster {
  key: ModuleClusterKey;
  title: string;
  summary: string;
  technologies: readonly string[];
  evidence: string;
  files: readonly string[];
}

export interface ModuleSection {
  key: string;
  title: string;
  summary: string;
  clusters: readonly ModuleCluster[];
}

export interface ModuleMap {
  snapshot: SnapshotMetadata;
  axisRoots: readonly ModuleAxisRoot[];
  clusters: readonly ModuleCluster[];
  sections: readonly ModuleSection[];
}

const bootstrapCluster = {
  key: "shared",
  title: "공유 부트스트랩",
  summary: "FastAPI 앱 초기화, DB 엔진, 세션 생성처럼 전체 시스템의 공통 기반을 담당합니다.",
  technologies: ["FastAPI", "SQLite", "SQLAlchemy"],
  evidence: "실제 코드",
  files: ["app.py", "database.py"]
} as const satisfies ModuleCluster;

const apiSurfaceCluster = {
  key: "shared",
  title: "공유 API 표면",
  summary: "이벤트, 분석, 잡 상태를 외부에 노출하는 FastAPI 엔드포인트입니다.",
  technologies: ["FastAPI"],
  evidence: "실제 코드",
  files: ["app.py"]
} as const satisfies ModuleCluster;

const eventCollectionCluster = {
  key: "event-pipeline",
  title: "이벤트 수집",
  summary: "카드사별 커넥터와 브라우저 자동화가 이벤트 입력을 모읍니다.",
  technologies: ["Playwright", "APScheduler"],
  evidence: "실제 코드",
  files: ["modules/connectors/*", "detail_extractor.py"]
} as const satisfies ModuleCluster;

const eventPipelineCluster = {
  key: "event-pipeline",
  title: "이벤트 파이프라인",
  summary: "추출, 정규화, 파이프라인 오케스트레이션이 이벤트 축의 골격을 만듭니다.",
  technologies: ["PDF/HTML extraction", "SQLite", "SQLAlchemy"],
  evidence: "실제 코드",
  files: [
    "modules/pipeline.py",
    "modules/extraction.py",
    "modules/normalization.py",
    "detail_extractor.py"
  ]
} as const satisfies ModuleCluster;

const enrichmentCluster = {
  key: "event-pipeline",
  title: "이벤트 인사이트 강화",
  summary: "규칙 기반 분석과 Gemini 보강이 위협도, 분류, 브리핑용 포인트를 만듭니다.",
  technologies: ["Gemini", "규칙 기반 분석"],
  evidence: "실제 코드",
  files: ["modules/insights.py", "gemini_insight.py"]
} as const satisfies ModuleCluster;

const briefingAnalyticsCluster = {
  key: "shared",
  title: "브리핑 · 애널리틱스",
  summary: "운영 보고와 발표 전달면으로 공통 구조를 소비하는 계층입니다.",
  technologies: ["FastAPI", "Gemini"],
  evidence: "실제 코드",
  files: ["app.py", "templates/*", "static/js/*"]
} as const satisfies ModuleCluster;

const productRagCluster = {
  key: "product-rag",
  title: "상품 / 공시 지식 축",
  summary:
    "발표에서 승인된 상품 축 구조입니다. 공시 동기화, PDF/HTML extraction, 임베딩, ChromaDB, RAG 응답을 위한 전용 레인을 가정합니다.",
  technologies: ["PDF/HTML extraction", "Gemini", "ChromaDB", "RAG"],
  evidence: "승인된 축 설계",
  files: ["routers/disclosures.py", "routers/rag.py", "modules/rag/*"]
} as const satisfies ModuleCluster;

const uiLayerCluster = {
  key: "shared",
  title: "전달 UI 레이어",
  summary: "템플릿, 정적 스크립트, 발표 사이트가 최종 전달 경험을 구성합니다.",
  technologies: ["FastAPI", "프레젠테이션 UI"],
  evidence: "실제 코드",
  files: ["templates/*", "static/js/*", "presentation-site/*"]
} as const satisfies ModuleCluster;

export const moduleMap = {
  snapshot: snapshotMetadata,
  axisRoots: [
    {
      key: "event-pipeline",
      title: "이벤트 축 루트",
      summary: "현재 워크트리에서 실코드 근거가 가장 강한 수집-정규화-강화 경로입니다."
    },
    {
      key: "product-rag",
      title: "상품 / 공시 축 루트",
      summary: "승인된 발표 구조를 유지하기 위해 별도 축으로 남겨둔 PDF·임베딩·RAG 경로입니다."
    }
  ],
  clusters: [
    bootstrapCluster,
    apiSurfaceCluster,
    eventCollectionCluster,
    eventPipelineCluster,
    enrichmentCluster,
    briefingAnalyticsCluster,
    productRagCluster,
    uiLayerCluster
  ],
  sections: [
    {
      key: "bootstrap",
      title: "공유 코어",
      summary: "앱 부트스트랩과 저장소 레이어가 모든 흐름의 바닥을 이룹니다.",
      clusters: [bootstrapCluster]
    },
    {
      key: "api-surface",
      title: "서비스 엔드포인트",
      summary: "운영 화면과 발표면이 접근하는 API 표면입니다.",
      clusters: [apiSurfaceCluster]
    },
    {
      key: "event-collection",
      title: "이벤트 수집",
      summary: "카드사 커넥터와 브라우저 자동화가 이벤트 원문을 수집합니다.",
      clusters: [eventCollectionCluster]
    },
    {
      key: "event-pipeline",
      title: "이벤트 정제",
      summary: "추출과 정규화가 이벤트 축의 신뢰 가능한 구조 필드를 만듭니다.",
      clusters: [eventPipelineCluster]
    },
    {
      key: "enrichment",
      title: "이벤트 강화",
      summary: "Gemini와 규칙 기반 분석이 운영자가 읽을 수 있는 의미를 덧붙입니다.",
      clusters: [enrichmentCluster]
    },
    {
      key: "briefing-analytics",
      title: "공유 전달면",
      summary: "브리핑과 애널리틱스가 두 축의 출력을 같은 전달 경험으로 묶습니다.",
      clusters: [briefingAnalyticsCluster]
    },
    {
      key: "product-intelligence",
      title: "상품 / 공시 지식 축",
      summary: "PDF/HTML extraction, 임베딩, ChromaDB, RAG를 위한 승인된 발표 축입니다.",
      clusters: [productRagCluster]
    },
    {
      key: "ui-layer",
      title: "프레젠테이션 레이어",
      summary: "템플릿과 발표 사이트가 기술 구조를 사람 친화적인 전달면으로 바꿉니다.",
      clusters: [uiLayerCluster]
    }
  ]
} as const satisfies ModuleMap;
