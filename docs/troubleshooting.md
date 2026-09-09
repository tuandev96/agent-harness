# Troubleshooting

[Installation](installation.md) · [Agent setup](agents.md) · [Usage/CLI](usage.md) · [Local verification](runbooks/local-verification.md)

Start with the exact command, checkout revision and exit code. Redact credentials before sharing any output. Do not repair a failed gate by editing its database, removing failures, weakening the oracle or changing policy without authority.

## Installation and instruction loading

| Symptom | Meaning and next action |
|---|---|
| `ERR_MODULE_NOT_FOUND` for `dist/...` | Build the full checkout with `npm run build`; the portable files alone do not include the runtime |
| `TYPECHECK_TOOLCHAIN_MISSING` | Run `npm ci --ignore-scripts` in the checkout; typecheck uses pinned local dependencies, not a global compiler |
| Typecheck/test times out | Read the specific log and inspect the owned process; timeout is not PASS. Run an appropriate subset to diagnose rather than silently omitting the failing check |
| `doctor` reports `buildCurrent: false` | Source/output manifest hashes do not match or the manifest is absent. Rebuild and inspect the resulting diff; doctor does not perform typechecking |
| `ENOENT` when installing | `--target` must be an existing directory; create the intended target explicitly |
| `SOURCE_IS_NOT_INSTALL_TARGET` | You selected the harness checkout as its own destination. Use another project or a separate portable subdirectory |
| `USER_CHANGES_CONFLICT` | A differing target file is not owned by a completed receipt. Compare and preserve user changes; there is no supported force-overwrite flag |
| `INSTALL_SYMLINK` / `SOURCE_SYMLINK` | Review the link and use an intentional real directory; do not delete someone else's symlink or follow it blindly |
| Agent does not read the protocol | Verify the native loader: `.agents/AGENTS.md` alone is not the project's root loader. Check exact casing, working directory and more-specific overrides |
| Skill slash command is missing | A direct `SKILL.md` read and native skill discovery are different paths. Register the complete bundle in that client's skill directory or explicitly load the file |
| Wrong skill version is used | Inspect the actual path read and duplicate personal/project registrations; a command name does not identify its source revision |
| A copied project works locally but not remotely | Personal paths and machine-specific generated loaders may not exist remotely. Use a relative root loader and provision the portable files in that environment |

Source: [installer](../src/core/installer.ts), [installer entrypoint](../scripts/install.mjs), [typecheck entrypoint](../scripts/typecheck.mjs) and the official loader references in [agent setup](agents.md).

## Receipt, conflict and rollback safety

The installer uses `<target>/.harness-install.lock`. If it exists, inspect the recorded PID/time and confirm whether the writer is still alive. Do not delete an active lock or kill unrelated agent/Git processes. After an interrupted write, preserve the receipt and target before recovery.

`STALE_INSTALL_PLAN` or `TARGET_CHANGED_DURING_INSTALL` means the target changed after inspection. Re-read the diff and rebuild the preview. `MANAGED_BLOCK_MALFORMED` means the generated start/end markers are mismatched or duplicated; reconcile the exact block while preserving the surrounding content.

`ROLLBACK_WOULD_OVERWRITE_USER_CHANGES` protects edits made after installation. Back them up and decide which version to keep. Do not erase the receipt, delete the target tree or force the stored hashes to match.

The rollback command without `--apply` only prints intent. It is not a successful preflight validation. Rollback only covers receipt-owned files, not extra native skill copies, root-loader edits or the CLI database.

## Local runtime and evidence

| Message/result | What to check |
|---|---|
| Missing `.harness/project.json` | This is normal in portable-only mode. For the optional CLI, initialize the intended `--root` once with `init --project ID --apply` |
| `ALREADY_INITIALIZED` | Reuse the existing project instead of reseeding its identity/history |
| `EXISTING_STATE_WITHOUT_CONFIG` | Preserve the database and investigate interrupted initialization; do not delete state to get a clean setup |
| `PROJECT_POLICY_MISMATCH` | Check canonical root, local OS owner and recorded project identity; do not edit identity values merely to gain access |
| `NOT_AUTHORIZED`, `EXACT_AUTHOR_REQUIRED`, `CALLER_CONTEXT_MISMATCH` | Use the actual authorized caller/session. Different native agents are not automatically independent CLI principals |
| `TEST_INPUT_NOT_PINNED`, `SCRIPT_INPUT_NOT_PINNED`, `CONTRIBUTING_CONFIG_NOT_PINNED` | Add the actual contributing files through an authorized task revision before running, rather than excluding them from evidence |
| `SRS_VALIDATION_FAILED`, `SRS_INVENTORY_MISMATCH`, `WARNING_DISPOSITION_REQUIRED` | Validate the pinned spec, catalog and complete inventory; record warning dispositions without inventing approval |
| `BASELINE_CHANGED` | The current SRS bytes no longer match the task. Review the delta and revise the task rather than reusing old evidence |
| `COLLECTION_INCOMPLETE`, `TEST_NOT_EXECUTED` | Check exact test names, file paths and skipped/cancelled tests; zero exit or an empty test file is not sufficient |
| `REVIEW_MISSING` | Local CLI cannot submit independent review. Use the real host reviewer integration; do not assign the worker a second name |
| `gateReady: false` / status exit `2` | Inspect `criteria` and reason codes. This is a non-ready assessment, not necessarily a CLI crash |
| `UNKNOWN` / `RECONCILE_BEFORE_RETRY` | A mutation may already have taken effect. Independently reconcile before another attempt; cancellation is not rollback |
| `ATTEMPT_BUDGET_EXHAUSTED` | Attempts are persisted. Review the actual failures and next action; restart is not permission to reset the budget |
| `OWNER_PROCESS_STILL_RUNNING` | Do not recover an active producer. Inspect and stop only the owned execution through the proper channel |
| `HISTORY_CONFLICT` | Preserve state and evidence for investigation. Do not edit history hashes or remove records to make verification pass |

Detailed contracts: [service](../src/core/service.ts), [recorder](../src/core/recorder.ts), [evaluator](../src/core/evaluator.ts), [catalog](../src/core/catalog.ts).

## DSH and MCP settings

`EVIDENCE_PENDING` means the delivery bridge lacks a valid host gate/decision. `TASK_BINDING_REQUIRED` means the host has not bound the calling agent to a task. Configure the real [host integration](agents.md#dsh); installing the portable bundle does not do that wiring.

The bundled MCP settings admin API checks loopback peer, host and browser-origin conditions. A remote reverse proxy or arbitrary browser origin can therefore be rejected. Do not loosen those checks merely to make a remote URL work; establish and review an appropriate deployment boundary first. Host authorization, where supplied, is still required.

Connection secrets are not returned in normal list responses. Empty private fields on edit preserve saved values; the API's explicit `clearSecrets` action is separate from leaving fields blank. Re-enter a complete endpoint when changing a masked URL. Never copy a `[REDACTED]` placeholder as a live token.

Corrupt or externally changed configuration must be preserved rather than overwritten from stale memory. Mount/dispose failure is not proof that all tools were removed. See [MCP source](../vendor/dsh-mcp-settings/src/index.js) and [security helpers](../vendor/dsh-mcp-settings/src/security.js).

## Verify only the relevant claim

A successful build is not typecheck, a passing test subset is not a full suite, an instruction-loading observation is not permission enforcement, and `package:check` is not release approval. Report each result separately, with its actual input revision and gaps. For the remaining acceptance boundaries, read [implementation status](implementation-status.md).
