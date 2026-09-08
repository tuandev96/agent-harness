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
