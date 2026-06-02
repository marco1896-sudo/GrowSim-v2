# Phase 143 Plan - Event V2 Dev/Test Candidate Feed Integration (No Write)

## Recommendation
Proceed with **Event V2 Dev/Test Candidate Feed Integration - No Write**.

## Why
- Gate status: `ready_with_scoring_watch`
- All hard safety gates pass.
- Snapshot plausibility passes in all fixtures.
- VPD watch is documented (ordering watch, not a blocker):
  - `scoring_watch_vpd_vs_dry_rootball`

## Scope for Phase 143
1. Show candidate-only feed in dev/test preview/event-center lab context.
2. Keep `selectedCandidate` null and `actions` empty.
3. Keep runtime write and production flags off.
4. Add no-write verification report for the visible candidate feed path.
