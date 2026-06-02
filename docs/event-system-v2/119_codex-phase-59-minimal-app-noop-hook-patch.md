# Phase 59: Minimal app.js No-Op Hook Patch

## Ziel

Phase 59 setzt den ersten minimalen `app.js`-No-Op-Hook fuer die Event-V2 Shadow-Bridge.

Der Patch bleibt bewusst klein:

- eine Call-Zeile am Anfang von `runEventStateMachine(nowMs)`
- ein defensiver Helper direkt neben der Event-State-Machine
- kein Live-State
- kein `nowMs` an V2
- kein Snapshot
- kein Save
- keine UI
- keine Eventaktivierung
- kein Return-Wert fuer Spielsteuerung

## Vorbedingungen

Vor dem Patch wurden ausgefuehrt:

```bash
node dev/run-event-v2-loading-safety-static-check.js
node dev/run-event-v2-browser-bridge-candidate-tests.js
node dev/run-event-v2-browser-bridge-candidate-comparison-smoke.js
node dev/run-event-v2-shadow-bridge-combined-report.js
node dev/run-event-v2-guarded-entry-contract-tests.js
node dev/run-event-v2-browser-global-registration-smoke.js
```

Ergebnis vor Patch:

- Loading Safety Static Check: ok=true
- Browser Bridge Candidate Tests: 21/21 bestanden
- Browser Bridge Candidate Comparison Smoke: ok=true, safeToProceed=true
- Combined Report: ok=true, safeToProceed=true, combinedStatus=pass
- Guarded Entry Contract Tests: 8/8 bestanden, readiness ok=true
- Browser Global Registration Smoke: pass

## Diff-Grenze

`app.js` war bereits durch unrelated Care-Studio-Aenderungen dirty.

Die Phase-59-Zielstelle ist davon klar getrennt:

- Phase-59-Hook: nahe `runEventStateMachine(nowMs)`, Zeilenbereich um `6732`
- vorhandene unrelated Care-Studio-Aenderungen: Zeilenbereich um `13614`

Die Phase-59-Aenderung ist isolierbar.

## Exakter Patch

Am Anfang von `runEventStateMachine(nowMs)` wurde genau eine Call-Zeile ergaenzt:

```js
runEventV2ShadowBridgeBrowserNoopPreflight();
```

Direkt darunter wurde der Helper ergaenzt:

```js
function runEventV2ShadowBridgeBrowserNoopPreflight() {
  try {
    const api = window.ShadowBridgeBrowserBridgeCandidate;
    if (!api || typeof api.registerShadowBridgeBrowserBridgeCandidate !== 'function') {
      return;
    }

    api.registerShadowBridgeBrowserBridgeCandidate(window, {
      enabled: true,
      allowGlobalRegistration: true
    });

    const bridge = window.ShadowBridgeGuardedEntry;
    if (!bridge || typeof bridge.runShadowBridgeGuardedEntry !== 'function') {
      return;
    }

    bridge.runShadowBridgeGuardedEntry(null, { enabled: false });
  } catch (error) {
    return;
  }
}
```

## Warum dieser Patch sicher begrenzt ist

- Der Helper nutzt nur `window.ShadowBridgeBrowserBridgeCandidate` und `window.ShadowBridgeGuardedEntry`.
- Es wird kein `state` uebergeben.
- Es wird kein `nowMs` uebergeben.
- Es wird kein Snapshot erzeugt.
- Das No-Op-Ergebnis wird nicht gelesen und nicht fuer Spielsteuerung genutzt.
- Fehler werden abgefangen und nicht nach aussen geworfen.
- Der bestehende Legacy-Flow laeuft danach normal weiter.

## Keine weiteren Runtime-Aenderungen

Nicht geaendert:

- `sw.js`
- `package.json`
- bestehende `src/events/*.js`
- Save-/Persistence-Dateien
- Feature-Flags
- Legacy-Eventdaten
- UI-Dateien

## Rollback

Rollback ist trivial:

1. Die Call-Zeile `runEventV2ShadowBridgeBrowserNoopPreflight();` aus `runEventStateMachine(nowMs)` entfernen.
2. Den Helper `runEventV2ShadowBridgeBrowserNoopPreflight()` entfernen.
3. Safety-Checks erneut ausfuehren.

## Ergebnis

Der Patch wurde gesetzt.

```text
phase_59_minimal_app_js_noop_hook_patch_applied
```
