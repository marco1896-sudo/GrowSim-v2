# Phase 115 - AssetRef Schema and Validation

## Proposed Schema (planning)
`assetRefs` is proposed as an optional top-level block per event, while `assets.cover` remains the active runtime field until activation.

## hero2x decision
- `hero2x` should be optional only for now.
- Reason: no current product schema requirement and no reliable WebP exporter available in this phase.

## Activation Gate
AssetRef activation must be blocked unless all validation and file-existence rules pass.
