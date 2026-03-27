#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";
import chalk from "chalk";
import ora from "ora";
import { promptUser } from "./prompts.js";
import { scaffold, installNodeDeps } from "./scaffold.js";
import { printSuccess } from "./output.js";
import { getTemplate, listTemplateIds } from "./templates.js";
import { getStylingOption, listStylingIds } from "./styling.js";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      template: { type: "string", short: "t" },
      styling: { type: "string", short: "s" },
      database: { type: "boolean", short: "d" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const nameArg = positionals[0] as string | undefined;
  const templateArg = values.template as string | undefined;
  const stylingArg = values.styling as string | undefined;
  const databaseArg = values.database as boolean | undefined;

  const isCI = process.env.CI === "true" || process.env.CI === "1";

  if (isCI && (!nameArg || !templateArg)) {
    console.error(
      chalk.red("Error: In CI mode, --template and project name are required."),
    );
    console.error(
      chalk.dim("Usage: create-theo my-project --template node-express"),
    );
    process.exit(1);
  }

  if (templateArg && !getTemplate(templateArg)) {
    const valid = listTemplateIds().join(", ");
    console.error(chalk.red(`Error: Unknown template "${templateArg}".`));
    console.error(chalk.dim(`Available templates: ${valid}`));
    process.exit(1);
  }

  if (stylingArg && !getStylingOption(stylingArg)) {
    const valid = listStylingIds().join(", ");
    console.error(chalk.red(`Error: Unknown styling option "${stylingArg}".`));
    console.error(chalk.dim(`Available options: ${valid}`));
    process.exit(1);
  }

  const { projectName, template, styling, database } = await promptUser(
    nameArg,
    templateArg,
    stylingArg,
    databaseArg,
    isCI,
  );
  const targetDir = path.resolve(process.cwd(), projectName);

  const spinner = ora({
    text: "Scaffolding project...",
    color: "cyan",
  });

  try {
    if (!isCI) spinner.start();

    scaffold({
      projectName,
      template,
      targetDir,
      styling,
      database,
      skipInstall: true,
      skipGit: isCI,
    });

    if (!isCI) {
      spinner.text = "Installing dependencies...";

      if (template.language === "node") {
        installNodeDeps(targetDir);
      }

      spinner.succeed(chalk.green("Done!"));
    }

    printSuccess(projectName, targetDir, template, styling, database);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!isCI) {
      spinner.fail(chalk.red("Failed"));
    }
    console.error(chalk.red(`\n  ${message}`));
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
  ${chalk.bold("create-theo")} — Scaffold a project and deploy to Kubernetes in minutes.

  ${chalk.bold("Usage:")}
    npm create theo@latest [project-name] [options]

  ${chalk.bold("Options:")}
    -t, --template <id>   Template to use (skip prompt)
    -s, --styling <id>    Styling option for frontend templates
    -d, --database        Add PostgreSQL database with ORM
    -h, --help            Show this help message

  ${chalk.bold("Templates:")}
    ${chalk.cyan("API / Backend:")}
      node-express        Express.js API server
      node-fastify        Fastify API server
      go-api              Go API (standard library)
      python-fastapi      FastAPI + Uvicorn
      node-nestjs         NestJS API with modules
    ${chalk.cyan("Frontend:")}
      node-nextjs         Next.js app (App Router)
    ${chalk.cyan("Fullstack:")}
      fullstack-nextjs    Next.js fullstack with API routes
    ${chalk.cyan("Monorepo:")}
      monorepo-turbo      Turborepo (Express API + Next.js)
    ${chalk.cyan("Worker:")}
      node-worker         Background job processor

  ${chalk.bold("Styling")} (for frontend templates):
    none                  Plain CSS (default)
    tailwind              Tailwind CSS
    shadcn                Tailwind + shadcn/ui
    daisyui               Tailwind + daisyUI
    chakra                Chakra UI
    mantine               Mantine
    bootstrap             Bootstrap
    bulma                 Bulma

  ${chalk.bold("Examples:")}
    ${chalk.dim("$")} npm create theo@latest
    ${chalk.dim("$")} npm create theo@latest my-app --template node-express
    ${chalk.dim("$")} npm create theo@latest my-app -t node-express -d
    ${chalk.dim("$")} npm create theo@latest my-app -t node-nextjs -s tailwind
`);
}

main().catch((err) => {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
