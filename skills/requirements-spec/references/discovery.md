
# Requirements discovery

Everything downstream inherits this section's honesty. A precise REQ under a
vague Goal is precision about the wrong thing.

## Order of work

1. Read what exists: brief, transcript, prior spec, codebase, tickets.
2. Draft Goal / Scope / Actors / Constraints from that alone.
3. Run the [elicitation probes](elicitation-probes.md) and mark each probe
   **answered / assumed / must-ask**.
4. Put every `must-ask` to the user in one batch. Do not guess a domain fact —
   guessed facts survive into requirements and get built.
5. Decompose into features only after Scope is settled.

## Goal

One paragraph, ≤80 words. Must contain:

- what is being built and the architecture posture that constrains it
  (single-account, CLI-first, iOS-only, single-region…),
- who acts on it,
- the observable end state that means it worked,
- the control boundary — what the system may never do on its own.

Test: could a competent stranger predict half the Out Of Scope list from the
Goal? If not, the Goal is too soft.

## Scope

**In Scope** — 8–14 bullets, each a capability, not a task. Written so the
absence of a bullet is meaningful.

**Out Of Scope** — this list carries more weight than In Scope. Populate it
from:

- the next version's obvious features (multi-account, Android, multi-tenant…),
- adjacent providers and protocols a reader would assume (other connectors,
  webhooks, SSE, MCP…),
- surfaces you refuse to build (browser approval, dashboard mutations…),
- anything a stakeholder asked for that you are deliberately deferring,
- things that must never exist for legal/ethical reasons.

Every Out Of Scope entry that a reader would find surprising needs either a
Key Constraint or an ADR justifying it.

## Users / Actors

Include the ones people forget: background daemons, scheduler/worker
processes, external provider APIs, the AI agent itself, CI/CD identity,
auditors, support operators, attackers-as-actors where relevant. For each,
state what they do **and what they are trusted to decide**. Trust boundaries
found here become authorization requirements later.

## Key Constraints

A constraint limits design freedom. Each bullet pairs the limit with its
consequence. Sources worth sweeping:

- source of truth and where it may not be duplicated,
- what must fail closed and what may degrade,
- credentials: where they live, where they may never appear,
- what may never be automated without explicit human intent,
- externally owned behaviour you cannot change (provider has no idempotency
  key, tokens rotate, contracts drift),
- regulatory / data-location / retention limits,
- who may build, sign, deploy and approve.

## Feature decomposition

8–14 features. Group by **the risk or guarantee they own**, not by screen or
by layer. A good set covers, at minimum:

| Band | Typical feature |
|------|-----------------|
| Entry | onboarding / identity / setup |
| Core loop | the product's value-producing pipeline (2–4 features) |
| Human control | the approval, intent or review gate |
| Side effects | the outbound/execution path, its guards and receipts |
| Delivery | notification, realtime, digest |
| Read surfaces | dashboards, CLI, exports |
| Trust | tenancy, security, audit |
| Operations | scheduler, retries, backup, alerting |
| Boundary | scope enforcement, contract lifecycle |
| Platform | build, release, environments |

Each feature: `### F-00N - Name`, `Priority`, `Status`, and a one-sentence
`Intent`. **A feature with no requirements is an error, not a placeholder** —
if you cannot name three requirements for it, fold it into a neighbour.

## Handoff

Emit the front matter plus the feature table, then move to
`references/ears.md`. Carry the unanswered probes forward as an explicit
"Open questions" note to the user — never as silent assumptions.
