# Portable tracking data contract

Use with [tracking.md](tracking.md) and [tracking-gates.md](tracking-gates.md).
Contract identifier: `requirements-tracking/1`; `format_version=1` for this
portable format. This is not a format migration instruction for existing
projects. Preserve their accepted format until an authorized migration.
No runtime evaluator or JSON Schema is shipped. Exact keys below make manual
artifacts interoperable; copy the [templates](../assets/tracking/ledger.json),
then validate the project's actual rows/refs rather than only empty templates.

## 1. Primitives and authority

- `ID`: stable unique string in its record type. Preserve source REQ/AC/NFR IDs;
  never assume dense numbering or a fixed count. Arrays of IDs have no duplicates.
- `DocumentRef`: `{path, sha256}`. Existing repo-relative POSIX path plus lowercase
  64-hex SHA-256 of final bytes; no absolute/traversing path or symlink escape.
  FINAL records reference immutable copies, not mutable plan/head/global paths.
- `ArtifactRef`: `{uri, sha256, bytes}`. URI is an accessible project-relative
  artifact or permitted external source; nonnegative byte count and exact hash.
  External task/approval sources use a retained local snapshot plus actual source
  locator and independent observation. No credentials/secret query strings.
- `PolicyRef`: `{version, manifest_ref: DocumentRef}`; version must match manifest.
- `SupersedesRef`: `{id, record_ref: DocumentRef}` or null for first record.
- `ReviewRef`: `{review_id, record_ref: DocumentRef}`.
- `InputRef`: `{kind, identity, sha256}`. kind is CODE/CONTRACT/TEST/HARNESS/
  DEPENDENCY/LOCKFILE/TOOLCHAIN/FIXTURE/CONFIG/ENVIRONMENT; identity locates immutable bytes
  or an archived normalized descriptor. Do not hash an unexplained label.
- `FindingRef`: `{id, record_ref: DocumentRef, status, owner_id, blocking_gates}`;
  status OPEN/RESOLVED, owner nullable before triage (still blocking). The finding
  contains criterion IDs, severity, evidence and explicit conditions for closure.
- Dates: RFC3339 UTC. Actor/session identities name actual participants. A role
  label is not an assignment, an owner signature or an independent reviewer.

Templates have `TEMPLATE_NOT_*`, DRAFT, null identities/refs and empty collections.
Real run/mapping/review/decision/transition records have their real record_kind and
`record_state=FINAL` before gate use. Baseline descriptors and policy manifests
are immutable by construction; their exact shapes below omit record_state. PENDING drafts cannot authorize promotion. Mutable ledger/head are
views and have no FINAL flag; their referenced snapshots remain immutable.
`null` is allowed only when stated, in an unused template, or for an input with
reviewed non-applicability. Empty arrays do not prove review/coverage.

`authority_ref` is a DocumentRef to a FINAL CHANGE_DECISION/APPROVAL containing
real source locator, permitted action/delta, actor/time and independent source
verification. UPDATE/HANDOFF/RECOVERY can use a FINAL LEDGER_COORDINATION decision
that pins the authorized work-plan/assignment. Policy, baseline scope and migration
changes need the project's actual authority role's decision. No agent-signed
approval or transcript fabricated by the author satisfies this field.

## 2. Baseline and scope descriptor

Derived immutable JSON descriptor keys:
`{record_kind, id, status, sources, authority_ref, requirement_ids,
acceptance_ids, quality_ids, target_scope}`. record_kind=TRACKING_BASELINE;
status=DRAFT/CONFIRMED; sources=DocumentRef[] of canonical SRS/allocation/contracts
actually used. authority_ref nullable only for DRAFT. This descriptor pins source
bytes; it does not replace or claim to freeze the canonical specification.

`target_scope`: `{id, status, source_ref, acceptance_ids, quality_ids,
unresolved_ids}`. status=UNCONFIRMED/CONFIRMED. id/source_ref nullable while
unconfirmed; source_ref is the retained allocation/decision DocumentRef.
CONFIRMED requires exact target subsets of the total inventory, no unresolved
criterion membership and real authority. Non-target criteria remain DEFERRED;
unknown membership is UNRESOLVED, never silently excluded. A CONFIRMED descriptor is never edited: baseline/target changes create a new
descriptor ID/ref and authorized change record, retaining previous bytes.
A confirmed empty
release scope is an explicit decision, not a vacuous VERIFIED/release PASS.

## 3. Ledger and row shapes

[ledger.json](../assets/tracking/ledger.json) defines root keys exactly:
`record_kind, format_version, contract_id, mode, updated_at, baseline_ref,
framework_policy, execution_context, coordination, publication, automation,
work_plans, requirements, acceptance_criteria, quality_requirements, assessment`.

