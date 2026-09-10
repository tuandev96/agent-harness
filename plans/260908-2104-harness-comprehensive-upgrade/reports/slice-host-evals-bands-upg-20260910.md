# Slice readback — host hooks, agent-evals CI, bands loop, UPG subset

Date: 2026-09-10  
Work source: plans/260908-2104-harness-comprehensive-upgrade/

## Delivered

| Area | Artifact | Status |
|------|----------|--------|
| Host wiring | `.claude/settings.json` PreToolUse → portable hooks | WIRED in repo |
| Host observation | `scripts/observe-host-hooks.sh` + `.harness-checks/host-hook-observation.json` | **11/11 PASS** (script-level PreToolUse payloads) |
| Claude Code live session | `claude -p` attempt | **BLOCKED** API 402 insufficient balance — not claimed |
| Agent evals | `evals/suite/*.json` (5 cases) + `evals/agent-evals.mjs` + `.github/workflows/agent-evals.yml` | FIXTURES_READY; live model runs disabled by default |
| Bands closed loop | `bands.yaml` + `scripts/bands-detect.mjs` | Detector deterministic; 3σ writes Stage-1 `intent.md` |
| UPG subset tests | `tests/operations/upg-slice-acceptance.test.mjs` | PASS in operations suite |
| Packaging | zip keeps `+x` on `*.sh` | PASS |

## Evidence

- `npm run typecheck` → 0
- `npm run build` → BUILD_OK
- `npm test` → all suites PASS
- `npm run package:check` → INVENTORY_CHECK_PASS, 167 files, releaseReady:false
- `node evals/agent-evals.mjs --suite evals/suite` → AGENT_EVAL_SUITE_OK caseCount=5
- Host observation: 11/11, `enforcementClaim: NONE`

## UPG mapping (slice subset — not full 24-control acceptance)

| Control | Evidence in this slice |
|---------|------------------------|
| UPG-14/15-adjacent | production-gate block/allow tests + observation |
| UPG-20 | installer preserves user AGENTS.md; receipt/rollback tests |
| UPG-22 | capabilities ASSISTED, nativeConformanceVerified false |
| UPG-23-adjacent | agent-eval suite shape + reject empty |
| Host hook protocol | observation script + settings wiring |

Full UPG-01..24 remains **NOT_ASSESSED** for the entire harness.

## Unblocked follow-through (same day)

| Item | Blocker? | What we ran |
|------|----------|-------------|
| Live agent-evals | No Anthropic key | `evals/run-live.mjs` via **Cursor grok-4.6** (5 cases) + **Codex gpt-5.5** (2 cases) |
| Bands local metrics | No prod CI | `collect-bands-metrics.mjs` (22 local summaries) → detect (current 0, no tier) |
| Claude live PreToolUse | **YES API 402** | Not claimed |
| DSH host launch | Not authorized this session | Not claimed |
| Full UPG-01..24 | Multi-phase plan | Subset only |

### Live eval scores (heuristic keyword — not a semantic oracle)

Cursor `cursor-grok-4.6-high-fast`:
- hook-prod-gate **3/3** · intent-template **3/3** · no-false-pass **3/3** · plan-before-code **0/3** · review-verdict **3/3**

Codex `gpt-5.5` low (2): hook-prod-gate **0/3** · intent-template **2/3**

`independentlyVerified: false` · rehearsal signal only.

### Bands loop rehearsal

```
collect-bands-metrics → 22 samples
bands-detect → current=0, baseline≈0.09, tier=null
```

Offline loop operational; production metric source still open.

## Still open / honest limits

- Claude Code live PreToolUse fire: **NOT_OBSERVED** (API 402)
- DSH host hook integration: not launched
- Live agent-eval scoring is heuristic, not certified oracle
- Bands detector not attached to production metrics store
- UPG-01..23 full matrix: pending plan phases 00–08
- `releaseReady: false` unchanged
