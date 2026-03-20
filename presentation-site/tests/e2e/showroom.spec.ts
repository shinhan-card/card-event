import { expect, test } from "@playwright/test";

test("landing page links to deep dive", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /event and disclosure intelligence/i, level: 1 })
  ).toBeVisible();

  await page.getByRole("link", { name: /open deep dive/i }).click();

  await expect(page).toHaveURL(/\/deep-dive$/);
});
