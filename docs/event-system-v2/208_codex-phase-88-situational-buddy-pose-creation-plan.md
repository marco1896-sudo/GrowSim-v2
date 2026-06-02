# Phase 88 Situational Buddy Pose Creation Plan

## A) Why generic overlays fail
1. Reference consistency alone is necessary but not sufficient; Phase 87 proved identity can be 2/2 while situational relevance stays 1/2.
2. `situational relevance = 1/2` keeps Buddy in "usable sticker" territory, not event-specific coaching behavior.
3. Product goal is contextual coaching inside event scene, not static mascot placement.
4. Each event needs its own pose logic tied to the concrete symptom driver.
5. Required situational pose traits:
- clear gaze target
- clear arm/hand intent
- slight body lean toward problem
- safe distance to symptom anchor
- scene-reactive posture
- matching emotional tone (coach, not panic)
- explicit problem communication

## B) Situational pose specification by motif

### 1) `shared_rootbound_warning`
Pose ID: `buddy_root_check_pointing_down`
Target effect: explains/checks constrained root zone.
Pose spec:
- placement intent: lower-right or right-side
- body lean: slight forward/downward tilt
- gaze: down to pot rim/root ring
- gesture: one arm clearly indicating top rim/root boundary
- expression: calm explanatory concern
- avoid: neutral idle stance, panic expression, root occlusion
Required properties:
- reference-locked identity
- transparent background
- crown fully clear
- no bubble/text
- no invented tools unless reference-derived

### 2) `outdoor_heatwave_dry_wind`
Pose ID: `buddy_heat_wind_warning`
Target effect: coach warning for climate stress.
Pose spec:
- placement intent: front-right/right-side
- body orientation: slightly braced against wind direction
- gaze: toward canopy or sun/wind axis
- gesture: warning/protective hand cue
- expression: attentive concern, not panic
- avoid: extreme shock pose, canopy occlusion
Required properties:
- reference-locked identity
- transparent background
- no bubble/text
- no extra symbols unless separately planned

### 3) `shared_early_pest_signs_mild`
Pose ID: `buddy_leaf_check_inspect`
Target effect: careful early inspection.
Pose spec:
- placement intent: lower-right or side
- body lean: slight forward inspection lean
- gaze: toward underside/speckle cluster
- gesture: indicate/inspect cue; magnifier optional only if reference-clean
- expression: curious coach focus
- avoid: monster-pest panic, symptom occlusion
Required properties:
- reference-locked identity
- transparent background
- no bubble/text
- no fake props if not reference-derived

## C) Derivation strategy from official references

### `buddy_root_check_pointing_down`
Nearest references:
- `master/buddy_master_front_neutral_arms_down_v1.png`
- `master/buddy_master_side_neutral_profile_v1.png`
Assessment:
- direct use: limited
- likely needs arm-direction derivation for downward indication
Status: `needs_pose_derivation`
Risk: medium (gesture clarity risk, identity risk low if reference-locked)

### `buddy_heat_wind_warning`
Nearest references:
- `emotions/buddy_emotion_surprised_raised_hands_v1.png`
- `master/buddy_master_front_happy_open_arms_v1.png`
Assessment:
- direct use possible as warning baseline
- may need stance/orientation refinement to avoid generic panic
Status: `needs_cutout_adjustment`
Risk: low-medium

### `buddy_leaf_check_inspect`
Nearest references:
- `emotions/buddy_emotion_confused_head_scratch_v1.png`
- `master/buddy_master_front_neutral_arms_down_v1.png`
Assessment:
- direct use as observer is possible but not strong enough
- tool/magnifier not reliably present in references
Status: `needs_pose_derivation`
Risk: medium-high (situational clarity risk)

## D) Rules if new isolated pose generation is needed
- generate Buddy isolated only (no scene)
- transparent or easy-cutout background
- official references as hard identity anchors
- simple pose only
- no clothes
- no head/crown/eye redesign
- no text/speech bubbles
- no event scene content
- stable lighting/material style
- output is overlay candidate only

## F) Phase 89 recommendation decision
Current decision:
`Phase 89: Isolated Situational Buddy Pose Generation Trial`
Reason:
- 0/3 can be accepted as-is for situational behavior.
- 2/3 require derivation (`root_check_pointing_down`, `leaf_check_inspect`).
- 1/3 requires adjustment (`heat_wind_warning`).
