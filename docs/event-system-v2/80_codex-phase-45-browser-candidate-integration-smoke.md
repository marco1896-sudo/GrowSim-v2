# Phase 45: Browser Candidate Integration Smoke

## Ziel

Der Integration-Smoke prueft, ob der neue Browser Guarded Entry Candidate als Dependency an den Browser Exposure Candidate uebergeben werden kann.

Es wird kein produktiver Script-Tag gesetzt und kein Browser-Global in der App registriert.

## Neue Smoke-Datei

- `dev/run-event-v2-browser-candidate-integration-smoke.js`

## Ablauf

1. Browser Guarded Entry Candidate erzeugen.
2. Candidate als Dependency an `ShadowBridgeBrowserExposureCandidate` uebergeben.
3. Mock-Window registrieren.
4. `ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false })` ueber den registrierten Global aufrufen.
5. No-Op-Ergebnis pruefen.
6. Unregister ausfuehren.
7. Schutzflags pruefen.

## Ergebnis

Command:

```bash
node dev/run-event-v2-browser-candidate-integration-smoke.js
```

Ergebnis:

- ok: true
- safeToProceed: true
- registered: true
- noopResultOk: true
- unregistered: true
- runtimeTouched: false
- saveTouched: false
- uiReplaced: false
- eventActivated: false
- errors: []

## Bewertung

Das Candidate-Paar funktioniert isoliert:

- Guarded Entry Candidate liefert den Runner.
- Exposure Candidate registriert den Runner kontrolliert.
- Default bleibt no-op.
- Keine Runtime, kein Save, keine UI und keine Eventaktivierung werden beruehrt.

