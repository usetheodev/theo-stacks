import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import degit from "degit";
import type { TemplateInfo } from "../templates.js";
import { getInstallCommand, type PackageManager } from "../packageManager.js";
import { TemplateNotFoundError, DependencyInstallError } from "../errors.js";
import { PLACEHOLDER, TEXT_EXTENSIONS, verboseLog, type ScaffoldOptions } from "./types.js";
import { applyStyling } from "./styling.js";
import { applyDatabase } from "./database.js";
import { applyRedis } from "./redis.js";
import { applyAuth, applyAuthOAuth } from "./auth.js";
import { applyQueue } from "./queue.js";
import { writeInfraFiles } from "./infrastructure.js";
import { writeCI } from "./ci.js";
import { writeLLMInstructions } from "./llm-instructions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function scaffold(options: ScaffoldOptions): void {
  const {
    projectName,
    template,
    targetDir,
    styling,
    database,
    addons = [],
    skipInstall,
    skipGit,
    verbose,
  } = options;

  const templatesRoot = path.resolve(
    __dirname,
    "..",
    "..",
    "templates",
    template.id,
  );

  if (!fs.existsSync(templatesRoot)) {
    throw new TemplateNotFoundError(template.id, templatesRoot);
  }

  verboseLog(verbose, `Copying template ${template.id} from ${templatesRoot}`);
  copyDir(templatesRoot, targetDir, projectName);

  if (styling) {
    verboseLog(verbose, `Applying styling: ${styling.name}`);
    applyStyling(targetDir, template, styling);
  }

  if (database) {
    verboseLog(verbose, `Applying database layer: ${template.language}`);
    applyDatabase(targetDir, template);
  }

  if (addons.includes("redis")) {
    verboseLog(verbose, "Applying addon: redis");
    applyRedis(targetDir, template);
  }
  if (addons.includes("auth-jwt")) {
    verboseLog(verbose, "Applying addon: auth-jwt");
    applyAuth(targetDir, template);
  }
  if (addons.includes("auth-oauth")) {
    verboseLog(verbose, "Applying addon: auth-oauth");
    applyAuthOAuth(targetDir, template);
  }
  if (addons.includes("queue")) {
    verboseLog(verbose, "Applying addon: queue");
    applyQueue(targetDir, template);
  }

  // Write combined docker-compose and env files
  const needsRedis = addons.includes("redis") || addons.includes("queue");
  const hasAuthJwt = addons.includes("auth-jwt");
  const hasAuthOAuth = addons.includes("auth-oauth");
  if (database || needsRedis || hasAuthJwt || hasAuthOAuth) {
    verboseLog(verbose, "Writing infrastructure files (docker-compose, .env)");
    writeInfraFiles(targetDir, !!database, needsRedis, hasAuthJwt, hasAuthOAuth);
  }

  verboseLog(verbose, "Writing CI workflow");
  writeCI(targetDir, template);

  verboseLog(verbose, "Writing LLM instructions (CLAUDE.md)");
  writeLLMInstructions(targetDir, template, { styling, database, addons });

  if (!skipGit) {
    verboseLog(verbose, "Initializing git repository");
    initGit(targetDir);
  }

  if (!skipInstall && template.language === "node") {
    installNodeDeps(targetDir);
  }
}

function copyDir(src: string, dest: string, projectName: string): void {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "package-lock.json") continue;
      const destPath = path.join(dest, entry.name);
      copyDir(srcPath, destPath, projectName);
    } else {
      const destName =
        entry.name === "gitignore"
          ? ".gitignore"
          : entry.name === "dockerignore"
            ? ".dockerignore"
            : entry.name;
      const destPath = path.join(dest, destName);
      copyFile(srcPath, destPath, projectName);
    }
  }
}

function copyFile(src: string, dest: string, projectName: string): void {
  const ext = path.extname(dest);
  const basename = path.basename(dest);

  if (isTextFile(ext, basename)) {
    const content = fs.readFileSync(src, "utf-8");
    fs.writeFileSync(dest, content.replaceAll(PLACEHOLDER, projectName));
  } else {
    fs.copyFileSync(src, dest);
  }
}

