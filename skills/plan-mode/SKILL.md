---
name: plan-mode
description: Turn an approved intent or spec into a committed implementation plan (plan.md) before writing product code. Use when starting substantial implementation, when the user asks for a plan, when continuing from an accepted spec, or when a merged diff must be checked against the approved plan. Do not use this to invent new product scope that the intent/spec did not authorize.
---

# Plan Mode

Work starts with a written plan. Design review happens before code is generated,
when changing course is still editing a document. The approved plan is committed
as `plan.md` and later stages check the diff against it.

Resolve `SKILL_DIR` to the directory containing this loaded `SKILL.md`.

## When this applies

| Trigger | Action |
|---------|--------|
| Approved `intent.md` / `spec.md` ready for engineering | Produce plan from those inputs only |
| User asks “how should we implement X” for multi-file work | Plan first; do not implement until accepted |
| Repo policy requires plan before product edits | Plan, commit, then implement |
| Implementation departs from plan | Update `plan.md` in the same change |

## Pipeline

**1. Locate inputs.** `intent.md`, `spec.md`, project instructions,
`plans/` tree, relevant code. Read before planning. If the repo has an active
`./plans/` folder, write the plan there — do not start a second tracker.

**2. Survey the codebase (read-only).** Identify files that change, existing
patterns to follow, tests that already cover neighbors, and landmines (frozen
packages, generated code, auth paths).

**3. Draft the plan.** Render from `assets/plan-template.md`:

```text
${SKILL_DIR}/assets/plan-template.md
```

Required sections: Files that change, Order of work, Risks, Proof,
Out of scope. Name the tests or commands that will prove each step.

**4. Interrogate.** Answer without being asked if material:

- What could this break?
- Which step is riskiest?
- What options were rejected and why?
- What is the rollback path?

**5. Engineer acceptance.** Present the plan. Iterate until someone who never
saw the conversation could implement from the document alone. Do not start
product edits until the plan is accepted.

**6. Commit `plan.md`.** It joins the audit trail. Attach or reference the
intent/spec revision it derives from.

**7. Implement from the plan.** Checkpoints stay in the plan or the existing
work source. Evidence for acceptance criteria comes from real runs, not from
the plan text itself.

**8. Keep plan ↔ reality in sync.** If implementation departs, update the plan
in the same commit as the code. A hook or reviewer should catch drift; do not
rely on memory.

## Governance

- The plan author does not approve release authority.
- Higher-risk changes still need the project’s named tech-lead or architect
  path — this skill does not replace it.
- Do not weaken tests, thresholds, or policy to make a step “pass.”
- Cancellation and read-only scope still bind; planning is not permission to
  mutate protected paths.

## Done means

- [ ] Inputs (intent/spec) are referenced with revision or path
- [ ] Files, order, risks, and proof are explicit
- [ ] Engineer accepted the plan (or requested changes recorded)
- [ ] Plan lives in the authoritative work source
- [ ] Departures update the plan in the same change as the code

## Relationship to other skills

| Skill | Role |
|-------|------|
| `capture-intent` | Upstream: what and why |
| `requirements-spec` | Upstream for large work: formal REQ/AC/NFR |
| `review-policy` | Downstream: PR review checks diff against this plan |
| Harness protocol | Evidence, retries, independent review still apply |
