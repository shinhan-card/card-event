import { expect, test } from "@playwright/test";
import { architectureContent } from "@/content/architecture-content";

test("deep dive renders contract-driven top boards with representative labels", async ({
  page,
}) => {
  await page.goto("/deep-dive");

  const executiveBoard = page.locator("section#executive-blueprint");
  const dualAxisBoard = page.locator("section#dual-axis-macro");
  const eventBoard = page.locator("section#event-interpretation");
  const productBoard = page.locator("section#product-knowledge");

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
  await expect(
    page.getByRole("heading", { name: architectureContent.evolutionRoadmap.title }),
  ).toBeVisible();
});

test("deep dive stays readable on mobile after the top-board refresh", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/deep-dive");

  const dualAxisBoard = page.locator("section#dual-axis-macro");
  const eventBoard = page.locator("section#event-interpretation");
  const productBoard = page.locator("section#product-knowledge");

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

  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
