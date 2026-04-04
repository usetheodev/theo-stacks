import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import type { TemplateInfo } from "./templates.js";
import type { StylingOption } from "./styling.js";
import type { AddonId } from "./addons.js";

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
}

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
  } = options;

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

  if (database) {
    applyDatabase(targetDir, template);
  }

  if (addons.includes("redis")) {
    applyRedis(targetDir, template);
  }
  if (addons.includes("auth-jwt")) {
    applyAuth(targetDir, template);
  }
  if (addons.includes("auth-oauth")) {
    applyAuthOAuth(targetDir, template);
  }
  if (addons.includes("queue")) {
    applyQueue(targetDir, template);
  }

  // Write combined docker-compose and env files
  const needsRedis = addons.includes("redis") || addons.includes("queue");
  const hasAuthJwt = addons.includes("auth-jwt");
  const hasAuthOAuth = addons.includes("auth-oauth");
  if (database || needsRedis || hasAuthJwt || hasAuthOAuth) {
    writeInfraFiles(targetDir, !!database, needsRedis, hasAuthJwt, hasAuthOAuth);
  }

  writeCI(targetDir, template);

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

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
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

function initGit(dir: string): void {
  try {
    execSync("git init", { cwd: dir, stdio: "ignore" });
  } catch {
    // git not available — not critical
  }
}

