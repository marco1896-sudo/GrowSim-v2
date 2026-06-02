# Phase 141 - Runtime Snapshot Adapter

A read-only adapter was added to transform runtime-like state input into a normalized Event V2 snapshot envelope without mutating source objects.

## Implemented
- New adapter: `src/events/v2/shadow/EventV2RuntimeSnapshotAdapter.js`
- Defensive clone-based read path.
- Normalized output sections: `run`, `plant`, `climate`, `context`.
- Missing-field and warning reporting.
- Hard no-write flags:
  - `canMutateState: false`
  - `canMutateSave: false`
  - `canActivateGameplay: false`

## Runtime Shape Notes
The adapter is fixture-compatible and tolerant for partial runtime states. Missing values are emitted as `null` and tracked in `missingFields`.

## Safety
No save/storage APIs are called. No event activation path is called.
