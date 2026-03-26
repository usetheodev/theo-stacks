#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";
import { promptUser } from "./prompts.js";
import { scaffold } from "./scaffold.js";
import { printSuccess } from "./output.js";
import { getTemplate, listTemplateIds } from "./templates.js";
import { getStylingOption, listStylingIds, hasFrontend } from "./styling.js";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      template: { type: "string", short: "t" },
      styling: { type: "string", short: "s" },
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

  const isCI = process.env.CI === "true" || process.env.CI === "1";

  if (isCI && (!nameArg || !templateArg)) {
    console.error(
      "Error: In CI mode, --template and project name are required.",
    );
    console.error(
      "Usage: create-theo my-project --template node-express",
    );
    process.exit(1);
  }

  if (templateArg && !getTemplate(templateArg)) {
    const valid = listTemplateIds().join(", ");
    console.error(`Error: Unknown template "${templateArg}".`);
    console.error(`Available templates: ${valid}`);
    process.exit(1);
  }

  if (stylingArg && !getStylingOption(stylingArg)) {
    const valid = listStylingIds().join(", ");
    console.error(`Error: Unknown styling option "${stylingArg}".`);
    console.error(`Available options: ${valid}`);
    process.exit(1);
  }

  const { projectName, template, styling } = await promptUser(
    nameArg,
    templateArg,
    stylingArg,
  );
  const targetDir = path.resolve(process.cwd(), projectName);

  try {
    scaffold({
      projectName,
      template,
      targetDir,
      styling,
      skipInstall: isCI,
      skipGit: isCI,
    });

    printSuccess(projectName, targetDir, template, styling);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${message}`);
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
  create-theo — Create a new Theo project

  Usage:
    npm create theo@latest [project-name] [options]

  Options:
    -t, --template <id>   Template to use (skip prompt)
    -s, --styling <id>    Styling option for frontend templates (skip prompt)
    -h, --help            Show this help message

  Templates:
    node-express          Express.js API server
    node-fastify          Fastify API server
    node-nextjs           Next.js app (App Router)
    go-api                Go API (standard library)
    python-fastapi        FastAPI + Uvicorn
    monorepo-turbo        Turborepo (Express API + Next.js)
    fullstack-nextjs      Next.js fullstack with API routes
    node-nestjs           NestJS API with modules

  Styling (for frontend templates):
    none                  Plain CSS (default)
    tailwind              Tailwind CSS
    shadcn                Tailwind + shadcn/ui
    daisyui               Tailwind + daisyUI
    chakra                Chakra UI
    mantine               Mantine
    bootstrap             Bootstrap
    bulma                 Bulma

  Examples:
    npm create theo@latest
    npm create theo@latest my-app --template node-express
    npm create theo@latest my-app --template node-nextjs --styling tailwind
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