export function installNodeDeps(dir: string): void {
  const packageManager = detectPackageManager(dir);
  try {
    execSync(`${packageManager} install`, { cwd: dir, stdio: "pipe" });
  } catch {
    throw new Error(
      `Failed to install dependencies. Run "${packageManager} install" manually.`,
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
    updatePage(appDir, template, styling);
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

function readPackageJson(pkgPath: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  } catch {
    throw new Error(
      `Failed to read package.json at ${pkgPath}. File may be missing or malformed.`,
    );
  }
}

function addDependencies(pkgDir: string, styling: StylingOption): void {
  const pkgPath = path.join(pkgDir, "package.json");
  const pkg = readPackageJson(pkgPath);

  if (Object.keys(styling.dependencies).length > 0) {
    pkg.dependencies = {
      ...(pkg.dependencies as Record<string, string>),
      ...styling.dependencies,
    };
  }

  if (Object.keys(styling.devDependencies).length > 0) {
    pkg.devDependencies = {
      ...(pkg.devDependencies as Record<string, string>),
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
    writeChakraProviders(appDir);
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

  return `import { ChakraProviders } from "./providers";

${metadataBlock}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ChakraProviders>{children}</ChakraProviders>
      </body>
    </html>
  );
}
`;
}

function writeChakraProviders(appDir: string): void {
  fs.writeFileSync(
    path.join(appDir, "src", "app", "providers.js"),
    `"use client";

import { ChakraProvider } from "@chakra-ui/react";

export function ChakraProviders({ children }) {
  return <ChakraProvider>{children}</ChakraProvider>;
}
`,
  );
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

// --- Page Rewrite per Styling ---

function updatePage(
  appDir: string,
  template: TemplateInfo,
  styling: StylingOption,
): void {
  const pagePath = path.join(appDir, "src", "app", "page.js");
  if (!fs.existsSync(pagePath)) return;

  const isFullstack = template.id === "fullstack-nextjs";
  const page = buildStyledPage(styling, isFullstack);
  if (page) {
    fs.writeFileSync(pagePath, page);
  }
}

function buildStyledPage(
  styling: StylingOption,
  isFullstack: boolean,
): string | null {
  const itemsBlock = isFullstack
    ? `
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data.items));
  }, []);`
    : "";

  const itemsList = isFullstack
    ? buildItemsList(styling)
    : "";

  switch (styling.id) {
    case "tailwind":
    case "shadcn":
    case "daisyui":
      return buildTailwindPage(isFullstack, itemsBlock, itemsList, styling.id);
    case "chakra":
      return buildChakraPage(isFullstack, itemsBlock, itemsList);
    case "mantine":
      return buildMantinePage(isFullstack, itemsBlock, itemsList);
    case "bootstrap":
      return buildBootstrapPage(isFullstack, itemsBlock, itemsList);
    case "bulma":
      return buildBulmaPage(isFullstack, itemsBlock, itemsList);
    default:
      return null;
  }
}

function buildItemsList(styling: StylingOption): string {
  switch (styling.id) {
    case "tailwind":
    case "shadcn":
    case "daisyui":
      return `
        <h2 className="text-xl font-semibold mt-6 mb-2">Items</h2>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item) => (
            <li key={item.id} className="text-gray-700">{item.name}</li>
          ))}
        </ul>`;
    case "chakra":
      return `
        <Heading size="md" mt={6} mb={2}>Items</Heading>
        <UnorderedList spacing={1}>
          {items.map((item) => (
            <ListItem key={item.id}>{item.name}</ListItem>
          ))}
        </UnorderedList>`;
    case "mantine":
      return `
        <Title order={2} mt="lg" mb="sm">Items</Title>
        <List spacing="xs">
          {items.map((item) => (
            <List.Item key={item.id}>{item.name}</List.Item>
          ))}
        </List>`;
    case "bootstrap":
      return `
        <h2 className="h4 mt-4 mb-2">Items</h2>
        <ul className="list-group">
          {items.map((item) => (
            <li key={item.id} className="list-group-item">{item.name}</li>
          ))}
        </ul>`;
    case "bulma":
      return `
        <h2 className="title is-4 mt-4">Items</h2>
        <div className="content">
          <ul>
            {items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </div>`;
    default:
      return "";
  }
}

function buildTailwindPage(
  isFullstack: boolean,
  itemsBlock: string,
  itemsList: string,
  variant: string,
): string {
  const useClient = isFullstack ? `"use client";\n\nimport { useEffect, useState } from "react";\n\n` : "";

  let badgeClass = "inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded";
  if (variant === "daisyui") {
    badgeClass = "badge badge-primary";
  }

  return `${useClient}export default function Home() {${itemsBlock}
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Deployed with Theo
        </h1>
        <p className="text-gray-600 mb-6">
          Edit <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">src/app/page.js</code> to get started.
        </p>
        <span className="${badgeClass}">
          ${variant === "daisyui" ? "daisyUI" : variant === "shadcn" ? "shadcn/ui" : "Tailwind CSS"}
        </span>${itemsList}
      </div>
    </main>
  );
}
`;
}

function buildChakraPage(
  isFullstack: boolean,
  itemsBlock: string,
  itemsList: string,
): string {
  const imports = isFullstack
    ? `import { useEffect, useState } from "react";
import { Box, Heading, Text, Code, Badge, VStack, UnorderedList, ListItem } from "@chakra-ui/react";`
    : `import { Box, Heading, Text, Code, Badge, VStack } from "@chakra-ui/react";`;

  return `"use client";

${imports}

export default function Home() {${itemsBlock}
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50" p={8}>
      <VStack spacing={4} textAlign="center" maxW="md">
        <Heading size="xl" color="gray.900">
          Deployed with Theo
        </Heading>
        <Text color="gray.600">
          Edit <Code>src/app/page.js</Code> to get started.
        </Text>
        <Badge colorScheme="blue">Chakra UI</Badge>${itemsList}
      </VStack>
    </Box>
  );
}
`;
}

function buildMantinePage(
  isFullstack: boolean,
  itemsBlock: string,
  itemsList: string,
): string {
  const imports = isFullstack
    ? `import { useEffect, useState } from "react";
import { Container, Title, Text, Code, Badge, Stack, List } from "@mantine/core";`
    : `import { Container, Title, Text, Code, Badge, Stack } from "@mantine/core";`;

  return `"use client";

${imports}

export default function Home() {${itemsBlock}
  return (
    <Container size="sm" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Stack align="center" gap="md">
        <Title order={1}>Deployed with Theo</Title>
        <Text c="dimmed">
          Edit <Code>src/app/page.js</Code> to get started.
        </Text>
        <Badge variant="light" color="blue">Mantine</Badge>${itemsList}
      </Stack>
    </Container>
  );
}
`;
}

function buildBootstrapPage(
  isFullstack: boolean,
  itemsBlock: string,
  itemsList: string,
): string {
  const useClient = isFullstack ? `"use client";\n\nimport { useEffect, useState } from "react";\n\n` : "";

  return `${useClient}export default function Home() {${itemsBlock}
  return (
    <main className="d-flex align-items-center justify-content-center min-vh-100 bg-light p-4">
      <div className="text-center" style={{ maxWidth: "32rem" }}>
        <h1 className="display-5 fw-bold text-dark mb-3">
          Deployed with Theo
        </h1>
        <p className="text-muted mb-4">
          Edit <code>src/app/page.js</code> to get started.
        </p>
        <span className="badge bg-primary">Bootstrap</span>${itemsList}
      </div>
    </main>
  );
}
`;
}

function buildBulmaPage(
  isFullstack: boolean,
  itemsBlock: string,
  itemsList: string,
): string {
  const useClient = isFullstack ? `"use client";\n\nimport { useEffect, useState } from "react";\n\n` : "";

  return `${useClient}export default function Home() {${itemsBlock}
  return (
    <main className="hero is-fullheight is-light">
      <div className="hero-body">
        <div className="container has-text-centered">
          <h1 className="title is-1">
            Deployed with Theo
          </h1>
          <p className="subtitle">
            Edit <code>src/app/page.js</code> to get started.
          </p>
          <span className="tag is-primary is-medium">Bulma</span>${itemsList}
        </div>
      </div>
    </main>
  );
}
`;
}

// --- CI Layer ---

function writeCI(targetDir: string, template: TemplateInfo): void {
  const workflowDir = path.join(targetDir, ".github", "workflows");
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(path.join(workflowDir, "ci.yml"), buildCIWorkflow(template));
}

function buildCIWorkflow(template: TemplateInfo): string {
  switch (template.language) {
    case "go":
      return buildGoCI();
    case "python":
      return buildPythonCI();
    case "rust":
      return buildRustCI();
    case "java":
      return buildJavaCI();
    case "ruby":
      return buildRubyCI();
    case "php":
      return buildPhpCI();
    default:
      return buildNodeCI(template);
  }
}

function buildNodeCI(template: TemplateInfo): string {
  const needsBuild =
    template.id === "node-nestjs" ||
    template.id === "node-nextjs" ||
    template.id === "fullstack-nextjs" ||
    template.id === "monorepo-turbo";
  const buildStep = needsBuild ? "\n      - run: npm run build" : "";

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci${buildStep}
      - run: npm run lint --if-present

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildGoCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"
      - run: go build ./...
      - run: go vet ./...

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildPythonCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pip install ruff
      - run: ruff check .

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildRustCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo build
      - run: cargo clippy -- -D warnings
      - run: cargo fmt --check

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildJavaCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
      - uses: gradle/actions/setup-gradle@v3
      - run: ./gradlew build

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildRubyCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.2"
          bundler-cache: true
      - run: bundle install
      - run: bundle exec rubocop --format simple

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

// --- Database Layer ---

function applyDatabase(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      applyPrisma(targetDir, template);
      break;
    case "go":
      applyGorm(targetDir);
      break;
    case "python":
      applySqlalchemy(targetDir);
      break;
    case "rust":
      applyDiesel(targetDir);
      break;
    case "java":
      applySpringDataJpa(targetDir);
      break;
    case "ruby":
      applySequel(targetDir);
      break;
    case "php":
      applyDoctrine(targetDir);
      break;
  }
}

// --- Infrastructure Files (docker-compose + env) ---

function writeInfraFiles(
  targetDir: string,
  hasDatabase: boolean,
  hasRedis: boolean,
  hasAuthJwt = false,
  hasAuthOAuth = false,
): void {
  const envVars: Record<string, string> = {};
  const services: string[] = [];
  const volumes: string[] = [];

  if (hasDatabase) {
    envVars.DATABASE_URL =
      "postgresql://postgres:postgres@localhost:5432/mydb?schema=public";
    services.push(`  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5`);
    volumes.push("  pgdata:");
  }

  if (hasRedis) {
    envVars.REDIS_URL = "redis://localhost:6379";
    services.push(`  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5`);
  }

  if (hasAuthJwt) {
    envVars.JWT_SECRET = "change-me-in-production";
  }

  if (hasAuthOAuth) {
    envVars.OIDC_ISSUER_URL = "https://your-provider.com";
    envVars.OIDC_CLIENT_ID = "your-client-id";
    envVars.OIDC_CLIENT_SECRET = "your-client-secret";
  }

  // Write docker-compose.yml
  if (services.length === 0) {
    // Auth only — no docker services, just env files
    const envContent =
      Object.entries(envVars)
        .map(([k, v]) => `${k}="${v}"`)
        .join("\n") + "\n";
    fs.writeFileSync(path.join(targetDir, ".env"), envContent);
    fs.writeFileSync(path.join(targetDir, ".env.example"), envContent);
    return;
  }
  let compose = "services:\n" + services.join("\n\n") + "\n";
  if (volumes.length > 0) {
    compose += "\nvolumes:\n" + volumes.join("\n") + "\n";
  }
  fs.writeFileSync(path.join(targetDir, "docker-compose.yml"), compose);

  // Write .env and .env.example
  const envContent =
    Object.entries(envVars)
      .map(([k, v]) => `${k}="${v}"`)
      .join("\n") + "\n";
  fs.writeFileSync(path.join(targetDir, ".env"), envContent);
  fs.writeFileSync(path.join(targetDir, ".env.example"), envContent);
}

// --- Addon Stubs (Redis, Auth, Queue) ---

function applyRedis(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      applyRedisNode(targetDir, template);
      break;
    case "go":
      applyRedisGo(targetDir);
      break;
    case "python":
      applyRedisPython(targetDir);
      break;
    case "rust":
      applyRedisRust(targetDir);
      break;
    case "java":
      applyRedisJava(targetDir);
      break;
    case "ruby":
      applyRedisRuby(targetDir);
      break;
    case "php":
      applyRedisPhp(targetDir);
      break;
  }
}

function applyRedisNode(targetDir: string, template: TemplateInfo): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    ioredis: "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const libDir = path.join(targetDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });

  const isTypeScript = template.id === "node-nestjs";
  if (isTypeScript) {
    fs.writeFileSync(
      path.join(libDir, "redis.ts"),
      `import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
`,
    );
  } else {
    fs.writeFileSync(
      path.join(libDir, "redis.js"),
      `const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

module.exports = { redis };
`,
    );
  }
}

function applyRedisGo(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");
  goMod += `\nrequire github.com/redis/go-redis/v9 v9.7.0\n`;
  fs.writeFileSync(goModPath, goMod);

  const cacheDir = path.join(targetDir, "internal", "cache");
  fs.mkdirSync(cacheDir, { recursive: true });

  fs.writeFileSync(
    path.join(cacheDir, "redis.go"),
    `package cache

import (
\t"context"
\t"os"

\t"github.com/redis/go-redis/v9"
)

var Client *redis.Client

func Connect() error {
\turl := os.Getenv("REDIS_URL")
\tif url == "" {
\t\turl = "redis://localhost:6379"
\t}

\topts, err := redis.ParseURL(url)
\tif err != nil {
\t\treturn err
\t}

\tClient = redis.NewClient(opts)
\treturn Client.Ping(context.Background()).Err()
}
`,
  );
}

function applyRedisPython(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");
  reqs += "redis>=5.0.0\n";
  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "cache.py"),
    `import os

import redis

r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
`,
  );
}

function applyAuth(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      if (template.id === "node-fastify") {
        applyAuthFastify(targetDir);
      } else if (template.id === "node-nestjs") {
        applyAuthNestJS(targetDir);
      } else {
        applyAuthExpress(targetDir);
      }
      break;
    case "go":
      applyAuthGo(targetDir);
      break;
    case "python":
      applyAuthPython(targetDir);
      break;
    case "rust":
      applyAuthRust(targetDir);
      break;
    case "java":
      applyAuthJava(targetDir);
      break;
    case "ruby":
      applyAuthRuby(targetDir);
      break;
    case "php":
      applyAuthPhp(targetDir);
      break;
  }
}

