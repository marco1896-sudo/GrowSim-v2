# Phase 117 - Validation Rules and Report

## Required Schema Rules
Future Event-V2 AssetRefs should follow this minimal schema:

```json
{
  "assetRefs": {
    "hero": "assets/events/v2/final/{eventId}/hero.webp",
    "fallback": "assets/events/v2/final/{eventId}/fallback.webp",
    "sourceCandidate": "assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_X.png",
    "status": "trial_asset_set_v1",
    "revisionStatus": "ready | usable_with_watch | temporary_usable_needs_revision",
    "sourcePhase": "phase-112",
    "notes": []
  }
}
```

`hero2x` remains optional.

## Type Rules
- `hero` must be a non-empty string.
- `fallback` must be a non-empty string.
- `sourceCandidate` must be a non-empty string.
- `status` must be `trial_asset_set_v1`.
- `revisionStatus` must be one of `ready`, `usable_with_watch`, `temporary_usable_needs_revision`.
- `sourcePhase` should be `phase-112` for this rollout.
- `notes` is optional, but must be an array when present.
- `hero2x` is optional, but must be a non-empty string when present.

## Path Rules
- Product `hero` and `fallback` should point to `assets/events/v2/final/`.
- Product AssetRefs must not point to `_trial_export`.
- Product AssetRefs must not point to `maual-import`.
- Product AssetRefs must not point to `_manual_import`.
- `sourceCandidate` should point to a generated review candidate.
- `sourceCandidate` must not point to import or trial-export folders.

## Existence Rules

### Draft Mode
- Final `hero.webp` may be missing.
- Final `fallback.webp` may be missing.
- Missing final files are reported as `planned_not_exported_yet`.
- `sourceCandidate` should exist and is warned if missing.

### Active Mode
- Final `hero.webp` must exist.
- Final `fallback.webp` must exist.
- `sourceCandidate` must exist.
- No active Event file may reference `_trial_export`, `maual-import`, or `_manual_import`.

## Reject Rule
No AssetRefs may be created for assets marked `reject`.

The current trial set contains no rejected assets.

## Current Report Interpretation
The Phase-117 report has 0 errors.

Warnings are expected because the Phase-113 draft predates the final schema proposal:
- 22 warnings for `legacy_trialCategory_used`
- 22 warnings for `missing_sourcePhase`

Infos are expected because final WebP files have not been exported yet:
- 22 planned missing `hero.webp`
- 22 planned missing `fallback.webp`

This means the draft is structurally usable, but should be normalized before real activation.

