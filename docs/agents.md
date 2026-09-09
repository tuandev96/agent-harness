# Set up your coding agent

[Installation](installation.md) · [Usage](usage.md) · [Troubleshooting](troubleshooting.md) · [README](../README.md)

These recipes connect **portable instructions and skills** to existing clients. They do not install host-enforced permissions or certify native conformance. They were checked against the linked primary documentation on **2026-09-09**; no paid native-agent session is implied by that documentation review.

Assume the project-local installation from [installation](installation.md): `$PROJECT/.agents/` contains `rules/`, `templates/` and `skills/requirements-spec/`. Use the personal-installation section instead when the bundle is in your home directory.

## Compatibility at a glance

| Client | Instruction entrypoint used in this guide | Skill exposure | Runtime integration in this repo |
|---|---|---|---|
| Codex | Project `AGENTS.md` | `.agents/skills/requirements-spec/` | Portable workflow + optional local CLI; no dedicated native enforcement adapter |
| Claude Code | Project `CLAUDE.md` importing `AGENTS.md` | Explicit file read, optionally `.claude/skills/requirements-spec/` | Portable workflow + optional local CLI |
| Cursor | Project `AGENTS.md`, or a project `.mdc` rule | `.agents/skills/requirements-spec/` | Portable workflow + optional local CLI |
| Grok Build | Project `AGENTS.md` | Explicit file read, optionally `.grok/skills/requirements-spec/` | Portable workflow + optional local CLI |
| DSH | The instruction loader of your DSH deployment | Explicit file read or deployment skill loader | Host plugin exists; authority and task binding must be integrated |
| Gemini CLI | Project `GEMINI.md` | Explicit file read | Manual recipe only; not in the implemented runtime capability registry |

The first five runtime labels are described in [`adapters/portable/index.mjs`](../adapters/portable/index.mjs). Its native-conformance flag is deliberately false. Choosing a different model in an editor does not change the editor's instruction loader.

## Shared project loader

**Merge**, do not overwrite, this section into the target project's root `AGENTS.md`. Keep existing domain-specific rules and accepted plans:

```markdown
## Agent Harness

Before task work, read `.agents/rules/harness-protocol.md`.
For requirements or tracking work, read `.agents/skills/requirements-spec/SKILL.md`
and only the references needed for that mode.
Use the existing `plans/` tree when present. Do not create a second progress tracker.
Keep native approvals, read-only restrictions and cancellation in effect.
```

