import SectionShell from "@/components/chrome/section-shell";
import StickyStageLayout from "@/components/chrome/sticky-stage-layout";

export default function DeepDivePage() {
  return (
    <>
      <SectionShell
        eyebrow="Systems Atlas"
        title="Architecture Deep Dive"
        summary="A clean landing zone for architecture stages, orchestration, and design principles."
        id="deep-dive"
        headingLevel={1}
      >
        <div className="diagram-grid">
          <article className="diagram-card">
            <p className="section-shell-eyebrow">Stage map</p>
            <p>Collect, extract, normalize, enrich, and deliver.</p>
          </article>
          <article className="diagram-card">
            <p className="section-shell-eyebrow">Principles</p>
            <p>Make the lanes distinct, structured, and explainable.</p>
          </article>
        </div>
      </SectionShell>

      <StickyStageLayout
        eyebrow="Orchestration"
        title="Shared control plane"
        summary="The route is ready for the future stage-by-stage presentation without changing the shell."
      >
        <div className="diagram-card">
          <h3>Architecture Deep Dive</h3>
          <p>Placeholder content for orchestration, stage breakdown, and design principles.</p>
        </div>
      </StickyStageLayout>
    </>
  );
}
