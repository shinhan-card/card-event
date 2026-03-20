import { render, screen, within } from "@testing-library/react";
import DeepDivePage from "@/app/deep-dive/page";
import HomePage from "@/app/page";
import PresentationShell from "@/components/chrome/presentation-shell";
import ExecutiveBlueprint from "@/components/deep-dive/executive-blueprint";
import { architectureContent } from "@/content/architecture-content";
import { moduleMap } from "@/content/module-map";
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

    expect(document.querySelectorAll("main > section")).toHaveLength(architectureContent.boardOrder.length);

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

  it("renders contract-driven lower deep dive boards from public contracts only", () => {
    const architectureDescriptors = [
      "orchestrationMap",
      "principlesSection",
      "evolutionRoadmap",
      "designPrinciples",
      "orchestration",
    ].map((key) => [key, Object.getOwnPropertyDescriptor(architectureContent, key)] as const);
    const moduleSectionsDescriptor = Object.getOwnPropertyDescriptor(moduleMap, "sections");

    architectureDescriptors.forEach(([key]) => {
      Object.defineProperty(architectureContent, key, {
        configurable: true,
        get() {
          throw new Error(`legacy architecture helper accessed: ${key}`);
        },
      });
    });

    Object.defineProperty(moduleMap, "sections", {
      configurable: true,
      get() {
        throw new Error("legacy module sections accessed");
      },
    });

    try {
      expect(() =>
        render(
          <PresentationShell>
            <DeepDivePage />
          </PresentationShell>,
        ),
      ).not.toThrow();
    } finally {
      architectureDescriptors.forEach(([key, descriptor]) => {
        if (descriptor) {
          Object.defineProperty(architectureContent, key, descriptor);
        }
      });

      if (moduleSectionsDescriptor) {
        Object.defineProperty(moduleMap, "sections", moduleSectionsDescriptor);
      }
    }

    const orchestrationBoard = document.getElementById("orchestration-control");
    const modulesBoard = document.getElementById("evidence-module-map");
    const principlesBoard = document.getElementById("principles-evolution");

    expect(orchestrationBoard).toBeInTheDocument();
    expect(modulesBoard).toBeInTheDocument();
    expect(principlesBoard).toBeInTheDocument();

    expect(
      within(orchestrationBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.copy.deepDiveOrchestration,
      }),
    ).toBeInTheDocument();
    expect(within(orchestrationBoard as HTMLElement).getAllByText("APScheduler").length).toBeGreaterThan(0);
    expect(within(orchestrationBoard as HTMLElement).getAllByText("FastAPI").length).toBeGreaterThan(0);
    expect(within(orchestrationBoard as HTMLElement).getAllByText("SQLite").length).toBeGreaterThan(0);
    expect(within(orchestrationBoard as HTMLElement).getAllByText("SQLAlchemy").length).toBeGreaterThan(0);

    expect(
      within(modulesBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.copy.deepDiveModules,
      }),
    ).toBeInTheDocument();
    expect(within(modulesBoard as HTMLElement).getByText("modules/pipeline.py")).toBeInTheDocument();
    expect(
      within(modulesBoard as HTMLElement).getAllByText(/modules\/rag\//).length,
    ).toBeGreaterThan(0);

    expect(
      within(principlesBoard as HTMLElement).getByRole("heading", {
        name: architectureContent.copy.deepDivePrinciples,
      }),
    ).toBeInTheDocument();
    expect(
      within(principlesBoard as HTMLElement).getByText(architectureContent.principles[0].title),
    ).toBeInTheDocument();
    expect(
      within(principlesBoard as HTMLElement).getByText(architectureContent.roadmap[0].title),
    ).toBeInTheDocument();
    expect(
      screen.queryByText((_, element) =>
        element?.tagName.toLowerCase() === "h2" &&
        element.textContent === architectureContent.roadmap[0].title,
      ),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll("main > section")).toHaveLength(architectureContent.boardOrder.length);
  });

  it("derives orchestration summary technologies from the public contract data", () => {
    const columnsDescriptor = Object.getOwnPropertyDescriptor(
      architectureContent,
      "orchestrationColumns",
    );
    const customColumns = [
      {
        title: "테스트 제어면",
        nodes: ["수집 시작", "상태 동기화"],
        technologies: ["SchedulerX", "ControlDB"],
      },
      {
        title: "테스트 전달면",
        nodes: ["결과 전달"],
        technologies: ["SurfaceAPI", "TraceBus"],
      },
    ] as const;

    Object.defineProperty(architectureContent, "orchestrationColumns", {
      configurable: true,
      value: customColumns,
    });

    try {
      render(
        <PresentationShell>
          <DeepDivePage />
        </PresentationShell>,
      );
    } finally {
      if (columnsDescriptor) {
        Object.defineProperty(architectureContent, "orchestrationColumns", columnsDescriptor);
      }
    }

    const orchestrationBoard = document.getElementById("orchestration-control");
    const summaryCard = document.querySelector(".orchestration-control-summary");

    expect(orchestrationBoard).toBeInTheDocument();
    expect(summaryCard).toBeInTheDocument();
    expect(within(summaryCard as HTMLElement).getByText("SchedulerX")).toBeInTheDocument();
    expect(within(summaryCard as HTMLElement).getByText("ControlDB")).toBeInTheDocument();
    expect(within(summaryCard as HTMLElement).getByText("SurfaceAPI")).toBeInTheDocument();
    expect(within(summaryCard as HTMLElement).getByText("TraceBus")).toBeInTheDocument();
    expect(within(summaryCard as HTMLElement).queryByText("APScheduler")).not.toBeInTheDocument();
    expect(within(summaryCard as HTMLElement).queryByText("FastAPI")).not.toBeInTheDocument();
  });

  it("renders lower-board headings and evidence in the deep dive page", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    expect(
      screen.getByRole("heading", { name: architectureContent.copy.deepDiveOrchestration }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: architectureContent.copy.deepDiveModules }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: architectureContent.copy.deepDivePrinciples }),
    ).toBeInTheDocument();
    expect(screen.getByText("modules/pipeline.py")).toBeInTheDocument();
    expect(screen.getAllByText(/modules\/rag\//).length).toBeGreaterThan(0);

    const ragEvidenceCard = screen
      .getByText("modules/rag/collector.py")
      .closest("[data-evidence-level]");

    expect(ragEvidenceCard).toHaveAttribute("data-evidence-level", "approved");
    expect(within(ragEvidenceCard as HTMLElement).getByText("승인 경로")).toBeInTheDocument();
  });

  it("keeps lower-board UI chrome in Korean instead of raw English tokens", () => {
    render(
      <PresentationShell>
        <DeepDivePage />
      </PresentationShell>,
    );

    expect(screen.queryByText(/^COLUMN 01$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^shared-core$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^event-axis$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^product-axis$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^delivery-surfaces$/)).not.toBeInTheDocument();
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
