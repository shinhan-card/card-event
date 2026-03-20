import { expect, test } from "@playwright/test";
import { architectureContent } from "@/content/architecture-content";

test("deep dive renders all seven contract-driven boards with lower-board evidence", async ({
  page,
}) => {
  await page.goto("/deep-dive");

  const executiveBoard = page.locator("section#executive-blueprint");
  const dualAxisBoard = page.locator("section#dual-axis-macro");
  const eventBoard = page.locator("section#event-interpretation");
  const productBoard = page.locator("section#product-knowledge");
  const orchestrationBoard = page.locator("section#orchestration-control");
  const modulesBoard = page.locator("section#evidence-module-map");
  const principlesBoard = page.locator("section#principles-evolution");

  await expect(
    executiveBoard.getByRole("heading", { name: architectureContent.copy.deepDiveExecutive }),
  ).toBeVisible();
  await expect(
    dualAxisBoard.getByRole("heading", { name: architectureContent.copy.deepDiveDualAxis }),
  ).toBeVisible();
  await expect(
    eventBoard.getByRole("heading", { name: architectureContent.copy.deepDiveEvent }),
  ).toBeVisible();
  await expect(
    productBoard.getByRole("heading", { name: architectureContent.copy.deepDiveProduct }),
  ).toBeVisible();
  await expect(
    orchestrationBoard.getByRole("heading", {
      name: architectureContent.copy.deepDiveOrchestration,
    }),
  ).toBeVisible();
  await expect(
    modulesBoard.getByRole("heading", { name: architectureContent.copy.deepDiveModules }),
  ).toBeVisible();
  await expect(
    principlesBoard.getByRole("heading", { name: architectureContent.copy.deepDivePrinciples }),
  ).toBeVisible();

  await expect(executiveBoard.getByText("ChromaDB", { exact: true })).toBeVisible();
  await expect(
    dualAxisBoard.getByRole("heading", { name: architectureContent.axes[0].title }),
  ).toBeVisible();
  await expect(
    dualAxisBoard.getByRole("heading", { name: architectureContent.axes[1].title }),
  ).toBeVisible();
  await expect(
    eventBoard.getByRole("heading", {
      name: architectureContent.eventInterpretation.steps[3].title,
    }),
  ).toBeVisible();
  await expect(
    eventBoard.getByRole("heading", {
      name: architectureContent.eventInterpretation.steps[4].title,
    }),
  ).toBeVisible();
  await expect(
    eventBoard.getByRole("heading", {
      name: architectureContent.eventInterpretation.steps[6].title,
    }),
  ).toBeVisible();
  await expect(
    productBoard.getByRole("heading", {
      name: architectureContent.productKnowledge.steps[3].title,
    }),
  ).toBeVisible();
  await expect(
    productBoard.getByRole("heading", {
      name: architectureContent.productKnowledge.steps[5].title,
    }),
  ).toBeVisible();
  await expect(
    productBoard.getByRole("heading", {
      name: architectureContent.productKnowledge.steps[8].title,
    }),
  ).toBeVisible();
  await expect(productBoard.getByText("ChromaDB", { exact: true })).toBeVisible();

  await expect(orchestrationBoard.getByText("APScheduler", { exact: true }).first()).toBeVisible();
  await expect(orchestrationBoard.getByText("FastAPI", { exact: true }).first()).toBeVisible();
  await expect(orchestrationBoard.getByText("SQLite", { exact: true }).first()).toBeVisible();
  await expect(orchestrationBoard.getByText("SQLAlchemy", { exact: true }).first()).toBeVisible();

  await expect(modulesBoard.getByText("modules/pipeline.py", { exact: true })).toBeVisible();
  await expect(modulesBoard.getByText(/modules\/rag\//).first()).toBeVisible();
  const approvedRagCard = modulesBoard.locator('[data-evidence-level="approved"]', {
    hasText: "modules/rag/collector.py",
  });
  await expect(
    approvedRagCard,
  ).toHaveCount(1);
  await expect(
    approvedRagCard.getByText("승인 경로", { exact: true }),
  ).toBeVisible();

  await expect(
    principlesBoard.getByText(architectureContent.principles[0].title, { exact: true }),
  ).toBeVisible();
  await expect(
    principlesBoard.getByText(architectureContent.roadmap[0].title, { exact: true }),
  ).toBeVisible();

  await expect(page.locator("main > section")).toHaveCount(architectureContent.boardOrder.length);
});

test("deep dive stays readable on mobile after the seven-board refresh", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/deep-dive");

  const dualAxisBoard = page.locator("section#dual-axis-macro");
  const eventBoard = page.locator("section#event-interpretation");
  const productBoard = page.locator("section#product-knowledge");
  const orchestrationBoard = page.locator("section#orchestration-control");
  const modulesBoard = page.locator("section#evidence-module-map");
  const principlesBoard = page.locator("section#principles-evolution");

  await expect(
    dualAxisBoard.getByRole("heading", { name: architectureContent.axes[0].title }),
  ).toBeVisible();
  await expect(
    dualAxisBoard.getByRole("heading", { name: architectureContent.axes[1].title }),
  ).toBeVisible();
  await expect(
    eventBoard.getByRole("heading", {
      name: architectureContent.eventInterpretation.steps[4].title,
    }),
  ).toBeVisible();
  await expect(
    eventBoard.getByRole("heading", {
      name: architectureContent.eventInterpretation.steps[6].title,
    }),
  ).toBeVisible();
  await expect(
    productBoard.getByRole("heading", {
      name: architectureContent.productKnowledge.steps[5].title,
    }),
  ).toBeVisible();
  await expect(
    productBoard.getByRole("heading", {
      name: architectureContent.productKnowledge.steps[8].title,
    }),
  ).toBeVisible();
  await expect(orchestrationBoard.getByText("APScheduler", { exact: true }).first()).toBeVisible();
  await expect(modulesBoard.getByText("modules/pipeline.py", { exact: true })).toBeVisible();
  await expect(
    modulesBoard.getByText(/modules\/rag\//).first(),
  ).toBeVisible();
  await expect(
    principlesBoard.getByText(architectureContent.roadmap[0].title, { exact: true }),
  ).toBeVisible();

  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
