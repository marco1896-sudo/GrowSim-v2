# Phase 115 - AssetRef Validation Rules

## Type Rules
1. `assetRefs.hero` must be a non-empty string.
2. `assetRefs.fallback` must be a non-empty string.
3. `assetRefs.sourceCandidate` must be a non-empty string.
4. `assetRefs.status` must be one of: `trial_asset_set_v1`.
5. `assetRefs.revisionStatus` must be one of: `ready`, `usable_with_watch`, `temporary_usable_needs_revision`.
6. `assetRefs.sourcePhase` must be `phase-112` for this rollout.
7. `assetRefs.notes` optional array of strings.
8. `assetRefs.hero2x` optional; if present it must be a non-empty string.

## Existence Rules (pre-activation)
1. Final `hero.webp` must exist before product event files may reference it.
2. Final `fallback.webp` must exist before product event files may reference it.
3. `sourceCandidate` must exist.
4. Product event files must not reference `_trial_export` paths.

## Forbidden References
- no refs to missing files
- no refs to `maual-import` sources
- no refs to unrecognized/unmapped files
- no refs for `reject` items
- no activation if final files are not present
