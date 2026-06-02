# Phase 120 - VPD Format Correction

## Event
`indoor_vpd_mismatch_veg`

## Format Blocker
The currently referenced local SourceCandidate is:

`assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_01.png`

Phase 120 mentioned `candidate_full_scene_02.png`, but that file is not present locally. The normalized Phase-118 AssetRef draft and Phase-119 report point to `candidate_full_scene_01.png`.

## Current Technical Status
- `candidate_full_scene_01.png` exists: yes
- dimensions: 1448x1086
- ratio: 1.3333
- Wide-Hero compatible: no
- status: `blocked_invalid_format`

## Candidate 03
Target:

`assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_03.png`

Current status:

`candidate_full_scene_03.png` does not exist yet.

## Correction Strategy
`manual_regeneration_required`

## Why Not Canvas Extend / Recrop
The existing 4:3 composition uses the full canvas:
- plant and pot occupy the left/lower area
- Buddy occupies the right side
- top grow-light and tent context carry part of the VPD/indoor climate cue
- bottom pot and Buddy feet support mobile readability

A 16:9 crop would likely remove useful vertical context. A simple horizontal padding/blur extension would create an artificial hero composition rather than a true full-scene event asset.

Because this is a source candidate for later final export, the safer option is a real manual wide-hero regeneration.

## Manual Regeneration Prompt

```text
Use the uploaded six official Buddy reference images as strict character identity references.
Use the accepted full-scene event images as visual style references, especially the rootbound warning image.

Create exactly one wide 16:9 full-scene event hero image for `indoor_vpd_mismatch_veg`.
Target a wide hero composition similar to 1792x1024. No portrait image, no square image, no panels, no collage, no split-screen.

Scene:
An indoor cannabis grow tent with a vegetative potted plant showing clear mild-to-moderate VPD/climate mismatch stress. The plant is recoverable but visibly uncomfortable: slightly tense or drooping leaves, subtle curled leaf edges, and climate-related stress cues. Show the VPD/climate context through warm dry air, humidity imbalance, soft mist or dry-air contrast, airflow/fan context, and abstract sensor equipment without readable values.

Buddy:
Buddy is directly integrated in the scene near the plant, looking concerned, focused and diagnostic, not happy. Buddy calmly points toward the plant and the climate area as if explaining a VPD mismatch. Buddy must match the official reference character closely: compact rounded green body, same large black-and-white eyes, same eyebrow style, same dense bud-like leafy crown with orange pistil accents and subtle purple details, same soft arms and feet. Only pose and expression may change.

Strict negative:
No happy Buddy. No generic mascot. No redesigned Buddy. No belly logo, no cannabis icon, no badge, no clothing. No readable text, numbers, units, labels, charts, sensor values or display UI anywhere. No severe plant damage. No nutrient-burn look. No drought-death look. No light-burn canopy scene. No sticker look.

Import/Save target for manual result:
assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_03.png
```

