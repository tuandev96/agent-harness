# Review instructions

Tech lead owns this file. Agents and humans apply the same passes to every PR.
Findings do not replace code-owner approval or branch protection.

## Passes

Tag each finding with its pass:

- **Bugs** — logic errors, broken edge cases, subtle regressions
- **Security** — injection, auth gaps, secrets in logs, unsafe paths
- **Compliance** — the change matches `spec.md`, `plan.md` and design principles
- **Evidence** (harness projects) — AC still proven; tests not weakened

## What Important means here

Reserve Important for findings that would break behavior, leak data, or
breach a policy. Style and naming are nits.

## Cap the nits

Report at most five nits per review; summarize the rest as a count.

## Do not report

- Generated files under: `{add generated paths}`
- Anything CI already enforces (lint, format)
- Hypothetical issues with no path in this change

## Spec and plan locations

- Intent: `{path or "none"}`
- Spec: `{path or "none"}`
- Plan: `{path or "none"}`

## Owner

- Code owners / required reviewers: `{team or names}`
- Escalation for Important findings: `{role}`
