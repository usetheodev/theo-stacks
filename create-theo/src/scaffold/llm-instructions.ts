import fs from "node:fs";
import path from "node:path";
import type { TemplateInfo } from "../templates.js";
import type { StylingOption } from "../styling.js";
import type { AddonId } from "../addons.js";

interface LLMInstructionsOptions {
  styling?: StylingOption | null;
  database?: boolean;
  addons?: AddonId[];
}

export function writeLLMInstructions(
  targetDir: string,
  template: TemplateInfo,
  options: LLMInstructionsOptions,
): void {
  const sections: string[] = [];

  sections.push(buildHeader(template));
  sections.push(buildArchitecture(template));
  sections.push(buildDevelopment(template));

  if (options.styling && options.styling.id !== "none") {
    sections.push(buildStylingSection(options.styling));
  }

  if (options.database) {
    sections.push(buildDatabaseSection(template));
  }

  if (options.addons?.includes("redis")) {
    sections.push(buildRedisSection(template));
  }

  if (options.addons?.includes("auth-jwt") || options.addons?.includes("auth-oauth")) {
    sections.push(buildAuthSection(template, options.addons!));
  }

  if (options.addons?.includes("queue")) {
    sections.push(buildQueueSection(template));
  }

  sections.push(buildDeploySection());
  sections.push(buildRules());

  fs.writeFileSync(
    path.join(targetDir, "CLAUDE.md"),
    sections.join("\n"),
  );
}

// --- Section Builders ---

const LANGUAGE_LABELS: Record<string, string> = {
  node: "Node.js (TypeScript/JavaScript)",
  go: "Go",
  python: "Python",
  rust: "Rust",
  java: "Java",
  ruby: "Ruby",
  php: "PHP",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  "node-express": "Express",
  "node-fastify": "Fastify",
  "node-nextjs": "Next.js (App Router)",
  "node-nestjs": "NestJS",
  "node-worker": "Node.js worker",
  "go-api": "net/http (standard library)",
  "python-fastapi": "FastAPI + Uvicorn",
  "rust-axum": "Axum + Tokio",
  "java-spring": "Spring Boot + Gradle",
  "ruby-sinatra": "Sinatra + Puma",
  "php-slim": "Slim Framework",
  "fullstack-nextjs": "Next.js (fullstack with API routes)",
  "monorepo-turbo": "Turborepo (Express API + Next.js frontend)",
  "monorepo-go": "Go Workspaces (API + Worker)",
  "monorepo-python": "uv workspace (FastAPI + Worker)",
  "monorepo-rust": "Cargo workspace (Axum API + Worker)",
  "monorepo-java": "Gradle multi-project (Spring Boot API + Worker)",
  "monorepo-ruby": "Bundler multi-app (Sinatra API + Worker)",
  "monorepo-php": "Composer multi-app (Slim API + Worker)",
};

function buildHeader(template: TemplateInfo): string {
  const lang = LANGUAGE_LABELS[template.language] ?? template.language;
  const framework = FRAMEWORK_LABELS[template.id] ?? template.name;
  const portLine = template.defaultPort
    ? `**Default port:** ${template.defaultPort} (controlled by \`PORT\` env var)\n`
    : "";

  return `# Project Instructions

This project was scaffolded with [create-theo](https://usetheo.dev) using the \`${template.id}\` template.

**Stack:** ${lang} with ${framework}
**Type:** ${template.type}
${portLine}`;
}

