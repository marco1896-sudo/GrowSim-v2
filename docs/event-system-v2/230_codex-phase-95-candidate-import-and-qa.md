# Phase 95 Candidate Import and QA

## Candidate Import Status
`candidate_not_imported_waiting_for_manual_generation`

Expected review path:

`assets/events/v2/_generated/full-scene/review/shared_rootbound_warning/candidate_full_scene_01.png`

Current check:
No candidate exists at the expected path.

## Import Rules
If a candidate is manually generated:
- write exactly one file to the review path
- do not create final `hero.webp`
- do not create `hero@2x.webp`
- do not create `fallback.webp`
- do not update event JSON
- do not update assetRefs
- do not integrate into UI or runtime

## QA Scorecard
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
- Buddy does not interact with Rootbound problem
- Rootbound problem is unclear
- text artifacts appear
- UI hero composition is unusable

## QA Status
`qa_not_run_no_candidate`