Actual record_kind=REQUIREMENTS_LEDGER, contract_id=requirements-tracking/1,
mode=MANUAL, or EVALUATED only after a real authorized evaluator is adopted; templates use TEMPLATE.
A complete seed needs nonempty real inventory, baseline_ref and PolicyRef. Draft
artifacts may have unresolved baseline/scope and are not accepted gate evidence.
`execution_context` keys are `{candidate, profile_ids}`; candidate nullable for seed.
`candidate` keys `{commit, source_tree_sha256, binary_ref, dirty_tree}`: commit may
be null for a non-Git project, source-tree/input digest is required for real code
runs, binary_ref ArtifactRef when a binary is used, dirty_tree boolean for real
runs. Non-code/non-Git applicability must be explained, not faked.

`automation`: `{evaluator_implemented, ci_enforced}` booleans reflecting actual
verified capabilities. `assessment`: `{status_source, computed, evaluated_at,
evaluation_ref, release_ready, reason_codes}`. Seed is SEED/false/null/null/false;
reasons describe unresolved scope/missing proof. A schema/authoring check is not
an EVALUATOR run. Allowed provenance tuples, at root and every row:
SEED → computed=false, evaluated_at=null, evaluation_ref=null;
MANUAL_REVIEW → computed=false, real non-null time and DocumentRef;
EVALUATOR → computed=true, real non-null time and evaluator assessment DocumentRef,
with automation.evaluator_implemented=true and a real evaluator invocation bound
in that assessment. status_source has exactly those three values; reject all
other combinations. A manual check cannot be relabeled as computed/CI evidence.

Each REQ row has exact keys:
`{id, feature_id, scope, owner_role, assignee_id, acceptance_ids,
target_acceptance_ids, work_plan_refs, implementation_state,
verification_status, blocker_refs, status_source, computed, evaluated_at,
evaluation_ref}`.

- feature_id/owner_role nullable if absent from source; assignee_id null until assigned.
- scope=IN_SCOPE/DEFERRED/UNRESOLVED; target_acceptance_ids equals the intersection
  with confirmed target ACs. Unresolved membership prevents VERIFIED.
- work_plan_refs=DocumentRef[]; blocker_refs=FindingRef[].
- implementation_state=NOT_STARTED/IN_PROGRESS/PARTIAL/IMPLEMENTED_UNVERIFIED,
  derived from the work source, not test outcome.
- verification_status=UNVERIFIED/PARTIAL/VERIFIED/FAILED/STALE/OUTSIDE_TARGET.
  OUTSIDE_TARGET only for DEFERRED; zero target AC never makes a REQ VERIFIED.
- row provenance uses the same status_source/computed/evaluated_at/evaluation_ref
  rules as root assessment. No copied global timestamp in place of row assessment.

Each AC/NFR row has exact keys:
`{id, requirement_id, scope, assignee_id, work_plan_refs, mapping_state,
mapping_ref, evidence_refs, review_refs, blocker_refs, verification_outcome,
evidence_freshness, last_known_outcome, gate_ready, gate_reason_codes,
status_source, computed, evaluated_at, evaluation_ref}`.
requirement_id is canonical parent for AC, null for NFR; NFR links to functional
criteria through its mapping. evidence_refs=`{run_id, record_ref: DocumentRef}`[];
review_refs=ReviewRef[]; blockers=FindingRef[].

mapping_state=UNMAPPED/PLANNED/MAPPED; mapping_ref nullable only for UNMAPPED.
Outcome=NOT_RUN/PASS/FAIL/BLOCKED. Freshness=NONE/CURRENT/STALE.
last_known_outcome nullable, otherwise an outcome. Seed is NOT_RUN/NONE/null,
gate_ready=false. `gate_ready` is acceptance, not Ready to start work. Reasons
include UNRESOLVED_SCOPE, MAPPING_MISSING, EVIDENCE_MISSING, OUTSIDE_TARGET,
STALE_INPUTS, CURRENT_FAILURE, REQUIRED_PROFILE_MISSING, REVIEW_MISSING,
OPEN_FINDING, POLICY_MISMATCH, HISTORY_CONFLICT, PUBLICATION_INCOMPLETE,
PROVENANCE_UNVERIFIED, EVIDENCE_UNAVAILABLE. A closed gate needs explicit reasons.

