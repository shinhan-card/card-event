import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";
import { siteContent } from "@/content/site-content";

describe("content contracts", () => {
  it("keeps both intelligence axes distinct", () => {
    const axisKeys = architectureContent.axes.map((axis) => axis.key);
    expect(axisKeys).toEqual(["event-intelligence", "product-intelligence"]);
  });

  it("keeps the deep dive Korean-first with explicit axis titles", () => {
    expect(architectureContent.deepDive.title).toBe("아키텍처 딥다이브");
    expect(architectureContent.conceptArchitecture.title).toBe("개념 아키텍처");
    expect(architectureContent.dualAxisArchitecture.lanes.map((lane) => lane.title)).toEqual([
      "이벤트 인텔리전스",
      "상품 / 공시 인텔리전스"
    ]);
  });

  it("surfaces the core runtime technologies in the deep dive content", () => {
    const stageTechnologies = architectureContent.stages.flatMap((stage) => stage.technology);
    const orchestrationText = architectureContent.orchestrationMap.groups
      .flatMap((group) => [group.title, group.summary, ...group.items.flatMap((item) => [item.title, item.summary])])
      .join(" ");
    const moduleText = moduleMap.sections
      .flatMap((section) => [section.title, section.summary, ...section.clusters.flatMap((cluster) => [cluster.title, cluster.summary])])
      .join(" ");
    const corpus = [...stageTechnologies, orchestrationText, moduleText].join(" ");

    expect(corpus).toEqual(expect.stringContaining("Playwright"));
    expect(corpus).toEqual(expect.stringContaining("Gemini"));
    expect(corpus).toEqual(expect.stringContaining("FastAPI"));
    expect(corpus).toEqual(expect.stringContaining("APScheduler"));
    expect(corpus).toEqual(expect.stringContaining("SQLite"));
    expect(corpus).toEqual(expect.stringContaining("SQLAlchemy"));
    expect(corpus).toEqual(expect.stringContaining("BeautifulSoup"));
    expect(corpus).toEqual(expect.stringContaining("ChromaDB"));
    expect(corpus).toEqual(expect.stringContaining("RAG"));
    expect(corpus).toEqual(expect.stringContaining("PDF/HTML extraction"));
  });

  it("includes landing scenes in order", () => {
    expect(siteContent.landingScenes.map((scene) => scene.key)).toEqual([
      "hero",
      "problem",
      "signal-flow",
      "outcomes",
      "orchestration",
      "deep-dive-cta"
    ]);
  });

  it("maps real modules into named clusters", () => {
    expect(moduleMap.axisRoots.map((root) => root.key)).toEqual([
      "event-pipeline",
      "product-rag"
    ]);
  });

  it("covers event, enrichment, and product intelligence responsibilities", () => {
    const eventCollection = moduleMap.sections.find((section) => section.key === "event-collection");
    const eventPipeline = moduleMap.sections.find((section) => section.key === "event-pipeline");
    const enrichment = moduleMap.sections.find((section) => section.key === "enrichment");
    const productIntelligence = moduleMap.sections.find(
      (section) => section.key === "product-intelligence"
    );

    expect(eventCollection?.clusters[0].key).toBe("event-pipeline");
    expect(eventPipeline?.clusters[0].files).toEqual(
      expect.arrayContaining([
        "modules/pipeline.py",
        "modules/extraction.py",
        "modules/normalization.py"
      ])
    );
    expect(enrichment?.clusters[0].files).toEqual(
      expect.arrayContaining([
        "modules/insights.py",
        "gemini_insight.py"
      ])
    );
    expect(productIntelligence?.clusters[0].files).toEqual(
      expect.arrayContaining([
        "routers/disclosures.py",
        "routers/rag.py",
        "modules/rag/*"
      ])
    );
  });
});
