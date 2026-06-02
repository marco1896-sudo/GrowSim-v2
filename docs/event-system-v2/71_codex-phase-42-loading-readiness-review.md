# Phase 42: Loading Readiness Review

## Gelesene Dateien

- `docs/event-system-v2/68_codex-phase-41-browser-exposure-stub.md`
- `docs/event-system-v2/69_codex-phase-41-result.md`
- `docs/event-system-v2/66_codex-phase-40-script-loading-strategy.md`
- `docs/event-system-v2/67_codex-phase-40-result.md`
- `docs/event-system-v2/47_codex-phase-29-shadow-bridge-guardrails.md`
- `index.html` read-only
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureStub.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureContractTests.js`

## Aktuelle Lade-Struktur

`index.html` nutzt `loadVersionedScripts()`:

- lokale Scripts werden in `coreScriptList` sequenziell geladen.
- lokale Pfade erhalten `?v=<buildId>`.
- `app.js` wird aktuell am Ende der Core-Liste geladen.
- Fehler in Core-Scripts erzeugen einen Boot-Error-Banner.

Das bedeutet: Ein spaeterer Script-Eintrag waere eine echte produktive Ladepfad-Aenderung und muss separat freigegeben werden.

## Ist der Exposure Stub bereit fuer einen spaeteren Script-Tag?

Bewertung: `ready_with_conditions`

Bereit ist:

- explizite Registrierung ueber `registerShadowBridgeGuardedEntryGlobal(...)`
- default-off/no-op
- sichere sichtbare Global-Felder
- kein Ueberschreiben ohne `allowOverwrite`
- sicheres Unregister eigener Globals
- Contract Tests gruen
- Manual Smoke gruen

Noch offen ist:

- Browser-kompatible Ladeform fuer die spaetere App-Shell.
- Sichere Script-Reihenfolge.
- PWA-/Cache-Review vor `index.html`-Eintrag.
- Kein automatisches Setzen von `window.ShadowBridgeGuardedEntry` ohne explizite Freigabe.

## Welche Datei muesste spaeter geladen werden?

Der aktuelle Stub liegt hier:

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureStub.js`

Fuer einen spaeteren produktiven Script-Tag sollte aber nicht direkt der rohe Node-/UMD-Mischkontext improvisiert werden. Sicherer waere in Phase 43 eine dedizierte Candidate-Datei:

- browser-kompatibel
- ohne `require`-Abhaengigkeit im Browserpfad
- default-off/no-op
- kein automatisches Registrieren von `window.ShadowBridgeGuardedEntry`
- klarer Load-Order-Vertrag

## Muss die Datei browser-/UMD-kompatibel angepasst werden?

Ja, vor produktivem Laden sollte das explizit gehaertet werden.

Der aktuelle Stub ist fuer Node-Contract-Tests und isolierte Vorbereitung geeignet. Fuer Browser-Loading muss geklaert werden:

- ob `ShadowBridgeGuardedEntry.js` vorher als Script geladen wird,
- ob ein Candidate beide Teile kapselt,
- ob der Browserpfad ohne `require` sauber funktioniert,
- ob keine Exceptions entstehen, wenn Abhaengigkeiten fehlen.

## Braucht `index.html` spaeter einen Eintrag ueber `loadVersionedScripts()`?

Wenn der Stub wirklich in der App verfuegbar sein soll: ja, vermutlich als eigener Core-Script-Eintrag vor `app.js`.

Aber in Phase 42 gilt:

- kein `index.html`-Eintrag
- kein produktiver Ladepfad
- kein `app.js`-Hook

## PWA-/Cache-Risiken

Ein spaeterer Script-Tag haette folgende Risiken:

- `index.html` ist Shell-relevant.
- installierte PWAs koennen alte Shells halten.
- Scriptpfade muessen per `?v=<buildId>` versioniert werden.
- ein fehlender Scriptpfad wuerde den Boot-Error-Banner ausloesen.
- Reihenfolgefehler koennten den spaeteren `window.ShadowBridgeGuardedEntry`-Lookup leer lassen.

Eine Service-Worker-Aenderung ist fuer Phase 42 nicht noetig und bleibt verboten.

## Spaetere Reihenfolge

Falls spaeter ein Script geladen wird, waere die risikoaermste Reihenfolge:

1. Browser-kompatiblen Candidate vorbereiten.
2. Candidate isoliert testen.
3. Candidate nur bewusst vor `app.js` in `coreScriptList` planen.
4. Noch kein Hook aktivieren.
5. Combined Report und Exposure-Smoke erneut laufen lassen.
6. PWA/Shell-Reload manuell pruefen.

## Warum noch kein Script geladen wird

- Ein Script-Eintrag waere bereits produktive App-Shell-Aenderung.
- Der aktuelle Stub ist Contract-/Smoke-bereit, aber noch nicht finaler Browser-Candidate.
- PWA-/Cache-Auswirkungen sollen nicht nebenbei eingefuehrt werden.

## Warum noch kein `app.js`-Hook gesetzt wird

- Ohne bewusst geladenen Browser-Candidate waere der Hook nur ein optionaler leerer Lookup.
- `app.js` ist Runtime-/Tick-nah.
- Legacy muss authoritative bleiben.
- Kein State, kein Snapshot, kein Return-Wert darf in dieser Phase angebunden werden.

## Rollback bei spaeterem Script-Tag

Wenn spaeter ein Script-Tag gesetzt wird:

1. einzelne Script-Zeile aus `coreScriptList` entfernen.
2. Build/Shell aktualisieren.
3. Exposure-Smoke erneut ausfuehren.
4. Combined Report erneut ausfuehren.
5. PWA-Reload/Update manuell pruefen.

## Go/No-Go fuer Phase 43

Go:

- `Browser Exposure Script Candidate`
- noch kein `index.html`
- noch kein `app.js`
- noch kein Service Worker
- keine Runtime-Anbindung
- keine Eventaktivierung
- kein Save
- keine UI-Ersetzung

No-Go:

- produktiver Script-Eintrag
- Runtime-Hook
- Feature-Flag-Switching
- PWA-/Cache-Aenderung

## Empfehlung fuer Phase 43

Empfohlen:

`Phase 43: Browser Exposure Script Candidate`

Ziel: eine browser-kompatible Candidate-Datei vorbereiten, die spaeter bewusst geladen werden koennte. Weiterhin default-off/no-op und ohne produktiven Ladepfad.

