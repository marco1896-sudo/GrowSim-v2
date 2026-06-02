# Phase 63: Isolated Hook Unit Harness

## Ziel

Phase 63 baut einen isolierten Hook Unit Harness, der den No-Op-Hook-Anteil beweisbar macht, ohne den echten Event-State-Machine-Pfad auszuloesen.

Der Harness ist kein Runtime-Tick-Test.

## Neue Datei

- `dev/run-event-v2-isolated-hook-unit-harness.js`

## Harness-Aufbau

Der Harness kombiniert zwei Teile:

1. Static Part
2. Browser API Part

Er reportet ausdruecklich:

```text
hook_unit_harness_pass
runtime_path_not_triggered
full_runtime_tick_not_claimed
```

## Static Part

Der Static Part prueft `app.js` und `index.html`.

Geprueft wird:

- genau eine Hook-Call-Zeile `runEventV2ShadowBridgeBrowserNoopPreflight();`
- genau ein Helper `runEventV2ShadowBridgeBrowserNoopPreflight`
- genau ein Bundle-Candidate-Script-Eintrag
- defensiver Lookup auf `window.ShadowBridgeBrowserBridgeCandidate`
- explizite Registrierung mit `enabled:true` und `allowGlobalRegistration:true`
- No-Op-Call mit `runShadowBridgeGuardedEntry(null, { enabled:false })`
- `try/catch`
- Legacy-Pfad weiterhin vorhanden

Verbotene Muster werden geprueft:

- kein `state` im Helper
- kein `nowMs` im Helper
- kein Snapshot
- kein Save/Storage
- keine UI/DOM-Aktion
- keine Eventaktivierung
- kein Console-Spam
- kein genutzter Return-Wert

## Browser API Part

Der Browser API Part:

- startet oder nutzt lokalen Dev-Server auf `http://127.0.0.1:5173/`
- laedt die App
- prueft Candidate API Sichtbarkeit
- bestaetigt initial absent `window.ShadowBridgeGuardedEntry`
- fuehrt explizite Registrierung ueber Candidate API aus
- fuehrt No-Op-Call aus
- prueft Negativfall mit `enabled:true`
- fuehrt Unregister aus
- prueft Reload danach

Nicht ausgefuehrt:

- kein direkter `window.runEventStateMachine(...)`-Trigger
- kein Browser-Monkeypatch der Legacy-State-Machine

## Warum der Harness ehrlich begrenzt ist

Der Harness beweist den Hook-Anteil und die Browser-API-Verkettung.

Er behauptet nicht:

- vollstaendiger Runtime-Tick getestet
- echte Event-State-Machine vollstaendig ausgefuehrt
- V2 laeuft bereits im echten Tick
- Live-State wurde getestet

## Ergebnis

Der Harness lief erfolgreich.

```text
ok=true
status=pass
hook_unit_harness_pass=true
runtime_path_not_triggered=true
full_runtime_tick_not_claimed=true
```
