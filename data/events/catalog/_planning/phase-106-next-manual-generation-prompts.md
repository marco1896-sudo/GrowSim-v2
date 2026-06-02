# Phase 106 - Next Manual Generation Prompts

## Binding Workflow

```text
reference_locked_full_scene_buddy_event_image
```

No Codex self-generation without true reference-image input support.

## Top-3 Prompt Queue

### 1) indoor_vpd_mismatch_veg

- output: `assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_01.png`
- references:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
  - `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
  - optional `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`

Prompt focus:

- indoor climate mismatch (VPD) stress, mild-to-moderate
- Buddy coach integrated in scene
- no text/speech bubble/logo

### 2) indoor_light_burn_canopy_top

- output: `assets/events/v2/_generated/full-scene/review/indoor_light_burn_canopy_top/candidate_full_scene_01.png`
- references:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
  - `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
  - optional `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`

Prompt focus:

- canopy-top light stress cue clarity
- Buddy points/explains canopy issue
- mobile hero readability

### 3) indoor_soil_ph_out_of_range

- output: `assets/events/v2/_generated/full-scene/review/indoor_soil_ph_out_of_range/candidate_full_scene_01.png`
- references:
  - `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
  - `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
  - `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
  - optional `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`

Prompt focus:

- subtle pH-related uptake stress, recoverable plant
- visible soil/rootzone context
- Buddy identity lock and in-scene integration

