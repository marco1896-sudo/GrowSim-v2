# Codex Phase 108 - Manual Import Asset Workflow

## Goal

Define one practical production flow for Event-V2 Full-Scene Buddy assets:

```text
reference_locked_full_scene_buddy_event_image
```

Codex does not self-generate images when true reference-image handoff is unavailable.

## Single Import Folder Standard

New standard input folder for manually generated images:

```text
assets/events/v2/_manual_import/full-scene/
```

All manually generated images are dropped there first.

## Filename Convention

Mandatory naming:

```text
{eventId}__candidate_01.png
```

Revision naming:

```text
{eventId}__candidate_02.png
```

Examples:

- `indoor_vpd_mismatch_veg__candidate_01.png`
- `indoor_light_burn_canopy_top__candidate_01.png`
- `indoor_soil_ph_out_of_range__candidate_01.png`
- `outdoor_heatwave_dry_wind__candidate_02.png`

## Import Mapping Rules

`eventId__candidate_01.png` maps to:

```text
assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_01.png
```

`eventId__candidate_02.png` maps to:

```text
assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_02.png
```

Original files in `_manual_import/full-scene/` must remain untouched (no delete/move).

## Import Safety Rules

If filename cannot be parsed:

- do not import
- label: `unmatched_manual_import`

If parsed `eventId` is not in catalog:

- do not import
- label: `unknown_event_id`

If target already exists:

- do not overwrite automatically
- label: `target_exists_needs_decision`

## Mandatory References for Full-Scene Production

- `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
- `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
- style reference:
  - `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
- optional:
  - `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`

## Quality Guardrails

- no text-only Buddy generation
- no generic overlays/stickers
- Buddy must be scene-integrated
- no speech bubbles
- no text artifacts
- no final `hero.webp` exports in this workflow stage
- no AssetRef changes without explicit approval

