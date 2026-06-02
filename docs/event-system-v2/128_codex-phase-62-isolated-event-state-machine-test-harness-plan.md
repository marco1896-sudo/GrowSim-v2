# Phase 62: Isolated Event-State-Machine Test Harness Plan

## Ziel

Phase 62 plant einen isolierten Test-Harness, der den Hook-Anteil beweisbar testet, ohne den echten Event-State-Machine-Pfad im Browser direkt auszulösen.

Diese Phase ist Planung. Es gibt keine Runtime-Aenderung.

## Neue Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeIsolatedHookHarnessPlan.js`
- `src/events/v2/shadow-bridge/ShadowBridgeHookHarnessVariantReview.js`
- `src/events/v2/shadow-bridge/ShadowBridgeHookHarnessReadinessGate.js`
- `docs/event-system-v2/128_codex-phase-62-isolated-event-state-machine-test-harness-plan.md`
- `docs/event-system-v2/129_codex-phase-62-harness-variant-review.md`
- `docs/event-system-v2/130_codex-phase-62-result.md`

## Geaenderte Dateien

Keine produktiven Runtime-Dateien.

Nicht geaendert:

- `app.js`
- `sw.js`
- `package.json`
- bestehende `src/events/*.js`

## Warum Phase 61 korrekt blockiert hat

Phase 61 hat festgestellt:

```text
runEventStateMachineVisible=true
runEventStateMachineSourceMentionsState=true
```

Ein direkter Browser-Aufruf von `window.runEventStateMachine(...)` wuerde daher den Legacy-State-Machine-Pfad mit `state` beruehren.

Das ist fuer die aktuelle Guardrail-Lage nicht akzeptabel, weil weiterhin gilt:

- kein Live-State an V2
- keine Game-State-Mutation
- kein Save
- keine Eventaktivierung
- keine UI-Ersetzung
- keine improvisierte Monkeypatch-Loesung

Die korrekte Entscheidung war daher:

```text
blocked_trigger_not_safe
```

## Warum kein weiterer Direkttrigger erfolgen soll

Ein weiterer Browser-Direkttrigger wuerde dasselbe Risiko erneut erzeugen.

Ohne isolierte Testgrenze koennte ein direkter Aufruf nicht sauber unterscheiden zwischen:

- No-Op-Hook-Verhalten
- Legacy-State-Machine-Verhalten
- moeglicher State-Mutation
- moeglicher Eventaktivierung

Damit waere die Aussage des Tests unsauber.

## Warum kein Browser-Monkeypatch genutzt werden soll

Ein Monkeypatch von Legacy-Objekten im echten Browser-Flow wuerde die Legacy-Aussage verfaelschen.

Ein solcher Test wuerde nicht mehr beweisen, dass der echte Pfad stabil ist, sondern nur, dass ein veraenderter Pfad stabil wirkt.

## Was bewiesen werden muss

Der Harness soll beweisen:

- Der `app.js`-Hook ist exakt geformt.
- Der Hook ruft nur den No-Op-Preflight.
- Der No-Op-Preflight registriert explizit.
- Der No-Op-Call bleibt passiv.
- Der Return-Wert wird nicht fuer Spielsteuerung genutzt.
- Legacy waere nach dem Hook weiterhin erreichbar.
- Kein Live-State geht an V2.

## Empfohlene Harness-Strategie

Empfohlen:

```text
combined_static_and_browser_api_harness
```

Der Harness besteht aus drei Teilen.

### 1. Static Part

Prueft:

- `app.js` enthaelt exakt den erlaubten Hook.
- Es gibt genau eine Call-Zeile.
- Es gibt genau einen Helper.
- Kein `state` wird an V2 uebergeben.
- Kein `nowMs` wird an V2 uebergeben.
- Kein Snapshot wird erzeugt.
- Kein Save-/Storage-Aufruf existiert im Hook.
- Kein UI-/DOM-Aufruf existiert im Hook.
- Keine Eventaktivierung existiert im Hook.
- Legacy-Pfad bleibt erreichbar.

### 2. Browser Part

Prueft ohne `runEventStateMachine(...)` direkt aufzurufen:

- App laedt.
- Candidate API ist sichtbar.
- Explizite Registrierung funktioniert.
- `window.ShadowBridgeGuardedEntry` hat nur erlaubte sichtbare Keys.
- No-Op-Call mit `{ enabled:false }` bleibt passiv.
- Storage Writes bleiben 0.
- Keine UI-Ersetzung entsteht.
- Keine Eventaktivierung entsteht.
- Unregister funktioniert.

### 3. Report Part

Muss klar unterscheiden:

```text
hook_unit_harness_pass
runtime_path_not_triggered
full_runtime_tick_not_claimed
```

## Was der Harness beweisen darf

Der Harness darf beweisen:

- Der Hook-Anteil ist korrekt geformt.
- Die Browser-Bridge-API bleibt passiv.
- Registrierung + No-Op-Call sind sicher.
- Keine Storage-/UI-/Event-Nebenwirkung entsteht.
- Der direkte Runtime-Pfad wurde bewusst nicht ausgeloest.

## Was der Harness nicht beweisen darf

Der Harness darf nicht behaupten:

- vollstaendiger Runtime-Tick wurde getestet
- echte Event-State-Machine wurde sicher ausgefuehrt
- Legacy-State-Machine hat mit Live-State einen vollstaendigen Tick durchlaufen
- V2-Bridge ist live aktiviert

## Safety-Gates fuer Phase 63

Vor Phase 63 muessen gelten:

- Hook-aware Static Check pass
- Browser Bridge Candidate Tests pass
- Browser Global Registration Smoke pass
- Legacy Smoke pass
- Combined Report pass
- Guarded Entry Tests pass
- kein direkter `runEventStateMachine`-Trigger
- kein Browser-Monkeypatch
- kein Save
- keine UI
- keine Eventaktivierung
- kein Live-State an V2

## Rollback-Bewertung

Kein Runtime-Rollback noetig, weil Phase 62 keine Runtime-Dateien aendert.

Die Phase-59-Hook-Zeile bleibt weiterhin trivial rollbackfaehig:

1. Hook-Call-Zeile entfernen.
2. Helper entfernen.
3. Hook-aware Static Check ausfuehren.
4. Legacy Smoke ausfuehren.
