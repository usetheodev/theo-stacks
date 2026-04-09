import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  stylingOptions,
  getStylingOption,
  listStylingIds,
  hasFrontend,
} from "../src/styling.js";
import { scaffold } from "../src/scaffold.js";
import { getTemplate } from "../src/templates.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-theo-styling-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("styling registry", () => {
  it("has 8 styling options", () => {
    expect(stylingOptions).toHaveLength(8);
  });

  it("each option has required fields", () => {
    for (const s of stylingOptions) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.dependencies).toBeDefined();
      expect(s.devDependencies).toBeDefined();
    }
  });

  it("includes 'none' as first option", () => {
    expect(stylingOptions[0].id).toBe("none");
  });

  it("getStylingOption returns correct option", () => {
    const s = getStylingOption("tailwind");
    expect(s).toBeDefined();
    expect(s!.id).toBe("tailwind");
  });

  it("getStylingOption returns undefined for unknown", () => {
    expect(getStylingOption("nonexistent")).toBeUndefined();
  });

  it("listStylingIds returns all ids", () => {
    const ids = listStylingIds();
    expect(ids).toContain("none");
    expect(ids).toContain("tailwind");
    expect(ids).toContain("shadcn");
    expect(ids).toContain("daisyui");
    expect(ids).toContain("chakra");
    expect(ids).toContain("mantine");
    expect(ids).toContain("bootstrap");
    expect(ids).toContain("bulma");
  });

  it("no duplicate styling ids", () => {
    const ids = listStylingIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("'none' option has no dependencies", () => {
    const none = getStylingOption("none")!;
    expect(Object.keys(none.dependencies)).toHaveLength(0);
    expect(Object.keys(none.devDependencies)).toHaveLength(0);
  });
});

describe("hasFrontend", () => {
  it("returns true for node-nextjs", () => {
    expect(hasFrontend("node-nextjs")).toBe(true);
  });

  it("returns true for fullstack-nextjs", () => {
    expect(hasFrontend("fullstack-nextjs")).toBe(true);
  });

  it("returns true for monorepo-turbo", () => {
    expect(hasFrontend("monorepo-turbo")).toBe(true);
  });

  it("returns false for node-express", () => {
    expect(hasFrontend("node-express")).toBe(false);
  });

  it("returns false for go-api", () => {
    expect(hasFrontend("go-api")).toBe(false);
  });

  it("returns false for python-fastapi", () => {
    expect(hasFrontend("python-fastapi")).toBe(false);
  });

  it("returns false for node-nestjs", () => {
    expect(hasFrontend("node-nestjs")).toBe(false);
  });
});

describe("parametric styling scaffold with node-nextjs", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = createTempDir(); });
  afterEach(() => { cleanup(tempDir); });

  // Tailwind v4: no tailwind.config.js — only postcss.config.mjs
  const expectedConfigFiles: Record<string, { postcss: boolean }> = {
    none:      { postcss: false },
    tailwind:  { postcss: true  },
    shadcn:    { postcss: true  },
    daisyui:   { postcss: true  },
    chakra:    { postcss: false },
    mantine:   { postcss: true  },
    bootstrap: { postcss: false },
    bulma:     { postcss: false },
  };

  it.each(listStylingIds())("styling=%s creates correct dependencies in package.json", (stylingId) => {
    const template = getTemplate("node-nextjs")!;
    const styling = getStylingOption(stylingId)!;
    const targetDir = path.join(tempDir, `style-deps-${stylingId}`);

    scaffold({
      projectName: `style-deps-${stylingId}`,
      template,
      targetDir,
      styling: stylingId === "none" ? null : styling,
      skipInstall: true,
      skipGit: true,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));

    // Verify every dependency declared by the styling option is present
    for (const [dep, version] of Object.entries(styling.dependencies)) {
      expect(pkg.dependencies?.[dep]).toBe(version);
    }
    for (const [dep, version] of Object.entries(styling.devDependencies)) {
      expect(pkg.devDependencies?.[dep]).toBe(version);
    }
  });

  it.each(listStylingIds())("styling=%s creates correct config files", (stylingId) => {
    const template = getTemplate("node-nextjs")!;
    const styling = getStylingOption(stylingId)!;
    const targetDir = path.join(tempDir, `style-cfg-${stylingId}`);

    scaffold({
      projectName: `style-cfg-${stylingId}`,
      template,
      targetDir,
      styling: stylingId === "none" ? null : styling,
      skipInstall: true,
      skipGit: true,
    });

    const expected = expectedConfigFiles[stylingId];
    expect(fs.existsSync(path.join(targetDir, "postcss.config.mjs"))).toBe(expected.postcss);
  });
});
