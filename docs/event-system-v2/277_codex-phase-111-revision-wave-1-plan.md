# Phase 111 - Revision Wave 1 Plan

## Scope
Revision Wave 1 focuses only on high-priority `revise` events from Phase 110:
1. `indoor_vpd_mismatch_veg`
2. `indoor_fan_failure_airflow_drop`
3. `shared_light_distance_error`
4. `outdoor_heatwave_dry_wind`

No image generation by Codex. No integration. No AssetRef changes.

## Global Constraints for Round 2
- Source import folder remains: `assets/events/v2/_generated/maual-import/`
- Output naming for revisions:
  - `eventId__candidate_02.png`
  - `eventId__candidate_03.png` when `candidate_02` already exists and must not be overwritten.
- Wide-hero only: 16:9 style landscape composition.
- No text, speech bubbles, labels, readable numbers/units/display values, logos.
- Buddy must stay reference-locked (no mascot drift, no belly icon, no redesign).

## Per-Event Revision Analysis

### 1) indoor_vpd_mismatch_veg
- Current candidate: `assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_01.png`
- Current status: `revise` (Phase 110 score 14)
- Main issues:
  - Not wide-hero enough (ratio warning from prior QA)
  - Event fit still too generic/soft for VPD mismatch
- Must improve:
  - Clear VPD/climate mismatch storytelling in veg stage
  - Buddy expression diagnostic and concerned (not cheerful)
  - Strictly remove readable values and labels
- New import filename: `indoor_vpd_mismatch_veg__candidate_02.png`
- Future review target: `assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_02.png`
- QA focus: format, event-specificity vs generic climate scene, non-happy Buddy.

### 2) indoor_fan_failure_airflow_drop
- Current candidate: `assets/events/v2/_generated/full-scene/review/indoor_fan_failure_airflow_drop/candidate_full_scene_01.png`
- Current status: `revise` (Phase 110 score 15)
- Main issues:
  - Readable display values
  - Buddy drift and belly-icon risk
- Must improve:
  - Fan-failure signal clear without numeric UI
  - Air stagnation visible without cluttering scene
  - Buddy closer to official identity and neutral-coach gesture
- New import filename: `indoor_fan_failure_airflow_drop__candidate_02.png`
- Future review target: `assets/events/v2/_generated/full-scene/review/indoor_fan_failure_airflow_drop/candidate_full_scene_02.png`
- QA focus: no readable text/values, no belly symbol, clear airflow-drop cue.

### 3) shared_light_distance_error
- Current candidate: `assets/events/v2/_generated/full-scene/review/shared_light_distance_error/candidate_full_scene_01.png`
- Current status: `revise` (Phase 110 score 15)
- Main issues:
  - Display/readout style artifacts
  - Overlap risk with `indoor_light_burn_canopy_top`
- Must improve:
  - Emphasize lamp distance/positioning error as root cause
  - Keep stress mild-to-moderate (not severe top burn)
  - Buddy explains distance relation between lamp and canopy top
- New import filename: `shared_light_distance_error__candidate_02.png`
- Future review target: `assets/events/v2/_generated/full-scene/review/shared_light_distance_error/candidate_full_scene_02.png`
- QA focus: separation from canopy-burn event and no value readouts.

### 4) outdoor_heatwave_dry_wind
- Current candidates:
  - `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_01.png`
  - `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_02.png`
- Current status: `revise` (Phase 110 score 16)
- Special history:
  - Intake conflict recorded for revision file mapped to candidate_02 with different hash.
- Must improve:
  - Produce true revision gain vs existing candidates
  - Stronger Buddy identity lock
  - Clear heat + dry wind with recoverable plant (no apocalypse)
  - No artificial outdoor fan props
- New import filename: `outdoor_heatwave_dry_wind__candidate_03.png`
- Future review target: `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_03.png`
- QA focus: measurable visual improvement + clean outdoor causality.
