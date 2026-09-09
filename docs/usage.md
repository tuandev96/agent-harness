# Usage: requirements workflows and the optional local CLI

[README](../README.md) · [Installation](installation.md) · [Agent setup](agents.md) · [Troubleshooting](troubleshooting.md)

## Everyday agent workflow

After [connecting the loader](agents.md), use your coding agent's normal tools. For a small, bounded change, the installed `templates/task-spec.md` is sufficient: define scope and observable acceptance criteria, make the change, run the relevant checks, and report evidence and gaps. Do not initialize the local runtime or a full SRS solely because a one-file task exists.

For substantial work, load `.agents/skills/requirements-spec/SKILL.md` and select the requested mode. Keep requirements IDs stable and continue the project's existing authoritative `plans/` tree or tracker.

| Mode | Request to make | Boundary |
|---|---|---|
| `create` | Produce an SRS from a brief and actual codebase | Does not automatically start product implementation or tracking |
| `update` | Audit an existing SRS and specify the authorized delta | Preserve IDs; assess changed evidence, do not carry old PASS silently |
| `audit` | Find missing, ambiguous or untestable requirements | Findings only unless rewriting is authorized |
| `track-setup` | Set up criterion-to-work/evidence mappings | Use the existing work source; do not fabricate completed rows |
| `track-update` | Link current work, runs and review to criteria | Retain history and mark stale inputs |
| `track-audit` | Detect missing evidence, drift and false-green states | A clean template or checker is not product acceptance |

Example prompts (for the project-local layout):

```text
Create: Read .agents/skills/requirements-spec/SKILL.md. Inspect the project and
create a Draft SRS for the requested feature. Reuse the existing plans tree.
Write one obligation per requirement with acceptance criteria. Record unknown
thresholds and decisions rather than inventing approval. Do not implement yet.
```

```text
Continue: Read the harness protocol and the accepted feature spec. Continue the
matching plan, implement the authorized slice and verify each applicable AC.
Use actual test output and the current candidate. Keep missing review or native
platform checks pending instead of changing the definition of done.
```

```text
Audit: Read the requirements skill in track-audit mode. Check each target AC/NFR
against its mapping, actual run evidence, revision and review. Identify stale or
missing evidence. Do not rewrite the accepted scope or make product edits.
```

## Validate an SRS

Set paths to existing files in your target project:

```bash
export SPEC="$PROJECT/plans/path-to-your-requirements.md"
export SPEC_VALIDATOR="$PROJECT/.agents/skills/requirements-spec/scripts/validate_spec.py"
python3 "$SPEC_VALIDATOR" "$SPEC"
python3 "$SPEC_VALIDATOR" "$SPEC" --catalog-json
```

Normal mode prints diagnostics and inventory counts. Exit `0` means no structural errors; warnings still require a disposition. `--catalog-json` emits the catalog, including `semanticApproval: false` and the source hash, not approval of the domain or implemented product.

To compare with an existing valid baseline:

```bash
python3 "$SPEC_VALIDATOR" "$SPEC" --baseline "$PROJECT/plans/previous-requirements.md"
# Only when actual retired IDs have been reviewed and recorded as a JSON array:
python3 "$SPEC_VALIDATOR" "$SPEC" --baseline "$PROJECT/plans/previous-requirements.md" \
  --retired "$PROJECT/plans/retired-ids.json"
```

`--retired` is an explicit change record input, not permission to renumber. It does not manufacture approval. Source: [validator](../skills/requirements-spec/scripts/validate_spec.py) and [skill modes](../skills/requirements-spec/SKILL.md).

## Local CLI walkthrough

This optional exercise runs one deterministic command in a **new temporary directory**, without a model, network request, DSH or production files. It deliberately uses `requireReview: false` only for this low-risk demonstration. Important real work should retain its independent-review requirement; do not copy that exception to make a blocked task pass.

First build the checkout as described in [installation](installation.md), and retain `HARNESS_HOME` as its absolute path. This is not the installed `.agents` directory.

### Create a disposable project

