#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

REVIEW_DATE="${1:-$(date +%F)}"
LOG_PATH="docs/daily-logs/auto-evening-${REVIEW_DATE}.log"

mkdir -p docs/daily-logs

{
  echo "# Auto Evening Review — ${REVIEW_DATE}"
  echo
  echo "Generated: $(date +%Y-%m-%dT%H:%M:%S%z)"
  echo
  echo "## Health Check"
  node scripts/daily/health-check.mjs --label evening --date "${REVIEW_DATE}"
  echo
  echo "## Commits"
  git log --since="${REVIEW_DATE} 00:00" --until="${REVIEW_DATE} 23:59:59" --oneline || true
  echo
  echo "## Files Changed"
  git log --since="${REVIEW_DATE} 00:00" --until="${REVIEW_DATE} 23:59:59" --name-only --format='' | sed '/^$/d' | sort -u || true
  echo
  echo "## Working Tree"
  git status --short
} | tee "${LOG_PATH}"

echo
echo "Wrote ${LOG_PATH}"
