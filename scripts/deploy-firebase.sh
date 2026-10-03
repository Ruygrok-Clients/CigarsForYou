#!/usr/bin/env bash
# Deploy hosting, rules, and Cloud Functions to Firebase in batches
# to avoid Cloud Run CPU quota limits during revision rollouts.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Gen2 functions share Cloud Run CPU quota per region. Deploying more than
# one at a time often fails with "Quota exceeded for total allowable CPU".
BATCH_SIZE="${BATCH_SIZE:-1}"
PAUSE_SECONDS="${PAUSE_SECONDS:-45}"
MAX_RETRIES="${MAX_RETRIES:-4}"
RETRY_PAUSE_SECONDS="${RETRY_PAUSE_SECONDS:-90}"
SKIP_BUILD=false
FUNCTIONS_ONLY=false
HOSTING_ONLY=false

usage() {
  cat <<'EOF'
Usage: scripts/deploy-firebase.sh [options]

Deploys Firestore, Storage, Hosting, then Cloud Functions in batches
(default: 1 function per batch, 45s pause between batches).

Options:
  --skip-build       Skip the frontend Vite build
  --functions-only   Only deploy Cloud Functions (skip rules/hosting)
  --hosting-only     Only build + deploy Hosting (skip rules/functions)
  --batch-size N     Functions per batch (default: 1)
  --pause N          Seconds to wait between batches (default: 45)
  --retries N        Retries per batch on quota/deploy failure (default: 4)
  -h, --help         Show this help

Environment overrides:
  BATCH_SIZE, PAUSE_SECONDS, MAX_RETRIES, RETRY_PAUSE_SECONDS
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=true; shift ;;
    --functions-only) FUNCTIONS_ONLY=true; shift ;;
    --hosting-only) HOSTING_ONLY=true; shift ;;
    --batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    --pause)
      PAUSE_SECONDS="$2"
      shift 2
      ;;
    --retries)
      MAX_RETRIES="$2"
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

log() {
  printf '\n==> %s\n' "$*"
}

pause() {
  local seconds="$1"
  if [[ "$seconds" -le 0 ]]; then
    return
  fi
  log "Waiting ${seconds}s before next batch (quota cooldown)..."
  sleep "$seconds"
}

discover_functions() {
  # Cloud Functions exported from functions/src/index.ts
  # Matches both `export const foo = ...` and `export { foo, bar } from "./mod"`.
  {
    grep -E '^export const [A-Za-z0-9_]+' functions/src/index.ts \
      | sed -E 's/^export const ([A-Za-z0-9_]+).*/\1/'
    grep -E '^export \{' functions/src/index.ts \
      | sed -E 's/^export \{([^}]+)\}.*/\1/' \
      | tr ',' '\n' \
      | sed -E 's/^[[:space:]]*//; s/[[:space:]]*$//' \
      | grep -E '^[A-Za-z0-9_]+$'
  } | sort -u
}

deploy_function_batch() {
  local -a names=("$@")
  local -a targets=()
  local name
  local attempt=1
  local wait_s

  for name in "${names[@]}"; do
    targets+=("functions:${name}")
  done

  local joined
  joined="$(IFS=,; echo "${targets[*]}")"

  while true; do
    log "Deploying function batch (${#names[@]}): ${names[*]} (attempt ${attempt}/${MAX_RETRIES})"
    if firebase deploy --only "$joined"; then
      return 0
    fi

    if ((attempt >= MAX_RETRIES)); then
      echo "ERROR: Failed to deploy batch after ${MAX_RETRIES} attempts: ${names[*]}" >&2
      return 1
    fi

    wait_s=$((RETRY_PAUSE_SECONDS * attempt))
    log "Batch failed (often Cloud Run CPU quota). Retrying in ${wait_s}s..."
    sleep "$wait_s"
    attempt=$((attempt + 1))
  done
}

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install with: npm i -g firebase-tools" >&2
  exit 1
fi

FUNCTIONS=()
while IFS= read -r fn; do
  [[ -n "$fn" ]] && FUNCTIONS+=("$fn")
done < <(discover_functions)

if [[ ${#FUNCTIONS[@]} -eq 0 ]]; then
  echo "No exported Cloud Functions found in functions/src/index.ts" >&2
  exit 1
fi

log "Found ${#FUNCTIONS[@]} Cloud Functions"
printf '    - %s\n' "${FUNCTIONS[@]}"

if [[ "$HOSTING_ONLY" == true ]]; then
  if [[ "$SKIP_BUILD" != true ]]; then
    log "Building frontend..."
    npm run build
  fi
  log "Deploying Hosting..."
  firebase deploy --only hosting
  log "Hosting deploy complete."
  exit 0
fi

if [[ "$FUNCTIONS_ONLY" != true ]]; then
  if [[ "$SKIP_BUILD" != true ]]; then
    log "Building frontend..."
    npm run build
  fi

  log "Deploying Firestore rules/indexes, Storage rules, and Hosting..."
  firebase deploy --only firestore,storage,hosting
  pause "$PAUSE_SECONDS"
fi

total=${#FUNCTIONS[@]}
batch_num=0
deployed=0

for ((i = 0; i < total; i += BATCH_SIZE)); do
  batch_num=$((batch_num + 1))
  end=$((i + BATCH_SIZE))
  if ((end > total)); then
    end=$total
  fi

  batch=("${FUNCTIONS[@]:i:BATCH_SIZE}")
  deploy_function_batch "${batch[@]}"
  deployed=$((deployed + ${#batch[@]}))

  if ((end < total)); then
    pause "$PAUSE_SECONDS"
  fi
done

log "Deploy complete: ${deployed} functions in ${batch_num} batch(es)."
