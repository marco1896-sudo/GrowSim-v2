# Codex Phase 104 - Heat/Wind Revision Prompt

## Scope

Phase 104 targets exactly one motif:

```text
outdoor_heatwave_dry_wind
```

No other motifs are included.

## Baseline Analysis (candidate_full_scene_01)

Baseline candidate:

```text
assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_01.png
```

What works well:

- Buddy is directly inside the scene and visibly interacts with the stressed plant.
- Warm outdoor mood and event readability are strong.
- Mobile hero framing is usable.
- No speech bubble and no text artifacts.
- No obvious cheap sticker look.

What should be preserved:

- Buddy in-scene placement at right/lower-right.
- Warm outdoor sunlight and dry atmosphere direction.
- Calm coach warning action (not panic).
- Premium full-scene look.

What should be improved:

- Tighten Buddy identity lock toward official master references.
- Reduce crown/body foliage drift (less bushy, less free-form).
- Make heat/dry-wind stress more clearly visible on the plant.
- Keep stress in mild-to-moderate range, never catastrophic.
- Keep weather stress readable without apocalyptic visual language.

Do-not-introduce errors:

- No text, no speech bubble, no logos.
- No generic mascot drift.
- No sticker-like pasted look.
- No dying/burned beyond recovery plant.
- No monster-weather exaggeration.

## Required References for Manual Generation

Buddy identity references:

```text
assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png
assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png
```

Optional Buddy reference:

```text
assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png
```

Style reference (mandatory):

```text
assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png
```

Loose revision base (mandatory for improvement direction):

```text
assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_01.png
```

## Final Manual Generator Prompt

```text
Use the uploaded Buddy reference images as strict character identity references.
Use the uploaded `candidate_full_scene_02.png` rootbound image as the main visual style reference for Grow Simulator event image quality.
Use the existing `outdoor_heatwave_dry_wind` candidate as a loose composition reference, but improve Buddy identity and make the heat/dry-wind stress clearer.

Create one premium mobile game event hero image for the event `outdoor_heatwave_dry_wind`.

Scene:
An outdoor cannabis plant in a pot during warm sunlight and dry wind. The plant should show clear mild-to-moderate heat and dry wind stress: slightly curled or tense leaves, warm dry atmosphere, sunlit outdoor grow setting, subtle dryness around the plant. The plant must not look dead, burned beyond recovery, or apocalyptic.

Buddy:
Buddy is directly part of the scene, placed on the right or lower-right near the plant. Buddy looks toward the plant or toward the sun/wind direction and calmly warns the player like a friendly coach. Buddy should feel naturally integrated into the same scene, not pasted on as a sticker.

Buddy identity:
Keep Buddy closer to the official Grow Simulator Buddy references than the previous heat/wind candidate. Preserve the same rounded compact body silhouette, same controlled leaf crown structure, same large eyes and facial language, same green color palette, same simple soft arms and hands, and same friendly coach personality. Do not make Buddy bushier, spikier, more realistic, or generic. Do not redesign Buddy.

Composition:
Premium Grow Simulator event hero. Warm garden/grow lighting. Mobile-first readability. Clear heat/dry-wind problem. Buddy must not cover the plant stress signs. No text. No speech bubble. No logo.

Negative:
No generic plant mascot. No different Buddy design. No changed eyes. No changed leaf crown. No changed body shape. No sticker look. No text artifacts. No speech bubble. No dying plant. No apocalypse. No monster weather. No unrelated characters.
```

## Target Path (Revision Candidate)

If generated manually, store only at:

```text
assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_02.png
```

Do not overwrite:

```text
assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_01.png
```

