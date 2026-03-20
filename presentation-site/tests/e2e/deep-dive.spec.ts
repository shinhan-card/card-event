import { expect, test } from "@playwright/test";

test("deep dive shows Korean-first architecture structure and technology labels", async ({ page }) => {
  await page.goto("/deep-dive");

  await expect(page.getByRole("heading", { name: "개념 아키텍처" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "수집", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "강화", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "모듈 현실 지도" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "이벤트 인텔리전스" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "상품 / 공시 인텔리전스" })).toBeVisible();
  await expect(page.getByText("Playwright", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Gemini", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("FastAPI", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("APScheduler", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("SQLite", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("SQLAlchemy", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("ChromaDB", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("RAG", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("PDF/HTML extraction", { exact: true }).first()).toBeVisible();
});

test("deep dive stays readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/deep-dive");

  await expect(page.getByRole("heading", { name: "이벤트 인텔리전스" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "상품 / 공시 인텔리전스" })).toBeVisible();
  await expect(page.getByText("Playwright", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Gemini", { exact: true }).first()).toBeVisible();

  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
