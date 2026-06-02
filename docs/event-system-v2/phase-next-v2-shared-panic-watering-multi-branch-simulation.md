# Eventsystem V2 - Shared Panic Watering Multi-Branch Simulation (Dev-only)

## Ziel dieser Mini-Phase

Der bestehende Multi-Branch-Write-Simulationsstandard von `indoor_dry_rootball` wird kontrolliert auf ein zweites bestehendes V2-Event uebertragen:

- `shared_panic_watering_misread`

Die Phase bleibt strikt dev-only und no-write.

## Warum shared_panic_watering_misread gewaehlt wurde

Das Event wurde in der Branch-Readiness-Matrix bereits als `ready` eingestuft und hat drei klare, vorhandene Optionen mit sauberer Branch-Semantik.

## Bezug zur Branch-Readiness-Matrix

Die Matrix (`phase-next-v2-branch-readiness-matrix-report.json`) hat genau diese drei Option-IDs als geeignet markiert:

- `check_weight_before_watering` (recommended)
- `inspect_rootzone_then_wait` (neutral)
- `water_on_panic_signal` (negative)

Diese Phase nutzt exakt diese IDs ohne Katalog-Neuerfindung.

## Gepruefte Branches

- Branch A (`recommended`): `check_weight_before_watering`
- Branch B (`neutral`): `inspect_rootzone_then_wait`
- Branch C (`negative`): `water_on_panic_signal`

## Verwendete Option-IDs

Nur vorhandene Katalog-Optionen:

- `check_weight_before_watering`
- `inspect_rootzone_then_wait`
- `water_on_panic_signal`

## Erwartete Branch-Unterschiede

- Recommended: Risiko/Stress sinken staerker.
- Neutral: Risiko/Stress sinken leicht.
- Negative: Risiko/Stress steigen, Health kann sinken.

## Sicherheitsregeln

Auch mit Dev-Flag bleibt:

- kein produktiver Save-Write
- kein produktiver Storage-Zugriff
- keine Mutation am uebergebenen Input-State
- keine V1-Aenderung
- kein Cutover

## Was ausdruecklich nicht gemacht wird

- keine Aktivierung in `app.js`, `sim.js`, `storage.js`, `events.js`
- keine Migration
- keine UI-Integration
- keine produktive Telemetrie
- keine Katalog-Umbauphase

## Restrisiken

- Die Simulation zeigt kontrollierte Schreibbarkeit als Vorschau, nicht produktive Integrationsreife.
- Event-spezifische Folgeketten bleiben ausserhalb dieser Phase.
- Persistenzkonflikte mit produktiven Flows werden erst in einer spaeteren, explizit freigegebenen Write-Phase behandelt.

## Naechste sinnvolle Mini-Phase

Eine kleine dev-only In-Memory-Apply-Mutation-Simulation hinter separatem Dev-Flag, weiterhin ohne produktiven Storage, um Delta-Anwendung und Rollback-Logik enger zu pruefen.