function buildArchitecture(template: TemplateInfo): string {
  let content: string;

  switch (template.id) {
    case "node-express":
    case "node-fastify":
      content = `- \`src/index.js\` — application entry point and server setup
- \`src/routes/\` — route handlers
- \`tests/\` — test files
- \`theo.yaml\` — deployment configuration`;
      break;

    case "node-nestjs":
      content = `- \`src/main.ts\` — application bootstrap
- \`src/app.module.ts\` — root module
- \`src/*/\` — feature modules with controller, service, and module files
- \`test/\` — test files
- \`theo.yaml\` — deployment configuration`;
      break;

    case "node-nextjs":
      content = `- \`src/app/\` — Next.js App Router pages and layouts
- \`src/app/api/\` — API route handlers
- \`src/components/\` — React components
- \`public/\` — static assets
- \`theo.yaml\` — deployment configuration`;
      break;

    case "fullstack-nextjs":
      content = `- \`src/app/\` — Next.js App Router pages and layouts
- \`src/app/api/\` — API route handlers (CRUD endpoints)
- \`src/components/\` — React components
- \`public/\` — static assets
- \`theo.yaml\` — deployment configuration`;
      break;

    case "node-worker":
      content = `- \`src/index.js\` — worker entry point with health endpoint
- \`src/worker.js\` — background job processing logic
- \`tests/\` — test files
- \`theo.yaml\` — deployment configuration`;
      break;

    case "go-api":
      content = `- \`main.go\` — application entry point
- \`internal/\` — private application packages
- \`internal/handlers/\` — HTTP handlers
- \`internal/models/\` — data models
- \`theo.yaml\` — deployment configuration`;
      break;

    case "python-fastapi":
      content = `- \`main.py\` — FastAPI application entry point
- \`routes/\` — route modules
- \`models/\` — Pydantic models
- \`requirements.txt\` — Python dependencies
- \`theo.yaml\` — deployment configuration`;
      break;

    case "rust-axum":
      content = `- \`src/main.rs\` — Axum application entry point and router
- \`src/handlers/\` — request handlers
- \`src/models/\` — data structures
- \`Cargo.toml\` — Rust dependencies
- \`theo.yaml\` — deployment configuration`;
      break;

    case "java-spring":
      content = `- \`src/main/java/com/theo/app/\` — application source
- \`src/main/java/com/theo/app/controller/\` — REST controllers
- \`src/main/java/com/theo/app/service/\` — business logic
- \`src/main/java/com/theo/app/entity/\` — JPA entities
- \`src/test/\` — test files
- \`theo.yaml\` — deployment configuration`;
      break;

    case "ruby-sinatra":
      content = `- \`app.rb\` — Sinatra application entry point
- \`routes/\` — route modules
- \`models/\` — data models
- \`Gemfile\` — Ruby dependencies
- \`theo.yaml\` — deployment configuration`;
      break;

    case "php-slim":
      content = `- \`public/index.php\` — application entry point
- \`src/\` — application source and route definitions
- \`composer.json\` — PHP dependencies
- \`theo.yaml\` — deployment configuration`;
      break;

    case "monorepo-turbo":
      content = `- \`apps/api/\` — Express API server
- \`apps/web/\` — Next.js frontend
- \`packages/shared/\` — shared utilities
- \`turbo.json\` — Turborepo pipeline configuration
- \`theo.yaml\` — deployment configuration`;
      break;

    case "monorepo-go":
      content = `- \`apps/api/\` — Go API server
- \`apps/worker/\` — background worker
- \`packages/shared/\` — shared Go package
- \`go.work\` — Go workspace configuration
- \`theo.yaml\` — deployment configuration`;
      break;

    case "monorepo-python":
      content = `- \`apps/api/\` — FastAPI server
- \`apps/worker/\` — background worker
- \`packages/shared/\` — shared Python package
- \`pyproject.toml\` — uv workspace configuration
- \`theo.yaml\` — deployment configuration`;
      break;

    case "monorepo-rust":
      content = `- \`apps/api/\` — Axum API server
- \`apps/worker/\` — background worker
- \`packages/shared/\` — shared crate
- \`Cargo.toml\` — Cargo workspace configuration
- \`theo.yaml\` — deployment configuration`;
      break;

    case "monorepo-java":
      content = `- \`apps/api/\` — Spring Boot API server
- \`apps/worker/\` — background worker
- \`packages/shared/\` — shared library
- \`settings.gradle\` — Gradle multi-project configuration
- \`theo.yaml\` — deployment configuration`;
      break;

    case "monorepo-ruby":
      content = `- \`apps/api/\` — Sinatra API server
- \`apps/worker/\` — background worker
- \`packages/shared/\` — shared Ruby gem
- \`theo.yaml\` — deployment configuration`;
      break;

    case "monorepo-php":
      content = `- \`apps/api/\` — Slim API server
- \`apps/worker/\` — background worker
- \`packages/shared/\` — shared PHP package
- \`composer.json\` — Composer workspace configuration
- \`theo.yaml\` — deployment configuration`;
      break;

    default:
      content = `- See the project root for entry points and configuration
- \`theo.yaml\` — deployment configuration`;
      break;
  }

  return `## Architecture

${content}
`;
}