function isTextFile(ext: string, basename: string): boolean {
  return (
    TEXT_EXTENSIONS.has(ext) ||
    TEXT_EXTENSIONS.has("." + basename) ||
    basename === "gitignore" ||
    basename === ".prettierrc" ||
    basename === "Dockerfile" ||
    basename === "Procfile" ||
    basename === "Makefile" ||
    basename === "Gemfile" ||
    basename === ".rubocop.yml" ||
    basename === "Rakefile" ||
    basename === "Procfile" ||
    basename === "dockerignore"
  );
}

export async function scaffoldExternal(
  repo: string,
  targetDir: string,
  projectName: string,
  verbose?: boolean,
): Promise<void> {
  verboseLog(verbose, `Cloning external template from ${repo}`);
  const emitter = degit(repo, { verbose: !!verbose });
  if (verbose) {
    emitter.on("info", (info: { message: string }) => {
      console.error(`  [degit] ${info.message}`);
    });
  }
  await emitter.clone(targetDir);

  // Rename dotfiles (gitignore → .gitignore, dockerignore → .dockerignore)
  for (const name of ["gitignore", "dockerignore"]) {
    const src = path.join(targetDir, name);
    const dest = path.join(targetDir, `.${name}`);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.renameSync(src, dest);
    }
  }

  // Replace placeholder in package.json if it exists
  const pkgPath = path.join(targetDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    pkg.name = projectName;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // Replace placeholder in theo.yaml if it exists
  const theoPath = path.join(targetDir, "theo.yaml");
  if (fs.existsSync(theoPath)) {
    const content = fs.readFileSync(theoPath, "utf-8");
    fs.writeFileSync(theoPath, content.replaceAll(PLACEHOLDER, projectName));
  }

  verboseLog(verbose, "External template scaffolded successfully");
}

export function dryRunScaffold(options: ScaffoldOptions): string[] {
  const { template, styling, database, addons = [] } = options;

  const templatesRoot = path.resolve(__dirname, "..", "..", "templates", template.id);
  if (!fs.existsSync(templatesRoot)) {
    throw new TemplateNotFoundError(template.id, templatesRoot);
  }

  const files = collectFiles(templatesRoot, "");

  if (styling) files.push("(styling files)");
  if (database) files.push("prisma/schema.prisma", "src/lib/db.js", ".env", ".env.example", "docker-compose.yml");
  if (addons.includes("redis")) files.push("src/lib/redis.js");
  if (addons.includes("auth-jwt")) files.push("src/middleware/auth.js");
  if (addons.includes("auth-oauth")) files.push("src/middleware/oauth.js");
  if (addons.includes("queue")) files.push("src/lib/queue.js");
  files.push(".github/workflows/ci.yml");
  files.push("CLAUDE.md");

  return files.sort();
}

function collectFiles(dir: string, prefix: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "package-lock.json") continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(dir, entry.name), rel));
    } else {
      const name =
        entry.name === "gitignore" ? ".gitignore" :
        entry.name === "dockerignore" ? ".dockerignore" :
        entry.name;
      files.push(prefix ? `${prefix}/${name}` : name);
    }
  }
  return files;
}

function initGit(dir: string): void {
  try {
    execSync("git init", { cwd: dir, stdio: "ignore" });
  } catch {
    // git not available — not critical
  }
}

export function installNodeDeps(dir: string, pm: PackageManager = "npm"): void {
  const args = getInstallCommand(pm);
  const cmd = `${pm} ${args.join(" ")}`;
  try {
    execSync(cmd, {
      cwd: dir,
      stdio: "pipe",
      env: {
        ...process.env,
        ADBLOCK: "1",
        DISABLE_OPENCOLLECTIVE: "1",
        NODE_ENV: "development",
      },
    });
  } catch {
    throw new DependencyInstallError(pm);
  }
}
