#!/usr/bin/env bash
# Block edits to protected paths. PreToolUse Edit|Write. exit 2 = block.
# Invalid JSON fails closed (exit 2) so a parse error is not a silent allow.
set -euo pipefail
payload="$(cat)"
file="$(printf '%s' "$payload" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path") or d.get("tool_input",{}).get("path") or "")' 2>/dev/null)" || {
  echo "Blocked: protected-paths could not parse hook JSON payload." >&2
  exit 2
}
if [[ -z "$file" ]]; then exit 0; fi
# Normalize relative paths so generated/out.ts matches **/generated/**
if [[ "$file" != /* && "$file" != ./* ]]; then file="./$file"; fi
globs="${HARNESS_PROTECT_GLOB:-**/generated/**,**/node_modules/**,**/.env*,**/secrets/**,**/vendor/**}"
IFS=',' read -ra patterns <<< "$globs"
for pattern in "${patterns[@]}"; do
  # shellcheck disable=SC2254
  case "$file" in
    $pattern|./$pattern|*/$pattern)
      echo "Blocked: '$file' matches protected path '$pattern'. Edit policy/source of truth instead, or change HARNESS_PROTECT_GLOB with an authorized reason." >&2
      exit 2
      ;;
  esac
done
base="$(basename "$file")"
case "$base" in
  .env|.env.*|id_rsa|id_ed25519|credentials|credentials.json)
    echo "Blocked: '$file' looks like a secret file. Do not edit credentials in agent sessions." >&2
    exit 2
    ;;
esac
exit 0
