import AxisTensionScene from "@/components/scenes/axis-tension-scene";
import DeepDiveHandoffScene from "@/components/scenes/deep-dive-handoff-scene";
import DecisionSurfaceScene from "@/components/scenes/decision-surface-scene";
import DualEngineScene from "@/components/scenes/dual-engine-scene";
import HeroScene from "@/components/scenes/hero-scene";
import SystemValueScene from "@/components/scenes/system-value-scene";

export default function HomePage() {
  return (
    <>
      <HeroScene />
      <AxisTensionScene />
      <DualEngineScene />
      <DecisionSurfaceScene />
      <SystemValueScene />
      <DeepDiveHandoffScene />
    </>
  );
}
