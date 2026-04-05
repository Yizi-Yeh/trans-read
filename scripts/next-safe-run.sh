#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-}"
if [[ -z "${MODE}" ]]; then
  echo "Usage: bash scripts/next-safe-run.sh <dev|build|start> [next-args...]"
  exit 1
fi
shift || true

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

kill_local_next() {
  local pattern="${ROOT_DIR}/node_modules/.bin/next (dev|start)"
  local pids
  pids="$(pgrep -f "${pattern}" || true)"

  if [[ -n "${pids}" ]]; then
    echo "Stopping existing Next.js process(es): ${pids}"
    echo "${pids}" | xargs kill || true
    sleep 1
  fi
}

case "${MODE}" in
  dev)
    kill_local_next
    rm -rf .next
    exec next dev "$@"
    ;;
  build)
    kill_local_next
    rm -rf .next
    exec next build "$@"
    ;;
  start)
    if [[ ! -f ".next/BUILD_ID" ]]; then
      echo "Missing .next build output. Run: npm run build"
      exit 1
    fi
    exec next start "$@"
    ;;
  *)
    echo "Unknown mode: ${MODE}"
    echo "Usage: bash scripts/next-safe-run.sh <dev|build|start> [next-args...]"
    exit 1
    ;;
esac
