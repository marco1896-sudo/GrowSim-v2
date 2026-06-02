# Codex Phase 102 - Batch 2 QA Scorecard

## Score Model

Each category is scored from `0` to `2`.

Thresholds:

- `18-20`: `full_scene_accept`
- `14-17`: `full_scene_revise`
- `<14`: `full_scene_reject`

Phase-102 trial label:

- Candidates with strong scene quality but non-perfect Buddy identity can be marked `full_scene_accept_as_trial_candidate_with_buddy_consistency_watch`.

Hard reject triggers:

- Buddy reference consistency below `1/2`.
- Buddy looks generic or like a foreign character.
- Buddy looks sticker-like.
- Buddy does not interact with the event problem.
- Event problem is wrong or unclear.
- Text or speech bubble is present.
- UI hero composition is unusable.

## outdoor_heatwave_dry_wind

Candidate:

```text
assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_01.png
```

| Criterion | Score | Notes |
|---|---:|---|
| Buddy reference consistency | 1/2 | Recognizable as Buddy, but leaf-crown/body foliage is somewhat busier than the master identity. |
| Buddy situational action | 2/2 | Buddy points/warns toward the plant and weather stress. |
| Buddy scene integration | 2/2 | Buddy shares the lighting and scene depth; not a cheap sticker. |
| Eventproblem erkennbar | 2/2 | Heat, dry wind, and outdoor pot context are clear. |
| Botanische Plausibilitaet | 2/2 | Mild/moderate plant stress is plausible and not catastrophic. |
| Mobile Hero-Lesbarkeit | 2/2 | Clear large shapes, readable plant and Buddy placement. |
| Keine Ueberdramatisierung | 2/2 | No apocalypse, dying plant, or monster-weather exaggeration. |
| Keine Textartefakte | 2/2 | No text, logos, or speech bubbles visible. |
| Markenwirkung Grow Simulator | 2/2 | Warm premium event look aligned with the accepted style reference. |
| Gesamtwirkung/Premium | 2/2 | Strong trial-candidate quality. |

Total: `19/20`

Status:

```text
full_scene_accept_as_trial_candidate_with_buddy_consistency_watch
```

## shared_early_pest_signs_mild

Candidate:

```text
assets/events/v2/_generated/full-scene/review/shared_early_pest_signs_mild/candidate_full_scene_01.png
```

| Criterion | Score | Notes |
|---|---:|---|
| Buddy reference consistency | 1/2 | Buddy is recognizable, but the leafy crown/body treatment is more elaborate than the official master refs. |
| Buddy situational action | 2/2 | Buddy inspects the leaf with a magnifier and points toward the visible marks. |
| Buddy scene integration | 2/2 | Buddy appears lit and placed as part of the same scene. |
| Eventproblem erkennbar | 2/2 | Mild pest signs are visible and event-specific. |
| Botanische Plausibilitaet | 2/2 | Marks are mild and plausible; no heavy infestation. |
| Mobile Hero-Lesbarkeit | 2/2 | Strong close-up readability and clear focus. |
| Keine Ueberdramatisierung | 2/2 | No monster insects or panic scenario. |
| Keine Textartefakte | 2/2 | No text, logos, or speech bubbles visible. |
| Markenwirkung Grow Simulator | 2/2 | Warm, premium, coach-like Grow Simulator tone. |
| Gesamtwirkung/Premium | 2/2 | Strong trial-candidate quality. |

Total: `19/20`

Status:

```text
full_scene_accept_as_trial_candidate_with_buddy_consistency_watch
```

## Batch 2 Result

Both candidates pass as trial candidates and should not yet be promoted to final `hero.webp` assets.

The next QA concern is not scene quality, but tighter Buddy reference consistency for future finalization.

