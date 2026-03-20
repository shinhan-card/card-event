import type { ReactNode } from "react";
import SiteFooter from "@/components/chrome/site-footer";
import SiteHeader from "@/components/chrome/site-header";

interface PresentationShellProps {
  children: ReactNode;
}

export default function PresentationShell({ children }: PresentationShellProps) {
  return (
    <div className="shell-frame">
      <SiteHeader />
      <main id="content">{children}</main>
      <SiteFooter />
    </div>
  );
}
