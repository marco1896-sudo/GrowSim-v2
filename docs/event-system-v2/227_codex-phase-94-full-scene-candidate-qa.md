# Phase 94 Full-Scene Candidate QA

## QA Status
`qa_not_run_no_candidate`

## Reason
No candidate was generated because the reference-image input gate did not pass.

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
- Buddy does not interact with rootbound problem
- rootbound problem is unclear
- text artifacts appear
- UI hero composition is unusable

## Current Status
`shared_rootbound_warning`: `blocked_reference_image_input_not_active`
