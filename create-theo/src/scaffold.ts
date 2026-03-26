import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import type { TemplateInfo } from "./templates.js";
import type { StylingOption } from "./styling.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLACEHOLDER = "{{project-name}}";
const TEXT_EXTENSIONS = new Set([
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
]);

export interface ScaffoldOptions {
  projectName: string;
  template: TemplateInfo;
  targetDir: string;
  styling?: StylingOption | null;
  skipInstall?: boolean;
  skipGit?: boolean;
}

export function scaffold(options: ScaffoldOptions): void {
  const { projectName, template, targetDir, styling, skipInstall, skipGit } =
    options;

  if (fs.existsSync(targetDir)) {
    const contents = fs.readdirSync(targetDir);
    if (contents.length > 0) {
      throw new Error(
        `Directory "${targetDir}" already exists and is not empty.`,
      );
    }
  }

  const templatesRoot = path.resolve(
    __dirname,
    "..",
    "templates",
    template.id,
  );

  if (!fs.existsSync(templatesRoot)) {
    throw new Error(`Template "${template.id}" not found at ${templatesRoot}`);
  }

  copyDir(templatesRoot, targetDir, projectName);

  if (styling) {
    applyStyling(targetDir, template, styling);
  }

  if (!skipGit) {
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
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      copyDir(srcPath, destPath, projectName);
    } else {
      copyFile(srcPath, destPath, projectName);
    }
  }
}

function copyFile(src: string, dest: string, projectName: string): void {
  const ext = path.extname(src);
  const basename = path.basename(src);

  if (isTextFile(ext, basename)) {
    let content = fs.readFileSync(src, "utf-8");
    content = content.replaceAll(PLACEHOLDER, projectName);
    fs.writeFileSync(dest, content);
  } else {
    fs.copyFileSync(src, dest);
  }
}

function isTextFile(ext: string, basename: string): boolean {
  return (
    TEXT_EXTENSIONS.has(ext) ||
    TEXT_EXTENSIONS.has("." + basename) ||
    basename === "Dockerfile" ||
    basename === "Procfile" ||
    basename === "Makefile"
  );
}

function initGit(dir: string): void {
  try {
    execSync("git init", { cwd: dir, stdio: "ignore" });
  } catch {
    // git not available — not critical
  }
}

function installNodeDeps(dir: string): void {
  const packageManager = detectPackageManager(dir);
  try {
    execSync(`${packageManager} install`, { cwd: dir, stdio: "inherit" });
  } catch {
    console.warn(
      `\nWarning: Failed to install dependencies. Run "${packageManager} install" manually.\n`,
    );
  }
}