function applyAuthExpress(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    jsonwebtoken: "^9.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const middlewareDir = path.join(targetDir, "src", "middleware");
  fs.mkdirSync(middlewareDir, { recursive: true });

  fs.writeFileSync(
    path.join(middlewareDir, "auth.js"),
    `const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

module.exports = { authenticate, generateToken };
`,
  );
}

function applyAuthFastify(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    jsonwebtoken: "^9.0.0",
    "fastify-plugin": "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const pluginsDir = path.join(targetDir, "src", "plugins");
  fs.mkdirSync(pluginsDir, { recursive: true });

  fs.writeFileSync(
    path.join(pluginsDir, "auth.js"),
    `const fp = require("fastify-plugin");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

module.exports = fp(async function authPlugin(fastify) {
  fastify.decorate("authenticate", async function (request, reply) {
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    try {
      request.user = jwt.verify(token, JWT_SECRET);
    } catch {
      reply.code(401).send({ error: "Invalid token" });
    }
  });

  fastify.decorate("generateToken", function (payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  });
});
`,
  );
}

function applyAuthNestJS(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    jsonwebtoken: "^9.0.0",
  };
  pkg.devDependencies = {
    ...(pkg.devDependencies as Record<string, string>),
    "@types/jsonwebtoken": "^9.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const guardsDir = path.join(targetDir, "src", "guards");
  fs.mkdirSync(guardsDir, { recursive: true });

  fs.writeFileSync(
    path.join(guardsDir, "auth.guard.ts"),
    `import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new UnauthorizedException();
    try {
      request.user = jwt.verify(token, JWT_SECRET);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

export function generateToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}
`,
  );
}

