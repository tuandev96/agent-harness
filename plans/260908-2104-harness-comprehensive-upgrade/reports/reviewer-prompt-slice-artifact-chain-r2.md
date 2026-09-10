# Independent re-review request — agent-harness artifact-chain slice (fix round)

You are a clean-context reviewer. Do not edit files. Prefer read-only; you may run tests.

Repo root: /Users/justin/Dev/VibeLab/agent-harness

## Prior review (must be re-checked)

Previous VERDICT was BLOCK with finding #1: installer wrote hook scripts mode 600 (not executable).
Other findings: secret-diff missed untracked secrets; protected-paths relative path miss;
test-edit `*test.*` false positives; fail-open on invalid JSON; docs table drift; no hook tests.

Those were addressed in the working tree. Re-verify each.

## Scope under review

- skills/capture-intent/, skills/plan-mode/, skills/review-policy/
- hooks/*.sh, hooks/settings.example.json, hooks/README.md
- src/core/installer.ts (chmod +x for .sh after install)
- tests/operations/hooks-pack.test.mjs
- protocol/harness-protocol.md, adapters/portable/index.mjs, scripts/package.mjs, scripts/test.mjs
- docs/README.md, docs/installation.md, docs/agents.md, docs/usage.md

## Acceptance criteria

1. Four skills with valid frontmatter + templates.
2. Hooks allow legitimate actions and block: protected paths (incl. relative), test edits during fix (not docs/*test*), production deploy without RELEASE_APPROVAL, secrets in staged/untracked/command.
3. Installer installs skills+hooks with executable .sh on unix; no second tracker.
4. Protocol/docs/adapter/package/test fingerprint consistent.
5. Automated hook allow/block tests exist and pass.
6. No false ENFORCED/release claims.
7. No secrets committed.

## Required output

1. AC coverage table
2. Findings table (severity | file:line | issue)
3. VERDICT: PASS or VERDICT: BLOCK

State what you actually ran. Do not invent results.
