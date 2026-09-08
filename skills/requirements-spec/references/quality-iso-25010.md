
# Quality requirements (NFRs)

An NFR without a runnable Metric is a wish. The Metric is the requirement; the
sentence is its label.

## Form

```
#### NFR-004
- Metric: Fault-injection tests at every pre/post-transmission checkpoint produce no duplicate remote mutation across 100 repeated runs.
- Priority: Must
- Status: Planned

Outbound post, reply, like, and follow operations shall be idempotent across
retries and process crashes.
```

Grouped under an `### <Characteristic>` heading from ISO/IEC 25010 — see
[the characteristic table below](#characteristics--headings-and-probes) for
the characteristics, their sub-characteristics and the probes that generate them.

IDs: `NFR-001…` sequential, **or** themed `NFR-SEC-001`, `NFR-PERF-001`. Pick
one form per document.

## The Metric line

Must contain at least one of:

- a **threshold with units** — `p95 <250 ms, p99 <750 ms`; `>=99.9% monthly`;
  `<=30 seconds`; `>=90% branch coverage`
- an **absolute count** — `0 plaintext token occurrences`; `zero cross-tenant
  P0`; `no duplicate mutation across 100 runs`
- a **named pass/fail procedure** — `weekly restore drill succeeds and
  integrity_check is ok`; `architecture tests reject forbidden imports`;
  `every documented --json command validates against a checked-in JSON Schema`

Also name **where it is measured** (which environment, which hardware, which
dataset size) whenever the number would otherwise be meaningless:
*"for 90-day data with 100,000 rows on target hardware"*.

Exclusions belong in the Metric too: *"excluding external rate-limit waits"*,
*"not counting provider latency"*. Unexcluded third-party latency is the most
common reason a performance NFR is quietly unachievable.

## Coverage floor

A comprehensive spec carries **12–20 NFRs across at least 6 characteristics**.
Minimum expected per characteristic:

| Characteristic | Ask at least |
|---|---|
| Security | secrets at rest + redaction across all sinks; authorization negative suite; crypto/replay/stale failing closed; default network exposure |
| Reliability | idempotency across crash; restart recovery without loss or permanent lock; backup restorable and integrity-checked; external failure fails closed and observable |
| Performance efficiency | latency targets p95/p99 by surface; capacity (users, events/s, burst, monthly volume); job completes within its own interval; bounded concurrency and backlog alerting |
| Maintainability | domain isolated from frameworks/providers, enforced by architecture tests; everything versioned and reproducible; coverage floor on the risky modules |
| Compatibility | machine-readable contract versioning; N/N-1 window for clients you do not control |
| Usability | accessibility floor for the real device matrix; error messages that state what failed, whether a side effect occurred, and the recovery command |
| Safety | hard ceilings, cooldowns and kill switch on anything automatic that touches the outside world |
| Privacy | retention minimisation; what is deliberately not stored; sanitised fixtures |
| Portability | clean-environment install/migration/smoke on the documented target |

Drop a characteristic only if it genuinely cannot apply — and then say so in
Key Constraints rather than leaving a silent gap.

## Rules

1. One quality attribute per NFR. "Fast and secure" is two.
2. The sentence uses `shall` and describes a property, not a feature.
3. If it names a trigger and an actor, it is a functional requirement —
   move it to a feature.
4. Numbers must be defensible. An unmeasured `99.99%` costs more than it looks;
   prefer the number you will actually run a test for.
5. Every NFR should imply a test someone will write. If nobody would ever run
   it, delete it.

## Anti-patterns

- `The system shall be highly available.` — no number, no window.
- `Response time shall be fast.` — replace with p95/p99 per endpoint class.
- `The code shall be maintainable.` — replace with the enforced boundary and
  the test that enforces it.
- Metrics that restate the sentence (`Metric: the system is secure`).
- Performance targets that include an uncontrolled third-party call.

## Characteristics — headings and probes

Use these exact strings as `### ` headings under `## Quality Requirements`.
The validator warns on anything outside this set.

| Heading | Sub-characteristics | Probes that generate NFRs |
|---|---|---|
| **Functional suitability** | completeness, correctness, appropriateness | Is every promised capability reachable? Are computed results correct to a stated tolerance? |
| **Performance efficiency** | time behaviour, resource utilisation, capacity | p95/p99 per surface; throughput sustained and burst; memory/disk ceiling; job duration vs its interval; concurrency bound; backlog age alert |
| **Compatibility** | co-existence, interoperability | API/schema/event N and N-1; client versions you cannot force-upgrade; versioned machine-readable output; running alongside other processes on the host |
| **Usability** | learnability, operability, accessibility, error protection, UI aesthetics | accessibility floor (screen reader, 200% type) on the real device matrix; error messages carrying code + correlation ID + side-effect status + recovery command; confirmation before destructive acts |
| **Reliability** | maturity, availability, fault tolerance, recoverability | monthly availability by service; zero lost acknowledged work across crash/failover; at-least-once delivery without duplicate side effects; restart recovery without permanent locks; backup integrity and restore drill cadence; external failure fails closed and stays observable |
| **Security** | confidentiality, integrity, non-repudiation, accountability, authenticity | secrets encrypted at rest, key outside the store, redacted from every sink; authorization negative suite (cross-tenant, privilege substitution); signature/replay/stale-digest fail closed; audit non-repudiation and signer separation; default network binding; injection/encoding on every input surface |
| **Maintainability** | modularity, reusability, analysability, modifiability, testability | domain isolated from vendor SDKs/frameworks, enforced by architecture tests; generated code has zero drift; everything versioned (schema, prompt, policy, contract) and reproducible; branch-coverage floor on policy/state/idempotency modules; correlation IDs across the workflow |
| **Portability** | adaptability, installability, replaceability | clean-environment install + migration + smoke on the documented target; supported runtime versions; environment separation |

## Which edition you are using

The table above is the **2011** product-quality model — eight characteristics —
which is what most existing specs, including both reference documents, are
written against. **ISO/IEC 25010:2023** revised it: nine characteristics, with
`Usability` renamed **Interaction capability**, `Portability` renamed
**Flexibility** (absorbing scalability), and **Safety** promoted to a full
characteristic. The validator accepts both sets of headings, but do not mix
them inside one document — pick an edition and say which in the Goal or an ADR.

| Heading | Status | Use for |
|---|---|---|
| **Safety** | 2023 characteristic; an extension if you are on 2011 | hard ceilings, quotas, cooldowns, kill switches, shadow-mode staging — anything protecting third parties or the outside world from the system's automatic behaviour |
| **Privacy** | not a characteristic in either edition — a 2023 sub-characteristic of Security, used as a heading here for emphasis | retention minimisation, what is deliberately not stored, deletion reach into backups and derived data, residency limits, sanitised fixtures |

Call these what they are. A spec that presents `Privacy` as an ISO 25010
characteristic is wrong on a checkable fact, and a reader who catches it stops
trusting the rest.

## Placement rule

If the statement names a trigger, an actor and a response → it is functional,
put it in a feature. If it constrains *how well* the whole system behaves →
it is an NFR. When a rule is both (a kill switch is a feature *and* a safety
property), write the mechanism as a requirement under its feature and the
property with its measurement as the NFR, and let them reference the same
concept by name.
