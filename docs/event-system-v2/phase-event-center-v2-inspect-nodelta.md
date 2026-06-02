# Eventsystem V2 – inspect als NoDelta-Resolve-Pfad (`indoor_dry_rootball`)

## Ziel
`inspect` soll fuer das bereits aktive Pilot-Event `indoor_dry_rootball` als echter Resolve-Pfad laufen, aber bewusst ohne Statusmutation.

## Warum inspect NoDelta ist
`inspect` ist eine Diagnose-/Pruefentscheidung.  
Sie soll den Eventfluss sauber abschliessen und in der History dokumentieren, ohne bereits einen direkten Sim-Status-Eingriff zu machen.

## Unterschied zu stabilize
- `stabilize`:
  - resolved ueber V2
  - schreibt History
  - wendet kontrollierten Delta auf `status` an (`stress/risk`)
- `inspect`:
  - resolved ueber V2
  - schreibt History
  - dokumentiert `appliedDelta.applied = false` mit `reason = "diagnostic_only"`
  - veraendert keine Statuswerte

## History-/appliedDelta-Struktur
Bei `inspect` bleibt `applyPreview` erhalten und `appliedDelta` wird als NoDelta-Entscheidung gespeichert:
- `applied: false`
- `reason: "diagnostic_only"`
- `deltas: []`

## Idempotenz
- Nach Reload bleibt die History stabil.
- Kein Double-Apply, da kein Delta auf `status` angewendet wird.
- Ein erneuter Resolve ohne offenes Event wird geblockt.

## Was ausdrücklich nicht geändert wird
- `overreact` bleibt preview-only/no productive delta.
- Kein zweites Event aktiviert.
- Keine Storage-/Runtime-Grundarchitektur geändert.
- Kein V1-Delete.
