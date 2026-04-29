# {{project-name}}

Background worker with health endpoint. Created with [Theo](https://usetheo.dev).

## Development

```bash
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Health endpoint port |
| `POLL_INTERVAL_MS` | `5000` | Polling interval in milliseconds |

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
