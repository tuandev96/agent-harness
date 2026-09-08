
# Architecture Decision Records

The Decisions section is where the spec explains *why* it is shaped this way.
Without it, every Key Constraint and every Out Of Scope entry looks arbitrary
to the next reader, and gets relitigated.

## Form

```
### ADR-014 - Reconcile unknown mutation outcomes before retry
Status: Accepted

Context

A network timeout can occur after the provider accepted a mutation, so a blind
retry can duplicate a post or repeat engagement.

Decision

Persist outbound intent before transmission, mark unknown outcomes explicitly,
query remote state or operation-specific evidence, and retry only after proving
absence.

Consequences

Mutation handling is more complex and needs operation-specific reconciliation,
but exactly-once user-visible behaviour is achievable.
```

- **Title**: imperative, names the choice, not the topic. `Use SQLite WAL as the
  single source of truth`, not `Database`.
- **Status**: `Proposed | Accepted | Rejected | Superseded by ADR-NNN`.
- **Context**: 1–3 sentences of forces — what is true about the domain, the
  constraint, the risk. No solution yet.
- **Decision**: 1–3 sentences, imperative, and it names what was chosen
  *against* where that matters.
- **Consequences**: 1–3 sentences. **Must admit a cost.** An ADR with only
  upside is marketing and will be ignored by whoever pays that cost later.

## What earns an ADR

Write one for each of:

- every technology or platform commitment that shapes requirements
  (language/runtime, storage, auth provider, cloud region, mobile framework),
- every architectural posture (monolith vs services, single-account, read-only
  surface, CLI-first, contract-first),
- **every non-obvious Out Of Scope entry** — the deferral is a decision,
- **every Key Constraint a reader would push back on** — if a constraint has no
  ADR, nobody can renegotiate it safely,
- every safety or control gate (human intent required, staged automation,
  kill switch, cloud-only release),
- every cross-cutting mechanism the probe bank produced (fail closed on
  contract drift, reconcile before retry, immutable versioning, key separation).

Target: **10–18 ADRs** for a system of 10–14 features. Fewer usually means the
Key Constraints are unexplained.

## Rules

1. One decision per ADR. If Consequences describe two unrelated costs, split.
2. Present tense, no hedging. "We might consider" is not a decision.
3. Immutable once Accepted. Reversing it means a new ADR that supersedes it,
   and the old one keeps its number and gains
   `Status: Superseded by ADR-NNN`.
4. Do not restate requirements. An ADR explains; a requirement obliges. If the
   ADR body contains `shall`, it is in the wrong section.
5. Reference the constraint or scope line it justifies, by wording, so a reader
   can connect them.
6. Do not write ADRs for choices with no consequence. `Use 4-space indent` is a
   style rule, not a decision record.

## Cross-check with the rest of the spec

Before finishing, walk the Key Constraints and Out Of Scope lists. Each entry
should map to at least one of: an ADR that decided it, or a requirement that
enforces it. Entries mapping to neither are unowned — either add the ADR or
delete the line.
