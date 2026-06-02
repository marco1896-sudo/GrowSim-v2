# Phase 89 Isolated Situational Buddy Pose Generation Trial

## Execution mode
`isolated_pose_candidates_generated`

## Scope lock
- exactly 3 target poses
- no scene, no plant, no event background
- no text, no speech bubble
- no composite
- no integration

## A) Reference & strategy analysis

### `buddy_root_check_pointing_down`
- primary reference: `master/buddy_master_front_neutral_arms_down_v1.png`
- alternative reference: `master/buddy_master_side_neutral_profile_v1.png`
- strategy: reference cutout + subtle orientation tilt for downward-check tone
- drift risk: low (identity), medium (gesture specificity)
- expected output: calm downward-attention coach pose

### `buddy_heat_wind_warning`
- primary reference: `emotions/buddy_emotion_surprised_raised_hands_v1.png`
- alternative reference: `master/buddy_master_front_happy_open_arms_v1.png`
- strategy: cutout adjustment, keep warning body language, reduce panic interpretation by context rules later
- drift risk: low-medium
- expected output: attentive warning posture

### `buddy_leaf_check_inspect`
- primary reference: `emotions/buddy_emotion_confused_head_scratch_v1.png`
- alternative reference: `master/buddy_master_front_neutral_arms_down_v1.png`
- strategy: inspection observer variant (no invented magnifier)
- drift risk: low (identity), medium (situational precision)
- expected output: focused inspection-ready pose

## B) Candidate outputs
- `assets/events/v2/_generated/buddy-poses/review/buddy_root_check_pointing_down/candidate_pose_01.png`
- `assets/events/v2/_generated/buddy-poses/review/buddy_heat_wind_warning/candidate_pose_01.png`
- `assets/events/v2/_generated/buddy-poses/review/buddy_leaf_check_inspect/candidate_pose_01.png`

Preparation method:
- official-reference chroma-key cutout
- transparent export
- no identity redesign

## C) Pose-specific requirements check
- root check: partial directional success (downward attention present, pointing clarity moderate)
- heat/wind warning: strong warning posture success
- leaf inspect: strong inspection expression success, no fake tool introduced
