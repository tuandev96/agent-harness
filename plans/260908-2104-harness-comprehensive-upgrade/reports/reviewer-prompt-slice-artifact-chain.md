# Independent review request — agent-harness artifact-chain slice

You are a clean-context reviewer. Do not edit files. Read-only.

Repo root: /Users/justin/Dev/VibeLab/agent-harness

## Scope under review (uncommitted working tree slice)

New/changed for this slice:
- skills/capture-intent/
- skills/plan-mode/
- skills/review-policy/
- hooks/ (protected-paths.sh, test-edit-protect.sh, secret-diff.sh, production-gate.sh, settings.example.json, README.md)
- src/core/installer.ts
- protocol/harness-protocol.md
- adapters/portable/index.mjs
- scripts/package.mjs
- tests/operations/installer-memory.test.mjs
- docs/README.md, docs/installation.md, docs/agents.md (loader snippets)

Plan context: plans/260908-2104-harness-comprehensive-upgrade/plan.md
Slice readback: plans/260908-2104-harness-comprehensive-upgrade/reports/slice-artifact-chain-20260910.md

## Acceptance criteria for THIS slice

1. Four skills exist with valid SKILL.md frontmatter and usable templates.
2. Hooks allow legitimate actions and block: protected paths, test edits during fix, production deploy without RELEASE_APPROVAL, secrets in staged diff or command.
3. Installer installs new skills+hooks and does not invent a second tracker.
4. Protocol/docs/adapter/package inventory stay consistent.
5. Tests cover installer inclusion of new paths.
6. No false ENFORCED/release claims; ASSISTED honesty preserved.
7. No secrets committed.

## Required output format

1. AC coverage table (AC | evidence file:line or command | PASS/FAIL/PENDING)
2. Findings table (severity 🔴/🟡/🟢 | file:line | issue | fix)
3. `VERDICT: PASS` or `VERDICT: BLOCK` (missing evidence for a mandatory AC is BLOCK even with 0 code findings)

Be concrete. Do not invent test results you did not run. If you only read files, say so.
