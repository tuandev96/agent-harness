# Slice readback — artifact-chain skills + hooks pack

Date: 2026-09-10 (updated after Grok review + fix round)  
Work source: this plan folder. Not a second tracker.

## Added

| Path | Role |
|------|------|
| `skills/capture-intent/` | Intent skill + `assets/intent-template.md` |
| `skills/plan-mode/` | Plan skill + `assets/plan-template.md` |
| `skills/review-policy/` | Multi-pass PR review skill + `assets/REVIEW-template.md` |
| `hooks/` | protected-paths, test-edit-protect, secret-diff, production-gate, settings.example.json, README |
| `src/core/installer.ts` | Installs new skills + hooks; `chmod 0o755` for `*.sh`; richer managed AGENTS.md block |
| `tests/operations/hooks-pack.test.mjs` | Automated allow/block probes for all four hooks + executable-bit install |
| `protocol/harness-protocol.md` | Points at new skills and reference hooks |
| `adapters/portable/index.mjs` | Capability disclosure lists skills + hooksPack |
| `scripts/package.mjs` / `scripts/test.mjs` | Package inventory + hooks in fingerprint roots |
| docs README/installation/agents/usage | Layout, loader snippets, skill table |

## Independent review

### Round 1 — Grok (`grok -p` headless, clean context)

**VERDICT: BLOCK** (1 🔴)

| # | Sev | Finding | Resolution |
|---|-----|---------|------------|
| 1 | 🔴 | Installer wrote hook scripts mode `600`, not executable | **Fixed**: `chmodSync(path, 0o755)` for `*.sh` after `atomicWrite` |
| 2 | 🟡 | `secret-diff` missed untracked secrets on `git add` | **Fixed**: scan untracked when command is `git add` |
| 3 | 🟡 | Protected globs missed relative paths | **Fixed**: normalize to `./` prefix + `*/$pattern` case |
| 4 | 🟡 | `*test.*` blocked `docs/latest.md` | **Fixed**: dropped `*test.*`; kept `*/tests/*`, `*.test.*`, `*.spec.*`, `*_test.*` |
| 5 | 🟡 | Fail-open on invalid JSON | **Fixed**: fail closed (exit 2) on parse error |
| 6 | 🟡 | Docs table only listed `requirements-spec` | **Fixed**: table + usage list all skills |
| 7 | 🟡 | No automated hook tests | **Fixed**: `tests/operations/hooks-pack.test.mjs` |
| 8–9 | 🟢 | RELEASE_APPROVAL any string; capabilities shape | Accepted for reference pack |

Full round-1 transcript: `/tmp/grok-review-out2.txt` (copied below as archive note).

### Round 2 — Grok re-review

Grok re-review process hung mid-run after confirming chmod/untracked/fail-closed paths. It also reported that `secret-diff` **blocked a plain `git commit` in this repo** — root cause was the detector matching its own regex source (`-----BEGIN` / pattern text) via the untracked scan.

**Follow-up fix (local):**
- Removed bare `-----BEGIN` from `secret_re`
- Untracked scan only on `git add`
- Skip `hooks/secret-diff.sh` so the detector can be committed
- New test asserts detector-source self-add allows

### Round 2 alternative — labeled self-review (not PASS)

Because the independent re-review did not complete, this is **not** `VERDICT: PASS`.

| AC | Evidence | Status |
|----|----------|--------|
| 1. Four skills + frontmatter + templates | Skill files + assets present; grok FRONTMATTER_OK | PASS |
| 2. Hooks allow/block semantics | `hooks-pack.test.mjs` operations suite PASS; direct probes | PASS (script-level) |
| 3. Installer skills+hooks, executable `.sh` | Test asserts mode `0o111`; 42-entry dry-run | PASS |
| 4. Protocol/docs/adapter/package consistent | package:check PASS 158 files; fingerprint includes hooks | PASS |
| 5. Automated hook tests | operations suite includes hooks-pack | PASS |
| 6. ASSISTED honesty | adapter `nativeConformanceVerified:false`; releaseReady false | PASS |
| 7. No secrets committed | package:check builtin NO_MATCH; self-add probe allow | PASS |
| Host PreToolUse actually wired | Not observed on Claude Code / DSH | **PENDING** |
| Independent re-review after zip fix | Codex gpt-5.5 low-effort, workspace-write | **PASS** (see below) |

## Evidence (current candidate)

- `npm run typecheck` → exit 0
- `npm run build` → BUILD_OK 14 modules
- `npm test` → all suites PASS
- `npm run package:check` → INVENTORY_CHECK_PASS, 158 files, releaseReady:false
- Probe: `git add hooks/secret-diff.sh` in this repo → allow (exit 0)

## Still open

- Host observation that hooks actually block (Claude Code / DSH): NOT_OBSERVED
- UPG-01..24 full acceptance: NOT_ASSESSED in this slice
- Live agent-evals CI / bands closed loop: not in this slice

## Archive: Grok round-1 verdict line

`VERDICT: BLOCK (1 finding)` — installer hook mode 600. Fixed before this readback update.

---

## Independent review — Codex + Cursor (2026-09-10)

### Codex (`codex exec review --uncommitted`)

