import fs from "node:fs";
import type { TemplateInfo } from "../templates.js";
import type { StylingOption } from "../styling.js";
import type { AddonId } from "../addons.js";
import { ScaffoldIOError } from "../errors.js";

export const PLACEHOLDER = "{{project-name}}";

export const TEXT_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".json",
  ".yaml",
  ".yml",
  ".md",
  ".txt",
  ".py",
  ".go",
  ".mod",
  ".sum",
  ".toml",
  ".cfg",
  ".ini",
  ".env",
  ".gitignore",
  ".dockerignore",
  ".css",
  ".mjs",
  ".rs",
  ".java",
  ".kt",
  ".kts",
  ".gradle",
  ".rb",
  ".gemspec",
  ".rake",
  ".properties",
  ".xml",
  ".ru",
  ".work",
  ".php",
]);

export interface ScaffoldOptions {
  projectName: string;
  template: TemplateInfo;
  targetDir: string;
  styling?: StylingOption | null;
  database?: boolean;
  addons?: AddonId[];
  skipInstall?: boolean;
  skipGit?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export function verboseLog(verbose: boolean | undefined, msg: string): void {
  if (verbose) {
    console.error(`  [verbose] ${msg}`);
  }
}

export function readPackageJson(pkgPath: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  } catch {
    throw new ScaffoldIOError(pkgPath, "File may be missing or malformed.");
  }
}
