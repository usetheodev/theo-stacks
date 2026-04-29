#!/usr/bin/env bash
# Enforces the single-source-of-truth contract: theo-packs generates the
# Dockerfile at deploy time, templates never ship one.
#
# Why this exists: without a CI gate, a future contributor copying a
# template from elsewhere (or restoring an old version of one) might
# silently re-introduce a Dockerfile, regressing the contract documented
# in README.md "Build artifacts" and theo-packs's
# docs/contracts/theo-packs-cli-contract.md "Single source of truth"
# preamble.
#
# theo-packs hard-fails the build (exit code 2) when it sees a template
# Dockerfile in the analyzed app dir. This test catches the regression
# at PR time, before deploys break.

set -euo pipefail

# Resolve repo root regardless of where this script is invoked from.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cd "$repo_root"

found=$(find templates -name Dockerfile -type f 2>/dev/null || true)

if [[ -n "$found" ]]; then
    echo "ERROR: templates contain Dockerfiles (forbidden):" >&2
    echo "$found" >&2
    echo "" >&2
    echo "theo-packs is the single source of truth for Dockerfile generation." >&2
    echo "Delete the listed files. See README.md 'Build artifacts' for context." >&2
    exit 1
fi

echo "OK: no Dockerfiles in templates"
