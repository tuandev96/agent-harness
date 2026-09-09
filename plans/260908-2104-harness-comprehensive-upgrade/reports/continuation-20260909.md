# Implementation continuation — 2026-09-09

Baseline: e58c4ab; working tree clean on entry. Authority: user requested implementation of all remaining plan parts in this conversation. Continue this plan, do not create a competing tracker.

Scope: repo-local contracts, TypeScript core, execution recorder, SQLite task/history, CLI, DSH bridge/plugins, portable capability adapters, installer/migration/eval/release tooling, tests and documentation. No paid model calls, external release, branch-policy edits or live global runtime replacement. No worktree, commit or push in this task.

Implementation choices carried from approved plan: Node >=24, TypeScript, SQLite single host, ASSISTED local trust. The new executable contract is explicitly `harness-runtime/1`; do not mislabel it as a complete implementation of the manual `requirements-tracking/1` publication protocol. Legacy import preserves source claims as unverified and requires explicit mapping.

Impact: existing task-spec and impact-map remain authoritative. Input authority, permissions, phase visibility and acceptance are separate. Native test completion, direct-command evidence and manual review are separate evidence methods. Missing producer/reviewer/native capability never becomes a positive check. Test and harness inputs are included in candidate digests.

Review: self-review only in this session; independent review remains PENDING. Installation/CI/native Windows/paid comparative eval acceptance requires separate observations, not local unit tests.

Checkpoint sequence: contracts/evaluator → recorder/state/service → plugin fixes → tooling/adapters → complete local checks and an honest AC coverage report. Every candidate uses current repo code rather than unsynchronized container copies.
