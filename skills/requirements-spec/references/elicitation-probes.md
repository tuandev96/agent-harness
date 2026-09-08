# Probe bank

Run every probe against the system under specification. Each one that *lands*
becomes one or more requirements — most often `Unwanted behavior`. This is the
mechanism that turns a tidy feature list into a comprehensive spec.

For each probe record: **answered** (→ write the requirement) /
**assumed** (→ write it and flag the assumption) / **must-ask** (→ block).

## 1. Identity, trust and authorization

- Who is allowed to do this, and which surface may they do it from?
- Which tokens/sessions must be *technically incapable* of the highest-privilege
  action, not merely un-offered it in the UI?
- What happens the instant access is revoked — in-flight requests, open
  sockets, cached data on the device?
- Is there a step-up/re-auth requirement, and is it verified server-side?
- Can an ID from tenant B be substituted into a tenant A request? What leaks —
  data, or merely the existence of the object?

## 2. Human intent gates

- Which actions may never happen without an explicit human decision?
- How is "explicit" defined — a confirmation, a signature, a typed phrase?
- What does the human see at the moment of deciding, and is it provably the
  same thing that will be executed?
- What happens if the underlying content changes between decision and
  execution? (stale-authority invalidation)
- Is an ambiguous request a draft, or an action?

## 3. Concurrency and races

- Two devices/workers submit terminal outcomes at the same time — who wins,
  and what does the loser receive?
- Can two different *kinds* of resolution collide (approve vs cancel, reply vs
  expire)?
- What linearizes them — a unique constraint, a lease, an optimistic version?
- Can a stale worker overwrite a newer state?
- What is claimed, and can the claim expire without leaving the work stuck?

## 4. Exactly-once and unknown outcomes

- Which operations are externally visible and therefore must not repeat?
- Is there an idempotency key? Does the *provider* honour one — and if not,
  what replaces it?
- Timeout after transmission: is the outcome unknown, and is blind retry
  forbidden? How is the truth recovered — reconciliation, correlation ID,
  remote query?
- What is the point of no return, and what is re-checked immediately before it?
- After the PONR, what does "cancel" mean? (usually: only *requested*)

## 5. Failure posture

- For each dependency: what fails closed, what degrades, what queues?
- Do quota/rate-limit/5xx/malformed-response paths ever produce a mutation?
- Is exhausted retry visible (dead-letter) or silent?
- Is there a global kill switch, and does it stop work already queued but not
  yet transmitted?

## 6. Secrets and data protection

- Which values are secret? Where are they encrypted, and where is the key?
- Enumerate every sink they must never reach: logs, JSON output, exception
  traces, backups, analytics, model prompts, webhooks, mobile clients.
- What is redacted vs omitted? How is that tested (canary/scan)?
- Retention: what is stored, for how long, and what is deliberately not stored?
- Deletion: when a subject asks to be erased, what happens to backups, caches,
  derived tables, exports and third-party copies — and how is that provable?
- Is any data pinned to a region or subject to legal hold that overrides
  deletion? Which wins, and who decides?

## 7. State machines

- List every state and every legal transition. Which are terminal?
- What rejects an illegal or stale transition, and what is preserved when it is
  rejected?
- Is every transition audited with actor, reason and version?

## 8. Versioning and drift

- What is immutable once published? What supersedes what?
- Which external contracts can change under you (operation IDs, schemas,
  provider APIs)? How is drift detected, and what happens meanwhile?
- Which versions must be recorded on every produced artifact (schema, prompt,
  policy, model, contract) so a past decision is explainable?
- N/N-1 compatibility window for clients you do not control?

## 9. Audit and evidence

- Which mutations must be provably recorded, atomically with the mutation
  itself?
- Is the audit append-only in the normal path?
- What evidence must be signed, by which key, and who may not hold that key?
- Can support/staff read tenant content? Under what approval, for how long?

## 10. Time and scheduling

- Whose clock is authoritative?
- What has a deadline/expiry, and is it enforced before or after the effect?
- What is the cadence of each recurring job, and what happens on overlap,
  restart, or long backlog?

## 11. Delivery and eventual consistency

- At-least-once or at-most-once? If duplicates are possible, what makes the
  side effect safe?
- Can a committed event be lost? What replays it, and for how long?
- What does a client that was offline past the replay window do?
- Does replay re-authorize against *current* permissions?

## 12. Scope enforcement

- Which deferred capabilities must be *unreachable*, not merely unimplemented?
- Can a feature flag or a crafted request re-enable them?
- Is the rejection before persistence and before any side effect?

## 13. Operability

- What alerts exist, who owns them, what runbook do they point to?
- What are the backup and restore procedures, and when were they last proven?
- How is a bad release rolled back, and is the rollback path compatible?

## 14. Build, release and supply chain

- Who may compile, sign, deploy, approve? Who explicitly may not?
- Are artifacts built once and promoted by digest, or rebuilt per environment?
- Are environments' identities separated so a staging credential cannot act on
  production?

## 15. Ethics, safety and law

- What must the system refuse to do even when asked?
- Rate/quota ceilings that protect third parties, not just the system?
- Anything that touches personal data, minors, payments, health, or platform
  terms of service?

## 16. Authority — who wins

- When the database, the cache, the provider, the user's own belief and the
  audit log disagree, which one is right? Name it once, in Key Constraints.
- Which reads may be served from a non-authoritative source, and which may
  never be (authorization, money, deletion, quota)?
- What reconciles a disagreement, on what schedule, and what does it do with
  the loser — repair it, quarantine it, or page a human?

## 17. Limits and overload

- Maximum size, rate, concurrency, backlog depth, storage per actor and in
  total. What is the behaviour at each ceiling — reject, queue, shed, degrade?
- Is backpressure visible to the caller, or does work silently pile up?
- What does the system do when it is *already* over a limit at startup?
- Which limit protects a third party rather than the system, and may therefore
  never be raised unilaterally?

## 18. Change and continuity

- Schema migration and backfill: is there a window where old and new code run
  together, and what must both understand?
- Can a release be rolled back after data has been written in the new shape?
  If not, that is a point of no return and needs its own requirement.
- Partial rollout: what must hold when 5% of traffic is on the new path?
- Recovery targets: how much data may be lost (RPO) and how long may recovery
  take (RTO)? What runs in degraded or read-only mode meanwhile?

---

## Turning a probe into a requirement

> Probe 4 lands: "Gmail has no idempotency key; timeout after send is possible."

```
#### REQ-048
- Feature: F-006
- Kind: Event-driven
- Priority: Must
- Status: Planned

When a send times out after possible provider acceptance, the system shall mark
the operation unknown and shall reconcile it without resending.

Acceptance Criteria

##### AC-019 - Ambiguous timeout never blind-retries
Given a timeout after possible provider acceptance
When the outcome is not yet proven
Then the operation is unknown, no resend occurs, and reconciliation uses the same operation and correlation ID
```

Also emit the matching Key Constraint (provider has no idempotency key) and
ADR (reconcile unknown outcomes before retry). One probe, three artifacts.
