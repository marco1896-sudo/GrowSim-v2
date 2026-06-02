# 59 - Codex Phase 37 Guarded Entry Contract Tests

## 1. Ziel
Phase 37 haertet den isolierten `ShadowBridgeGuardedEntry` mit reproduzierbaren Contract- und Negativtests.

Wichtig:
- Kein `app.js`-Hook.
- Keine Runtime-Anbindung.
- Keine Tick-Verkabelung.
- Keine UI.
- Kein Save.
- Keine Eventaktivierung.

## 2. Neue Testdateien
- `src/events/v2/shadow-bridge/ShadowBridgeGuardedEntryContractTests.js`
- `dev/run-event-v2-guarded-entry-contract-tests.js`

## 3. Erweiterte Datei
- `src/events/v2/shadow-bridge/ShadowBridgeGuardedEntry.js`

Erweiterung:
- Der Entry kann fuer Tests eine `snapshotFactory` erhalten.
- Der Entry kann fuer Tests Snapshot-`guardrails` an den Snapshot Builder weiterreichen.
- Default bleibt unveraendert disabled/no-op.

## 4. Testfaelle

### 1. Default no-op
Erwartung:
- keine Optionen.
- `ok=true`.
- `safeToProceed=true`.
- `noop=true`.
- `snapshot=null`.

Ergebnis:
- bestanden.

### 2. `enabled=true` ohne `allowSnapshot`
Erwartung:
- muss blocken.
- `abortReason=guarded_entry_snapshot_not_allowed`.

Ergebnis:
- bestanden.

### 3. `enabled=true` + `allowSnapshot=true` mit sauberem Input
Erwartung:
- Snapshot erlaubt.
- `ok=true`.
- `safeToProceed=true`.
- `mode=guarded_read_only_snapshot_noop`.

Ergebnis:
- bestanden.

### 4. Input mit verdaechtiger Funktion
Erwartung:
- Funktion wird nicht uebernommen.
- Ergebnis bleibt safe oder blockt sauber.

Ergebnis:
- bestanden.
- Sanitizer meldet `snapshot_function_omitted`.
- Entry bleibt safe.

### 5. Input mit DOM-/window-artigem Objekt
Erwartung:
- Objekt wird nicht uebernommen.
- Diagnostic/Block.

Ergebnis:
- bestanden.
- Entry blockt sauber mit `guarded_entry_snapshot_blocked`.

### 6. Guardrail-Verletzung
Erwartung:
- `runtimeTouched=true` muss blocken.
- `ok=false`.
- `safeToProceed=false`.

Ergebnis:
- bestanden.

### 7. Snapshot mit `blocker/error/warning`
Erwartung:
- muss blocken.

Ergebnis:
- bestanden.
- `warning=1` blockt ueber Snapshot Validator.

### 8. Exception-Simulation
Erwartung:
- Entry darf nicht werfen.
- `ok=false`.
- `abortReason=guarded_entry_exception`.

Ergebnis:
- bestanden.

## 5. Testlauf
Ausgefuehrt:

```bash
node dev/run-event-v2-guarded-entry-contract-tests.js
```

Ergebnis:
- `ok=true`
- `contractTests.total=8`
- `contractTests.passed=8`
- `contractTests.failed=0`

## 6. Zusaetzliche Checks
Ausgefuehrt:

```bash
node -c src/events/v2/shadow-bridge/ShadowBridgeGuardedEntry.js
node -c src/events/v2/shadow-bridge/ShadowBridgeGuardedEntryContractTests.js
node -c src/events/v2/shadow-bridge/ShadowBridgeHookReadinessChecklist.js
node -c dev/run-event-v2-guarded-entry-contract-tests.js
node dev/run-event-v2-shadow-bridge-combined-report.js
```

Combined Report:
- `ok=true`
- `safeToProceed=true`
- `combinedStatus=pass`
- `blocker=0`
- `error=0`
- `warning=0`

## 7. Runtime-Status
- Runtime unangetastet.
- Kein Hook.
- Kein Tick.
- Keine automatische Ausfuehrung.
- Keine UI-Ersetzung.
- Keine Eventaktivierung.
- Kein Save.
