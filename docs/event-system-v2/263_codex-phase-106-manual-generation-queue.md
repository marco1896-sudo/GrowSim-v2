# Codex Phase 106 - Manual Generation Queue

## Queue Rule

Workflow stays locked to:

```text
reference_locked_full_scene_buddy_event_image
```

Codex does not run generation when true reference-image handoff is unavailable.  
Queue entries below are prepared for manual generation + import + QA.

## Priority Order

### Top 3 now

1. `indoor_vpd_mismatch_veg`
2. `indoor_light_burn_canopy_top`
3. `indoor_soil_ph_out_of_range`

### Next 5

1. `outdoor_pot_dries_by_afternoon`
2. `outdoor_early_pest_pressure_leaf_underside`
3. `shared_substrate_drainage_compaction`
4. `indoor_rootzone_airless_medium`
5. `indoor_fan_failure_airflow_drop`

### Later backlog

1. `shared_panic_watering_misread`
2. `indoor_overtraining_stall_mild`
3. `shared_observation_recovery_after_stress`

## Top-3 Generation Packages

### 1) indoor_vpd_mismatch_veg

- Event ID: `indoor_vpd_mismatch_veg`
- Target path: `assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_01.png`
- Required references:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
  - style reference: `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
  - optional: `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`
- Background reference available: none currently in `backgrounds/review`
- Buddy action: calm climate coach indicating leaf/body climate mismatch area
- Short image brief: indoor veg plant with visible mild VPD-stress cues (leaf posture tension, slight transpiration stress mood), readable grow-room climate context, no panic.
- QA focus: climate stress clarity without overdramatization, Buddy identity tightness, mobile hero readability.

Final generator prompt:

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded style reference image `shared_rootbound_warning/candidate_full_scene_02.png` as the visual quality and composition benchmark for Grow Simulator event heroes.

Create one premium mobile game event hero image for the event `indoor_vpd_mismatch_veg`.

Scene:
Indoor vegetative cannabis plant in a controlled grow room with a visible climate mismatch feeling (air too dry/wet for current temperature). Show mild-to-moderate VPD mismatch stress through believable leaf posture tension and subtle plant discomfort, but no severe damage or dying plant.

Buddy:
Buddy is directly part of the same scene on the right or lower-right, calmly coaching and pointing toward the plant/climate issue. Buddy should look integrated in the same light and perspective, never like a sticker.

Buddy identity:
Keep the exact official Grow Simulator Buddy identity from the references: same compact rounded body silhouette, same controlled leaf-crown structure, same eye style and facial language, same green palette, same soft arms/hands, same friendly coach personality. No redesign.

Composition:
Mobile-first hero readability, clear symptom visibility, premium warm-but-indoor look, no text, no speech bubble, no logo.

Negative:
No generic mascot, no changed Buddy shape, no changed eyes, no extra characters, no text artifacts, no speech bubble, no apocalyptic plant damage.
```

### 2) indoor_light_burn_canopy_top

- Event ID: `indoor_light_burn_canopy_top`
- Target path: `assets/events/v2/_generated/full-scene/review/indoor_light_burn_canopy_top/candidate_full_scene_01.png`
- Required references:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
  - style reference: `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
  - optional: `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`
- Background reference available: none currently in `backgrounds/review`
- Buddy action: Buddy points toward top-canopy stress zone under strong light
- Short image brief: indoor plant with upper-canopy light stress cues (top leaves slightly lifted/bleached/taco-like mild burn hints), clear lamp-distance context, no catastrophic damage.
- QA focus: canopy-top symptom readability, light-distance narrative clarity, Buddy identity lock.

Final generator prompt:

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded style reference image `shared_rootbound_warning/candidate_full_scene_02.png` as the visual benchmark.

Create one premium mobile game event hero image for `indoor_light_burn_canopy_top`.

Scene:
Indoor cannabis plant with the top canopy showing clear mild-to-moderate light-burn stress (upper leaves stressed from excessive light distance/intensity). Keep it believable and recoverable, not dead or extreme.

Buddy:
Buddy is directly inside the scene, right or lower-right, calmly indicating the canopy-top problem like a friendly coach. Buddy must be naturally integrated in lighting and depth.

Buddy identity:
Preserve exact official Buddy identity: same compact body silhouette, same controlled leaf crown, same eye/facial language, same green palette, same soft arms/hands, same coach personality. No redesign or generic variant.

Composition:
Mobile-first event hero, clear canopy symptom visibility, premium indoor grow look, no text, no speech bubble, no logo.

Negative:
No generic mascot, no changed Buddy form, no sticker look, no text artifacts, no speech bubble, no unrelated characters, no apocalyptic plant damage.
```

### 3) indoor_soil_ph_out_of_range

- Event ID: `indoor_soil_ph_out_of_range`
- Target path: `assets/events/v2/_generated/full-scene/review/indoor_soil_ph_out_of_range/candidate_full_scene_01.png`
- Required references:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
  - style reference: `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
  - optional: `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`
- Background reference available: none currently in `backgrounds/review`
- Buddy action: Buddy highlights rootzone/soil context and subtle deficiency-like warning
- Short image brief: indoor potted plant with plausible early pH-out-of-range symptoms (mild discoloration/uptake stress hints), readable soil/rootzone context, no dramatic collapse.
- QA focus: pH-related symptom plausibility, non-dramatic clarity, Buddy scene integration.

Final generator prompt:

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded style reference image `shared_rootbound_warning/candidate_full_scene_02.png` for quality and style consistency.

Create one premium mobile game event hero image for `indoor_soil_ph_out_of_range`.

Scene:
Indoor cannabis plant in a pot with believable early pH-out-of-range stress signs: subtle nutrient-uptake mismatch cues and mild leaf discoloration/tension, while the plant is still recoverable. Keep the soil/rootzone context visually readable.

Buddy:
Buddy is directly part of the scene, placed right/lower-right, calmly indicating the soil/rootzone-related issue like a friendly coach. Buddy must feel native to the same scene, not pasted.

Buddy identity:
Keep exact official Buddy identity from references: same compact rounded shape, same controlled leaf crown, same eyes and facial language, same green palette, same soft hands/arms, same coach personality. No redesign.

Composition:
Mobile-first readability, clear event signal, premium Grow Simulator look, no text, no speech bubble, no logo.

Negative:
No generic mascot, no changed Buddy anatomy, no sticker look, no text artifacts, no speech bubbles, no severe/apocalyptic plant damage, no unrelated characters.
```

