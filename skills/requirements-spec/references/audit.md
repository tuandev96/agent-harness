
# Requirements audit

Two passes. The machine pass is cheap and absolute; the semantic pass is what
distinguishes a well-formatted spec from a comprehensive one.

## Pass 1 — structural (machine)

```bash
python3 "${SKILL_DIR}/scripts/validate_spec.py" <spec.md>
```

Checks: required sections; scope/actor/constraint bullets present; ID
uniqueness and contiguity; every feature has ≥1 requirement; every requirement
has ≥1 AC; requirement fields present and vocabularies valid; one `shall`;
EARS shape matches declared `Kind`; ambiguity terms; word count; AC has
Given/When/Then; NFR has a Metric with a number or a procedure; ADR has
Status/Context/Decision/Consequences; no TBD/TODO; mixed priority vocabularies.

**Every ERROR must be fixed.** Warnings are reported to the user with a
one-line reason when kept.

Reference for the rules: `references/document-format.md`.

## Pass 2 — semantic (read it yourself)

Score each dimension **pass / gap**, and turn every gap into a concrete edit.

**1. Failure-path coverage.** Count `Kind: Unwanted behavior` requirements. A
share far under ~15% usually means the spec documents the happy path only —
check it, do not assume it: re-run `references/elicitation-probes.md` sections 3–6, 8, 12 and
16–18 and see whether anything real is missing. If nothing is, the low share is
the correct answer; never add unwanted-behaviour requirements to move a ratio.

**2. Scope discipline.** Is every In Scope bullet reachable through at least one
feature? Is every Out Of Scope bullet enforced somewhere — a constraint, a
requirement that rejects it, or an ADR that defers it? Unenforced Out Of Scope
is how V1 absorbs V2.

**3. Constraint ownership.** Every Key Constraint maps to a requirement that
enforces it or an ADR that decided it. List the orphans.

**4. Actor coverage.** Every actor appears in at least one requirement or AC.
An actor nobody interacts with was imagined; a requirement about an unlisted
actor means the actor list is incomplete.

**5. Testability.** Sample 10 ACs at random. For each, can you describe the
fixture and the assertion in one sentence without opening the codebase? If
three or more fail, the ACs are decorative.

**6. Trace integrity.** `Feature:` back-links resolve; `[Source: …]` tags (if
used) point at real upstream IDs; ADR supersession chains are intact.

**7. Quality coverage.** ≥6 ISO 25010 characteristics represented, 12–20 NFRs,
each Metric with a threshold or a named procedure and, where relevant, an
environment and an exclusion clause.

**8. Decision coverage.** 10–18 ADRs; each one admits a cost in Consequences;
no ADR contains `shall`.

**9. Independence.** Two requirements obliging the same thing = pick the owner,
delete the other. Requirements that can only be marked done together should be
one requirement.

**10. Implementation leakage.** Requirements naming libraries, tables or
functions as the obligation. Move the choice to an ADR, restate the observable
property.

**11. Provenance.** For every threshold, priority and `Status: Accepted`, ask:
who supplied this? Anything the author invented must appear in `## Assumptions
and Open Questions` with an owner. A spec with no assumptions and no open
questions was either fully briefed — rare — or is quietly asserting guesses as
facts. This is the one dimension a passing validator cannot help you with, so
run it last and run it honestly.

## Output

Report in this shape:

```
Structural: n errors, m warnings   (list errors with line numbers)
Coverage:   F=.. REQ=.. AC=.. NFR=.. ADR=..  REQ->AC ..%
Unwanted-behaviour share: ..%
Unowned assumptions: ..   Open questions: ..
Semantic gaps:
  1. <dimension> — <what is missing> — <the concrete edit>
Verdict: BUILDABLE | NOT BUILDABLE (reason)
```

`NOT BUILDABLE` whenever structural errors remain, REQ→AC coverage is under
100%, or a feature/constraint/scope entry is unowned. Say it plainly rather
than softening it — an unbuildable spec discovered now is cheap.

A clean structural pass is not a verdict. The validator checks grammar and
wiring; it cannot tell you the scope is wrong, the thresholds are fiction or a
domain rule is missing. Never report `0 errors` as if it meant `comprehensive`
— report it as pass 1 of 2, and let pass 2 decide.

## Auditing someone else's spec

Run pass 1 first and lead with the numbers; they are neutral. Then give the
semantic gaps in severity order with the exact edit for each, not a critique.
Do not rewrite the document unless asked — return the work list.
