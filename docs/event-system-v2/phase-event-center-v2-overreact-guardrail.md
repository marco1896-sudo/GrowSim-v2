# Eventsystem V2 – overreact als Guardrail-Outcome (`indoor_dry_rootball`)

## Ziel
`overreact` wird fuer das aktive Pilot-Event `indoor_dry_rootball` als vollstaendiger Resolve-/History-Pfad aktiviert, aber noch ohne reale Statusmutation.

## Warum overreact zunächst keinen negativen Delta bekommt
Die Phase fokussiert auf sicheren Runtime-/History-Fluss, nicht auf Balancing-Schaeden.  
Darum wird `overreact` jetzt als Lern-/Guardrail-Outcome dokumentiert, waehrend der Sim-Status unveraendert bleibt.

## Guardrail-Verhalten
- Event wird ueber V2 resolved.
- `openEvents -> history` funktioniert.
- `applyPreview` bleibt vorhanden.
- `appliedDelta` markiert:
  - `applied: false`
  - `reason: "guardrail_only"`
  - `deltas: []`
  - lernorientierter Warnhinweis

## Unterschied zu stabilize und inspect
- `stabilize`: aktiver Delta-Pfad (`status.stress -1`, `status.risk -1`)
- `inspect`: NoDelta-Diagnosepfad (`reason: "diagnostic_only"`)
- `overreact`: NoDelta-Guardrailpfad (`reason: "guardrail_only"`, Warnfeedback)

## History-/appliedDelta-Struktur
`overreact` produziert einen vollstaendigen History-Eintrag inklusive `applyPreview` und dokumentiertem `appliedDelta` als Guardrail.

## Idempotenz
- Reload erzeugt keine doppelte History.
- Kein Double-Apply, da keine Statusmutation angewendet wird.
- Zweiter Resolve ohne offenes Event wird geblockt.

## Was ausdrücklich nicht geändert wird
- Keine negative Statusstrafe fuer `overreact` in dieser Phase.
- Kein zweites Event aktiviert.
- Kein V1-Delete.
- Keine Runtime-/Storage-Neuarchitektur.
