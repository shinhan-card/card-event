import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";
import { siteContent } from "@/content/site-content";

describe("content contracts", () => {
  it("keeps both intelligence axes distinct", () => {
    const axisKeys = architectureContent.axes.map((axis) => axis.key);
    expect(axisKeys).toEqual(["event-intelligence", "product-intelligence"]);
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
});
