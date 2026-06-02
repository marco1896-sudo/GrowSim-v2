# Phase 45: Browser Guarded Entry Candidate

## Ziel

Phase 45 ergaenzt die fehlende browser-kompatible Quelle fuer `runShadowBridgeGuardedEntry`. Der Candidate ist weiterhin isoliert, default-off/no-op und wird nicht produktiv geladen.

## Neue Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserGuardedEntryCandidate.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserGuardedEntryCandidateTests.js`
- `dev/run-event-v2-browser-guarded-entry-candidate-tests.js`

## Warum diese Candidate-Datei noetig ist

Der Phase-43-Exposure-Candidate ist nur eine Registration-Layer-Datei. Er kann `window.ShadowBridgeGuardedEntry` spaeter kontrolliert setzen, braucht dafuer aber explizit:

- `runShadowBridgeGuardedEntry`
- optional `metadata`

Phase 45 liefert diesen Runner als browser-kompatiblen Candidate, ohne Runtime, DOM, Save oder UI zu beruehren.

## Warum `ShadowBridgeGuardedEntry.js` nicht direkt produktiv geladen wird

`ShadowBridgeGuardedEntry.js` ist fuer den isolierten Shadow-Bridge-Kontext und Node-/Harness-Nutzung entstanden. Fuer einen spaeteren Browser-Scriptpfad soll keine Node-/`require`-Annahme ungeprueft in die App-Shell gelangen.

Der neue Candidate:

- nutzt kein `require`
- nutzt keinen ESM-Import
- schreibt nicht automatisch auf `window`
- fuehrt nichts automatisch aus
- liest keinen Live-State
- bleibt default-off/no-op

## API

```js
createShadowBridgeBrowserGuardedEntryCandidate(deps)
```

Rueckgabe:

```js
{
  runShadowBridgeGuardedEntry,
  metadata,
  noop: true,
  legacyAuthoritative: true
}
```

## No-Op-Verhalten

Default:

- ok: true
- safeToProceed: true
- mode: `guarded_read_only_noop`
- snapshot: null
- noop: true
- legacyAuthoritative: true
- alle Schutzflags false

## Snapshot-Verhalten

`enabled=true` ohne `allowSnapshot=true` blockt mit:

- `guarded_entry_snapshot_not_allowed`

`enabled=true` + `allowSnapshot=true` ohne explizite Snapshot-Factory blockt mit:

- `browser_snapshot_dependency_missing`

Eine Snapshot-Factory wird nur genutzt, wenn sie explizit als Dependency uebergeben wurde.

## Guardrails

Der Candidate blockt, wenn:

- Schutzflags in Input/Options verletzt werden
- Snapshot-Factory fehlt
- Snapshot-Factory wirft
- Snapshot Guardrails verletzt
- Snapshot Diagnostics mit `blocker`, `error` oder `warning` auftreten

## Test-Ergebnis

Command:

```bash
node dev/run-event-v2-browser-guarded-entry-candidate-tests.js
```

Ergebnis:

- ok: true
- total: 12
- passed: 12
- failed: 0

