# Eventsystem V2 – Resolve-/History-Copy-Polish

## Ziel der Phase

Der sichtbare Resolve-/History-Bereich im Event Center soll fuer aktive V2-Pilot-Events spielnah, deutsch und klar lesbar sein.

## Screenshot-Befund

Im Verlauf wurden zuvor technische Debugtexte angezeigt (z. B. `ApplyPreview`, `V2 Ereignis ausgewertet`, `V1: kein paralleler Write`), die fuer Entwickler hilfreich, fuer Spielerinnen und Spieler aber unpassend sind.

## Entfernte technische Spielertexte

- `V2 Ereignis ausgewertet`
- `ApplyPreview`
- `ApplyDelta`
- `V1: kein paralleler Write`
- `Pilot-Preview`
- `diagnostic_only`
- `guardrail_only`
- `selectedOption`

Diese Informationen bleiben intern in State/History erhalten, werden aber nicht mehr als normaler Spielertext gerendert.

## Neue spielnahe Resolve-Copy

Die Resolve-/History-Texte werden ueber eine wiederverwendbare Mapping-Struktur gepflegt.

### indoor_dry_rootball

- `stabilize` -> `Behutsam stabilisiert`
- `inspect` -> `Substrat geprueft`
- `overreact` -> `Riskante Reaktion erkannt`

### shared_panic_watering_misread

- `check_weight_before_watering` -> `Topfgewicht geprueft`
- `inspect_rootzone_then_wait` -> `Wurzelzone geprueft`
- `water_on_panic_signal` -> `Panikreaktion erkannt`

## Betroffene Events / Optionen

- `indoor_dry_rootball`: `stabilize`, `inspect`, `overreact`
- `shared_panic_watering_misread`: `check_weight_before_watering`, `inspect_rootzone_then_wait`, `water_on_panic_signal`

## Was ausdruecklich nicht geaendert wurde

- Keine neue Eventlogik
- Keine neuen Deltas
- Keine Outcome-Policy-Aenderung
- Kein Runtime-/Storage-Umbau
- Kein V1-Delete
