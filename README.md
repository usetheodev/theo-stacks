# theo-monorepos

Starter templates for [Theo](https://usetheo.dev) — deploy any stack in under 5 minutes.

## Quick Start

```bash
npm create theo@latest
cd my-project
theo login
theo deploy
```

## Templates

| Template | Stack | Type |
|----------|-------|------|
| `node-express` | Node.js + Express | API server |
| `node-fastify` | Node.js + Fastify | API server |
| `node-nextjs` | Next.js (App Router) | Frontend (SSR) |
| `go-api` | Go + net/http (stdlib) | API server |
| `python-fastapi` | Python + FastAPI + Uvicorn | API server |
| `monorepo-turbo` | Turborepo (Express API + Next.js) | Monorepo |
| `fullstack-nextjs` | Next.js with API routes + CRUD | Fullstack |
| `node-nestjs` | NestJS with modules | API server |

## CLI Flags

```bash
# Interactive (prompts for name and template)
npm create theo@latest

# Non-interactive
npm create theo@latest my-app --template node-express

# CI mode (requires both flags)
CI=true npx create-theo my-app --template go-api
```

## Using a Template Directly

Each template is a standalone project. Copy one and deploy:

```bash
cp -r templates/node-express my-project
cd my-project
# Edit theo.yaml — set your project name
theo login
theo deploy
```

## Template Requirements

Every template follows these rules:

1. `theo.yaml` with `version: 1` and valid project config
2. `GET /health` endpoint returning `{ "status": "ok" }`
3. Respects `PORT` environment variable
4. `.gitignore` with sensible defaults
5. Deployable with `theo deploy` — zero config needed
6. Minimal dependencies — nothing unnecessary

## Validation

```bash
bash scripts/validate-templates.sh
```

Scaffolds every template, verifies structure, and checks for unreplaced placeholders.

## Contributing a Template

1. Create a directory under `templates/`
2. Follow the template requirements above
3. Use `{{project-name}}` as placeholder in `theo.yaml`, `package.json`, `go.mod`
4. Add a `README.md` with: install, dev, deploy instructions
5. Add template to `create-theo/src/templates.ts`
6. Run `bash scripts/validate-templates.sh` — must pass
