# Phase 108 - Manual Import Workflow

## Standard Input Folder

```text
assets/events/v2/_manual_import/full-scene/
```

## Naming

```text
{eventId}__candidate_01.png
{eventId}__candidate_02.png
```

## Mapping

- `eventId__candidate_01.png` -> `assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_01.png`
- `eventId__candidate_02.png` -> `assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_02.png`

## Conflict Rules

- parse fail -> `unmatched_manual_import`
- unknown event -> `unknown_event_id`
- target exists -> `target_exists_needs_decision`
- never delete original files from `_manual_import`

## Quality Rule

Use only reference-locked full-scene Buddy workflow with style reference and official Buddy references.