A path mentioned in instructions is not evidence that its contents were loaded. Run the [loading check](#verify-loading). Use the project's native permission flow if the file cannot be read; do not disable the sandbox or replace the system prompt to make it accessible.

## Codex

Codex discovers project `AGENTS.md` guidance and skills under project `.agents/skills/`. More specific instruction files and `AGENTS.override.md` can affect the effective guidance. Keep the root loader short and inspect overrides if it appears to be ignored. Sources: [Codex instructions](https://developers.openai.com/codex/agent-configuration/agents-md), [Codex skills](https://developers.openai.com/codex/build-skills).

After installing the portable files and merging the root loader:

```bash
cd "$PROJECT"
codex
```

In the session, request the loading check below. For an SRS task, reference `$requirements-spec` where the client supports skill selection, or explicitly ask it to read `.agents/skills/requirements-spec/SKILL.md`. The file-read route avoids assuming a slash-command interface across Codex surfaces.

This repo does not supply a Codex approval-hook installer or a Codex-specific independent-review service. Use Codex's native permissions and the optional local CLI without changing those controls.

## Claude Code

Claude Code uses `CLAUDE.md`; an existing `AGENTS.md` should be imported explicitly. Merge this into the **root** `CLAUDE.md`, outside a code fence:

```markdown
@AGENTS.md
```

Relative imports resolve from the containing file. If your loader is `.claude/CLAUDE.md` instead, the corresponding root-file import is `@../AGENTS.md`. Do not create both just to repeat the same protocol. Source: [Claude Code memory and imports](https://code.claude.com/docs/en/memory).

Launch Claude Code from the project. Use `/context` to inspect the loaded memory files, then perform the loading check. The root instructions direct it to read the protocol and load the skill only for relevant tasks.

For an explicit `/requirements-spec` command, the full bundle can be registered under `.claude/skills/requirements-spec/`; use the guarded copy below. Inspect existing personal/project skills for duplicates and verify the selected source path. Merely installing into `.agents/skills/` is not the Claude-specific registration step documented here. Source: [Claude Code skills](https://code.claude.com/docs/en/skills).

## Cursor

Open the target project and use its root `AGENTS.md`. Current Cursor documentation supports that file and project `.agents/skills/`, so a second full skill copy is unnecessary for this layout. Sources: [Cursor rules](https://cursor.com/docs/rules), [Cursor skills](https://cursor.com/docs/skills).

When project policy requires a `.mdc` rule instead of a root loader, create/merge `.cursor/rules/agent-harness.mdc` with:

```markdown
---
description: Load the project's portable harness protocol
alwaysApply: true
---

Before task work, read `.agents/rules/harness-protocol.md`.
For requirements tasks, read `.agents/skills/requirements-spec/SKILL.md`.
Keep project scope, native permissions and the existing work source authoritative.
```

Use one primary loader rather than repeating the whole protocol in multiple always-on rules. In a new chat, verify actual file reads. Project-local files must be available in the remote workspace for remote/cloud use; a personal installation on your laptop is not automatically part of that workspace.

## Grok Build

For the official Grok Build client, use the shared project `AGENTS.md`. Start it from the target repository and inspect discovery:

```bash
cd "$PROJECT"
grok inspect
grok
```

`grok inspect` reports discovered configuration/instructions; it is not a harness acceptance test. Sources: [Grok Build project rules](https://docs.x.ai/build/features/project-rules), [Grok Build getting started](https://docs.x.ai/build/overview).

The explicit skill-file prompt works without registering another folder. For native skill discovery, use `.grok/skills/requirements-spec/`. Grok also documents user-level `~/.agents/skills/` discovery, making the personal portable target useful across projects. Source: [Grok skills](https://docs.x.ai/build/features/skills-plugins-marketplaces).

For a third-party client using a Grok model, follow **that client's** rules and skill paths instead. Do not assume every command named `grok` has the official client's flags or loaders. This repository does not install Grok hooks, modify provider config or grant extra permissions.

## Optional native skill copy for Claude or Grok

Run this only after reviewing existing skill locations. It copies the complete project-local bundle and refuses to replace an existing folder or symlink. Choose one destination; do not paste both values as a single path.

```bash
# Use .grok/skills for Grok Build instead.
export NATIVE_SKILLS=".claude/skills"
python3 - "$PROJECT" "$NATIVE_SKILLS" <<'PY'
import pathlib, shutil, sys
root = pathlib.Path(sys.argv[1]).resolve(strict=True)
relative = sys.argv[2]
if relative not in {'.claude/skills', '.grok/skills'}:
    raise SystemExit('Unsupported destination')
source = root / '.agents/skills/requirements-spec'
if not (source / 'SKILL.md').is_file():
    raise SystemExit('Install the full portable bundle first')
if source.is_symlink() or any(p.is_symlink() for p in source.rglob('*')):
    raise SystemExit('Review the source symlink before copying')
parent = root
for part in pathlib.PurePosixPath(relative).parts:
    parent = parent / part
    if parent.is_symlink():
        raise SystemExit('Review the destination symlink before copying')
destination = parent / 'requirements-spec'
if destination.exists() or destination.is_symlink():
    raise SystemExit('Destination exists; inspect and reconcile instead of overwriting')
parent.mkdir(parents=True, exist_ok=True)
shutil.copytree(source, destination, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
print(destination)
PY
```

This copy is **not managed by the portable installer's receipts**. Record which revision it came from, compare it after updates and remove it manually only when you intend to unregister it. Duplicate skill names can select an unintended version; verify the actual `SKILL.md` read, not just the visible command name.

## Personal installation pointers

With the bundle installed into `~/.agents`, merge a short pointer into the native global instruction location, using the resolved absolute path where necessary. Never overwrite a pre-existing file wholesale.

| Client | Pointer location | Pointer content |
|---|---|---|
| Codex | `$CODEX_HOME/AGENTS.md`, normally `~/.codex/AGENTS.md` | Ask it to read your `~/.agents/rules/harness-protocol.md`; inspect a possible global override |
| Claude Code | `~/.claude/CLAUDE.md` | `@../.agents/rules/harness-protocol.md`, plus an on-demand skill-path instruction |
| Cursor | User Rules in the client, or project root loader | Instruct a read of the actual personal protocol path; do not assume `~/.cursor/AGENTS.md` is a global loader |
| Grok Build | `~/.grok/AGENTS.md` | Instruct a read of the personal protocol; user-level `.agents/skills/` is documented |

These locations follow the same official references linked above. Shell variables in Markdown are not shell expansion: an absolute path or explicit `~`-resolution instruction is safer than leaving a literal `$HARNESS_HOME` for the model to guess. Keep personal paths out of shared project instructions.

## DSH

Portable mode works by having the deployment's instruction loader read the installed protocol and relevant skill. Keep these files separate from `~/.dsh` credentials, sessions and live settings.

The runtime path is an **operator integration**, not a one-command installer. [`adapters/dsh/host-plugin.mjs`](../adapters/dsh/host-plugin.mjs) requires:

| Host input | Required behavior |
|---|---|
| Built checkout | `dist/core/service.js` and all imported modules must be present |
| `config.root` | Actual project workspace; the calling agent's canonical cwd must match |
| `config.projectId` | Stable ID for the intended project |
| `config.database` | Private database path provisioned by the operator |
| `harnessAuthority.authorize` | Host-supplied authorization against principal, action and task digest; never an always-allow worker parameter |
| `agents` and `tools` services | Real host registry and execution identity |
| Task creation and binding | Operator creates the canonical task and calls `harnessControl.bind(agent, taskId)` for the exact live agent |

After mounting, `harnessGate` provides delivery decisions and `harnessControl` exposes operator controls. Worker tools registered by this plugin are `harness_status`, `harness_run` (parameter `bindingId`) and `harness_cancel`. Task creation, approval, reviewer submission and binding are not exposed as worker tools.

An operator must connect the real reviewer channel through the service API; this repo does not manufacture that identity or provide a universal DSH configuration snippet. Agent IDs and session IDs from DSH are not interchangeable with the local CLI's persisted operator identity.

Missing service yields `EVIDENCE_PENDING` in the delivery bridge; missing binding yields `TASK_BINDING_REQUIRED` inside host diagnostics. Those are setup failures, not reasons to restore self-declared PASS. The CLI is **not an MCP stdio server**, so do not add `node bin/harness.mjs` as an MCP command in another agent.

MCP settings and replay/argument plugins are DSH-specific. See their [MCP README](../vendor/dsh-mcp-settings/README.md), [plugin sources](../vendor/dsh-mcp-settings/src/index.js) and [troubleshooting](troubleshooting.md). Native DSH conformance remains unverified; the checklist above specifies what the host must supply, not a claim that it has been supplied.

## Gemini CLI — manual portable recipe

Gemini CLI supports project `GEMINI.md` context and file imports. Merge `@./AGENTS.md` into a root `GEMINI.md` after creating the shared loader. Use `/memory show` or `/memory reload` to inspect/reload context, then explicitly request the harness loading check. Source: [Gemini CLI context files](https://geminicli.com/docs/cli/gemini-md/).

Read the skill by its project path for requirements work. This is a documentation recipe, not a Gemini runtime adapter, native skill registration or enforcement claim in `adapters/portable/index.mjs`.

## Verify loading

Run this in a new native session after setup:

```text
Read the effective project instructions, then open
.agents/rules/harness-protocol.md and, for this requirements check,
.agents/skills/requirements-spec/SKILL.md.
State the exact paths read, the single authoritative work source, and how you
will distinguish implemented work, current evidence and missing review.
Do not edit files, initialize a tracker or run a paid model benchmark.
```

Inspect actual tool reads or the client's instruction/context display. A model saying it complied is not sufficient evidence of loading. Record the client version, project path and observation locally before describing that client's integration as verified.

For day-to-day tasks, keep the skill on demand and proceed with the [usage workflows](usage.md); do not repeat a full setup audit at every prompt.
