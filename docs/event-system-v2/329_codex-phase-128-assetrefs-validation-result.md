# Phase 128 - AssetRefs Validation Result

## Validator Runs
- `node --check dev/run-event-v2-assetref-validation.draft.js` passed.
- `node dev/run-event-v2-assetref-validation.draft.js --draft data/events/catalog/_planning/phase-122-safe-assetref-draft-normalized-v2.json --stdout-only` passed.
  - eventsChecked: 22
  - assetRefsChecked: 44
  - errors: 0
  - warnings: 0
  - infos: 0
  - activeAssetRefsFound: 22

## Optional Active/Catalog Attempt
- `--active --events data/events/catalog/events --stdout-only` does not behave as a strict active verifier in current script version and falls back to draft-style behavior using default input.
- Active-mode strict validation is recommended as a dedicated follow-up in Phase 129.

## Patch Integrity
- `phase-128-assetrefs-patch-report.json` confirms:
  - 22 patched
  - 0 conflicts
  - 0 skipped
  - 0 errors