```bash
export DEMO="$(mktemp -d "${TMPDIR:-/tmp}/agent-harness-demo.XXXXXX")"
node "$HARNESS_HOME/bin/harness.mjs" init --root "$DEMO" --project docs-demo
node "$HARNESS_HOME/bin/harness.mjs" init --root "$DEMO" --project docs-demo --apply
node "$HARNESS_HOME/bin/harness.mjs" identity --root "$DEMO"
```

The first `init` is a preview. The second creates `.harness/project.json` and `.harness/state.sqlite`. `identity` returns the persisted local principal and session. Do not invent IDs or reuse DSH IDs for this local project.

### Create the command and its exact acceptance oracle

```bash
python3 - "$DEMO" <<'PY'
import json, pathlib, sys
root = pathlib.Path(sys.argv[1]).resolve(strict=True)
config = json.loads((root / '.harness/project.json').read_text())
(root / 'check.cjs').write_text("process.stdout.write('harness demo ok\\n');\n")
task = {
    'contract': 'harness-runtime/1',
    'id': 'docs-demo-task', 'revision': 1, 'projectId': config['projectId'],
    'authorId': config['ownerId'], 'sessionId': config['sessionId'],
    'requirementIds': ['REQ-DEMO'], 'inputPaths': ['check.cjs'],
    'criteria': [
        {'id': 'AC-DEMO', 'requirementId': 'REQ-DEMO',
         'target': True, 'bindingIds': ['demo-command']}
    ],
    'bindings': [
        {'id': 'demo-command', 'profile': 'local', 'kind': 'command',
         'argv': ['$NODE', 'check.cjs'], 'selectors': [],
         'expectedExit': 0, 'expectedStdout': 'harness demo ok\n',
         'mutation': False, 'artifacts': []}
    ],
    'policy': {
        'id': 'docs-demo-policy', 'reviewerIds': [], 'requireReview': False,
        'timeoutMs': 30000, 'maxOutputBytes': 65536, 'maxAttempts': 2
    }
}
(root / 'task.json').write_text(json.dumps(task, indent=2) + '\n')
PY

node "$HARNESS_HOME/bin/harness.mjs" create --root "$DEMO" --file task.json
node "$HARNESS_HOME/bin/harness.mjs" run --root "$DEMO" \
  --task docs-demo-task --binding demo-command
node "$HARNESS_HOME/bin/harness.mjs" status --root "$DEMO" --task docs-demo-task
node "$HARNESS_HOME/bin/harness.mjs" complete --root "$DEMO" --task docs-demo-task
```

Expected: the run records `outcome: "PASS"`; assessment has current evidence and `gateReady: true` for this review-exempt demo; the final task state is `COMPLETED`. `releaseReady` remains false. The example's timeout/output/attempt values are demonstration settings, not benchmark targets.

Changing `check.cjs` after that run invalidates its current evidence. Inspect `status` again and expect a non-ready result rather than treating the old completion as proof for the edited code. Preserve the directory for inspection, or remove **only that known temporary directory** when finished; this guide does not run an automatic recursive cleanup.

## CLI command reference

Run from any directory and pass an existing canonical project root:

```bash
node "$HARNESS_HOME/bin/harness.mjs" help
node "$HARNESS_HOME/bin/harness.mjs" doctor --root "$PROJECT"
```

`help` is the command; do not assume `--help` or undocumented flags are supported. Accepted options are `--root`, `--project`, `--file`, `--task`, `--binding` and `--apply`; use the appropriate ones below. There is no `review`, `bind`, `approve`, `reconcile` or `release` CLI command.

| Command | Required arguments beyond `--root` | Behavior |
|---|---|---|
| `doctor` | None | Inspects Node/build state and prints trust limitations; no project initialization required |
| `init` | `--project ID`, optional `--apply` | Preview by default; explicit apply creates local identity/database |
| `identity` | None | Reads the initialized project's actual local principal |
| `create` | `--file task.json` | Validates and stores a task; this is a write, not a preview |
| `revise` | `--task ID --file revised-task.json` | Validates a new task revision and retains history; inspect state restrictions first |
| `run` | `--task ID --binding ID` | Executes the selected binding and records the outcome |
| `status` | `--task ID` | Recomputes acceptance/freshness; exit `2` when not gate-ready |
| `complete` | `--task ID` | Attempts completion through the gate; cannot fill missing review |
| `cancel` | `--task ID` | Records cancellation and requests that the owned run stop |
| `recover` | `--task ID` | Handles an interrupted producer; does not rerun its effects |
| `export` | `--task ID` | Prints task, records and current assessment; review output for sensitive content |
| `migrate` | `--task ID --file legacy.json` | Retains a legacy claim as `UNVERIFIED`; does not import an entire tracker as accepted proof |

