import DesignPrinciples from "@/components/deep-dive/design-principles";
import DualAxisMacro from "@/components/deep-dive/dual-axis-macro";
import EventInterpretationBoard from "@/components/deep-dive/event-interpretation-board";
import ExecutiveBlueprint from "@/components/deep-dive/executive-blueprint";
import EvolutionRoadmap from "@/components/deep-dive/evolution-roadmap";
import OrchestrationMap from "@/components/deep-dive/orchestration-map";
import ProductKnowledgeBoard from "@/components/deep-dive/product-knowledge-board";
import RealModuleMap from "@/components/deep-dive/real-module-map";

export default function DeepDivePage() {
  return (
    <>
      <ExecutiveBlueprint />
      <DualAxisMacro />
      <EventInterpretationBoard />
      <ProductKnowledgeBoard />
      <OrchestrationMap />
      <RealModuleMap />
      <DesignPrinciples />
      <EvolutionRoadmap />
    </>
  );
}
