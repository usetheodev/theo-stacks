#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$ROOT_DIR/templates"
CREATE_THEO_DIR="$ROOT_DIR/create-theo"
WORK_DIR=$(mktemp -d)

trap "rm -rf $WORK_DIR" EXIT

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

passed=0
failed=0
total=0

log_pass() { echo -e "${GREEN}PASS${NC} $1"; passed=$((passed + 1)); }
log_fail() { echo -e "${RED}FAIL${NC} $1: $2"; failed=$((failed + 1)); }

echo "=== Template Validation ==="
echo "Working directory: $WORK_DIR"
echo ""

# Build create-theo first
echo "Building create-theo..."
cd "$CREATE_THEO_DIR"
npm run build --silent 2>/dev/null
echo ""

# Test each template via scaffold
for template_dir in "$TEMPLATES_DIR"/*/; do
  template_id=$(basename "$template_dir")
  total=$((total + 1))
  project_name="test-${template_id}"
  project_dir="$WORK_DIR/$project_name"

  echo "--- $template_id ---"

  cd "$WORK_DIR"

  # 1. Scaffold
  if ! node "$CREATE_THEO_DIR/index.js" "$project_name" --template "$template_id" 2>/dev/null; then
    log_fail "$template_id" "scaffold failed"
    continue
  fi

  cd "$project_dir"

  # 2. Verify theo.yaml exists and has no placeholders
  if [ ! -f "theo.yaml" ]; then
    log_fail "$template_id" "theo.yaml missing"
    continue
  fi

  if grep -q '{{project-name}}' theo.yaml; then
    log_fail "$template_id" "theo.yaml still has placeholder"
    continue
  fi

  # 3. Verify project name is correct
  if ! grep -q "project: \"$project_name\"" theo.yaml; then
    log_fail "$template_id" "theo.yaml has wrong project name"
    continue
  fi

  # 4. Verify .gitignore exists
  if [ ! -f ".gitignore" ]; then
    log_fail "$template_id" ".gitignore missing"
    continue
  fi

  # 5. Verify README exists
  if [ ! -f "README.md" ]; then
    log_fail "$template_id" "README.md missing"
    continue
  fi

  # 6. Check no placeholder in any text file
  if grep -r '{{project-name}}' --include="*.yaml" --include="*.json" --include="*.js" --include="*.ts" --include="*.py" --include="*.go" --include="*.mod" --include="*.md" . 2>/dev/null; then
    log_fail "$template_id" "found unreplaced placeholder"
    continue
  fi

  log_pass "$template_id"
  cd "$WORK_DIR"
done

echo ""
echo "=== Results ==="
echo "Total: $total | Passed: $passed | Failed: $failed"

if [ "$failed" -gt 0 ]; then
  exit 1
fi