function applyAuthGo(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");
  goMod += `\nrequire github.com/golang-jwt/jwt/v5 v5.2.1\n`;
  fs.writeFileSync(goModPath, goMod);

  const authDir = path.join(targetDir, "internal", "auth");
  fs.mkdirSync(authDir, { recursive: true });

  fs.writeFileSync(
    path.join(authDir, "auth.go"),
    `package auth

import (
\t"encoding/json"
\t"net/http"
\t"os"
\t"strings"
\t"time"

\t"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserKey contextKey = "user"

var jwtSecret = []byte(getSecret())

func getSecret() string {
\ts := os.Getenv("JWT_SECRET")
\tif s == "" {
\t\treturn "change-me-in-production"
\t}
\treturn s
}

func Authenticate(next http.Handler) http.Handler {
\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\tauth := r.Header.Get("Authorization")
\t\ttokenStr := strings.TrimPrefix(auth, "Bearer ")
\t\tif tokenStr == "" || tokenStr == auth {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tw.WriteHeader(http.StatusUnauthorized)
\t\t\tjson.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
\t\t\treturn
\t\t}

\t\ttoken, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
\t\t\treturn jwtSecret, nil
\t\t})
\t\tif err != nil || !token.Valid {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tw.WriteHeader(http.StatusUnauthorized)
\t\t\tjson.NewEncoder(w).Encode(map[string]string{"error": "Invalid token"})
\t\t\treturn
\t\t}

\t\tnext.ServeHTTP(w, r)
\t})
}

func GenerateToken(claims map[string]interface{}) (string, error) {
\tmapClaims := jwt.MapClaims{
\t\t"exp": time.Now().Add(24 * time.Hour).Unix(),
\t}
\tfor k, v := range claims {
\t\tmapClaims[k] = v
\t}
\ttoken := jwt.NewWithClaims(jwt.SigningMethodHS256, mapClaims)
\treturn token.SignedString(jwtSecret)
}
`,
  );
}

function applyAuthPython(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");
  reqs += "pyjwt>=2.0.0\n";
  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "auth.py"),
    `import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
security = HTTPBearer()


def authenticate(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


def generate_token(payload: dict) -> str:
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
`,
  );
}

function applyQueue(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      applyQueueNode(targetDir, template);
      break;
    case "go":
      applyQueueGo(targetDir);
      break;
    case "python":
      applyQueuePython(targetDir);
      break;
    case "php":
      applyQueuePhp(targetDir);
      break;
  }
}

function applyQueueNode(targetDir: string, template: TemplateInfo): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    bullmq: "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const libDir = path.join(targetDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });

  const isTypeScript = template.id === "node-nestjs";
  if (isTypeScript) {
    fs.writeFileSync(
      path.join(libDir, "queue.ts"),
      `import { Queue, Worker, type Processor } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

export const defaultQueue = new Queue("default", { connection });

export function createWorker(name: string, processor: Processor) {
  return new Worker(name, processor, { connection });
}

export { connection };
`,
    );
  } else {
    fs.writeFileSync(
      path.join(libDir, "queue.js"),
      `const { Queue, Worker } = require("bullmq");

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

const defaultQueue = new Queue("default", { connection });

function createWorker(name, processor) {
  return new Worker(name, processor, { connection });
}

module.exports = { defaultQueue, createWorker, connection };
`,
    );
  }
}

function applyQueueGo(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");
  goMod += `\nrequire github.com/hibiken/asynq v0.24.1\n`;
  fs.writeFileSync(goModPath, goMod);

  const queueDir = path.join(targetDir, "internal", "queue");
  fs.mkdirSync(queueDir, { recursive: true });

  fs.writeFileSync(
    path.join(queueDir, "queue.go"),
    `package queue

import (
\t"os"

\t"github.com/hibiken/asynq"
)

var Client *asynq.Client

func Connect() {
\tredisURL := os.Getenv("REDIS_URL")
\tif redisURL == "" {
\t\tredisURL = "redis://localhost:6379"
\t}

\topt, _ := asynq.ParseRedisURI(redisURL)
\tClient = asynq.NewClient(opt)
}

func Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
\treturn Client.Enqueue(task, opts...)
}
`,
  );

  fs.writeFileSync(
    path.join(queueDir, "worker.go"),
    `package queue

import (
\t"os"

\t"github.com/hibiken/asynq"
)

func NewWorker(mux *asynq.ServeMux) *asynq.Server {
\tredisURL := os.Getenv("REDIS_URL")
\tif redisURL == "" {
\t\tredisURL = "redis://localhost:6379"
\t}

\topt, _ := asynq.ParseRedisURI(redisURL)
\tsrv := asynq.NewServer(opt, asynq.Config{
\t\tConcurrency: 10,
\t})

\treturn srv
}
`,
  );

  fs.writeFileSync(
    path.join(queueDir, "tasks.go"),
    `package queue

import (
\t"context"
\t"encoding/json"
\t"fmt"

\t"github.com/hibiken/asynq"
)

const TypeExample = "example:process"

type ExamplePayload struct {
\tMessage string \`json:"message"\`
}

func NewExampleTask(msg string) (*asynq.Task, error) {
\tpayload, err := json.Marshal(ExamplePayload{Message: msg})
\tif err != nil {
\t\treturn nil, err
\t}
\treturn asynq.NewTask(TypeExample, payload), nil
}

func HandleExampleTask(ctx context.Context, t *asynq.Task) error {
\tvar p ExamplePayload
\tif err := json.Unmarshal(t.Payload(), &p); err != nil {
\t\treturn err
\t}
\tfmt.Printf("Processing task: %s\\n", p.Message)
\treturn nil
}
`,
  );
}

function applyQueuePython(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");
  reqs += "arq>=0.26.0\n";
  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "queue_worker.py"),
    `import asyncio
import os

from arq import create_pool
from arq.connections import RedisSettings


async def example_task(ctx, message: str) -> str:
    print(f"Processing: {message}")
    return f"Done: {message}"


class WorkerSettings:
    functions = [example_task]
    redis_settings = RedisSettings.from_dsn(
        os.getenv("REDIS_URL", "redis://localhost:6379")
    )
`,
  );

  fs.writeFileSync(
    path.join(targetDir, "queue_client.py"),
    `import os

from arq import create_pool
from arq.connections import RedisSettings

REDIS_SETTINGS = RedisSettings.from_dsn(
    os.getenv("REDIS_URL", "redis://localhost:6379")
)


async def get_pool():
    return await create_pool(REDIS_SETTINGS)


async def enqueue(pool, task_name: str, *args, **kwargs):
    return await pool.enqueue_job(task_name, *args, **kwargs)
`,
  );
}

