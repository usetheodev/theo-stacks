#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import chalk from "chalk";
import ora from "ora";
import { confirm } from "@inquirer/prompts";
import { promptUser } from "./prompts.js";
import { scaffold, installNodeDeps, dryRunScaffold, scaffoldExternal } from "./scaffold.js";
import { printSuccess, printDryRun } from "./output.js";
import { getTemplate, listTemplateIds } from "./templates.js";
import { getStylingOption, listStylingIds } from "./styling.js";
import { listAddonIds } from "./addons.js";
import { detectPackageManager } from "./packageManager.js";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      template: { type: "string", short: "t" },
      styling: { type: "string", short: "s" },
      database: { type: "boolean", short: "d" },
      add: { type: "string", short: "a" },
      "dry-run": { type: "boolean" },
      verbose: { type: "boolean", short: "v" },
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
  const addArg = values.add as string | undefined;

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

  const isExternalTemplate = templateArg?.includes("/") ?? false;

  if (templateArg && !isExternalTemplate && !getTemplate(templateArg)) {
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

  if (addArg) {
    const validAddons = listAddonIds();
    for (const id of addArg.split(",")) {
      if (!validAddons.includes(id.trim())) {
        console.error(chalk.red(`Error: Unknown addon "${id.trim()}".`));
        console.error(chalk.dim(`Available addons: ${validAddons.join(", ")}`));
        process.exit(1);
      }
    }
  }

  const dryRun = values["dry-run"] as boolean | undefined;
  const verbose = values.verbose as boolean | undefined;
  const pm = detectPackageManager();

  // Handle external GitHub templates (user/repo or user/repo#branch)
  if (isExternalTemplate && templateArg) {
    const projectName = nameArg || "my-theo-app";
    const targetDir = path.resolve(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
      const contents = fs.readdirSync(targetDir);
      if (contents.length > 0) {
        if (isCI) {
          console.error(chalk.red(`Error: Directory "${projectName}" already exists and is not empty.`));
          process.exit(1);
        }
        const overwrite = await confirm({
          message: `Directory "${projectName}" already exists and is not empty. Overwrite?`,
          default: false,
        });
        if (!overwrite) {
          console.log(chalk.dim("  Aborted."));
          process.exit(0);
        }
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    }

    const spinner = ora({ text: `Cloning ${templateArg}...`, color: "cyan" });
    if (!isCI) spinner.start();

    try {
      await scaffoldExternal(templateArg, targetDir, projectName, verbose);
      if (!isCI) spinner.succeed(chalk.green("Done!"));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!isCI) spinner.fail(chalk.red("Failed"));
      console.error(chalk.red(`\n  ${message}`));
      process.exit(1);
    }

    console.log();
    console.log(
      chalk.green("  Created ") +
        chalk.bold(projectName) +
        chalk.green(" from ") +
        chalk.cyan(templateArg),
    );
    console.log();
    console.log(chalk.bold("  Get started:"));
    console.log(chalk.cyan(`    cd ${projectName}`));
    console.log();
    return;
  }

  const { projectName, template, styling, database, addons } = await promptUser(
    nameArg,
    templateArg,
    stylingArg,
    databaseArg,
    addArg,
    isCI,
  );
  const targetDir = path.resolve(process.cwd(), projectName);

  // Check if target directory exists and is not empty
  if (fs.existsSync(targetDir)) {
    const contents = fs.readdirSync(targetDir);
    if (contents.length > 0) {
      if (isCI) {
        console.error(chalk.red(`Error: Directory "${projectName}" already exists and is not empty.`));
        process.exit(1);
      }
      const overwrite = await confirm({
        message: `Directory "${projectName}" already exists and is not empty. Overwrite?`,
        default: false,
      });
      if (!overwrite) {
        console.log(chalk.dim("  Aborted."));
        process.exit(0);
      }
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }

  if (dryRun) {
    const files = dryRunScaffold({
      projectName,
      template,
      targetDir,
      styling,
      database,
      addons,
    });
    printDryRun(projectName, files, template, styling, database, addons);
    return;
  }

  const spinner = ora({
    text: "Scaffolding project...",
    color: "cyan",
  });

  const warnings: string[] = [];

  try {
    if (!isCI) spinner.start();

    scaffold({
      projectName,
      template,
      targetDir,
      styling,
      database,
      addons,
      skipInstall: true,
      skipGit: isCI,
      verbose,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!isCI) {
      spinner.fail(chalk.red("Failed"));
    }
    console.error(chalk.red(`\n  ${message}`));
    process.exit(1);
  }

  // Post-scaffold steps are non-fatal — the project files are already created
  if (!isCI && template.language === "node") {
    spinner.text = "Installing dependencies...";
    try {
      installNodeDeps(targetDir, pm);
    } catch {
      warnings.push(`Could not install dependencies. Run "${pm} install" manually.`);
    }
  }

  if (!isCI) {
    spinner.succeed(chalk.green("Done!"));
  }

  for (const w of warnings) {
    console.log(chalk.yellow(`  ⚠ ${w}`));
  }

  printSuccess(projectName, targetDir, template, styling, database, addons, pm);
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
    -a, --add <ids>       Comma-separated addons (redis,auth-jwt,auth-oauth,queue)
    --dry-run             Preview what would be created without writing files
    -v, --verbose         Show detailed output during scaffolding
    -h, --help            Show this help message

  ${chalk.bold("Templates:")}
    ${chalk.cyan("API / Backend:")}
      node-express        Express.js API server
      node-fastify        Fastify API server
      go-api              Go API (standard library)
      python-fastapi      FastAPI + Uvicorn
      node-nestjs         NestJS API with modules
      rust-axum           Rust Axum API server
      java-spring         Java Spring Boot API
      ruby-sinatra        Ruby Sinatra API
      php-slim            PHP Slim Framework API
    ${chalk.cyan("Frontend:")}
      node-nextjs         Next.js app (App Router)
    ${chalk.cyan("Fullstack:")}
      fullstack-nextjs    Next.js fullstack with API routes
    ${chalk.cyan("Monorepo:")}
      monorepo-turbo      Turborepo (Express API + Next.js)
      monorepo-go         Go Workspaces (API + Worker)
      monorepo-python     Python uv workspace (API + Worker)
      monorepo-rust       Cargo workspace (Axum API + Worker)
      monorepo-java       Gradle multi-project (Spring + Worker)
      monorepo-ruby       Bundler multi-app (Sinatra + Worker)
      monorepo-php        Composer multi-app (Slim + Worker)
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

  ${chalk.bold("External templates:")}
    -t user/repo            Clone a GitHub repository as template
    -t user/repo#branch     Clone a specific branch

  ${chalk.bold("Examples:")}
    ${chalk.dim("$")} npm create theo@latest
    ${chalk.dim("$")} npm create theo@latest my-app --template node-express
    ${chalk.dim("$")} npm create theo@latest my-app -t node-express -d
    ${chalk.dim("$")} npm create theo@latest my-app -t node-nextjs -s tailwind
    ${chalk.dim("$")} npm create theo@latest my-app -t user/repo
`);
}

main().catch((err) => {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
