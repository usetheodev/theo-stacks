# {{project-name}}

Rust monorepo using [Cargo Workspaces](https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html), scaffolded by [Theo](https://usetheo.dev).

## Structure

```
apps/
  api/       — HTTP API server (port 8080)
  worker/    — Background worker (port 8081)
pkg/
  shared/    — Shared utilities
```

## Development

```bash
make run-api       # start the API
make run-worker    # start the worker
make build-all     # build all crates
make test-all      # test all crates
make lint-all      # clippy + fmt check
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
