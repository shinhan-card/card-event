import DualAxisMacro from "@/components/deep-dive/dual-axis-macro";
import EvidenceModuleMap from "@/components/deep-dive/evidence-module-map";
import EventInterpretationBoard from "@/components/deep-dive/event-interpretation-board";
import ExecutiveBlueprint from "@/components/deep-dive/executive-blueprint";
import OrchestrationControlBoard from "@/components/deep-dive/orchestration-control-board";
import PrinciplesEvolutionBoard from "@/components/deep-dive/principles-evolution-board";
import ProductKnowledgeBoard from "@/components/deep-dive/product-knowledge-board";

export default function DeepDivePage() {
  return (
    <>
      <ExecutiveBlueprint />
      <DualAxisMacro />
      <EventInterpretationBoard />
      <ProductKnowledgeBoard />
      <OrchestrationControlBoard />
      <EvidenceModuleMap />
      <PrinciplesEvolutionBoard />
    </>
  );
}
