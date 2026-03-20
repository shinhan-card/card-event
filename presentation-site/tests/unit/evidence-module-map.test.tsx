import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PresentationShell from "@/components/chrome/presentation-shell";

const loadEvidenceModuleMap = async () => {
  vi.resetModules();
  vi.spyOn(process, "cwd").mockReturnValue("C:/standalone/presentation-site");
  vi.doMock("node:fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("node:fs")>();

    return {
      ...actual,
      existsSync: vi.fn(() => false),
    };
  });

  const module = await import("@/components/deep-dive/evidence-module-map");

  return module.default;
};

describe("evidence module map", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("node:fs");
  });

  it("keeps path provenance stable from the snapshot contract outside the backend checkout", async () => {
    const EvidenceModuleMap = await loadEvidenceModuleMap();

    render(
      <PresentationShell>
        <EvidenceModuleMap />
      </PresentationShell>,
    );

    expect(screen.getByText("modules/pipeline.py").closest("[data-path-status]")).toHaveAttribute(
      "data-path-status",
      "implemented",
    );
    expect(screen.getByText("modules/connectors/*").closest("[data-path-status]")).toHaveAttribute(
      "data-path-status",
      "implemented",
    );
    expect(
      screen.getByText("modules/rag/collector.py").closest("[data-path-status]"),
    ).toHaveAttribute("data-path-status", "approved");
  });
});
