import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffold, dryRunScaffold } from "../src/scaffold.js";
import { getTemplate, listTemplateIds } from "../src/templates.js";
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

  it("replaces {{project-name}} in Cargo.toml for rust-axum", () => {
    const template = getTemplate("rust-axum")!;
    const targetDir = path.join(tempDir, "my-rust-api");

    scaffold({
      projectName: "my-rust-api",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    const cargo = fs.readFileSync(path.join(targetDir, "Cargo.toml"), "utf-8");
    expect(cargo).toContain('name = "my-rust-api"');
    expect(cargo).not.toContain("{{project-name}}");
  });

  it("replaces {{project-name}} in settings.gradle.kts for java-spring", () => {
    const template = getTemplate("java-spring")!;
    const targetDir = path.join(tempDir, "my-java-api");

    scaffold({
      projectName: "my-java-api",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    const settings = fs.readFileSync(path.join(targetDir, "settings.gradle.kts"), "utf-8");
    expect(settings).toContain('rootProject.name = "my-java-api"');
    expect(settings).not.toContain("{{project-name}}");
  });

  it("overwrites existing directory contents during scaffold", () => {
    const targetDir = path.join(tempDir, "existing");
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, "file.txt"), "content");

    const template = getTemplate("node-express")!;

    // scaffold should succeed — overwrite validation is handled by the CLI layer
    expect(() =>
      scaffold({
        projectName: "existing",
        template,
        targetDir,
        skipInstall: true,
        skipGit: true,
      }),
    ).not.toThrow();

    expect(fs.existsSync(path.join(targetDir, "theo.yaml"))).toBe(true);
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
          type: "api",
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
      fs.existsSync(path.join(targetDir, "src", "app", "page.tsx")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, "src", "app", "layout.tsx")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(targetDir, "src", "app", "api", "health", "route.ts"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "next.config.mjs"))).toBe(true);
  });

  it("scaffolds all 19 templates without error", () => {
    const templateIds = listTemplateIds();

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

  it("rust-axum has production-ready files", () => {
    const template = getTemplate("rust-axum")!;
    const targetDir = path.join(tempDir, "prod-rust");

    scaffold({
      projectName: "prod-rust",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "Cargo.toml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "main.rs"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "rustfmt.toml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml"))).toBe(true);

    const ci = fs.readFileSync(path.join(targetDir, ".github", "workflows", "ci.yml"), "utf-8");
    expect(ci).toContain("rust-toolchain");
  });

  it("java-spring has production-ready files", () => {
    const template = getTemplate("java-spring")!;
    const targetDir = path.join(tempDir, "prod-java");

    scaffold({
      projectName: "prod-java",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "build.gradle.kts"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "settings.gradle.kts"))).toBe(true);
    expect(fs.existsSync(
      path.join(targetDir, "src", "main", "java", "com", "theo", "app", "Application.java"),
    )).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml"))).toBe(true);

    const ci = fs.readFileSync(path.join(targetDir, ".github", "workflows", "ci.yml"), "utf-8");
    expect(ci).toContain("setup-java");
  });

  it("ruby-sinatra has production-ready files", () => {
    const template = getTemplate("ruby-sinatra")!;
    const targetDir = path.join(tempDir, "prod-ruby");

    scaffold({
      projectName: "prod-ruby",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "Gemfile"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "app.rb"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "config.ru"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "config", "puma.rb"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml"))).toBe(true);

    const ci = fs.readFileSync(path.join(targetDir, ".github", "workflows", "ci.yml"), "utf-8");
    expect(ci).toContain("setup-ruby");
  });

  it("monorepo-go has correct structure", () => {
    const template = getTemplate("monorepo-go")!;
    const targetDir = path.join(tempDir, "mono-go");

    scaffold({
      projectName: "mono-go",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "go.work"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "api", "main.go"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "worker", "main.go"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "pkg", "shared", "shared.go"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "Makefile"))).toBe(true);
  });

  it("monorepo-python has correct structure", () => {
    const template = getTemplate("monorepo-python")!;
    const targetDir = path.join(tempDir, "mono-py");

    scaffold({
      projectName: "mono-py",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "pyproject.toml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "api", "main.py"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "worker", "worker.py"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "packages", "shared", "src", "shared", "__init__.py"))).toBe(true);

    const rootToml = fs.readFileSync(path.join(targetDir, "pyproject.toml"), "utf-8");
    expect(rootToml).toContain("[tool.uv.workspace]");
  });

  it("monorepo-rust has correct structure", () => {
    const template = getTemplate("monorepo-rust")!;
    const targetDir = path.join(tempDir, "mono-rust");

    scaffold({
      projectName: "mono-rust",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "Cargo.toml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "api", "src", "main.rs"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "worker", "src", "main.rs"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "pkg", "shared", "src", "lib.rs"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "Makefile"))).toBe(true);
  });

  it("monorepo-java has correct structure", () => {
    const template = getTemplate("monorepo-java")!;
    const targetDir = path.join(tempDir, "mono-java");

    scaffold({
      projectName: "mono-java",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "settings.gradle.kts"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "build.gradle.kts"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "api", "build.gradle.kts"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "worker", "build.gradle.kts"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "packages", "shared", "src", "main", "java", "com", "theo", "shared", "AppInfo.java"))).toBe(true);
  });

  it("monorepo-ruby has correct structure", () => {
    const template = getTemplate("monorepo-ruby")!;
    const targetDir = path.join(tempDir, "mono-ruby");

    scaffold({
      projectName: "mono-ruby",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "Gemfile"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "Rakefile"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "api", "app.rb"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "worker", "worker.rb"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "packages", "shared", "shared.rb"))).toBe(true);
  });

  it("monorepo-php has correct structure", () => {
    const template = getTemplate("monorepo-php")!;
    const targetDir = path.join(tempDir, "mono-php");

    scaffold({
      projectName: "mono-php",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "composer.json"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "api", "public", "index.php"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "apps", "worker", "worker.php"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "packages", "shared", "src", "AppInfo.php"))).toBe(true);
  });

  it("php-slim has production-ready files", () => {
    const template = getTemplate("php-slim")!;
    const targetDir = path.join(tempDir, "prod-php");

    scaffold({
      projectName: "prod-php",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "composer.json"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "public", "index.php"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "routes.php"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "Middleware", "CorsMiddleware.php"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml"))).toBe(true);

    const ci = fs.readFileSync(path.join(targetDir, ".github", "workflows", "ci.yml"), "utf-8");
    expect(ci).toContain("setup-php");
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

    expect(fs.existsSync(path.join(targetDir, "postcss.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "tailwind.config.js"))).toBe(false);

    const globals = fs.readFileSync(path.join(targetDir, "src", "app", "globals.css"), "utf-8");
    expect(globals).toContain('@import "tailwindcss"');

    const layout = fs.readFileSync(path.join(targetDir, "src", "app", "layout.tsx"), "utf-8");
    expect(layout).toContain("globals.css");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.devDependencies.tailwindcss).toBeDefined();
    expect(pkg.devDependencies["@tailwindcss/postcss"]).toBeDefined();
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

    expect(fs.existsSync(path.join(targetDir, "postcss.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "tailwind.config.js"))).toBe(false);

    const globals = fs.readFileSync(path.join(targetDir, "src", "app", "globals.css"), "utf-8");
    expect(globals).toContain('@import "tailwindcss"');
    expect(globals).toContain('@import "tw-animate-css"');
    expect(globals).toContain("--background");
    expect(globals).toContain("--foreground");
    expect(globals).toContain("oklch(");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["tailwind-merge"]).toBeDefined();
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

    expect(fs.existsSync(path.join(targetDir, "postcss.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "tailwind.config.js"))).toBe(false);

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

    const layout = fs.readFileSync(path.join(targetDir, "src", "app", "layout.tsx"), "utf-8");
    expect(layout).toContain("ChakraProviders");

    const providers = fs.readFileSync(path.join(targetDir, "src", "app", "providers.js"), "utf-8");
    expect(providers).toContain("use client");
    expect(providers).toContain("ChakraProvider");

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

    const layout = fs.readFileSync(path.join(targetDir, "src", "app", "layout.tsx"), "utf-8");
    expect(layout).toContain("MantineProvider");
    expect(layout).toContain("ColorSchemeScript");

    const postcss = fs.readFileSync(path.join(targetDir, "postcss.config.mjs"), "utf-8");
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
    expect(fs.existsSync(path.join(webDir, "postcss.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(webDir, "tailwind.config.js"))).toBe(false);

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
    expect(fs.existsSync(path.join(targetDir, "postcss.config.mjs"))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, "src", "app", "globals.css"))).toBe(false);
  });

  it("node-express has production-ready files", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "prod-express");

    scaffold({
      projectName: "prod-express",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "eslint.config.js"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".prettierrc"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml"))).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.cors).toBeDefined();
    expect(pkg.dependencies["pino-http"]).toBeDefined();
    expect(pkg.devDependencies.eslint).toBeDefined();
    expect(pkg.devDependencies.prettier).toBeDefined();
    expect(pkg.scripts.lint).toBeDefined();
    expect(pkg.scripts.format).toBeDefined();
  });

  it("go-api has production-ready files", () => {
    const template = getTemplate("go-api")!;
    const targetDir = path.join(tempDir, "prod-go");

    scaffold({
      projectName: "prod-go",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "Makefile"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml"))).toBe(true);

    const ci = fs.readFileSync(path.join(targetDir, ".github", "workflows", "ci.yml"), "utf-8");
    expect(ci).toContain("setup-go");
  });

  it("python-fastapi has production-ready files", () => {
    const template = getTemplate("python-fastapi")!;
    const targetDir = path.join(tempDir, "prod-py");

    scaffold({
      projectName: "prod-py",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "pyproject.toml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml"))).toBe(true);

    const ci = fs.readFileSync(path.join(targetDir, ".github", "workflows", "ci.yml"), "utf-8");
    expect(ci).toContain("setup-python");
    expect(ci).toContain("ruff");
  });

  it("database flag generates docker-compose.yml", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "db-compose");

    scaffold({
      projectName: "db-compose",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "docker-compose.yml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".env"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".env.example"))).toBe(true);

    const compose = fs.readFileSync(path.join(targetDir, "docker-compose.yml"), "utf-8");
    expect(compose).toContain("postgres:16-alpine");
    expect(compose).toContain("healthcheck");
    expect(compose).toContain("pgdata");
  });

  it("all templates include CI workflow", () => {
    const templateIds = listTemplateIds();

    for (const id of templateIds) {
      const template = getTemplate(id)!;
      const targetDir = path.join(tempDir, `ci-${id}`);

      scaffold({
        projectName: `ci-${id}`,
        template,
        targetDir,
        skipInstall: true,
        skipGit: true,
      });

      expect(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml"))).toBe(true);
    }
  });
});

describe("scaffold with combined features", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it("fullstack-nextjs with styling=tailwind AND database=true", () => {
    const template = getTemplate("fullstack-nextjs")!;
    const styling = getStylingOption("tailwind")!;
    const targetDir = path.join(tempDir, "combo-fullstack");

    scaffold({
      projectName: "combo-fullstack",
      template,
      targetDir,
      styling,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    // Verify styling was applied
    expect(fs.existsSync(path.join(targetDir, "postcss.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "tailwind.config.js"))).toBe(false);
    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.devDependencies.tailwindcss).toBeDefined();

    // Verify database was applied
    expect(fs.existsSync(path.join(targetDir, "docker-compose.yml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".env"))).toBe(true);
    const compose = fs.readFileSync(path.join(targetDir, "docker-compose.yml"), "utf-8");
    expect(compose).toContain("postgres");

    // Verify prisma (Node fullstack template gets prisma)
    expect(pkg.dependencies.prisma || pkg.devDependencies.prisma || pkg.dependencies["@prisma/client"]).toBeDefined();
  });

  it("node-express with database + redis + auth-jwt addons combined", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "combo-express");

    scaffold({
      projectName: "combo-express",
      template,
      targetDir,
      database: true,
      addons: ["redis", "auth-jwt"],
      skipInstall: true,
      skipGit: true,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));

    // Verify database (Prisma)
    expect(pkg.dependencies["@prisma/client"] || pkg.devDependencies.prisma).toBeDefined();

    // Verify redis
    expect(pkg.dependencies.ioredis).toBeDefined();
    expect(fs.existsSync(path.join(targetDir, "src", "lib", "redis.js"))).toBe(true);

    // Verify auth-jwt
    expect(pkg.dependencies.jsonwebtoken).toBeDefined();
    expect(fs.existsSync(path.join(targetDir, "src", "middleware", "auth.js"))).toBe(true);

    // Verify docker-compose has both postgres and redis
    const compose = fs.readFileSync(path.join(targetDir, "docker-compose.yml"), "utf-8");
    expect(compose).toContain("postgres");
    expect(compose).toContain("redis");

    // Verify .env has all vars
    const env = fs.readFileSync(path.join(targetDir, ".env"), "utf-8");
    expect(env).toContain("DATABASE_URL");
    expect(env).toContain("REDIS_URL");
    expect(env).toContain("JWT_SECRET");
  });

  it("monorepo-turbo with styling=tailwind AND database=true", () => {
    const template = getTemplate("monorepo-turbo")!;
    const styling = getStylingOption("tailwind")!;
    const targetDir = path.join(tempDir, "combo-turbo");

    scaffold({
      projectName: "combo-turbo",
      template,
      targetDir,
      styling,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    // Verify styling applied to web app only
    const webDir = path.join(targetDir, "apps", "web");
    expect(fs.existsSync(path.join(webDir, "postcss.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(webDir, "tailwind.config.js"))).toBe(false);
    const webPkg = JSON.parse(fs.readFileSync(path.join(webDir, "package.json"), "utf-8"));
    expect(webPkg.devDependencies.tailwindcss).toBeDefined();

    // Verify root does NOT have tailwind
    const rootPkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(rootPkg.devDependencies?.tailwindcss).toBeUndefined();

    // Verify database was applied
    expect(fs.existsSync(path.join(targetDir, "docker-compose.yml"))).toBe(true);
    const compose = fs.readFileSync(path.join(targetDir, "docker-compose.yml"), "utf-8");
    expect(compose).toContain("postgres");
  });
});

describe("dryRunScaffold", () => {
  it("returns file list without creating any files", () => {
    const template = getTemplate("node-express")!;
    const targetDir = "/tmp/should-not-exist-dry-run-test";

    const files = dryRunScaffold({
      projectName: "dry-test",
      template,
      targetDir,
    });

    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain("theo.yaml");
    expect(files).toContain("package.json");
    expect(files).toContain("src/index.js");
    expect(fs.existsSync(targetDir)).toBe(false);
  });

  it("includes addon indicators when addons specified", () => {
    const template = getTemplate("node-express")!;

    const files = dryRunScaffold({
      projectName: "dry-addons",
      template,
      targetDir: "/tmp/should-not-exist-dry-addons",
      database: true,
      addons: ["redis", "auth-jwt"],
    });

    expect(files).toContain("docker-compose.yml");
    expect(files).toContain("src/lib/redis.js");
    expect(files).toContain("src/middleware/auth.js");
  });
});
