import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

interface TheoHooks {
  postscaffold?: string;
}

export function parseHooks(targetDir: string): TheoHooks {
  const theoPath = path.join(targetDir, "theo.yaml");
  if (!fs.existsSync(theoPath)) return {};

  const content = fs.readFileSync(theoPath, "utf-8");
  // Parse hooks section from YAML without adding a YAML parser dependency
  // Match: hooks:\n  postscaffold: "command" or hooks:\n  postscaffold: command
  const match = content.match(
    /hooks:\s*\n\s+postscaffold:\s*["']?([^"'\n]+?)["']?\s*$/m,
  );
  if (!match) return {};
  return { postscaffold: match[1].trim() };
}

export function runPostScaffoldHook(
  targetDir: string,
  command: string,
  verbose?: boolean,
): void {
  if (verbose) {
    console.error(`  [verbose] Running post-scaffold hook: ${command}`);
  }
  execSync(command, {
    cwd: targetDir,
    stdio: verbose ? "inherit" : "pipe",
    timeout: 60_000,
  });
}
