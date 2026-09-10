#!/usr/bin/env bash
# Block agent edits to test files during fix tasks. PreToolUse Edit|Write.
# Enable with HARNESS_TASK_KIND=fix (or HARNESS_PROTECT_TESTS=1).
# Invalid JSON fails closed when protection is active.
set -euo pipefail
kind="${HARNESS_TASK_KIND:-}"
force="${HARNESS_PROTECT_TESTS:-}"
if [[ "$force" != "1" && "$kind" != "fix" ]]; then exit 0; fi
payload="$(cat)"
file="$(printf '%s' "$payload" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path") or d.get("tool_input",{}).get("path") or "")' 2>/dev/null)" || {
  echo "Blocked: test-edit-protect could not parse hook JSON payload while protection is active." >&2
  exit 2
}
if [[ -z "$file" ]]; then exit 0; fi
case "$file" in
  */tests/*|*/test/*|*/__tests__/*|*.spec.*|*.test.*|*_test.*|*_test)
    echo "Blocked: during a fix task (HARNESS_TASK_KIND=fix), do not edit test files ($file). Fix the product code. If tests must change, set HARNESS_TASK_KIND=feature and justify the test change in the plan." >&2
    exit 2
    ;;
esac
exit 0
