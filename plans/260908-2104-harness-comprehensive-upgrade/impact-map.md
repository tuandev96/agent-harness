# Impact map — comprehensive implementation

Request: triển khai plan đã được người dùng đồng ý; worktree chính, không commit/publish.
Shared core: requirement/AC identity, evidence freshness/provenance, review policy, task state/CAS.
Related flows: author SRS → validate → create task → record native command → evaluate → review → complete; cancel/retry; crash/restart; merge/release.
Existing callers: router-standard main và shim delivery_check/phase/goal; router-spec context assembly; Git Bash run/start; MCP host/client; coerce và logger hooks.
Risks: false PASS (high), lost/duplicate side effects (high), cross-session/policy confusion (high), corrupt MCP store/secret response (high), parser compatibility (medium), source/build drift (medium).
UI scope: thay đổi dữ liệu credential của MCP editor, không redesign layout; cần browser proof trước UI acceptance.
Validation: original tests + malformed-SRS regressions; contract positives/negatives; real child processes; SQLite two-writer/crash; mock-host plugin tests; build/source parity; CLI/install/recovery tests; complete local suite.
Native/runtime/Windows/independent review và branch enforcement cần bằng chứng thực; test mock không thay thế.
Do not touch: Beam/Maskr/Bestmix repos, private memory, live runtime credentials/config, existing user modifications.
Success: AC-IMPL trong task-spec có output hiện hành hoặc blocker rõ; không báo hoàn thành toàn bộ khi AC bắt buộc chưa được chứng minh.

## Impact map — C2C continuation protocol slice

Request: strengthen the C2C PLAN/review instructions using this harness as the reference, so Luna continues until every applicable user requirement is verified.
Assumptions: the source of the visible PLAN is `codex-with-chatgpt/docs/protocol.md`; `agent-harness` is reference-only for this slice.
In-scope files:
  - `/Users/justin/codex-with-chatgpt/docs/protocol.md`
  - `/Users/justin/codex-with-chatgpt/skill/SKILL.md`
  - installed C2C skill copy, if it is the active loader
Related flows:
  - F1: INIT → complete, stable acceptance-criteria inventory and executable PLAN.
  - F2: EXECUTED → current diff/output review, stale evidence detection, next PLAN.
  - F3: HANDOFF/resume → exact next incomplete criterion, not a generic continuation.
  - F4: DONE/BLOCKED → all criteria evidenced, or one explicit external blocker.
Shared: criterion identity, evidence freshness, review independence and terminal-state rules.
Out of scope: C2C runtime/parser changes, connector permissions, ChatGPT project creation, and the unrelated harness implementation phases.
Risks:
  - R1 (H): Luna stops after one green command or treats a worker claim as proof.
  - R2 (H): multi-repository work loses the target repository or completion boundary.
  - R3 (M): stale/timeout/cancel evidence is reported as DONE.
Validation plan:
  - Documentation contract: inspect every control-message template and required gate.
  - Related flow: run C2C typecheck/tests/build; verify source and installed skill parity.
  - Review: self-review against the harness rules; independent review remains pending if unavailable.
Success criteria: the generated instruction requires per-criterion evidence, freshness/review checks, actionable next steps, and forbids DONE without a complete current gate.
