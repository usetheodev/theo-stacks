import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffold } from "../src/scaffold.js";
import { getTemplate } from "../src/templates.js";
import { getStylingOption } from "../src/styling.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-theo-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("scaffold", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it("creates project directory with template files", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "test-project");

    scaffold({
      projectName: "test-project",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "theo.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "index.js"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "README.md"))).toBe(true);
  });

  it("replaces {{project-name}} placeholder in theo.yaml", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "my-api");

    scaffold({
      projectName: "my-api",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    const yaml = fs.readFileSync(path.join(targetDir, "theo.yaml"), "utf-8");
    expect(yaml).toContain('project: "my-api"');
    expect(yaml).not.toContain("{{project-name}}");
  });

  it("replaces {{project-name}} placeholder in package.json", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "my-api");

    scaffold({
      projectName: "my-api",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"),
    );
    expect(pkg.name).toBe("my-api");
  });

  it("replaces {{project-name}} in go.mod for go-api template", () => {
    const template = getTemplate("go-api")!;
    const targetDir = path.join(tempDir, "my-go-app");

    scaffold({
      projectName: "my-go-app",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    const goMod = fs.readFileSync(path.join(targetDir, "go.mod"), "utf-8");
    expect(goMod).toContain("example.com/my-go-app");
    expect(goMod).not.toContain("{{project-name}}");
  });

  it("replaces {{project-name}} in python main.py", () => {
    const template = getTemplate("python-fastapi")!;
    const targetDir = path.join(tempDir, "my-py-api");

    scaffold({
      projectName: "my-py-api",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    const main = fs.readFileSync(path.join(targetDir, "main.py"), "utf-8");
    expect(main).toContain('title="my-py-api"');
    expect(main).not.toContain("{{project-name}}");
  });

  it("throws if target directory is not empty", () => {
    const targetDir = path.join(tempDir, "existing");
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, "file.txt"), "content");

    const template = getTemplate("node-express")!;

    expect(() =>
      scaffold({
        projectName: "existing",
        template,
        targetDir,
        skipInstall: true,
        skipGit: true,
      }),
    ).toThrow("already exists and is not empty");
  });

  it("throws for unknown template id", () => {
    const targetDir = path.join(tempDir, "test");

    expect(() =>
      scaffold({
        projectName: "test",
        template: {
          id: "nonexistent",
          name: "test",
          description: "test",
          language: "node",
          defaultPort: 3000,
        },
        targetDir,
        skipInstall: true,
        skipGit: true,
      }),
    ).toThrow('Template "nonexistent" not found');
  });

  it("creates nextjs template with correct structure", () => {
    const template = getTemplate("node-nextjs")!;
    const targetDir = path.join(tempDir, "my-nextjs");

    scaffold({
      projectName: "my-nextjs",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(
      fs.existsSync(path.join(targetDir, "src", "app", "page.js")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, "src", "app", "layout.js")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(targetDir, "src", "app", "api", "health", "route.js"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "next.config.js"))).toBe(true);
  });

  it("scaffolds all 8 templates without error", () => {
    const templateIds = [
      "node-express",
      "node-fastify",
      "node-nextjs",
      "go-api",
      "python-fastapi",
      "monorepo-turbo",
      "fullstack-nextjs",
      "node-nestjs",
    ];

    for (const id of templateIds) {
      const template = getTemplate(id)!;
      const targetDir = path.join(tempDir, id);

      expect(() =>
        scaffold({
          projectName: id,
          template,
          targetDir,
          skipInstall: true,
          skipGit: true,
        }),
      ).not.toThrow();

      const yaml = fs.readFileSync(path.join(targetDir, "theo.yaml"), "utf-8");
      expect(yaml).not.toContain("{{project-name}}");
      expect(yaml).toContain(`project: "${id}"`);
    }
  });
});

describe("scaffold with styling", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it("applies tailwind to node-nextjs template", () => {
    const template = getTemplate("node-nextjs")!;
    const styling = getStylingOption("tailwind")!;
    const targetDir = path.join(tempDir, "tw-app");

    scaffold({
      projectName: "tw-app",
      template,
      targetDir,
      styling,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "tailwind.config.js"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "postcss.config.js"))).toBe(true);

    const globals = fs.readFileSync(path.join(targetDir, "src", "app", "globals.css"), "utf-8");
    expect(globals).toContain("@tailwind base");

    const layout = fs.readFileSync(path.join(targetDir, "src", "app", "layout.js"), "utf-8");
    expect(layout).toContain("globals.css");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.devDependencies.tailwindcss).toBeDefined();
    expect(pkg.devDependencies.postcss).toBeDefined();
    expect(pkg.devDependencies.autoprefixer).toBeDefined();
  });

  it("applies shadcn to fullstack-nextjs template", () => {
    const template = getTemplate("fullstack-nextjs")!;
    const styling = getStylingOption("shadcn")!;
    const targetDir = path.join(tempDir, "shadcn-app");

    scaffold({
      projectName: "shadcn-app",
      template,
      targetDir,
      styling,
      skipInstall: true,
      skipGit: true,
    });

    const tailwindCfg = fs.readFileSync(path.join(targetDir, "tailwind.config.js"), "utf-8");
    expect(tailwindCfg).toContain("tailwindcss-animate");

    const globals = fs.readFileSync(path.join(targetDir, "src", "app", "globals.css"), "utf-8");
    expect(globals).toContain("--background");
    expect(globals).toContain("--foreground");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["tailwind-merge"]).toBeDefined();
    expect(pkg.dependencies["class-variance-authority"]).toBeDefined();
    expect(pkg.dependencies["@radix-ui/react-slot"]).toBeDefined();
  });

  it("applies daisyui to node-nextjs template", () => {
    const template = getTemplate("node-nextjs")!;
    const styling = getStylingOption("daisyui")!;
    const targetDir = path.join(tempDir, "daisy-app");

    scaffold({
      projectName: "daisy-app",
      template,
      targetDir,
      styling,
      skipInstall: true,
      skipGit: true,
    });

    const tailwindCfg = fs.readFileSync(path.join(targetDir, "tailwind.config.js"), "utf-8");
    expect(tailwindCfg).toContain("daisyui");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.devDependencies.daisyui).toBeDefined();
  });

  it("applies chakra to node-nextjs template", () => {
    const template = getTemplate("node-nextjs")!;
    const styling = getStylingOption("chakra")!;
    const targetDir = path.join(tempDir, "chakra-app");

    scaffold({
      projectName: "chakra-app",
      template,
      targetDir,
      styling,
      skipInstall: true,
      skipGit: true,
    });

    const layout = fs.readFileSync(path.join(targetDir, "src", "app", "layout.js"), "utf-8");
    expect(layout).toContain("ChakraProvider");
    expect(layout).toContain("use client");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["@chakra-ui/react"]).toBeDefined();
  });

  it("applies mantine to node-nextjs template", () => {
    const template = getTemplate("node-nextjs")!;
    const styling = getStylingOption("mantine")!;
    const targetDir = path.join(tempDir, "mantine-app");

    scaffold({
      projectName: "mantine-app",
      template,
      targetDir,
      styling,
      skipInstall: true,
      skipGit: true,
    });

    const layout = fs.readFileSync(path.join(targetDir, "src", "app", "layout.js"), "utf-8");
    expect(layout).toContain("MantineProvider");
    expect(layout).toContain("ColorSchemeScript");

    const postcss = fs.readFileSync(path.join(targetDir, "postcss.config.js"), "utf-8");
    expect(postcss).toContain("postcss-preset-mantine");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["@mantine/core"]).toBeDefined();
    expect(pkg.dependencies["@mantine/hooks"]).toBeDefined();
  });

  it("applies bootstrap to node-nextjs template", () => {
    const template = getTemplate("node-nextjs")!;
    const styling = getStylingOption("bootstrap")!;
    const targetDir = path.join(tempDir, "bs-app");

    scaffold({
      projectName: "bs-app",
      template,
      targetDir,
      styling,
      skipInstall: true,
      skipGit: true,
    });

    const globals = fs.readFileSync(path.join(targetDir, "src", "app", "globals.css"), "utf-8");
    expect(globals).toContain("bootstrap");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.bootstrap).toBeDefined();
  });

  it("applies bulma to node-nextjs template", () => {
    const template = getTemplate("node-nextjs")!;
    const styling = getStylingOption("bulma")!;
    const targetDir = path.join(tempDir, "bulma-app");

    scaffold({
      projectName: "bulma-app",
      template,
      targetDir,
      styling,
      skipInstall: true,
      skipGit: true,
    });

    const globals = fs.readFileSync(path.join(targetDir, "src", "app", "globals.css"), "utf-8");
    expect(globals).toContain("bulma");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.bulma).toBeDefined();
  });

  it("applies styling to monorepo-turbo web app only", () => {
    const template = getTemplate("monorepo-turbo")!;
    const styling = getStylingOption("tailwind")!;
    const targetDir = path.join(tempDir, "mono-tw");

    scaffold({
      projectName: "mono-tw",
      template,
      targetDir,
      styling,
      skipInstall: true,
      skipGit: true,
    });

    const webDir = path.join(targetDir, "apps", "web");
    expect(fs.existsSync(path.join(webDir, "tailwind.config.js"))).toBe(true);
    expect(fs.existsSync(path.join(webDir, "postcss.config.js"))).toBe(true);

    const webPkg = JSON.parse(fs.readFileSync(path.join(webDir, "package.json"), "utf-8"));
    expect(webPkg.devDependencies.tailwindcss).toBeDefined();

    // root package.json should NOT have tailwind
    const rootPkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(rootPkg.devDependencies?.tailwindcss).toBeUndefined();
  });

  it("does not apply styling when styling is null", () => {
    const template = getTemplate("node-nextjs")!;
    const targetDir = path.join(tempDir, "no-style");

    scaffold({
      projectName: "no-style",
      template,
      targetDir,
      styling: null,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "tailwind.config.js"))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, "postcss.config.js"))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, "src", "app", "globals.css"))).toBe(false);
  });
});
