import Link from "next/link";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/deep-dive", label: "Deep Dive" }
] as const;

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div>
        <p className="site-eyebrow">Card Event Intelligence</p>
        <p className="site-kicker">Showroom shell for the standalone presentation workspace</p>
      </div>
      <nav aria-label="Primary">
        <ul className="site-nav">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
