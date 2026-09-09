# Documentation update — installation and cross-agent usage

Status: WRITTEN_AND_EXAMPLES_VERIFIED — final automated link/diff check unavailable
Source: user request on 2026-09-09 to update README and installation/usage documentation for other agents.
Baseline: `6ab731c`; worktree was clean at the first readback.
Parent work source: this existing comprehensive-upgrade plan (Phase 06 documentation).

## Scope

Updated README and docs for the actual portable installer, native instruction loading, requirements workflows and optional local CLI. Covered Codex, Claude Code, Cursor, Grok Build and DSH; Gemini CLI is a manual protocol-loading recipe, not an implemented native adapter. Kept an English README and added a Vietnamese getting-started guide. Existing implementation-status documentation links to the guides.

No intentional runtime, schema, installer or security-policy edits. No installation into the user's home directory or production project. No model/API invocation, commit, push or release. Smoke checks used owned temporary directories and local processes only. Existing global rules, skills and credentials were unchanged by this task.

## Acceptance criteria

- [x] DOC-01: README describes code actually present, two adoption paths, setup commands, private-distribution and ASSISTED boundaries. Navigation/source references manually reviewed.
- [x] DOC-02: Installation documents target layout, separate native loaders, dry-run, apply, conflict/receipt/rollback behavior and private state exclusions. It does not promise automatic cross-agent hook installation.
- [x] DOC-03: Agent recipes use current primary documentation, identify the source and verification date, and distinguish recipe availability from tested native integration.
- [x] DOC-04: Documented local examples use real CLI options and caller identity. Initialization, execution, status/completion, stale-input rejection and installer rollback were checked in owned temporary workspaces.
- [ ] DOC-05: Automated Markdown link/scope-diff check was blocked by tool safety; final git_status timed out. No automated PASS or complete final diff is asserted. An optional runbook edit was blocked and that file was left unchanged.

## Evidence and review

See `reports/documentation-20260909.md`. Local runner `.harness-checks/docs-20260909/finished.json` confirms completion and all 12 smoke steps/observations passed; `results.json` includes actual exit codes and log hashes. The combined CLI example was extracted directly from docs/usage.md.

These checks validate documentation examples, not all product acceptance. Native agent sessions, independent review, Windows and release gates remain pending. Reviewer: SKIPPED (policy — self-contained session); labeled self-review only. The parent Phase 06 is not closed by this documentation task.
