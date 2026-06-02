# Phase 64: No-Op Hook Diagnostics Plan

## Ziel

Phase 64 legt fest, ob und wie spaeter eine rein interne No-Op-Hook-Diagnose erlaubt sein koennte.

Diese Phase ist Planung.

Keine Diagnose wird implementiert.

## Neue Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeNoopHookDiagnosticsPlan.js`
- `src/events/v2/shadow-bridge/ShadowBridgeNoopHookDiagnosticsVariantReview.js`
- `src/events/v2/shadow-bridge/ShadowBridgeNoopHookDiagnosticsReadinessGate.js`
- `docs/event-system-v2/134_codex-phase-64-noop-hook-diagnostics-plan.md`
- `docs/event-system-v2/135_codex-phase-64-diagnostics-variant-review.md`
- `docs/event-system-v2/136_codex-phase-64-result.md`

## Geaenderte Dateien

Keine produktiven Runtime-Dateien.

Nicht geaendert:

- `app.js`
- `sw.js`
- `package.json`
- bestehende `src/events/*.js`

## Was eine spaetere Diagnose leisten darf

Erlaubt waere nur:

- pruefen, ob der Hook erreichbar ist
- pruefen, ob Candidate API sichtbar ist
- pruefen, ob explizite Registrierung funktioniert
- pruefen, ob No-Op-Call passiv bleibt
- pruefen, ob keine forbidden side effects entstehen

## Was eine spaetere Diagnose nicht leisten darf

Nicht erlaubt:

- echte Telemetrie senden
- Save schreiben
- UI anzeigen
- Event aktivieren
- Runtime-State lesen
- Runtime-State veraendern
- `state` oder `nowMs` an V2 geben
- echten Full Runtime Tick behaupten

## Empfohlene Strategie

Empfohlen:

```text
dev_only_noop_hook_diagnostics_report
```

Eigenschaften:

- nur unter `dev/`
- manuell ausfuehrbar
- keine produktive App-Aenderung
- kein Save
- keine UI
- keine Telemetrie
- keine Eventaktivierung
- klare Labels:
  - `hook_unit_harness_pass`
  - `runtime_path_not_triggered`
  - `full_runtime_tick_not_claimed`

## Warum keine Telemetrie

Die aktuelle Guardrail-Lage verbietet jede echte Telemetrie.

Selbst reine Diagnose-Events nach aussen wuerden die Grenze von der lokalen Verifikation zur Produkt-Messung verschieben.

## Warum kein Save

Persistente Diagnose wuerde Save-/Storage-Risiko einfuehren.

Die laufende No-Op-Strategie verlangt weiterhin:

- `saveTouched=false`
- keine dauerhaften Side-Effects

## Warum keine UI

Ein Diagnose-Panel oder UI-Ausgabe waere eine produktnahe sichtbare Veraenderung.

Phase 64 bleibt bewusst im internen Dev-Rahmen.
