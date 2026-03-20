import Link from "next/link";
import { siteContent } from "@/content/site-content";

const snapshotSeparator = " - ";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <p className="site-footer-label">{siteContent.snapshot.label}</p>
        <p className="site-footer-copy">
          {siteContent.snapshot.capturedOn}
          {snapshotSeparator}
          {siteContent.snapshot.note}
        </p>
      </div>
      <div className="site-footer-links">
        <Link href="/">개요로 돌아가기</Link>
        <Link href="/deep-dive">딥다이브로 이동</Link>
      </div>
    </footer>
  );
}
