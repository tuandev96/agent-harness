# Review — <ID>

Record kind: TEMPLATE_NOT_REVIEW
Record state: DRAFT
Record ID:
Purpose: MAPPING_REVIEW | ASSESSMENT | POLICY_REVIEW | PUBLICATION_REVIEW (choose one)
Supersedes (ID + immutable DocumentRef, or none):
Verdict: PENDING
Author identity/session:
Independent reviewer identity/session:
Reviewed at:
Immutable work-plan ref:
Baseline descriptor + target scope:
Previous/accepted PolicyRef (or FIRST_PIN only for initial POLICY_REVIEW):
Mapping/run/artifact refs + hashes:
Candidate/product input identities and profiles:
Authority source/ref:

Copy for real review; change record_kind to REVIEW, fill actual observations, then
finalize. Only FINAL PASS/FAIL/BLOCKED records may support gates; placeholders
or a different name/session of the author cannot supply independent review.

## Purpose-specific binding

MAPPING_REVIEW / ASSESSMENT: bind source/mapping/product candidate and criterion
inputs; do not include child ledger/head hash if that child will reference this
review. POLICY_REVIEW: bind previous policy (FIRST_PIN only when none existed),
exact proposed normative input hashes, source authority and compatibility/impact;
not the future manifest hash. PUBLICATION_REVIEW: created after child, binds exact
before/after snapshots, expected head, policy, assignment/epoch and row/root diff;
only transition may reference it, never the reviewed child.

Purpose-specific refs/hashes/delta:
Fields not applicable and precise reason:

## Criterion assessment

| REQ/AC/NFR | Canonical meaning/metric | Actual path/assertion/test/profile | Current inputs and run refs | Outcome/freshness/last known | Required coverage or gap | Findings | Gate_ready/reasons; derived REQ status |
|---|---|---|---|---|---|---|---|

List every assessed row, including failing, stale and incomplete rows. Do not
copy Expected into Actual. Publication/policy-only review does not assess product
criteria; state that scope instead of inventing rows or runtime verdicts.

## Checks

- [ ] IDs and per-criterion target allocation exact; no implicit scope narrowing.
- [ ] Assertions/oracle match canonical meaning and detect relevant negative/fault cases.
- [ ] Required tests/procedures collected and actually run, correct profiles/inputs; no hidden skip.
- [ ] Artifacts/refs accessible and immutable, hashes match; current FAIL cannot be hidden by older PASS.
- [ ] Policy/mapping/exclusions changes have impact review and correct source authority.
- [ ] FINAL history preserved; purpose-specific hash order has no cycle.
- [ ] For publication: parent/head/writer/epoch/diff exact, no unresolved fork/crash or fabricated absent predecessor.
- [ ] Independent provenance below is adequate for every evidence item used by this gate.

## provenance_checks

| Subject ref | Route DIRECT_OBSERVATION / INDEPENDENT_PRODUCER | Source locator/access | Observer identity/session/time | Observed candidate/invocation/hash | VERIFIED / UNVERIFIED / MISMATCH |
|---|---|---|---|---|---|

The reviewer observes/reproduces execution or retrieves an independently controlled
producer's records. Author-declared JSON/hash/log/identity alone is insufficient.
Missing independent source means the gate stays pending/blocked. Source authority
must come from the actual approving role, never an invented agent signature.

## Findings / disposition

| Finding ID | Affected criteria/control | Severity and violated condition | Evidence | Closure condition | Owner | OPEN / RESOLVED |
|---|---|---|---|---|---|---|

Status source: MANUAL_REVIEW
Computed: false
Gate evaluated and exact scope:
Verified / partial / open / unverified subjects:
Not evaluated:
Stop conditions / next action:

Record remains append-only once FINAL. Corrections require a new ID + supersedes;
never insert this review into a run/mapping/child already hashed to create it.
