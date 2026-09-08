# System Requirements

Source: `<path or origin of truth>`
Exported: <YYYY-MM-DDTHH:MM:SS.sssZ>

## Goal
<One paragraph. What is being built, for whom, and the observable end state that
means it worked. Name the hard boundary conditions in the same sentence they
apply to. No marketing.>

## Scope

### In Scope
- <capability the build must deliver>
- <...one bullet per deliverable capability, 8-14 total>

### Out Of Scope
- <capability a reader would reasonably assume is included, and is not>
- <...deferred versions, adjacent platforms, alternative providers, admin tooling>

## Users / Actors
- <Actor>: <what they do in this system and what they are trusted to decide>
- <Include non-human actors: daemons, agents, external providers, CI, auditors>

## Key Constraints
- <constraint that limits design freedom, with its consequence>
- <sources of truth, single-region/single-host limits, credential handling>
- <what must fail closed, what may never be automated, what is externally owned>

## Features

### F-001 - <Feature name>
- Priority: Must
- Status: Planned

Intent

<One or two sentences: the outcome this feature guarantees.>

#### Requirements

#### REQ-001
- Feature: F-001
- Kind: Ubiquitous
- Status: Planned
- Priority: Must

The system shall <single testable obligation>.

Acceptance Criteria

##### AC-001 - <Short assertive title>
Given <precondition and relevant state>
When <the single triggering action>
Then <the observable, checkable outcome>

## Quality Requirements

### Security

#### NFR-001
- Metric: <number, threshold, or named pass/fail procedure>
- Priority: Must
- Status: Planned

<Quality obligation, one sentence with shall.>

### Reliability

### Performance efficiency

### Maintainability

### Compatibility

### Usability

### Safety

### Portability

## Decisions

### ADR-001 - <Decision title, imperative>
Status: Proposed

Context

<The forces: what is true about the domain, the constraint, the risk.>

Decision

<What was chosen. Imperative. Include what was chosen *against*.>

Consequences

<What this costs, what it forecloses, what must now be tested or maintained.>

## Assumptions and Open Questions

### Assumptions

- <Something you supplied rather than received> — <who can confirm it>

### Open Questions

- <What is still unknown> — <who must answer> — <which REQ/NFR/ADR it blocks>
