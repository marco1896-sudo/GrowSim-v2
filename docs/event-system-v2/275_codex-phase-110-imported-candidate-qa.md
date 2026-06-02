# Phase 110 - Imported Candidate QA

## QA Rubric (0-20)
- Format / wide-hero suitability
- Buddy identity stability (eyes, silhouette, crown, no mascot drift)
- Event readability and symptom specificity
- Plant condition realism (mild-moderate, recoverable)
- Visual cleanliness (no text/speech/logo/readable values)
- Mobile hero readability and premium fit

## Candidate Results

| Event ID | Candidate | Score | Status | Key QA Notes |
|---|---:|---:|---|---|
| indoor_dry_rootball | 01 | 18 | promotion_ready_candidate | Rootball dryness is specific and readable; no severe artifact issues. |
| indoor_fan_failure_airflow_drop | 01 | 15 | revise | Readable display values visible; Buddy drift watch still needed. |
| indoor_heat_stress_air | 01 | 16 | revise | Good heat scene, but event boundary vs VPD/fan-failure still too close. |
| indoor_light_burn_canopy_top | 01 | 16 | revise | Canopy burn is readable; Buddy identity still drifts from official master. |
| indoor_light_nutrient_tox_early | 01 | 16 | revise | Mixed-cause readability acceptable but still somewhat ambiguous. |
| indoor_overtraining_stall_mild | 01 | 17 | accept_with_watch | Event fit is decent; keep Buddy consistency under watch. |
| indoor_overwatering_early | 01 | 17 | accept_with_watch | Symptom clarity good; minor Buddy-style drift remains. |
| indoor_rootzone_airless_medium | 01 | 18 | promotion_ready_candidate | Rootzone compaction/airless context reads clearly with usable composition. |
| indoor_soil_ph_out_of_range | 01 | 16 | revise | Event understandable, but pH cueing can be cleaner and less display-like. |
| indoor_vpd_mismatch_veg | 01 | 14 | revise | Format ratio (1.333) not wide-hero enough; event fit improved but not final. |
| outdoor_cold_night_stress | 01 | 17 | accept_with_watch | Cold-night stress reads well; no catastrophe exaggeration. |
| outdoor_early_pest_pressure_leaf_underside | 01 | 17 | accept_with_watch | Early pest pressure visible and mild; maintain Buddy lock in next passes. |
| outdoor_heatwave_dry_wind | 02 | 16 | revise | Existing target differs from new intake hash; no overwrite; still revision-pending. |
| outdoor_heavy_rain_waterlogging_risk | 01 | 17 | accept_with_watch | Waterlogging risk clear; avoid over-dramatic flood styling in next revision. |
| outdoor_pot_dries_by_afternoon | 01 | 18 | promotion_ready_candidate | Strong clarity of afternoon dry-pot stress and good mobile composition. |
| outdoor_wind_exposure_stem_stress | 01 | 18 | promotion_ready_candidate | Wind/stem stress is clear and readable; composition is strong. |
| shared_light_distance_error | 01 | 15 | revise | Display/readout style cues and overlap with light-burn need stronger separation. |
| shared_observation_recovery_after_stress | 01 | 17 | accept_with_watch | Recovery message works; ensure no instant-heal interpretation in future revs. |
| shared_panic_watering_misread | 01 | 18 | promotion_ready_candidate | Situation and Buddy coaching action are clear and useful for gameplay messaging. |
| shared_substrate_drainage_compaction | 01 | 18 | promotion_ready_candidate | Substrate compaction/drainage issue reads clearly with good event focus. |

## Status Counts
- `promotion_ready_candidate`: 6
- `accept_with_watch`: 6
- `revise`: 8
- `reject`: 0

## Highest Revision Priority
1. indoor_vpd_mismatch_veg (format + event-fit strictness)
2. indoor_fan_failure_airflow_drop (readable display values)
3. shared_light_distance_error (overlap with light-burn + display-value risk)
4. outdoor_heatwave_dry_wind (hash conflict; new revision not imported)
