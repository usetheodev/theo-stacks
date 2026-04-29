# {{project-name}}

Ruby monorepo using [Bundler](https://bundler.io/) with multiple apps, scaffolded by [Theo](https://usetheo.dev).

## Structure

```
apps/
  api/       — Sinatra HTTP API (port 4567)
  worker/    — Background worker (port 4568)
packages/
  shared/    — Shared utilities
```

## Development

```bash
bundle install        # install dependencies
rake api              # start the API
rake worker           # start the worker
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