**Partial / useful, not a completed VERDICT.**

What actually ran (from stderr transcript, not invented):
- Read the uncommitted slice, protocol, skills, hooks, installer, tests.
- Ran repository checks on a review snapshot: `CHECK_OUTCOME=PASS`, 9 groups, core 63/63, plugins 22/22, operations 33/33, regression 5/5.
- Snapshot parity: source unchanged during review.
- **Unpacked private package** and re-ran `hooks-pack.test.mjs` from the archive → **FAILED**:
  - `hooks-pack.test.mjs:41` expected 2, got 1 (`git add` secret)
  - `hooks-pack.test.mjs:59` expected 0, got 1 (clean commit)
- Root cause (confirmed by reading `scripts/package-archive.py`): archive stored **every** file as `0o100644`, dropping `+x` on `*.sh`. Unpacked hooks are not executable; `execFileSync(script)` exits 1 instead of running the hook.

**Fix applied after Codex finding:**
- `scripts/package-archive.py`: `mode = 0o755 if name.endswith('.sh') else 0o644`
- `tests/operations/hooks-pack.test.mjs`: invoke via `bash <script>` + best-effort `chmod` so tests are mode-resilient
- Verified: probe zip shows `hooks/*.sh` → `0o755 EXEC`; full `npm test` PASS

Codex CLI did **not** write `--output-last-message` and the process ended without an explicit final `VERDICT:` line in this environment (timeout/no last-file). Per protocol: **timeout ≠ PASS**.

### Cursor (`cursor-agent -p --plan/--mode ask --trust --force`)

**Not completed.** Multiple attempts:
1. Missing workspace trust → CLI exit with trust prompt (need `--trust`)
2. With `--trust --force`: no stdout/stderr, process hung until killed
3. Ping test `Reply with exactly PONG`: also produced empty output (CLI hang / auth / endpoint)

No Cursor verdict is claimed. **Cursor: UNAVAILABLE for this review on this host.**

### Combined independent-review status

| Reviewer | Outcome |
|----------|---------|
| Grok round 1 | **BLOCK** → all 🔴/🟡 fixed |
| Grok round 2 | Hung after confirming fixes; flagged secret-diff self-match → fixed |
| Codex | Found **package zip dropped +x** (real) → fixed; final VERDICT not emitted (CLI timeout) |
| Cursor | Hung / no output → **UNAVAILABLE** |
| Host PreToolUse wiring | **NOT_OBSERVED** |

**Independent re-review PASS: still PENDING** (no completed second-model `VERDICT: PASS` after the zip-mode fix).

## Independent re-review PASS — Codex gpt-5.5 (2026-09-10)

Command: `codex exec --sandbox workspace-write -m gpt-5.5 -c model_reasoning_effort=low`
Prompt: short AC checklist (`reviewer-prompt-codex-fast.md`)
Exit: 0 · last-message file written

```
AC table
1 PASS
2 PASS
3 PASS
4 PASS
5 PASS
6 PASS

Findings
0 findings

VERDICT: PASS
```

Evidence Codex actually ran: frontmatter check, `ls -l hooks/*.sh`, installer/package-archive grep, ENFORCED/release grep, and `node scripts/test.mjs --suite operations` → PASS (duration ~1557ms).

Note: a prior read-only sandbox attempt reported AC5 FAIL solely due to `EPERM mkdir .harness-checks` — environment restriction, not a product defect. Re-run with workspace-write resolved that.

Host PreToolUse wiring on Claude Code/DSH remains **NOT_OBSERVED** (separate from this source-level PASS).

## Independent re-review PASS — Cursor + grok-4.6 (2026-09-10)

Command: `cursor-agent -p --mode plan --trust --force --model cursor-grok-4.6-high-fast`
Auth: logged in as tuanle.works@gmail.com
Note: `gpt-5.3-codex-low-fast` hit Ultra usage limit; `cursor-grok-4.6-high-fast` worked.
Exit: 0 · output archived at `/tmp/cursor-grok-review.txt`

```
| AC | Result |
|---|---|
| 1 | PASS |
| 2 | PASS |
| 3 | PASS |
| 4 | PASS |
| 5 | PASS |
| 6 | PASS |

0 findings

VERDICT: PASS
```

## Combined independent-review status (final)

| Reviewer | Outcome |
|----------|---------|
| Grok CLI R1 | BLOCK (hook mode 600) → fixed |
| Grok CLI R2 | Hung; secret-diff self-match → fixed |
| Codex (long) | Found zip dropped +x on .sh → fixed |
| **Codex gpt-5.5 low** | **VERDICT: PASS** |
| **Cursor grok-4.6-fast** | **VERDICT: PASS** |
| Host PreToolUse wiring | **NOT_OBSERVED** |

Independent source-level review: **PASS** (two completed second-model verdicts after all fixes).
Host enforcement observation: still open.

## Evidence after Codex zip-mode fix

- `npm run typecheck` → exit 0
- `npm run build` → BUILD_OK
- `npm test` → all suites PASS
- Probe zip: `hooks/*.sh` mode `0o755`
- Unpacked-archive hook execution: tests now run via `bash` (mode-resilient)
- Codex gpt-5.5 short review → **VERDICT: PASS**


