# Phase 50: First Browser Bridge Bundle Script Tag

## Ziel

Phase 50 setzt den ersten passiven Browser Bridge Bundle Script Tag in `index.html`.

Erlaubt war ausschliesslich:

- eine Script-Zeile in `coreScriptList`
- direkt vor `{ src: 'app.js' }`

## Exakte Aenderung

Geaendert:

- `index.html`

Patch:

```diff
       { src: 'src/monetization/googleAdPlacementRewardProvider.js' },
       { src: 'src/monetization/coinPackCatalog.js' },
       { src: 'src/monetization/purchaseServiceAdapter.js' },
+      { src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js' },
       { src: 'app.js' }
```

## Warum nur diese eine Zeile

Der Bundle Candidate ist passiv:

- kein automatisches Registrieren von `window.ShadowBridgeGuardedEntry`
- kein Hook
- kein Runtime-Zugriff
- kein Live-State
- kein Save
- keine UI
- keine Eventaktivierung

Damit ist der Script-Tag nur ein vorbereitender Ladepfad. Ohne spaeteren expliziten Hook entsteht keine Runtime-Wirkung.

## Warum direkt vor `app.js`

Falls spaeter ein defensiver No-Op-Hook in `app.js` freigegeben wird, muss der Candidate vorher geladen sein.

Nach `app.js` waere zu spaet fuer einen App-Start-nahen defensiven Lookup.

## Unveraendert geblieben

- `app.js`
- `sw.js`
- `package.json`
- bestehende `src/events/*.js`
- Save-/Persistence-Dateien
- UI-Dateien

Hinweis:

`app.js` hat weiterhin bereits vorhandene unrelated Working-Tree-Aenderungen. Phase 50 hat `app.js` nicht beruehrt.

## Rollback

Rollback ist eine einzelne Zeile:

```diff
-      { src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js' },
```

Danach:

1. Shell/Build aktualisieren.
2. Bundle Candidate Tests erneut ausfuehren.
3. Comparison Smoke erneut ausfuehren.
4. Combined Report erneut ausfuehren.
5. Guarded Entry Contract Tests erneut ausfuehren.
6. Browser-Load/Reload erneut pruefen.

