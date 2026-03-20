import { expect, test } from "@playwright/test";

test("deep dive shows concept architecture and stage breakdown", async ({ page }) => {
  await page.goto("/deep-dive");

  await expect(page.getByRole("heading", { name: /concept architecture/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^collect$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^enrich$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /module reality/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /event intelligence/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /product \/ disclosure intelligence/i })
  ).toBeVisible();
});

test("deep dive stays readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/deep-dive");

  await expect(page.getByRole("heading", { name: /event intelligence/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /product \/ disclosure intelligence/i })
  ).toBeVisible();

  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
