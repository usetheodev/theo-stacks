<p align="center">
  <a href="https://usetheo.dev">
    <img src="https://usetheo.dev/logo.png" alt="Theo" height="80" />
  </a>
</p>

<h1 align="center">create-theo</h1>

<p align="center">
  Production-ready project scaffolding for Node.js, Go, Python, Rust, Java, Ruby, and PHP.<br/>
  TypeScript-first. Next.js 16. Tailwind v4. Dark mode. Deploy anywhere.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/create-theo"><img src="https://img.shields.io/npm/v/create-theo.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/create-theo"><img src="https://img.shields.io/npm/dm/create-theo.svg" alt="monthly downloads" /></a>
  <a href="https://github.com/usetheodev/theo-stacks/blob/main/LICENSE"><img src="https://img.shields.io/github/license/usetheodev/theo-stacks.svg" alt="license" /></a>
</p>

<p align="center">
  <code>npm create theo@latest</code>
</p>

---

## Quick Start

```bash
npm create theo@latest
cd my-project
npm run dev
```

Pick a stack, answer a few prompts, start building. Deploy to any platform — [Theo](https://usetheo.dev), Docker, Railway, Fly.io, or your own infra.

### Other package managers

The CLI auto-detects your package manager and adapts all commands accordingly.

```bash
# pnpm
pnpm create theo

# yarn
yarn create theo

# bun
bun create theo
```

## Templates

### API / Backend

| Template | Stack | Default Port |
|----------|-------|:------------:|
| `node-express` | Node.js + Express | 3000 |
| `node-fastify` | Node.js + Fastify | 3000 |
| `node-nestjs` | NestJS (TypeScript) | 3000 |
| `go-api` | Go stdlib (net/http) | 8080 |
| `python-fastapi` | Python + FastAPI | 8000 |
| `rust-axum` | Rust + Axum + Tokio | 8080 |
| `java-spring` | Java + Spring Boot | 8080 |
| `ruby-sinatra` | Ruby + Sinatra + Puma | 4567 |
| `php-slim` | PHP + Slim Framework | 8000 |

### Frontend / Fullstack

| Template | Stack | Type | Default Port |
|----------|-------|------|:------------:|
| `node-nextjs` | Next.js 16 (App Router, TypeScript) | Frontend / SSR | 3000 |
| `fullstack-nextjs` | Next.js 16 + API Routes (TypeScript) | Fullstack | 3000 |

### Monorepo

| Template | Stack | Apps | Ports |
|----------|-------|------|:-----:|
| `monorepo-turbo` | Turborepo (Express + Next.js) | API + Web | 3001 / 3002 |
| `monorepo-go` | Go Workspaces | API + Worker | 8080 / 8081 |
| `monorepo-python` | uv Workspace (FastAPI + Worker) | API + Worker | 8000 / 8001 |
| `monorepo-rust` | Cargo Workspaces (Axum + Tokio) | API + Worker | 8080 / 8081 |
| `monorepo-java` | Gradle multi-project (Spring Boot) | API + Worker | 8080 / 8081 |
| `monorepo-ruby` | Bundler (Sinatra + WEBrick) | API + Worker | 4567 / 4568 |
| `monorepo-php` | Composer (Slim + CLI) | API + Worker | 8000 / 8001 |

### Worker

| Template | Stack | Default Port |
|----------|-------|:------------:|
| `node-worker` | Node.js | 3000 |

### External Templates

Use any GitHub repository as a template:

```bash
npm create theo@latest my-app --template user/repo
npm create theo@latest my-app --template user/repo#branch
```

Every template is production-ready out of the box: CORS, structured JSON logging, error handling, graceful shutdown, health endpoints (`GET /health` + `GET /ready`), Dockerfile, linting, example test, and a CI workflow.

## CLI Options

| Flag | Description |
|------|-------------|
| `--template`, `-t` | Skip template prompt (`node-express`, `go-api`, `php-slim`, `user/repo`, etc.) |
| `--styling`, `-s` | Styling for frontend templates (`tailwind`, `shadcn`, `daisyui`, etc.) |
| `--database`, `-d` | Add PostgreSQL with ORM (Prisma, GORM, SQLAlchemy, Diesel, Spring Data JPA, Sequel, or Doctrine) |
| `--add`, `-a` | Add modules: `redis`, `auth-jwt`, `auth-oauth`, `queue` (comma-separated) |
| `--dry-run` | Preview what would be created without writing any files |
| `--verbose`, `-v` | Show detailed output during scaffolding |
| `--help` | Show help |

```bash
# Interactive (prompts for everything)
npm create theo@latest

# Non-interactive
npm create theo@latest my-api --template go-api

# With database + modules
npm create theo@latest my-app -t node-express -d --add redis,auth-jwt

# Full stack: database + Redis + Auth + Queue
npm create theo@latest my-app -t node-express -d --add redis,auth-jwt,queue

# Frontend with Tailwind + shadcn/ui
npm create theo@latest my-app -t node-nextjs -s shadcn

# Preview without creating files
npm create theo@latest my-app -t node-express -d --add redis --dry-run

# External GitHub template
npm create theo@latest my-app -t user/repo

# CI mode (no prompts, no install, no git init)
CI=true npx create-theo my-app --template node-express
```

## Frontend Templates

Frontend templates (`node-nextjs`, `fullstack-nextjs`, `monorepo-turbo`) are TypeScript-first and include modern tooling out of the box:

| Feature | Implementation |
|---------|---------------|
| **TypeScript** | `.tsx`/`.ts` throughout, strict mode (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`), `@/*` path aliases |
| **React 19.2** | Latest stable with Server Components support |
| **Next.js 16** | App Router, Turbopack (default), proxy.ts, standalone output |
| **Tailwind CSS v4** | `@import "tailwindcss"` — zero config, no `tailwind.config.js` |
| **ESLint** | ESM flat config (`eslint.config.mjs`) with `eslint-config-next/core-web-vitals` + `typescript` rules |
| **Dark mode** | ThemeProvider with `next-themes`, system preference detection |
| **shadcn/ui ready** | `components.json` (radix-nova style) — run `npx shadcn add button` |
| **`cn()` utility** | `lib/utils.ts` with `clsx` + `tailwind-merge` |
| **Prettier** | `prettier-plugin-tailwindcss` with `tailwindStylesheet` + `tailwindFunctions` for class sorting in `cn()`/`cva()` |
| **Type checking** | `npm run typecheck` via `tsc --noEmit` |
| **Node.js** | `engines.node >= 20.9` declared (Next.js 16 requirement) |

### Project structure (node-nextjs)

```
my-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with ThemeProvider
│   │   ├── page.tsx            # Home page
│   │   ├── error.tsx           # Error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   └── api/
│   │       ├── health/route.ts # Liveness probe
│   │       └── ready/route.ts  # Readiness probe
│   ├── proxy.ts                # Request logging (Next.js 16 proxy)
│   └── instrumentation.ts     # Logger + graceful shutdown
├── components/
│   └── theme-provider.tsx      # Dark mode provider
├── lib/
│   └── utils.ts                # cn() utility
├── hooks/                      # Custom hooks (empty, ready to use)
├── components.json             # shadcn/ui CLI config (radix-nova)
├── eslint.config.mjs           # ESLint flat config (Next.js + TypeScript rules)
├── tsconfig.json               # TypeScript strict with @/* aliases
├── next.config.mjs             # ESM config, standalone output
├── .prettierrc                 # Tailwind class sorting + tailwindStylesheet
├── Dockerfile                  # Production-optimized
└── theo.yaml                   # Deploy config
```

### Monorepo structure (monorepo-turbo)

```
my-mono/
├── apps/
│   ├── api/                    # Express API (JavaScript)
│   └── web/                    # Next.js 16 frontend (TypeScript)
├── packages/
│   ├── shared/                 # Shared utilities (TypeScript)
│   ├── eslint-config/          # Centralized ESLint config
│   └── typescript-config/      # Centralized TypeScript config (base + nextjs)
├── turbo.json                  # Build orchestration + caching
└── package.json                # npm workspaces root
```

## Styling

Pass `--styling` to choose a CSS framework for frontend templates. Applied at scaffold time with full configuration.

| Option | What you get |
|--------|-------------|
| `none` | Plain CSS (default) |
| `tailwind` | Tailwind CSS v4 with `@tailwindcss/postcss` |
| `shadcn` | Tailwind v4 + shadcn/ui (OKLCH colors, dark mode, `@theme inline`, `tw-animate-css`) |
| `daisyui` | Tailwind v4 + daisyUI component classes |
| `chakra` | Chakra UI with emotion + ChakraProvider |
| `mantine` | Mantine with PostCSS preset + MantineProvider |
| `bootstrap` | Bootstrap 5 |
| `bulma` | Bulma CSS |

### shadcn/ui integration

When you choose `shadcn`, the template comes fully configured:

```bash
# Scaffold with shadcn
npm create theo@latest my-app -t node-nextjs -s shadcn

# Then add components
cd my-app
npx shadcn add button
npx shadcn add card dialog
```

The generated `globals.css` includes a complete OKLCH color system with 44 CSS custom properties for light and dark modes, mapped to Tailwind utilities via `@theme inline`.

## Add-on Modules

Composable modules added at scaffold time via `--add` or interactive checkbox prompt.

| Module | What it generates | Languages |
|--------|-------------------|-----------|
| `redis` | Redis client + connection helper + docker-compose service | Node.js, Go, Python, Rust, Java, Ruby, PHP |
| `auth-jwt` | JWT middleware + token generation helpers | Node.js, Go, Python, Rust, Java, Ruby, PHP |
| `auth-oauth` | OAuth/OIDC token validation middleware | Node.js, Go, Python, Rust, Java, Ruby, PHP |
| `queue` | Job queue + worker setup (auto-includes Redis) | Node.js (BullMQ), Go (Asynq), Python (arq), PHP (Symfony Messenger) |

`auth-jwt` and `auth-oauth` are mutually exclusive — pick one or the other.

### Generated per language

| Module | Node.js | Go | Python | Rust | Java | Ruby | PHP |
|--------|---------|-----|--------|------|------|------|-----|
| Redis | ioredis | go-redis | redis-py | redis crate | Spring Data Redis | redis gem | Predis |
| Auth JWT | jsonwebtoken | golang-jwt | pyjwt | jsonwebtoken crate | JJWT | ruby-jwt | firebase/php-jwt |
| Auth OAuth | openid-client | go-oidc | authlib | openidconnect | Spring OAuth2 | omniauth | Guzzle |
| Queue | BullMQ | Asynq | arq | — | — | — | Symfony Messenger |

## Database

Pass `--database` to get a fully configured database layer:

| Language | ORM | What you get |
|----------|-----|-------------|
| Node.js | Prisma | Schema, client, migration scripts |
| Go | GORM | Connection helper, User model |
| Python | SQLAlchemy | Engine, session, User model |
| Rust | Diesel | Connection helper, config |
| Java | Spring Data JPA | Entity, Repository, auto-DDL |
| Ruby | Sequel | Connection, User model |
| PHP | Doctrine DBAL | Connection helper |

All database setups include:
- `docker-compose.yml` with Postgres 16 (healthcheck, persistent volume)
- `.env` pre-configured for local development
- Ready to run: `docker compose up -d`

When combined with `--add redis`, both Postgres and Redis appear in the same `docker-compose.yml`.

## What's Included in Every Template

| Feature | Implementation |
|---------|---------------|
| **CORS** | Language-native middleware (cors, CORSMiddleware, tower-http, etc.) |
| **Structured logging** | JSON output (pino, slog, logging, tracing, Logback, etc.) |
| **Error handling** | Central middleware + 404 handler |
| **Graceful shutdown** | SIGTERM/SIGINT handlers with timeout |
| **Health check** | `GET /health` — liveness probe |
| **Readiness check** | `GET /ready` — readiness probe (customize for dependency checks) |
| **Dockerfile** | Production-optimized, multi-stage where applicable |
| **`.dockerignore`** | Language-specific exclusions |
| **Example test** | Health endpoint test (Jest, Go testing, pytest, cargo test, JUnit, Minitest, PHPUnit) |
| **Linting** | ESLint, go vet, ruff, clippy, Spotless, RuboCop, PHPStan |
| **CI** | GitHub Actions workflow |
| **`theo.yaml`** | Project config for deployment (apps, framework, ports) |

## Package Manager Detection

The CLI auto-detects which package manager invoked it and adapts:

| Package Manager | Detection | Install flags |
|----------------|-----------|--------------|
| npm | Default | `--no-fund --no-audit --loglevel=error` |
| pnpm | `npm_config_user_agent` | Standard |
| yarn | `npm_config_user_agent` | `--no-fund` |
| bun | `npm_config_user_agent` or runtime | Standard |

Output instructions adapt automatically (e.g., `pnpm run dev` instead of `npm run dev`). Install noise (funding, audit, ads) is suppressed for a clean experience.

## Preview Mode

Preview what a scaffold would create without writing any files:

```bash
npm create theo@latest my-app -t node-express -d --add redis,auth-jwt --dry-run
```

```
  Dry run — no files will be created

  Project:  my-app
  Template: Node.js — Express
  Database: PostgreSQL (Prisma)
  Modules:  Redis, Auth (JWT)

  Files that would be created in ./my-app/

    .dockerignore
    .env
    .env.example
    .github/workflows/ci.yml
    .gitignore
    Dockerfile
    README.md
    docker-compose.yml
    package.json
    prisma/schema.prisma
    src/index.js
    src/lib/db.js
    src/lib/queue.js
    src/lib/redis.js
    src/middleware/auth.js
    tests/health.test.js
    theo.yaml

  Total: 17 files
```

## Why create-theo?

- **Production-ready from day one.** CORS, structured logging, error handling, graceful shutdown, Dockerfile, tests, linting — the things every project needs but nobody wants to configure.
- **One CLI, 7 languages.** Node.js, Go, Python, Rust, Java, Ruby, PHP — same experience. Pick your language and get a real project, not a toy.
- **TypeScript-first frontend.** React 19.2, Next.js 16, Tailwind v4, ESLint with Next.js rules, dark mode, shadcn/ui ready. Not a 2022 starter kit.
- **Package-manager agnostic.** Lock files are removed after scaffold — use npm, pnpm, yarn, or bun freely.
- **Composable modules.** Add Redis, JWT auth, or job queues with a flag. Get working code with docker-compose, not boilerplate stubs.
- **Database-ready.** Pass `--database` and get a connected ORM, docker-compose with Postgres, and migration scripts.
- **Kubernetes-native.** Every template ships with `/health` and `/ready` probes, Dockerfile, and graceful shutdown.
- **Deploy anywhere.** Every template works with [Theo](https://usetheo.dev), Docker, Railway, Fly.io, or any container platform. No vendor lock-in.
- **Smart CLI.** Auto-detects your package manager, supports `--dry-run` preview, `--verbose` debugging, external GitHub templates, and directory overwrite confirmation.

## Prerequisites

- **Node.js 20.9+** (required to run `create-theo` and Next.js 16 templates)
- **Docker** (optional, for local database/Redis via docker-compose)
- **[Theo CLI](https://usetheo.dev)** (optional, for one-command deploy to Kubernetes)

## Contributing

We welcome contributions! Whether it's a new template, a module, a bug fix, or documentation improvement.

### Adding a template

1. Create `templates/<template-id>/` with all required files
2. Include `theo.yaml`, `Dockerfile`, `dockerignore` (without dot), `gitignore` (without dot), and `README.md`
3. Implement `GET /health`, `GET /ready`, `PORT` env support
4. Add CORS, structured JSON logging, error handling, and graceful shutdown
5. Add linting config and at least one example test
6. Use `{{project-name}}` as the placeholder everywhere the project name appears
7. Register it in `create-theo/src/templates.ts`
8. Run the validation suite:

```bash
cd create-theo && npm install && npm test
bash scripts/validate-templates.sh
```

### Development

```bash
# Install and build the CLI
cd create-theo && npm install && npm run build

# Run tests (205 tests across 12 suites)
npm test

# Stub mode (fast rebuild during development)
npm run dev

# Check that shared configs haven't drifted between frontend templates
bash scripts/check-consistency.sh

# Full smoke test (scaffolds all 19 templates, verifies structure)
bash scripts/validate-templates.sh
```

## Examples

The `examples/` directory contains scaffolded projects generated by the CLI — base templates + variants with addons (database, Redis, auth, queue). Browse them to see exactly what `create-theo` generates.

## License

[MIT](./LICENSE)