function buildDevelopment(template: TemplateInfo): string {
  let content: string;

  switch (template.language) {
    case "node":
      if (template.id === "monorepo-turbo") {
        content = `| Task | Command |
|------|---------|
| Dev (all apps) | \`npm run dev\` |
| Build | \`npm run build\` |
| Test | \`npm test\` |
| Lint | \`npm run lint\` |
| Dev single app | \`npx turbo dev --filter=api\` |`;
      } else if (template.id === "node-nestjs") {
        content = `| Task | Command |
|------|---------|
| Dev | \`npm run start:dev\` |
| Build | \`npm run build\` |
| Test | \`npm test\` |
| Lint | \`npm run lint\` |`;
      } else {
        content = `| Task | Command |
|------|---------|
| Dev | \`npm run dev\` |
| Build | \`npm run build\` |
| Test | \`npm test\` |
| Lint | \`npm run lint\` |`;
      }
      break;

    case "go":
      if (template.type === "monorepo") {
        content = `| Task | Command |
|------|---------|
| Run API | \`cd apps/api && go run .\` |
| Run Worker | \`cd apps/worker && go run .\` |
| Build all | \`go build ./...\` |
| Test all | \`go test ./...\` |
| Vet | \`go vet ./...\` |`;
      } else {
        content = `| Task | Command |
|------|---------|
| Run | \`go run .\` |
| Build | \`go build ./...\` |
| Test | \`go test ./...\` |
| Vet | \`go vet ./...\` |`;
      }
      break;

    case "python":
      if (template.type === "monorepo") {
        content = `| Task | Command |
|------|---------|
| Install | \`uv sync\` |
| Run API | \`cd apps/api && uvicorn main:app --reload\` |
| Run Worker | \`cd apps/worker && python main.py\` |
| Test | \`uv run pytest\` |
| Lint | \`ruff check .\` |`;
      } else {
        content = `| Task | Command |
|------|---------|
| Install | \`pip install -r requirements.txt\` |
| Dev | \`uvicorn main:app --reload\` |
| Test | \`pytest\` |
| Lint | \`ruff check .\` |`;
      }
      break;

    case "rust":
      if (template.type === "monorepo") {
        content = `| Task | Command |
|------|---------|
| Run API | \`cargo run -p api\` |
| Run Worker | \`cargo run -p worker\` |
| Build | \`cargo build\` |
| Test | \`cargo test\` |
| Lint | \`cargo clippy\` |`;
      } else {
        content = `| Task | Command |
|------|---------|
| Run | \`cargo run\` |
| Build | \`cargo build\` |
| Test | \`cargo test\` |
| Lint | \`cargo clippy\` |`;
      }
      break;

    case "java":
      if (template.type === "monorepo") {
        content = `| Task | Command |
|------|---------|
| Run API | \`./gradlew :apps:api:bootRun\` |
| Build | \`./gradlew build\` |
| Test | \`./gradlew test\` |`;
      } else {
        content = `| Task | Command |
|------|---------|
| Run | \`./gradlew bootRun\` |
| Build | \`./gradlew build\` |
| Test | \`./gradlew test\` |`;
      }
      break;

    case "ruby":
      if (template.type === "monorepo") {
        content = `| Task | Command |
|------|---------|
| Install | \`bundle install\` |
| Run API | \`cd apps/api && bundle exec ruby app.rb\` |
| Run Worker | \`cd apps/worker && bundle exec ruby worker.rb\` |
| Lint | \`bundle exec rubocop\` |`;
      } else {
        content = `| Task | Command |
|------|---------|
| Install | \`bundle install\` |
| Run | \`bundle exec ruby app.rb\` |
| Lint | \`bundle exec rubocop\` |`;
      }
      break;

    case "php":
      if (template.type === "monorepo") {
        content = `| Task | Command |
|------|---------|
| Install | \`composer install\` |
| Run API | \`cd apps/api && php -S localhost:8000 -t public\` |
| Lint | \`composer lint\` |`;
      } else {
        content = `| Task | Command |
|------|---------|
| Install | \`composer install\` |
| Run | \`php -S localhost:8000 -t public\` |
| Lint | \`composer lint\` |`;
      }
      break;

    default:
      content = `Refer to the project's package manager for available commands.`;
      break;
  }

  return `## Development

${content}
`;
}

