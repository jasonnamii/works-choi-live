#!/usr/bin/env bash
# 3PICKS 로컬 전체 점검 — 어느 위치에서 실행해도 된다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for test_file in tools/test_*.js; do
  node "$test_file"
done

python3 tools/audit_catalog.py

for script_file in app.js config.js recommendation-core.js site-overrides.js operations/admin-core.js tools/build_public_data.js tools/pull_live_state.js tools/verify_public_bundle.js; do
  node --check "$script_file"
done

echo "PASS 3PICKS 전체 로컬 점검"
