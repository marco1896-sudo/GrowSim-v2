# Phase 141 - Snapshot Shadow Evaluation

Snapshot-based shadow scoring is now supported in the runtime shadow evaluator.

## Added/Extended
- `src/events/v2/shadow/EventV2RuntimeShadowEvaluator.js`
  - Optional snapshot input (`runtimeSnapshot`)
  - Deterministic snapshot-aware boosts (environment/climate/stress context)
  - Static fallback preserved
- New dev runner:
  - `dev/run-event-v2-runtime-snapshot-shadow-report.js`
- Fixtures:
  - `data/events/catalog/_planning/phase-141-runtime-snapshot-fixtures.json`

## Execution Outcome
- Fixtures checked: 3
- Events per fixture: 22
- Total evaluations: 66
- Broken paths: 0
- No-write guard values:
  - stateMutations: 0
  - saveWrites: 0
  - uiActions: 0
  - gameplayActivations: 0
- Input mutation detection: false

## Plausibility
Fixture-specific top candidates align with expected families:
- Indoor VPD mismatch fixture surfaces VPD/climate-related indoor events.
- Outdoor heat/dry fixture surfaces heat/wind/dry families.
- Healthy baseline avoids escalation-specific boosts.
