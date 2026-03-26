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
