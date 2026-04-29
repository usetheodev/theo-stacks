# {{project-name}}

Python monorepo using [uv workspaces](https://docs.astral.sh/uv/), scaffolded by [Theo](https://usetheo.dev).

## Structure

```
apps/
  api/       — FastAPI server (port 8000)
  worker/    — Background worker (port 8001)
packages/
  shared/    — Shared utilities
```

## Development

```bash
uv sync                                        # install all packages
uv run --package api uvicorn main:app --port 8000  # start API
uv run --package worker python worker.py          # start worker
```

## Deploy

```bash
theo deploy
```

## Build

This template does not ship a Dockerfile. The Theo build pipeline runs [theo-packs](https://github.com/usetheodev/theo-packs) which detects the language/framework and generates an optimized Dockerfile at deploy time.

If you fork this template and want to deploy outside Theo:
- Run `theopacks-generate` yourself to produce a Dockerfile, or
- Write your own Dockerfile and use a non-theo-packs build path.

Committing a `Dockerfile` inside this template directory will cause `theopacks-generate` to **reject the build** (exit code 2). The contract is single-source-of-truth — one place generates Dockerfiles.
