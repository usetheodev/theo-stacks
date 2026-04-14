import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffold } from "../src/scaffold/index.js";
import { getTemplate } from "../src/templates.js";
import { supportsDatabase, getOrmForLanguage } from "../src/database.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-theo-db-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("database config", () => {
  it("supportsDatabase returns true for api and worker", () => {
    expect(supportsDatabase("api")).toBe(true);
    expect(supportsDatabase("worker")).toBe(true);
  });

  it("supportsDatabase returns false for frontend, fullstack, monorepo", () => {
    expect(supportsDatabase("frontend")).toBe(false);
    expect(supportsDatabase("fullstack")).toBe(false);
    expect(supportsDatabase("monorepo")).toBe(false);
  });

  it("maps node to Prisma", () => {
    expect(getOrmForLanguage("node")).toEqual({
      id: "prisma",
      name: "Prisma",
      language: "node",
    });
  });

  it("maps go to GORM", () => {
    expect(getOrmForLanguage("go")).toEqual({
      id: "gorm",
      name: "GORM",
      language: "go",
    });
  });

  it("maps python to SQLAlchemy", () => {
    expect(getOrmForLanguage("python")).toEqual({
      id: "sqlalchemy",
      name: "SQLAlchemy",
      language: "python",
    });
  });

  it("maps rust to Diesel", () => {
    expect(getOrmForLanguage("rust")).toEqual({
      id: "diesel",
      name: "Diesel",
      language: "rust",
    });
  });

  it("maps java to Spring Data JPA", () => {
    expect(getOrmForLanguage("java")).toEqual({
      id: "spring-data-jpa",
      name: "Spring Data JPA",
      language: "java",
    });
  });

  it("maps ruby to Sequel", () => {
    expect(getOrmForLanguage("ruby")).toEqual({
      id: "sequel",
      name: "Sequel",
      language: "ruby",
    });
  });
});

