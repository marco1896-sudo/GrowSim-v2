# Eventsystem V2 – Combined Visible Matrix Browser Smoke

## Ziel

Ein kombinierter sichtbarer Browser-Smoke prueft pro Live-Pilot-Event einen repraesentativen Branch im echten Event-Center-Flow.

## Warum nur 2 sichtbare Faelle

- Sichtbarer Browserpfad bleibt schlank und schnell.
- Vollstaendige 6er-Optionen-Matrix wird bereits separat durch den Node-Matrix-Smoke abgesichert.

## Verhaeltnis zur 6er Options-Matrix

- `dev/run-event-center-v2-pilot-options-matrix-smoke.js`: alle 6 Optionen, policy-/state-fokussiert.
- `dev/run-event-center-v2-combined-visible-matrix-smoke.js`: 2 repraesentative sichtbare End-to-End-Faelle.

## Gepruefte Events / Optionen

- `indoor_dry_rootball` + `stabilize` (`apply_delta`)
- `shared_panic_watering_misread` + `check_weight_before_watering` (`diagnostic_weight_check`)

## Sichtbare Copy-Erwartungen

- V2-DOM-Marker vorhanden:
  - `data-event-system="v2"`
  - `data-event-authority="v2"`
  - passendes `data-event-id`
- Keine Legacy-/Cooldown-/Debug-Copy:
  - kein `Autoritativ bleibt Legacy`
  - kein `Abklingzeit aktiv`
  - kein `eventV2PilotActive`
  - kein `Authority: V2 Pilot`

## Reload-/Idempotenz-Erwartung

- `openEvents -> history` genau einmal pro Fall.
- Nach Reload bleibt History stabil.
- Kein Double-Apply, keine doppelte History.

## Nicht geaendert

- Keine neue Eventaktivierung.
- Keine neue Option-Aktivierung.
- Keine neue Delta-Logik.
- Kein Runtime-/Storage-Umbau.
