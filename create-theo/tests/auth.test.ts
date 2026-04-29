import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffold } from "../src/scaffold/index.js";
import { getTemplate } from "../src/templates.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-theo-auth-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("scaffold with auth-jwt", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = createTempDir(); });
  afterEach(() => { cleanup(tempDir); });

  it("adds auth middleware to node-express", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "auth-express");

    scaffold({ projectName: "auth-express", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "middleware", "auth.js"))).toBe(true);
    const auth = fs.readFileSync(path.join(targetDir, "src", "middleware", "auth.js"), "utf-8");
    expect(auth).toContain("jwt.verify");
    expect(auth).toContain("generateToken");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.jsonwebtoken).toBeDefined();

    const env = fs.readFileSync(path.join(targetDir, ".env"), "utf-8");
    expect(env).toContain("JWT_SECRET");
  });

  it("adds auth plugin to node-fastify", () => {
    const template = getTemplate("node-fastify")!;
    const targetDir = path.join(tempDir, "auth-fastify");

    scaffold({ projectName: "auth-fastify", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "plugins", "auth.js"))).toBe(true);
    const auth = fs.readFileSync(path.join(targetDir, "src", "plugins", "auth.js"), "utf-8");
    expect(auth).toContain("fastify-plugin");
    expect(auth).toContain("fastify.decorate");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["fastify-plugin"]).toBeDefined();
  });

  it("adds auth guard to node-nestjs", () => {
    const template = getTemplate("node-nestjs")!;
    const targetDir = path.join(tempDir, "auth-nestjs");

    scaffold({ projectName: "auth-nestjs", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "guards", "auth.guard.ts"))).toBe(true);
    const guard = fs.readFileSync(path.join(targetDir, "src", "guards", "auth.guard.ts"), "utf-8");
    expect(guard).toContain("@Injectable");
    expect(guard).toContain("CanActivate");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.devDependencies["@types/jsonwebtoken"]).toBeDefined();
  });

  it("adds auth to go-api", () => {
    const template = getTemplate("go-api")!;
    const targetDir = path.join(tempDir, "auth-go");

    scaffold({ projectName: "auth-go", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "internal", "auth", "auth.go"))).toBe(true);
    const goMod = fs.readFileSync(path.join(targetDir, "go.mod"), "utf-8");
    expect(goMod).toContain("golang-jwt");
  });

  it("adds auth to python-fastapi", () => {
    const template = getTemplate("python-fastapi")!;
    const targetDir = path.join(tempDir, "auth-py");

    scaffold({ projectName: "auth-py", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "auth.py"))).toBe(true);
    const auth = fs.readFileSync(path.join(targetDir, "auth.py"), "utf-8");
    expect(auth).toContain("HTTPBearer");
    expect(auth).toContain("jwt.decode");

    const reqs = fs.readFileSync(path.join(targetDir, "requirements.txt"), "utf-8");
    expect(reqs).toContain("pyjwt");
  });

  it("adds auth to rust-axum", () => {
    const template = getTemplate("rust-axum")!;
    const targetDir = path.join(tempDir, "auth-rust");

    scaffold({ projectName: "auth-rust", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "auth.rs"))).toBe(true);
    const cargo = fs.readFileSync(path.join(targetDir, "Cargo.toml"), "utf-8");
    expect(cargo).toContain("jsonwebtoken");
  });

  it("adds auth to java-spring", () => {
    const template = getTemplate("java-spring")!;
    const targetDir = path.join(tempDir, "auth-java");

    scaffold({ projectName: "auth-java", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(
      path.join(targetDir, "src", "main", "java", "com", "theo", "app", "config", "JwtFilter.java"),
    )).toBe(true);
    const gradle = fs.readFileSync(path.join(targetDir, "build.gradle.kts"), "utf-8");
    expect(gradle).toContain("jjwt-api");
  });

  it("adds auth to ruby-sinatra", () => {
    const template = getTemplate("ruby-sinatra")!;
    const targetDir = path.join(tempDir, "auth-ruby");

    scaffold({ projectName: "auth-ruby", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "auth.rb"))).toBe(true);
    const gemfile = fs.readFileSync(path.join(targetDir, "Gemfile"), "utf-8");
    expect(gemfile).toContain("jwt");
  });

  it("adds auth to php-slim", () => {
    const template = getTemplate("php-slim")!;
    const targetDir = path.join(tempDir, "auth-php");

    scaffold({ projectName: "auth-php", template, targetDir, addons: ["auth-jwt"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "Middleware", "AuthJwt.php"))).toBe(true);
    const composer = fs.readFileSync(path.join(targetDir, "composer.json"), "utf-8");
    expect(composer).toContain("firebase/php-jwt");
  });
});

