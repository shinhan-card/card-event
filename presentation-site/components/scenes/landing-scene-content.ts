import { siteContent } from "@/content/site-content";

type LandingSceneKey = (typeof siteContent.landingScenes)[number]["key"];

export function getLandingScene(key: LandingSceneKey) {
  const scene = siteContent.landingScenes.find((entry) => entry.key === key);

  if (!scene) {
    throw new Error(`Missing landing scene for key: ${key}`);
  }

  return scene;
}