// --- Prisma (Node.js) ---

function applyPrisma(targetDir: string, template: TemplateInfo): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);

  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    "@prisma/client": "^6.0.0",
  };
  pkg.devDependencies = {
    ...(pkg.devDependencies as Record<string, string>),
    prisma: "^6.0.0",
  };
  pkg.scripts = {
    ...(pkg.scripts as Record<string, string>),
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
  };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const prismaDir = path.join(targetDir, "prisma");
  fs.mkdirSync(prismaDir, { recursive: true });

  fs.writeFileSync(
    path.join(prismaDir, "schema.prisma"),
    `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`,
  );

  const isTypeScript = template.id === "node-nestjs";
  const libDir = path.join(targetDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });

  if (isTypeScript) {
    fs.writeFileSync(
      path.join(libDir, "db.ts"),
      `import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
`,
    );
  } else {
    fs.writeFileSync(
      path.join(libDir, "db.js"),
      `const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = { prisma };
`,
    );
  }
}

// --- GORM (Go) ---

function applyGorm(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");

  goMod += `
require (
\tgorm.io/gorm v1.25.12
\tgorm.io/driver/postgres v1.5.11
)
`;

  fs.writeFileSync(goModPath, goMod);

  const dbDir = path.join(targetDir, "internal", "database");
  fs.mkdirSync(dbDir, { recursive: true });

  fs.writeFileSync(
    path.join(dbDir, "database.go"),
    `package database

import (
\t"fmt"
\t"os"

\t"gorm.io/driver/postgres"
\t"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() error {
\tdsn := os.Getenv("DATABASE_URL")
\tif dsn == "" {
\t\tdsn = "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable"
\t}

\tdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
\tif err != nil {
\t\treturn fmt.Errorf("failed to connect to database: %w", err)
\t}

\tDB = db
\treturn nil
}
`,
  );

  const modelsDir = path.join(targetDir, "internal", "models");
  fs.mkdirSync(modelsDir, { recursive: true });

  fs.writeFileSync(
    path.join(modelsDir, "user.go"),
    `package models

import "time"

type User struct {
\tID        uint      \`json:"id" gorm:"primaryKey"\`
\tEmail     string    \`json:"email" gorm:"uniqueIndex"\`
\tName      string    \`json:"name"\`
\tCreatedAt time.Time \`json:"created_at"\`
\tUpdatedAt time.Time \`json:"updated_at"\`
}
`,
  );
}

// --- SQLAlchemy (Python) ---

function applySqlalchemy(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");

  reqs += `sqlalchemy>=2.0.0\npsycopg2-binary>=2.9.0\nalembic>=1.13.0\n`;

  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "database.py"),
    `import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://user:password@localhost:5432/mydb"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`,
  );

  fs.writeFileSync(
    path.join(targetDir, "models.py"),
    `from sqlalchemy import Column, DateTime, Integer, String, func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
`,
  );
}

// --- Diesel (Rust) ---

function applyDiesel(targetDir: string): void {
  const cargoPath = path.join(targetDir, "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf-8");
  cargo += `\n[dependencies.diesel]\nversion = "2"\nfeatures = ["postgres"]\n\n[dependencies.dotenvy]\nversion = "0.15"\n`;
  fs.writeFileSync(cargoPath, cargo);

  const srcDir = path.join(targetDir, "src");
  fs.writeFileSync(
    path.join(srcDir, "db.rs"),
    `use diesel::prelude::*;
use diesel::pg::PgConnection;
use std::env;

pub fn establish_connection() -> PgConnection {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/mydb".to_string());
    PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}
`,
  );
}

// --- Spring Data JPA (Java) ---

function applySpringDataJpa(targetDir: string): void {
  const buildFile = path.join(targetDir, "build.gradle.kts");
  let gradle = fs.readFileSync(buildFile, "utf-8");
  gradle = gradle.replace(
    'implementation("org.springframework.boot:spring-boot-starter-web")',
    `implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("org.postgresql:postgresql")`,
  );
  fs.writeFileSync(buildFile, gradle);

  const appYml = path.join(targetDir, "src", "main", "resources", "application.yml");
  let yml = fs.readFileSync(appYml, "utf-8");
  yml += `
  datasource:
    url: \${DATABASE_URL:jdbc:postgresql://localhost:5432/mydb}
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
`;
  fs.writeFileSync(appYml, yml);

  const entityDir = path.join(targetDir, "src", "main", "java", "com", "theo", "app", "entity");
  fs.mkdirSync(entityDir, { recursive: true });

  fs.writeFileSync(
    path.join(entityDir, "User.java"),
    `package com.theo.app.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    private String name;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
`,
  );

  const repoDir = path.join(targetDir, "src", "main", "java", "com", "theo", "app", "repository");
  fs.mkdirSync(repoDir, { recursive: true });

  fs.writeFileSync(
    path.join(repoDir, "UserRepository.java"),
    `package com.theo.app.repository;

import com.theo.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
`,
  );
}

// --- Sequel (Ruby) ---

function applySequel(targetDir: string): void {
  const gemfile = path.join(targetDir, "Gemfile");
  let gems = fs.readFileSync(gemfile, "utf-8");
  gems += `\ngem "sequel", "~> 5.0"\ngem "pg", "~> 1.5"\n`;
  fs.writeFileSync(gemfile, gems);

  fs.writeFileSync(
    path.join(targetDir, "database.rb"),
    `require "sequel"

DATABASE_URL = ENV.fetch("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/mydb")
DB = Sequel.connect(DATABASE_URL)

DB.create_table?(:users) do
  primary_key :id
  String :email, unique: true, null: false
  String :name
  DateTime :created_at, default: Sequel::CURRENT_TIMESTAMP
  DateTime :updated_at, default: Sequel::CURRENT_TIMESTAMP
end

class User < Sequel::Model(:users)
end
`,
  );
}

