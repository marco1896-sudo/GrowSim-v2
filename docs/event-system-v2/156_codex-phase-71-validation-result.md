# 156 - Codex Phase 71 Validation Result

## Full Catalog Validation

`validateCatalogExamples({ sourceMode: 'fullCatalog' })`

- `ok: true`
- `filesChecked: 25`
- `events: 20`
- `learningCards: 5`
- `chains: 0`
- `unknown: 0`
- `blockers: 0`
- `errors: 0`
- `warnings: 0`
- `infos: 155`

## Health

- `score: 75.94`
- `penalty: 24.06`
- `coverageHints: ["No chain examples detected."]`

## Direct Matrix Summary

Direkter Full Adapter Matrix Re-Run:

- `eventsMapped: 20`
- `bridgePass: 20`
- `bridgeWarning: 0`
- `bridgeBlocked: 0`
- `warning: 0`
- `budgetWarnings: 0`

## Shadow / Hook Safety Stack

### Pass

- `node dev/run-event-v2-hook-safety-static-check.js`
- `node dev/run-event-v2-browser-bridge-candidate-tests.js`
- `node dev/run-event-v2-guarded-entry-contract-tests.js`
  - Contract-Tests selbst: `8/8 pass`

### Blocked but explained

- `node dev/run-event-v2-shadow-bridge-combined-report.js`
- `node dev/run-event-v2-noop-hook-diagnostics-report.js`
- `node dev/run-event-v2-shadow-runtime-boundary-report.js`

Block-Grund:

- kein Datenfehler im neuen Batch
- keine Warnings mehr in der 20er Adapter-Matrix
- die Dry-Run-Probe in `ShadowBridgeUiMappingProbe` bewertet weiterhin nur `eventCount === 12` als gruen
- nach Batch 1 sind jetzt `eventsMapped === 20` und `bridgePass === 20`
- deshalb bleibt `dry_run.ok=false`, obwohl `warning=0` und `budgetWarnings=0`

## Alter Pre-Hook-Check

`node dev/run-event-v2-loading-safety-static-check.js`

- erwartbar rot
- Grund: historischer Pre-Hook-Check erwartet weiterhin `noAppHook=true`
- nicht als Phase-71-Fehler gewertet
