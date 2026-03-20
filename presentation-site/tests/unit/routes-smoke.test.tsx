import { render, screen, within } from "@testing-library/react";
import HomePage from "@/app/page";
import DeepDivePage from "@/app/deep-dive/page";
import PresentationShell from "@/components/chrome/presentation-shell";
import { architectureContent } from "@/content/architecture-content";
import { siteContent } from "@/content/site-content";

describe("route smoke", () => {
  it("renders shared navigation", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>,
    );

    const navigation = screen.getByRole("navigation", { name: /주요 탐색/i });
    const links = within(navigation).getAllByRole("link");

    expect(navigation).toBeInTheDocument();
    expect(
      links.map((link) => ({
        label: link.textContent,
        href: link.getAttribute("href"),
      })),
    ).toEqual(
      siteContent.navigation.map((item) => ({
        label: item.label,
        href: item.href,
      })),
    );
  });

  it("renders landing CTAs", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>,
    );
    const cta = screen.getByRole("link", {
      name: siteContent.hero.primaryCta.label,
    });

    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", siteContent.hero.primaryCta.href);
  });

  it("renders landing sections in public contract order", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>,
    );

    const sectionIds = Array.from(document.querySelectorAll("main > section[id]")).map(
      (section) => section.id,
    );

    expect(sectionIds).toEqual(siteContent.landingScenes.map((scene) => scene.anchorId));
  });

  it("renders the public landing anchor ids", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>,
    );

    siteContent.landingScenes.forEach((scene) => {
      expect(document.getElementById(scene.anchorId)).toBeInTheDocument();
    });
  });

  it("renders the Korean showroom landing headings from the public contract", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>,
    );

    expect(
      screen.getByRole("heading", { name: siteContent.hero.title, level: 1 }),
    ).toBeInTheDocument();

    siteContent.landingScenes.slice(1).forEach((scene) => {
      expect(screen.getByRole("heading", { name: scene.title })).toBeInTheDocument();
    });
  });

  it("surfaces landing technology labels for the showroom narrative", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>,
    );

    expect(screen.getAllByText("Playwright").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BeautifulSoup").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gemini").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FastAPI").length).toBeGreaterThan(0);
  });

  it("renders signal flow labels", () => {
    render(
      <PresentationShell>
        <HomePage />
      </PresentationShell>,
    );

    expect(screen.getAllByText("수집").length).toBeGreaterThan(0);
    expect(screen.getAllByText("전달").length).toBeGreaterThan(0);
  });

  it("renders deep dive heading", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );
    expect(
      screen.getByRole("heading", { name: architectureContent.deepDive.title, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders deep dive sections in public board order", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    const sectionIds = Array.from(document.querySelectorAll("main > section[id]")).map(
      (section) => section.id,
    );

    expect(sectionIds).toEqual(architectureContent.boardOrder);
  });

  it("renders the executive blueprint anchor on deep dive", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    expect(document.getElementById("executive-blueprint")).toBeInTheDocument();
  });

  it("renders deep dive concept sections", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    expect(
      screen.getByRole("heading", { name: architectureContent.conceptArchitecture.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: architectureContent.stageBreakdown.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: architectureContent.orchestrationMap.title }),
    ).toBeInTheDocument();
  });

  it("renders deep dive axis split", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    expect(
      screen.getByRole("heading", { name: architectureContent.dualAxisArchitecture.lanes[0].title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: architectureContent.dualAxisArchitecture.lanes[1].title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "실제 모듈 지도" })).toBeInTheDocument();
  });

  it("renders explicit deep dive technology labels", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    expect(screen.getAllByText("Playwright").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gemini").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FastAPI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("APScheduler").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SQLite").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SQLAlchemy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BeautifulSoup").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ChromaDB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RAG").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PDF/HTML extraction").length).toBeGreaterThan(0);
  });
});