// --- Redis for new languages ---

function applyRedisRust(targetDir: string): void {
  const cargoPath = path.join(targetDir, "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf-8");
  cargo += `\n[dependencies.redis]\nversion = "0.25"\nfeatures = ["tokio-comp"]\n`;
  fs.writeFileSync(cargoPath, cargo);

  const srcDir = path.join(targetDir, "src");
  fs.writeFileSync(
    path.join(srcDir, "cache.rs"),
    `use redis::AsyncCommands;

pub async fn get_client() -> redis::Client {
    let url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    redis::Client::open(url).expect("Invalid Redis URL")
}
`,
  );
}

function applyRedisJava(targetDir: string): void {
  const buildFile = path.join(targetDir, "build.gradle.kts");
  let gradle = fs.readFileSync(buildFile, "utf-8");
  gradle = gradle.replace(
    'implementation("org.springframework.boot:spring-boot-starter-web")',
    `implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")`,
  );
  fs.writeFileSync(buildFile, gradle);

  const appYml = path.join(targetDir, "src", "main", "resources", "application.yml");
  let yml = fs.readFileSync(appYml, "utf-8");
  yml += `
  data:
    redis:
      url: \${REDIS_URL:redis://localhost:6379}
`;
  fs.writeFileSync(appYml, yml);
}

function applyRedisRuby(targetDir: string): void {
  const gemfile = path.join(targetDir, "Gemfile");
  let gems = fs.readFileSync(gemfile, "utf-8");
  gems += `\ngem "redis", "~> 5.0"\n`;
  fs.writeFileSync(gemfile, gems);

  fs.writeFileSync(
    path.join(targetDir, "cache.rb"),
    `require "redis"

REDIS = Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379"))
`,
  );
}

// --- Auth JWT for new languages ---

function applyAuthRust(targetDir: string): void {
  const cargoPath = path.join(targetDir, "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf-8");
  cargo += `\n[dependencies.jsonwebtoken]\nversion = "9"\n`;
  fs.writeFileSync(cargoPath, cargo);

  const srcDir = path.join(targetDir, "src");
  fs.writeFileSync(
    path.join(srcDir, "auth.rs"),
    `use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

fn get_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "change-me-in-production".to_string())
}

pub async fn authenticate(req: Request, next: Next) -> Response {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let token = auth_header.strip_prefix("Bearer ").unwrap_or("");
    if token.is_empty() {
        return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Unauthorized"}))).into_response();
    }

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(get_secret().as_bytes()),
        &Validation::default(),
    ) {
        Ok(_) => next.run(req).await,
        Err(_) => (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token"}))).into_response(),
    }
}

pub fn generate_token(sub: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims {
        sub: sub.to_string(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(get_secret().as_bytes()))
}
`,
  );
}

function applyAuthJava(targetDir: string): void {
  const buildFile = path.join(targetDir, "build.gradle.kts");
  let gradle = fs.readFileSync(buildFile, "utf-8");
  gradle = gradle.replace(
    'implementation("org.springframework.boot:spring-boot-starter-web")',
    `implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("io.jsonwebtoken:jjwt-api:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.5")`,
  );
  fs.writeFileSync(buildFile, gradle);

  const filterDir = path.join(targetDir, "src", "main", "java", "com", "theo", "app", "config");
  fs.writeFileSync(
    path.join(filterDir, "JwtFilter.java"),
    `package com.theo.app.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class JwtFilter implements Filter {

    private static final String SECRET = System.getenv("JWT_SECRET") != null
            ? System.getenv("JWT_SECRET") : "change-me-in-production-needs-32chars!";

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\\"error\\":\\"Unauthorized\\"}");
            return;
        }

        try {
            String token = auth.substring(7);
            Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .build()
                .parseSignedClaims(token);
            chain.doFilter(req, res);
        } catch (Exception e) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\\"error\\":\\"Invalid token\\"}");
        }
    }
}
`,
  );
}

function applyAuthRuby(targetDir: string): void {
  const gemfile = path.join(targetDir, "Gemfile");
  let gems = fs.readFileSync(gemfile, "utf-8");
  gems += `\ngem "jwt", "~> 2.8"\n`;
  fs.writeFileSync(gemfile, gems);

  fs.writeFileSync(
    path.join(targetDir, "auth.rb"),
    `require "jwt"

JWT_SECRET = ENV.fetch("JWT_SECRET", "change-me-in-production")

def authenticate!(request)
  auth = request.env["HTTP_AUTHORIZATION"]
  halt 401, { error: "Unauthorized" }.to_json unless auth&.start_with?("Bearer ")

  token = auth.sub("Bearer ", "")
  begin
    JWT.decode(token, JWT_SECRET, true, algorithm: "HS256")
  rescue JWT::DecodeError
    halt 401, { error: "Invalid token" }.to_json
  end
end

def generate_token(payload)
  payload[:exp] = Time.now.to_i + 86_400
  JWT.encode(payload, JWT_SECRET, "HS256")
end
`,
  );
}

// --- Auth OAuth/OIDC ---

function applyAuthOAuth(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      if (template.id === "node-fastify") {
        applyAuthOAuthFastify(targetDir);
      } else if (template.id === "node-nestjs") {
        applyAuthOAuthNestJS(targetDir);
      } else {
        applyAuthOAuthExpress(targetDir);
      }
      break;
    case "go":
      applyAuthOAuthGo(targetDir);
      break;
    case "python":
      applyAuthOAuthPython(targetDir);
      break;
    case "rust":
      applyAuthOAuthRust(targetDir);
      break;
    case "java":
      applyAuthOAuthJava(targetDir);
      break;
    case "ruby":
      applyAuthOAuthRuby(targetDir);
      break;
    case "php":
      applyAuthOAuthPhp(targetDir);
      break;
  }
}

