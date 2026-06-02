# Phase 44: Browser Exposure Candidate Loading Plan

## Ziel

Phase 44 plant nur den spaeteren Script-List-Eintrag fuer den Browser Exposure Candidate. Es wurde kein produktiver Ladepfad geaendert.

## Gelesene Dateien

- `docs/event-system-v2/73_codex-phase-43-browser-exposure-candidate.md`
- `docs/event-system-v2/74_codex-phase-43-loading-candidate-review.md`
- `docs/event-system-v2/75_codex-phase-43-result.md`
- `docs/event-system-v2/66_codex-phase-40-script-loading-strategy.md`
- `docs/event-system-v2/47_codex-phase-29-shadow-bridge-guardrails.md`
- `.codex/PWA_SERVICE_WORKER_RULES.md`
- `index.html` read-only
- `sw.js` read-only
- `manifest.webmanifest` read-only
- `package.json` read-only

## Script-List Analyse

`index.html` definiert `coreScriptList` ab Zeile 1778.

Aktuelle relevante Reihenfolge:

- bestehende Config-/Simulation-/Event-/UI-Scripts
- `src/monetization/purchaseServiceAdapter.js`
- `app.js`

`app.js` steht aktuell am Ende der Core-Script-Liste.

## Spaetere Candidate-Reihenfolge

Wenn ein Browser Exposure Script spaeter wirklich geladen wird, muesste es vor `app.js` geladen werden.

Grund:

- Der spaetere `app.js`-No-Op-Hook wuerde defensiv auf `window.ShadowBridgeGuardedEntry` pruefen.
- Ist das Exposure-Script erst nach `app.js` geladen, sieht der Hook beim Start nichts.
- Vor `app.js` bleibt der Lookup kompatibel mit dem Phase-38/39-Plan.

## Candidate allein reicht nicht

Der Phase-43-Candidate ist nur eine Registration-Layer-Datei. Er erwartet explizite Dependencies:

- `runShadowBridgeGuardedEntry`
- optional `metadata`

Damit reicht `ShadowBridgeBrowserExposureCandidate.js` allein noch nicht fuer einen produktiven Script-Tag.

Offen:

- Wer liefert im Browser `runShadowBridgeGuardedEntry`?
- Wird `ShadowBridgeGuardedEntry.js` browser-kompatibel gemacht?
- Oder wird ein separater `Browser Guarded Entry Candidate` erzeugt?

## Empfohlene Dependency-Entscheidung

Phase 45 sollte nicht `index.html` aendern.

Empfohlen:

`Browser Guarded Entry Candidate`

Ziel:

- browser-kompatible Guarded-Entry-Datei ohne `require`
- kein ESM-Import
- keine Runtime-Anbindung
- default-off/no-op
- explizit an den Browser Exposure Candidate uebergabefaehig

## Spaeter versionierte Pfade

Der bestehende Loader versieht lokale Pfade mit:

```text
?v=<buildId>
```

Ein spaeterer Candidate-Pfad wuerde also effektiv versioniert geladen:

```text
src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js?v=<buildId>
```

## No-Go in Phase 44

Nicht umgesetzt:

- kein `index.html`-Eintrag
- kein `app.js`-Hook
- kein `sw.js`
- keine Runtime-Anbindung
- keine Eventaktivierung
- kein Save
- keine UI-Ersetzung

