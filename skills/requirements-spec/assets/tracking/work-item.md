# Work item — <name>

Template only; use the project's one work-status source. Copy into its plan tree
when plans are authoritative; an external-board snapshot is evidence, not a new
editable board. Fill from real sources; no external mutation is implied.
Work-status source (path/locator):
Work plan ID:
Status: DRAFT
Ready status: NOT_READY
Scope type: PRODUCT | INTERNAL_DOCS | TRACKING_TOOLING (choose one)
Baseline descriptor ref/hash and target scope:
Accepted PolicyRef (version + manifest ref/hash):
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Coordinator identity/session + assignment ref/epoch:
Expected parent ledger/head hashes:
Authorization source + exact assigned work:
Updated at:

## Outcome and boundary

REQ IDs:
Target AC IDs assigned:
Target NFR IDs assigned:
Remaining/deferred/unresolved criteria of these requirements:
Source decisions/questions blocking this work:
Owned files/areas and dependencies:
External/environment authority needed for the next steps:

INTERNAL_DOCS must explain actual impact without inventing product IDs. The declared source
owns work state; implementation/evidence claims go through the accepted tracker.
A work request does not authorize deployment, provider actions or scope expansion.

## Criterion mapping

| AC/NFR | Canonical assertion/metric ref | Planned code area | Planned selector/procedure and test level | Assertions/oracle | Fixture/profile | Dependencies/impact inputs |
|---|---|---|---|---|---|---|

Planned paths are not proof of existing code/tests. One test serving multiple
criteria needs explicit assertions for each. Empty dependencies need review.

## Ready

- [ ] Exact baseline/target/policy confirmed for this work; open questions resolved or blocking steps held.
- [ ] Assignee/reviewer/coordinator and relevant authority identified; parent/head/epoch valid.
- [ ] Every assigned criterion has a reviewed planned mapping, oracle and required profile.
- [ ] Dependencies/files owned/impact triaged; unrelated edits preserved.
- [ ] Immutable plan/mapping snapshots ready for the mapping review; no self-hash/review backpatch.

Ready review ref / verdict / reasons / reviewer / time:

Finalize candidate plan P before Ready review R; P does not contain R. Register
plan_ref=P and ready_review_ref=R in the ledger after review. This mutable plan
may display R afterward; a new snapshot must not inherit R's authority for changed
scope without a new Ready/compatibility review. Do not backpatch an immutable P.

## Work

- [ ] Trace shared paths and map impacted criteria before implementation.
- [ ] Complete only the authorized slice.
- [ ] Run relevant real checks; preserve command/output/collection and failures.
- [ ] Independent semantic and provenance review; resolve findings with proof.
- [ ] Coordinator publishes exact delta with expected parent, transition/head and read-back.

## Evidence / close / handoff

Candidate and input digests:
Immutable plan/mapping/run/review refs:
Actual commands + collection/skips + exit codes:
Current FAIL / STALE / BLOCKED:
Criteria verified / partial / open / unverified:
Publication transition + immutable head/read-back refs:
Work verdict: NOT_STARTED
Requirement verification: UNVERIFIED
Merge/release verdict: NOT_ASSESSED
Enforcement: SPECIFIED_NOT_ENFORCED until actual controls are verified
Next action:

Closing this plan closes only its assigned criteria; it does not certify an
entire requirement, target release, or deferred behavior. Preserve old snapshots.
