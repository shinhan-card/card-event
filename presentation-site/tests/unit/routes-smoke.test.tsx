import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";
import { siteContent } from "@/content/site-content";

describe("route smoke", () => {
  it("renders landing CTAs", () => {
    render(<HomePage />);
    const cta = screen.getByRole("link", {
      name: siteContent.hero.primaryCta.label
    });

    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", siteContent.hero.primaryCta.href);
  });

  it("renders deep dive heading", () => {
    render(<DeepDivePage />);
    expect(
      screen.getByRole("heading", { name: /architecture deep dive/i })
    ).toBeInTheDocument();
  });
});
