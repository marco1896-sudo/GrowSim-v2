# Phase 43: Browser Exposure Script Candidate

## Ziel

Phase 43 erstellt eine browser-kompatiblere Candidate-Datei fuer eine spaetere, bewusst geladene Browser-Exposure-Schicht. Es wird weiterhin kein produktiver Ladepfad geaendert.

## Neue Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidateTests.js`
- `dev/run-event-v2-browser-exposure-candidate-tests.js`

## Candidate-Verhalten

Die Candidate-Datei enthaelt keine `require`-Abhaengigkeit und keinen ESM-Import. Sie nutzt nur explizit uebergebene Dependencies.

Zentrale Funktionen:

```js
createShadowBridgeBrowserExposureCandidate(deps)
registerShadowBridgeBrowserExposureCandidate(targetWindow, deps, options)
unregisterShadowBridgeBrowserExposureCandidate(targetWindow)
```

Die Registrierung passiert nur, wenn:

- `targetWindow` explizit uebergeben wird.
- `deps.runShadowBridgeGuardedEntry` eine Funktion ist.
- `options.enabled === true`.
- `options.allowGlobalRegistration === true`.
- kein bestehender `ShadowBridgeGuardedEntry` vorhanden ist, ausser `allowOverwrite === true`.

## Keine automatische Registrierung

Beim Laden der Candidate-Datei wird nicht automatisch `window.ShadowBridgeGuardedEntry` gesetzt.

Der Candidate erzeugt nur dann den spaeteren Global, wenn `registerShadowBridgeBrowserExposureCandidate(...)` explizit aufgerufen wird.

## Sichtbarer Global

Wenn explizit registriert wird, enthaelt `targetWindow.ShadowBridgeGuardedEntry` sichtbar nur:

- `runShadowBridgeGuardedEntry`
- `metadata`
- `noop`
- `legacyAuthoritative`

Der Ownership-Marker bleibt intern und nicht enumerierbar.

## Warum browser-kompatibler als der Phase-41-Stub?

Der Phase-41-Stub konnte in Node direkt auf `require('./ShadowBridgeGuardedEntry.js')` zurueckfallen. Das ist fuer einen spaeteren Browser-Scriptpfad unguenstig.

Der Phase-43-Candidate:

- hat kein `require` im Candidate selbst.
- hat keinen ESM-Import.
- erwartet Dependencies explizit.
- blockt sauber, wenn Dependencies fehlen.
- registriert den Guarded Entry nicht automatisch.
- bleibt default-off/no-op.

## Dependency-Uebergabe

Spaeter muesste die Runtime-nahe Ladeschicht explizit uebergeben:

```js
{
  runShadowBridgeGuardedEntry,
  metadata
}
```

In Phase 43 wird diese Uebergabe nur in isolierten Tests simuliert.

## Tests

Der Candidate-Test prueft:

- Candidate API laedt.
- kein automatisches `ShadowBridgeGuardedEntry`-Global.
- fehlende Dependencies blocken/no-op.
- explizite Registrierung setzt den Global.
- erlaubte sichtbare Felder.
- No-Op-Aufruf ueber den registrierten Global.
- keine Runtime-/Save-/UI-/Event-Flags.
- kein Ueberschreiben ohne `allowOverwrite`.
- kontrolliertes Ueberschreiben mit `allowOverwrite`.
- Unregister entfernt nur eigene Globals.
- fehlendes `targetWindow` wirft nicht.
- fehlender Runner wirft nicht.

Ergebnis:

- total: 12
- passed: 12
- failed: 0

