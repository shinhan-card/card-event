import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";
import PresentationShell from "@/components/chrome/presentation-shell";
import { siteContent } from "@/content/site-content";

describe("route smoke", () => {
  it("renders shared navigation", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>
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
      <PresentationShell>
        <HomePage />
      </PresentationShell>
    );
    const cta = screen.getByRole("link", {
      name: siteContent.hero.primaryCta.label
    });

    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", siteContent.hero.primaryCta.href);
  });

  it("renders signal flow labels", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>
    );

    expect(screen.getByText("Collect")).toBeInTheDocument();
    expect(screen.getByText("Deliver")).toBeInTheDocument();
  });

  it("renders deep dive heading", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>
    );
    expect(
      screen.getByRole("heading", { name: /architecture deep dive/i, level: 1 })
    ).toBeInTheDocument();
  });
});
