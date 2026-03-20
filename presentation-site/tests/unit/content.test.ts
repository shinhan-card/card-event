import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";
import { siteContent } from "@/content/site-content";

const hasHangul = (value: string) => /[가-힣]/.test(value);

const expectKoreanLabel = (value: string) => {
  expect(value).toEqual(expect.any(String));
  expect(hasHangul(value)).toBe(true);
};

describe("task 1 content contracts", () => {
  it("shares the approved public uiCopy contract between site and architecture exports", () => {
    expect(siteContent.copy).toBe(architectureContent.copy);
    expect(Object.keys(siteContent.copy)).toEqual([
      "productName",
      "deckTitle",
      "navOverview",
      "navAxes",
      "navHowItWorks",
      "navValue",
      "navDeepDive",
      "ctaPrimary",
      "ctaSecondary",
      "landingThesis",
      "landingTension",
      "landingEngine",
      "landingDecision",
      "landingValue",
      "landingHandoff",
      "deepDiveExecutive",
      "deepDiveDualAxis",
      "deepDiveEvent",
      "deepDiveProduct",
      "deepDiveOrchestration",
      "deepDiveModules",
      "deepDivePrinciples",
      "snapshotLabel",
    ]);

    Object.values(siteContent.copy).forEach((label) => {
      expectKoreanLabel(label);
    });
  });

  it("exports only the approved public site content fields", () => {
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
    expect(siteContent.snapshotMeta.label).toBe(siteContent.copy.snapshotLabel);
    expect(siteContent.snapshotMeta.capturedOn).toBe("2026-03-20");
    expectKoreanLabel(siteContent.snapshotMeta.note);

    expect(siteContent.navigation).toEqual([
      { href: "/", label: siteContent.copy.navOverview },
      { href: "/#axes", label: siteContent.copy.navAxes },
      { href: "/#how-it-works", label: siteContent.copy.navHowItWorks },
      { href: "/#value", label: siteContent.copy.navValue },
      { href: "/deep-dive", label: siteContent.copy.navDeepDive },
    ]);

    expect(Object.keys(siteContent.hero)).toEqual([
      "eyebrow",
      "title",
      "summary",
      "primaryCta",
      "secondaryCta",
    ]);
    expect(siteContent.hero.primaryCta.label).toBe(siteContent.copy.ctaPrimary);
    expect(siteContent.hero.secondaryCta.label).toBe(siteContent.copy.ctaSecondary);

    expect(siteContent.landingScenes.map((scene) => scene.key)).toEqual([
      "thesis",
      "tension",
      "dual-engine",
      "decision-surfaces",
      "system-value",
      "deep-dive-handoff",
    ]);

    const expectedLandingLabels = [
      siteContent.copy.landingThesis,
      siteContent.copy.landingTension,
      siteContent.copy.landingEngine,
      siteContent.copy.landingDecision,
      siteContent.copy.landingValue,
      siteContent.copy.landingHandoff,
    ];

    siteContent.landingScenes.forEach((scene, index) => {
      expect(Object.keys(scene)).toEqual(["key", "anchorId", "title", "summary"]);
      expect(scene.title).toBe(expectedLandingLabels[index]);
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

    expect(Object.getOwnPropertyDescriptor(siteContent, "snapshot")?.enumerable).toBe(false);
    expect(Object.getOwnPropertyDescriptor(siteContent, "showroom")?.enumerable).toBe(false);
  });

  it("exports only the approved public architecture fields", () => {
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

    expect(Array.isArray(architectureContent.axes)).toBe(true);
    expect(architectureContent.axes.map((axis) => axis.key)).toEqual([
      "event-intelligence",
      "product-intelligence",
    ]);

    architectureContent.axes.forEach((axis) => {
      expect(Object.keys(axis)).toEqual(["key", "title", "question", "summary", "technologyBadges"]);
      expectKoreanLabel(axis.title);
      expectKoreanLabel(axis.question);
      expectKoreanLabel(axis.summary);
    });

    expect(architectureContent.boardOrder).toEqual([
      "executive-blueprint",
      "dual-axis-macro",
      "event-interpretation",
      "product-knowledge",
      "orchestration-control",
      "evidence-module-map",
      "principles-evolution",
    ]);

    expect(Object.keys(architectureContent.executiveBlueprint)).toEqual([
      "inputLanes",
      "processingLanes",
      "deliverySurface",
      "technologyBadges",
    ]);

    expect(Object.keys(architectureContent.eventInterpretation)).toEqual(["title", "steps"]);
    expect(Object.keys(architectureContent.productKnowledge)).toEqual(["title", "steps"]);

    architectureContent.orchestrationColumns.forEach((column) => {
      expect(Object.keys(column)).toEqual(["title", "nodes", "technologies"]);
    });

    architectureContent.principles.forEach((principle) => {
      expect(Object.keys(principle)).toEqual(["title", "caption"]);
      expectKoreanLabel(principle.title);
      expectKoreanLabel(principle.caption);
    });

    architectureContent.roadmap.forEach((item) => {
      expect(Object.keys(item)).toEqual(["title", "caption", "stage"]);
      expect(["now", "next", "later"]).toContain(item.stage);
      expectKoreanLabel(item.title);
      expectKoreanLabel(item.caption);
    });
  });

  it("keeps architecture compatibility helpers hidden while preserving consumer access", () => {
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

  it("exports only the approved public module map clusters", () => {
    expect(Object.keys(moduleMap)).toEqual(["clusters"]);
    expect(moduleMap.clusters.map((cluster) => cluster.group)).toEqual([
      "shared-core",
      "event-axis",
      "product-axis",
      "delivery-surfaces",
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
    });
  });

  it("keeps module map compatibility helpers hidden from the public contract", () => {
    expect(moduleMap.sections.length).toBeGreaterThan(0);
    expect(Object.getOwnPropertyDescriptor(moduleMap, "sections")?.enumerable).toBe(false);
  });
});
