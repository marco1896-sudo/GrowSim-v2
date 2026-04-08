# Event System Audit And Contract

Phase 1 foundation for the Grow Simulator event-system rebuild.

This pass does not replace gameplay logic. It documents the current system, defines the migration-safe contract, and introduces passive scaffolding for the modular rebuild.

## Current-state audit summary

- `events.js` is still the live owner of event evaluation, scheduling, transitions, choice handling, and asset fallback.
- `storage.js` is the migration-critical source of truth for save/load, event defaults, and legacy repair.
- `app.js` and `ui.js` read field-based event state directly.
- The existing `src/events` modules already provide reusable primitives for flags, memory, resolver, and outcome analysis.
- `assets/events` already contains 66 square PNG assets:
  - `2048x2048`: 39 likely full event images
  - `1024x1024`: 9 medium support images
  - `512x512`: 18 icon-like assets

## Canonical event-state contract

The future system must keep the current UI and persistence layers safe by preserving this contract shape.

```json
{
  "events": {
    "version": "legacy-compatible-v1",
    "machineState": "idle|warning|activeEvent|resolving|resolved|cooldown",
    "scheduler": {
      "nextEventSimTimeMs": "number",
      "nextEventRealTimeMs": "number",
      "lastEventSimTimeMs": "number",
      "lastEventRealTimeMs": "number",
      "lastEventId": "string|null",
      "lastChoiceId": "string|null",
      "lastEventCategory": "string|null",
      "eventCooldownsSim": {},
      "categoryCooldownsSim": {},
      "eventCooldowns": {},
      "categoryCooldowns": {}
    },
    "activeEventId": "string|null",
    "activeEventTitle": "string",
    "activeEventText": "string",
    "activeLearningNote": "string",
    "activeOptions": [],
    "activeSeverity": "number",
    "activeCooldownRealMinutes": "number",
    "activeCategory": "string",
    "activeTags": [],
    "activeImagePath": "string",
    "warnings": [],
    "latentPressures": {},
    "chains": {
      "pending": {},
      "flags": {}
    },
    "history": [],
    "foundation": {
      "flags": {},
      "memory": {
        "events": [],
        "decisions": [],
        "pendingChains": {}
      },
      "analysis": []
    },
    "uiModel": {
      "popup": {},
      "detail": {},
      "media": {
        "kind": "image|icon|placeholder",
        "assetId": "string|null",
        "src": "string|null"
      }
    }
  }
}
```

## Compatibility notes

- `warnings`, `latentPressures`, `chains`, and `uiModel` are additive Phase 1 contract fields.
- Legacy runtime is not required to populate them yet.
- Storage and UI code must continue working when these fields are absent.
- Future migration work should prefer additive normalization over destructive replacement.

## Phase 1 module intent

- `eventEngine.js`: orchestration facade and future routing seam.
- `eventFeatureFlag.js`: default legacy runtime mode with future shadow/new modes.
- `eventEligibility.js`: future deterministic eligibility contract.
- `eventPressure.js`: future latent pressure contract.
- `eventActivation.js`: future warning/activation contract.
- `eventEscalation.js`: future escalation contract.
- `eventResolution.js`: future resolution contract.
- `eventRewards.js`: future earned reward contract.
- `eventChains.js`: future follow-up and chain lifecycle contract.
- `eventCooldowns.js`: future anti-spam and cooldown normalization contract.
- `eventContradictions.js`: future contradiction guard contract.
- `eventAssets.js`: explicit registry and media model contract.
- `eventAnalysisRuntime.js`: future outcome-analysis runtime contract.
- `eventPersistenceAdapter.js`: future serializer and migration contract.

## Asset audit notes

- All current event assets are square, which supports the planned future `1:1` media area without requiring new art dimensions.
- Current heuristic mapping is useful for audit and draft matching, but it is not stable enough to remain the long-term authority.
- Phase 1 introduces a draft explicit registry and a structured gap list without changing renderer behavior.

## High-priority asset gaps

- `v2_outdoor_rain_series`
- `v2_outdoor_storm_front`
- `v2_special_weather_shift`
- `v2_positive_ideal_mild_days`
- `v2_positive_outdoor_sun_window`
- `v2_climate_veg_leaf_expansion`
- `drooping_leaves_warning`
- `root_stress_followup`
- `stable_growth_reward`

## Phase 1 done definition

- Audit documents exist and reflect the current runtime accurately.
- New architecture files exist as passive scaffolding only.
- Legacy runtime stays fully active.
- Asset registry draft and gap list exist and are structured for later expansion.
- Lightweight tests prove the new foundation loads without changing active behavior.
