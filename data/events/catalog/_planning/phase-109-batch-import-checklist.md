# Phase 109 - Batch Import Checklist

## Import Folder

```text
assets/events/v2/_manual_import/full-scene/
```

## Filename Rule

```text
{eventId}__candidate_01.png
{eventId}__candidate_02.png
```

## Intake Steps

1. List files in `_manual_import/full-scene/`.
2. Parse `{eventId}` and `candidate_XX` from filename.
3. Validate `eventId` exists in `data/events/catalog/events/`.
4. Map to review target path.
5. If target missing: copy file.
6. If target exists: do not overwrite automatically; flag `target_exists_needs_decision`.
7. If filename parse fails: flag `unmatched_manual_import`.
8. If unknown event id: flag `unknown_event_id`.
9. Keep original files in import folder.
10. Run QA and assign `accept/revise/reject`.