function detectPackageManager(dir: string): string {
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

// --- Styling Layer ---

function applyStyling(
  targetDir: string,
  template: TemplateInfo,
  styling: StylingOption,
): void {
  const pkgDirs = getPackageJsonDirs(targetDir, template);

  for (const pkgDir of pkgDirs) {
    addDependencies(pkgDir, styling);
  }

  const appDirs = getAppDirs(targetDir, template);

  for (const appDir of appDirs) {
    writeStylingConfig(appDir, styling);
    writeGlobalsCss(appDir, styling);
    updateLayout(appDir, styling);
  }
}

function getPackageJsonDirs(
  targetDir: string,
  template: TemplateInfo,
): string[] {
  if (template.id === "monorepo-turbo") {
    const webDir = path.join(targetDir, "apps", "web");
    if (fs.existsSync(path.join(webDir, "package.json"))) {
      return [webDir];
    }
    return [];
  }
  return [targetDir];
}

function getAppDirs(targetDir: string, template: TemplateInfo): string[] {
  if (template.id === "monorepo-turbo") {
    const webDir = path.join(targetDir, "apps", "web");
    if (fs.existsSync(webDir)) {
      return [webDir];
    }
    return [];
  }
  return [targetDir];
}

function addDependencies(pkgDir: string, styling: StylingOption): void {
  const pkgPath = path.join(pkgDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  if (Object.keys(styling.dependencies).length > 0) {
    pkg.dependencies = { ...pkg.dependencies, ...styling.dependencies };
  }

  if (Object.keys(styling.devDependencies).length > 0) {
    pkg.devDependencies = {
      ...pkg.devDependencies,
      ...styling.devDependencies,
    };
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function writeStylingConfig(appDir: string, styling: StylingOption): void {
  const needsTailwind = ["tailwind", "shadcn", "daisyui"].includes(styling.id);
  const needsPostcss =
    needsTailwind || ["mantine"].includes(styling.id);

  if (needsTailwind) {
    writeTailwindConfig(appDir, styling);
  }

  if (needsPostcss) {
    writePostcssConfig(appDir, styling);
  }

  if (styling.id === "mantine") {
    writePostcssConfig(appDir, styling);
  }
}

function writeTailwindConfig(appDir: string, styling: StylingOption): void {
  let plugins = "";
  let extendBlock = "";

  if (styling.id === "daisyui") {
    plugins = `\n  plugins: [require("daisyui")],`;
  }

  if (styling.id === "shadcn") {
    plugins = `\n  plugins: [require("tailwindcss-animate")],`;
    extendBlock = `
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },`;
  }

  const themeBlock = extendBlock
    ? `\n  theme: {${extendBlock}\n  },`
    : "";

  const config = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],${themeBlock}${plugins}
};
`;

  fs.writeFileSync(path.join(appDir, "tailwind.config.js"), config);
}

function writePostcssConfig(appDir: string, styling: StylingOption): void {
  let config: string;

  if (styling.id === "mantine") {
    config = `module.exports = {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};
`;
  } else {
    config = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
  }

  fs.writeFileSync(path.join(appDir, "postcss.config.js"), config);
}

function writeGlobalsCss(appDir: string, styling: StylingOption): void {
  const cssDir = path.join(appDir, "src", "app");
  fs.mkdirSync(cssDir, { recursive: true });
  const cssPath = path.join(cssDir, "globals.css");

  let css: string;

  switch (styling.id) {
    case "tailwind":
      css = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
      break;

    case "shadcn":
      css = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    border-color: hsl(var(--border));
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
`;
      break;

    case "daisyui":
      css = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
      break;

    case "chakra":
      css = `/* Chakra UI handles styling via its theme provider */
`;
      break;

    case "mantine":
      css = `@import "@mantine/core/styles.css";
`;
      break;

    case "bootstrap":
      css = `@import "bootstrap/dist/css/bootstrap.min.css";
`;
      break;

    case "bulma":
      css = `@import "bulma/css/bulma.min.css";
`;
      break;

    default:
      return;
  }

  fs.writeFileSync(cssPath, css);
}

function updateLayout(appDir: string, styling: StylingOption): void {
  const layoutPath = path.join(appDir, "src", "app", "layout.js");

  if (!fs.existsSync(layoutPath)) return;

  const content = fs.readFileSync(layoutPath, "utf-8");

  let updated: string;

  if (styling.id === "chakra") {
    updated = buildChakraLayout(content);
  } else if (styling.id === "mantine") {
    updated = buildMantineLayout(content);
  } else {
    updated = addGlobalsCssImport(content);
  }

  fs.writeFileSync(layoutPath, updated);
}

function addGlobalsCssImport(content: string): string {
  if (content.includes("globals.css")) return content;
  return `import "./globals.css";\n\n${content}`;
}

function buildChakraLayout(content: string): string {
  const metadataMatch = content.match(
    /export const metadata\s*=\s*\{[^}]+\};?/s,
  );
  const metadataBlock = metadataMatch
    ? metadataMatch[0]
    : 'export const metadata = { title: "App", description: "Deployed with Theo" };';

  return `"use client";

import { ChakraProvider } from "@chakra-ui/react";

${metadataBlock}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider>{children}</ChakraProvider>
      </body>
    </html>
  );
}
`;
}

function buildMantineLayout(content: string): string {
  const metadataMatch = content.match(
    /export const metadata\s*=\s*\{[^}]+\};?/s,
  );
  const metadataBlock = metadataMatch
    ? metadataMatch[0]
    : 'export const metadata = { title: "App", description: "Deployed with Theo" };';

  return `import "@mantine/core/styles.css";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";

${metadataBlock}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>{children}</MantineProvider>
      </body>
    </html>
  );
}
`;
}
