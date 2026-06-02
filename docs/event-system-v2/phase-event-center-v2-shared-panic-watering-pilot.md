# Eventsystem V2 – Shared Panic Watering Pilot

## Ziel

`shared_panic_watering_misread` wird als zweites sichtbares V2-Pilot-Event kontrolliert aktiviert, ohne Statusmutation.

## Warum dieses Event

- Branch-Readiness war bereits als `ready` eingestuft.
- Presentation Mapping und Outcome Policy lagen bereits vorbereitet vor.
- Es eignet sich als sichere NoDelta-/Guardrail-Erweiterung neben `indoor_dry_rootball`.

## Aktivierte Optionen

- `check_weight_before_watering`
- `inspect_rootzone_then_wait`
- `water_on_panic_signal`

## Outcome-Verhalten

- `check_weight_before_watering`: `applied: false`, `reason: diagnostic_weight_check`
- `inspect_rootzone_then_wait`: `applied: false`, `reason: diagnostic_rootzone_check`
- `water_on_panic_signal`: `applied: false`, `reason: panic_reaction_guardrail`

Alle drei Optionen bleiben ohne echte Statusdeltas.

## Seed-Helfer

Dev-only wurde ein zweiter Seed ergänzt:

- `window.__seedEventV2PilotSharedPanicWateringMisread()`

Die bestehende Indoor-Seed-Funktion bleibt unverändert.

## Reload / Idempotenz

- Resolve bewegt `openEvents -> history`.
- `appliedDelta` wird dokumentiert.
- Reload erzeugt keine Duplikate und keine doppelte Anwendung.

## Nicht geändert

- Keine neue Statusmutation für dieses Event.
- Kein weiteres Event aktiviert.
- Kein V1-Delete.
- Kein Storage-/Runtime-Umbau außerhalb des Pilotpfads.
