# Phase 111 - Revision Prompts (Manual Round 2)

## Shared Reference Package (all 4 prompts)
Use these uploaded references every time:
- Buddy identity references:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
  - optional: `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png` (identity only, not mood target)
- Style references:
  - `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
  - `assets/events/v2/_generated/full-scene/review/shared_early_pest_signs_mild/candidate_full_scene_01.png`
  - `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_02.png`

Global hard constraints in every prompt:
- Wide hero landscape (16:9 style)
- No text, no speech bubble, no logos
- No readable numbers/units/display values
- No mascot drift, no hedgehog drift, no belly icon/badge
- Buddy integrated in-scene (not sticker-like)
- Plant stress mild-to-moderate and recoverable

---

## 1) indoor_vpd_mismatch_veg
- Import filename: `indoor_vpd_mismatch_veg__candidate_02.png`
- Target review path: `assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_02.png`

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded accepted full-scene rootbound image as the main visual style reference for Grow Simulator quality.

Create one premium mobile game event hero image for: indoor_vpd_mismatch_veg.

Scene:
Indoor grow tent, vegetation stage cannabis plant in a pot. Show a clear climate mismatch (VPD-related) with mild-to-moderate stress: slightly tense or curled leaf edges, subtle droop/tension caused by climate imbalance, and an uncomfortable air feel. Keep the cause readable as climate mismatch, not nutrient toxicity, not severe burn, and not fan failure.

Environment cues:
Use abstract climate indicators only (air dryness/humidity feel, airflow imbalance feel) without any readable sensor text or values.

Buddy:
Buddy must be in-scene near the plant, focused and diagnostically concerned. Buddy should point/check the climate-related stress signs. Buddy must not look happy, smiling, playful, or celebratory.

Buddy identity lock:
Keep Buddy extremely close to the official references: same compact rounded body, same leaf crown structure, same eye shape and facial language family, same green palette, same soft arms/hands. No redesign, no mascot drift, no hedgehog-like bushiness, no belly icon.

Composition:
Wide hero landscape, mobile-readable, premium Grow Simulator look, warm but realistic indoor lighting. Keep symptom and Buddy both readable.

Negative constraints:
No text, no numbers, no units, no display labels, no speech bubbles, no logos, no destroyed plant, no apocalyptic damage, no unrelated characters.
```

---

## 2) indoor_fan_failure_airflow_drop
- Import filename: `indoor_fan_failure_airflow_drop__candidate_02.png`
- Target review path: `assets/events/v2/_generated/full-scene/review/indoor_fan_failure_airflow_drop/candidate_full_scene_02.png`

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded accepted full-scene rootbound image as the main visual style reference for Grow Simulator quality.

Create one premium mobile game event hero image for: indoor_fan_failure_airflow_drop.

Scene:
Indoor grow setup with a clearly failing airflow situation: one fan visibly stopped, jammed, dirty, or ineffective. The air should feel stagnant with slight humidity/heat buildup. Plant stress should be mild-to-moderate and recoverable, not catastrophic.

Cause clarity:
The core issue must read as airflow drop due to fan failure, not light distance, not pH, not overwatering.

Buddy:
Buddy is in-scene and calmly points toward the failed fan/airflow issue while observing the plant response. Buddy must feel integrated, not sticker-like.

Buddy identity lock:
Preserve official Buddy identity exactly: same body silhouette, same crown family, same eyes/facial language, same green palette. No belly symbol, no badges, no mascot redesign.

Composition:
Wide hero landscape, mobile readability first, premium grow-game look, clean visual hierarchy.

Negative constraints:
No readable display values, no readable numbers, no units, no labels, no speech bubbles, no logos, no overcrowded fan clutter, no apocalyptic plant damage.
```

---

## 3) shared_light_distance_error
- Import filename: `shared_light_distance_error__candidate_02.png`
- Target review path: `assets/events/v2/_generated/full-scene/review/shared_light_distance_error/candidate_full_scene_02.png`

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded accepted full-scene rootbound image as the main visual style reference for Grow Simulator quality.

Create one premium mobile game event hero image for: shared_light_distance_error.

Scene:
Grow scene where lamp distance/position is visibly wrong. The lamp is too close or poorly positioned relative to canopy top. Stress signs should be mild-to-moderate and early, not severe top burn.

Event distinction:
This must read as a light distance/positioning mistake, not a heavy canopy-burn event. Show causality via spatial relation between lamp and plant top.

Buddy:
Buddy stands in-scene and points between lamp and canopy to explain the distance error. Calm, focused coaching tone.

Buddy identity lock:
Keep Buddy tightly locked to official references: same silhouette, crown structure, eye language, palette. No mascot drift, no belly icon, no redesign.

Composition:
Wide hero landscape, mobile-first readability, premium Grow Simulator visual style.

Negative constraints:
No readable displays, no numbers, no units, no labels, no text, no speech bubbles, no logos, no severe burned/dead plant look.
```

---

## 4) outdoor_heatwave_dry_wind
- Import filename: `outdoor_heatwave_dry_wind__candidate_03.png`
- Target review path: `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_03.png`

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded accepted full-scene rootbound image as the main visual style reference for Grow Simulator quality.
Use existing heatwave candidates only as loose context references, but create a clearly improved new revision.

Create one premium mobile game event hero image for: outdoor_heatwave_dry_wind.

Scene:
Outdoor potted cannabis plant during a sunny heatwave with dry wind. Show clear but recoverable stress: slightly curled/tense leaves, dry air feel, subtle dust/wind cues, and visible weather pressure. Plant must not look dead.

Cause clarity:
Heat + dry wind must be clear. Do not use artificial outdoor fans or indoor-like equipment.

Buddy:
Buddy is in-scene at right or lower-right, calmly warning and pointing to weather impact on the plant. Buddy integrated naturally into the scene.

Buddy identity lock:
Keep Buddy closer to official references than previous heatwave outputs: same compact form, controlled crown, same eyes/facial language family, same palette, same soft limbs. No redesign, no mascot drift.

Composition:
Wide hero landscape, mobile-readable, premium Grow Simulator look, clear event signal.

Negative constraints:
No text, no speech bubble, no logos, no numbers/units/labels, no apocalypse, no dead plant, no unrelated props, no sticker look.
```
