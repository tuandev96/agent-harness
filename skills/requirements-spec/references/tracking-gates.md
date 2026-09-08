# Tracking audit and gate contract

For track-audit, read the project's accepted rules/head/history and the relevant
[workflow](tracking.md) / [data contract](tracking-contract.md). Audit is read-only
unless fixes are authorized. For a different existing format, audit its semantics;
do not migrate it merely to fit these field names. Gate definitions are manual
checklists and future-tooling requirements, not proof of CI enforcement.

## Gates

| Gate | Required evidence |
|---|---|
| G-READY | Exact assigned criteria, confirmed relevant scope/decisions, planned assertions/fixtures/profiles, assignee/reviewer/coordinator, valid policy/head and authority for the next steps |
| G-TRACE | Complete unique source inventory/target partition/backlinks, resolvable snapshots, valid policy and publication history; no unsupported status promotion |
| G-IMPACT | Changed code/contracts/tests/harness/dependencies/config mapped and unmapped files triaged; shared-path regression considered; all required impacted tests collected/run |
| G-VERIFY | Current matching evidence for every required assertion/binding/profile, valid artifacts, independent semantic/provenance review, no applicable unresolved blocking finding |
| G-MERGE | TRACE/IMPACT/VERIFY for the approved changeset slice, exact merge-candidate tree and authority; post-merge tree still matches or affected checks rerun |
| G-RELEASE | Every criterion and NFR in the confirmed target scope, exact release artifact/environment, all baseline-specific integration/security/restore/performance gates and actual release authority |

A draft PR can expose incomplete work honestly. The first PR need not implement
all release criteria; its approved slice must be explicit. A small slice must not
silently shrink the global target. Functional REQ VERIFIED is not quality/release
acceptance. Structural SRS or skill-validator PASS is not product evidence.

## Audit sequence and outputs

1. Identify authority/source precedence, accepted baseline/policy and target scope.
   Verify exact IDs and counts from those sources, including deferred/unresolved.
2. Check head/live ledger/chain/assignment, hashes/bytes and immutable refs. Treat
   missing, incompatible or self-declared authority/provenance as gaps, not proof.
3. Assess each target criterion's mapping, actual assertions, candidate/input
   freshness, current failures, profiles, runs/reviews and blockers. No cherry-pick
   of old PASS. Expand shared impact and audit the full target at milestones.
4. Audit control changes and failure paths against the cases below. Inspect
   policies, test requirements, exclusions and verifier/branch rules themselves.
5. Report findings with affected REQ/AC/NFR or control ID, severity, observed
   evidence, missing proof and the exact closing action. State four separate
   verdicts: **spec buildability**, **tracking consistency**, **implementation
   verification**, **release readiness**. Use NOT_ASSESSED where not examined,
   not an inherited PASS. Include framework/automation enforcement status.

Record commands actually run and outputs, separately from scenarios merely
specified/reasoned about. If a report is a static snapshot, show its generation
time and source hashes; do not say it will automatically track later updates.

## Adversarial cases for design review and future tooling

These are reusable cases, not executable tests or extra product REQ IDs. Select
applicable cases, retain required coverage, and state which were actually run.

| Input or event | Required result |
|---|---|
| Plain SRS create/audit request | Spec route; no automatic tracker/product/CI setup |
| Fresh confirmed baseline, no implementation or runs | Exact source inventory, all seed/unverified, no product PASS |
| Draft baseline or unknown target allocation | Draft framework allowed; dependent gates blocked; do not invent approval |
| Mixed target/deferred AC within one REQ | Derive from each AC; deferred behavior stays deferred |
| Dropped/duplicate criterion, orphan AC, wrong target membership | Reject inventory/backlink/scope drift |
| Empty template or target with no criteria | Never vacuous VERIFIED/release PASS |
| Existing ledger/head discovered during setup | Continue accepted policy or authorized migration; no overwrite/reseed |
| Legacy PASS with missing source evidence | Preserve original claims/history; new assessment unverified, no automatic promotion |
| VERIFIED claimed with missing mapping/code/run/review | Reject false verification |
| Named test with zero collection, skip/error/cancel | No acceptance PASS; expose missing coverage |
| Assertion only checks generic success, ignores canonical effect | Semantic gap; require the actual oracle |
| Required side-effect prohibition tested only via response text | Missing effect/counter/storage assertion; gate closed |
| Artifacts absent, source unavailable or digest/size mismatch | EVIDENCE_UNAVAILABLE or invalid proof; gate closed |
| PASS from different tree/tests/fixture/config/toolchain | STALE and retained historical outcome |
| Current matching FAIL plus older PASS | FAIL blocks; no latest-pass-wins |
| Superseding run after fix, correct coverage and finding resolution | New assessment allowed; keep historical failure |
| Only report/evidence output changed | No blanket runtime invalidation when contributing inputs identical |
| Shared dependency/input changed or a new file is unmapped | Impact triage before merge, not presumed unaffected |
| All functional criteria PASS but required NFR or real integration missing | Functional progress can remain; release stays blocked |
| N/A, reduced threshold or scope removal without decision | Reject scope bypass |
| Author renames its session to be reviewer | Not independent; review pending/blocked |
| Fabricated consistent JSON/log/hash with no independent source | PROVENANCE_UNVERIFIED |
| Two writers/successors from one expected parent | At most one accepted successor; conflict stops promotion, preserves deltas |
| Missing writer assignment or stale epoch | Reject publish |
| Initial UNASSIGNED→ASSIGNED epoch 0→1 | Valid coordination-only HANDOFF with prior assignment authority and independent publication review |
| Crash after ledger replacement before head | PUBLICATION_INCOMPLETE; reconcile trusted head and unique successor or stay BLOCKED |
| Orphan/fork, rollback or truncated local history | No timestamp guesses; retain artifacts and compare independent accepted anchor |
| FINAL review/approval edited and local hashes refreshed | Reject using immutable history/source; local hashes alone cannot authenticate it |
| Publication review both hashes child and is referenced by child | Reject cycle; split assessment from publication review |
| Policy candidate weakens its own gate to approve itself | Reject; previous-policy review plus real delta authority |
| Required assertion/profile removed or exclusion expanded as routine mapping | Control change + impact review, not an unreviewed shortcut |
| Editorial policy change, runtime inputs unchanged | Compatibility assessment under new pin; no needless runtime rerun |
| Global installed skill changes while local policy is pinned | Local policy unchanged until authorized project adoption |
| Dashboard source newer than snapshot | Show STALE, not current progress |

## Technical enforcement boundary

Only claim CI/enforcement after a separately authorized implementation has real
checker tests, protected/versioned verifier inputs, trusted producer/reviewer
boundaries, serialized publication, real required-check configuration and an
observed failing gate that blocks the relevant merge/release. Record admin bypass
and independent history-anchor limits. YAML or instructions alone do not enforce.
Never invent commands, simulate a successful run, alter branch rules, install a
service or start live external actions from this documentation workflow.
