import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffold } from "../src/scaffold/index.js";
import { getTemplate } from "../src/templates.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-theo-redis-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("scaffold with redis", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = createTempDir(); });
  afterEach(() => { cleanup(tempDir); });

  it("adds redis to node-express", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "redis-express");

    scaffold({ projectName: "redis-express", template, targetDir, addons: ["redis"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "lib", "redis.js"))).toBe(true);
    const redis = fs.readFileSync(path.join(targetDir, "src", "lib", "redis.js"), "utf-8");
    expect(redis).toContain("ioredis");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.ioredis).toBeDefined();

    expect(fs.existsSync(path.join(targetDir, "docker-compose.yml"))).toBe(true);
    const compose = fs.readFileSync(path.join(targetDir, "docker-compose.yml"), "utf-8");
    expect(compose).toContain("redis:7-alpine");

    const env = fs.readFileSync(path.join(targetDir, ".env"), "utf-8");
    expect(env).toContain("REDIS_URL");
  });

  it("adds redis to node-nestjs as TypeScript", () => {
    const template = getTemplate("node-nestjs")!;
    const targetDir = path.join(tempDir, "redis-nestjs");

    scaffold({ projectName: "redis-nestjs", template, targetDir, addons: ["redis"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "lib", "redis.ts"))).toBe(true);
    const redis = fs.readFileSync(path.join(targetDir, "src", "lib", "redis.ts"), "utf-8");
    expect(redis).toContain("import Redis");
  });

  it("adds redis to go-api", () => {
    const template = getTemplate("go-api")!;
    const targetDir = path.join(tempDir, "redis-go");

    scaffold({ projectName: "redis-go", template, targetDir, addons: ["redis"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "internal", "cache", "redis.go"))).toBe(true);
    const goMod = fs.readFileSync(path.join(targetDir, "go.mod"), "utf-8");
    expect(goMod).toContain("go-redis");
  });

  it("adds redis to python-fastapi", () => {
    const template = getTemplate("python-fastapi")!;
    const targetDir = path.join(tempDir, "redis-py");

    scaffold({ projectName: "redis-py", template, targetDir, addons: ["redis"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "cache.py"))).toBe(true);
    const reqs = fs.readFileSync(path.join(targetDir, "requirements.txt"), "utf-8");
    expect(reqs).toContain("redis");
  });

  it("adds redis to rust-axum", () => {
    const template = getTemplate("rust-axum")!;
    const targetDir = path.join(tempDir, "redis-rust");

    scaffold({ projectName: "redis-rust", template, targetDir, addons: ["redis"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "cache.rs"))).toBe(true);
    const cargo = fs.readFileSync(path.join(targetDir, "Cargo.toml"), "utf-8");
    expect(cargo).toContain("[dependencies.redis]");
  });

  it("adds redis to java-spring", () => {
    const template = getTemplate("java-spring")!;
    const targetDir = path.join(tempDir, "redis-java");

    scaffold({ projectName: "redis-java", template, targetDir, addons: ["redis"], skipInstall: true, skipGit: true });

    const gradle = fs.readFileSync(path.join(targetDir, "build.gradle.kts"), "utf-8");
    expect(gradle).toContain("spring-boot-starter-data-redis");
  });

  it("adds redis to ruby-sinatra", () => {
    const template = getTemplate("ruby-sinatra")!;
    const targetDir = path.join(tempDir, "redis-ruby");

    scaffold({ projectName: "redis-ruby", template, targetDir, addons: ["redis"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "cache.rb"))).toBe(true);
    const gemfile = fs.readFileSync(path.join(targetDir, "Gemfile"), "utf-8");
    expect(gemfile).toContain("redis");
  });

  it("adds redis to php-slim", () => {
    const template = getTemplate("php-slim")!;
    const targetDir = path.join(tempDir, "redis-php");

    scaffold({ projectName: "redis-php", template, targetDir, addons: ["redis"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "cache.php"))).toBe(true);
    const composer = fs.readFileSync(path.join(targetDir, "composer.json"), "utf-8");
    expect(composer).toContain("predis");
  });

  it("merges redis and postgres in docker-compose", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "redis-db");

    scaffold({ projectName: "redis-db", template, targetDir, database: true, addons: ["redis"], skipInstall: true, skipGit: true });

    const compose = fs.readFileSync(path.join(targetDir, "docker-compose.yml"), "utf-8");
    expect(compose).toContain("postgres:16-alpine");
    expect(compose).toContain("redis:7-alpine");

    const env = fs.readFileSync(path.join(targetDir, ".env"), "utf-8");
    expect(env).toContain("DATABASE_URL");
    expect(env).toContain("REDIS_URL");
  });
});