function buildStylingSection(styling: StylingOption): string {
  const hints: Record<string, string> = {
    tailwind: `This project uses **Tailwind CSS v4**. Styles are utility-first classes applied directly in JSX. Configuration is done via CSS \`@theme\` directives in \`src/app/globals.css\`, not a \`tailwind.config.js\` file.`,
    shadcn: `This project uses **shadcn/ui** with Tailwind CSS v4. Components are in \`src/components/ui/\`. Add new components with \`npx shadcn@latest add <component>\`. Do not modify files in \`src/components/ui/\` directly — customize via CSS variables in \`src/app/globals.css\`.`,
    daisyui: `This project uses **daisyUI** with Tailwind CSS v4. Use daisyUI component classes (e.g. \`btn\`, \`card\`, \`badge\`) alongside Tailwind utilities.`,
    chakra: `This project uses **Chakra UI**. Import components from \`@chakra-ui/react\`. The app is wrapped in \`<ChakraProvider>\` in \`src/app/providers.js\`.`,
    mantine: `This project uses **Mantine**. Import components from \`@mantine/core\`. The app is wrapped in \`<MantineProvider>\` in the root layout.`,
    bootstrap: `This project uses **Bootstrap 5**. Use Bootstrap utility classes and components. Styles are imported in \`src/app/globals.css\`.`,
    bulma: `This project uses **Bulma**. Use Bulma CSS classes for layout and components. Styles are imported in \`src/app/globals.css\`.`,
  };

  const hint = hints[styling.id];
  if (!hint) return "";

  return `## Styling

${hint}
`;
}

function buildDatabaseSection(template: TemplateInfo): string {
  let content: string;

  switch (template.language) {
    case "node":
      content = `This project uses **Prisma** as the ORM.

- Schema: \`prisma/schema.prisma\`
- Client: \`src/lib/db.js\` (or \`src/lib/db.ts\`)
- Run migrations: \`npx prisma migrate dev\`
- Generate client: \`npx prisma generate\`
- Database URL is configured via \`DATABASE_URL\` in \`.env\``;
      break;

    case "go":
      content = `This project uses **GORM** as the ORM.

- Models: \`internal/models/\`
- Database connection: \`internal/database/\`
- Database URL is configured via \`DATABASE_URL\` environment variable`;
      break;

    case "python":
      content = `This project uses **SQLAlchemy** as the ORM.

- Database setup: \`database.py\`
- Models: \`models.py\`
- Migrations: managed with Alembic (\`alembic upgrade head\`)
- Database URL is configured via \`DATABASE_URL\` in \`.env\``;
      break;

    case "rust":
      content = `This project uses **Diesel** as the ORM.

- Database module: \`src/db.rs\`
- Migrations: \`diesel migration run\`
- Database URL is configured via \`DATABASE_URL\` environment variable`;
      break;

    case "java":
      content = `This project uses **Spring Data JPA**.

- Entities: \`src/main/java/com/theo/app/entity/\`
- Repositories: \`src/main/java/com/theo/app/repository/\`
- Configuration: \`src/main/resources/application.properties\`
- Database URL is configured via \`spring.datasource.url\``;
      break;

    case "ruby":
      content = `This project uses **Sequel** as the ORM.

- Database setup: \`database.rb\`
- Models: \`models/\`
- Database URL is configured via \`DATABASE_URL\` environment variable`;
      break;

    case "php":
      content = `This project uses **Doctrine** as the ORM.

- Database setup: \`src/database.php\`
- Entities: \`src/Entity/\`
- Database URL is configured via \`DATABASE_URL\` environment variable`;
      break;

    default:
      content = `Database is configured via the \`DATABASE_URL\` environment variable.`;
      break;
  }

  return `## Database

${content}
`;
}

