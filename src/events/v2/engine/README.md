# Shadow Engine (Phase 3)

This folder contains an isolated, read-only shadow engine skeleton.

Exports:
- `createShadowEvaluationContext(input)`
- `evaluateShadowEvents(context, catalogIndex)`
- `describeShadowEngineContract()`

Phase-3 constraints:
- no runtime wiring
- no game-state mutation
- no event execution
- no feature-flag activation

Current behavior:
- evaluates catalog event candidates in stub mode
- emits structured decision and diagnostics objects
- keeps scoring intentionally neutral with TODO markers
