import DeepDiveCtaScene from "@/components/scenes/deep-dive-cta-scene";
import HeroScene from "@/components/scenes/hero-scene";
import OutcomeScene from "@/components/scenes/outcome-scene";
import OrchestrationScene from "@/components/scenes/orchestration-scene";
import ProblemScene from "@/components/scenes/problem-scene";
import SignalFlowScene from "@/components/scenes/signal-flow-scene";

export default function HomePage() {
  return (
    <>
      <HeroScene />
      <ProblemScene />
      <SignalFlowScene />
      <OrchestrationScene />
      <OutcomeScene />
      <DeepDiveCtaScene />
    </>
  );
}
