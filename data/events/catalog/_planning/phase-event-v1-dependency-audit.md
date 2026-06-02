# Event V1 Dependency Audit Report

Generated: 2026-05-31T13:49:59.394Z

- Scanned files: 528
- Files with findings: 124
- Total pattern hits: 2119

## Category Counts

- A (Legacy-Read): 11
- B (UI-Fallback): 62
- C (Productive Write): 23
- D (Save/Restore): 56
- E (Test/Dev): 90
- F (Delete Candidate): 0

## Top Findings

- `app.js` hits=360 categories=A,B,C,D,E risk=high
- `events.js` hits=318 categories=B,C risk=high
- `storage.js` hits=169 categories=A,B,C,D risk=high
- `ui.js` hits=96 categories=B,C,D risk=high
- `src/events/eventEngine.js` hits=77 categories=B,C,D risk=high
- `dev/run-event-v1-write-isolation-report.js` hits=46 categories=A,B,C,D,E risk=high
- `test/event-flow-integration.test.js` hits=45 categories=B,C,D,E risk=high
- `test/event-flow-persistence.test.js` hits=43 categories=B,C,D,E risk=high
- `test/event-shop-transaction-runtime.test.js` hits=42 categories=B,C,D,E risk=high
- `dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js` hits=34 categories=A,B,C,D,E risk=high
- `dev/run-event-center-v2-resolve-pilot-smoke.js` hits=33 categories=A,B,D,E risk=high
- `test/event-resume-reconciliation-runtime.test.js` hits=33 categories=B,C,D,E risk=high
- `src/events/EventSystemRuntimeBridge.js` hits=29 categories=A,D risk=high
- `sim.js` hits=27 categories=A,B,C risk=high
- `dev/run-event-center-v2-mobile-qa-smoke.js` hits=24 categories=B,D,E risk=high
- `test/event-phase7-shadow-persistence.test.js` hits=24 categories=B,C,D,E risk=high
- `src/events/eventPersistenceAdapter.js` hits=23 categories=B,C,D risk=high
- `test/event-flow-multi-chain-persistence.test.js` hits=22 categories=B,C,D,E risk=high
- `test/event-phase10-soft-cutover.test.js` hits=22 categories=B,E risk=medium
- `dev/run-event-center-v2-apply-delta-pilot-smoke.js` hits=21 categories=B,D,E risk=high
