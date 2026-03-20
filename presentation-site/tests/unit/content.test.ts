import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";
import { siteContent } from "@/content/site-content";

describe("executive atlas content contracts", () => {
  it("shares a stable copy contract between site and architecture content", () => {
    expect(siteContent.copy).toBe(architectureContent.copy);
    expect(siteContent.copy.navigation.overview).toBe("개요");
    expect(siteContent.copy.evidence.implemented).toBe("구현됨");
    expect(siteContent.copy.evidence.approved).toBe("승인된 설계");
  });

  it("exposes the required site content top-level fields", () => {
    expect(Object.keys(siteContent)).toEqual([
      "copy",
      "snapshotMeta",
      "navigation",
      "hero",
      "landingScenes",
      "decisionSurfaces",
      "valueCards"
    ]);
  });

  it("exposes the required architecture keys and board order", () => {
    expect(Object.keys(architectureContent)).toEqual([
      "copy",
      "boardOrder",
      "axes",
      "executiveBlueprint",
      "eventInterpretation",
      "productKnowledge",
      "orchestrationColumns",
      "principles",
      "roadmap"
    ]);

    expect(architectureContent.boardOrder).toEqual([
      "executive-blueprint",
      "dual-axis-macro",
      "event-interpretation",
      "product-knowledge",
      "orchestration-control",
      "evidence-module-map",
      "principles-evolution"
    ]);

    expect(architectureContent.executiveBlueprint.boards.map((board) => board.key)).toEqual(
      architectureContent.boardOrder
    );
  });

  it("keeps the event interpretation step keys in the approved order", () => {
    expect(architectureContent.eventInterpretation.steps.map((step) => step.key)).toEqual([
      "collect",
      "extract",
      "structure",
      "rule-interpretation",
      "gemini-augmentation",
      "briefing-summary",
      "deliver"
    ]);
  });

  it("keeps the product knowledge step keys in the approved order", () => {
    expect(architectureContent.productKnowledge.steps.map((step) => step.key)).toEqual([
      "collect-sources",
      "store-raw",
      "clean-document",
      "chunk",
      "embed",
      "store-vector",
      "retrieve-rag",
      "compose-response",
      "deliver"
    ]);
  });

  it("mentions the required technologies across the architecture story", () => {
    const corpus = [
      architectureContent.axes.flatMap((axis) => [axis.title, axis.summary, ...axis.badges]),
      architectureContent.executiveBlueprint.boards.flatMap((board) => [
        board.title,
        board.summary,
        ...board.badges
      ]),
      architectureContent.eventInterpretation.steps.flatMap((step) => [
        step.title,
        step.summary,
        ...step.badges
      ]),
      architectureContent.productKnowledge.steps.flatMap((step) => [
        step.title,
        step.summary,
        ...step.badges
      ]),
      architectureContent.orchestrationColumns.flatMap((column) => [
        column.title,
        column.summary,
        ...column.badges
      ]),
      moduleMap.clusters.flatMap((cluster) => [cluster.title, cluster.summary, ...cluster.badges])
    ]
      .flat()
      .join(" ");

    expect(corpus).toContain("Playwright");
    expect(corpus).toContain("BeautifulSoup");
    expect(corpus).toContain("Gemini");
    expect(corpus).toContain("FastAPI");
    expect(corpus).toContain("APScheduler");
    expect(corpus).toContain("SQLite");
    expect(corpus).toContain("SQLAlchemy");
    expect(corpus).toContain("ChromaDB");
    expect(corpus).toContain("RAG");
    expect(corpus).toContain("PDF/HTML extraction");
  });

  it("localizes reviewer-flagged UI and status labels that are not technology names", () => {
    const corpus = [
      architectureContent.copy.deckTitle,
      architectureContent.executiveBlueprint.boards.flatMap((board) => board.badges),
      architectureContent.eventInterpretation.steps.flatMap((step) => step.badges),
      architectureContent.productKnowledge.steps.flatMap((step) => step.badges),
      moduleMap.clusters.flatMap((cluster) => cluster.badges)
    ]
      .flat()
      .join(" ");

    expect(corpus).not.toContain("Executive Atlas");
    expect(corpus).not.toContain("Rules Engine");
    expect(corpus).not.toContain("Insights");
    expect(corpus).not.toContain("Briefing");
    expect(corpus).not.toContain("Dashboard");
    expect(corpus).not.toContain("Product Links");
    expect(corpus).not.toContain("Chunking");
    expect(corpus).not.toContain("Embedding");
    expect(corpus).not.toContain("Retriever");
    expect(corpus).not.toContain("Approved Contract");
    expect(corpus).not.toContain("Implemented Surface");
  });

  it("defines module clusters across the required groups only", () => {
    const groups = [...new Set(moduleMap.clusters.map((cluster) => cluster.group))].sort();
    expect(groups).toEqual([
      "delivery-surfaces",
      "event-axis",
      "product-axis",
      "shared-core"
    ]);
  });

  it("maps the required minimum paths with honest evidence levels", () => {
    const findEntry = (group: string, path: string) =>
      moduleMap.clusters
        .filter((cluster) => cluster.group === group)
        .flatMap((cluster) => cluster.entries)
        .find((entry) => entry.path === path);

    expect(findEntry("shared-core", "app.py")?.evidenceLevel).toBe("implemented");
    expect(findEntry("shared-core", "database.py")?.evidenceLevel).toBe("implemented");
    expect(findEntry("shared-core", "routers/health.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("shared-core", "modules/api_utils.py")?.evidenceLevel).toBe("approved");

    expect(findEntry("event-axis", "routers/events.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("event-axis", "routers/pipeline.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("event-axis", "routers/jobs.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("event-axis", "modules/connectors/*")?.evidenceLevel).toBe("implemented");
    expect(findEntry("event-axis", "modules/extraction.py")?.evidenceLevel).toBe("implemented");
    expect(findEntry("event-axis", "modules/normalization.py")?.evidenceLevel).toBe("implemented");
    expect(findEntry("event-axis", "modules/pipeline.py")?.evidenceLevel).toBe("implemented");
    expect(findEntry("event-axis", "modules/event_enrichment.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("event-axis", "modules/classification.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("event-axis", "modules/condition_facts.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("event-axis", "modules/rules_engine.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("event-axis", "modules/insights.py")?.evidenceLevel).toBe("implemented");

    expect(findEntry("product-axis", "routers/disclosures.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("product-axis", "routers/rag.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("product-axis", "modules/product_links.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("product-axis", "modules/rag/collector.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("product-axis", "modules/rag/chunker.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("product-axis", "modules/rag/embedder.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("product-axis", "modules/rag/product_scraper.py")?.evidenceLevel).toBe(
      "approved"
    );
    expect(findEntry("product-axis", "modules/rag/catalog_summary.py")?.evidenceLevel).toBe(
      "approved"
    );

    expect(findEntry("delivery-surfaces", "routers/analytics.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("delivery-surfaces", "routers/briefing.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("delivery-surfaces", "routers/pages.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("delivery-surfaces", "modules/analytics_service.py")?.evidenceLevel).toBe(
      "approved"
    );
    expect(findEntry("delivery-surfaces", "modules/briefing.py")?.evidenceLevel).toBe("approved");
    expect(findEntry("delivery-surfaces", "templates/dashboard_luxury.html")?.evidenceLevel).toBe(
      "implemented"
    );
    expect(findEntry("delivery-surfaces", "templates/dashboard_pro.html")?.evidenceLevel).toBe(
      "implemented"
    );
    expect(
      findEntry("delivery-surfaces", "templates/email_daily_briefing.html")?.evidenceLevel
    ).toBe("approved");
    expect(findEntry("delivery-surfaces", "templates/weekly_report.html")?.evidenceLevel).toBe(
      "approved"
    );
    expect(findEntry("delivery-surfaces", "static/js/dashboard.js")?.evidenceLevel).toBe(
      "implemented"
    );
    expect(findEntry("delivery-surfaces", "static/js/dashboard_extras.js")?.evidenceLevel).toBe(
      "approved"
    );
  });
});
