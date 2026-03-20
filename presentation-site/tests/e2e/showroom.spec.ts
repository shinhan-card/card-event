import { expect, test } from "@playwright/test";
import { siteContent } from "@/content/site-content";

const heroTitle = siteContent.hero.title;
const primaryCtaLabel = siteContent.hero.primaryCta.label;

test("landing page links to deep dive", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: heroTitle,
      level: 1
    })
  ).toBeVisible();

  await page
    .locator("#overview")
    .getByRole("link", { name: primaryCtaLabel, exact: true })
    .click();

  await expect(page).toHaveURL(/\/deep-dive$/);
});

test("landing page renders the showroom contract and technology stack", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("section#overview")).toBeVisible();
  await expect(page.locator("section#axes")).toBeVisible();
  await expect(page.locator("section#how-it-works")).toBeVisible();
  await expect(page.locator("section#decision-surfaces")).toBeVisible();
  await expect(page.locator("section#value")).toBeVisible();
  await expect(page.locator("section#deep-dive-cta")).toBeVisible();

  await expect(
    page.getByRole("heading", { name: siteContent.copy.landingTension, level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: siteContent.copy.landingEngine, level: 2 }),
  ).toBeVisible();
  await expect(page.locator("#overview").getByText("Playwright", { exact: true })).toBeVisible();
  await expect(page.locator("#overview").getByText("Gemini", { exact: true })).toBeVisible();
});

test("landing page stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const deepDiveCta = page
    .locator("#overview")
    .getByRole("link", { name: primaryCtaLabel, exact: true });

  await expect(deepDiveCta).toBeVisible();
  await expect(deepDiveCta).toBeInViewport();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", {
      name: heroTitle,
      level: 1
    })
  ).toBeVisible();

  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

test("landing page respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: siteContent.copy.landingEngine, level: 2 }),
  ).toBeVisible();
  await expect(page.locator("#overview").getByText("FastAPI", { exact: true })).toBeVisible();
  await expect(
    page.locator("#overview").getByRole("link", { name: primaryCtaLabel, exact: true }),
  ).toBeVisible();
});
