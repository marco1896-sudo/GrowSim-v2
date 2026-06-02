# Phase 55: Browser Visible Registration API Candidate Patch

## Ziel

Phase 55 setzt den minimalen Patch am Bundle Candidate, damit im Browser ein passiver API-Container sichtbar wird:

```js
window.ShadowBridgeBrowserBridgeCandidate
```

Weiterhin nicht automatisch gesetzt wird:

```js
window.ShadowBridgeGuardedEntry
```

## Geaenderte Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidateTests.js`

## Exakter Candidate-Patch

Ergaenzt wurde eine interne Funktion:

```js
function createBrowserApiContainer() {
  return Object.freeze({
    registerShadowBridgeBrowserBridgeCandidate,
    unregisterShadowBridgeBrowserBridgeCandidate,
    createShadowBridgeBrowserBridgeCandidate,
    getAllowedGlobalKeys,
    metadata: Object.freeze({
      kind: 'event_v2_shadow_bridge_browser_bridge_candidate_api',
      version: 'phase-55',
      defaultEnabled: false,
      noop: true,
      legacyAuthoritative: true
    }),
    noop: true,
    legacyAuthoritative: true
  });
}
```

Und am Ende der Datei:

```js
if (typeof window !== 'undefined' && window && !window.ShadowBridgeBrowserBridgeCandidate) {
  window.ShadowBridgeBrowserBridgeCandidate = createBrowserApiContainer();
}
```

## Warum nur der API-Container sichtbar gemacht wurde

Der Browser-Smoke aus Phase 53 blockte, weil der Candidate im Browser geladen wurde, aber nur ueber Node `module.exports` verfuegbar war.

Der Patch macht deshalb nur die Registration-API sichtbar. Er fuehrt keine Registrierung aus.

## Sichtbarer API-Container

Erlaubte sichtbare Keys:

- `registerShadowBridgeBrowserBridgeCandidate`
- `unregisterShadowBridgeBrowserBridgeCandidate`
- `createShadowBridgeBrowserBridgeCandidate`
- `getAllowedGlobalKeys`
- `metadata`
- `noop`
- `legacyAuthoritative`

## Weiterhin nicht automatisch gesetzt

Bestaetigt durch Browser-Smoke:

- `window.ShadowBridgeGuardedEntry` ist vor expliziter Registrierung false.

## Node-Kompatibilitaet

`module.exports` bleibt erhalten.

Die bestehenden Candidate-Tests wurden erweitert und laufen weiter gruen.

## Erweiterte Tests

Ergaenzt wurden Tests fuer:

- Browser-Kontext setzt `window.ShadowBridgeBrowserBridgeCandidate`.
- sichtbare Browser-API enthaelt nur erlaubte Keys.
- Browser-Kontext setzt nicht automatisch `window.ShadowBridgeGuardedEntry`.
- fremder vorhandener `window.ShadowBridgeBrowserBridgeCandidate` wird nicht ueberschrieben.

## Guardrails

Nicht geaendert:

- kein `app.js`
- kein `sw.js`
- kein `package.json`
- kein Runtime-Hook
- kein Live-State
- kein Save
- keine UI
- keine Eventaktivierung
- kein weiterer produktiver Script-Tag
