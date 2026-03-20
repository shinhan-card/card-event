import SectionShell from "@/components/chrome/section-shell";
import ModuleClusterMap from "@/components/diagrams/module-cluster-map";
import { architectureContent } from "@/content/architecture-content";

export default function RealModuleMap() {
  return (
    <SectionShell
      eyebrow="Module Reality"
      title="Module Reality"
      summary="The live repo groups are arranged as a shared bootstrap core plus event and product intelligence surfaces."
      id="module-reality"
    >
      <div className="module-cluster-map-intro">
        <p>{architectureContent.orchestration.summary}</p>
        <p>
          The map stays faithful to the repository: it shows shared bootstrap and UI surfaces,
          event capture and enrichment, and the product / disclosure route stack without inventing
          new ownership.
        </p>
      </div>
      <ModuleClusterMap />
    </SectionShell>
  );
}
