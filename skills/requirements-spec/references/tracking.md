# Requirement execution tracking

Read for **track-setup** or **track-update**. For **track-audit**, inspect these
rules and the accepted project policy without changing either. Detailed shapes:
[tracking-contract.md](tracking-contract.md). Gates and adversarial checks:
[tracking-gates.md](tracking-gates.md). These are portable instructions, not an
installed tracker, an approval, or evidence that a gate is technically enforced.

Contents: scope and adoption; setup; assessment; publication/recovery; policy
changes; handoff. Use the project's existing paths and conventions; examples
below assume `plans/requirements-tracking/` and `plans/<work-item>/plan.md`.

## 1. Establish authority and reuse what exists

- Read the request, applicable agent rules, active matching plan, canonical SRS,
  allocation, decisions, and any tracker/head/policy/history. Exactly one project-declared source owns work
  state (use plans when project/global rules require it); a ledger is a traceability/evidence index, not a second task board.
- Preserve source IDs, including themed IDs and withdrawn/deferred history.
  Count actual REQ/AC/NFR and derive target scope **per criterion**. One REQ can
  have included and deferred AC; completing its included AC does not deliver
  its deferred behavior. Do not inherit a REQ release label onto all its AC.
- The project's platform, provider, limits, release names and counts come only
  from its sources. A spec without a release allocation can have a proposed
  all-criteria target, explicitly unconfirmed until supported by authority.
  Unresolved scope/decisions stay visible and block dependent Ready/acceptance;
  do not convert a structural SRS validator PASS into scope approval.
- If tracking already exists, continue its accepted contract. Do not initialize
  a second ledger or turn existing statuses into SEED. If incompatible with
  this portable contract, prepare a concrete migration and impact review under
  existing rules; preserve all IDs, rows, failures and source records. Unknown
  or untrusted history blocks promotion; it is not permission to discard it.
- A global skill update is guidance for new work. It does **not** amend a
  project's pinned policy, change its hashes, create authority approval, or force
  a migration. Keep that project's rules until an authorized revision is ready.

## 2. Setup only when requested

1. Inventory the baseline and exact target allocation. Reuse frozen sources;
   for mutable sources retain immutable byte snapshots before referencing them.
   Record a derived baseline descriptor, not a second editable SRS. Preserve
   DRAFT/unconfirmed authority where that is the actual source status.
2. Use [ledger template](../assets/tracking/ledger.json). Populate one row per
   real REQ/AC/NFR using the contract. Empty arrays are template placeholders,
   not an accepted empty scope. Derive totals and per-REQ target AC membership;
   keep deferred/unresolved criteria visible. Seed UNMAPPED/NOT_RUN/NONE,
   `computed=false`, `status_source=SEED`; no invented assignments or proof.
3. Adapt these workflow/contract/gate references and needed templates into the
   project's tracking directory, replacing skill-relative links with actual
   project paths. Validate every resulting link/ref. Pin **project-local**
   normative bytes in a policy manifest and immutable archive. Never make
   a project gate depend on a mutable globally installed skill path.
4. Integrate a short instruction section into an existing agent entrypoint
   without replacing unrelated rules. State where plans/ledger/policy live,
   who can publish, evidence/review requirements, stale-input handling and
   scope/control change rules. Do not create competing global instructions.
5. Record exact setup authorization and independent POLICY_REVIEW; first pin
   has no previous PolicyRef, so use FIRST_PIN with the real existing user and
   project rules. First pin is no exemption from review or authority. Source
   decisions may be recorded by an agent but may not be signed on an approving authority's
   behalf. Existing authorization is reusable for its exact scope.
6. Publish a fresh seed only through the BOOTSTRAP procedure below. If reviewer
   or required authority is unavailable, leave draft candidate artifacts and
   report the gap; do not fabricate an accepted head. A draft framework can be
   delivered without being approved for implementation. Setting up tracking
   does not approve a draft product baseline or resolve its open questions.
7. Produce a derived summary/dashboard if requested or required by project
   reporting rules. Show generation time, source ledger/policy hash, candidate,
   scope counts and enforcement status. A static report is stale when its
   relevant sources change; it is not a monitor. Store evidence outside frozen
   requirements bundles and keep source snapshots unchanged.

The copied templates are only the needed forms, not product or CI scaffolding.
Use existing project validators where present. This skill ships an SRS validator,
not a tracking evaluator or publication executable; never invent such commands.

## 3. Work and evidence assessment

