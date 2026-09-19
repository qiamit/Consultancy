#!/usr/bin/env bash
# Deploy current workspace to Railway production (qengineering.in).
# Requires: Railway CLI authenticated (`railway login`) and linked project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v railway >/dev/null 2>&1; then
  if [[ -f "$HOME/.railway/env" ]]; then
    # shellcheck source=/dev/null
    source "$HOME/.railway/env"
  fi
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI not found. Install: curl -fsSL https://railway.com/install.sh | sh" >&2
  exit 1
fi

if ! railway whoami --json >/dev/null 2>&1; then
  echo "Not logged into Railway. Run: railway login" >&2
  exit 1
fi

PROJECT_ID="${RAILWAY_PROJECT_ID:-82c48fa4-4d69-4d89-bd7b-b3b5ec047cdc}"
SERVICE="${RAILWAY_SERVICE:-Consultancy}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
MESSAGE="${1:-Live deploy from workspace}"

echo "→ Deploying to Railway: project=$PROJECT_ID service=$SERVICE env=$ENVIRONMENT"
railway up \
  --project "$PROJECT_ID" \
  --environment "$ENVIRONMENT" \
  --service "$SERVICE" \
  --ci \
  -m "$MESSAGE"

echo "→ Checking latest deployment status..."
railway deployment list \
  --project "$PROJECT_ID" \
  --environment "$ENVIRONMENT" \
  --service "$SERVICE" \
  --limit 1 \
  --json

echo "Live app: https://qengineering.in"
