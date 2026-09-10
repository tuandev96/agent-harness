#!/usr/bin/env bash
# Production deploy requires a named release authorization.
# PreToolUse Bash. exit 2 = block (message goes to the agent).
# Invalid JSON fails closed for production-looking commands.
set -euo pipefail
payload="$(cat)"
parsed="$(printf '%s' "$payload" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print(json.dumps({"cmd": d.get("tool_input",{}).get("command","") or ""}))
' 2>/dev/null)" || {
  echo "Blocked: production-gate could not parse hook JSON payload." >&2
  exit 2
}
cmd="$(printf '%s' "$parsed" | python3 -c 'import json,sys; print(json.load(sys.stdin)["cmd"])')"
if [[ -z "$cmd" ]]; then exit 0; fi
lower="$(printf '%s' "$cmd" | tr '[:upper:]' '[:lower:]')"
if [[ "$lower" == *deploy* && "$lower" == *prod* ]]; then
  if [[ -z "${RELEASE_APPROVAL:-}" ]]; then
    echo "Production deploys need a release authorization. Set RELEASE_APPROVAL to the approved change ticket or release-manager token after human sign-off. Staging/dev deploys are unaffected." >&2
    exit 2
  fi
fi
exit 0
