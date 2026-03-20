import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import { vi } from "vitest";
import HomePage from "@/app/page";
import RootLayout from "@/app/layout";
import DeepDivePage from "@/app/deep-dive/page";
import { siteContent } from "@/content/site-content";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "" }),
  Source_Sans_3: () => ({ variable: "" })
}));

describe("route smoke", () => {
  it("renders shared navigation", () => {
    render(
      <RootLayout>
        <HomePage />
      </RootLayout>
    );

    const navigation = screen.getByRole("navigation", { name: /primary/i });
    const deepDiveLink = within(navigation).getByRole("link", {
      name: /deep dive/i
    });

    expect(navigation).toBeInTheDocument();
    expect(deepDiveLink).toHaveAttribute("href", "/deep-dive");
  });

  it("renders landing CTAs", () => {
    render(
      <RootLayout>
        <HomePage />
      </RootLayout>
    );
    const cta = screen.getByRole("link", {
      name: siteContent.hero.primaryCta.label
    });

    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", siteContent.hero.primaryCta.href);
  });

  it("renders deep dive heading", () => {
    render(
      <RootLayout>
        <DeepDivePage />
      </RootLayout>
    );
    expect(
      screen.getByRole("heading", { name: /architecture deep dive/i, level: 1 })
    ).toBeInTheDocument();
  });
});
