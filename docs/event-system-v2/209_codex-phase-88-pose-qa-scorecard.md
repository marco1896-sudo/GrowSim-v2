# Phase 88 Pose QA Scorecard

## Score criteria (0-2 each)
1. Buddy reference consistency
2. Situational relevance
3. Pose clarity
4. Eye direction / attention target
5. Arm/hand gesture clarity
6. Overlay readiness (cutout-friendliness)
7. Mobile readability
8. No identity drift
9. No extra clutter
10. Reuse potential across similar events

## Thresholds
- 18-20: `pose_accept`
- 14-17: `pose_revise`
- <14: `pose_reject`

## Hard reject
- buddy identity < 2/2
- situational relevance = 0
- generic sticker-like pose
- critical body/crown cut
- face/eye distortion
- not overlay-ready

## Gate logic for next phase
- A pose can enter composite-trial only with:
  - Buddy reference consistency = 2/2
  - Situational relevance >= 2/2
  - No hard-reject trigger
