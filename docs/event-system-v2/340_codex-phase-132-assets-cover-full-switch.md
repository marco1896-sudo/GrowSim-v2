# Phase 132 - assets.cover Full Switch

## Scope
- switched remaining 19 event files (excluding the 3 pilot events from Phase 131)
- updated only:
  - `assets.cover.src`
  - `assets.cover.fallback`

## Non-Scope Guarantees
- no `assetRefs` changes
- no runtime/app UI/save/locale file changes
- no event activation
- no final asset overwrite

## Outcome
All 22 event files now point `assets.cover` to final WebP targets.
