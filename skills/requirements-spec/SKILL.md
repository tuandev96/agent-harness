---
name: requirements-spec
description: Create, update or audit a formal SRS with EARS requirements, acceptance criteria, measurable NFRs and ADRs. Also set up, update or audit requirement execution tracking with traceability, evidence, review, freshness and change control. Use for requirements specs, scope readiness, REQ/AC/NFR progress or missing-proof reviews; tracking setup is not product implementation or CI activation.
---

# Requirements Spec

The specification is a `System Requirements` markdown document whose requirements
are EARS-formed, individually testable and covered by acceptance criteria.
Execution tracking is a separate, optional workflow: one project-declared work
source owns progress; the ledger indexes mappings and evidence. Use `plans/` when
project/global instructions require it, and reuse an existing authoritative tracker. A frozen spec is not a product PASS.

Resolve `SKILL_DIR` to the directory containing this loaded `SKILL.md`; do not
assume a vendor-specific environment variable is already set.

## Modes

Pick the requested mode and state it. For a combined request, perform only the
authorized phases in order: settle/version requirement changes before adopting
them into tracking. A plain SRS request does not initialize tracking. When an SRS
update affects existing tracking, identify impacted criteria/evidence and follow
the accepted project change rules; do not silently carry PASS across the change.

| Mode | Trigger | Path |
|------|---------|------|
| **create** | no spec exists yet | steps 1–8 below |
| **update** | a spec exists, new scope arrives | audit first, then steps 3–8 on the delta — **never renumber an existing ID** |
| **audit** | "is this spec good enough", reviewing someone else's | [references/audit.md](references/audit.md); report findings, do not rewrite unless asked |
| **track-setup** | create a framework to follow each requirement | [references/tracking.md](references/tracking.md), then its contract/templates; adapt to the project's actual baseline |
| **track-update** | link work/evidence, assess progress, repair an authorized tracking gap | [references/tracking.md](references/tracking.md); continue the accepted project policy and history |
| **track-audit** | check completeness, false-green risks, drift or tracking rules | [references/tracking-gates.md](references/tracking-gates.md) + project records; read-only findings unless fixes are authorized |

## Pipeline (create)

**1. Locate inputs.** Brief, transcript, codebase, prior spec, normative
baselines. Read them before writing anything.

**2. Discovery.** `references/discovery.md` → Goal, Scope, Users/Actors, Key
Constraints, feature list. Stop and ask the blocking questions it surfaces.
Ambiguity resolved by guessing is the #1 cause of a spec that reads well and is
worthless.

**3. Features.** Decompose into `F-001…`, each with a one-sentence Intent. A
feature with zero requirements is a defect — write its requirements or delete it.

**4. Requirements.** `references/ears.md`, feature by feature. **One obligation**
per requirement, expressed with one `shall`; a second `shall` only when it
continues that same obligation and the two halves cannot pass or fail
independently. EARS shape must match the declared `Kind`.

**5. Acceptance criteria.** `references/acceptance.md`. **Every REQ gets at
least one AC**, written in the same pass as the REQ — never as a cleanup phase.
This is the single biggest gap between an adequate spec and a comprehensive one.

**6. Cross-cutting sweep.** Run `references/elicitation-probes.md` over the
whole system before declaring the feature set done: races, idempotency, unknown
outcomes, fail-closed, secrets, data lifecycle, authority conflicts, limits,
migration and rollback, audit atomicity. Each probe that lands becomes a
requirement — usually `Unwanted behavior`. Specs feel comprehensive because of
these, not because of feature count.

**7. Quality and decisions.** `references/quality-iso-25010.md` for NFRs grouped
by characteristic, each with a Metric naming what is measured, how, and under
what load or window. `references/adr.md` for the choices already implied by
Scope and Key Constraints — an unexplained constraint cannot be renegotiated
later.

**8. Assemble and audit.** Render with `references/document-format.md` from
`assets/spec-template.md`, then:

```bash
python3 "${SKILL_DIR}/scripts/validate_spec.py" <file.md>
```

Fix every ERROR. Disposition every WARN — fixed, or kept with a one-line reason.
Then run pass 2 of `references/audit.md`. A clean validator run is pass 1 of 2,
never a verdict: it checks grammar and wiring, not whether the scope is right,
the thresholds are real, or a domain rule is missing.

## Execution tracking boundary

Load tracking references only for tracking work. Keep stable IDs and separate
work completion, acceptance evidence, requirements freeze and release readiness.
Use the existing project tracker if present; do not reseed, erase history or
replace its contract just because this skill was upgraded. Importing new rules
into a pinned project policy requires that project's change-control process.

For setup, copy/adapt the bundled templates into the project's tracking/work tree;
derive every ID/count/release partition from its own sources. Draft templates,
missing evidence and unassigned reviewers cannot become VERIFIED. No product,
tracker executable, CI, external service or branch setting is authorized merely
by asking for this documentation framework. Use available independent review
within runtime limits; missing review keeps the dependent gate pending.

## Non-negotiable quality bar

