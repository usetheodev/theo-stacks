export interface StylingOption {
  id: string;
  name: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export const stylingOptions: StylingOption[] = [
  {
    id: "none",
    name: "Plain CSS",
    description: "No framework — just CSS",
    dependencies: {},
    devDependencies: {},
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    description: "Utility-first CSS framework",
    dependencies: {},
    devDependencies: {
      tailwindcss: "^4.0.0",
      "@tailwindcss/postcss": "^4.0.0",
    },
  },
  {
    id: "shadcn",
    name: "Tailwind + shadcn/ui",
    description: "Beautifully designed components built with Radix UI and Tailwind",
    dependencies: {
      "tailwind-merge": "^2.6.0",
      clsx: "^2.1.0",
      "lucide-react": "^0.460.0",
      "@radix-ui/react-slot": "^1.1.0",
    },
    devDependencies: {
      tailwindcss: "^4.0.0",
      "@tailwindcss/postcss": "^4.0.0",
      "tw-animate-css": "^1.0.0",
    },
  },
  {
    id: "daisyui",
    name: "Tailwind + daisyUI",
    description: "Component library built on Tailwind CSS",
    dependencies: {},
    devDependencies: {
      tailwindcss: "^4.0.0",
      "@tailwindcss/postcss": "^4.0.0",
      daisyui: "^4.12.0",
    },
  },
  {
    id: "chakra",
    name: "Chakra UI",
    description: "Accessible component library with built-in styling",
    dependencies: {
      "@chakra-ui/react": "^2.10.0",
      "@emotion/react": "^11.13.0",
      "@emotion/styled": "^11.13.0",
      "framer-motion": "^11.12.0",
    },
    devDependencies: {},
  },
  {
    id: "mantine",
    name: "Mantine",
    description: "Full-featured React component library",
    dependencies: {
      "@mantine/core": "^7.14.0",
      "@mantine/hooks": "^7.14.0",
    },
    devDependencies: {
      "postcss": "^8.4.0",
      "postcss-preset-mantine": "^1.17.0",
      "postcss-simple-vars": "^7.0.0",
    },
  },
  {
    id: "bootstrap",
    name: "Bootstrap",
    description: "Popular CSS framework with responsive grid and components",
    dependencies: {
      bootstrap: "^5.3.0",
    },
    devDependencies: {},
  },
  {
    id: "bulma",
    name: "Bulma",
    description: "Modern CSS framework based on Flexbox",
    dependencies: {
      bulma: "^1.0.0",
    },
    devDependencies: {},
  },
];

const FRONTEND_TEMPLATE_IDS = new Set([
  "node-nextjs",
  "fullstack-nextjs",
  "monorepo-turbo",
]);

export function hasFrontend(templateId: string): boolean {
  return FRONTEND_TEMPLATE_IDS.has(templateId);
}

export function getStylingOption(id: string): StylingOption | undefined {
  return stylingOptions.find((s) => s.id === id);
}

export function listStylingIds(): string[] {
  return stylingOptions.map((s) => s.id);
}
