# Phase 117 - AssetRef Validation Script Draft

Script:

`dev/run-event-v2-assetref-validation.draft.js`

Purpose:
- validate planned Event-V2 AssetRefs before activation
- validate active Event catalog shape read-only
- prevent forbidden product refs to `_trial_export`, `maual-import`, or `_manual_import`
- keep final AssetRef activation blocked until final files exist

Default command:

```bash
node dev/run-event-v2-assetref-validation.draft.js
```

Default report:

`data/events/catalog/_planning/phase-117-assetref-validation-report.json`

Current result:
- ok: true
- mode: draft
- events checked: 22
- AssetRefs checked: 22
- errors: 0
- warnings: 44
- infos: 44

