
# Acceptance criteria

**Every requirement gets at least one AC, written in the same pass as the
requirement.** REQ→AC coverage is the single strongest predictor of whether a
spec is comprehensive: a strong spec runs 100%, a weak one runs 35%.

## Form

```
##### AC-001 - Reject a second account
Given SQLite already contains one configured X account
When setup resolves a different Viewer X user ID
Then setup is rejected without changing the existing account or secrets
```

- `Given` — preconditions and the state that matters. Enough for someone to
  build the fixture.
- `When` — exactly one triggering action. Two `When`s means two ACs.
- `Then` — the observable outcome, plus what must *not* have happened when the
  requirement is a prohibition.

Title: a short assertive sentence — the thing being guaranteed
(`Kill switch stops queued automatic actions`), not `Test kill switch`.

## Rules

1. **Observable, not internal.** Assert state a black-box test can read:
   persisted rows, HTTP status, emitted event, absence of a provider call, what
   the UI shows. Never `Then reconcile() is called`.
2. **Falsifiable.** If you cannot describe a run that fails the Then, rewrite it.
3. **Include the negative half.** For any requirement about blocking, denying,
   or not-doing, the Then must assert the absence: *"no mutation is
   transmitted"*, *"no DecisionReceipt or Grant exists"*, *"zero reply, like or
   follow mutations are scheduled"*.
4. **One AC per distinct path.** Add a second AC when there is a genuinely
   different precondition (empty vs full, first vs replay, healthy vs revoked),
   not to restate the same path.
5. **Name the boundary.** *"rejected before persistence, preview, authorization
   and provider call"* is testable; *"rejected"* is not.
6. **No implementation vocabulary** unless it is part of the observable
   contract (state names, error codes, endpoint paths are fine).
7. Keep it under ~40 words per clause. If the Given needs a paragraph, the
   requirement is too big.

## Which requirements need more than one AC

- Terminal races → one AC for the winner, one for what the loser receives.
- Idempotency → one AC for first call, one for replay with the same key, one
  for replay with a *mismatched* fingerprint.
- Timeouts → one for the proven outcome, one for the unknown outcome.
- State machines → one per illegal transition class you actually care about.
- Anything with a kill switch, quota or expiry → one AC where the guard trips.

## AC IDs

Globally unique, `AC-001…`. They need not run in the same order as REQ IDs —
allocate the next free number when you add one. Never renumber.

## Coverage check

```bash
python3 "${SKILL_DIR}/scripts/validate_spec.py" <spec.md>
```

The report ends with `REQ->AC coverage: n/m`. Anything under 100% is an
unfinished spec, and each uncovered REQ is reported as an ERROR.

## Anti-patterns

| ✗ | Why |
|---|-----|
| `Then the system works correctly` | unfalsifiable |
| `Then the user is happy` | not observable |
| `Then `save()` is called twice` | asserts implementation, breaks on refactor |
| `When the user does various actions` | not a single trigger |
| AC restating the requirement in other words | adds no verification |
| One AC covering four requirements | cannot mark requirements done independently |
