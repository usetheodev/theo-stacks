import fs from "node:fs";
import path from "node:path";
import type { TemplateInfo } from "../templates.js";
import type { StylingOption } from "../styling.js";
import { readPackageJson } from "./types.js";

// --- Styling Layer ---

export function applyStyling(
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
  const needsPostcss = needsTailwind || ["mantine"].includes(styling.id);

  // Tailwind v4: no tailwind.config.js needed — config is in CSS via @theme

  if (needsPostcss) {
    writePostcssConfig(appDir, styling);
  }

  if (styling.id === "mantine") {
    writePostcssConfig(appDir, styling);
  }
}

function writePostcssConfig(appDir: string, styling: StylingOption): void {
  let config: string;

  if (styling.id === "mantine") {
    config = `/** @type {import('postcss-load-config').Config} */
const config = {
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

export default config;
`;
  } else {
    // Tailwind v4 uses @tailwindcss/postcss
    config = `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;
  }

  fs.writeFileSync(path.join(appDir, "postcss.config.mjs"), config);
}

function writeGlobalsCss(appDir: string, styling: StylingOption): void {
  const cssDir = path.join(appDir, "src", "app");
  fs.mkdirSync(cssDir, { recursive: true });
  const cssPath = path.join(cssDir, "globals.css");

  let css: string;

  switch (styling.id) {
    case "tailwind":
      css = `@import "tailwindcss";
`;
      break;

    case "shadcn":
      css = `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
  --radius: 0.625rem;
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.141 0.005 285.823);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.141 0.005 285.823);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.274 0.006 286.033);
  --input: oklch(0.274 0.006 286.033);
  --ring: oklch(0.552 0.016 285.938);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;
      break;

    case "daisyui":
      css = `@import "tailwindcss";
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
  // Support both .tsx (new) and .js (legacy) layouts
  let layoutPath = path.join(appDir, "src", "app", "layout.tsx");
  if (!fs.existsSync(layoutPath)) {
    layoutPath = path.join(appDir, "src", "app", "layout.js");
  }

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
    /export const metadata[\s\S]*?};/,
  );
  const metadataBlock = metadataMatch
    ? metadataMatch[0]
    : 'export const metadata: Metadata = { title: "App", description: "Deployed with Theo" };';

  return `import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChakraProviders } from "./providers";

${metadataBlock}

export default function RootLayout({ children }: { children: ReactNode }) {
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
    /export const metadata[\s\S]*?};/,
  );
  const metadataBlock = metadataMatch
    ? metadataMatch[0]
    : 'export const metadata: Metadata = { title: "App", description: "Deployed with Theo" };';

  return `import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@mantine/core/styles.css";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";

${metadataBlock}

export default function RootLayout({ children }: { children: ReactNode }) {
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
  // Support both .tsx (new) and .js (legacy)
  let pagePath = path.join(appDir, "src", "app", "page.tsx");
  if (!fs.existsSync(pagePath)) {
    pagePath = path.join(appDir, "src", "app", "page.js");
  }
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
          Edit <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">src/app/page.tsx</code> to get started.
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
          Edit <Code>src/app/page.tsx</Code> to get started.
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
          Edit <Code>src/app/page.tsx</Code> to get started.
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
          Edit <code>src/app/page.tsx</code> to get started.
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
            Edit <code>src/app/page.tsx</code> to get started.
          </p>
          <span className="tag is-primary is-medium">Bulma</span>${itemsList}
        </div>
      </div>
    </main>
  );
}
`;
}