function applyAuthOAuthExpress(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    "openid-client": "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const middlewareDir = path.join(targetDir, "src", "middleware");
  fs.mkdirSync(middlewareDir, { recursive: true });

  fs.writeFileSync(
    path.join(middlewareDir, "oauth.js"),
    `const { Issuer } = require("openid-client");

let client;

async function initOIDC() {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL);
  client = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET,
  });
}

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    if (!client) await initOIDC();
    const userinfo = await client.userinfo(token);
    req.user = userinfo;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { authenticate, initOIDC };
`,
  );
}

function applyAuthOAuthFastify(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    "openid-client": "^5.0.0",
    "fastify-plugin": "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const pluginsDir = path.join(targetDir, "src", "plugins");
  fs.mkdirSync(pluginsDir, { recursive: true });

  fs.writeFileSync(
    path.join(pluginsDir, "oauth.js"),
    `const fp = require("fastify-plugin");
const { Issuer } = require("openid-client");

module.exports = fp(async function oauthPlugin(fastify) {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL);
  const client = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET,
  });

  fastify.decorate("authenticate", async function (request, reply) {
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    try {
      request.user = await client.userinfo(token);
    } catch {
      reply.code(401).send({ error: "Invalid token" });
    }
  });
});
`,
  );
}

function applyAuthOAuthNestJS(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    "openid-client": "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const guardsDir = path.join(targetDir, "src", "guards");
  fs.mkdirSync(guardsDir, { recursive: true });

  fs.writeFileSync(
    path.join(guardsDir, "oauth.guard.ts"),
    `import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Issuer } from "openid-client";

let client: any;

@Injectable()
export class OAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new UnauthorizedException();
    try {
      if (!client) {
        const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL!);
        client = new issuer.Client({
          client_id: process.env.OIDC_CLIENT_ID!,
          client_secret: process.env.OIDC_CLIENT_SECRET!,
        });
      }
      request.user = await client.userinfo(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
`,
  );
}

function applyAuthOAuthGo(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");
  goMod += `\nrequire (\n\tgithub.com/coreos/go-oidc/v3 v3.10.0\n\tgolang.org/x/oauth2 v0.21.0\n)\n`;
  fs.writeFileSync(goModPath, goMod);

  const authDir = path.join(targetDir, "internal", "auth");
  fs.mkdirSync(authDir, { recursive: true });

  fs.writeFileSync(
    path.join(authDir, "oauth.go"),
    `package auth

import (
\t"context"
\t"encoding/json"
\t"net/http"
\t"os"
\t"strings"

\t"github.com/coreos/go-oidc/v3/oidc"
)

var verifier *oidc.IDTokenVerifier

func InitOIDC() error {
\tprovider, err := oidc.NewProvider(context.Background(), os.Getenv("OIDC_ISSUER_URL"))
\tif err != nil {
\t\treturn err
\t}
\tverifier = provider.Verifier(&oidc.Config{ClientID: os.Getenv("OIDC_CLIENT_ID")})
\treturn nil
}

func OAuthAuthenticate(next http.Handler) http.Handler {
\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\tauth := r.Header.Get("Authorization")
\t\ttokenStr := strings.TrimPrefix(auth, "Bearer ")
\t\tif tokenStr == "" || tokenStr == auth {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tw.WriteHeader(http.StatusUnauthorized)
\t\t\tjson.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
\t\t\treturn
\t\t}

\t\t_, err := verifier.Verify(r.Context(), tokenStr)
\t\tif err != nil {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tw.WriteHeader(http.StatusUnauthorized)
\t\t\tjson.NewEncoder(w).Encode(map[string]string{"error": "Invalid token"})
\t\t\treturn
\t\t}

\t\tnext.ServeHTTP(w, r)
\t})
}
`,
  );
}

function applyAuthOAuthPython(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");
  reqs += "authlib>=1.3.0\nhttpx>=0.27.0\n";
  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "oauth.py"),
    `import os

import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

OIDC_ISSUER_URL = os.getenv("OIDC_ISSUER_URL", "https://your-provider.com")
OIDC_CLIENT_ID = os.getenv("OIDC_CLIENT_ID", "your-client-id")

security = HTTPBearer()


async def authenticate(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{OIDC_ISSUER_URL}/userinfo",
                headers={"Authorization": f"Bearer {credentials.credentials}"},
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
                )
            return resp.json()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
`,
  );
}

function applyAuthOAuthRust(targetDir: string): void {
  const cargoPath = path.join(targetDir, "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf-8");
  cargo += `\n[dependencies.openidconnect]\nversion = "3"\n\n[dependencies.reqwest]\nversion = "0.12"\nfeatures = ["json"]\n`;
  fs.writeFileSync(cargoPath, cargo);

  const srcDir = path.join(targetDir, "src");
  fs.writeFileSync(
    path.join(srcDir, "oauth.rs"),
    `use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

pub async fn authenticate(req: Request, next: Next) -> Response {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let token = auth_header.strip_prefix("Bearer ").unwrap_or("");
    if token.is_empty() {
        return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Unauthorized"}))).into_response();
    }

    let issuer_url = std::env::var("OIDC_ISSUER_URL").unwrap_or_default();
    let client = reqwest::Client::new();
    match client
        .get(format!("{}/userinfo", issuer_url))
        .bearer_auth(token)
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => next.run(req).await,
        _ => (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token"}))).into_response(),
    }
}
`,
  );
}

function applyAuthOAuthJava(targetDir: string): void {
  const buildFile = path.join(targetDir, "build.gradle.kts");
  let gradle = fs.readFileSync(buildFile, "utf-8");
  gradle = gradle.replace(
    'implementation("org.springframework.boot:spring-boot-starter-web")',
    `implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")`,
  );
  fs.writeFileSync(buildFile, gradle);

  const appYml = path.join(targetDir, "src", "main", "resources", "application.yml");
  let yml = fs.readFileSync(appYml, "utf-8");
  yml += `
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: \${OIDC_ISSUER_URL:https://your-provider.com}
`;
  fs.writeFileSync(appYml, yml);
}

