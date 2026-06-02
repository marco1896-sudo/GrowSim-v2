# Phase 87 Situational Buddy Overlay Asset Preparation (3 motifs)

## Execution Mode
`reference_locked_situational_overlay_review`

## Updated Goal
Not generic reusable Buddy stickers.
Goal is `reference-locked situational Buddy overlay`:
- Buddy remains identity-locked to official references
- Buddy must also react to the specific event situation
- no forced overlay if situational fit is weak

## Trial Motifs
1. `shared_rootbound_warning`
2. `outdoor_heatwave_dry_wind`
3. `shared_early_pest_signs_mild`

## Reference Basis (official only)
- `master/buddy_master_front_neutral_arms_down_v1.png`
- `emotions/buddy_emotion_surprised_raised_hands_v1.png`
- `emotions/buddy_emotion_confused_head_scratch_v1.png`

## Situational Review per Motif

### `shared_rootbound_warning`
Desired: Buddy interacts with pot rim/root-space problem (pointing/downward inspection).
Current candidate from neutral source:
- identity: correct
- situational relevance: partial (observer tone but no explicit root-check gesture)
- status: `needs_situational_overlay_pose`

### `outdoor_heatwave_dry_wind`
Desired: Buddy reacts to climate stress (protective/warning body language, oriented to heat/wind direction).
Current candidate from surprised source:
- identity: correct
- situational relevance: medium (warning cue present, but still generic)
- status: `needs_situational_overlay_pose`

### `shared_early_pest_signs_mild`
Desired: Buddy investigates underside evidence (magnifier-like or clear inspection orientation).
Current candidate from confused source:
- identity: correct
- situational relevance: medium-low (inspection mood but no specific tool cue)
- status: `needs_situational_overlay_pose`

## Decision
Do not promote current overlays as event-ready situational overlays.
Result flag:
`needs_situational_buddy_pose_generation_plan`

## Guardrails
- no app/runtime/catalog integration
- no event/locale/assetRef edits
- no speech bubbles
- no full-scene buddy generation
