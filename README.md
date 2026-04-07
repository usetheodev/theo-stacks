<p align="center">
  <a href="https://usetheo.dev">
    <img src="https://usetheo.dev/logo.png" alt="Theo" height="80" />
  </a>
</p>

<h1 align="center">create-theo</h1>

<p align="center">
  Production-ready project scaffolding for Node.js, Go, Python, Rust, Java, Ruby, and PHP. Deploy anywhere.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/create-theo"><img src="https://img.shields.io/npm/v/create-theo.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/create-theo"><img src="https://img.shields.io/npm/dm/create-theo.svg" alt="monthly downloads" /></a>
  <a href="https://github.com/usetheodev/theo-monorepos/blob/main/LICENSE"><img src="https://img.shields.io/github/license/usetheodev/theo-monorepos.svg" alt="license" /></a>
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

```bash
# yarn
yarn create theo

# pnpm
pnpm create theo

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
| `node-nextjs` | Next.js (App Router) | Frontend / SSR | 3000 |
| `fullstack-nextjs` | Next.js + API Routes | Fullstack | 3000 |

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

Every template is production-ready out of the box: CORS, structured JSON logging, error handling, graceful shutdown, health endpoints (`GET /health` + `GET /ready`), Dockerfile, linting, example test, and a CI workflow.

## CLI Options

| Flag | Description |
|------|-------------|
| `--template`, `-t` | Skip template prompt (`node-express`, `go-api`, `php-slim`, etc.) |
| `--styling`, `-s` | Styling for frontend templates (`tailwind`, `shadcn`, `daisyui`, etc.) |
| `--database`, `-d` | Add PostgreSQL with ORM (Prisma, GORM, SQLAlchemy, Diesel, Spring Data JPA, Sequel, or Doctrine) |
| `--add`, `-a` | Add modules: `redis`, `auth-jwt`, `auth-oauth`, `queue` (comma-separated) |
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

# With OAuth/OIDC instead of JWT
npm create theo@latest my-app -t go-api --add auth-oauth

# PHP with all addons
npm create theo@latest my-app -t php-slim -d --add redis,auth-jwt,queue

# CI mode (no prompts, no install, no git init)
CI=true npx create-theo my-app --template node-express
```

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

Framework-specific variants: Fastify uses `src/plugins/auth.js` with fastify-plugin, NestJS uses `src/guards/auth.guard.ts` with `@Injectable`.

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
| **`theo.yaml`** | Project config with standardized `commands` section |

### `theo.yaml` Commands

Every template includes a `commands` section in `theo.yaml` — standardized wrappers that abstract language-specific tooling:

```yaml
commands:
  dev: "npm run dev"        # Start development server
  build: "npm run build"    # Build for production
  test: "npm test"          # Run tests
  lint: "npm run lint"      # Run linter
  format: "npm run format"  # Format code
  security: "npm audit"     # Security audit
```

| Command | Node.js | Go | Python | Rust | Java | Ruby | PHP |
|---------|---------|-----|--------|------|------|------|-----|
| `security` | `npm audit` | `govulncheck` | `pip-audit` | `cargo audit` | `dependencyCheckAnalyze` | `bundle audit` | `composer audit` |

Monorepo templates include per-app commands under each app definition.

## Why create-theo?

- **Production-ready from day one.** CORS, structured logging, error handling, graceful shutdown, Dockerfile, tests, linting — the things every project needs but nobody wants to configure. Not hello world.
- **One CLI, 7 languages.** Node.js, Go, Python, Rust, Java, Ruby, PHP — same experience. Pick your language and get a real project, not a toy.
- **Composable modules.** Add Redis, JWT auth, or job queues with a flag. Get working code with docker-compose, not boilerplate stubs.
- **Database-ready.** Pass `--database` and get a connected ORM, docker-compose with Postgres, and migration scripts.
- **Kubernetes-native.** Every template ships with `/health` (liveness) and `/ready` (readiness) probes, Dockerfile, and graceful shutdown.
- **Deploy anywhere.** Every template works with [Theo](https://usetheo.dev), Docker, Railway, Fly.io, or any container platform. No vendor lock-in.

## Prerequisites

- **Node.js 18+** (required to run `create-theo`)
- **Docker** (optional, for local database/Redis via docker-compose)
- **[Theo CLI](https://usetheo.dev)** (optional, for one-command deploy to Kubernetes)

## Contributing

We welcome contributions! Whether it's a new template, a module, a bug fix, or documentation improvement.

### Adding a template

1. Create `templates/<template-id>/` with all required files
2. Include `theo.yaml` (with `commands` section), `Dockerfile`, `dockerignore` (without dot), `gitignore` (without dot), and `README.md`
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

# Run tests (184 tests across 11 suites)
npm test

# Watch mode
npm run dev

# Full smoke test (requires all runtimes)
bash scripts/test-all-templates.sh
```

## Examples

The `examples/` directory contains 29 scaffolded projects generated by the CLI — 19 clean templates + 10 with addons (database, Redis, auth, queue). Browse them to see exactly what `create-theo` generates.

## License

[MIT](./LICENSE)
