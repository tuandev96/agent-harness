#!/usr/bin/env bash
# Block git add/commit/push when the target repo's staged, worktree, or
# about-to-be-added files look like they contain secrets. PreToolUse Bash.
# exit 2 = block. Invalid JSON fails closed for git add/commit/push commands.
set -euo pipefail
payload="$(cat)"
parsed="$(printf '%s' "$payload" | python3 -c '
import json,sys,re
d=json.load(sys.stdin)
cmd=d.get("tool_input",{}).get("command","") or ""
cwd=d.get("cwd") or d.get("tool_input",{}).get("cwd") or ""
m=re.search(r"^\s*cd\s+(?:\"([^\"]+)\"|'"'"'([^'"'"']+)'"'"'|([^;&|]+))\s*&&", cmd)
if m:
    cwd=next(g for g in m.groups() if g).strip() or cwd
print(json.dumps({"cmd":cmd,"cwd":cwd}))
' 2>/dev/null)" || {
  echo "Blocked: secret-diff could not parse hook JSON payload." >&2
  exit 2
}
cmd="$(printf '%s' "$parsed" | python3 -c 'import json,sys; print(json.load(sys.stdin)["cmd"])')"
workdir="$(printf '%s' "$parsed" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("cwd") or "")')"
if [[ -z "$cmd" ]]; then exit 0; fi
if ! [[ "$cmd" =~ git[[:space:]]+(add|commit|push) ]]; then exit 0; fi
scan_dir="${workdir:-$PWD}"
# High-signal patterns only. Do not use a bare "-----BEGIN" token: detector
# sources and docs that quote the regex would self-match on untracked files.
secret_re='BEGIN (RSA |OPENSSH |EC |PGP )?PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}'
scan_blob="$(mktemp)"
trap 'rm -f "$scan_blob"' EXIT
if git -C "$scan_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  {
    git -C "$scan_dir" diff --cached 2>/dev/null || true
    git -C "$scan_dir" diff 2>/dev/null || true
  } > "$scan_blob"
  # Untracked files only matter for git add. Skip detector sources so the
  # hook does not block committing the hook that defines these patterns.
  if [[ "$cmd" =~ git[[:space:]]+add ]]; then
    git -C "$scan_dir" ls-files --others --exclude-standard 2>/dev/null | while IFS= read -r f; do
      case "$f" in
        hooks/secret-diff.sh|*/hooks/secret-diff.sh) continue ;;
      esac
      [[ -f "$scan_dir/$f" ]] || continue
      # Skip binary-ish files
      if grep -Iq . "$scan_dir/$f" 2>/dev/null; then
        printf '\n--- %s\n' "$f" >> "$scan_blob"
        cat "$scan_dir/$f" >> "$scan_blob"
      fi
    done
  fi
  if grep -Eiq "$secret_re" "$scan_blob"; then
    echo "Blocked: staged, worktree, or about-to-add content in '$scan_dir' matches a secret pattern. Remove the secret, rotate the credential, and use env/secret managers. Do not commit credentials." >&2
    exit 2
  fi
fi
if printf '%s' "$cmd" | grep -Eiq "$secret_re"; then
  echo "Blocked: the shell command itself matches a secret pattern. Do not paste credentials into agent commands." >&2
  exit 2
fi
exit 0
