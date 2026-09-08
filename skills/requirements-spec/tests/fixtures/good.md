# System Requirements

Source: `tests/fixtures/good.md`
Exported: 2026-08-10T00:00:00.000Z

## Goal
Ship a single-tenant link shortener whose redirects are public and whose link
creation, deletion and abuse controls are operator-only, so that no automated
caller can create or destroy a link without an authenticated operator identity.

## Scope

### In Scope
- Operator-authenticated link creation, listing and deletion
- Public redirect resolution with click counting
- Abuse controls: destination denylist, per-operator rate ceiling, kill switch
- Structured audit of every link mutation

### Out Of Scope
- Multi-tenant isolation and per-tenant billing
- Custom domains and vanity slugs
- Public self-service signup
- Analytics beyond a click counter

## Users / Actors
- Operator: authenticates, creates and deletes links, sets the denylist
- Anonymous visitor: follows a short link, never mutates state
- Redirect service: resolves slugs and records clicks
- Auditor: reads the audit log, mutates nothing

## Key Constraints
- The relational database is the single source of truth; the cache may never be read for authorization decisions
- Slugs are immutable once issued and are never reused after deletion
- Destination denylist evaluation happens before persistence and before any redirect is served
- A global kill switch must stop link creation without a deploy

## Features

### F-001 - Link lifecycle
- Priority: Must
- Status: Planned

Intent

Create, resolve and delete short links so that a slug maps to exactly one
destination for its whole lifetime.

#### Requirements

#### REQ-001
- Feature: F-001
- Kind: Event-driven
- Priority: Must
- Status: Planned

When an authenticated operator submits a destination URL, the system shall
issue exactly one unused slug and persist the mapping atomically.

Acceptance Criteria

##### AC-001 - A slug is issued exactly once
Given an authenticated operator and a valid destination URL
When link creation succeeds
Then one mapping exists, its slug was never previously issued, and a second concurrent request receives a different slug

#### REQ-002
- Feature: F-001
- Kind: Ubiquitous
- Priority: Must
- Status: Planned

The system shall treat an issued slug as immutable and shall never reissue a
slug whose link has been deleted.

Acceptance Criteria

##### AC-002 - Deleted slugs are never recycled
Given a link that was created and then deleted
When one million further slugs are issued
Then the deleted slug is not among them and requests for it return not-found

#### REQ-003
- Feature: F-001
- Kind: Unwanted behavior
- Priority: Must
- Status: Planned

If a destination URL matches the denylist, the system shall reject creation
before persistence and shall record the rejection reason.

Acceptance Criteria

##### AC-003 - Denylisted destinations never persist
Given a destination matching an active denylist entry
When creation is attempted
Then no mapping row is written, the caller receives a rejection reason, and an audit entry records the attempt

### F-002 - Abuse control
- Priority: Must
- Status: Planned

Intent

Bound how much damage a compromised or misused operator credential can do.

#### Requirements

#### REQ-004
- Feature: F-002
- Kind: State-driven
- Priority: Must
- Status: Planned

While the global kill switch is engaged, the system shall reject all link
creation while continuing to serve existing redirects.

Acceptance Criteria

##### AC-004 - Kill switch stops writes but not reads
Given the kill switch is engaged
When creation and redirect requests both arrive
Then creation is rejected with a stable error code and existing redirects still resolve

#### REQ-005
- Feature: F-002
- Kind: Unwanted behavior
- Priority: Must
- Status: Planned

If an operator exceeds the daily creation ceiling, the system shall reject
further creations for that operator until the window resets.

Acceptance Criteria

##### AC-005 - Daily ceiling is enforced per operator
Given an operator at the daily creation ceiling
When another creation is attempted
Then it is rejected, a second operator below the ceiling is unaffected, and the rejection is audited

### F-003 - Audit
- Priority: Must
- Status: Planned

Intent

Make every mutation attributable and non-repudiable.

#### Requirements

#### REQ-006
- Feature: F-003
- Kind: Ubiquitous
- Priority: Must
- Status: Planned

The system shall write an append-only audit entry naming the actor, action,
slug and outcome in the same transaction as every link mutation.

Acceptance Criteria

##### AC-006 - Audit is atomic with the mutation
Given a link mutation that must be audited
When the audit insert fails
Then the whole transaction rolls back and no mapping change is visible

## Quality Requirements

### Security

#### NFR-001
- Metric: Authorization negative suite covering unauthenticated, expired and cross-operator tokens passes 100% with zero mutations executed.
- Priority: Must
- Status: Planned

Link mutation endpoints shall reject every unauthenticated or unauthorized
caller before any state change.

### Reliability

#### NFR-002
- Metric: 24-hour soak with forced restarts loses 0 accepted mutations and leaves 0 rows locked beyond the configured lease.
- Priority: Must
- Status: Planned

Accepted mutations shall survive process restart without loss or permanent
locking.

### Performance efficiency

#### NFR-003
- Metric: Redirect resolution p95 <20 ms and p99 <60 ms at 500 requests per second on the documented instance size, excluding client network time.
- Priority: Must
- Status: Planned

Redirect resolution shall meet its latency targets under the stated load.

### Maintainability

#### NFR-004
- Metric: Architecture tests reject imports from storage adapters into domain modules; every audited action references a policy version.
- Priority: Should
- Status: Planned

Domain logic shall stay independent of the storage and HTTP frameworks through
explicit adapter interfaces.

### Usability

#### NFR-005
- Metric: All documented failure classes return a stable error code, a correlation ID and a next-step message.
- Priority: Should
- Status: Planned

Operator-facing errors shall state what failed and what to do next.

### Safety

#### NFR-006
- Metric: Property tests show 0 creations beyond the daily ceiling; the kill switch blocks 100% of in-flight creation attempts within one second.
- Priority: Must
- Status: Planned

Abuse controls shall bound creation volume and stop it immediately on demand.

## Decisions

### ADR-001 - Keep the relational database as the only authorization source
Status: Accepted

Context

A cache in front of slug resolution is required for latency, but stale cache
entries would keep deleted or denylisted links alive.

Decision

Serve redirects from cache but evaluate deletion, denylist and kill-switch
state against the database on every mutation and on cache miss.

Consequences

Redirect latency depends on cache hit rate, and cache invalidation must be
explicit on delete; authorization can never be wrong because the cache is stale.

### ADR-002 - Never recycle slugs
Status: Accepted

Context

Recycling a deleted slug would silently redirect old inbound links to a new,
unrelated destination.

Decision

Mark deleted slugs as permanently consumed and exclude them from issuance.

Consequences

The slug space shrinks over time and the consumed-slug table grows, which is
cheaper than mis-routing traffic a third party still links to.

### ADR-003 - Enforce abuse limits server-side only
Status: Accepted

Context

Rate ceilings enforced in the client can be bypassed by any direct API caller.

Decision

Evaluate ceiling, denylist and kill switch inside the creation transaction;
the client displays limits but never enforces them.

Consequences

Every creation pays one extra policy read, and the client cannot show a limit
without asking the server for it.

## Assumptions and Open Questions

### Assumptions

- The daily creation ceiling is 500 links per operator — product owner to confirm
- Redirect traffic stays under 500 requests per second in the first year — operations to confirm

### Open Questions

- Must deleted links return 404 or 410 to search engines? — product owner — blocks AC-002
- Who may amend the destination denylist outside business hours? — security lead — blocks REQ-003