Use [work-item](../assets/tracking/work-item.md) for the exact subset assigned.
Read canonical assertions/metrics before selecting tests. Planned paths are not
existing code evidence. Register immutable work-plan/mapping snapshots. Update the one authoritative
work source first when authorized (a plan or existing board), then publish retained
snapshot refs through the coordinator; a local external-board snapshot is not a
second editable board. Snapshotting does not authorize external service mutations.

Keep work state, evidence outcome, freshness, blockers and acceptance readiness
separate; use the precedence/valid-tuple table in the contract for derived states. Work can be implemented but unverified. An AC passes only when all
required assertions, concrete tests/procedures, collection, levels and profiles
are covered by current evidence and independent review. A REQ is VERIFIED only
when **every target AC** is current PASS and relevant blockers/reviews are clear;
a deferred REQ with zero target AC is not vacuously VERIFIED. Quality/release
readiness requires the target NFRs and the baseline's actual release gates too.

[Run evidence](../assets/tracking/run-evidence.json) binds immutable baseline,
policy, mapping, candidate commit/tree/binary, test definitions, harness,
dependencies/toolchain, fixture/config/environment and raw artifacts. Capture
actual command/invocation/time/exit/collection and per-test assertion results.
A test name, HTTP success, copied Expected text or a declared PASS is not proof.
Skipped, cancelled, missing tests, missing input or unsupported profiles cannot
be hidden behind an exclusion. Explain truly inapplicable fields and get their
applicability reviewed; N/A cannot silently remove a target criterion.

Evaluate freshness before outcome. Relevant code/test/contract/harness/fixture/
config/dependency/toolchain changes require impact triage. Unmapped files are
unknown impact, not unaffected. Audit the whole target at milestones/releases
to catch incomplete impact maps. Pure report/evidence changes need not rerun
runtime tests; exclude outputs from product digests, never contributing inputs.

A matching current FAIL blocks the gate. Do not select an older PASS to hide it.
A superseding run needs the same subject/required coverage, explained correction
or fix, and resolved findings. Keep old FAIL and STALE results visible. New
policy/mapping/profile/assertion/exclusion inputs need new impact assessment;
raw evidence may be reused only where an independent assessment establishes
sufficiency for the new policy/candidate. Never backpatch the old run/review.

Independent review compares canonical meaning to implementation **and oracle**.
For authority/secrets/retry/unknown outcomes/crash/races, require relevant fault,
boundary and negative controls showing the tests detect a violated invariant.
Do not mandate mutation testing for every editorial change. Real-client/provider,
restore and performance evidence are required only as specified by that baseline;
mock proof cannot replace a required real integration.

Author-declared IDs, logs and hashes provide integrity claims, not authenticity.
Reviewer directly observes/reproduces the invocation or retrieves artifacts from
an independently controlled producer; record source, identity/session/time and
observed inputs/hashes. A second label/session of the same author is not an
independent reviewer. Respect runtime delegation limits; absent reviewer/source
means PENDING/BLOCKED, not invented independent PASS. Do not claim signatures,
trusted CI or filesystem tamper resistance before those controls exist.

## 4. Single writer and one-way publication

This default is **MANUAL_SERIALIZATION_ONLY**, not a lock or atomic CAS service.
Workers send deltas by IDs plus expected parent; only the assigned coordinator
publishes. A delta includes exact before/after values, reason, authority and
review/evidence refs. Assign files to avoid worker overlap.

Hash order (no self hashes or backpatching):

- Source/plan/mapping/run snapshots → MAPPING_REVIEW or ASSESSMENT → child ledger.
- Child → separate PUBLICATION_REVIEW → transition → mutable head.
- Policy input bytes → POLICY_REVIEW + source decision → policy archive/manifest.

Assessment/mapping reviews referenced by a child **cannot hash that child/head**.
Publication review hashes exact before/after/head/policy/diff and is referenced
only downstream by transition, never by the child it reviews. Policy review
binds previous policy and proposed input hashes, not a future manifest hash.
The child stores a transition ID, not the hash of the transition referencing it.

Publication procedure:

1. Check accepted head/ledger/chain/policy and writer assignment/epoch. Save
   immutable parent ledger/head snapshots and their hashes. Reconcile deltas by
   row IDs, preserving others' work. No timestamp or last-write-wins selection.
2. Finalize source/assessment records, child snapshot, then independent
   PUBLICATION_REVIEW. Finalize [transition](../assets/tracking/ledger-transition.json)
   with exact changed rows/root keys, parent chain, actor/epoch and authority.
3. Re-read live ledger **and head** immediately before publish. Expected-parent
   mismatch, competing successor, stale assignment or missing refs: abort this
   candidate, retain it as unaccepted history, rebase and re-review the delta.