`work_plans` element keys:
`{id, work_source_locator, live_plan_path, plan_ref, scope_type, assignee_id, reviewer_ids,
requirement_ids, criterion_ids, ready_status, ready_review_ref}`.
plan_ref pins an immutable local snapshot; work_source_locator identifies the
one authoritative work source. live_plan_path names it when it is a local plan,
otherwise null for an external board. The local external-board snapshot is evidence
of source state, never a second editable work source or authorization to mutate it.
scope_type=PRODUCT/INTERNAL_DOCS/TRACKING_TOOLING; ready_status=NOT_READY/READY.
Assignee/review_ref may be null only before READY; a READY review binds planned
mapping, dependencies and necessary authority. Old run refs stay resolvable through
historical plan registration even after the current plan changes.

Ready binding: finalize plan candidate P without a Ready-review ref → MAPPING_REVIEW
R reads P and its planned mapping → ledger registers plan_ref=P, ready_status=READY,
ready_review_ref=R. Live plan may display R, but a post-review live copy cannot
replace P as Ready/run authority. A new plan snapshot needs a new Ready/compatibility
review of its actual scope/delta; no reusing R(P) to approve changed content or a
self-referencing P(R). Pure progress metadata does not itself require product reruns.

## State precedence (apply in this order)

Valid AC/NFR tuples:

| Freshness | verification_outcome | last_known_outcome | gate_ready |
|---|---|---|---|
| NONE | NOT_RUN | null | false; no current proof, even if a blocker exists |
| STALE | NOT_RUN (no applicable current result) | Required historical PASS/FAIL/BLOCKED | false with stale/policy/input reasons |
| CURRENT | FAIL if any required matching run/assertion fails | nullable history | false; matching failure dominates old PASS |
| CURRENT | BLOCKED if collection/profile/input/procedure incomplete or execution blocked | nullable history | false |
| CURRENT | PASS only when all required matching run assertions/bindings are complete | nullable history | true only after valid independent semantic/provenance review, confirmed scope/policy and no blocking finding |

A current raw PASS waiting for review is not accepted: gate_ready=false with the
missing-review/provenance reason. No current run plus an open blocker stays
NONE/NOT_RUN, not a fabricated blocked execution. Retain raw run history when
normalizing a stale current outcome to NOT_RUN. If inputs/evaluation are stale
but no previous result existed, keep NONE/NOT_RUN and record the stale mapping/
assessment blocker; never invent last_known_outcome. These rules apply equally
to NFRs. Unresolved policy/authority/history blocks acceptance regardless of outcome.

REQ verification status:

1. OUTSIDE_TARGET only when its exclusion is confirmed (DEFERRED); retain history.
2. FAILED if any known target AC has CURRENT FAIL, even if other scope/proof is unknown.
3. STALE if any required prior criterion/evaluation is stale; keep failures/history visible.
4. UNVERIFIED if membership/authority is unresolved, target AC set is empty, or a
   REQ-level blocking finding/review gap prevents acceptance. Blockers never erase
   an earlier FAILED/STALE result in steps 2–3.
5. VERIFIED only for a nonempty confirmed target set with every AC gate-ready
   CURRENT PASS, valid requirement assessment and no relevant blocker.
6. PARTIAL if at least one target AC is gate-ready CURRENT PASS and others are
   not yet accepted; otherwise UNVERIFIED. Implementation progress alone affects
   implementation_state, never verification_status.

Row blockers remain separate FindingRefs; a blocked criterion cannot contribute
an accepted PASS. Quality/release readiness additionally requires all target NFRs
and actual project gates. Unknown/stale assessments are not silently replaced by
successful booleans. Use a new assessment record when inputs or conclusions change.

## 4. Mapping and evidence

Mapping snapshot keys:
`{record_kind, record_state, id, framework_policy, baseline_ref, criterion_ids, plan_ref,
code_refs, bindings, dependency_criterion_ids, impact_inputs, exclusions, supersedes}`.
Use [mapping.json](../assets/tracking/mapping.json); actual record_kind=MAPPING and
record_state=FINAL; all refs point to immutable bytes; supersedes as above.
`code_refs`: `{path, symbol, revision, file_sha256}`[]; real paths only, symbol
nullable for whole file, revision is actual commit/tree digest. PLANNED mappings
may have code_refs/bindings empty; planned paths/assertions/profiles are fully
recorded in plan_ref, not disguised as existing implementation. MAPPED requires
real bindings and reviewed impact/dependencies. Empty dependency arrays mean
unassessed until a mapping review explicitly says none.

