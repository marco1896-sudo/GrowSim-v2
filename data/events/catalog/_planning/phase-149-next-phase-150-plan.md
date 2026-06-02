# Phase 150 Plan - Event V2 Runtime Shadow Dev/Test Toggle (Still No Write)

## Recommendation
Proceed with runtime-near dev/test toggle for Event V2 shadow evaluation while keeping all write paths disabled.

## Why
- App-near entry is stable and testable.
- Candidate feed is visible and understandable.
- Safety/no-write constraints remain green.
- Next maturation step is runtime-near control, not UI-only polishing.

## Guardrails for Phase 150
- runtimeWrite stays false
- production stays false
- no event activation
- no save/storage writes
- no reward/mission/notification mutations
- rollback via toggle off
