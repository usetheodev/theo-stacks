import chalk from "chalk";
import type { TemplateInfo } from "./templates.js";
import type { StylingOption } from "./styling.js";
import { getOrmForLanguage } from "./database.js";

export function printSuccess(
  projectName: string,
  _targetDir: string,
  template: TemplateInfo,
  styling?: StylingOption | null,
  database?: boolean,
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
    const orm = getOrmForLanguage(template.language);
    console.log(chalk.dim(`  Database: PostgreSQL (${orm.name})`));
  }

  console.log();
  console.log(chalk.bold("  Next steps:"));
  console.log(chalk.cyan(`    cd ${projectName}`));
  console.log(
    chalk.cyan("    theo login") + chalk.dim("        # authenticate (first time only)"),
  );
  console.log(
    chalk.cyan("    theo deploy") + chalk.dim("       # deploy to production"),
  );
  console.log();

  const devInstructions = getDevInstructions(template, database);
  if (devInstructions) {
    console.log(chalk.bold("  Local development:"));
    for (const line of devInstructions) {
      console.log(chalk.dim(`    ${line}`));
    }
    console.log();
  }

  if (database) {
    const dbInstructions = getDatabaseInstructions(template);
    if (dbInstructions) {
      console.log(chalk.bold("  Database setup:"));
      for (const line of dbInstructions) {
        console.log(chalk.dim(`    ${line}`));
      }
      console.log();
    }
  }
}

function getDevInstructions(
  template: TemplateInfo,
  database?: boolean,
): string[] | null {
  switch (template.language) {
    case "node":
      return ["npm install", "npm run dev"];
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
    default:
      return null;
  }
}

function getDatabaseInstructions(template: TemplateInfo): string[] | null {
  switch (template.language) {
    case "node":
      return [
        "cp .env.example .env      # configure DATABASE_URL",
        "npm run db:migrate        # run migrations",
        "npm run db:studio         # open Prisma Studio",
      ];
    case "go":
      return [
        "cp .env.example .env      # configure DATABASE_URL",
      ];
    case "python":
      return [
        "cp .env.example .env      # configure DATABASE_URL",
        "alembic init alembic      # initialize Alembic migrations",
      ];
    default:
      return null;
  }
}
