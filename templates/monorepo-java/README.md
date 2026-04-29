# {{project-name}}

Java monorepo using [Gradle multi-project builds](https://docs.gradle.org/current/userguide/multi_project_builds.html), scaffolded by [Theo](https://usetheo.dev).

## Structure

```
apps/
  api/       — Spring Boot HTTP API server (port 8080)
  worker/    — Spring Boot background worker (port 8081)
packages/
  shared/    — Shared Java library
```

## Development

```bash
./gradlew :apps:api:bootRun         # start the API
./gradlew :apps:worker:bootRun      # start the worker
./gradlew build                      # build all subprojects
./gradlew test                       # run all tests
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
