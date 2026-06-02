# Phase 41: Browser Exposure Stub

## Ziel

Phase 41 bereitet nur einen isolierten Browser-Exposure-Stub vor. Es wird noch kein Script in `index.html` geladen, kein `app.js`-Hook gesetzt und keine Runtime angebunden.

Der Stub beschreibt und testet, wie spaeter bewusst `window.ShadowBridgeGuardedEntry` bereitgestellt werden koennte, bleibt aber standardmaessig disabled/no-op.

## Neue Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureStub.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureContractTests.js`
- `dev/run-event-v2-browser-exposure-contract-tests.js`

## Exposure-Verhalten

`ShadowBridgeBrowserExposureStub.js` stellt eine explizite Registrierungsfunktion bereit:

```js
registerShadowBridgeGuardedEntryGlobal(targetWindow, options)
```

Die Registrierung passiert nur, wenn alle Bedingungen erfuellt sind:

- `targetWindow` wird explizit uebergeben.
- `options.enabled === true`
- `options.allowGlobalRegistration === true`
- ein bestehender Global wird nicht ueberschrieben, ausser `allowOverwrite === true`.

Default ist immer:

- keine Registrierung
- no-op
- keine Runtime-Lesung
- keine Runtime-Schreibung
- kein Save
- keine UI
- keine Eventaktivierung

## Registrierter Global

Wenn spaeter explizit registriert wird, enthaelt `targetWindow.ShadowBridgeGuardedEntry` sichtbar nur:

- `runShadowBridgeGuardedEntry`
- `metadata`
- `noop`
- `legacyAuthoritative`

Ein interner Ownership-Marker wird nicht als sichtbares Feld exponiert. Er dient nur dazu, dass `unregisterShadowBridgeGuardedEntryGlobal(...)` ausschliesslich den eigenen Stub entfernen kann.

## Unregister / Rollback

Optional kann der Stub mit folgender Funktion wieder entfernt werden:

```js
unregisterShadowBridgeGuardedEntryGlobal(targetWindow)
```

Die Funktion entfernt nur einen Global, der eindeutig vom Phase-41-Stub registriert wurde. Fremde oder bereits vorhandene `ShadowBridgeGuardedEntry`-Objekte werden nicht geloescht.

## Warum nichts automatisch geladen wird

Phase 41 aendert keinen produktiven Ladepfad:

- kein Script-Tag in `index.html`
- kein `app.js`-Hook
- keine Service-Worker-/PWA-Cache-Aenderung
- keine Feature-Flag-Aenderung
- keine automatische Ausfuehrung beim App-Start

Damit bleibt der Stub ein vorbereiteter Contract und keine Runtime-Integration.

## Warum `index.html` nicht geaendert wurde

Phase 40 hatte empfohlen, zuerst die Exposure-Strategie isoliert zu haerten. Ein Script-Eintrag in `index.html` wuerde bereits einen produktiven Ladepfad beruehren und koennte PWA-/Cache-Fragen ausloesen. Das wurde bewusst vermieden.

## Warum `app.js` nicht geaendert wurde

Der spaetere Hook-Vorschlag setzt voraus, dass `window.ShadowBridgeGuardedEntry` kontrolliert bereitgestellt werden kann. Phase 41 klaert nur diese Bereitstellung. `app.js` bleibt unberuehrt, damit noch keine Runtime-Anbindung entsteht.

## Contract-Tests

Der neue Test-Runner prueft:

- fehlendes `targetWindow`
- disabled default
- fehlende explizite Global-Freigabe
- erfolgreiche Registrierung mit Mock-Window
- erlaubte sichtbare Global-Felder
- kein versehentliches Ueberschreiben
- kontrolliertes Ueberschreiben mit `allowOverwrite`
- sicheres Unregister des eigenen Globals
- kein Loeschen fremder Globals
- keine Runtime-/Save-/UI-/Event-Flags

Ergebnis:

- total: 10
- passed: 10
- failed: 0

## Risiken vor Phase 42

- Der Stub ist noch nicht im Browser-Ladepfad eingebunden.
- Ein spaeterer Script-Tag muss separat auf PWA-/Cache-Auswirkungen geprueft werden.
- Der Global darf erst registriert werden, wenn der Ladepfad bewusst freigegeben ist.
- `app.js` darf den Global weiterhin nur defensiv und optional lesen.

## Empfehlung fuer Phase 42

Empfohlen wird:

`Phase 42: Browser Exposure Manual Smoke + Loading Readiness Review`

Ziel sollte sein, den Stub manuell in einem Dev-Kontext zu testen und danach die kleinste sichere Script-Ladevariante zu reviewen. Weiterhin kein `app.js`-Hook, keine Eventaktivierung, kein Save und keine UI-Ersetzung.
