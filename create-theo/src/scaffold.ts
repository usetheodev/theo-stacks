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
  database?: boolean;
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
      const destName = entry.name === "gitignore" ? ".gitignore" : entry.name;
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

// --- Database Layer ---

function applyDatabase(targetDir: string, template: TemplateInfo): void {
  writeEnvExample(targetDir);

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
  }
}

function writeEnvExample(targetDir: string): void {
  fs.writeFileSync(
    path.join(targetDir, ".env.example"),
    `DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"\n`,
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
