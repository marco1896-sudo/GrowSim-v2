# Phase 86 Buddy Overlay Source Selection

## Outcome
`overlay_sources_selected`
`composite_not_ready_overlay_sources_selected`

## A) Buddy Reference Inventory
Source: `C:\Users\Marco\Desktop\Entwicklung\GrowSim-v2-main\assets\buddy referenz`

Available references:
- master:
  - `buddy_master_front_neutral_arms_down_v1.png`
  - `buddy_master_front_happy_open_arms_v1.png`
  - `buddy_master_side_neutral_profile_v1.png`
- emotions:
  - `buddy_emotion_confused_head_scratch_v1.png`
  - `buddy_emotion_surprised_raised_hands_v1.png`
  - `buddy_emotion_relaxed_smirk_head_tilt_v1.png`
  - `buddy_emotion_sad_downcast_v1.png`
  - `buddy_emotion_angry_fists_up_v1.png`
- poses:
  - `buddy_pose_happy_open_arms_v1.png`
  - `buddy_pose_playful_wink_peace_sign_v1.png`

Suitability notes:
- Identity quality is high and stable.
- Most sources are not production-transparent overlays yet.
- Side profile is useful for geometry checks, less ideal as direct event overlay.

## B) Selected Overlay Sources per Motif

### 1) `shared_rootbound_warning`
- background: `assets/events/v2/_generated/backgrounds/review/shared_rootbound_warning/candidate_bg_01.png`
- primary source: `master/buddy_master_front_neutral_arms_down_v1.png`
- alternative: `master/buddy_master_side_neutral_profile_v1.png`
- target pose: `buddy_root_check` / `buddy_pointing`
- planned position: lower-right
- planned scale: 24-30% frame width
- gaze direction: toward root rim/cutaway
- shadow/light: soft ground shadow + warm-right rim light compensation
- crop risk: low-medium on 360px if too far right
- composite risk: medium (requires clean cutout and arm/hand readability)
- status: `needs_overlay_asset`

### 2) `outdoor_heatwave_dry_wind`
- background: `assets/events/v2/_generated/backgrounds/review/outdoor_heatwave_dry_wind/candidate_bg_01.png`
- primary source: `emotions/buddy_emotion_surprised_raised_hands_v1.png`
- alternative: `master/buddy_master_front_happy_open_arms_v1.png`
- target pose: `buddy_warning`
- planned position: right-lower quadrant
- planned scale: 22-28% frame width
- gaze direction: toward canopy/heat-wind lines
- shadow/light: strong sun-left/high highlight alignment
- crop risk: medium (needs margin from right edge)
- composite risk: medium-high (lighting match is stricter outdoors)
- status: `needs_overlay_asset`

### 3) `shared_early_pest_signs_mild`
- background: `assets/events/v2/_generated/backgrounds/review/shared_early_pest_signs_mild/candidate_bg_01.png`
- primary source: `emotions/buddy_emotion_confused_head_scratch_v1.png`
- alternative: `master/buddy_master_front_neutral_arms_down_v1.png`
- target pose: `buddy_magnifier`
- planned position: lower-right
- planned scale: 20-26% frame width
- gaze direction: toward speckled leaf area
- shadow/light: subtle soft shadow; low contrast to preserve leaf signal
- crop risk: low
- composite risk: medium (magnifier prop currently missing as locked overlay asset)
- status: `needs_overlay_asset`

## C) Overlay Strategy Decision
Option 1 (direct cutout from reference): yes, quickest, but quality depends on cutout quality.
Option 2 (derive transparent overlay assets from references): yes, preferred for controlled trial.
Option 3 (new isolated generation on transparent background): conditional fallback only for missing props/poses.

Recommendation:
- immediate: Option 2
- fallback: Option 1
- limited fallback: Option 3 (only if reference-derived pose gap remains)
- forbidden: full-scene buddy generation

## Unsuitable/limited references
- `buddy_pose_playful_wink_peace_sign_v1.png` is stylistically playful and less suitable for warning/root-check diagnostics.
- `buddy_emotion_angry_fists_up_v1.png` too aggressive for current coaching tone.
