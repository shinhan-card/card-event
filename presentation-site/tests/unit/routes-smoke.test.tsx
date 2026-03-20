import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";
import { siteContent } from "@/content/site-content";

describe("route smoke", () => {
  it("renders landing CTAs", () => {
    render(<HomePage />);
    expect(
      screen.getByRole(
        "link",
        { name: new RegExp(siteContent.hero.primaryCta.label, "i") }
      )
    ).toBeInTheDocument();
  });

  it("renders deep dive heading", () => {
    render(<DeepDivePage />);
    expect(
      screen.getByRole("heading", { name: /architecture deep dive/i })
    ).toBeInTheDocument();
  });
});
