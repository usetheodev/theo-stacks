# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

---

## What This Project Is

**theo-monorepos** is the starter template repository for [Theo](https://usetheo.dev) — a CLI-first Kubernetes PaaS. It contains:

1. **`templates/`** — 8 ready-to-deploy project templates covering Node.js, Go, Python, monorepos, and fullstack
2. **`create-theo/`** — An npm scaffolding CLI (`npm create theo@latest`) that lets users pick a template and get a deployable project instantly
3. **`scripts/`** — Validation tooling to ensure all templates work correctly

The goal: `npm create theo@latest` → choose stack → `theo deploy` → live URL in under 5 minutes. Zero Kubernetes knowledge required.

---

## Development Commands

```bash
# create-theo CLI
cd create-theo && npm install     # Install dependencies
cd create-theo && npm run build   # Copy templates + compile TypeScript
cd create-theo && npm test        # Run all tests (Jest, 29 tests)
cd create-theo && npm run dev     # TypeScript watch mode

# Validation
bash scripts/validate-templates.sh   # Scaffold + validate all 8 templates

# Test a template manually
cd templates/node-express && npm install && PORT=4100 node src/index.js
cd templates/go-api && GOWORK=off go run .
cd templates/python-fastapi && uvicorn main:app --port 4103
```

**Prerequisites:** Node.js 18+, Go 1.22+ (for go-api template testing), Python 3.10+ (for python-fastapi template testing)

---

## The Rules (Non-Negotiable)

### Rule 1: Every template must be deployable
A template that doesn't work with `theo deploy` out of the box is broken. No exceptions.

### Rule 2: Template requirements checklist
Every template MUST have:
- `theo.yaml` with `version: 1` and `{{project-name}}` placeholder
- `GET /health` endpoint returning `{ "status": "ok" }`
- `PORT` environment variable support
- `.gitignore` with sensible defaults
- `README.md` with install + dev + deploy instructions
- Minimal dependencies — nothing unnecessary

### Rule 3: Placeholder is `{{project-name}}`
This is the only placeholder. It appears in `theo.yaml`, `package.json`, `go.mod`, `README.md`, and anywhere the project name is referenced. The scaffold engine replaces ALL occurrences. Never introduce a second placeholder format.

### Rule 4: Templates are standalone
Each template must work independently. No shared dependencies between templates. No symlinks. No imports from other templates. Copy is always safe.

### Rule 5: Registry must match filesystem
Every directory in `templates/` must have a corresponding entry in `create-theo/src/templates.ts`. The validation script catches drift. If you add a template directory, add it to the registry. If you remove one, remove it from the registry.

### Rule 6: Tests before shipping
The `create-theo` CLI has unit tests. Any new feature or template must have corresponding test coverage. Run `npm test` before considering work done.

### Rule 7: Node compatibility
Use `fileURLToPath(import.meta.url)` instead of `import.meta.dirname` for Node 18 compatibility. The CLI must work on Node 18, 20, and 22.

---

## Repository Structure

```
theo-monorepos/
├── CLAUDE.md                          ← you are here
├── README.md                          ← user-facing documentation
├── ROADMAP.md                         ← implementation roadmap with status
├── templates/                         ← source of truth for all templates
│   ├── node-express/                  ← Express.js API (port 3000)
│   ├── node-fastify/                  ← Fastify API (port 3000)
│   ├── node-nextjs/                   ← Next.js App Router (frontend, SSR)
│   ├── go-api/                        ← Go stdlib net/http (port 8080)
│   ├── python-fastapi/                ← FastAPI + Uvicorn (port 8000)
│   ├── monorepo-turbo/                ← Turborepo: Express API + Next.js + shared
│   ├── fullstack-nextjs/              ← Next.js with API routes + CRUD
│   └── node-nestjs/                   ← NestJS with modules (TypeScript)
├── create-theo/                       ← npm scaffolding CLI
│   ├── package.json                   ← name: "create-theo"
│   ├── tsconfig.json                  ← TypeScript strict, ESM, Node16
│   ├── jest.config.js                 ← Jest + ts-jest ESM config
│   ├── .npmignore                     ← excludes src/, tests/ from publish
│   ├── src/
│   │   ├── index.ts                   ← entrypoint (#!/usr/bin/env node)
│   │   ├── prompts.ts                 ← @inquirer/prompts interactive flow
│   │   ├── scaffold.ts               ← copy + placeholder replacement + git init
│   │   ├── templates.ts              ← template registry (8 entries)
│   │   ├── validate.ts               ← RFC 1123 project name validation
│   │   └── output.ts                 ← post-scaffold success message
│   ├── scripts/
│   │   └── copy-templates.js          ← prebuild: copies templates/ into package
│   └── tests/
│       ├── validate.test.ts           ← 14 tests: name sanitization + validation
│       ├── scaffold.test.ts           ← 9 tests: file creation, placeholder replacement
│       └── templates.test.ts          ← 6 tests: registry integrity
└── scripts/
    └── validate-templates.sh          ← end-to-end validation of all templates
```

---

## Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| create-theo CLI | TypeScript + @inquirer/prompts | Interactive project scaffolding |
| Build | tsc (TypeScript 5.6+) | Compile to ESM |
| Tests | Jest + ts-jest | Unit tests (29 tests, 3 suites) |
| Validation | Bash script | E2E template verification |
| Templates | JS, TS, Go, Python | Starter projects for Theo users |

---

## Template Details

| Template | Language | Framework | Type | Port | Key Files |
|----------|----------|-----------|------|------|-----------|
| node-express | Node.js | Express 4 | server | 3000 | `src/index.js` |
| node-fastify | Node.js | Fastify 5 | server | 3000 | `src/index.js` |
| node-nextjs | Node.js | Next.js 14 | frontend | 3000 | `src/app/page.js`, `next.config.js` |
| go-api | Go | net/http (stdlib) | server | 8080 | `main.go`, `go.mod` |
| python-fastapi | Python | FastAPI + Uvicorn | server | 8000 | `main.py`, `requirements.txt` |
| monorepo-turbo | Node.js | Turborepo + Express + Next.js | multi | 3001/3002 | `turbo.json`, `apps/`, `packages/` |
| fullstack-nextjs | Node.js | Next.js 14 | frontend | 3000 | `src/app/api/items/route.js` |
| node-nestjs | TypeScript | NestJS 10 | server | 3000 | `src/main.ts`, `src/app.module.ts` |

---

## Scaffold Flow

```
npm create theo@latest
    │
    ├─ parseArgs: --template, --name, --help
    ├─ promptUser: project name + template selection
    ├─ scaffold:
    │   ├─ copy template dir → target dir
    │   ├─ replace {{project-name}} in all text files
    │   ├─ git init
    │   └─ npm install (Node templates only)
    └─ printSuccess: next steps output
```

**CI mode:** When `CI=true`, requires `--template` and project name as positional arg. No prompts, no install, no git init.

---

## Common Mistakes — Read Before Coding

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Using `import.meta.dirname` | Breaks on Node 18 | Use `fileURLToPath` + `path.dirname` |
| Adding template without registry entry | `create-theo` doesn't list it | Add to `create-theo/src/templates.ts` |
| Template without `{{project-name}}` in theo.yaml | Scaffold generates broken config | Always use placeholder |
| Go template with bare module name | `go.mod` parse error | Use `example.com/{{project-name}}` |
| Leaving `node_modules/` in templates | Bloats npm package | Templates must be clean; `.gitignore` covers this |
| Running Go templates inside main Theo repo | `go.work` conflict | Use `GOWORK=off` when testing locally |
| Template with hardcoded port | Breaks Theo deploy | Always read `process.env.PORT` / `os.Getenv("PORT")` |

---

## Relationship to Main Theo Repo

This is a **subproject** within the Theo monorepo (`theo/theo-monorepos/`). It is a parallel track — does not block or depend on the main sprint plan (hardening sprints, CLI features, etc.).

The only dependency is that `theo deploy` works end-to-end, which has been validated since Sprint 2.

Templates here mirror what `theo-packs` can auto-detect and build Dockerfiles for: Node.js, Go, Python, and static files. If a new language pack is added to `theo-packs`, a corresponding template should be added here.

---

## Adding a New Template

1. Create `templates/<template-id>/` with all required files (see Rule 2)
2. Use `{{project-name}}` placeholder everywhere the project name appears
3. Add entry to `create-theo/src/templates.ts` with id, name, description, language, defaultPort
4. Update help text in `create-theo/src/index.ts`
5. Update template count in `create-theo/tests/templates.test.ts`
6. Run `cd create-theo && npm run build && npm test`
7. Run `bash scripts/validate-templates.sh` — must pass 100%
8. Update `README.md` template table
