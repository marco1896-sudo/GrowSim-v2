# Phase 100 Batch 2 Candidate QA

## QA Status
`qa_not_run_no_candidates`

## Candidate Checks

### `outdoor_heatwave_dry_wind`
- candidate path: `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_01.png`
- candidate present: false
- QA score: not applicable
- status: `waiting_for_manual_generation`

### `shared_early_pest_signs_mild`
- candidate path: `assets/events/v2/_generated/full-scene/review/shared_early_pest_signs_mild/candidate_full_scene_01.png`
- candidate present: false
- QA score: not applicable
- status: `waiting_for_manual_generation`

## Prepared QA Scorecard
Score 0-2:
- Buddy reference consistency
- Buddy situational action
- Buddy scene integration
- Eventproblem erkennbar
- Botanische Plausibilitaet
- Mobile Hero-Lesbarkeit
- Keine Ueberdramatisierung
- Keine Textartefakte
- Markenwirkung Grow Simulator
- Gesamtwirkung/Premium

Thresholds:
- 18-20: `full_scene_accept`
- 14-17: `full_scene_revise`
- under 14: `full_scene_reject`

Hard-reject if:
- Buddy reference consistency < 2
- Buddy looks generic
- Buddy looks sticker-like
- Buddy does not interact with event problem
- event problem is wrong or unclear
- text or speech bubble exists
- UI hero composition is unusable