`bindings`: `{id, designed_test_id, method, selector, procedure_ref, test_level,
assertion_ids, fixture_refs, profile_ids, expected_collection}`[].
designed_test_id nullable if project has no separate test catalog; otherwise
must backlink to the real catalog/criterion. method AUTOMATED needs selector;
MANUAL needs procedure_ref DocumentRef; the unused field is nullable.
test_level is UNIT/PROPERTY/CONTRACT/INTEGRATION/SECURITY/FAULT/COMPATIBILITY/
PERFORMANCE/UAT/RELEASE. fixture_refs=ArtifactRef[]; expected_collection=
`{selectors: string[], minimum_count: positive integer}`. Parameterized/wildcard
selectors require expanded results, never zero collection. Manual selectors
identify actual procedures. Profile/coverage cannot be narrowed by editing a binding.
Mapping exclusions are `{field, reason}`[] reviewed separately. No review/evidence/
status ref inside a mapping snapshot that its review will hash.

[run-evidence.json](../assets/tracking/run-evidence.json) is the exact root shape.
Actual record_kind=RUN_EVIDENCE, status=NOT_RUN/PASS/FAIL/BLOCKED, `id` is run_id used in
ledger refs. `inputs`=InputRef[]; required contributing test/harness/dependency/
toolchain/fixture/config/environment identities must be bound. baseline_ref,
PolicyRef, plan_ref, mapping_refs and candidate must match subjects actually run.
`product_input_paths` and `digest_exclusions` are string arrays defining the input
set; exclusions cannot omit contributing tests/config/lockfiles to keep PASS fresh.
`producer_identity`={kind,id,session_id,invocation_ref}; kind CI/LOCAL_COMMAND/
MANUAL_PROCEDURE, invocation_ref ArtifactRef, session nullable only if unavailable
with explained provenance. Template fields are not run claims.

`collection`={expected_selectors,collected_selectors,skipped_selectors,exit_code};
selectors string arrays; integer exit_code for commands. A genuine manual procedure
may have null exit with reviewed applicability; it is not a command exit=0.
`assertions` elements: `{id, criterion_ids, expected_ref, observed_artifact_ref,
observed_summary, result}`; expected_ref DocumentRef to canonical source (identify
criterion by ID); observed_artifact_ref ArtifactRef; result PASS/FAIL/NOT_RUN/BLOCKED.
`per_test_results`: `{selector, criterion_ids, status, assertion_ids, artifact_refs}`;
status PASS/FAIL/SKIPPED/ERROR/CANCELLED/NOT_COLLECTED. Complete collection, assertions,
inputs, artifact hashes/bytes and required profiles are necessary for run PASS.
`exclusions`={field,reason,review_ref:DocumentRef}[]; only preexisting applicability
reviews, no future backpatch. `resolved_finding_refs`=FindingRef[] with RESOLVED
and actual closure evidence. `artifacts`=ArtifactRef[]; no secrets are permitted.
Corrections use a new ID and SupersedesRef; keep failures and raw source records.

Remaining run root field types: format_version is integer 1 for this contract;
criterion_ids and required_profiles are string ID arrays; started_at/finished_at
are actual RFC3339 UTC timestamps with finished_at>=started_at; command is the
actual invocation string (nullable only for a documented manual procedure).
`secrets_allowed` must always be **false**. It is an invariant, not a configurable
permission: true or detected secret material rejects the evidence and triggers
authorized remediation; never hide secrets by changing that flag.

## 5. Reviews and policy

[review.md](../assets/tracking/review.md) covers exactly one purpose per record:
MAPPING_REVIEW / ASSESSMENT / POLICY_REVIEW / PUBLICATION_REVIEW. Real record_kind=REVIEW,
state FINAL before gate use, verdict PASS/FAIL/BLOCKED; DRAFT verdict PENDING.
Include actual author/reviewer/session/time, subjects, baseline/policy/candidate,
criterion assessment rows, source artifacts and reasons for inapplicable fields.

Assessment lists every assessed row (including failures/staleness), input/profile
hashes, required bindings/assertions, evidence/reviews/findings, outcome/freshness,
last known result and gate reasons. It may be referenced by a child ledger and
therefore must not hash that child. PUBLICATION_REVIEW comes after child and pins
before/after/head, assignment/epoch, exact diff, authority and policy; only the
transition can reference it. POLICY_REVIEW binds previous accepted PolicyRef or
FIRST_PIN plus exact proposed normative hashes, never a future manifest hash.

`provenance_checks` columns: subject ref; route DIRECT_OBSERVATION/
INDEPENDENT_PRODUCER; source locator/access; observer identity/session/time;
observed candidate/invocation/hash; result VERIFIED/UNVERIFIED/MISMATCH.
Self-declared identity/hash is not the source. UNVERIFIED/MISMATCH blocks acceptance.

