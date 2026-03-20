import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";

describe("route smoke", () => {
  it("renders landing CTAs", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("link", { name: /open deep dive/i })
    ).toBeInTheDocument();
  });

  it("renders deep dive heading", () => {
    render(<DeepDivePage />);
    expect(
      screen.getByRole("heading", { name: /architecture deep dive/i })
    ).toBeInTheDocument();
  });
});
