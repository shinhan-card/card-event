import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <p className="site-footer-label">Current state</p>
        <p className="site-footer-copy">
          Bootstrap shell only. Future scenes, motion, and content expansion belong here.
        </p>
      </div>
      <div className="site-footer-links">
        <Link href="/">Back to overview</Link>
        <Link href="/deep-dive">Go to deep dive</Link>
      </div>
    </footer>
  );
}
