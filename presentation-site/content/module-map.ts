type ClusterGroup = "shared-core" | "event-axis" | "product-axis" | "delivery-surfaces";
type EvidenceLevel = "implemented" | "approved";

type PublicCluster = {
  key: string;
  group: ClusterGroup;
  title: string;
  summary: string;
  evidenceLevel: EvidenceLevel;
  files: readonly string[];
};

type LegacyModuleMap = {
  clusters: readonly PublicCluster[];
  sections: readonly {
    key: string;
    title: string;
    summary: string;
    clusters: readonly {
      key: string;
      title: string;
      summary: string;
      technologies: readonly string[];
      evidence: string;
      files: readonly string[];
    }[];
  }[];
};

const mergeEvidenceLevel = (
  current: EvidenceLevel | undefined,
  next: EvidenceLevel,
): EvidenceLevel => {
  if (current === "implemented" || next === "implemented") {
    return "implemented";
  }

  return next;
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

const detailedClusters = [
  {
    key: "shared-core-implemented",
    group: "shared-core",
    title: "공유 코어 구현",
    summary: "현재 브랜치에서 실제로 확인되는 애플리케이션 진입점과 저장 계층입니다.",
    evidenceLevel: "implemented",
    files: ["app.py", "database.py"],
  },
  {
    key: "shared-core-approved",
    group: "shared-core",
    title: "공유 코어 승인 경로",
    summary: "브랜치에는 아직 없지만 계획상 포함된 헬스 체크와 API 유틸 경로입니다.",
    evidenceLevel: "approved",
    files: ["routers/health.py", "modules/api_utils.py"],
  },
  {
    key: "event-axis-implemented",
    group: "event-axis",
    title: "이벤트 축 구현 경로",
    summary: "이벤트 수집, 추출, 정규화, 파이프라인, 인사이트 생성의 실제 구현 묶음입니다.",
    evidenceLevel: "implemented",
    files: [
      "modules/connectors/*",
      "modules/extraction.py",
      "modules/normalization.py",
      "modules/pipeline.py",
      "modules/insights.py",
    ],
  },
  {
    key: "event-axis-approved",
    group: "event-axis",
    title: "이벤트 축 승인 경로",
    summary: "계획에는 있지만 이 브랜치에는 아직 반영되지 않은 라우터와 세부 해석 모듈입니다.",
    evidenceLevel: "approved",
    files: [
      "routers/events.py",
      "routers/pipeline.py",
      "routers/jobs.py",
      "modules/event_enrichment.py",
      "modules/classification.py",
      "modules/condition_facts.py",
      "modules/rules_engine.py",
    ],
  },
  {
    key: "product-axis-approved",
    group: "product-axis",
    title: "상품 축 승인 경로",
    summary: "상품 설명서, 공시, RAG 파이프라인을 구성하는 승인 상태의 경로입니다.",
    evidenceLevel: "approved",
    files: [
      "routers/disclosures.py",
      "routers/rag.py",
      "modules/product_links.py",
      "modules/rag/collector.py",
      "modules/rag/chunker.py",
      "modules/rag/embedder.py",
      "modules/rag/product_scraper.py",
      "modules/rag/catalog_summary.py",
    ],
  },
  {
    key: "delivery-surfaces-implemented",
    group: "delivery-surfaces",
    title: "전달면 구현 경로",
    summary: "현재 브랜치에서 확인 가능한 실제 대시보드 템플릿과 프런트엔드 스크립트입니다.",
    evidenceLevel: "implemented",
    files: [
      "templates/dashboard_luxury.html",
      "templates/dashboard_pro.html",
      "static/js/dashboard.js",
    ],
  },
  {
    key: "delivery-surfaces-approved",
    group: "delivery-surfaces",
    title: "전달면 승인 경로",
    summary: "브리핑, 애널리틱스, 이메일 리포트 표면을 구성하는 승인 상태의 경로입니다.",
    evidenceLevel: "approved",
    files: [
      "routers/analytics.py",
      "routers/briefing.py",
      "routers/pages.py",
      "modules/analytics_service.py",
      "modules/briefing.py",
      "templates/email_daily_briefing.html",
      "templates/weekly_report.html",
      "static/js/dashboard_extras.js",
    ],
  },
] as const satisfies readonly PublicCluster[];

const publicClusters = [
  {
    key: "shared-core",
    group: "shared-core",
    title: "공유 코어",
    summary: "앱 진입점, 저장 계층, 헬스 체크와 API 유틸이 함께 놓이는 공용 기반입니다.",
    evidenceLevel: "approved",
    files: ["app.py", "database.py", "routers/health.py", "modules/api_utils.py"],
  },
  {
    key: "event-axis",
    group: "event-axis",
    title: "이벤트 축",
    summary: "경쟁 카드 이벤트를 수집하고 해석하는 구현 경로와 승인 경로를 한 축으로 묶었습니다.",
    evidenceLevel: "approved",
    files: [
      "modules/connectors/*",
      "modules/extraction.py",
      "modules/normalization.py",
      "modules/pipeline.py",
      "modules/insights.py",
      "routers/events.py",
      "routers/pipeline.py",
      "routers/jobs.py",
      "modules/event_enrichment.py",
      "modules/classification.py",
      "modules/condition_facts.py",
      "modules/rules_engine.py",
    ],
  },
  {
    key: "product-axis",
    group: "product-axis",
    title: "상품 축",
    summary: "상품 설명서와 공시를 RAG 기반 지식으로 바꾸는 승인 경로를 별도 축으로 유지합니다.",
    evidenceLevel: "approved",
    files: [
      "routers/disclosures.py",
      "routers/rag.py",
      "modules/product_links.py",
      "modules/rag/collector.py",
      "modules/rag/chunker.py",
      "modules/rag/embedder.py",
      "modules/rag/product_scraper.py",
      "modules/rag/catalog_summary.py",
    ],
  },
  {
    key: "delivery-surfaces",
    group: "delivery-surfaces",
    title: "전달면",
    summary: "대시보드, 브리핑, 애널리틱스, 이메일 리포트를 잇는 결과 표면입니다.",
    evidenceLevel: "approved",
    files: [
      "templates/dashboard_luxury.html",
      "templates/dashboard_pro.html",
      "static/js/dashboard.js",
      "routers/analytics.py",
      "routers/briefing.py",
      "routers/pages.py",
      "modules/analytics_service.py",
      "modules/briefing.py",
      "templates/email_daily_briefing.html",
      "templates/weekly_report.html",
      "static/js/dashboard_extras.js",
    ],
  },
] as const satisfies readonly PublicCluster[];

const evidenceLabel = {
  implemented: "구현됨",
  approved: "승인된 설계",
} as const;

const technologiesByGroup: Record<ClusterGroup, readonly string[]> = {
  "shared-core": ["FastAPI", "SQLite", "SQLAlchemy"],
  "event-axis": ["Playwright", "BeautifulSoup", "Gemini"],
  "product-axis": ["PDF/HTML extraction", "ChromaDB", "RAG"],
  "delivery-surfaces": ["FastAPI", "SQLAlchemy", "APScheduler"],
};

const pathEvidence = detailedClusters.reduce<Record<string, EvidenceLevel>>((map, cluster) => {
  cluster.files.forEach((file) => {
    map[file] = mergeEvidenceLevel(map[file], cluster.evidenceLevel);
  });

  return map;
}, {});

export const moduleMap: LegacyModuleMap = defineHidden(
  {
    clusters: publicClusters,
  },
  "sections",
  [
    {
      key: "shared-foundation",
      title: "공유 코어와 전달면",
      summary: "애플리케이션 공통 기반과 결과를 보여주는 전달면을 하나의 기둥으로 묶습니다.",
      clusters: detailedClusters
        .filter((cluster) => cluster.group === "shared-core" || cluster.group === "delivery-surfaces")
        .map((cluster) => ({
          key: "shared",
          title: cluster.title,
          summary: cluster.summary,
          technologies: technologiesByGroup[cluster.group],
          evidence: evidenceLabel[cluster.evidenceLevel],
          files: cluster.files,
        })),
    },
    {
      key: "event-pipeline",
      title: "이벤트 파이프라인",
      summary: "경쟁 카드 이벤트를 수집하고 해석하는 실제 경로와 승인 경로를 함께 배치합니다.",
      clusters: detailedClusters
        .filter((cluster) => cluster.group === "event-axis")
        .map((cluster) => ({
          key: "event-pipeline",
          title: cluster.title,
          summary: cluster.summary,
          technologies: technologiesByGroup[cluster.group],
          evidence: evidenceLabel[cluster.evidenceLevel],
          files: cluster.files,
        })),
    },
    {
      key: "product-rag",
      title: "상품 지식 파이프라인",
      summary: "상품 설명서와 공시를 RAG 기반 지식으로 바꾸는 승인 경로를 별도 축으로 유지합니다.",
      clusters: detailedClusters
        .filter((cluster) => cluster.group === "product-axis")
        .map((cluster) => ({
          key: "product-rag",
          title: cluster.title,
          summary: cluster.summary,
          technologies: technologiesByGroup[cluster.group],
          evidence: evidenceLabel[cluster.evidenceLevel],
          files: cluster.files,
        })),
    },
  ],
);

export const resolveModulePathStatus = (relativePath: string): EvidenceLevel =>
  pathEvidence[relativePath] ?? "approved";
