import type { ReactNode } from "react";

interface SectionShellProps {
  eyebrow: string;
  title: string;
  summary: string;
  children?: ReactNode;
  id?: string;
}

export default function SectionShell({
  eyebrow,
  title,
  summary,
  children,
  id
}: SectionShellProps) {
  return (
    <section className="section-shell" id={id}>
      <div className="section-shell-copy">
        <p className="section-shell-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      {children ? <div className="section-shell-content">{children}</div> : null}
    </section>
  );
}
