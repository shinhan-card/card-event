import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

const problemCards = [
  {
    title: "Event chaos",
    description:
      "Market moves arrive as loose signals: launches, pricing shifts, promos, app changes, and service updates."
  },
  {
    title: "Disclosure depth",
    description:
      "Product research spans PDFs, filings, and support material that need separate extraction and interpretation."
  }
] as const;

export default function ProblemScene() {
  return (
    <SectionShell
      eyebrow="Problem"
      title="The market is noisy because the evidence is split"
      summary="One lane tracks what is happening in the market. The other lane tracks what products actually exist. The landing page keeps both truths visible."
      id="problem"
    >
      <div className="problem-grid">
        {architectureContent.axes.map((axis, index) => (
          <article className="diagram-card problem-card" key={axis.key}>
            <p className="section-shell-eyebrow">Lane {String(index + 1).padStart(2, "0")}</p>
            <h3>{axis.title}</h3>
            <p>{axis.question}</p>
          </article>
        ))}

        {problemCards.map((item) => (
          <article className="diagram-card problem-card" key={item.title}>
            <p className="section-shell-eyebrow">{item.title}</p>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
