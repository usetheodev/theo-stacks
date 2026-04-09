export const packageManagers = ["npm", "pnpm", "yarn", "bun"] as const;
export type PackageManager = (typeof packageManagers)[number];

/**
 * Detects the package manager used to invoke the CLI.
 * Checks npm_config_user_agent first (set by npm/pnpm/yarn/bun),
 * then falls back to Bun runtime detection, then defaults to npm.
 */
export function detectPackageManager(): PackageManager {
  const ua = process.env.npm_config_user_agent;
  if (ua) {
    if (ua.startsWith("pnpm")) return "pnpm";
    if (ua.startsWith("yarn")) return "yarn";
    if (ua.startsWith("bun")) return "bun";
  }
  if (typeof process.versions === "object" && process.versions.bun) {
    return "bun";
  }
  return "npm";
}

export function getInstallCommand(pm: PackageManager): string[] {
  switch (pm) {
    case "npm":
      return ["install", "--no-fund", "--no-audit", "--loglevel=error"];
    case "yarn":
      return ["install", "--no-fund"];
    case "pnpm":
      return ["install"];
    case "bun":
      return ["install"];
  }
}

export function getRunCommand(pm: PackageManager, script: string): string {
  if (pm === "npm") return `npm run ${script}`;
  return `${pm} run ${script}`;
}

export function getExecCommand(pm: PackageManager): string {
  if (pm === "npm") return "npx";
  if (pm === "pnpm") return "pnpm exec";
  if (pm === "yarn") return "yarn";
  return "bunx";
}
