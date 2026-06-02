# Phase 54: Browser Visible Registration API Plan

## Ziel

Phase 54 plant, wie der bereits geladene Bundle Candidate spaeter eine Browser-sichtbare API bereitstellen darf.

Es wurde kein Patch am Candidate angewendet.

## Ursache des Phase-53-Blockers

Phase 53 blockte sicher mit:

```text
candidate_registration_api_not_exposed_in_browser
```

Ursache:

- `ShadowBridgeBrowserBridgeCandidate.js` kapselt seine API in einer IIFE.
- Am Ende wird die API nur gesetzt, wenn `moduleScope && moduleScope.exports` vorhanden ist.
- Im Browser-Script-Load gibt es kein CommonJS-`module.exports`.
- Deshalb wird keine Browser-sichtbare API wie `window.ShadowBridgeBrowserBridgeCandidate` gesetzt.
- Gleichzeitig bleibt `window.ShadowBridgeGuardedEntry` korrekt nicht gesetzt.

## Ist die Datei aktuell nur Node-/module.exports-kompatibel?

Fuer Test-/Node-Kontext: ja.

Der Candidate exportiert:

```js
moduleScope.exports = api;
```

Fuer Browser-Script-Load fehlt bisher ein kontrollierter API-Container auf `window`.

## Gewuenschter Browser-API-Contract

Spaeter sichtbar werden darf:

```js
window.ShadowBridgeBrowserBridgeCandidate
```

Erlaubte sichtbare Felder/Funktionen:

```js
{
  registerShadowBridgeBrowserBridgeCandidate,
  unregisterShadowBridgeBrowserBridgeCandidate,
  createShadowBridgeBrowserBridgeCandidate,
  getAllowedGlobalKeys,
  metadata,
  noop: true,
  legacyAuthoritative: true
}
```

## Weiterhin nicht sichtbar/aktiv beim Laden

Nicht automatisch sichtbar/aktiv werden darf:

```js
window.ShadowBridgeGuardedEntry
```

Ebenfalls nicht erlaubt:

- automatische Registrierung
- Runner-Start
- Live-State lesen
- Save schreiben
- UI oeffnen
- Event aktivieren
- Feature-Flags setzen
- fremde Globals ueberschreiben

## Spaetere explizite Registrierung

Eine Registrierung von `window.ShadowBridgeGuardedEntry` darf spaeter nur passieren durch:

```js
window.ShadowBridgeBrowserBridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(window, {
  enabled: true,
  allowGlobalRegistration: true
});
```

Default bleibt no-op.

## Sicherheitsregeln

Der API-Container darf:

- nur bei vorhandenem `window` gesetzt werden.
- keinen Fehler werfen, wenn `window` fehlt.
- keinen fremden `window.ShadowBridgeBrowserBridgeCandidate` ueberschreiben.
- nur erlaubte sichtbare Keys enthalten.
- `window.ShadowBridgeGuardedEntry` nicht setzen.
- Node-Exports beibehalten.

## Patch-Vorschlag fuer Phase 55

Nur dokumentiert, nicht angewendet.

Minimaler Patch am Ende von `ShadowBridgeBrowserBridgeCandidate.js` nach dem `api`-Objekt:

```js
  const browserApi = Object.freeze({
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

  if (typeof window !== 'undefined' && window && !window.ShadowBridgeBrowserBridgeCandidate) {
    window.ShadowBridgeBrowserBridgeCandidate = browserApi;
  }
```

Wichtig:

- Dieser Patch registriert nicht `window.ShadowBridgeGuardedEntry`.
- Er macht nur den API-Container sichtbar.
- Node `module.exports` bleibt erhalten.
- Keine automatische Ausfuehrung ausser Container-Exposure.

## Safety Gates vor Phase 55

Vor einem Patch muessen weiterhin gelten:

- Phase-53-Blocker ist verstanden und sicher.
- Candidate wird versioniert geladen.
- `window.ShadowBridgeGuardedEntry` bleibt absent vor Registrierung.
- Bundle Candidate Tests gruen.
- Combined Report gruen.
- Guarded Entry Contract Tests gruen.
- kein `app.js`-Hook.
- kein Save.
- keine UI.
- keine Eventaktivierung.

## Rollback

Rollback bei Phase-55-Patch:

1. Nur den Browser-API-Container-Exposure-Block entfernen.
2. Node `module.exports` unveraendert lassen.
3. Loading Safety Static Check erneut ausfuehren.
4. Bundle Candidate Tests erneut ausfuehren.
5. Phase-53-Smoke erneut ausfuehren.
6. Sicherstellen, dass `window.ShadowBridgeGuardedEntry` beim Laden absent bleibt.
