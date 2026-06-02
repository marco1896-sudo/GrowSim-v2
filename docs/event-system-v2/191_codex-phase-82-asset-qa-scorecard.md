# Phase 82 Asset QA Scorecard

## Mandatory Buddy Reference Source
Use official references from:
`C:\Users\Marco\Desktop\Entwicklung\GrowSim-v2-main\assets\buddy referenz`

Primary identity anchors:
- `master/buddy_master_front_neutral_arms_down_v1.png`
- `master/buddy_master_front_happy_open_arms_v1.png`
- `master/buddy_master_side_neutral_profile_v1.png`

## Score Model (per motif)
0-2 points each:
1. Buddy consistency
2. Buddy reference consistency
3. Event problem recognizability
4. Botanical plausibility
5. Mobile readability
6. UI-hero composition
7. No wrong cause suggestion
8. No overdramatization
9. No text/speech-bubble errors
10. No rendering artifacts
11. Premium overall impact

Buddy reference consistency scoring:
- 2 points: clearly same Buddy as references, only pose/action changes
- 1 point: mostly same Buddy, minor acceptable drift
- 0 points: not brand-consistent with reference Buddy

## Thresholds
- 20-22: `accept`
- 15-19: `revise`
- <15: `reject`

## Hard Rejects
- Buddy looks wrong
- Buddy does not clearly match official reference Buddy
- Buddy has different eyes, head/leaf shape, or base palette
- wrong symptom for event
- text clutter/corruption
- not event-specific
- UI hero unusable
- symptom biologically implausible

## Phase 82 Trial Scorecard Run

### `shared_rootbound_warning`
- score: `18/22`
- buddy reference consistency: `0/2`
- status: `reject` (hard-reject Buddy identity drift)

### `outdoor_heatwave_dry_wind`
- score: `15/22`
- buddy reference consistency: `0/2`
- status: `reject` (hard-reject Buddy identity drift)

### `shared_early_pest_signs_mild`
- score: `17/22`
- buddy reference consistency: `0/2`
- status: `reject` (hard-reject Buddy identity drift)

## Scorecard Conclusion
- Trial executed: `3/3`
- Accepted motifs: `0/3`
- Requires strict Buddy-locked regeneration before any integration.
