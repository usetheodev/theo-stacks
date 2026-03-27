import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, "..", "dist", "index.js");

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-theo-cli-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runCLI(args: string, cwd: string): string {
  return execSync(`node ${CLI_PATH} ${args}`, {
    cwd,
    env: { ...process.env, CI: "true" },
    encoding: "utf-8",
    timeout: 30_000,
  });
}

describe("CLI integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it("scaffolds node-express via CLI", () => {
    const output = runCLI("my-express --template node-express", tempDir);
    const projectDir = path.join(tempDir, "my-express");

    expect(output).toContain("my-express");
    expect(fs.existsSync(path.join(projectDir, "theo.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "index.js"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".gitignore"))).toBe(true);

    const yaml = fs.readFileSync(
      path.join(projectDir, "theo.yaml"),
      "utf-8",
    );
    expect(yaml).toContain('project: "my-express"');
  });

  it("scaffolds go-api via CLI", () => {
    runCLI("my-go --template go-api", tempDir);
    const projectDir = path.join(tempDir, "my-go");

    expect(fs.existsSync(path.join(projectDir, "main.go"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "go.mod"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "theo.yaml"))).toBe(true);

    const goMod = fs.readFileSync(
      path.join(projectDir, "go.mod"),
      "utf-8",
    );
    expect(goMod).toContain("example.com/my-go");
  });

  it("scaffolds python-fastapi via CLI", () => {
    runCLI("my-python --template python-fastapi", tempDir);
    const projectDir = path.join(tempDir, "my-python");

    expect(fs.existsSync(path.join(projectDir, "main.py"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "requirements.txt"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "theo.yaml"))).toBe(true);
  });

  it("scaffolds all 9 templates via CLI without errors", () => {
    const templateIds = [
      "node-express",
      "node-fastify",
      "node-nextjs",
      "go-api",
      "python-fastapi",
      "monorepo-turbo",
      "fullstack-nextjs",
      "node-nestjs",
      "node-worker",
    ];

    for (const id of templateIds) {
      const name = `test-${id}`;
      expect(() => runCLI(`${name} --template ${id}`, tempDir)).not.toThrow();

      const projectDir = path.join(tempDir, name);
      expect(fs.existsSync(path.join(projectDir, "theo.yaml"))).toBe(true);
    }
  });

  it("exits with error for unknown template", () => {
    expect(() => runCLI("my-app --template fake-template", tempDir)).toThrow();
  });

  it("exits with error in CI mode without required args", () => {
    expect(() => {
      execSync(`node ${CLI_PATH}`, {
        cwd: tempDir,
        env: { ...process.env, CI: "true" },
        encoding: "utf-8",
        stdio: "pipe",
        timeout: 10_000,
      });
    }).toThrow();
  });

  it("shows help with --help flag", () => {
    const output = execSync(`node ${CLI_PATH} --help`, {
      cwd: tempDir,
      encoding: "utf-8",
      timeout: 10_000,
    });

    expect(output).toContain("create-theo");
    expect(output).toContain("--template");
    expect(output).toContain("node-express");
    expect(output).toContain("go-api");
  });

  it("scaffolds with --database flag", () => {
    runCLI("db-app --template node-express --database", tempDir);
    const projectDir = path.join(tempDir, "db-app");

    expect(fs.existsSync(path.join(projectDir, "prisma", "schema.prisma"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".env.example"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "lib", "db.js"))).toBe(true);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkg.dependencies["@prisma/client"]).toBeDefined();
  });
});
