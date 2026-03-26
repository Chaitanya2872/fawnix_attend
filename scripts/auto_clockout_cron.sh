#!/usr/bin/env bash
set -euo pipefail

# Update this to your deployment path.
PROJECT_ROOT="${PROJECT_ROOT:-/root/backend/fawnix_attend}"
PYTHON_BIN="${PYTHON_BIN:-$PROJECT_ROOT/venv/bin/python}"
RUNNER_PATH="$PROJECT_ROOT/scripts/run_auto_clockout_cron.py"

cd "$PROJECT_ROOT"

# Cron mode: disable in-app scheduler in this process.
export RUN_SCHEDULER=false

exec "$PYTHON_BIN" "$RUNNER_PATH"