describe("scaffold with auth-oauth", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = createTempDir(); });
  afterEach(() => { cleanup(tempDir); });

  it("adds OAuth middleware to node-express", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "oauth-express");

    scaffold({ projectName: "oauth-express", template, targetDir, addons: ["auth-oauth"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "middleware", "oauth.js"))).toBe(true);
    const oauth = fs.readFileSync(path.join(targetDir, "src", "middleware", "oauth.js"), "utf-8");
    expect(oauth).toContain("openid-client");
    expect(oauth).toContain("OIDC_ISSUER_URL");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["openid-client"]).toBeDefined();

    const env = fs.readFileSync(path.join(targetDir, ".env"), "utf-8");
    expect(env).toContain("OIDC_ISSUER_URL");
    expect(env).toContain("OIDC_CLIENT_ID");
  });

  it("adds OAuth to go-api", () => {
    const template = getTemplate("go-api")!;
    const targetDir = path.join(tempDir, "oauth-go");

    scaffold({ projectName: "oauth-go", template, targetDir, addons: ["auth-oauth"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "internal", "auth", "oauth.go"))).toBe(true);
    const goMod = fs.readFileSync(path.join(targetDir, "go.mod"), "utf-8");
    expect(goMod).toContain("go-oidc");
  });

  it("adds OAuth to python-fastapi", () => {
    const template = getTemplate("python-fastapi")!;
    const targetDir = path.join(tempDir, "oauth-py");

    scaffold({ projectName: "oauth-py", template, targetDir, addons: ["auth-oauth"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "oauth.py"))).toBe(true);
    const reqs = fs.readFileSync(path.join(targetDir, "requirements.txt"), "utf-8");
    expect(reqs).toContain("authlib");
  });

  it("adds OAuth to java-spring", () => {
    const template = getTemplate("java-spring")!;
    const targetDir = path.join(tempDir, "oauth-java");

    scaffold({ projectName: "oauth-java", template, targetDir, addons: ["auth-oauth"], skipInstall: true, skipGit: true });

    const gradle = fs.readFileSync(path.join(targetDir, "build.gradle.kts"), "utf-8");
    expect(gradle).toContain("spring-boot-starter-oauth2-resource-server");
  });

  it("adds OAuth to rust-axum", () => {
    const template = getTemplate("rust-axum")!;
    const targetDir = path.join(tempDir, "oauth-rust");

    scaffold({ projectName: "oauth-rust", template, targetDir, addons: ["auth-oauth"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "oauth.rs"))).toBe(true);
    const oauth = fs.readFileSync(path.join(targetDir, "src", "oauth.rs"), "utf-8");
    expect(oauth).toContain("OIDC_ISSUER_URL");
    expect(oauth).toContain("authenticate");

    const cargo = fs.readFileSync(path.join(targetDir, "Cargo.toml"), "utf-8");
    expect(cargo).toContain("openidconnect");
    expect(cargo).toContain("reqwest");
  });

  it("adds OAuth to ruby-sinatra", () => {
    const template = getTemplate("ruby-sinatra")!;
    const targetDir = path.join(tempDir, "oauth-ruby");

    scaffold({ projectName: "oauth-ruby", template, targetDir, addons: ["auth-oauth"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "oauth.rb"))).toBe(true);
    const oauth = fs.readFileSync(path.join(targetDir, "oauth.rb"), "utf-8");
    expect(oauth).toContain("OIDC_ISSUER_URL");
    expect(oauth).toContain("authenticate_oauth!");

    const gemfile = fs.readFileSync(path.join(targetDir, "Gemfile"), "utf-8");
    expect(gemfile).toContain("omniauth");
    expect(gemfile).toContain("omniauth_openid_connect");
  });

  it("adds OAuth to php-slim", () => {
    const template = getTemplate("php-slim")!;
    const targetDir = path.join(tempDir, "oauth-php");

    scaffold({ projectName: "oauth-php", template, targetDir, addons: ["auth-oauth"], skipInstall: true, skipGit: true });

    expect(fs.existsSync(path.join(targetDir, "src", "Middleware", "AuthOAuth.php"))).toBe(true);
    const composer = fs.readFileSync(path.join(targetDir, "composer.json"), "utf-8");
    expect(composer).toContain("guzzlehttp/guzzle");
  });
});
