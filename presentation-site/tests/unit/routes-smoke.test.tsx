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
      name: "딥다이브"
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

    expect(screen.getByText("수집")).toBeInTheDocument();
    expect(screen.getByText("전달")).toBeInTheDocument();
  });

  it("renders deep dive heading", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>
    );
    expect(
      screen.getByRole("heading", { name: "아키텍처 딥다이브", level: 1 })
    ).toBeInTheDocument();
  });

  it("renders deep dive concept sections", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>
    );

    expect(
      screen.getByRole("heading", { name: "개념 아키텍처" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "처리 단계 구조" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "오케스트레이션 맵" })
    ).toBeInTheDocument();
  });

  it("renders deep dive axis split", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>
    );

    expect(
      screen.getByRole("heading", { name: "이벤트 인텔리전스" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "상품 / 공시 인텔리전스" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "모듈 현실 지도" })
    ).toBeInTheDocument();
  });

  it("renders explicit deep dive technology labels", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>
    );

    expect(screen.getAllByText("Playwright").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gemini").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FastAPI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("APScheduler").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SQLite").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SQLAlchemy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ChromaDB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RAG").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PDF/HTML extraction").length).toBeGreaterThan(0);
  });
});
