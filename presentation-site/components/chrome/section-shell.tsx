import type { ReactNode } from "react";

interface SectionShellProps {
  eyebrow: string;
  title: string;
  summary: string;
  children?: ReactNode;
  id?: string;
  headingLevel?: 1 | 2 | 3;
}

export default function SectionShell({
  eyebrow,
  title,
  summary,
  children,
  id,
  headingLevel = 2
}: SectionShellProps) {
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 3 ? "h3" : "h2";

  return (
    <section className="section-shell" id={id}>
      <div className="section-shell-copy">
        <p className="section-shell-eyebrow">{eyebrow}</p>
        <Heading>{title}</Heading>
        <p>{summary}</p>
      </div>
      {children ? <div className="section-shell-content">{children}</div> : null}
    </section>
  );
}
