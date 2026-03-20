import SectionShell from "@/components/chrome/section-shell";
import DualAxisMap from "@/components/diagrams/dual-axis-map";
import { architectureContent } from "@/content/architecture-content";

export default function DualAxisArchitecture() {
  return (
    <SectionShell
      eyebrow={architectureContent.dualAxisArchitecture.eyebrow}
      title={architectureContent.dualAxisArchitecture.title}
      summary={architectureContent.dualAxisArchitecture.summary}
      id="dual-axis-architecture"
    >
      <DualAxisMap />
    </SectionShell>
  );
}
