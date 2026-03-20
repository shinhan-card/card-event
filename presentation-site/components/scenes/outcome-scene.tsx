import SectionShell from "@/components/chrome/section-shell";

const outcomes = [
  {
    title: "Faster operator review",
    description:
      "The presentation surfaces the right context up front so an operator can move from signal to decision sooner."
  },
  {
    title: "Cleaner evidence trails",
    description:
      "Each result keeps its source and interpretation legible, which makes follow-up and validation easier."
  },
  {
    title: "Reusable outputs",
    description:
      "The same structured artifacts can flow into dashboards, briefs, or downstream automation."
  }
] as const;

export default function OutcomeScene() {
  return (
    <SectionShell
      eyebrow="Outcomes"
      title="The runway ends in usable operator value"
      summary="When the pipeline is staged correctly, the output is not just a summary. It is evidence, context, and a decision-ready handoff."
    >
      <div className="outcome-grid">
        {outcomes.map((outcome) => (
          <article className="diagram-card outcome-card" key={outcome.title}>
            <p className="section-shell-eyebrow">{outcome.title}</p>
            <p>{outcome.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
