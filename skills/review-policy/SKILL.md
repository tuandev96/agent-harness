---
name: review-policy
description: Apply a multi-pass PR review policy (bugs, security, compliance vs spec and plan) with severity ranks and nit caps. Use when reviewing a pull request, writing or updating REVIEW.md, acting on @claude review comments, or auditing whether a diff matches the approved plan/spec. Do not use this to approve your own change or to replace independent AC evidence review from the harness protocol.
---

# Review Policy

Give every PR the same review passes. Findings are ranked by severity. Human
attention stays on intent and risk; mechanical policy is applied while the
agent reviews.

Resolve `SKILL_DIR` to the directory containing this loaded `SKILL.md`.

## When this applies

| Trigger | Action |
|---------|--------|
| PR opened / ready for review | Run the configured passes against the diff |
| `REVIEW.md` missing or stale | Draft/update from `assets/REVIEW-template.md` with the tech lead |
| `@claude` on a review comment | Address the comment if authorized; push a fix PR commit; never force-push or approve yourself |
| Change claims to follow `plan.md` / `spec.md` | Compliance pass against those exact revisions |

## Review passes

Tag every finding with its pass. Default passes (project may narrow in
`REVIEW.md`):

1. **Bugs** — logic errors, broken edge cases, subtle regressions, missing
   failure paths.
2. **Security** — injection, auth gaps, secrets in logs/diffs, unsafe
   deserialization, path traversal, SSRF, privilege confusion.
3. **Compliance** — the change matches `intent.md` / `spec.md` / `plan.md`
   and stated design principles. Flag plan drift even when the code “works.”
4. **Harness evidence** (when this repo uses the portable protocol) —
   acceptance criteria still have current evidence; tests were not weakened;
   timeout/skip/self-review is not reported as PASS.

## Severity

| Level | Meaning | Default |
|-------|---------|---------|
| **Important** | Would break behavior, leak data, or breach policy | Must fix or explicitly accept with owner |
| **Nit** | Style, naming, minor clarity | Cap volume; summarize remainder |

Reserve Important for real risk. Style is a nit. CI already enforces lint —
do not re-report it.

## Nit cap

Report at most **five** nits per review. Summarize the rest as a count
(`+7 nits in formatting`). Generated paths and anything CI enforces are out of
scope unless the policy says otherwise.

## Do not report

- Generated files under paths listed in `REVIEW.md`
- Formatting already fixed by the project formatter
- Hypothetical issues with no reachable path in this change
- Requests to weaken tests, hooks, or the evaluator to make the PR green

## Workflow

**1. Load policy.** Read repo `REVIEW.md` if present; else use
`assets/REVIEW-template.md` defaults and say you used defaults.

**2. Read the diff and the plan.** `plan.md`, `spec.md`, `intent.md` when
they exist. A green CI is not a substitute for reading the change.

**3. Run each pass.** One finding = one location (`file:line`) + what is
wrong + why it matters + suggested fix direction. No wall of philosophy.

**4. Rank and cap.** Importants first, then nits up to the cap.

**5. Verdict.** Output:

```text
VERDICT: PASS | BLOCK
Important: N
Nits: N (capped; +M omitted)
```

`BLOCK` when any Important remains open. Missing evidence for a mandatory
acceptance criterion is BLOCK even with zero code findings.

**6. Feed CLAUDE.md.** If the same class of mistake appears twice, propose a
one-line addition to project agent instructions as part of the review — do
not silently edit global policy.

## Governance

- The author of a change does not approve it through this skill.
- Findings are advisory to the human code owner / branch protection.
- Review comments and fixes are logged in the PR; that is the audit record.
- Do not invent approvals, required-check status, or release authority.

## Done means

- [ ] Policy source named (`REVIEW.md` revision or defaults)
- [ ] Each Important finding has file:line and impact
- [ ] Nits capped
- [ ] Explicit VERDICT
- [ ] No self-approval or release claim
