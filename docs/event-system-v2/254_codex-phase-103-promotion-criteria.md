# Codex Phase 103 - Promotion Criteria

## Promotion Rule Set

A review candidate may be promoted later to final `hero.webp` assets only when all of the following are true:

1. QA score is at least `18/20`.
2. Buddy reference consistency is at least `1/2` and ideally `2/2`.
3. No text is present in the image.
4. No speech bubble is present in the image.
5. No sticker/overlay look is visible.
6. Event problem is clearly readable at a glance.
7. Mobile hero composition remains usable.
8. Visual style matches the accepted style reference direction.
9. No major botanical plausibility contradiction is visible.
10. Explicit user promotion approval is given before export/integration.

## Non-Promotion Cases

Use `needs_minor_revision_before_promotion` when image quality is high but one or two focused issues remain (for example Buddy identity tightening).

Use `trial_reference_only` when the image is useful for style/process guidance but not suitable for final game assets.

Use `reject` when hard-gate quality is not met.

## Final-Asset Export Plan (Documented Only)

No files are created in Phase 103. The following are future target paths only.

`shared_rootbound_warning`

```text
assets/events/v2/final/shared_rootbound_warning/hero.webp
assets/events/v2/final/shared_rootbound_warning/hero@2x.webp
assets/events/v2/final/shared_rootbound_warning/fallback.webp
```

`outdoor_heatwave_dry_wind`

```text
assets/events/v2/final/outdoor_heatwave_dry_wind/hero.webp
assets/events/v2/final/outdoor_heatwave_dry_wind/hero@2x.webp
assets/events/v2/final/outdoor_heatwave_dry_wind/fallback.webp
```

`shared_early_pest_signs_mild`

```text
assets/events/v2/final/shared_early_pest_signs_mild/hero.webp
assets/events/v2/final/shared_early_pest_signs_mild/hero@2x.webp
assets/events/v2/final/shared_early_pest_signs_mild/fallback.webp
```

## Binding Workflow Rule

For Event-V2 image work, Codex does not attempt own generation when true reference-image handoff is not available.

Codex workflow:

1. Determine next required event image.
2. Name exact `eventId`.
3. Name required target path.
4. Name required image references.
5. Provide final generator prompt.
6. Import/copy manually generated file.
7. Run QA against Buddy references, style reference, and event objective.
8. Assign `accept/revise/reject`.
9. Prepare AssetRef steps only after explicit user approval.

Target direction remains:

```text
reference_locked_full_scene_buddy_event_image
```

