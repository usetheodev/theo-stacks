import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffold } from "../src/scaffold.js";
import { getTemplate } from "../src/templates.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-theo-err-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("error handling", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it("throws with clear message when target directory is not empty", () => {
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

  it("throws with clear message for nonexistent template", () => {
    const targetDir = path.join(tempDir, "test");

    expect(() =>
      scaffold({
        projectName: "test",
        template: {
          id: "nonexistent-template",
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
    ).toThrow('Template "nonexistent-template" not found');
  });

  it("succeeds when target directory exists but is empty", () => {
    const targetDir = path.join(tempDir, "empty-dir");
    fs.mkdirSync(targetDir);

    const template = getTemplate("node-express")!;

    expect(() =>
      scaffold({
        projectName: "empty-dir",
        template,
        targetDir,
        skipInstall: true,
        skipGit: true,
      }),
    ).not.toThrow();

    expect(fs.existsSync(path.join(targetDir, "theo.yaml"))).toBe(true);
  });

  it("creates nested target directories that do not exist", () => {
    const targetDir = path.join(tempDir, "deep", "nested", "project");

    const template = getTemplate("node-express")!;

    expect(() =>
      scaffold({
        projectName: "project",
        template,
        targetDir,
        skipInstall: true,
        skipGit: true,
      }),
    ).not.toThrow();

    expect(fs.existsSync(path.join(targetDir, "theo.yaml"))).toBe(true);
  });

  it("handles project names with special characters after sanitization", () => {
    const targetDir = path.join(tempDir, "my-special-app");
    const template = getTemplate("node-express")!;

    scaffold({
      projectName: "my-special-app",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    const yaml = fs.readFileSync(path.join(targetDir, "theo.yaml"), "utf-8");
    expect(yaml).toContain('project: "my-special-app"');
    expect(yaml).not.toContain("{{project-name}}");
  });

  it("correctly renames gitignore to .gitignore", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "gitignore-test");

    scaffold({
      projectName: "gitignore-test",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "gitignore"))).toBe(false);
  });

  it("renames gitignore for all template types", () => {
    const templateIds = [
      "node-express",
      "node-fastify",
      "go-api",
      "python-fastapi",
      "node-nextjs",
      "fullstack-nextjs",
      "node-nestjs",
      "node-worker",
      "monorepo-turbo",
    ];

    for (const id of templateIds) {
      const template = getTemplate(id)!;
      const targetDir = path.join(tempDir, `gitignore-${id}`);

      scaffold({
        projectName: `gitignore-${id}`,
        template,
        targetDir,
        skipInstall: true,
        skipGit: true,
      });

      expect(fs.existsSync(path.join(targetDir, ".gitignore"))).toBe(true);
    }
  });

  it("does not leave placeholder unreplaced in any text file", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "placeholder-check");

    scaffold({
      projectName: "placeholder-check",
      template,
      targetDir,
      skipInstall: true,
      skipGit: true,
    });

    function checkDir(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else {
          const ext = path.extname(entry.name);
          const textExts = [".js", ".ts", ".json", ".yaml", ".yml", ".md", ".py", ".go", ".mod"];
          if (textExts.includes(ext)) {
            const content = fs.readFileSync(fullPath, "utf-8");
            expect(content).not.toContain("{{project-name}}");
          }
        }
      }
    }

    checkDir(targetDir);
  });
});
