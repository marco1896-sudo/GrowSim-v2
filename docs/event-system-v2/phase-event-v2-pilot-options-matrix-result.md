# Eventsystem V2 – Pilot Options Matrix Ergebnis

## Executive Summary

Ein neuer Matrix-Smoke sichert beide Live-Pilot-Events gemeinsam ab und prueft alle sechs erlaubten Optionen gegen ihre erwarteten Outcome-Modi.

## Neue Dateien

- `dev/run-event-center-v2-pilot-options-matrix-smoke.js`
- `docs/event-system-v2/phase-event-v2-pilot-options-matrix.md`
- `docs/event-system-v2/phase-event-v2-pilot-options-matrix-result.md`

## Geaenderte Dateien

- Keine Runtime- oder Eventlogik-Aktivierung in dieser Phase.

## Matrix-Ergebnis

- 6/6 Faelle geprueft:
  - `apply_delta`: nur `indoor_dry_rootball/stabilize`
  - `no_delta`: `inspect`, `check_weight_before_watering`, `inspect_rootzone_then_wait`
  - `guardrail_only`: `overreact`, `water_on_panic_signal`
- Keine unerwartete Statusmutation.
- Reload idempotent.
- Kein V1-Parallelwrite.

## Testbefehle

Siehe Phase-Auftrag (Smoke + bestehende Regressionen).

## Testergebnisse

Werden im Ausfuehrungsprotokoll festgehalten.

## Restrisiken

- Matrix-Smoke ist regressionsstark, ersetzt aber nicht die bestehenden sichtbaren Browser-Smokes.
- Service-Worker-Dev-Logs bleiben als bekannter nicht-kritischer Befund bestehen.

## Naechste Mini-Phase

Ein kompakter Aktivierungs-Gate-Report, der fuer weitere Kandidaten-Events explizit zwischen `prepared`, `runtime-enabled` und `visible-in-event-center` trennt.
