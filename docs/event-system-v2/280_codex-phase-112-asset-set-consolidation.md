# Phase 112 - Asset Set Consolidation

## Decision
Asset quality no longer blocks Event-V2 structural progress. Existing candidates from Phase 110/111 are treated as current working baseline.

## Source Notes
- Consolidated from Phase 110/111 reports and mapping JSON.
- Manual import source remains `assets/events/v2/_generated/maual-import/` (typo documented, no rename).

## Consolidated Event Asset Overview (22/22)

| Event ID | Best Candidate | Status | Score | Image Status | Later Revision | Trial/Soft-Launch Usable |
|---|---|---|---:|---|---|---|
| indoor_dry_rootball | `.../indoor_dry_rootball/candidate_full_scene_01.png` | promotion_ready_candidate | 18 | usable_now | no | yes |
| indoor_fan_failure_airflow_drop | `.../indoor_fan_failure_airflow_drop/candidate_full_scene_01.png` | revise | 15 | usable_temporarily | yes | yes |
| indoor_heat_stress_air | `.../indoor_heat_stress_air/candidate_full_scene_01.png` | revise | 16 | usable_temporarily | yes | yes |
| indoor_light_burn_canopy_top | `.../indoor_light_burn_canopy_top/candidate_full_scene_01.png` | revise | 16 | usable_temporarily | yes | yes |
| indoor_light_nutrient_tox_early | `.../indoor_light_nutrient_tox_early/candidate_full_scene_01.png` | revise | 16 | usable_temporarily | yes | yes |
| indoor_overtraining_stall_mild | `.../indoor_overtraining_stall_mild/candidate_full_scene_01.png` | accept_with_watch | 17 | usable_with_watch | yes | yes |
| indoor_overwatering_early | `.../indoor_overwatering_early/candidate_full_scene_01.png` | accept_with_watch | 17 | usable_with_watch | yes | yes |
| indoor_rootzone_airless_medium | `.../indoor_rootzone_airless_medium/candidate_full_scene_01.png` | promotion_ready_candidate | 18 | usable_now | no | yes |
| indoor_soil_ph_out_of_range | `.../indoor_soil_ph_out_of_range/candidate_full_scene_01.png` | revise | 16 | usable_temporarily | yes | yes |
| indoor_vpd_mismatch_veg | `.../indoor_vpd_mismatch_veg/candidate_full_scene_01.png` | revise | 14 | usable_temporarily | yes | yes |
| outdoor_cold_night_stress | `.../outdoor_cold_night_stress/candidate_full_scene_01.png` | accept_with_watch | 17 | usable_with_watch | yes | yes |
| outdoor_early_pest_pressure_leaf_underside | `.../outdoor_early_pest_pressure_leaf_underside/candidate_full_scene_01.png` | accept_with_watch | 17 | usable_with_watch | yes | yes |
| outdoor_heatwave_dry_wind | `.../outdoor_heatwave_dry_wind/candidate_full_scene_02.png` | revise | 16 | usable_temporarily | yes | yes |
| outdoor_heavy_rain_waterlogging_risk | `.../outdoor_heavy_rain_waterlogging_risk/candidate_full_scene_01.png` | accept_with_watch | 17 | usable_with_watch | yes | yes |
| outdoor_pot_dries_by_afternoon | `.../outdoor_pot_dries_by_afternoon/candidate_full_scene_01.png` | promotion_ready_candidate | 18 | usable_now | no | yes |
| outdoor_wind_exposure_stem_stress | `.../outdoor_wind_exposure_stem_stress/candidate_full_scene_01.png` | promotion_ready_candidate | 18 | usable_now | no | yes |
| shared_early_pest_signs_mild | `.../shared_early_pest_signs_mild/candidate_full_scene_01.png` | promotion_ready_candidate | 19 | usable_now | no | yes |
| shared_light_distance_error | `.../shared_light_distance_error/candidate_full_scene_01.png` | revise | 15 | usable_temporarily | yes | yes |
| shared_observation_recovery_after_stress | `.../shared_observation_recovery_after_stress/candidate_full_scene_01.png` | accept_with_watch | 17 | usable_with_watch | yes | yes |
| shared_panic_watering_misread | `.../shared_panic_watering_misread/candidate_full_scene_01.png` | promotion_ready_candidate | 18 | usable_now | no | yes |
| shared_rootbound_warning | `.../_generated/review/shared_rootbound_warning/candidate_full_scene_02.png` | promotion_ready_candidate | 19 | usable_now | no | yes |
| shared_substrate_drainage_compaction | `.../shared_substrate_drainage_compaction/candidate_full_scene_01.png` | promotion_ready_candidate | 18 | usable_now | no | yes |

## Consolidation Rule Applied
- `promotion_ready_candidate`: directly usable
- `accept_with_watch`: usable, watch notes retained
- `revise`: temporary usable baseline when no better candidate exists
- `reject`: blocked (none currently)

## AssetRef Preparation Decision
AssetRef preparation is allowed for all currently usable candidates, with watch/revision tags carried into planning docs.
