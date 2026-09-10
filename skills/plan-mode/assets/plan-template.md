# Plan: {short name}

From: {intent.md / spec.md path + date or commit}.
Author: ____. Status: draft | accepted.
Accepted by: ____ (when accepted).

## Goal

One or two sentences. Not a restatement of the whole spec.

## Files that change

| Path | Action (new / edit / delete) | Why |
|------|------------------------------|-----|
|      |                              |     |

Include read-only files that must be consulted if they are load-bearing.

## Order of work

Numbered steps small enough to verify independently. Each step names the
proof (test command, screenshot, curl) that shows it worked.

1. …
2. …
3. …

## Risks

| Risk | Likelihood / impact | Mitigation |
|------|---------------------|------------|
|      |                     |            |

Call out rate limits, auth, migrations, frozen packages, shared files.

## Proof

How acceptance is demonstrated. Prefer real commands over prose:

- Unit/integration: `…`
- Manual/UI: …
- Contract/API: …

## Out of scope

What this plan will not touch, even if related.

## Drift log (append during implementation)

| Date | Departure from plan | Reason | Plan updated? |
|------|---------------------|--------|---------------|
|      |                     |        | yes/no + commit |
