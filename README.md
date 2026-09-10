# Agent Harness

Requirements-first workflows and evidence-aware local tooling for coding agents.

Use the portable protocol and requirements skill with your existing agent, then opt into the local evidence runtime or DSH host integration when needed. You do not need DSH to use the protocol or skill.

**Status:** `0.3.0`, private development checkpoint. The local runtime is **ASSISTED**, not an operating-system sandbox or a production-readiness certificate. Native integration and release acceptance remain separate. See [implementation status](docs/implementation-status.md).

[Tiếng Việt](docs/huong-dan.vi.md) · [Installation](docs/installation.md) · [Agent setup](docs/agents.md) · [Usage and CLI](docs/usage.md) · [Troubleshooting](docs/troubleshooting.md)

## What this repository provides

| Component | What it does |
|---|---|
| Portable protocol | Defines scope, acceptance evidence, bounded retries, review and memory boundaries |
| Artifact-chain skills | `capture-intent` → `requirements-spec` → `plan-mode`; `review-policy` for multi-pass PR review |
| Reference hooks pack | Protected paths, test-edit protect, secret-diff block, production deploy gate (host wiring required) |
| `requirements-spec` skill | Creates, updates and audits SRS documents; offers optional requirement-tracking workflows |
| Python spec validator | Checks the supported Markdown structure, IDs and links; exports a requirement catalog |
| Local TypeScript/Node runtime | Records executions, evaluates mapped criteria, retains SQLite task history and checks evidence freshness |
| DSH integration | Bridges a host-bound task to delivery checks; includes MCP settings, argument-coercion and log-dedup plugins |
| Operations tools | Portable-file installation with receipts/rollback, diagnostics, repository checks, offline eval summaries and private packaging |

The executable contract is [`harness-runtime/1`](contracts/harness-runtime/1/task.schema.json). It is **not** a complete implementation of the skill's separate manual `requirements-tracking/1` contract.

## Choose an adoption path

| Your goal | Start here | Database or DSH required? |
|---|---|---|
| Better requirements, task planning and evidence discipline in an existing agent | [Install the portable files](docs/installation.md), then [connect your agent](docs/agents.md) | No |
| Record local commands and inspect task acceptance | [Optional CLI walkthrough](docs/usage.md#local-cli-walkthrough) | A project-local SQLite database; no DSH |
| Integrate runtime gates into DSH | [DSH host integration](docs/agents.md#dsh) | DSH host services, authorization and explicit task binding |

Installing instructions does not intercept shell commands, create reviewer identities, install MCP servers or enable CI branch protection.

## Get the source and build

Prerequisites: Git, Node.js 24 or newer, npm and Python 3.10 or newer available as `python3`. The shell examples use Bash on macOS/Linux; see [platform notes](docs/installation.md#platforms-and-prerequisites).

```bash
git clone https://github.com/tuandev96/agent-harness.git
cd agent-harness
export HARNESS_HOME="$(pwd -P)"

npm ci --ignore-scripts
npm run typecheck
npm run build
node "$HARNESS_HOME/bin/harness.mjs" doctor --root "$HARNESS_HOME"
```

Use credentials authorized for this repository if access is restricted. This package is marked `private`; the documented entrypoints run from your checkout, not from a published npm package.

Build and typecheck are different checks. `doctor` checks the local build and reports capability boundaries; it does not certify native agents or run the test suite.

## Add the portable workflow to a project

Use an existing target project, not the harness checkout itself:

```bash
export PROJECT="/absolute/path/to/your-project"
mkdir -p "$PROJECT/.agents"

# Preview paths, hashes and conflicts; does not write installation files.
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents"

# After reviewing the preview, explicitly apply it.
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents" --apply
```

The installer writes `rules/`, `templates/`, `hooks/`, the four portable skills (`capture-intent`, `requirements-spec`, `plan-mode`, `review-policy`) and a managed `AGENTS.md` inside that target. **It does not create the project's root instruction file or vendor-specific loaders.** Finish [agent setup](docs/agents.md) and verify that the agent actually reads the files. Wire `hooks/settings.example.json` into Claude Code (or your host) if you want hard gates — installing files is not enforcement.

For a project-root `AGENTS.md`, merge this section with existing instructions:

```markdown
## Agent Harness

Before task work, read `.agents/rules/harness-protocol.md`.
Load skills on demand from `.agents/skills/` (capture-intent, requirements-spec,
plan-mode, review-policy). Use the existing `plans/` tree when present.
Do not create a second progress tracker.
Keep native approvals, read-only restrictions and cancellation in effect.
```

Keep receipt backups and runtime state private. The [installation guide](docs/installation.md#files-to-keep-out-of-git) explains what to ignore, how to update, and how to roll back safely.

## A typical task

Ask your agent to inspect the project, reuse its active plan, state testable acceptance criteria, implement within scope, and produce current evidence for each criterion. Use the full SRS workflow for larger features, not as mandatory ceremony for every small edit.

A useful starting prompt:

```text
Read the project instructions and the harness protocol. Continue the matching
plan if one exists. For this task, identify the in-scope files and testable
acceptance criteria, then implement and verify them with native tools.
Report missing evidence separately from implemented code. Do not mark a skipped
review, a timed-out command or a generated report as acceptance PASS.
```

See [usage](docs/usage.md) for requirements modes, a runnable local CLI example, exit codes, review limitations and recovery.

## Checks for contributors

```bash
npm run typecheck
npm run build
node scripts/build-plugins.mjs
npm test
npm run package:check
```

Run a bounded subset with `node scripts/test.mjs --suite core`; other groups are `plugins`, `operations`, `regression`, `spec` and `legacy`. A passing subset is not a full-suite result. Check logs for the actual candidate and never count timeouts as PASS.

[Local verification](docs/runbooks/local-verification.md) · [Eval methodology](docs/evaluation-method.md) · [Private packaging](docs/runbooks/private-package.md)

## Repository map

```text
protocol/                    Portable operational rules
skills/capture-intent/       Skill + template for intent.md
skills/requirements-spec/    Skill, references, templates and Python validator
skills/plan-mode/            Skill + template for plan.md
skills/review-policy/        Skill + REVIEW.md template for multi-pass PR review
hooks/                       Reference hard controls + Claude settings example
templates/                   Lightweight task and reviewer templates
src/core/                    Contracts, evidence, evaluation, state and installer
src/cli/                     Local CLI implementation
bin/                         CLI entrypoint
adapters/                    DSH host bridge and portable capability disclosure
.agent-presets/              DSH-specific router presets
vendor/                      DSH plugins and their source/build outputs
contracts/                   Exported runtime JSON Schemas
scripts/                     Build, install, check and package entrypoints
evals/                       Offline observation summaries
tests/                       Local behavioral and regression checks
docs/                        Installation, usage, agent recipes and runbooks
plans/                       Upgrade work source and evidence summaries
```

## Trust, privacy and distribution

The same operating-system user can still modify a writable verifier, configuration or database. Model instructions and local hashes do not establish an independent security boundary. The CLI cannot manufacture an independent reviewer; a task gate does not grant release authority. Read the [threat model](docs/threat-model.md).

Do not commit API keys, MCP credentials, `.harness/`, installation receipts, raw sessions, personal memory or runtime-home dumps. The repository's `memory/INDEX.md` is an empty format example, not a shared private-memory store.

Distribution remains private while the imported skill's origin/license review is unresolved; see its [source manifest](skills/requirements-spec/source-manifest.json). Do not infer a blanket repository license from a vendor plugin's package metadata.
