# Phase 76 UI-Lab Real Catalog Review Pass

## Scope
- review-only pass for the real Event V2 mini catalog inside the isolated UI-Lab context
- no runtime expansion
- no event activation
- no save
- no UI replacement in the real app
- no asset production

## New Files
- `docs/event-system-v2/170_codex-phase-76-ui-lab-real-catalog-review-pass.md`
- `docs/event-system-v2/171_codex-phase-76-event-review-matrix.md`
- `docs/event-system-v2/172_codex-phase-76-buddy-asset-need-map.md`
- `docs/event-system-v2/173_codex-phase-76-result.md`
- `data/events/catalog/_planning/phase-76-ui-lab-review-notes.md`
- `data/events/catalog/_planning/phase-76-buddy-asset-need-map.md`
- `src/events/v2/ui-lab/qa/EventV2RealCatalogReviewMatrix.js`
- `src/events/v2/ui-lab/qa/EventV2AssetNeedReview.js`

## Changed Files
- `src/events/v2/ui-lab/EventV2UiLabDataFromCatalog.js`

## UI-Lab Data Stand
- real catalog render path now works in isolated UI-Lab review context
- all `22` events can be mapped through the adapter
- all `9` learning cards are reachable through catalog refs
- both chains remain reviewable from authoring/crossref data
- adapter matrix remains `22/22 pass`
- budget warnings remain `0`
- no runtime file outside UI-Lab review helpers was touched

## Important Review Finding
The catalog adapter was already green, but the existing UI-Lab bridge still returned the raw adapter UI model while the lab renderer expected the older scenario shape.

Phase 76 therefore added one small isolated bridge normalization in:
- `src/events/v2/ui-lab/EventV2UiLabDataFromCatalog.js`

This does not affect app runtime. It only lets the isolated UI-Lab render the real catalog honestly.

## Viewport Review

### 360px
- no horizontal overflow across all `22` events
- `5` events show wrapped decision labels in compact mode
- densest events are still readable, but feel text-heavy:
  - `indoor_dry_rootball`
  - `indoor_light_nutrient_tox_early`
  - `indoor_overwatering_early`
  - `indoor_vpd_mismatch_veg`
  - `shared_rootbound_warning`
- premium feel is acceptable, but this width exposes every copy weakness quickly

### 390px
- no horizontal overflow
- only `1` event still wraps a decision label
- this is currently the best phone baseline for the real catalog
- dense events still need copy tightening, but the modal feels notably calmer than at `360px`

### 430px
- no horizontal overflow
- `0` decision-label wraps
- the content stack feels much more intentional and less compressed
- strong target width for polish review and premium composition

### 768px
- no horizontal overflow
- titles collapse to one line for all reviewed cases
- text density becomes comfortable
- current phone-framed modal is still fine for review, but it should not be mistaken for a final tablet layout

## Hero / Asset Fallback Review
- slot fallbacks are stable
- the isolated lab no longer drops heroes due to shape mismatch
- the current review surface renders one scenario at a time with lazy-loaded media, so hero-path stability is confirmed, but this is still not an asset-quality pass
- premium visual impact is still limited by shared fallback art and missing event-specific Buddy visuals

## Learning-Card Review

### Accept
- `lc_airflow_fundamentals`
- `lc_light_intensity_distance_basics`
- `lc_pest_observation_basics`
- `lc_recovery_observation_basics`
- `lc_rootzone_oxygen_basics`
- `lc_training_recovery_basics`

### Watch
- `lc_climate_vpd_basics`
  - still useful, but conceptually broad
- `lc_ph_nutrient_uptake_basics`
  - correct but cognitively dense
- `lc_watering_basics`
  - still important, but used by many events and may remain too broad in later passes

## Chain UI / Flow Review

### watering_rootzone_chain
- strongest point:
  - very readable cause-and-effect arc from misread watering to drainage to root-zone oxygen pressure
- current weakness:
  - the outdoor dryback branch can feel like a side branch unless the UI clearly labels it as a branch
- UI recommendation:
  - better as a compact storyline or hidden authoring context than as a large explicit chain panel

### airflow_climate_chain
- strongest point:
  - indoor airflow -> VPD -> heat pressure is coherent and realistic
- current weakness:
  - the later outdoor branch can feel like a location jump without framing
- UI recommendation:
  - treat as a systems-storyline, not yet as a heavy chain flow component

## Copy Fix List

### Sofort verbessern
- `shared_rootbound_warning`
  - root-pressure framing is still too close to generic watering language
- `indoor_vpd_mismatch_veg`
  - shorten title and calm the climate terminology
- `indoor_soil_ph_out_of_range`
  - compress summary and why text
- `outdoor_heatwave_dry_wind`
  - trim the pressure/exposure explanation
- `shared_early_pest_signs_mild`
  - symptom and aftermath feel one step too long

### Spaeter verbessern
- `indoor_dry_rootball`
  - title can be shorter without losing meaning
- `outdoor_pot_dries_by_afternoon`
  - one decision detail still sits right at the compact threshold
- `shared_substrate_drainage_compaction`
  - phrasing is technically good, but emotionally dry
- `indoor_light_nutrient_tox_early`
  - reduce cognitive load in the opening block
- `shared_light_distance_error`
  - separate tone more clearly from the indoor light-burn event

### Ok lassen
- `indoor_fan_failure_airflow_drop`
- `indoor_rootzone_airless_medium`
- `shared_observation_recovery_after_stress`
- `outdoor_heavy_rain_waterlogging_risk`

## Risk Snapshot
- no runtime risk was introduced
- no catalog validation regression was introduced
- the main remaining product risk is not technical; it is content density plus generic visual fallback reuse

## Recommendation for Phase 77
`UI-Lab Copy Tightening + Rootbound/Climate Clarity Pass`

Reason:
- the current catalog is stable enough for content refinement
- the biggest visible quality lift now comes from shortening and clarifying a small set of dense events
- this also prepares later Buddy/asset work much better than jumping into more runtime planning
