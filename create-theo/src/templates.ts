export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  language: "node" | "go" | "python";
  defaultPort: number | null;
}

export const templates: TemplateInfo[] = [
  {
    id: "node-express",
    name: "Node.js — Express",
    description: "Minimal Express.js API server",
    language: "node",
    defaultPort: 3000,
  },
  {
    id: "node-fastify",
    name: "Node.js — Fastify",
    description: "Minimal Fastify API server",
    language: "node",
    defaultPort: 3000,
  },
  {
    id: "node-nextjs",
    name: "Next.js",
    description: "Next.js app with App Router (standalone output)",
    language: "node",
    defaultPort: 3000,
  },
  {
    id: "go-api",
    name: "Go — API",
    description: "Go API using the standard library (net/http)",
    language: "go",
    defaultPort: 8080,
  },
  {
    id: "python-fastapi",
    name: "Python — FastAPI",
    description: "FastAPI + Uvicorn API server",
    language: "python",
    defaultPort: 8000,
  },
  {
    id: "monorepo-turbo",
    name: "Monorepo — Turborepo",
    description: "Turborepo with Express API + Next.js frontend + shared package",
    language: "node",
    defaultPort: null,
  },
  {
    id: "fullstack-nextjs",
    name: "Fullstack — Next.js",
    description: "Next.js fullstack with API routes and CRUD example",
    language: "node",
    defaultPort: 3000,
  },
  {
    id: "node-nestjs",
    name: "Node.js — NestJS",
    description: "NestJS API with modular architecture",
    language: "node",
    defaultPort: 3000,
  },
];

export function getTemplate(id: string): TemplateInfo | undefined {
  return templates.find((t) => t.id === id);
}

export function listTemplateIds(): string[] {
  return templates.map((t) => t.id);
}
