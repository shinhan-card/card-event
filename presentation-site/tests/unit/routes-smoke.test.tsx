import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";
import SiteHeader from "@/components/chrome/site-header";
import { siteContent } from "@/content/site-content";
import { within } from "@testing-library/react";

describe("route smoke", () => {
  it("renders shared navigation", () => {
    render(
      <>
        <SiteHeader />
        <HomePage />
      </>
    );

    const navigation = screen.getByRole("navigation", { name: /primary/i });
    const deepDiveLink = within(navigation).getByRole("link", {
      name: /deep dive/i
    });

    expect(navigation).toBeInTheDocument();
    expect(deepDiveLink).toHaveAttribute("href", "/deep-dive");
  });

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
