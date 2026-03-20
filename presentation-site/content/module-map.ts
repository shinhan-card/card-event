import type { EvidenceLevel } from "@/content/architecture-content";

export type ModuleGroup =
  | "shared-core"
  | "event-axis"
  | "product-axis"
  | "delivery-surfaces";

export interface ModuleEntry {
  path: string;
  evidenceLevel: EvidenceLevel;
  note: string;
}

export interface ModuleCluster {
  key: string;
  group: ModuleGroup;
  title: string;
  summary: string;
  badges: readonly string[];
  entries: readonly ModuleEntry[];
}

export interface ModuleMap {
  title: string;
  summary: string;
  clusters: readonly ModuleCluster[];
}

const entry = (path: string, evidenceLevel: EvidenceLevel, note: string): ModuleEntry => ({
  path,
  evidenceLevel,
  note
});

const clusters = [
  {
    key: "shared-core-implemented",
    group: "shared-core",
    title: "공유 코어 구현",
    summary: "현재 브랜치에서 실제로 확인되는 애플리케이션 시작점과 저장 계층입니다.",
    badges: ["FastAPI", "SQLite", "SQLAlchemy"],
    entries: [
      entry("app.py", "implemented", "현재 브랜치의 애플리케이션 진입점"),
      entry("database.py", "implemented", "현재 브랜치의 데이터베이스 초기화 레이어")
    ]
  },
  {
    key: "shared-core-approved",
    group: "shared-core",
    title: "공유 코어 승인 경로",
    summary: "승인 스펙에는 포함되지만 이 브랜치에는 아직 없는 공용 헬스와 API 유틸 경로입니다.",
    badges: ["FastAPI", "Approved Contract"],
    entries: [
      entry("routers/health.py", "approved", "헬스체크 라우터의 승인 스펙 경로"),
      entry("modules/api_utils.py", "approved", "공용 API 유틸의 승인 스펙 경로")
    ]
  },
  {
    key: "event-axis-implemented",
    group: "event-axis",
    title: "이벤트 축 구현 경로",
    summary: "이벤트 수집과 정규화, 인사이트 생성의 실제 구현 근거가 이 브랜치에 존재합니다.",
    badges: ["Playwright", "BeautifulSoup", "Gemini"],
    entries: [
      entry("modules/connectors/*", "implemented", "카드사별 커넥터 구현 묶음"),
      entry("modules/extraction.py", "implemented", "본문 추출 구현"),
      entry("modules/normalization.py", "implemented", "조건 정규화 구현"),
      entry("modules/pipeline.py", "implemented", "이벤트 파이프라인 구현"),
      entry("modules/insights.py", "implemented", "운영 인사이트 생성 구현")
    ]
  },
  {
    key: "event-axis-approved",
    group: "event-axis",
    title: "이벤트 축 승인 경로",
    summary: "승인 스펙은 라우터와 세부 해석 모듈까지 요구하지만, 이 브랜치에는 아직 반영되지 않았습니다.",
    badges: ["APScheduler", "Rules Engine", "Approved Contract"],
    entries: [
      entry("routers/events.py", "approved", "이벤트 라우터의 승인 스펙 경로"),
      entry("routers/pipeline.py", "approved", "파이프라인 라우터의 승인 스펙 경로"),
      entry("routers/jobs.py", "approved", "스케줄 작업 라우터의 승인 스펙 경로"),
      entry("modules/event_enrichment.py", "approved", "이벤트 보강 모듈의 승인 스펙 경로"),
      entry("modules/classification.py", "approved", "분류 모듈의 승인 스펙 경로"),
      entry("modules/condition_facts.py", "approved", "조건 사실화 모듈의 승인 스펙 경로"),
      entry("modules/rules_engine.py", "approved", "규칙 엔진 모듈의 승인 스펙 경로")
    ]
  },
  {
    key: "product-axis-approved",
    group: "product-axis",
    title: "상품 축 승인 경로",
    summary: "상품 지식 축은 승인 스펙에 정의돼 있지만, 이 브랜치에서는 아직 구조만 먼저 유지합니다.",
    badges: ["PDF/HTML extraction", "ChromaDB", "RAG"],
    entries: [
      entry("routers/disclosures.py", "approved", "공시 라우터의 승인 스펙 경로"),
      entry("routers/rag.py", "approved", "RAG 라우터의 승인 스펙 경로"),
      entry("modules/product_links.py", "approved", "상품 링크 수집 모듈의 승인 스펙 경로"),
      entry("modules/rag/collector.py", "approved", "RAG 수집기 모듈의 승인 스펙 경로"),
      entry("modules/rag/chunker.py", "approved", "청크 분할 모듈의 승인 스펙 경로"),
      entry("modules/rag/embedder.py", "approved", "임베더 모듈의 승인 스펙 경로"),
      entry("modules/rag/product_scraper.py", "approved", "상품 스크레이퍼 모듈의 승인 스펙 경로"),
      entry("modules/rag/catalog_summary.py", "approved", "카탈로그 요약 모듈의 승인 스펙 경로")
    ]
  },
  {
    key: "delivery-surfaces-implemented",
    group: "delivery-surfaces",
    title: "전달면 구현 경로",
    summary: "운영 화면과 발표 표면 가운데 현재 브랜치에서 확인 가능한 실제 템플릿과 정적 스크립트입니다.",
    badges: ["FastAPI", "Dashboard", "Implemented Surface"],
    entries: [
      entry("templates/dashboard_luxury.html", "implemented", "럭셔리 대시보드 템플릿"),
      entry("templates/dashboard_pro.html", "implemented", "프로 대시보드 템플릿"),
      entry("static/js/dashboard.js", "implemented", "대시보드 프런트엔드 스크립트")
    ]
  },
  {
    key: "delivery-surfaces-approved",
    group: "delivery-surfaces",
    title: "전달면 승인 경로",
    summary: "브리핑, 애널리틱스, 이메일 리포트 표면은 승인 스펙에 정의돼 있으므로 경로를 유지합니다.",
    badges: ["FastAPI", "Briefing", "Approved Contract"],
    entries: [
      entry("routers/analytics.py", "approved", "애널리틱스 라우터의 승인 스펙 경로"),
      entry("routers/briefing.py", "approved", "브리핑 라우터의 승인 스펙 경로"),
      entry("routers/pages.py", "approved", "페이지 라우터의 승인 스펙 경로"),
      entry("modules/analytics_service.py", "approved", "애널리틱스 서비스의 승인 스펙 경로"),
      entry("modules/briefing.py", "approved", "브리핑 서비스의 승인 스펙 경로"),
      entry("templates/email_daily_briefing.html", "approved", "일일 브리핑 이메일 템플릿 승인 경로"),
      entry("templates/weekly_report.html", "approved", "주간 리포트 템플릿 승인 경로"),
      entry("static/js/dashboard_extras.js", "approved", "보조 대시보드 스크립트 승인 경로")
    ]
  }
] as const satisfies readonly ModuleCluster[];

export const moduleMap = {
  title: "근거 모듈 맵",
  summary:
    "현재 브랜치에 존재하는 구현 파일과 승인 스펙에만 존재하는 경로를 함께 보여주되, evidenceLevel로 상태를 명확하게 구분합니다.",
  clusters
} as const satisfies ModuleMap;
