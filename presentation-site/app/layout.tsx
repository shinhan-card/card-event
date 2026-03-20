import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
import PresentationShell from "@/components/chrome/presentation-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Event Intelligence",
  description: "Standalone presentation microsite for event and disclosure intelligence"
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
          Skip to content
        </a>
        <PresentationShell>{children}</PresentationShell>
      </body>
    </html>
  );
}
