import Link from "next/link";

const navItems = [
  { href: "/", label: "개요" },
  { href: "/#how-it-works", label: "작동 흐름" },
  { href: "/deep-dive", label: "딥다이브" }
] as const;

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div>
        <p className="site-eyebrow">카드 이벤트 인텔리전스</p>
        <p className="site-kicker">발표용 워크스페이스에서 현재 구현 구조를 한국어 중심으로 정리한 쇼룸</p>
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
