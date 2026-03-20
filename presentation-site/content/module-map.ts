type ModuleCluster = {
  key: string;
  group: "shared-core" | "event-axis" | "product-axis" | "delivery-surfaces";
  title: string;
  summary: string;
  evidenceLevel: "implemented" | "approved";
  files: readonly string[];
};

const cluster = (
  key: ModuleCluster["key"],
  group: ModuleCluster["group"],
  title: string,
  summary: string,
  evidenceLevel: ModuleCluster["evidenceLevel"],
  files: readonly string[]
): ModuleCluster => ({
  key,
  group,
  title,
  summary,
  evidenceLevel,
  files
});

const clusters = [
  cluster(
    "shared-core-implemented",
    "shared-core",
    "공유 코어 구현",
    "현재 브랜치에서 실제로 존재하는 애플리케이션 진입점과 저장 계층입니다.",
    "implemented",
    ["app.py", "database.py"]
  ),
  cluster(
    "shared-core-approved",
    "shared-core",
    "공유 코어 승인 경로",
    "승인 스펙에는 포함되지만 이 브랜치에는 아직 없는 헬스와 API 유틸 경로입니다.",
    "approved",
    ["routers/health.py", "modules/api_utils.py"]
  ),
  cluster(
    "event-axis-implemented",
    "event-axis",
    "이벤트 축 구현 경로",
    "이벤트 수집, 추출, 정규화, 파이프라인, 인사이트 생성의 실제 구현 묶음입니다.",
    "implemented",
    [
      "modules/connectors/*",
      "modules/extraction.py",
      "modules/normalization.py",
      "modules/pipeline.py",
      "modules/insights.py"
    ]
  ),
  cluster(
    "event-axis-approved",
    "event-axis",
    "이벤트 축 승인 경로",
    "승인 스펙에 정의됐지만 이 브랜치에는 아직 반영되지 않은 라우터와 세부 해석 모듈입니다.",
    "approved",
    [
      "routers/events.py",
      "routers/pipeline.py",
      "routers/jobs.py",
      "modules/event_enrichment.py",
      "modules/classification.py",
      "modules/condition_facts.py",
      "modules/rules_engine.py"
    ]
  ),
  cluster(
    "product-axis-approved",
    "product-axis",
    "상품 축 승인 경로",
    "상품 설명서, 공시, RAG 파이프라인을 구성하는 승인 상태의 경로입니다.",
    "approved",
    [
      "routers/disclosures.py",
      "routers/rag.py",
      "modules/product_links.py",
      "modules/rag/collector.py",
      "modules/rag/chunker.py",
      "modules/rag/embedder.py",
      "modules/rag/product_scraper.py",
      "modules/rag/catalog_summary.py"
    ]
  ),
  cluster(
    "delivery-surfaces-implemented",
    "delivery-surfaces",
    "전달면 구현 경로",
    "현재 브랜치에서 확인 가능한 실제 대시보드 템플릿과 프런트엔드 스크립트입니다.",
    "implemented",
    [
      "templates/dashboard_luxury.html",
      "templates/dashboard_pro.html",
      "static/js/dashboard.js"
    ]
  ),
  cluster(
    "delivery-surfaces-approved",
    "delivery-surfaces",
    "전달면 승인 경로",
    "브리핑, 애널리틱스, 이메일 리포트 표면을 구성하는 승인 상태의 경로입니다.",
    "approved",
    [
      "routers/analytics.py",
      "routers/briefing.py",
      "routers/pages.py",
      "modules/analytics_service.py",
      "modules/briefing.py",
      "templates/email_daily_briefing.html",
      "templates/weekly_report.html",
      "static/js/dashboard_extras.js"
    ]
  )
] as const satisfies readonly ModuleCluster[];

export const moduleMap = {
  clusters
} as const satisfies { clusters: readonly ModuleCluster[] };