Policy manifest keys:
`{record_kind, version, contract_id, format_version, created_at, supersedes,
inputs, archive_ref, authority_ref, review_refs}`.
record_kind=FRAMEWORK_POLICY; inputs=sorted unique DocumentRef[] of exact local
normative instructions/handbook/contracts/templates and implemented controls.
No fixed inventory count. Exclude manifest itself, archive, ledger/head, history,
run/review/decision/report/check outputs to avoid cycles. Those records are still
validated; exclusion from normative inputs does not exempt evidence validation.
Archive is an ArtifactRef to an immutable ZIP of exact normative source paths and
bytes; verify unique safe entries, no traversal/symlink, no extras. Old bytes are
resolved from archive whenever live paths **or contents** change. Hash the manifest
externally in PolicyRef. Changes are reviewed using previous policy and actual
source authority, not signed by the candidate policy itself.

## 6. Publication/head and bootstrap exceptions

`coordination`={mode,state,writer_id,writer_session_id,writer_epoch,assignment_ref}.
mode=MANUAL_SINGLE_WRITER; seed state=UNASSIGNED, IDs/ref null, epoch=0.
ASSIGNED requires exact actor/session, epoch>=1 and FINAL assignment decision ref.
`publication`={sequence,transition_id,parent_ledger_sha256}; sequence increments
from accepted head. Parent hash is null only for fresh BOOTSTRAP; child has no
own hash or current transition hash. Template publication is null until prepared.

[ledger-transition.json](../assets/tracking/ledger-transition.json) gives exact
keys. Actual record_kind=LEDGER_TRANSITION, FINAL, transition_kind=BOOTSTRAP/UPDATE/
HANDOFF/MIGRATION/RECOVERY; actor/session/authority/PolicyRef/ReviewRef[] required.
before_ref/after_ref point to immutable ledger snapshots; before_head_ref to an
immutable prior head. `previous_transition_ref` chains to accepted predecessor.
changed_row_ids and changed_root_keys equal the actual before/after diff, not just
what the author intended. For fresh bootstrap all seeded IDs and all root keys
are additions; before_ref, before_head_ref, previous_transition_ref=null with
verified absence. UPDATE/HANDOFF/RECOVERY require non-null actual parent/chain.

MIGRATION additionally needs `migration`={from_contract,to_contract,legacy_ref,
field_mapping_ref}; otherwise migration=null. from/to_contract strings, legacy_ref
and field_mapping_ref DocumentRef to retained source and reviewed mapping. Before
snapshot always exists for migration. Only a reviewed legacy import with no prior
head/transition permits null before_head_ref/previous_transition_ref; the decision
records absence/limitations. An existing published tracker must retain its chain.
Preserve legacy claims in immutable source; unsupported claims remain unverified
in the new assessment, never silently reset history or auto-promote old PASS.

Head keys: `{record_kind, mode, ledger_ref, transition_ref, framework_policy}`.
record_kind=LEDGER_HEAD; mode=MANUAL_SERIALIZATION_ONLY unless a separately implemented
control is adopted. Refs pin exact immutable child/transition/policy. Head is a
mutable pointer; retain immutable head snapshots for subsequent parent refs and
receipts. Read-back happens before accepting the new head. No field stores its own hash.

Inline receipt contract (no separate template family needed):
`{record_kind, record_state, id, observed_at, observer, status, head_snapshot_ref,
ledger_ref, transition_ref, framework_policy, observed_live_head_sha256,
observed_live_ledger_sha256, finding_refs, supersedes}`.
record_kind=PUBLICATION_RECEIPT, record_state=FINAL, status=PASS/FAIL/BLOCKED;
observer={id,session_id} names the real reader, observed_at RFC3339 UTC.
head_snapshot_ref/ledger_ref/transition_ref are immutable DocumentRefs, policy is
PolicyRef, finding_refs=FindingRef[]. Live hashes are SHA-256 observations, not
DocumentRefs to mutable files. PASS needs all refs and live hashes, exact equality
with snapshots and no unresolved mismatch. Only FAIL/BLOCKED may leave a ref/hash
null when unavailable, with a finding explaining why. This is an observation,
not independent authority or technical-enforcement proof. Receipt is downstream
of head and referenced only by later audit/history; never backpatch its hash into
the head/transition/child it observes. Corrections use SupersedesRef/new ID.

A first HANDOFF epoch 0→1 is explicitly allowed from UNASSIGNED; its actor must
already be assigned by an authorized FINAL decision. Only coordination/publication/
updated_at change; no product rows or old-writer ack. All other handoffs require
fencing evidence, not a timeout. Publication review is always distinct from any
assessment referenced by child. See workflow for crash/fork stop/reconciliation.
