import type { ReactNode } from "react";

interface StickyStageLayoutProps {
  id?: string;
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}

export default function StickyStageLayout({
  id,
  eyebrow,
  title,
  summary,
  children
}: StickyStageLayoutProps) {
  return (
    <section className="sticky-stage" id={id}>
      <div className="sticky-stage-copy">
        <p className="section-shell-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      <div className="sticky-stage-visual">{children}</div>
    </section>
  );
}
