# Codex Phase 104 - Heat/Wind Revision QA Plan

## Scope

Candidate under review (when available):

```text
assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_02.png
```

## QA Scorecard (0-2 each)

1. Buddy reference consistency
2. Buddy situational action
3. Buddy scene integration
4. Eventproblem erkennbar
5. Botanische Plausibilitaet
6. Mobile Hero-Lesbarkeit
7. Keine Ueberdramatisierung
8. Keine Textartefakte
9. Markenwirkung Grow Simulator
10. Gesamtwirkung/Premium

Thresholds:

- `18-20`: `full_scene_accept`
- `14-17`: `full_scene_revise`
- `<14`: `full_scene_reject`

## Hard Reject

Reject immediately if any condition is true:

- Buddy reference consistency `< 1/2`
- Buddy appears generic or foreign
- Buddy appears sticker-like
- Buddy does not interact with heat/wind problem
- Heat/wind problem is wrong or unclear
- Text/speech bubble is present
- Mobile hero composition is unusable

## Revision Success Target

Target status after revision:

- preferred: `promotion_ready_candidate`
- acceptable fallback: `promotion_ready_candidate_with_buddy_consistency_watch`

## What Must Improve vs candidate_full_scene_01

- Buddy crown/body silhouette closer to master references
- Clearer mild-to-moderate heat/dry-wind stress signs on plant
- Strong dry atmosphere readability without apocalyptic visuals

## What Must Stay

- Buddy integrated in scene (not overlay/sticker-like)
- Warm premium Grow Simulator look
- No text and no speech bubble
- Mobile-first hero readability

