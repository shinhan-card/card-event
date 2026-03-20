import StickyStageLayout from "@/components/chrome/sticky-stage-layout";
import ProcessRail from "@/components/diagrams/process-rail";
import { siteContent } from "@/content/site-content";

export default function SignalFlowScene() {
  return (
    <StickyStageLayout
      id="how-it-works"
      eyebrow={siteContent.showroom.signalFlow.eyebrow}
      title={siteContent.showroom.signalFlow.title}
      summary={siteContent.showroom.signalFlow.summary}
    >
      <ProcessRail />
    </StickyStageLayout>
  );
}
