# Phase 138 - Runtime Activation Gate Plan

## Current Architecture Snapshot
- V1 runtime path remains authoritative (`events.js` + `window.GrowSimEvents` usage in `app.js`).
- V2 has isolated shadow/preview pipelines (`src/events/v2/preview/*`, `shadow-bridge/*`).
- Guardrails already enforce no runtime/save/ui/feature-flag mutation in shadow flows.

## Safe Activation Route
1. Dev-only preview bridge
2. Dev-only runtime shadow parallel evaluation (no-write)
3. Soft activation candidate gate
4. Separate production decision later

## Risk Notes
- Highest risk point: mixing runtime-write behavior into existing v1 path.
- Mitigation: keep `eventV2RuntimeWriteEnabled=false` and maintain v1 authority.
- Activation requires explicit approval after green gates.
