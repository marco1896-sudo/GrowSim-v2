# Phase 74 - Learning-Card Backfill Batch A

## Goal
Replace the most important temporary learning-card mappings with more specific cards, without adding runtime behavior.

## New Learning Cards
- `lc_light_intensity_distance_basics`
- `lc_pest_observation_basics`
- `lc_training_recovery_basics`
- `lc_recovery_observation_basics` (optional card, included after review)

## Optional Card Decision
Yes, created.

Reason:
`shared_observation_recovery_after_stress` is primarily about calm observation after stabilization. That lesson is related to recovery timing, but it is broader than training. A dedicated recovery observation card is the cleaner fit.

## Remapping Decisions
### Mandatory remaps
- `indoor_light_burn_canopy_top` -> `lc_light_intensity_distance_basics`
- `outdoor_early_pest_pressure_leaf_underside` -> `lc_pest_observation_basics`
- `indoor_overtraining_stall_mild` -> `lc_training_recovery_basics`

### Additional quality remaps
- `shared_light_distance_error` -> `lc_light_intensity_distance_basics`
- `shared_early_pest_signs_mild` -> `lc_pest_observation_basics`
- `shared_observation_recovery_after_stress` -> `lc_recovery_observation_basics`

## Learning-Card Breadth Improvement
### Before
- `lc_climate_vpd_basics` was carrying climate, light-distance, pest-observation, and training-recovery lessons.
- `lc_watering_basics` was also carrying a general recovery observation lesson.

### After
- `lc_climate_vpd_basics` is narrowed back to true climate/VPD cases.
- `lc_watering_basics` is narrowed back to actual watering/root-zone reading contexts.
- Light, pest, training, and recovery observation now each have their own lesson anchor.

## Locale Scope
Added new learning-card copy in:
- `de`
- `en`
- `es`

Each new card includes:
- title
- subtitle
- three short bullets
- real-world note

## Files Changed in Data Layer
### New learning-card files
- `data/events/catalog/learning-cards/lc_light_intensity_distance_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_pest_observation_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_training_recovery_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_recovery_observation_basics.learning-card.json`

### Remapped event files
- `data/events/catalog/events/indoor/indoor_light_burn_canopy_top.event.json`
- `data/events/catalog/events/shared/shared_light_distance_error.event.json`
- `data/events/catalog/events/outdoor/outdoor_early_pest_pressure_leaf_underside.event.json`
- `data/events/catalog/events/shared/shared_early_pest_signs_mild.event.json`
- `data/events/catalog/events/indoor/indoor_overtraining_stall_mild.event.json`
- `data/events/catalog/events/shared/shared_observation_recovery_after_stress.event.json`

### Existing learning cards updated
- `data/events/catalog/learning-cards/lc_climate_vpd_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_watering_basics.learning-card.json`

## Runtime Safety
- No new events
- No new chains
- No runtime fields added
- No `app.js` changes
- No `sw.js` changes
- No `package.json` changes
- No `src/events/*.js` changes
