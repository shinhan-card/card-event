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
        <p className="site-kicker">
          발표용 마이크로사이트에서 현재 구현 구조와 오케스트레이션을 한국어 중심으로 설명합니다.
        </p>
      </div>
      <nav aria-label="주요 탐색">
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
