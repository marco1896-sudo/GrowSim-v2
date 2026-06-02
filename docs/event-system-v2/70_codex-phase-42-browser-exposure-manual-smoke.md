# Phase 42: Browser Exposure Manual Smoke

## Ziel

Phase 42 prueft den Phase-41-Browser-Exposure-Stub manuell in einem isolierten Mock-Window-Kontext. Es wird kein produktiver Ladepfad geaendert.

## Neue Smoke-Datei

- `dev/run-event-v2-browser-exposure-manual-smoke.js`

## Smoke-Ablauf

Der Smoke fuehrt folgende Schritte aus:

1. Mock-Window erzeugen.
2. `registerShadowBridgeGuardedEntryGlobal(...)` explizit mit `enabled: true` und `allowGlobalRegistration: true` aufrufen.
3. Pruefen, dass `ShadowBridgeGuardedEntry` gesetzt wurde.
4. Pruefen, dass der registrierte Global nur erlaubte sichtbare Felder enthaelt.
5. `runShadowBridgeGuardedEntry(null, { enabled: false })` ueber den Global aufrufen.
6. No-Op-Ergebnis pruefen.
7. `unregisterShadowBridgeGuardedEntryGlobal(...)` ausfuehren.
8. Pruefen, dass der eigene Global entfernt wurde.
9. Pruefen, dass fremde Globals nicht geloescht werden.
10. Sicherstellen, dass der Smoke nicht wirft.

## Erlaubte sichtbare Global-Felder

Der registrierte Global enthaelt sichtbar nur:

- `runShadowBridgeGuardedEntry`
- `metadata`
- `noop`
- `legacyAuthoritative`

Der Ownership-Marker bleibt intern und nicht enumerierbar.

## Smoke-Ergebnis

Command:

```bash
node dev/run-event-v2-browser-exposure-manual-smoke.js
```

Ergebnis:

- ok: true
- safeToProceed: true
- registered: true
- unregistered: true
- noopResultOk: true
- allowedFieldsOnly: true
- foreignGlobalPreserved: true
- runtimeTouched: false
- saveTouched: false
- uiReplaced: false
- eventActivated: false
- errors: []

Sichtbare Global-Felder:

- `runShadowBridgeGuardedEntry`
- `metadata`
- `noop`
- `legacyAuthoritative`

## Bewertung

Der Stub ist fuer isolierte Dev-/Mock-Smokes bereit. Er ist noch nicht produktiv geladen und erzeugt keine Runtime-Anbindung.

