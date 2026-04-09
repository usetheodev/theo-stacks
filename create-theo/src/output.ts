import chalk from "chalk";
import type { TemplateInfo } from "./templates.js";
import type { StylingOption } from "./styling.js";
import type { AddonId } from "./addons.js";
import { getOrmForLanguage } from "./database.js";
import type { Language } from "./database.js";
import type { PackageManager } from "./packageManager.js";

const ADDON_LABELS: Record<AddonId, string> = {
  redis: "Redis",
  "auth-jwt": "Auth (JWT)",
  "auth-oauth": "Auth (OAuth/OIDC)",
  queue: "Queue",
};

export function printSuccess(
  projectName: string,
  _targetDir: string,
  template: TemplateInfo,
  styling?: StylingOption | null,
  database?: boolean,
  addons?: AddonId[],
  pm: PackageManager = "npm",
): void {
  console.log();
  console.log(
    chalk.green("  Created ") +
      chalk.bold(projectName) +
      chalk.green(" in ") +
      chalk.dim(`./${projectName}`),
  );

  if (styling) {
    console.log(chalk.dim(`  Styling: ${styling.name}`));
  }

  if (database) {
    const orm = getOrmForLanguage(template.language as Language);
    console.log(chalk.dim(`  Database: PostgreSQL (${orm.name})`));
  }

  if (addons && addons.length > 0) {
    console.log(
      chalk.dim(`  Modules: ${addons.map((a) => ADDON_LABELS[a]).join(", ")}`),
    );
  }

  console.log();
  console.log(chalk.bold("  Get started:"));
  console.log(chalk.cyan(`    cd ${projectName}`));
  console.log();

  const devInstr = getDevInstructions(template, database, pm);
  if (devInstr) {
    console.log(chalk.bold("  Local development:"));
    for (const line of devInstr) {
      console.log(chalk.dim(`    ${line}`));
    }
    console.log();
  }

  console.log(chalk.bold("  Deploy:"));
  console.log(
    chalk.cyan("    theo deploy") + chalk.dim("           # deploy with Theo (https://usetheo.dev)"),
  );
  console.log(
    chalk.dim("    docker build .") + chalk.dim("        # or use Docker, Railway, Fly.io, etc."),
  );
  console.log();

  if (database) {
    const dbInstructions = getDatabaseInstructions(template, pm);
    if (dbInstructions) {
      console.log(chalk.bold("  Database setup:"));
      for (const line of dbInstructions) {
        console.log(chalk.dim(`    ${line}`));
      }
      console.log();
    }
  }
}

export function printDryRun(
  projectName: string,
  files: string[],
  template: TemplateInfo,
  styling?: StylingOption | null,
  database?: boolean,
  addons?: AddonId[],
): void {
  console.log();
  console.log(chalk.bold("  Dry run — no files will be created"));
  console.log();
  console.log(chalk.dim(`  Project:  `) + chalk.bold(projectName));
  console.log(chalk.dim(`  Template: `) + chalk.cyan(template.name));

  if (styling) {
    console.log(chalk.dim(`  Styling:  `) + styling.name);
  }
  if (database) {
    const orm = getOrmForLanguage(template.language as Language);
    console.log(chalk.dim(`  Database: `) + `PostgreSQL (${orm.name})`);
  }
  if (addons && addons.length > 0) {
    console.log(
      chalk.dim(`  Modules:  `) + addons.map((a) => ADDON_LABELS[a]).join(", "),
    );
  }

  console.log();
  console.log(chalk.bold(`  Files that would be created in ./${projectName}/`));
  console.log();
  for (const file of files) {
    console.log(chalk.dim(`    ${file}`));
  }
  console.log();
  console.log(chalk.dim(`  Total: ${files.length} files`));
  console.log();
}

function getDevInstructions(
  template: TemplateInfo,
  database?: boolean,
  pm: PackageManager = "npm",
): string[] | null {
  switch (template.language) {
    case "node":
      return [`${pm} install`, `${pm} run dev`];
    case "go": {
      const lines = [];
      if (database) {
        lines.push("go mod tidy");
      }
      lines.push("go run .");
      return lines;
    }
    case "python":
      return [
        "pip install -r requirements.txt",
        "uvicorn main:app --reload --port 8000",
      ];
    case "rust":
      return ["cargo run"];
    case "java":
      return ["./gradlew bootRun"];
    case "ruby":
      return ["bundle install", "bundle exec rackup"];
    case "php":
      return ["composer install", "composer start"];
    default:
      return null;
  }
}

function getDatabaseInstructions(template: TemplateInfo, pm: PackageManager = "npm"): string[] | null {
  const dockerLine = "docker compose up -d    # start Postgres";
  switch (template.language) {
    case "node":
      return [
        dockerLine,
        `${pm} run db:migrate        # run migrations`,
        `${pm} run db:studio         # open Prisma Studio`,
      ];
    case "go":
      return [
        dockerLine,
      ];
    case "python":
      return [
        dockerLine,
        "alembic init alembic      # initialize Alembic migrations",
      ];
    case "rust":
      return [
        dockerLine,
        "diesel setup              # run Diesel migrations",
      ];
    case "java":
      return [
        dockerLine,
        "# JPA auto-creates tables via ddl-auto: update",
      ];
    case "ruby":
      return [
        dockerLine,
        "# Sequel auto-creates tables on first run",
      ];
    case "php":
      return [
        dockerLine,
        "# Doctrine auto-connects on first request",
      ];
    default:
      return null;
  }
}
