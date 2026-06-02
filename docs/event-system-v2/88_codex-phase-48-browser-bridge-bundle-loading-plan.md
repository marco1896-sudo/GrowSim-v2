# Phase 48: Browser Bridge Bundle Loading Plan

## Ziel

Phase 48 plant den spaeteren `index.html`-Script-List-Patch fuer den einzelnen Browser Bridge Bundle Candidate. Es wird kein produktiver Script-Tag gesetzt.

## Neue Plan-Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeBundleScriptLoadingPlan.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBundleScriptRollbackPlan.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBundleLoadingReadinessGate.js`

## Read-only Analyse

Gelesen:

- `index.html`
- `sw.js`
- `manifest.webmanifest`
- `package.json`

`index.html` definiert `coreScriptList` ab Zeile 1778. `app.js` ist aktuell der letzte Core-Script-Eintrag.

Aktueller Zielbereich:

```js
      { src: 'src/monetization/googleAdPlacementRewardProvider.js' },
      { src: 'src/monetization/coinPackCatalog.js' },
      { src: 'src/monetization/purchaseServiceAdapter.js' },
      { src: 'app.js' }
```

## Spaeterer Bundle-Script-Pfad

Geplanter Pfad:

```js
{ src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js' }
```

Voraussichtliche Position:

- direkt vor `{ src: 'app.js' }`

Warum:

- `app.js` waere spaeter der einzige sinnvolle Ort fuer einen defensiven No-Op-Lookup.
- Der Bundle Candidate muesste vor `app.js` geladen sein, wenn dieser Lookup spaeter etwas sehen soll.
- Nach `app.js` waere zu spaet fuer einen App-Start-nahen No-Op-Hook.

## Warum noch nicht anwenden

Phase 48 ist nur ein Loading-Plan.

Nicht umgesetzt:

- kein `index.html`
- kein `app.js`
- kein `sw.js`
- kein produktiver Script-Tag
- keine Runtime-Anbindung
- keine Eventaktivierung
- kein Save
- keine UI-Ersetzung

## Loader-Verhalten

Der bestehende Loader haengt an lokale Scripts:

```text
?v=<buildId>
```

Der spaetere Script-Pfad wuerde also effektiv geladen als:

```text
src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js?v=<buildId>
```

## Readiness-Gate

Vor einem echten Script-Tag muessen gruen sein:

- Bundle Candidate Tests
- Comparison Smoke
- Combined Report
- Guarded Entry Contract Tests
- Syntaxcheck
- PWA-/Shell-Risiko akzeptiert
- Rollback dokumentiert

Ausserdem muss gelten:

- Candidate setzt beim Laden nicht automatisch `window.ShadowBridgeGuardedEntry`.
- keine Eventaktivierung
- kein Save
- keine UI
- kein Hook
- kein Live-State

## Phase-49 Empfehlung

Empfohlen:

`Phase 49: Browser Bridge Bundle Loading Readiness Review`

Noch kein `index.html`, aber alle Gates noch einmal final pruefen.

