# Eventsystem V2 – Pilot Options Matrix

## Ziel

Ein gemeinsamer Regression-Smoke prueft alle aktuell erlaubten Optionen beider Live-Pilot-Events in einem Durchlauf.

## Gepruefte Events

- `indoor_dry_rootball`
- `shared_panic_watering_misread`

## Gepruefte Optionen

- `indoor_dry_rootball`
  - `stabilize`
  - `inspect`
  - `overreact`
- `shared_panic_watering_misread`
  - `check_weight_before_watering`
  - `inspect_rootzone_then_wait`
  - `water_on_panic_signal`

## Erwartete Outcome-Modi

- `stabilize` -> `apply_delta`
- `inspect` -> `no_delta`
- `overreact` -> `guardrail_only`
- `check_weight_before_watering` -> `no_delta`
- `inspect_rootzone_then_wait` -> `no_delta`
- `water_on_panic_signal` -> `guardrail_only`

## Statusmutationserwartung

- Nur `indoor_dry_rootball/stabilize` darf Statuswerte veraendern.
- Alle anderen Optionen bleiben NoDelta/Guardrail ohne Statusmutation.

## Reload-/Idempotenz-Erwartung

- `openEvents -> history` pro Fall genau einmal.
- Reload darf keine Doppel-History erzeugen.
- Resolve darf nicht doppelt anwenden.

## Ausdruecklich nicht geaendert

- Keine neuen Events aktiviert.
- Keine neuen Deltas aktiviert.
- Keine Runtime-/Storage-Neuarchitektur.
- Kein V1-Delete.
