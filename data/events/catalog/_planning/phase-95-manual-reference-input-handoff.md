# Phase 95 Manual Reference Input Handoff

## Status
`manual_handoff_prepared`

## Required Images
Upload as active references:

1. `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
2. `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
3. `assets/events/v2/_generated/backgrounds/review/shared_rootbound_warning/candidate_bg_01.png`

Optional:
- `assets/buddy referenz/emotions/buddy_emotion_confused_head_scratch_v1.png`

## Direct Prompt
Use the uploaded Buddy reference images as strict character identity references. Keep the exact same Grow Simulator Buddy: same head/body silhouette, same leaf crown, same eyes and facial language, same green palette, same friendly coach personality. Do not turn Buddy into a generic plant mascot.

Create one mobile event hero image for `shared_rootbound_warning`.

Buddy is part of the scene, not a sticker. Buddy stands near the pot/rootzone on the right or lower-right, calmly looks at the root area, and points/checks the visible rootbound problem like a coach explaining it.

Show a cannabis plant in a pot with visible limited root space or a dense root area near the pot wall / pot boundary. This is a mild warning, not a dying plant.

Composition: mobile event hero, clear silhouette, safe margins, Buddy does not cover the root symptom, no text, no speech bubble, no logos.

Negative constraints: no changed Buddy design, no different head shape, no changed leaf crown, no changed eyes, no changed green palette, no generic mascot, no sticker look, no text artifacts, no apocalyptic plant.

## Output Rule
Generate exactly one candidate and place it only at:

`assets/events/v2/_generated/full-scene/review/shared_rootbound_warning/candidate_full_scene_01.png`
