# Portable hook pack

Hard controls for agent sessions. Skills are advisory; these hooks are the
deterministic layer behind them. They ship as **reference implementations** —
wire them into the host you actually run (Claude Code `settings.json`, Codex
sandbox policy, Grok hooks, DSH host authority). Installing files is not the
same as observing enforcement.

## Layout

| File | Role |
|------|------|
| `protected-paths.sh` | Block edits to frozen/generated/secret paths |
| `test-edit-protect.sh` | Block agent edits to test files during fix tasks |
| `secret-diff.sh` | Block git add/commit/push when staged, worktree, or about-to-add content matches secret patterns (skips `hooks/secret-diff.sh`) |
| `production-gate.sh` | Ask/block production deploy without named authorization |
| `settings.example.json` | Claude Code PreToolUse wiring example |

All scripts read a JSON payload on stdin (Claude Code hook protocol) and:

- exit `0` — allow
- exit `2` — block; stderr is the reason shown to the agent

## Wiring (Claude Code)

Merge into the project's `.claude/settings.json` (do not overwrite unrelated
hooks):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": ".agents/hooks/protected-paths.sh" },
          { "type": "command", "command": ".agents/hooks/test-edit-protect.sh" }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": ".agents/hooks/secret-diff.sh" },
          { "type": "command", "command": ".agents/hooks/production-gate.sh" }
        ]
      }
    ]
  }
}
```

Regulated orgs should move non-negotiable hooks into **managed** settings so
engineers cannot disable them. See the AI-native SDLC playbook lesson on
hooks as approval gates.

## What these hooks do not do

- They are not an OS sandbox.
- They do not create reviewer identities or approve releases.
- They do not run in CI unless you install them there.
- A same-user process that can edit the hook script can neuter it — the
  harness threat model still applies.

## Policy knobs

| Hook | Knobs (env) | Default |
|------|-------------|---------|
| `protected-paths.sh` | `HARNESS_PROTECT_GLOB` | `**/generated/**,**/node_modules/**,**/.env*,**/secrets/**` |
| `test-edit-protect.sh` | `HARNESS_PROTECT_TESTS` (`1`/`0`) | `1` when `HARNESS_TASK_KIND=fix` |
| `secret-diff.sh` | none | scan staged diff for high-entropy secret patterns |
| `production-gate.sh` | `RELEASE_APPROVAL` | empty → block production deploy |

Set `HARNESS_TASK_KIND=fix` in the session when the task is a bug fix so test
edits are blocked. Unset or set `feature` to allow intentional test additions
(still review the test diff).
