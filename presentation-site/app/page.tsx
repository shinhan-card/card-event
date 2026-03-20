import Link from "next/link";
import { siteContent } from "@/content/site-content";

export default function HomePage() {
  return (
    <main>
      <Link href={siteContent.hero.primaryCta.href}>
        {siteContent.hero.primaryCta.label}
      </Link>
    </main>
  );
}
