# {{project-name}}

Turborepo monorepo with API + Web. Created with [Theo](https://usetheo.dev).

## Structure

```
apps/
  api/   — Express API server (port 3001)
  web/   — Next.js frontend
packages/
  shared/ — Shared utilities
```

## Development

```bash
npm install
npm run dev
```

## Deploy

```bash
theo login
theo deploy
```

## Build

This template does not ship a Dockerfile. The Theo build pipeline runs [theo-packs](https://github.com/usetheodev/theo-packs) which detects the language/framework and generates an optimized Dockerfile at deploy time.

If you fork this template and want to deploy outside Theo:
- Run `theopacks-generate` yourself to produce a Dockerfile, or
- Write your own Dockerfile and use a non-theo-packs build path.

Committing a `Dockerfile` inside this template directory will cause `theopacks-generate` to **reject the build** (exit code 2). The contract is single-source-of-truth — one place generates Dockerfiles.
