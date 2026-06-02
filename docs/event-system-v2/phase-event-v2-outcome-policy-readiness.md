# Eventsystem V2 – Outcome-Policy-Readiness für weitere Events

## Ziel der Phase
Die Outcome-Policy soll weitere Events vorbereitet aufnehmen koennen, ohne dass sie automatisch live im Runtime-/Event-Center-Pfad aktiv werden.

## Prepared vs Runtime-Enabled
- `prepared`:
  - Policy-Daten existieren und sind testbar.
- `runtime-enabled`:
  - Policy darf im aktiven Resolve-Pfad genutzt werden.

Diese Trennung verhindert unbeabsichtigte Live-Aktivierungen durch reine Datenvorbereitung.

## Aktive Events
- `indoor_dry_rootball`
  - prepared: `true`
  - runtime-enabled: `true`

## Vorbereitete, nicht aktive Events
- `shared_panic_watering_misread`
  - prepared: `true`
  - runtime-enabled: `false`

## Policy für shared_panic_watering_misread (vorbereitet)
- `check_weight_before_watering`
  - mode: `no_delta`
  - reason: `diagnostic_weight_check`
- `inspect_rootzone_then_wait`
  - mode: `no_delta`
  - reason: `diagnostic_rootzone_check`
- `water_on_panic_signal`
  - mode: `guardrail_only`
  - reason: `panic_reaction_guardrail`
  - `futureDeltasBlocked: true`

Alle drei Optionen bleiben ohne aktive Statusdeltas.

## Warum noch keine Aktivierung erfolgt
Die Runtime-Aktivierung bleibt absichtlich auf `indoor_dry_rootball` begrenzt, bis eigener Aktivierungsschritt und passende UI-/Resolve-Smokes für das zweite Event freigegeben sind.

## Was ausdrücklich nicht geändert wurde
- Kein zweites Event live im Event Center.
- Keine neuen Statusmutationen.
- Kein V1-Delete.
- Kein Runtime-/Storage-Cutover-Ausbau.
