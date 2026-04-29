# BREAKING: remove user Dockerfiles — theo-packs is single source of truth

> **Coordinated with theo-packs PR-A** ([usetheodev/theo-packs#20](https://github.com/usetheodev/theo-packs/pull/20)). Both PRs MUST merge on the same day per ADR D2 of `theo-packs/docs/plans/single-source-of-truth-plan.md`.

## What changes

### 26 Dockerfiles deleted

Across 18 templates. All paths relative to repo root:

- `templates/fullstack-nextjs/Dockerfile`
- `templates/go-api/Dockerfile`
- `templates/java-spring/Dockerfile`
- `templates/monorepo-go/apps/{api,worker}/Dockerfile`
- `templates/monorepo-java/apps/{api,worker}/Dockerfile`
- `templates/monorepo-php/apps/{api,worker}/Dockerfile`
- `templates/monorepo-python/apps/{api,worker}/Dockerfile`
- `templates/monorepo-ruby/apps/{api,worker}/Dockerfile`
- `templates/monorepo-rust/apps/{api,worker}/Dockerfile`
- `templates/monorepo-turbo/apps/{api,web}/Dockerfile`
- `templates/node-express/Dockerfile`
- `templates/node-fastify/Dockerfile`
- `templates/node-nestjs/Dockerfile`
- `templates/node-nextjs/Dockerfile`
- `templates/node-worker/Dockerfile`
- `templates/php-slim/Dockerfile`
- `templates/python-fastapi/Dockerfile`
- `templates/ruby-sinatra/Dockerfile`
- `templates/rust-axum/Dockerfile`

Verified: `find templates -name Dockerfile -type f | wc -l` returns `0`.

### 19 READMEs updated

- 18 template READMEs gain a `## Build` section explaining that the Dockerfile is generated at deploy time by theo-packs (not committed) and that committing one causes exit code 2 rejection.
- Root `README.md` gains a `## Build artifacts` section preceding `What's Included`. The `What's Included` table updates the Dockerfile / `.dockerignore` rows from "production-optimized, multi-stage where applicable" to "Generated at deploy time by theo-packs".

### Smoke test

`tests/no_dockerfiles_test.sh` is a 1-line `find` test that fails CI if any template ships a Dockerfile. Wired into the `validate-templates` job in `.github/workflows/ci.yml`.

A future contributor restoring or copying a Dockerfile is caught at PR time, before deploys break.

## Why now

Pre-release window with no external users; user has explicitly waived backward compatibility ("fix in FAANG level"). The previous setup (templates ship Dockerfiles, theo-packs gives them precedence) was the source of every "theo-packs is broken" misdiagnosis — the recent dogfood against `monorepo-turbo` found a buggy template Dockerfile (npm workspace hoisting + `COPY apps/api/node_modules`) and blamed theo-packs. Removing the templates' Dockerfiles eliminates the entire class of confusion.

## Coordination with theo-packs PR-A

PR-A alone (theo-packs) means theo-packs rejects every theo-stacks template that still ships a Dockerfile → every deploy fails. PR-B alone (this PR) means templates have no Dockerfile but theo-packs's old code path tries to copy a non-existent file → cosmetic but the contract is unenforced.

The two changes are a single semantic transition. Recommended sequence:

1. Approve and merge **theo-packs PR-A** (`develop` branch).
2. Immediately approve and merge **this PR** (`develop` branch).
3. theo product picks up both via vendoring or fresh clone.

## Backward compatibility

**Explicitly NOT preserved.** Pre-release; no external users.

## Quality gates

```
bash tests/no_dockerfiles_test.sh    ✓ OK: no Dockerfiles in templates
```

The existing `validate-templates` CI job continues to pass (templates still scaffold valid projects; only the Dockerfile is gone).

## See also

- `theo-packs/docs/plans/single-source-of-truth-plan.md` — the plan this PR implements (ADRs D1-D6, full rationale).
- `theo-packs/docs/plans/single-source-of-truth-inventory.md` — frozen file list cross-checking PR-A and PR-B.
- `theo-packs/docs/contracts/theo-packs-cli-contract.md` — the canonical contract, now reflecting single-source-of-truth.
