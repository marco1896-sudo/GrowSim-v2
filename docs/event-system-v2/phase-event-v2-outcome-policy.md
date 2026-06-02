# Eventsystem V2 – Outcome-Policy (`indoor_dry_rootball`)

## Ziel der Outcome-Policy
Die Wirklogik des ersten vollstaendigen V2-Pilot-Events wird zentralisiert, damit Delta-/NoDelta-/Guardrail-Entscheidungen nicht als verstreute Sonderfaelle in der Bridge wachsen.

## Warum die Policy eingeführt wird
- Ein Ort fuer Option-Wirkungen je Event.
- Klare Trennung zwischen Runtime-Flow und Wirkdefinition.
- Sicherer Ausbaupfad fuer spaetere Events, ohne bestehende Pilotstabilitaet zu riskieren.

## Aktuelle Option-Wirkungen (`indoor_dry_rootball`)
- `stabilize`
  - mode: `apply_delta`
  - reason: `stabilizing_action`
  - aktive Deltas:
    - `status.stress += -1`
    - `status.risk += -1`
- `inspect`
  - mode: `no_delta`
  - reason: `diagnostic_only`
  - keine aktiven Deltas
- `overreact`
  - mode: `guardrail_only`
  - reason: `guardrail_only`
  - keine aktiven Deltas
  - `futureDeltasBlocked: true`

## Welche Option mutieren darf
Nur `stabilize` darf in der aktuellen Phase echte Statuswerte mutieren.

## Welche Option NoDelta ist
`inspect` bleibt bewusst ein Diagnosepfad ohne Statusmutation.

## Welche Option Guardrail ist
`overreact` bleibt ein Lern-/Guardrailpfad ohne Statusmutation, mit warnendem Outcome-Kontext.

## Warum overreact noch keinen negativen Delta bekommt
Die aktuelle Phase priorisiert sichere Runtime-/History-Integritaet.  
Negatives Balancing fuer `overreact` wird erst in einer spaeteren, separaten Balancing-Phase betrachtet.

## Was ausdrücklich nicht geändert wurde
- Keine Aktivierung neuer Events.
- Keine Erweiterung auf weitere produktive Statusmutationen.
- Kein V1-Delete.
- Kein Runtime-/Storage-Umbau ausser der Policy-Anbindung.
