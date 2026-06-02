# Phase 121 -> Phase 122 Plan

Recommended next phase:

`Phase 122: Normalized Draft SourceCandidate Update + Readiness Re-Check`

## Goal
Keep planning files in sync after VPD format correction, without activating anything in product files.

## Scope
1. Create a new normalized planning draft variant where:
   - `indoor_vpd_mismatch_veg` `assetRefs.sourceCandidate` points to `candidate_full_scene_03.png`.
2. Re-run source-candidate existence and ratio checks using that updated planning draft.
3. Regenerate readiness counts in planning docs.
4. Keep Event files and active AssetRefs untouched.

## Why This Order
The format blocker is solved technically, but the normalized planning draft still points to `candidate_full_scene_01.png`. Updating the planning source pointer first keeps future export and validation phases deterministic.

## Still Forbidden
- no Event file changes
- no AssetRef activation
- no final asset writes
- no WebP conversion
- no dependency install
- no package changes
