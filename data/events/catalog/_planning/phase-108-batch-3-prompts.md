# Phase 108 - Batch 3 Prompts

Common required references:

- `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
- `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
- style reference: `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
- optional: `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`

Output files (manual import):

- `assets/events/v2/_manual_import/full-scene/indoor_vpd_mismatch_veg__candidate_01.png`
- `assets/events/v2/_manual_import/full-scene/indoor_light_burn_canopy_top__candidate_01.png`
- `assets/events/v2/_manual_import/full-scene/indoor_soil_ph_out_of_range__candidate_01.png`

## Prompt 1 - indoor_vpd_mismatch_veg

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded `shared_rootbound_warning/candidate_full_scene_02.png` as the visual style reference for Grow Simulator event hero quality.

Create one premium mobile game event hero image for `indoor_vpd_mismatch_veg`.

Scene:
Indoor vegetative cannabis plant in a grow room with visible mild-to-moderate climate mismatch stress (VPD mismatch). Show subtle but clear stress cues in leaf posture and plant tension, while the plant remains recoverable and not catastrophic.

Buddy:
Buddy is directly part of the scene, on the right or lower-right, coaching the player with a focused/concerned expression. Buddy must not appear cheerful, celebratory, or happy. Buddy should look attentive and diagnostic.

Critical constraints for this event:
No smiling happy pose.
No readable numbers, units, labels, or text on any display or monitor.
If climate/sensor elements appear, keep them abstract and unreadable.
Event-fit is more important than a flashy tech scene.

Buddy identity:
Keep exact official Grow Simulator Buddy identity: same compact rounded body silhouette, same controlled leaf-crown structure, same eyes/facial language family, same green palette, same soft arms/hands, same friendly coach role. No redesign, no generic mascot.

Composition:
Premium mobile-first event hero. Symptom readable at a glance. Buddy integrated in same lighting/perspective, not sticker-like. No text. No speech bubble. No logo.

Negative:
No happy/welcoming Buddy expression. No generic mascot. No changed eyes/crown/body shape. No sticker look. No text artifacts. No readable UI values. No dying plant. No unrelated characters.
```

## Prompt 2 - indoor_light_burn_canopy_top

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded `shared_rootbound_warning/candidate_full_scene_02.png` as the visual style reference for Grow Simulator event hero quality.

Create one premium mobile game event hero image for `indoor_light_burn_canopy_top`.

Scene:
Indoor cannabis plant with clear mild-to-moderate canopy-top light stress. Upper leaves should show believable light-burn tension (for example slight tacoing/lifting/edge stress), but the plant must remain recoverable and not destroyed.

Buddy:
Buddy is directly in the scene on the right or lower-right, pointing toward the canopy-top issue and coaching calmly. Buddy must be integrated into the same scene depth and lighting.

Buddy identity:
Keep exact official Grow Simulator Buddy identity: same compact rounded silhouette, same controlled leaf-crown, same eye style, same green palette, same soft arms/hands. No redesign, no generic mascot drift.

Composition:
Mobile-first hero readability, clear top-canopy symptom, premium indoor grow atmosphere, no text, no speech bubble, no logo.

Negative:
No different Buddy design. No changed eyes/crown/body shape. No sticker look. No text artifacts. No speech bubble. No apocalyptic burn damage. No unrelated characters.
```

## Prompt 3 - indoor_soil_ph_out_of_range

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded `shared_rootbound_warning/candidate_full_scene_02.png` as the visual style reference for Grow Simulator event hero quality.

Create one premium mobile game event hero image for `indoor_soil_ph_out_of_range`.

Scene:
Indoor cannabis plant in a pot with plausible early pH-out-of-range stress signs: subtle nutrient-uptake imbalance cues and mild leaf stress/discoloration, while the plant remains clearly recoverable. Keep soil/rootzone context visually understandable.

Buddy:
Buddy is directly part of the scene at right or lower-right, calmly indicating the rootzone/soil-related issue with a focused coaching expression. Buddy should feel naturally integrated, not pasted.

Buddy identity:
Preserve exact official Grow Simulator Buddy identity from references: same compact body silhouette, same controlled leaf-crown structure, same eyes/facial language family, same green palette, same soft arms/hands. No redesign.

Composition:
Premium mobile-first event hero, clear symptom readability, no text, no speech bubble, no logo.

Negative:
No generic mascot. No changed Buddy anatomy or face style. No sticker look. No text artifacts. No speech bubble. No severe/apocalyptic plant collapse. No unrelated characters.
```

