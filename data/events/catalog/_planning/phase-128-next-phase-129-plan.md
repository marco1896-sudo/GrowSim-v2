# Phase 128 - Next Phase 129 Plan

## Recommended Phase 129
`Active AssetRef Validation Mode + No-Activation Catalog Integrity Sweep`

## Why
- AssetRefs are now patched into all 22 event files.
- We need strict active-file validation behavior before any activation discussion.

## Scope
1. Extend `dev/run-event-v2-assetref-validation.draft.js` with explicit active mode semantics:
   - validate `data/events/catalog/events/**/*.event.json`
   - require existing final hero/fallback targets
   - enforce forbidden-path rules on active fields
2. Produce active-mode validation report under `_planning`.
3. Run catalog integrity and shadow/noop checks again.

## Guardrails
- No changes to `assets.cover`.
- No runtime activation.
- No runtime/UI/save/locale changes.
