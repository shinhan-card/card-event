import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";
import { siteContent } from "@/content/site-content";

const hasHangul = (value: string) => /[가-힣]/.test(value);

const expectKoreanLabel = (value: string) => {
  expect(value).toEqual(expect.any(String));
  expect(hasHangul(value)).toBe(true);
};

describe("task 1 content contracts", () => {
  it("shares the exact copy contract between site and architecture exports", () => {
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
      "boardPrinciplesEvolution",
    ]);

    Object.values(siteContent.copy).forEach((label) => {
      expectKoreanLabel(label);
    });
  });

  it("exports only the plan-compliant site content fields", () => {
    expect(Object.keys(siteContent)).toEqual([
      "copy",
      "snapshotMeta",
      "navigation",
      "hero",
      "landingScenes",
      "decisionSurfaces",
      "valueCards",
    ]);

    expect(Object.keys(siteContent.snapshotMeta)).toEqual(["label", "capturedOn", "note"]);
    expect(siteContent.snapshotMeta.capturedOn).toBe("2026-03-20");
    expectKoreanLabel(siteContent.snapshotMeta.label);
    expectKoreanLabel(siteContent.snapshotMeta.note);

    expect(siteContent.navigation).toHaveLength(4);
    siteContent.navigation.forEach((item) => {
      expect(Object.keys(item)).toEqual(["href", "label"]);
      expect(item.href).toEqual(expect.stringMatching(/^\//));
      expectKoreanLabel(item.label);
    });

    expect(Object.keys(siteContent.hero)).toEqual([
      "eyebrow",
      "title",
      "summary",
      "primaryCta",
      "secondaryCta",
    ]);
    expectKoreanLabel(siteContent.hero.eyebrow);
    expectKoreanLabel(siteContent.hero.title);
    expectKoreanLabel(siteContent.hero.summary);
    expect(Object.keys(siteContent.hero.primaryCta)).toEqual(["label", "href"]);
    expect(Object.keys(siteContent.hero.secondaryCta)).toEqual(["label", "href"]);
    expectKoreanLabel(siteContent.hero.primaryCta.label);
    expectKoreanLabel(siteContent.hero.secondaryCta.label);

    expect(siteContent.landingScenes.map((scene) => scene.key)).toEqual([
      "thesis",
      "tension",
      "dual-engine",
      "decision-surfaces",
      "system-value",
      "deep-dive-handoff",
    ]);
    siteContent.landingScenes.forEach((scene) => {
      expect(Object.keys(scene)).toEqual(["key", "anchorId", "title", "summary"]);
      expect(scene.anchorId).toEqual(expect.any(String));
      expectKoreanLabel(scene.title);
      expectKoreanLabel(scene.summary);
    });

    siteContent.decisionSurfaces.forEach((surface) => {
      expect(Object.keys(surface)).toEqual(["title", "summary"]);
      expectKoreanLabel(surface.title);
      expectKoreanLabel(surface.summary);
    });

    siteContent.valueCards.forEach((card) => {
      expect(Object.keys(card)).toEqual(["title", "summary"]);
      expectKoreanLabel(card.title);
      expectKoreanLabel(card.summary);
    });
  });

  it("keeps site compatibility helpers hidden from the enumerable contract", () => {
    expect(siteContent.snapshot).toBe(siteContent.snapshotMeta);
    expect(siteContent.showroom.hero.intro).toEqual(expect.any(String));
    expect(siteContent.showroom.problem.cards).toHaveLength(2);
    expect(siteContent.showroom.outcomes.cards).toHaveLength(siteContent.valueCards.length);
    expect(siteContent.showroom.deepDiveCta.cta.href).toBe(siteContent.hero.primaryCta.href);
    expectKoreanLabel(siteContent.showroom.deepDiveCta.cta.label);

    expect(Object.getOwnPropertyDescriptor(siteContent, "snapshot")?.enumerable).toBe(false);
    expect(Object.getOwnPropertyDescriptor(siteContent, "showroom")?.enumerable).toBe(false);
  });

  it("exports only the plan-compliant architecture fields", () => {
    expect(Object.keys(architectureContent)).toEqual([
      "copy",
      "boardOrder",
      "axes",
      "executiveBlueprint",
      "eventInterpretation",
      "productKnowledge",
      "orchestrationColumns",
      "principles",
      "roadmap",
    ]);

    expect(architectureContent.boardOrder).toEqual([
      "executive-blueprint",
      "dual-axis-macro",
      "event-interpretation",
      "product-knowledge",
      "orchestration-control",
      "evidence-module-map",
      "principles-evolution",
    ]);

    expect(Object.keys(architectureContent.axes)).toEqual([
      "event-intelligence",
      "product-intelligence",
    ]);

    for (const [key, axis] of Object.entries(architectureContent.axes)) {
      expect(Object.keys(axis)).toEqual(["title", "question", "summary", "technologyBadges"]);
      expectKoreanLabel(axis.title);
      expectKoreanLabel(axis.question);
      expectKoreanLabel(axis.summary);
      expect(axis.technologyBadges.length).toBeGreaterThan(0);
      expect((axis as { key?: string }).key).toBe(key);
      expect(Object.getOwnPropertyDescriptor(axis, "key")?.enumerable).toBe(false);
    }

    expect(Object.keys(architectureContent.executiveBlueprint)).toEqual([
      "inputLanes",
      "processingLanes",
      "deliverySurface",
      "technologyBadges",
    ]);
    architectureContent.executiveBlueprint.inputLanes.forEach((lane) => expectKoreanLabel(lane));
    architectureContent.executiveBlueprint.processingLanes.forEach((lane) =>
      expectKoreanLabel(lane),
    );
    architectureContent.executiveBlueprint.deliverySurface.forEach((surface) =>
      expectKoreanLabel(surface),
    );
    expect(architectureContent.executiveBlueprint.technologyBadges).toEqual(
      expect.arrayContaining([
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
      ]),
    );

    expect(Object.keys(architectureContent.eventInterpretation)).toEqual(["title", "steps"]);
    expectKoreanLabel(architectureContent.eventInterpretation.title);
    expect(architectureContent.eventInterpretation.steps.map((step) => step.key)).toEqual([
      "collect",
      "extract",
      "structure",
      "rule-interpretation",
      "gemini-augmentation",
      "briefing-summary",
      "deliver",
    ]);
    architectureContent.eventInterpretation.steps.forEach((step) => {
      expect(Object.keys(step)).toEqual([
        "key",
        "title",
        "summary",
        "technologies",
        "output",
      ]);
      expectKoreanLabel(step.title);
      expectKoreanLabel(step.summary);
      expectKoreanLabel(step.output);
    });

    expect(Object.keys(architectureContent.productKnowledge)).toEqual(["title", "steps"]);
    expectKoreanLabel(architectureContent.productKnowledge.title);
    expect(architectureContent.productKnowledge.steps.map((step) => step.key)).toEqual([
      "collect-sources",
      "store-raw",
      "clean-document",
      "chunk",
      "embed",
      "store-vector",
      "retrieve-rag",
      "compose-response",
      "deliver",
    ]);
    architectureContent.productKnowledge.steps.forEach((step) => {
      expect(Object.keys(step)).toEqual([
        "key",
        "title",
        "summary",
        "technologies",
        "output",
      ]);
      expectKoreanLabel(step.title);
      expectKoreanLabel(step.summary);
      expectKoreanLabel(step.output);
    });

    architectureContent.orchestrationColumns.forEach((column) => {
      expect(Object.keys(column)).toEqual(["title", "nodes", "technologies"]);
      expectKoreanLabel(column.title);
      column.nodes.forEach((node) => expectKoreanLabel(node));
    });

    architectureContent.principles.forEach((principle) => {
      expect(Object.keys(principle)).toEqual(["title", "caption"]);
      expectKoreanLabel(principle.title);
      expectKoreanLabel(principle.caption);
    });

    architectureContent.roadmap.forEach((item) => {
      expect(Object.keys(item)).toEqual(["title", "caption", "stage"]);
      expectKoreanLabel(item.title);
      expectKoreanLabel(item.caption);
      expectKoreanLabel(item.stage);
    });
  });

  it("keeps architecture compatibility helpers hidden while preserving consumer access", () => {
    expect(architectureContent.axes.map((axis) => axis.key)).toEqual([
      "event-intelligence",
      "product-intelligence",
    ]);
    expect(architectureContent.deepDive.title).toEqual(expect.any(String));
    expect(architectureContent.conceptArchitecture.zones).toHaveLength(3);
    expect(architectureContent.stageBreakdown.cards).toHaveLength(3);
    expect(architectureContent.orchestrationMap.groups.length).toBeGreaterThan(0);
    expect(architectureContent.principlesSection.cards).toHaveLength(
      architectureContent.principles.length,
    );
    expect(architectureContent.dualAxisArchitecture.lanes).toHaveLength(2);
    expect(architectureContent.evolutionRoadmap.phases).toHaveLength(
      architectureContent.roadmap.length,
    );
    expect(architectureContent.stages.map((stage) => stage.key)).toContain("collect");
    expect(architectureContent.designPrinciples).toHaveLength(architectureContent.principles.length);
    expect(architectureContent.orchestration.summary).toEqual(expect.any(String));

    [
      "deepDive",
      "conceptArchitecture",
      "stageBreakdown",
      "orchestrationMap",
      "principlesSection",
      "dualAxisArchitecture",
      "evolutionRoadmap",
      "stages",
      "designPrinciples",
      "orchestration",
    ].forEach((key) => {
      expect(Object.getOwnPropertyDescriptor(architectureContent, key)?.enumerable).toBe(false);
    });
  });

  it("exports only the plan-compliant module map contract", () => {
    expect(Object.keys(moduleMap)).toEqual(["clusters"]);

    expect(moduleMap.clusters.map((cluster) => cluster.key)).toEqual([
      "shared-core-implemented",
      "shared-core-approved",
      "event-axis-implemented",
      "event-axis-approved",
      "product-axis-approved",
      "delivery-surfaces-implemented",
      "delivery-surfaces-approved",
    ]);

    moduleMap.clusters.forEach((cluster) => {
      expect(Object.keys(cluster)).toEqual([
        "key",
        "group",
        "title",
        "summary",
        "evidenceLevel",
        "files",
      ]);
      expectKoreanLabel(cluster.title);
      expectKoreanLabel(cluster.summary);
      cluster.files.forEach((file) => {
        expect(file).toEqual(expect.any(String));
      });
    });
  });

  it("keeps module map compatibility helpers hidden from the public contract", () => {
    expect(moduleMap.sections.length).toBeGreaterThan(0);
    expect(moduleMap.sections.some((section) => section.clusters.some((cluster) => cluster.key === "shared"))).toBe(true);
    expect(
      moduleMap.sections.some((section) =>
        section.clusters.some((cluster) => cluster.key === "event-pipeline"),
      ),
    ).toBe(true);
    expect(
      moduleMap.sections.some((section) =>
        section.clusters.some((cluster) => cluster.key === "product-rag"),
      ),
    ).toBe(true);
    expect(Object.getOwnPropertyDescriptor(moduleMap, "sections")?.enumerable).toBe(false);
  });
});
