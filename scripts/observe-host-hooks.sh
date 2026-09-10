#!/usr/bin/env bash
# Host-observation runner: feed PreToolUse-shaped payloads into portable hooks.
# Script-level only. Does not claim Claude Code/DSH enforcement.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/.harness-checks/host-hook-observation.json}"
mkdir -p "$(dirname "$OUT")"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
RESULTS="$WORKDIR/results.jsonl"
: > "$RESULTS"

run() {
  local hook="$1" payload="$2" expect="$3" label="$4"
  shift 4
  local status=0 stderr_file="$WORKDIR/stderr"
  if [[ $# -gt 0 ]]; then
    printf '%s' "$payload" | env "$@" "$ROOT/hooks/$hook" >/dev/null 2>"$stderr_file" && status=0 || status=$?
  else
    printf '%s' "$payload" | "$ROOT/hooks/$hook" >/dev/null 2>"$stderr_file" && status=0 || status=$?
  fi
  local verdict=FAIL
  [[ "$status" == "$expect" ]] && verdict=PASS
  python3 - "$RESULTS" "$label" "$hook" "$expect" "$status" "$verdict" "$stderr_file" <<'PY'
import json,sys
path,label,hook,expect,status,verdict,errfile=sys.argv[1:8]
open(path,"a").write(json.dumps({
  "label":label,"hook":hook,"expectExit":int(expect),
  "actualExit":int(status),"verdict":verdict,
  "stderr":open(errfile).read()[:240]
})+"\n")
print(f"{verdict:4} {label} exit={status}")
PY
}

echo "== host hook observation =="
run protected-paths.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$ROOT/src/core/service.ts\"}}" 0 "allow normal source edit"
run protected-paths.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$ROOT/src/generated/x.ts\"}}" 2 "block generated path"
run protected-paths.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$ROOT/.env\"}}" 2 "block .env"
run test-edit-protect.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$ROOT/tests/operations/hooks-pack.test.mjs\"}}" 2 "block test edit during fix" HARNESS_TASK_KIND=fix
run test-edit-protect.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$ROOT/src/core/service.ts\"}}" 0 "allow product edit during fix" HARNESS_TASK_KIND=fix
run test-edit-protect.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$ROOT/tests/operations/hooks-pack.test.mjs\"}}" 0 "allow test edit during feature" HARNESS_TASK_KIND=feature
run production-gate.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"deploy --env production\"}}" 2 "block prod deploy without auth"
run production-gate.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"deploy --env production\"}}" 0 "allow prod deploy with RELEASE_APPROVAL" RELEASE_APPROVAL=CHG-OBS-1
run production-gate.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"deploy --env staging\"}}" 0 "allow staging deploy"
run secret-diff.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git status\"}}" 0 "allow git status"

SECREPO="$WORKDIR/repo"
mkdir -p "$SECREPO"
git -C "$SECREPO" init -q
git -C "$SECREPO" config user.email t@t.local
git -C "$SECREPO" config user.name t
echo ok > "$SECREPO/a.txt"
git -C "$SECREPO" add a.txt
printf 'token = "ghp_%s"\n' "$(python3 -c 'print("C"*36)')" > "$SECREPO/secret.txt"
run secret-diff.sh "{\"session_id\":\"obs\",\"hook_event_name\":\"PreToolUse\",\"cwd\":\"$SECREPO\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git add secret.txt\"}}" 2 "block git add untracked secret"

python3 - "$OUT" "$RESULTS" <<'PY'
import json,sys,datetime
out,results_path=sys.argv[1],sys.argv[2]
rows=[json.loads(line) for line in open(results_path) if line.strip()]
passed=sum(1 for r in rows if r["verdict"]=="PASS")
data={
  "contract":"harness-host-hook-observation/1",
  "observedAt":datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "scope":"SCRIPT_LEVEL_PRETOOLUSE_PAYLOADS",
  "hostClaudeCode":"SETTINGS_WIRED_NOT_SESSION_OBSERVED",
  "hostDsh":"NOT_LAUNCHED",
  "settings":".claude/settings.json",
  "summary":{"total":len(rows),"pass":passed,"fail":len(rows)-passed},
  "results":rows,
  "releaseReady":False,
  "enforcementClaim":"NONE"
}
open(out,"w").write(json.dumps(data,indent=2)+"\n")
print(f"WROTE {out} pass={passed}/{len(rows)}")
if passed!=len(rows):
    raise SystemExit(1)
PY
