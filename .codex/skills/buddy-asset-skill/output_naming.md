# Buddy Output Naming

## Trial Outputs

Use review-only paths until QA accepts a candidate:

```text
assets/events/v2/_generated/full-scene/raw/{eventId}/candidate_01.png
assets/events/v2/_generated/full-scene/review/{eventId}/candidate_01.png
```

## Final Outputs

Do not create these until explicitly approved after QA:

```text
assets/events/v2/{eventId}/hero.webp
assets/events/v2/{eventId}/hero@2x.webp
assets/events/v2/{eventId}/fallback.webp
```

## Rules

- Never overwrite accepted candidates without a version bump.
- Never use final paths for experiments.
- Never change event JSON assetRefs during generation or review phases.
- Keep raw, review, and final paths separate.