Only `init` and the separate installer have the documented preview/apply behavior. Do not infer a universal dry-run mode from the presence of `--apply` in the parser.

`--file` names a safe **project-relative** file; `--root` selects the project. Keep the project at its initialized canonical path: moving it, changing OS identity or copying `.harness/project.json` between users can produce `PROJECT_POLICY_MISMATCH`.

CLI entrypoint errors return `1`; a non-PASS `run` also returns `1`, while a non-ready `status` returns `2`. Inspect structured outcomes and messages, not just the numeric exit. Source: [CLI](../src/cli/main.ts), [project identity/options](../src/cli/project.ts), [runtime contract](../src/core/contract.ts).

## Bindings and contributing inputs

For `kind: "command"`, `argv` is an argument array executed **without a shell**. `$NODE` in the first position selects the running Node executable. Pipes, redirects and shell variable expansion are not interpreted. This contract requires a non-null exact `expectedStdout` (including newlines) and `expectedExit`. Mark possible side effects with `mutation: true`; the flag is metadata, not a sandbox.

For `kind: "node-test"`, `argv` contains actual project-relative test-file paths, not `node`, npm commands or runner flags. `selectors` contains the exact expected test names. Missing, duplicate, skipped or cancelled observations cannot substitute for successful execution. There is no general pytest/JUnit parser adapter in this contract; a command binding must have its own real oracle.

Pin every contributing file in `inputPaths`, including tests, fixtures and relevant configuration. If `package.json`, `package-lock.json` or `tsconfig.json` exists at the project root, the current service requires it in this inventory. Node-test files and recognized script arguments must also be pinned. The tool does not infer a complete transitive dependency graph for you.

Declared artifact paths must be project-relative, readable and nonempty after execution, and must not also be contributing inputs. Hash/mtime-independent freshness checks do not certify artifact semantics. A report-only file outside the contributing set need not invalidate a result; do not exploit exclusions to omit real inputs.

An optional task `baseline` contains the SRS path, its byte hash and warning dispositions. The runtime checks exact SRS inventory/parents, while `target` identifies the accepted slice. This does not freeze or authorize the SRS. The small walkthrough above intentionally has no formal SRS baseline.

## Review, cancellation and recovery

A real task requiring review needs an actual reviewer assignment and a host integration that authenticates that reviewer. The local CLI explicitly disallows submitting review and cannot invent another principal by changing flags. Use the host-owned `Harness.review` API only from that trusted integration, preserving the exact run and candidate subjects. Missing review remains pending.

```bash
node "$HARNESS_HOME/bin/harness.mjs" cancel --root "$PROJECT" --task YOUR_TASK_ID
node "$HARNESS_HOME/bin/harness.mjs" status --root "$PROJECT" --task YOUR_TASK_ID
# Only after confirming the producer really stopped and recovery is needed:
node "$HARNESS_HOME/bin/harness.mjs" recover --root "$PROJECT" --task YOUR_TASK_ID
```

The CLI also handles SIGINT/SIGTERM during `run`. Stopping a process is not undoing an effect. `UNKNOWN` mutations require independently authorized reconciliation before retry. Reconciliation is host-owned; there is no CLI shortcut. Attempts persist, so restarting a command must not be used to evade the task budget.

## What does not become automatic

Using the portable skill does not populate the local database, run arbitrary commands through the recorder, enroll a reviewer or write long-term memory. The memory helpers are library functionality; there is no automatic private-history miner or CLI memory command. DSH host wiring is separate, and the CLI is not an MCP server.

Keep `.harness/`, installation receipts and raw run exports private. The current same-user runtime remains `ASSISTED`; neither a passing local task nor a generated ZIP makes a release authorized. See the [threat model](threat-model.md) and [current implementation limits](implementation-status.md).