1. Every feature has ≥1 requirement. Every requirement has ≥1 acceptance criterion.
2. One obligation per requirement, ≤45 words, no `and/or`.
3. No ambiguity words: fast, easy, robust, appropriate, sufficient, user-friendly,
   as needed. Replace with a number or delete the requirement.
4. Every ID unique and stable; `Feature:` back-links resolve. Editing a spec
   moves no existing ID.
5. In Scope and Out Of Scope both explicit. Out Of Scope is where the spec earns
   its keep — it is what stops V1 from silently absorbing V2.
6. Requirements say *what must hold*, never *how to code it*. Implementation
   choices live in ADRs.
7. Failure, race and abuse paths are specified, not only happy paths.
8. **Nothing invented silently.** You will not be told every threshold, priority
   or policy. Anything you supplied yourself — a latency number, a retention
   window, a `Must`, an ADR you decided rather than recorded — goes in
   `## Assumptions and Open Questions` with its owner. Never write
   `Status: Accepted` or `Verified` for a decision nobody made, and never invent
   a number to make a gap disappear. A named open question is a finished spec;
   a fabricated threshold is a broken one.
9. Every count in these references (features, NFRs, ADRs, unwanted-behaviour
   share) is a **sanity range, not a target**. A small system is allowed to be
   small; padding to hit a number hides which entries carry weight.
10. Language: match the user's. Mixed Vietnamese/English prose is fine if the
    source is mixed, but structural keywords stay English (`shall`,
    `Given/When/Then`, `Kind`, `Priority`) so the document stays checkable.

## Stop and ask

Check existing user instructions and approved project sources first; do not ask
again for authority already granted. Do not assume your way past an unknown that touches scope, authorization,
irreversible effects, data loss, money, safety, tenancy or compliance. Ask.
Lesser unknowns may become Assumptions with a named owner, but then the
document stays `Draft`.

## Output rules

- For SRS create/update, write to `plans/reports/requirements-{YYMMDD-HHMM}-{slug}.md`, or the path the
  user names. Markdown is the source of truth — this spec is destined for a
  code/doc repo, so the global HTML-report rule does not apply unless asked.
- SRS header: `# System Requirements`, then `Source:` and `Exported:` lines.
- Report after the audit: features, requirements, ACs, NFRs, ADRs, REQ→AC
  coverage %, unresolved warnings, and open questions with owners.
- Tracking outputs follow [references/tracking.md](references/tracking.md). Report
  exact target scope, verified/partial/open/unverified criteria and enforcement
  status; follow the user/project report format. Never report checker tests as
  product acceptance. Audit findings must identify affected REQ/AC/NFR where applicable.

## Files

| File | Use |
|------|-----|
| `references/discovery.md` | Goal/Scope/Actors/Constraints craft, feature decomposition bands |
| `references/elicitation-probes.md` | 18 probe sections — the mechanism that makes a spec comprehensive |
| `references/ears.md` | the six EARS patterns and the rules for writing one |
| `references/acceptance.md` | Given/When/Then craft, what needs more than one AC |
| `references/quality-iso-25010.md` | NFR craft plus the characteristic table (2011 and 2023 editions) |
| `references/adr.md` | decision records, what earns one |
| `references/audit.md` | two-pass gate: machine, then semantic |
| `references/document-format.md` | exact headings, field order, ID rules, vocabularies |
| `references/worked-example.md` | graded ✓/✗ excerpts from two real specs |
| `assets/spec-template.md` | empty canonical skeleton — copy this |
| `tests/fixtures/good.md` | a small complete spec that validates clean; fastest way to see the whole shape |
| `tests/run.sh` | validator self-check (good passes, bad reports 15 defect classes) — run after touching the script |

Tracking-only resources (paths resolve relative to this skill directory):

| File | Read when |
|------|-----------|
| [references/tracking.md](references/tracking.md) | setup, adoption, normal updates, publication/recovery and policy changes |
| [references/tracking-contract.md](references/tracking-contract.md) | generating or reviewing ledger, mapping, run, review, policy and history records |
| [references/tracking-gates.md](references/tracking-gates.md) | auditing progress or designing future checker/CI acceptance |
| [assets/tracking/ledger.json](assets/tracking/ledger.json) | seed structure; populate from actual baseline, never treat empty template as complete |
| [assets/tracking/work-item.md](assets/tracking/work-item.md) | a plan with explicit criterion scope, Ready, evidence and handoff |
| [assets/tracking/mapping.json](assets/tracking/mapping.json) | immutable criterion/code/test/impact snapshot before its review |
| [assets/tracking/run-evidence.json](assets/tracking/run-evidence.json) | a real run's evidence, never a fake pre-filled result |
| [assets/tracking/review.md](assets/tracking/review.md) | independent mapping/assessment/policy/publication review |
| [assets/tracking/change-request.md](assets/tracking/change-request.md) | concrete scope/control/coordination decisions and source authority |
| [assets/tracking/ledger-transition.json](assets/tracking/ledger-transition.json) | immutable publication history; not a locking implementation |
