# System Requirements

Source: `tests/fixtures/bad.md`
Exported: 2026-08-10T00:00:00.000Z

Deliberately broken. Every defect class below must be reported by the
validator; `run.sh` asserts a non-zero exit.

## Goal
Build something good.

## Scope

### In Scope
- Do the thing

### Out Of Scope

## Users / Actors
- Operator

## Key Constraints
- TBD

## Features

### F-001 - Broken requirements
- Priority: Must
- Status: Planned

Intent

Collect one instance of each defect class the validator must catch.

#### Requirements

#### REQ-001
- Feature: F-001
- Kind: Ubiquitous
- Priority: Must
- Status: Planned

When the operator asks, the system shall respond appropriately and easily.

#### REQ-002
- Feature: F-002
- Kind: Telepathic
- Priority: P0

The system responds to requests.

Acceptance Criteria

##### AC-001 - Missing a clause
Given the system is running
When a request arrives

### F-002 - Feature with no requirements
- Priority: Must
- Status: Planned

Intent

This feature has no requirements and must be reported as an error.

## Quality Requirements

### Vibes

#### NFR-001
- Priority: Must
- Status: Planned

The system shall be fast and robust.

## Decisions

### ADR-001 - A decision with no consequences
Status: Accepted

Context

Someone made a choice.

Decision

Do the thing.

#### NFR-001
- Priority: Must
- Status: Planned

The system shall reuse an ID that is already taken.
