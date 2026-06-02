# Eventsystem V2 – Combined Visible Mobile Matrix Pass

## Ziel

Ein kombinierter sichtbarer Mobile-Matrix-Pass prueft beide Live-Pilot-Events auf den drei Kern-Viewports mit je einem repraesentativen Branch.

## Warum nur 2 sichtbare Faelle

- Mobile-E2E bleibt schnell und robust.
- Die vollstaendige 6er Outcome-Matrix wird bereits durch den separaten Matrix-Smoke abgesichert.

## Verhaeltnis zur 6er Outcome-Matrix

- `run-event-center-v2-pilot-options-matrix-smoke.js`: volle Logikabdeckung (6 Optionen).
- `run-event-center-v2-combined-visible-mobile-matrix-smoke.js`: sichtbare Mobile-End-to-End-Abdeckung (2 Repraesentativfaelle).

## Getestete Viewports

- `360x740`
- `390x844`
- `430x932`

## Gepruefte Events / Optionen

- `indoor_dry_rootball / stabilize` (`apply_delta`)
- `shared_panic_watering_misread / check_weight_before_watering` (`diagnostic_weight_check`)

## Layout-Erwartungen

- Kein horizontaler Overflow.
- Event Sheet bedienbar.
- Option-Buttons sichtbar und klickbar.
- Keine Legacy-Slots, keine Debug-Spielertexte.

## Reload-/Idempotenz-Erwartungen

- `openEvents -> history` genau einmal pro Fall.
- Nach Reload keine Doppel-History, kein Double-Apply.

## Ausdruecklich nicht geaendert

- Keine neue Eventaktivierung.
- Keine neue Delta-Aktivierung.
- Kein UI-Redesign.
- Kein Runtime-/Storage-Umbau.
