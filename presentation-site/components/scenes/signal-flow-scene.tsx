import StickyStageLayout from "@/components/chrome/sticky-stage-layout";
import ProcessRail from "@/components/diagrams/process-rail";
import { architectureContent } from "@/content/architecture-content";

export default function SignalFlowScene() {
  return (
    <StickyStageLayout
      id="how-it-works"
      eyebrow="How It Works"
      title="Collect → Extract → Normalize → Enrich → Deliver"
      summary={architectureContent.orchestration.summary}
    >
      <ProcessRail />
    </StickyStageLayout>
  );
}