function applyAuthOAuthRuby(targetDir: string): void {
  const gemfile = path.join(targetDir, "Gemfile");
  let gems = fs.readFileSync(gemfile, "utf-8");
  gems += `\ngem "omniauth", "~> 2.1"\ngem "omniauth_openid_connect", "~> 0.7"\n`;
  fs.writeFileSync(gemfile, gems);

  fs.writeFileSync(
    path.join(targetDir, "oauth.rb"),
    `require "net/http"
require "json"

OIDC_ISSUER_URL = ENV.fetch("OIDC_ISSUER_URL", "https://your-provider.com")

def authenticate_oauth!(request)
  auth = request.env["HTTP_AUTHORIZATION"]
  halt 401, { error: "Unauthorized" }.to_json unless auth&.start_with?("Bearer ")

  token = auth.sub("Bearer ", "")
  uri = URI("#{OIDC_ISSUER_URL}/userinfo")
  req = Net::HTTP::Get.new(uri)
  req["Authorization"] = "Bearer #{token}"

  res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
    http.request(req)
  end

  halt 401, { error: "Invalid token" }.to_json unless res.is_a?(Net::HTTPOK)
  JSON.parse(res.body)
end
`,
  );
}

// --- PHP CI ---

function buildPhpCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: "8.2"
          tools: composer
      - run: composer install --no-interaction
      - run: composer lint --no-interaction || true

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

// --- Doctrine (PHP) ---

function applyDoctrine(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "doctrine/dbal": "^4.0",
    "doctrine/orm": "^3.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const srcDir = path.join(targetDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(
    path.join(srcDir, "database.php"),
    `<?php

declare(strict_types=1);

use Doctrine\\DBAL\\DriverManager;

$databaseUrl = getenv('DATABASE_URL') ?: 'pdo-pgsql://postgres:postgres@localhost:5432/mydb';

$connection = DriverManager::getConnection(['url' => $databaseUrl]);
`,
  );
}

// --- Redis (PHP) ---

function applyRedisPhp(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "predis/predis": "^2.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const srcDir = path.join(targetDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(
    path.join(srcDir, "cache.php"),
    `<?php

declare(strict_types=1);

use Predis\\Client;

$redisUrl = getenv('REDIS_URL') ?: 'redis://localhost:6379';
$redis = new Client($redisUrl);
`,
  );
}

// --- Auth JWT (PHP) ---

function applyAuthPhp(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "firebase/php-jwt": "^6.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const middlewareDir = path.join(targetDir, "src", "Middleware");
  fs.mkdirSync(middlewareDir, { recursive: true });

  fs.writeFileSync(
    path.join(middlewareDir, "AuthJwt.php"),
    `<?php

declare(strict_types=1);

namespace App\\Middleware;

use Firebase\\JWT\\JWT;
use Firebase\\JWT\\Key;
use Psr\\Http\\Message\\ResponseInterface as Response;
use Psr\\Http\\Message\\ServerRequestInterface as Request;
use Psr\\Http\\Server\\MiddlewareInterface;
use Psr\\Http\\Server\\RequestHandlerInterface as RequestHandler;
use Slim\\Psr7\\Response as SlimResponse;

class AuthJwt implements MiddlewareInterface
{
    private string $secret;

    public function __construct()
    {
        $this->secret = getenv('JWT_SECRET') ?: 'change-me-in-production';
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $auth = $request->getHeaderLine('Authorization');
        $token = str_replace('Bearer ', '', $auth);

        if (empty($token) || $token === $auth) {
            return $this->unauthorized('Unauthorized');
        }

        try {
            JWT::decode($token, new Key($this->secret, 'HS256'));
            return $handler->handle($request);
        } catch (\\Throwable) {
            return $this->unauthorized('Invalid token');
        }
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }
}
`,
  );
}

// --- Auth OAuth (PHP) ---

function applyAuthOAuthPhp(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "guzzlehttp/guzzle": "^7.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const middlewareDir = path.join(targetDir, "src", "Middleware");
  fs.mkdirSync(middlewareDir, { recursive: true });

  fs.writeFileSync(
    path.join(middlewareDir, "AuthOAuth.php"),
    `<?php

declare(strict_types=1);

namespace App\\Middleware;

use GuzzleHttp\\Client;
use Psr\\Http\\Message\\ResponseInterface as Response;
use Psr\\Http\\Message\\ServerRequestInterface as Request;
use Psr\\Http\\Server\\MiddlewareInterface;
use Psr\\Http\\Server\\RequestHandlerInterface as RequestHandler;
use Slim\\Psr7\\Response as SlimResponse;

class AuthOAuth implements MiddlewareInterface
{
    private string $issuerUrl;

    public function __construct()
    {
        $this->issuerUrl = getenv('OIDC_ISSUER_URL') ?: 'https://your-provider.com';
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $auth = $request->getHeaderLine('Authorization');
        $token = str_replace('Bearer ', '', $auth);

        if (empty($token) || $token === $auth) {
            return $this->unauthorized('Unauthorized');
        }

        try {
            $client = new Client();
            $resp = $client->get($this->issuerUrl . '/userinfo', [
                'headers' => ['Authorization' => "Bearer $token"],
            ]);

            if ($resp->getStatusCode() !== 200) {
                return $this->unauthorized('Invalid token');
            }

            return $handler->handle($request);
        } catch (\\Throwable) {
            return $this->unauthorized('Invalid token');
        }
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }
}
`,
  );
}

// --- Queue (PHP) ---

function applyQueuePhp(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "symfony/messenger": "^7.0",
    "symfony/redis-messenger": "^7.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const messageDir = path.join(targetDir, "src", "Message");
  fs.mkdirSync(messageDir, { recursive: true });

  fs.writeFileSync(
    path.join(messageDir, "ExampleMessage.php"),
    `<?php

declare(strict_types=1);

namespace App\\Message;

class ExampleMessage
{
    public function __construct(
        public readonly string $content,
    ) {}
}
`,
  );

  fs.writeFileSync(
    path.join(messageDir, "ExampleHandler.php"),
    `<?php

declare(strict_types=1);

namespace App\\Message;

class ExampleHandler
{
    public function __invoke(ExampleMessage $message): void
    {
        echo "Processing: " . $message->content . "\\n";
    }
}
`,
  );
}
