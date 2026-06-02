# Phase 142 - Soft Activation Candidate Gate

Phase 142 introduces a dev-only soft activation gate that evaluates whether Event V2 can safely move to a candidate-feed visibility step in dev/test contexts.

## Implemented
- Candidate model:
  - `src/events/v2/shadow/EventV2SoftActivationCandidateModel.js`
- Gate runner:
  - `dev/run-event-v2-soft-activation-candidate-gate.js`
- Outputs:
  - `data/events/catalog/_planning/phase-142-soft-activation-candidate-gate-report.json`
  - `data/events/catalog/_planning/phase-142-soft-activation-candidate-gate-report.md`

## No-Write Guarantees
- `selectedCandidate` remains `null`
- `actions` remain `[]`
- `canActivateGameplay`: false
- `canMutateState`: false
- `canMutateSave`: false
- `runtimeWriteEnabled`: false
- `productionEnabled`: false
