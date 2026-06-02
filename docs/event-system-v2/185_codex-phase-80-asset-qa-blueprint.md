# Phase 80 Asset QA Blueprint

## Purpose
Define acceptance gates for Asset Batch 1 before any generation or integration phase.

## Universal QA Gate (All 8 Motifs)
Every motif must pass all checks:
1. Buddy identity consistency
2. event problem immediately recognizable
3. botanical plausibility
4. mobile-small readability
5. UI hero-frame compatibility
6. non-catastrophic tone for mild events
7. no text overload
8. no wrong-cause implication
9. no competing dominant secondary problem
10. speech bubble max 2-5 words or intentionally absent
11. tone aligned with learning-card and coach guidance
12. no legal or brand-risk elements

## Per-Motif QA Focus

### `shared_rootbound_warning`
- root-space limit is visible at pot boundary
- no false overwatering-only visual dominance
- Buddy cue points to root-room check

### `indoor_vpd_mismatch_veg`
- climate mismatch reads as system relation, not single panic symptom
- no nutrient-deficiency look override
- Buddy explanation pose remains calm

### `outdoor_heatwave_dry_wind`
- heat plus dry wind are both visible
- not mistaken for rain damage or pest event
- warning intensity stays realistic

### `shared_early_pest_signs_mild`
- underside mild signs visible at small size
- no horror or infestation exaggeration
- inspection action is obvious

### `outdoor_pot_dries_by_afternoon`
- afternoon drydown context is clear
- pot-volume and exposure cues visible
- no panic-watering dominant framing

### `indoor_soil_ph_out_of_range`
- subtle uptake tension visible without fake certainty
- measure-first implication is clear
- not confused with light-burn or severe deficiency

### `outdoor_early_pest_pressure_leaf_underside`
- outdoor context differentiates from shared mild pest motif
- early-stage pressure, not outbreak
- underside evidence remains dominant

### `indoor_light_burn_canopy_top`
- canopy-top stress is the primary focal signal
- light distance/intensity relation is visually inferable
- no misread as pure heatwave or feeding problem

## Speech Bubble QA
- if used, must be short and corrective
- must not duplicate title copy verbatim
- must not become the only diagnostic signal
- must not require one language to understand core symptom

## No-Drift QA
- Buddy silhouette, face and color family match baseline
- rendering style matches the Batch 1 set
- no outlier motif with different illustration family
- accessories remain small and role-linked

## Output/Packaging QA
- expected path contract per motif:
  - `assets/events/v2/{eventId}/hero.webp`
  - `assets/events/v2/{eventId}/hero@2x.webp`
  - `assets/events/v2/{eventId}/fallback.webp`
- crop-safe margins respected
- no clipped key anatomy or tools

## Fail Conditions
Reject motif if any of these occurs:
- Buddy redesign drift
- wrong biological signal for the event
- unreadable symptom at mobile size
- scene communicates wrong primary cause
- long speech bubble or text clutter
- major element clipped in hero frame

## Approval Rule
Batch asset is `approved` only if:
- universal gate pass
- motif-specific QA pass
- no-drift pass
- packaging path pass
