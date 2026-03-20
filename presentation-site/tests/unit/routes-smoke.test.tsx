import { render, screen, within } from "@testing-library/react";
import DeepDivePage from "@/app/deep-dive/page";
import HomePage from "@/app/page";
import PresentationShell from "@/components/chrome/presentation-shell";
import ExecutiveBlueprint from "@/components/deep-dive/executive-blueprint";
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
    const secondaryCta = screen.getByRole("link", {
      name: siteContent.hero.secondaryCta.label,
    });

    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", siteContent.hero.primaryCta.href);
    expect(secondaryCta).toBeInTheDocument();
    expect(secondaryCta).toHaveAttribute("href", siteContent.hero.secondaryCta.href);
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
      screen.getByRole("heading", { name: architectureContent.copy.deepDiveExecutive, level: 1 }),
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

  it("renders the executive blueprint without reading hidden legacy deepDive data", () => {
    const deepDiveDescriptor = Object.getOwnPropertyDescriptor(architectureContent, "deepDive");

    Object.defineProperty(architectureContent, "deepDive", {
      configurable: true,
      get() {
        throw new Error("legacy deepDive accessed");
      },
    });

    try {
      expect(() =>
        render(
          <PresentationShell>
            <ExecutiveBlueprint />
          </PresentationShell>,
        ),
      ).not.toThrow();
    } finally {
      if (deepDiveDescriptor) {
        Object.defineProperty(architectureContent, "deepDive", deepDiveDescriptor);
      }
    }

    expect(
      screen.getByRole("heading", { name: architectureContent.copy.deepDiveExecutive, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders contract-driven deep dive headings for the first four boards", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    const executiveBoard = document.getElementById("executive-blueprint");
    const dualAxisBoard = document.getElementById("dual-axis-macro");
    const eventBoard = document.getElementById("event-interpretation");
    const productBoard = document.getElementById("product-knowledge");

    expect(executiveBoard).toBeInTheDocument();
    expect(dualAxisBoard).toBeInTheDocument();
    expect(eventBoard).toBeInTheDocument();
    expect(productBoard).toBeInTheDocument();

    expect(
      within(executiveBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.copy.deepDiveExecutive,
      }),
    ).toBeInTheDocument();
    expect(
      within(dualAxisBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.copy.deepDiveDualAxis,
      }),
    ).toBeInTheDocument();
    expect(
      within(eventBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.copy.deepDiveEvent,
      }),
    ).toBeInTheDocument();
    expect(
      within(productBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.copy.deepDiveProduct,
      }),
    ).toBeInTheDocument();
  });

  it("renders remaining lower deep dive sections after the top-four board swap", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    expect(
      screen.getByRole("heading", { name: architectureContent.orchestrationMap.title }),
    ).toBeInTheDocument();
    expect(document.getElementById("evidence-module-map")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: architectureContent.principlesSection.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: architectureContent.evolutionRoadmap.title }),
    ).toBeInTheDocument();
  });

  it("surfaces representative labels and technologies inside the first four deep dive boards", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    const executiveBoard = document.getElementById("executive-blueprint");
    const dualAxisBoard = document.getElementById("dual-axis-macro");
    const eventBoard = document.getElementById("event-interpretation");
    const productBoard = document.getElementById("product-knowledge");

    expect(
      within(executiveBoard as HTMLElement).getByText(
        architectureContent.executiveBlueprint.inputLanes[0],
      ),
    ).toBeInTheDocument();
    expect(within(executiveBoard as HTMLElement).getByText("ChromaDB")).toBeInTheDocument();

    expect(
      within(dualAxisBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.axes[0].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(dualAxisBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.axes[1].title,
      }),
    ).toBeInTheDocument();
    expect(within(dualAxisBoard as HTMLElement).getByText("Playwright")).toBeInTheDocument();
    expect(within(dualAxisBoard as HTMLElement).getByText("ChromaDB")).toBeInTheDocument();

    expect(
      within(eventBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.eventInterpretation.steps[0].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(eventBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.eventInterpretation.steps[3].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(eventBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.eventInterpretation.steps[4].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(eventBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.eventInterpretation.steps[6].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(eventBoard as HTMLElement).getByText(
        architectureContent.eventInterpretation.steps[4].technologies[0],
      ),
    ).toBeInTheDocument();

    expect(
      within(productBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.productKnowledge.steps[3].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(productBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.productKnowledge.steps[4].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(productBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.productKnowledge.steps[5].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(productBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.productKnowledge.steps[7].title,
      }),
    ).toBeInTheDocument();
    expect(
      within(productBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.productKnowledge.steps[8].title,
      }),
    ).toBeInTheDocument();
    expect(within(productBoard as HTMLElement).getByText("ChromaDB")).toBeInTheDocument();
  });
});
