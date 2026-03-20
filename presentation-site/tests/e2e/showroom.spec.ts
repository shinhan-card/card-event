import { expect, test } from "@playwright/test";

test("landing page links to deep dive", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "이벤트와 공시 인텔리전스를 한 화면에, 그러나 같은 축으로는 섞지 않게",
      level: 1
    })
  ).toBeVisible();

  await page.getByRole("link", { name: "딥다이브 보기" }).click();

  await expect(page).toHaveURL(/\/deep-dive$/);
});

test("landing page stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const deepDiveCta = page.getByRole("link", { name: "딥다이브 보기" });

  await expect(deepDiveCta).toBeVisible();
  await expect(deepDiveCta).toBeInViewport();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", {
      name: "이벤트와 공시 인텔리전스를 한 화면에, 그러나 같은 축으로는 섞지 않게",
      level: 1
    })
  ).toBeVisible();

  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

test("landing page respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(".signal-network", { state: "attached" });

  const motionState = await page.evaluate(() => {
    const network = document.querySelector(".signal-network");
    const rail = document.querySelector(".process-rail");
    const stage = document.querySelector(".process-rail-stage");

    return {
      networkOpacity: network ? getComputedStyle(network).opacity : null,
      railOpacity: rail ? getComputedStyle(rail).opacity : null,
      stageTransform: stage ? getComputedStyle(stage).transform : null
    };
  });

  expect(motionState.networkOpacity).toBe("1");
  expect(motionState.railOpacity).toBe("1");
  expect(motionState.stageTransform).toBe("none");
});
