# Phase 89 Pose QA Result

## Score model (0-2 each)
1. Buddy reference consistency
2. Situational relevance
3. Pose clarity
4. Eye direction / attention
5. Arm/hand gesture clarity
6. Overlay readiness
7. Mobile readability
8. No identity drift
9. No extra clutter
10. Reuse potential

Thresholds:
- 18-20: `pose_accept`
- 14-17: `pose_revise`
- <14: `pose_reject`

Hard-reject gates:
- Buddy reference consistency < 2
- Situational relevance = 0
- generic pose with no event link
- cropped critical body/crown
- eye/face distortion
- non-overlay-friendly output
- text/speech bubble

## Per-pose QA

### `buddy_root_check_pointing_down`
- score: `17/20`
- status: `pose_revise`
- buddy reference consistency: `2/2`
- situational relevance: `1/2`
- note: identity is correct, but downward pointing gesture is still not explicit enough.

### `buddy_heat_wind_warning`
- score: `19/20`
- status: `pose_accept`
- buddy reference consistency: `2/2`
- situational relevance: `2/2`
- note: strongest situational clarity among three.

### `buddy_leaf_check_inspect`
- score: `18/20`
- status: `pose_accept`
- buddy reference consistency: `2/2`
- situational relevance: `2/2`
- note: inspection intent works without inventing non-reference tools.