describe("scaffold with database", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it("adds Prisma to node-express template", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "express-db");

    scaffold({
      projectName: "express-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    const schema = fs.readFileSync(
      path.join(targetDir, "prisma", "schema.prisma"),
      "utf-8",
    );
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain("model User");

    const db = fs.readFileSync(
      path.join(targetDir, "src", "lib", "db.js"),
      "utf-8",
    );
    expect(db).toContain("PrismaClient");
    expect(db).toContain("require");

    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"),
    );
    expect(pkg.dependencies["@prisma/client"]).toBeDefined();
    expect(pkg.devDependencies["prisma"]).toBeDefined();
    expect(pkg.scripts["db:migrate"]).toBe("prisma migrate dev");
    expect(pkg.scripts["db:studio"]).toBe("prisma studio");

    const envExample = fs.readFileSync(
      path.join(targetDir, ".env.example"),
      "utf-8",
    );
    expect(envExample).toContain("DATABASE_URL");
  });

  it("adds Prisma with TypeScript to node-nestjs template", () => {
    const template = getTemplate("node-nestjs")!;
    const targetDir = path.join(tempDir, "nestjs-db");

    scaffold({
      projectName: "nestjs-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    const db = fs.readFileSync(
      path.join(targetDir, "src", "lib", "db.ts"),
      "utf-8",
    );
    expect(db).toContain("PrismaClient");
    expect(db).toContain("import");
    expect(db).not.toContain("require");
  });

  it("adds GORM to go-api template", () => {
    const template = getTemplate("go-api")!;
    const targetDir = path.join(tempDir, "go-db");

    scaffold({
      projectName: "go-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    const goMod = fs.readFileSync(path.join(targetDir, "go.mod"), "utf-8");
    expect(goMod).toContain("gorm.io/gorm");
    expect(goMod).toContain("gorm.io/driver/postgres");

    const dbFile = fs.readFileSync(
      path.join(targetDir, "internal", "database", "database.go"),
      "utf-8",
    );
    expect(dbFile).toContain("package database");
    expect(dbFile).toContain("gorm.Open");
    expect(dbFile).toContain("DATABASE_URL");

    const model = fs.readFileSync(
      path.join(targetDir, "internal", "models", "user.go"),
      "utf-8",
    );
    expect(model).toContain("type User struct");

    expect(fs.existsSync(path.join(targetDir, ".env.example"))).toBe(true);
  });

  it("adds SQLAlchemy to python-fastapi template", () => {
    const template = getTemplate("python-fastapi")!;
    const targetDir = path.join(tempDir, "py-db");

    scaffold({
      projectName: "py-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    const reqs = fs.readFileSync(
      path.join(targetDir, "requirements.txt"),
      "utf-8",
    );
    expect(reqs).toContain("sqlalchemy");
    expect(reqs).toContain("psycopg2-binary");
    expect(reqs).toContain("alembic");

    const dbFile = fs.readFileSync(
      path.join(targetDir, "database.py"),
      "utf-8",
    );
    expect(dbFile).toContain("create_engine");
    expect(dbFile).toContain("DATABASE_URL");
    expect(dbFile).toContain("DeclarativeBase");

    const models = fs.readFileSync(
      path.join(targetDir, "models.py"),
      "utf-8",
    );
    expect(models).toContain("class User");
    expect(models).toContain("__tablename__");

    expect(fs.existsSync(path.join(targetDir, ".env.example"))).toBe(true);
  });

  it("adds Diesel to rust-axum template", () => {
    const template = getTemplate("rust-axum")!;
    const targetDir = path.join(tempDir, "rust-db");

    scaffold({
      projectName: "rust-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    const cargo = fs.readFileSync(path.join(targetDir, "Cargo.toml"), "utf-8");
    expect(cargo).toContain("diesel");

    expect(fs.existsSync(path.join(targetDir, "src", "db.rs"))).toBe(true);
  });

  it("adds Spring Data JPA to java-spring template", () => {
    const template = getTemplate("java-spring")!;
    const targetDir = path.join(tempDir, "java-db");

    scaffold({
      projectName: "java-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    const gradle = fs.readFileSync(path.join(targetDir, "build.gradle.kts"), "utf-8");
    expect(gradle).toContain("spring-boot-starter-data-jpa");
    expect(gradle).toContain("postgresql");

    expect(fs.existsSync(
      path.join(targetDir, "src", "main", "java", "com", "theo", "app", "entity", "User.java"),
    )).toBe(true);
    expect(fs.existsSync(
      path.join(targetDir, "src", "main", "java", "com", "theo", "app", "repository", "UserRepository.java"),
    )).toBe(true);
  });

  it("adds Sequel to ruby-sinatra template", () => {
    const template = getTemplate("ruby-sinatra")!;
    const targetDir = path.join(tempDir, "ruby-db");

    scaffold({
      projectName: "ruby-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    const gemfile = fs.readFileSync(path.join(targetDir, "Gemfile"), "utf-8");
    expect(gemfile).toContain("sequel");
    expect(gemfile).toContain("pg");

    expect(fs.existsSync(path.join(targetDir, "database.rb"))).toBe(true);
  });

  it("adds Doctrine to php-slim template", () => {
    const template = getTemplate("php-slim")!;
    const targetDir = path.join(tempDir, "php-db");

    scaffold({
      projectName: "php-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    const composer = fs.readFileSync(path.join(targetDir, "composer.json"), "utf-8");
    expect(composer).toContain("doctrine/dbal");
    expect(fs.existsSync(path.join(targetDir, "src", "database.php"))).toBe(true);
  });

  it("does not add database when database is false", () => {
    const template = getTemplate("node-express")!;
    const targetDir = path.join(tempDir, "no-db");

    scaffold({
      projectName: "no-db",
      template,
      targetDir,
      database: false,
      skipInstall: true,
      skipGit: true,
    });

    expect(fs.existsSync(path.join(targetDir, "prisma"))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, ".env.example"))).toBe(false);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"),
    );
    expect(pkg.dependencies["@prisma/client"]).toBeUndefined();
  });

  it("adds Prisma to node-worker template", () => {
    const template = getTemplate("node-worker")!;
    const targetDir = path.join(tempDir, "worker-db");

    scaffold({
      projectName: "worker-db",
      template,
      targetDir,
      database: true,
      skipInstall: true,
      skipGit: true,
    });

    expect(
      fs.existsSync(path.join(targetDir, "prisma", "schema.prisma")),
    ).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "lib", "db.js"))).toBe(
      true,
    );
  });
});
