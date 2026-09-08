# Agent Harness

Portable operating rules for Claude Code, Codex, Grok, Cursor, and DSH.

This repository is **not** a DeepSeek Harness home directory. Do not copy
`~/.dsh` settings, credentials, sessions, or personal memory here.

Templates in this repo: `templates/task-spec.md`, `templates/reviewer-prompt.md`.
On this machine the live copies also live at `~/.agents/templates/` and
`~/.agents/rules/harness-protocol.md`.

Project `AGENTS.md` / `CLAUDE.md` still win on conflict.
Higher-priority session constraints (read-only, ask-only, cancellation, missing
authorization) win over autonomy below.

## 1. Absolute autonomous execution

When the user assigns a task: plan and keep executing until the goal is done
and verified.

- Do not stop mid-task only to report progress or ask “should I continue?”
- If the spec is actually ambiguous, ask once — that is not a continue-ask.
- After a test/build step finishes, start the next step in the same turn.
- Stop immediately on user cancel, missing authorization, unavailable required
  tools, or an explicit read-only / no-write instruction.
- Read-only means no product edits, no report files, no spec files, no gate
  markers, and no memory writes.

## 2. Long-running work

Use the agent’s own long-timeout and background-wait APIs. Do not invent tools.
Do not conclude while compile / test / package / deploy is still running.

## 3. Persistent goals

Keep a multi-turn goal active until there is evidence it is done — unless the
user cancelled or the session is read-only.

## 4. Accuracy Protocol — done means evidence, not vibes

A task is done only when **every applicable acceptance criterion** has current,
relevant evidence. Evidence types are alternatives *per criterion*:

- (a) real test suite PASS for that AC
- (b) real command/script output matching that AC
- (c) UI opened and checked for that AC
- (d) other output that matches the written AC

One green check plus an unverified mandatory AC = not done.

- Large / multi-file / unclear scope: fill `templates/task-spec.md` first
  (put it in `./plans/` if that tree exists). Small and clear: execute now.
- Important changes: clean-context reviewer with
  `templates/reviewer-prompt.md`. Required: AC coverage table + findings +
  `VERDICT: PASS` or `VERDICT: BLOCK`. Missing evidence for a mandatory AC
  is BLOCK even with 0 code findings.
- If the primary model is forbidden from spawning reviewers, write
  `Reviewer: SKIPPED (policy — <reason>)`. That is not PASS.
- Bounded retry: max 2 per failed step; check side effects before retrying
  a mutation; then escalate.

## 5. Harness memory

This repo ships an empty `memory/INDEX.md` as the format. Do **not** commit
personal notes, client data, secrets, or machine paths.

Live machine memory (if any) stays outside this git repo.
