# Change request / decision — <ID>

Record kind: TEMPLATE_NOT_APPROVAL
Record state: DRAFT
Record ID:
Class: EDITORIAL | SCOPE_OR_SEMANTIC | IMPLEMENTATION_MAPPING | TRACKING_CONTROL_PLANE | LEDGER_COORDINATION | TRACKER_MIGRATION (choose one)
Status: PROPOSED
Requested by/time:
Supersedes (ID + immutable DocumentRef, or none):
Current baseline/target/PolicyRef:
Related immutable work-plan ref:

## Concrete delta

Problem and reason:
Before refs/hashes:
Exact proposed changes/input hashes:
Affected REQ/AC/NFR/control IDs:
Scope/Expected/metric/profile/permission/exclusion changes:
Alternative preserving current baseline/policy:

## Impact

Target/total inventory before and after (derive from source):
IDs retained, deferred/retired/replacement links:
Code/tests/fixtures/dependencies affected:
Existing evidence/assessments needing re-evaluation or rerun:
Legacy source/contract/claims and migration mapping if applicable:
Rollback/recovery and history retention:

## Authority and review

Independent review ref / verdict: PENDING
Approving role defined by project governance:
Actual authority decision: NOT_REQUESTED
Source locator + exact authorization + timestamp:
Independent source observer/method/time:
Authorization already present and reused, if applicable:

Routine mapping/task split that preserves scope and required proof does not need
repeated permission from the designated authority. Scope changes and semantic control changes need the project-designated scope/
control authority (owner only if local governance assigns that role) for the concrete delta; use previous accepted policy for review.
A request to strengthen rules is not permission to weaken them. Global skill
updates do not constitute approval to change a pinned project's policy.

For LEDGER_COORDINATION: old/new actor/session/epoch, authorized plan, expected
head and fencing evidence. Initial UNASSIGNED→ASSIGNED epoch 0→1 has no old writer
to acknowledge; actor must already be assigned by source authority, changes only
coordination/publication/updated_at, and needs separate PUBLICATION_REVIEW.
For migration: retain legacy snapshot/history/claims; never reset or promote
unsupported PASS, invent predecessors, or initialize over an existing ledger.

## Finalization / application

For a real decision use record_kind CHANGE_DECISION or APPROVAL and state FINAL only
once authority is established and scoped review has happened. These records
store the source decision, not an agent signature on behalf of the authority.
Record denied decisions too; they cannot support an allowed publication.

Application conditions:
- [ ] Exact delta/source authority and independent review established.
- [ ] Old baseline/policy/evidence preserved; version and migration impact explicit.
- [ ] Policy inputs → review/decision → archive/manifest, no self-approval/hash cycle.
- [ ] Child → separate publication review → transition → head-last → read-back.
- [ ] All IDs/counts/backlinks/refs and applicable evidence revalidated.

Application status at decision time: NOT_APPLIED
Application result will be recorded by a new transition/record; do not backpatch
this FINAL decision to mark APPLIED. Correction needs a new ID and supersedes ref.
