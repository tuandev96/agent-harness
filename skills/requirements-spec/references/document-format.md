# Document format (normative)

Exact structure the validator enforces. Deviate and `validate_spec.py` fails.

## Heading skeleton

```
# System Requirements          H1, exactly once, first line

Source: `<origin>`             backtick path/URL of the source of truth
Exported: <ISO-8601 UTC>       e.g. 2026-08-09T14:30:08.139Z

## Goal                        H2
## Scope                       H2
### In Scope                   H3, bullet list
### Out Of Scope               H3, bullet list
## Users / Actors              H2, bullet list
## Key Constraints             H2, bullet list
## Features                    H2
### F-001 - <Name>             H3
#### Requirements              H4 (literal)
#### REQ-001                   H4
##### AC-001 - <Title>         H5
## Quality Requirements        H2
### <Characteristic>           H3, an ISO 25010 characteristic
#### NFR-001                   H4
## Decisions                   H2
### ADR-001 - <Title>          H3
```

Section order is fixed. After `## Decisions` comes one required annex and any
optional extras (glossary, traceability matrix):

```
## Assumptions and Open Questions      H2, required
### Assumptions                        H3, bullets: assumption — owner
### Open Questions                     H3, bullets: question — who must answer — what it blocks
```

The annex is where a spec stops lying by omission. Every number, priority and
policy you supplied rather than received belongs in Assumptions with the person
who can confirm it. Everything you could not resolve belongs in Open Questions
with what it blocks. An empty Open Questions list on a first-draft spec means
the questions were guessed, not answered.

## ID rules

| Prefix | Range | Rule |
|--------|-------|------|
| `F-` | 001+ | zero-padded 3 digits, numbered from 001 |
| `REQ-` | 001+ | numbered across the whole document, not per feature |
| `AC-` | 001+ | globally unique; need not follow REQ order |
| `NFR-` | 001+ | either `NFR-001` or a themed form `NFR-SEC-001` — pick one form per document |
| `ADR-` | 001+ | a withdrawn ADR keeps its number |

Two rules, in this order of priority:

1. **Unique and stable.** An ID, once issued, means that entry forever. Editing
   an existing spec must not move a single ID.
2. **Dense on first write.** A brand-new document numbers straight through with
   no gaps. Afterwards gaps are normal and correct — they are the fossil record
   of deleted entries. Never renumber to close one; append instead.

The validator warns on gaps precisely because rule 2 makes them meaningful:
in a new document a gap is a slip, in an edited one it is history. Say which
it is when you keep the warning.

## Field blocks

Feature:
```
### F-001 - Single-account onboarding
- Priority: Must
- Status: Planned

Intent

<one or two sentences: why this feature exists>

#### Requirements
```

Requirement:
```
#### REQ-001
- Feature: F-001
- Kind: Ubiquitous
- Priority: Must
- Status: Planned

The system shall enforce a single active X account through a database
singleton constraint and reject a different account without an explicit
replace command.

Acceptance Criteria

##### AC-001 - Reject a second account
Given SQLite already contains one configured X account
When setup resolves a different Viewer X user ID
Then setup is rejected without changing the existing account or secrets
```

Optional first element of the requirement sentence: a source tag
`[Source: SEC-HUM-001]` when the spec is derived from normative baselines.
Keep it if there is an upstream document to trace to; drop it otherwise.

Quality requirement:
```
#### NFR-001
- Metric: Automated secret scan finds 0 plaintext token occurrences in DB, logs, JSON output, backups, and traces.
- Priority: Must
- Status: Planned

Credentials shall be encrypted at rest and redacted from all application outputs.
```

Decision:
```
### ADR-004 - Encrypt credentials with a key outside the database
Status: Accepted

Context

<forces, 1-3 sentences>

Decision

<what was chosen, imperative, 1-3 sentences>

Consequences

<what this costs and what it forecloses, 1-3 sentences>
```

## Controlled vocabularies

- `Kind`: `Ubiquitous` | `Event-driven` | `State-driven` | `Optional feature` |
  `Unwanted behavior` | `Complex`
- `Priority`: MoSCoW (`Must` | `Should` | `Could` | `Won't`) **or** severity
  (`P0` | `P1` | `P2`). One vocabulary per document, never mixed.
- `Status` (requirement/feature/NFR): `Planned` | `In progress` | `Implemented` |
  `Verified` | `Deferred`
- `Status` (ADR): `Proposed` | `Accepted` | `Superseded by ADR-NNN` | `Rejected`
- Quality characteristic headings: the ISO/IEC 25010 set — see
  `references/quality-iso-25010.md`.

## Language

Structural keywords stay English (`shall`, `Given/When/Then`, field names,
`Kind` values) even when the prose body is Vietnamese. The validator keys off
those tokens.