4. During the single-writer window, replace ledger via temporary file + rename,
   then replace head **last**. Read back both plus transition/snapshots. Gates
   use the new head only after equality and chain checks pass. Per-file replace
   is not a multi-file transaction. Concurrent writers violating the protocol
   can still race; any inconsistent head/chain closes dependent gates.
5. Keep an immutable copy of the newly published head for receipts/history;
   finalized PUBLICATION_RECEIPT records follow the inline contract and reference
   that copy, not the mutable live head path.

**Fresh BOOTSTRAP:** only if no tracker/head exists. sequence=1; before_ref,
before_head_ref and previous_transition_ref are null with recorded absence.
The setup-authorized actor may publish the reviewed all-SEED child with writer
UNASSIGNED/epoch 0. It must not fabricate an empty prior ledger or authority.
**Migration:** existing tracking is never fresh bootstrap. Preserve the actual
prior snapshots/chain and use MIGRATION with old/new contract versions, exact
field mapping, change authority and independent review. A legacy format with
no head needs a reviewed legacy checkpoint; absent trusted history is explicit,
not falsely reconstructed. Do not promote old evidence by migration alone.

**Initial assignment:** HANDOFF from UNASSIGNED→ASSIGNED, epoch 0→1, actor exactly
the coordinator in a FINAL assignment decision referencing the authorized plan.
No old-writer acknowledgment exists or is required. It changes only coordination,
publication and updated_at; no product rows. Independent publication review is
required. Routine assignment under an existing work request needs no repeated scope
approval. Subsequent handoffs increment epoch and require proof the old
writer stopped or lost write access. Timeout alone is never fencing evidence.

**Crash/fork recovery:** head mismatch or ambiguous successors mean
PUBLICATION_INCOMPLETE/HISTORY_CONFLICT. Keep last accepted head and evidence;
reviewer may complete the uniquely matching prepared successor, or authorize a
new RECOVERY transition from the trusted head with explicit orphan disposition.
Do not delete failed proposals, steal a writer lease, reset progress or silently
refresh hashes. If the old writer/head cannot be established, remain BLOCKED.
Hash chains cannot detect a complete local history rewrite without an external
accepted anchor; use an actual independent reviewer/CI source when available and
report that limitation otherwise.

## 5. Protect evidence and the policy itself

FINAL run/review/assessment/approval/change/transition records and referenced
snapshots are append-only. DRAFTs not yet used by gates may be edited. Corrections
need a new ID, reason and `supersedes` ref; keep previous bytes and unresolved
failures. Applying a FINAL decision is a new transition, not an edit to its
approval. Mutable plans/ledger/reports remain views over preserved source bytes.
Missing original artifacts/sources close dependent gates until replacement proof
is independently reviewed. Never import a product log-retention duration as the
retention rule for development evidence. Store no secrets; accidental sensitive
material requires authorized remediation and a new redaction/incident record,
not redistribution of the secret to preserve its hash.

[Change request](../assets/tracking/change-request.md) uses the project-designated
scope/control authority (owner only when local governance assigns that role) and
distinguishes:

- Routine task split/code refs/additional coverage: mapping review, no repeated
  scope-authority approval; new mapping snapshots and impact assessment when changed.
- Scope/Expected/threshold/permission/supported-profile or criterion removal:
  exact project-designated scope authority, impact review, preserved old baseline and new revision.
- TRACKING_CONTROL_PLANE: instructions, status derivation, required assertions,
  profiles, exclusions, impact rules, reviewer/provenance rules, verifier/CI and
  branch gates. Independent review **under the previous accepted policy**,
  version/hash update; semantic changes require the project-designated control authority for the exact
  delta. Reuse explicit authorization already granted. Editorial changes still
  need compatibility review; they do not force product reruns without impact.
- LEDGER_COORDINATION: assignment/fencing/recovery with actual source authority.

Never use the policy being weakened to approve itself. Adding a new control file
or changing the manifest inventory is itself a control change. Preserve previous
normative bytes in an immutable archive. A new skill/package version does not
retroactively turn FAIL/NOT_RUN into PASS or update a pinned project manifest.

## 6. Handoff

Update plan checkboxes and link immutable mapping/run/review/transition refs.
State exact criteria handled, partial/deferred/unresolved work, current FAIL /
STALE / BLOCKED, source hashes, real commands/results and the next action. Distinguish
framework delivered, scope approved/frozen, code implemented, acceptance verified,
merge/release accepted and technically enforced. A completed task closes only its
assigned slice. No background watcher, external messages or scheduled automation
is implied by the existence of a dashboard.
