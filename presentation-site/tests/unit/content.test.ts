import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";
import { siteContent } from "@/content/site-content";

describe("task 1 content contracts", () => {
  it("shares the same flat copy contract between site and architecture exports", () => {
    expect(siteContent.copy).toBe(architectureContent.copy);
    expect(Object.keys(siteContent.copy)).toEqual([
      "productName",
      "deckTitle",
      "navOverview",
      "navArchitecture",
      "navEvidence",
      "navRoadmap",
      "heroPrimaryCta",
      "heroSecondaryCta",
      "eventAxisLabel",
      "productAxisLabel",
      "deliverySurfaceLabel",
      "evidenceImplemented",
      "evidenceApproved",
      "boardExecutiveBlueprint",
      "boardDualAxisMacro",
      "boardEventInterpretation",
      "boardProductKnowledge",
      "boardOrchestrationControl",
      "boardEvidenceModuleMap",
      "boardPrinciplesEvolution"
    ]);
  });

  it("exports the plan-compliant site content shape", () => {
    expect(Object.keys(siteContent)).toEqual([
      "copy",
      "snapshotMeta",
      "navigation",
      "hero",
      "landingScenes",
      "decisionSurfaces",
      "valueCards"
    ]);

    expect(Object.keys(siteContent.snapshotMeta)).toEqual(["label", "capturedOn", "note"]);
    expect(siteContent.snapshotMeta.capturedOn).toBe("2026-03-20");

    siteContent.navigation.forEach((item) => {
      expect(Object.keys(item)).toEqual(["key", "label", "href"]);
    });

    expect(Object.keys(siteContent.hero)).toEqual([
      "eyebrow",
      "title",
      "summary",
      "primaryCta",
      "secondaryCta"
    ]);
    expect(Object.keys(siteContent.hero.primaryCta)).toEqual(["label", "href"]);
    expect(Object.keys(siteContent.hero.secondaryCta)).toEqual(["label", "href"]);

    expect(siteContent.landingScenes.map((scene) => scene.key)).toEqual([
      "thesis",
      "tension",
      "dual-engine",
      "decision-surfaces",
      "system-value",
      "deep-dive-handoff"
    ]);
    siteContent.landingScenes.forEach((scene) => {
      expect(Object.keys(scene)).toEqual(["key", "title", "summary"]);
    });

    siteContent.decisionSurfaces.forEach((surface) => {
      expect(Object.keys(surface)).toEqual(["key", "title", "summary"]);
    });

    siteContent.valueCards.forEach((card) => {
      expect(Object.keys(card)).toEqual(["key", "title", "description"]);
    });
  });

  it("exports the plan-compliant architecture shape", () => {
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

    expect(architectureContent.axes.map((axis) => axis.key)).toEqual([
      "event-intelligence",
      "product-intelligence"
    ]);
    architectureContent.axes.forEach((axis) => {
      expect(Object.keys(axis)).toEqual(["key", "title", "question", "technologyBadges"]);
    });

    expect(Object.keys(architectureContent.executiveBlueprint)).toEqual([
      "inputLanes",
      "processingLanes",
      "deliverySurface",
      "technologyBadges"
    ]);
    architectureContent.executiveBlueprint.inputLanes.forEach((lane) => {
      expect(Object.keys(lane)).toEqual(["title", "summary"]);
    });
    architectureContent.executiveBlueprint.processingLanes.forEach((lane) => {
      expect(Object.keys(lane)).toEqual(["title", "summary"]);
    });
    expect(Object.keys(architectureContent.executiveBlueprint.deliverySurface)).toEqual([
      "title",
      "summary"
    ]);

    expect(architectureContent.eventInterpretation.steps.map((step) => step.key)).toEqual([
      "collect",
      "extract",
      "structure",
      "rule-interpretation",
      "gemini-augmentation",
      "briefing-summary",
      "deliver"
    ]);
    architectureContent.eventInterpretation.steps.forEach((step) => {
      expect(Object.keys(step)).toEqual(["key", "title", "summary", "technologies", "output"]);
    });

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
    architectureContent.productKnowledge.steps.forEach((step) => {
      expect(Object.keys(step)).toEqual(["key", "title", "summary", "technologies", "output"]);
    });

    architectureContent.orchestrationColumns.forEach((column) => {
      expect(Object.keys(column)).toEqual(["title", "nodes", "technologies"]);
    });

    expect(Array.isArray(architectureContent.principles)).toBe(true);
    expect(Array.isArray(architectureContent.roadmap)).toBe(true);
    architectureContent.principles.forEach((principle) => {
      expect(typeof principle).toBe("string");
    });
    architectureContent.roadmap.forEach((item) => {
      expect(typeof item).toBe("string");
    });
  });

  it("keeps the required technologies visible in the exported architecture contract", () => {
    const corpus = [
      architectureContent.axes.flatMap((axis) => axis.technologyBadges),
      architectureContent.executiveBlueprint.technologyBadges,
      architectureContent.eventInterpretation.steps.flatMap((step) => step.technologies),
      architectureContent.productKnowledge.steps.flatMap((step) => step.technologies),
      architectureContent.orchestrationColumns.flatMap((column) => column.technologies)
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

  it("exports the plan-compliant module map adapter shape", () => {
    expect(Object.keys(moduleMap)).toEqual(["clusters"]);

    const groups = [...new Set(moduleMap.clusters.map((cluster) => cluster.group))].sort();
    expect(groups).toEqual([
      "delivery-surfaces",
      "event-axis",
      "product-axis",
      "shared-core"
    ]);

    moduleMap.clusters.forEach((cluster) => {
      expect(Object.keys(cluster)).toEqual([
        "key",
        "group",
        "title",
        "summary",
        "evidenceLevel",
        "files"
      ]);
    });
  });

  it("maps the required files through evidence-level clusters", () => {
    const findCluster = (key: string) => moduleMap.clusters.find((cluster) => cluster.key === key);

    expect(findCluster("shared-core-implemented")?.files).toEqual(["app.py", "database.py"]);
    expect(findCluster("shared-core-approved")?.files).toEqual([
      "routers/health.py",
      "modules/api_utils.py"
    ]);

    expect(findCluster("event-axis-implemented")?.files).toEqual([
      "modules/connectors/*",
      "modules/extraction.py",
      "modules/normalization.py",
      "modules/pipeline.py",
      "modules/insights.py"
    ]);
    expect(findCluster("event-axis-approved")?.files).toEqual([
      "routers/events.py",
      "routers/pipeline.py",
      "routers/jobs.py",
      "modules/event_enrichment.py",
      "modules/classification.py",
      "modules/condition_facts.py",
      "modules/rules_engine.py"
    ]);

    expect(findCluster("product-axis-approved")?.files).toEqual([
      "routers/disclosures.py",
      "routers/rag.py",
      "modules/product_links.py",
      "modules/rag/collector.py",
      "modules/rag/chunker.py",
      "modules/rag/embedder.py",
      "modules/rag/product_scraper.py",
      "modules/rag/catalog_summary.py"
    ]);

    expect(findCluster("delivery-surfaces-implemented")?.files).toEqual([
      "templates/dashboard_luxury.html",
      "templates/dashboard_pro.html",
      "static/js/dashboard.js"
    ]);
    expect(findCluster("delivery-surfaces-approved")?.files).toEqual([
      "routers/analytics.py",
      "routers/briefing.py",
      "routers/pages.py",
      "modules/analytics_service.py",
      "modules/briefing.py",
      "templates/email_daily_briefing.html",
      "templates/weekly_report.html",
      "static/js/dashboard_extras.js"
    ]);
  });

  it("keeps reviewer-flagged UI labels localized", () => {
    const corpus = [
      ...Object.values(siteContent.copy),
      ...siteContent.navigation.flatMap((item) => [item.label]),
      ...siteContent.landingScenes.flatMap((scene) => [scene.title, scene.summary]),
      ...siteContent.decisionSurfaces.flatMap((surface) => [surface.title, surface.summary]),
      ...siteContent.valueCards.flatMap((card) => [card.title, card.description]),
      ...architectureContent.principles,
      ...architectureContent.roadmap
    ].join(" ");

    expect(corpus).not.toContain("Executive Atlas");
    expect(corpus).not.toContain("Overview");
    expect(corpus).not.toContain("How It Works");
    expect(corpus).not.toContain("Deep Dive");
  });
});
