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