function buildRedisSection(template: TemplateInfo): string {
  const locations: Record<string, string> = {
    node: "`src/lib/redis.js`",
    go: "`internal/cache/redis.go`",
    python: "`redis_client.py`",
    rust: "`src/cache.rs`",
    java: "`src/main/java/com/theo/app/config/RedisConfig.java`",
    ruby: "`lib/redis_client.rb`",
    php: "`src/redis.php`",
  };

  const location = locations[template.language] ?? "the source directory";

  return `## Redis

Redis client is configured in ${location}. Connection URL is set via the \`REDIS_URL\` environment variable.
`;
}

function buildAuthSection(template: TemplateInfo, addons: AddonId[]): string {
  const isJwt = addons.includes("auth-jwt");
  const authType = isJwt ? "JWT" : "OAuth 2.0 / OIDC";

  const locations: Record<string, string> = {
    node: isJwt ? "`src/middleware/auth.js`" : "`src/middleware/oauth.js`",
    go: "`internal/middleware/auth.go`",
    python: isJwt ? "`middleware/auth.py`" : "`middleware/oauth.py`",
    rust: "`src/middleware/auth.rs`",
    java: "`src/main/java/com/theo/app/security/`",
    ruby: isJwt ? "`lib/auth.rb`" : "`lib/oauth.rb`",
    php: isJwt ? "`src/Middleware/AuthMiddleware.php`" : "`src/Middleware/OAuthMiddleware.php`",
  };

  const location = locations[template.language] ?? "the middleware directory";

  return `## Authentication

This project uses **${authType}** authentication. The middleware is in ${location}. Apply it to routes that require authentication.
`;
}

function buildQueueSection(template: TemplateInfo): string {
  const locations: Record<string, string> = {
    node: "`src/lib/queue.js`",
    go: "`internal/queue/`",
    python: "`queue_worker.py`",
    php: "`src/queue.php`",
  };

  const location = locations[template.language] ?? "the source directory";

  return `## Queue

Background job queue client is in ${location}. Jobs are backed by Redis. Define job handlers and enqueue jobs using the queue client.
`;
}

function buildDeploySection(): string {
  return `## Deployment

This project is configured for deployment with Theo:

\`\`\`bash
theo login      # authenticate (first time only)
theo deploy     # deploy to production
\`\`\`

The \`theo.yaml\` file contains the deployment configuration. Do not modify \`version\` or \`apps\` structure unless necessary.
`;
}

function buildRules(): string {
  return `## Rules

- Respect the existing project structure — do not reorganize directories
- Use the existing package manager and dependency versions
- Keep the health endpoint (\`GET /health\`) and readiness endpoint (\`GET /ready\`) working
- The \`PORT\` environment variable controls the server port — do not hardcode ports
- Run tests before suggesting changes are complete
- Follow the existing code style (check .prettierrc, eslint config, or language-specific linter config if present)
`;
}
