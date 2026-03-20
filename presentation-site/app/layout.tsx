import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
import PresentationShell from "@/components/chrome/presentation-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "카드 이벤트 인텔리전스 발표 사이트",
  description: "이벤트 인텔리전스와 상품 / 공시 인텔리전스를 설명하는 독립형 프레젠테이션 사이트"
};

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body"
});

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] antialiased">
        <a className="skip-link" href="#content">
          본문으로 건너뛰기
        </a>
        <PresentationShell>{children}</PresentationShell>
      </body>
    </html>
  );
}
