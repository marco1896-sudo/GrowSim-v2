# Phase 47: Bundle Candidate Tests

## Bundle Candidate Tests

Command:

```bash
node dev/run-event-v2-browser-bridge-candidate-tests.js
```

Ergebnis:

- ok: true
- total: 18
- passed: 18
- failed: 0

Geprueft:

- Candidate API laedt.
- kein automatisches Global-Schreiben.
- Default No-Op Runner funktioniert.
- `enabled=true` ohne `allowSnapshot` blockt.
- `enabled=true + allowSnapshot=true` ohne Snapshot-Factory blockt.
- saubere Snapshot-Factory funktioniert.
- Guardrail-Verletzung blockt.
- Snapshot-Factory-Exception wird abgefangen.
- Registrierung ohne Freigabe blockt.
- Registrierung mit Freigabe setzt Global.
- Global enthaelt nur erlaubte sichtbare Felder.
- No-Op-Aufruf ueber registrierten Global funktioniert.
- kein Ueberschreiben ohne `allowOverwrite`.
- kontrolliertes Ueberschreiben mit `allowOverwrite`.
- Unregister entfernt nur eigenen Global.
- fremde Globals bleiben erhalten.
- Runtime-/Save-/UI-/Event-Flags bleiben false.
- fehlendes `targetWindow` wirft nicht.

## Vergleichs-Smoke

Command:

```bash
node dev/run-event-v2-browser-bridge-candidate-comparison-smoke.js
```

Ergebnis:

- ok: true
- safeToProceed: true
- Bundle: ok, registered, noopResultOk, unregistered
- Pair: ok, registered, noopResultOk, unregistered
- conclusion: `bundle_reduces_loading_dependency_complexity`
- runtimeTouched: false
- saveTouched: false
- uiReplaced: false
- eventActivated: false

## Bestehende Candidate Tests

### Browser Guarded Entry Candidate

```bash
node dev/run-event-v2-browser-guarded-entry-candidate-tests.js
```

- ok: true
- total: 12
- passed: 12
- failed: 0

### Browser Exposure Candidate

```bash
node dev/run-event-v2-browser-exposure-candidate-tests.js
```

- ok: true
- total: 12
- passed: 12
- failed: 0

### Pair Integration Smoke

```bash
node dev/run-event-v2-browser-candidate-integration-smoke.js
```

- ok: true
- safeToProceed: true
- registered: true
- noopResultOk: true
- unregistered: true

## Bridge Safety Checks

### Combined Report

```bash
node dev/run-event-v2-shadow-bridge-combined-report.js
```

- ok: true
- safeToProceed: true
- combinedStatus: pass
- blocker: 0
- error: 0
- warning: 0
- info: 4

### Guarded Entry Contract Tests

```bash
node dev/run-event-v2-guarded-entry-contract-tests.js
```

- ok: true
- contractTests total: 8
- passed: 8
- failed: 0
- readiness ok: true

## Syntaxcheck

Geprueft:

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidateTests.js`
- `dev/run-event-v2-browser-bridge-candidate-tests.js`
- `dev/run-event-v2-browser-bridge-candidate-comparison-smoke.js`

Ergebnis:

- ok

