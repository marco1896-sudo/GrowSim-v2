# Phase 57: Minimal app.js No-Op Hook Plan Refresh

## Ziel

Phase 57 aktualisiert den alten Phase-38/39-`app.js`-No-Op-Hook-Vorschlag gegen die neue Browser-API-Lage aus Phase 55/56.

Es wurde kein `app.js`-Patch umgesetzt.

## Alte Hook-Idee aus Phase 38/39

Der alte Vorschlag war:

```js
function runEventStateMachine(nowMs) {
  runEventV2ShadowBridgeNoopPreflight();
  const eventEngine = window.GrowSimEventEngine;
  if (eventEngine && typeof eventEngine.routeTick === 'function') {
    return eventEngine.routeTick(nowMs, state).result;
  }
  return callCanonicalEventsRuntime('runEventStateMachine', nowMs);
}
```

Der Helper haette direkt `window.ShadowBridgeGuardedEntry` gesucht und dann No-Op aufgerufen.

## Neue Browser-API-Lage

Seit Phase 55 gilt:

- `window.ShadowBridgeBrowserBridgeCandidate` ist im Browser sichtbar.
- `window.ShadowBridgeGuardedEntry` wird beim Script-Laden nicht automatisch gesetzt.
- Explizite Registrierung funktioniert.
- No-Op-Call funktioniert.
- Negativfall blockt korrekt.
- Unregister funktioniert.

Damit ist der alte direkte Lookup auf `window.ShadowBridgeGuardedEntry` nicht mehr die beste erste Hook-Idee. Der spaetere Hook muesste zuerst defensiv den API-Container pruefen.

## Read-only Analyse `runEventStateMachine(nowMs)`

Aktueller Bereich in `app.js`:

```js
function runEventStateMachine(nowMs) {
  const eventEngine = window.GrowSimEventEngine;
  if (eventEngine && typeof eventEngine.routeTick === 'function') {
    return eventEngine.routeTick(nowMs, state).result;
  }
  return callCanonicalEventsRuntime('runEventStateMachine', nowMs);
}
```

Bewertung:

- Die Stelle bleibt der schmalste erkennbare zentrale Event-Runtime-Punkt.
- Die Stelle ist weiterhin tick-nah und deshalb riskant.
- Ein spaeterer Hook darf nur am Funktionsanfang als No-Op-Preflight stehen.
- Legacy muss danach immer weiterlaufen.
- Der Return-Wert des Bridge-Calls darf nicht genutzt werden.

## Hat sich die Hook-Idee geaendert?

Ja.

Alt:

- direkt `window.ShadowBridgeGuardedEntry` suchen.

Neu:

- zuerst `window.ShadowBridgeBrowserBridgeCandidate` suchen.
- wenn API fehlt: sofort no-op return.
- optional explizit registrieren.
- danach nur No-Op callen.
- keine State-Daten uebergeben.

## Darf der Hook `window.ShadowBridgeBrowserBridgeCandidate` verwenden?

Spaeter theoretisch ja, wenn Phase 58 oder spaeter explizit freigibt.

Bedingung:

- defensiver Lookup.
- kein Fehler, wenn API fehlt.
- keine automatische Registrierung beim Script-Laden.
- keine Runtime-Daten an V2.

## Darf der Hook `window.ShadowBridgeGuardedEntry` erzeugen?

Nur falls Variante B spaeter explizit freigegeben wird.

Dann nur durch:

```js
window.ShadowBridgeBrowserBridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(window, {
  enabled: true,
  allowGlobalRegistration: true
});
```

Und nur, um danach einen No-Op-Call mit `{ enabled: false }` auszufuehren.

## Legacy Authority

Legacy bleibt authoritative, wenn:

- der Bridge-Return-Wert ignoriert wird.
- `state` nicht uebergeben wird.
- keine Exceptions aus dem Hook herauslaufen.
- `eventEngine.routeTick(nowMs, state)` unveraendert laeuft.
- `callCanonicalEventsRuntime(...)` unveraendert laeuft.

## Kein Live-State

Der spaetere Hook darf nicht uebergeben:

- `state`
- `nowMs`
- Runtime-Objekte
- DOM-Objekte
- Save-/Storage-Objekte
- EventEngine-Referenzen

Erlaubt im Vorschlag:

```js
null
```

## Empfohlenes Ergebnis

Phase 57 empfiehlt nur:

```text
variant_b_explicit_register_then_noop_call_for_phase_58_review
```

Keine Implementierung in Phase 57.
