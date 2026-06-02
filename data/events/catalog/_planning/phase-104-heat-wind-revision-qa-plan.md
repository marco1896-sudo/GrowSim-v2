# Phase 104 - Heat/Wind Revision QA Plan

## Candidate

```text
assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_02.png
```

## QA Thresholds

- `18-20`: `full_scene_accept`
- `14-17`: `full_scene_revise`
- `<14`: `full_scene_reject`

## Hard Reject

- Buddy reference consistency `<1/2`
- Generic/foreign Buddy
- Sticker-like Buddy
- Unclear or wrong heat/wind symptom
- Text or speech bubble
- Unusable mobile hero composition

## Promotion Target

- preferred: `promotion_ready_candidate`
- fallback: `promotion_ready_candidate_with_buddy_consistency_watch`

