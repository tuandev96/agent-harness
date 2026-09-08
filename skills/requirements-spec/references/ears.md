
# EARS requirement authoring

One requirement = one trigger + one obligation + one testable outcome.

## The six patterns

| Kind | Shape |
|------|-------|
| **Ubiquitous** | `The <system> shall <response>.` |
| **Event-driven** | `When <trigger>, the <system> shall <response>.` |
| **State-driven** | `While <in state>, the <system> shall <response>.` |
| **Optional feature** | `Where <feature is included>, the <system> shall <response>.` |
| **Unwanted behavior** | `If <undesired condition>, then the <system> shall <response>.` |
| **Complex** | `While <state>, when <trigger>, the <system> shall <response>.` |

The declared `Kind` field must match the opening clause. A requirement that
opens with `When` but is filed `Ubiquitous` is a misclassification and the
validator rejects it.

Vietnamese equivalents keep the same structure with English `shall`:
`Khi <trigger>, hệ thống SHALL <response>.` / `Trong lúc <state>, …` /
`Nếu <condition>, hệ thống SHALL …`.

## Choosing the Kind

- Does it hold at all times? → **Ubiquitous**
- Is it triggered by a discrete event? → **Event-driven**
- Does it hold only during a mode/state? → **State-driven**
- Is it a response to something going wrong? → **Unwanted behavior**
- Does it depend on a build/config option? → **Optional feature**
- Both a state and a trigger, unavoidably? → **Complex** (use sparingly; two
  requirements are usually clearer)

Aim for **at least a quarter of requirements to be `Unwanted behavior`**. A
spec without them documents only the happy path. Sources: probe bank sections
3–6, 8, 12.

## Rules

1. **One `shall`.** Two clauses joined by `and shall` are tolerated only when
   they cannot pass or fail independently (encrypt *and* redact the same
   secret). Otherwise split.
2. **≤45 words.** Longer almost always means two requirements.
3. **No conjunction smuggling.** `and/or`, `as well as`, `including but not
   limited to`, trailing `etc.` — all forbidden. Enumerations are fine when
   the list is closed and each item is checked by the same test.
4. **No ambiguity words.** fast, easy, robust, appropriate, sufficient,
   seamless, intuitive, reasonable, efficient, user-friendly, minimal,
   flexible, comfortably. Replace with a number, or move to an NFR with a
   Metric, or delete.
5. **What, not how.** No library, schema, table or algorithm names as the
   obligation. If the implementation is genuinely mandated (a legal or
   integration constraint), the *reason* belongs in an ADR and the requirement
   states the observable property.
6. **Active voice, one system.** `The system shall reject…`, not `Requests
   should be rejected`.
7. **Negative requirements are stated positively where possible.** Prefer
   `shall reject X before persistence` over `shall not allow X`. When a
   prohibition is the point, say `shall never` and give it an AC that probes
   the prohibited path.
8. **Bind the failure point.** "rejects" is weaker than "rejects before
   persistence and before any provider call". Specify *where* in the pipeline
   the guarantee holds — this is what makes such requirements enforceable.

## Field block

```
#### REQ-020
- Feature: F-005
- Kind: Event-driven
- Priority: Must
- Status: Planned

When a post needs a reply, the system shall create a human-review action in
PENDING_USER state and shall not publish a reply automatically.
```

`Priority`: one vocabulary per document — MoSCoW (`Must/Should/Could/Won't`)
or severity (`P0/P1/P2`). Never mixed.
`Status`: `Planned | In progress | Implemented | Verified | Deferred`.
Optional `[Source: XXX-000]` prefix on the sentence when tracing to an upstream
normative document.

## Splitting compound requirements

> ✗ *When setup runs, the system shall collect credentials, validate them
> against both providers, send a test message, and store them encrypted.*

Four obligations, four failure modes, one ID. Split into: collect (REQ-002),
validate both integrations (REQ-003), encrypt at rest and redact (REQ-004).
Each then gets its own AC and can be independently marked Implemented.

## Do not write

- Requirements on the *spec* itself ("the document shall list…").
- Requirements no one can fail ("the system shall be well designed").
- Duplicate obligations restated per feature — put the shared rule in the
  feature that owns the guarantee and reference it.
- Design rationale — that is an ADR.
- Numbers without a measurement method — that is an NFR.

Every requirement you write goes straight to `references/acceptance.md` for its
acceptance criterion, in the same pass.
