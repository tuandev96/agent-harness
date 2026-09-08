# Worked example — graded

Real excerpts. Read the ✗ column before writing anything.

## Goal

✓ *"Xây dựng X Assistant single-account, CLI-first, dùng SQLite để quản lý tài
khoản X cá nhân; phân tích văn phong bằng Codex; đồng bộ Home timeline; đề xuất
hành động; tự động like/follow theo policy có kiểm soát; cho phép người dùng
quyết định và thực thi post/reply qua CLI; gửi digest Telegram; cung cấp
dashboard chỉ đọc."*

Why it works: names the architecture posture (single-account, CLI-first,
SQLite), each capability, and the control boundary (user decides publishing)
in one breath. A reader can already predict the Out Of Scope list.

✗ *"Build a great assistant that helps users manage their social presence
efficiently."* — no boundary, no actor, nothing falsifiable.

## Feature

✓ `### F-008 - Controlled automatic engagement` / Intent: *"Tự động like/follow
theo policy qua disabled/shadow/confirm/enabled stages và kill switch."*

The Intent names the state machine, so every requirement under it has an
obvious home. Features are cohesive around a *risk*, not around a UI screen.

✗ `### F-011 - Operations and Reliability` … *"No requirements linked to this
feature."* — a heading with no requirements is a hole in the spec, not a
placeholder. Either write them or delete the feature.

## Requirement

| | Example |
|---|---|
| ✓ Ubiquitous | *The system shall encrypt X cookies and Telegram bot tokens at rest with a key stored outside SQLite and shall redact those secrets from logs and CLI JSON output.* |
| ✓ Event-driven | *When the operator runs setup, the system shall securely collect auth_token, ct0, direction text, Telegram bot token, and Telegram chat/user ID.* |
| ✓ State-driven | *While an X session is expired, denied, or unhealthy, the system shall prevent outbound mutations and expose reconnect guidance through account health.* |
| ✓ Unwanted | *If an outbound post/reply call times out after transmission, the system shall reconcile remote state before retrying and shall never blindly send the same mutation again.* |
| ✗ | *The system should handle errors gracefully and be reliable.* — no trigger, no obligation, no test. |
| ✗ | *Use SQLAlchemy 2 async with Alembic over SQLite WAL.* — that is an ADR, not a requirement. |

Note the ✓ Ubiquitous row carries two `shall` clauses on one cohesive
obligation (encrypt + redact the same secrets). That is the *only* tolerated
form of a second `shall`; if the two halves could pass and fail independently,
split them into two requirements.

## Acceptance criterion

✓
```
##### AC-026 - Unknown mutation outcome is reconciled
Given the network times out after a mutation may have reached X
When retry handling starts
Then remote state is checked first and the mutation is sent again only when absence is proven
```
The Then is a state a test can assert without reading the implementation.

✗ `Then the system works correctly` — unfalsifiable.
✗ `Then reconcile_state() is called with force=True` — asserts implementation, breaks on refactor.

## Quality requirement

✓
```
#### NFR-004
- Metric: Fault-injection tests at every pre/post-transmission checkpoint produce no duplicate remote mutation across 100 repeated runs.
Outbound post, reply, like, and follow operations shall be idempotent across retries and process crashes.
```
The Metric names the *procedure* and the *threshold*. Someone can run it.

✗ `- Metric: System should be highly available.` — no number, no method.
✓ minimum viable numeric form: `REST >=99.9%; realtime >=99.9% monthly.`

## Decision

✓
```
### ADR-014 - Reconcile unknown mutation outcomes before retry
Context   A network timeout can occur after X accepted a mutation, so a blind retry can duplicate a post.
Decision  Persist outbound intent before transmission, mark unknown outcomes explicitly, query remote state, retry only after proving absence.
Consequences  Mutation handling is more complex and needs operation-specific reconciliation, but exactly-once user-visible behavior is achievable.
```
Consequences admits a cost. An ADR with only upside is marketing.

## The comprehensiveness gap

The difference between an adequate spec and this one is almost never feature
count. It is these four:

1. **Every REQ has an AC.** 47/47 in the strong example; 32/86 in the weak one.
2. **Unwanted-behavior requirements exist** — timeouts, races, replays, stale
   versions, revoked access, contract drift, kill switches.
3. **Out Of Scope is long and specific**, and each entry has a matching ADR or
   constraint explaining the deferral.
4. **NFR metrics are runnable procedures**, not adjectives.
