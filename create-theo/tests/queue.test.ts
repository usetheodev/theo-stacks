import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffold } from "../src/scaffold/index.js";
import { getTemplate } from "../src/templates.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-theo-queue-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("scaffold with queue", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = createTempDir(); });
  afterEach(() => { cleanup(tempDir); });

  it("adds queue to node-express", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "queue-express");

    scaffold({ projectName: "queue-express", template, targetDir, addons: ["redis", "queue"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "lib", "queue.js"))).toBe(true);
    const queue = fs.readFileSync(path.join(targetDir, "src", "lib", "queue.js"), "utf-8");
    expect(queue).toContain("bullmq");
    expect(queue).toContain("defaultQueue");
    expect(queue).toContain("createWorker");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.bullmq).toBeDefined();
    expect(pkg.dependencies.ioredis).toBeDefined();
  });

  it("adds queue to node-nestjs as TypeScript", () => {
    const template = getTemplate("node-nestjs")!;
    const targetDir = path.join(tempDir, "queue-nestjs");

    scaffold({ projectName: "queue-nestjs", template, targetDir, addons: ["redis", "queue"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "lib", "queue.ts"))).toBe(true);
    const queue = fs.readFileSync(path.join(targetDir, "src", "lib", "queue.ts"), "utf-8");
    expect(queue).toContain("import { Queue");
  });

  it("queue includes redis docker service", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "queue-redis");

    scaffold({ projectName: "queue-redis", template, targetDir, addons: ["redis", "queue"], skipInstall: true, skipGit: true });

    const compose = fs.readFileSync(path.join(targetDir, "docker-compose.yml"), "utf-8");
    expect(compose).toContain("redis:7-alpine");
  });

  it("adds queue (asynq) to go-api", () => {
    const template = getTemplate("go-api")!;
    const targetDir = path.join(tempDir, "queue-go");

    scaffold({ projectName: "queue-go", template, targetDir, addons: ["redis", "queue"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "internal", "queue", "queue.go"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "internal", "queue", "worker.go"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "internal", "queue", "tasks.go"))).toBe(true);

    const goMod = fs.readFileSync(path.join(targetDir, "go.mod"), "utf-8");
    expect(goMod).toContain("asynq");

    const queueFile = fs.readFileSync(path.join(targetDir, "internal", "queue", "queue.go"), "utf-8");
    expect(queueFile).toContain("asynq.NewClient");
  });

  it("adds queue (arq) to python-fastapi", () => {
    const template = getTemplate("python-fastapi")!;
    const targetDir = path.join(tempDir, "queue-py");

    scaffold({ projectName: "queue-py", template, targetDir, addons: ["redis", "queue"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "queue_worker.py"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "queue_client.py"))).toBe(true);

    const reqs = fs.readFileSync(path.join(targetDir, "requirements.txt"), "utf-8");
    expect(reqs).toContain("arq");

    const worker = fs.readFileSync(path.join(targetDir, "queue_worker.py"), "utf-8");
    expect(worker).toContain("WorkerSettings");
  });

  it("adds queue (symfony/messenger) to php-slim", () => {
    const template = getTemplate("php-slim")!;
    const targetDir = path.join(tempDir, "queue-php");

    scaffold({ projectName: "queue-php", template, targetDir, addons: ["redis", "queue"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "Message", "ExampleMessage.php"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "Message", "ExampleHandler.php"))).toBe(true);

    const composer = fs.readFileSync(path.join(targetDir, "composer.json"), "utf-8");
    expect(composer).toContain("symfony/messenger");
  });

  it("combines all addons + database", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "all-addons");

    scaffold({
      projectName: "all-addons",
      template,
      targetDir,
      database: true,
      addons: ["redis", "auth-jwt", "queue"],
      skipInstall: true,
      skipGit: true,
    });

    // All files exist
    expect(fs.existsSync(path.join(targetDir, "src", "lib", "redis.js"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "middleware", "auth.js"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "lib", "queue.js"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "prisma", "schema.prisma"))).toBe(true);

    // Docker-compose has all services
    const compose = fs.readFileSync(path.join(targetDir, "docker-compose.yml"), "utf-8");
    expect(compose).toContain("postgres:16-alpine");
    expect(compose).toContain("redis:7-alpine");

    // Env has all vars
    const env = fs.readFileSync(path.join(targetDir, ".env"), "utf-8");
    expect(env).toContain("DATABASE_URL");
    expect(env).toContain("REDIS_URL");
    expect(env).toContain("JWT_SECRET");
  });
});
