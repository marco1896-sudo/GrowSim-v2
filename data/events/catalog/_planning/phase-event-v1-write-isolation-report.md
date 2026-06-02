# Event V1 Write-Isolation Report

Generated: 2026-05-31T13:50:05.769Z

## Summary

- Total findings: 11
- Productive write findings (W1/W2/W3/W5): 8
- W1: 1
- W2: 2
- W3: 3
- W4: 2
- W5: 2
- W6: 1

## Findings

- `events-create-active-event` | W1 | events.js:2269 | risk=high | stage=R1.3 | blockability=later
  - Produktiver V1-Create setzt activeEvent State-Machine-Felder.
- `events-resolve-enter-resolving` | W2 | events.js:2963 | risk=high | stage=R1.4 | blockability=later
  - Produktiver V1-Resolve setzt resolving/pendingOutcome.
- `events-resolve-finalize` | W2 | events.js:1383 | risk=high | stage=R1.4 | blockability=later
  - Produktiver V1-Resolve finalisiert history/resolvedOutcome.
- `events-cooldown-write` | W3 | events.js:2797 | risk=high | stage=R1.4 | blockability=needs-adapter
  - V1 schreibt Cooldown- und Timer-Felder produktiv.
- `events-scheduler-projection` | W3 | events.js:2080 | risk=high | stage=R1.5 | blockability=needs-adapter
  - V1 synchronisiert eventCooldowns/eventCooldownsSim und Deadlines.
- `storage-legacy-migration` | W4 | storage.js:1507 | risk=high | stage=R1.5 | blockability=no
  - Save/Restore erzeugt und normalisiert V1-Felder fuer alte Saves.
- `storage-legacy-mirror-sync` | W4 | storage.js:2687 | risk=high | stage=R1.5 | blockability=later
  - Canonical->Legacy Spiegel fuer Kompatibilitaet im Save-Zyklus.
- `ui-fallback-resolve-write` | W5 | ui.js:3026 | risk=medium | stage=R1.4 | blockability=later
  - UI-Fallback schreibt V1-Resolving-State bei Legacy-Pfad.
- `sim-event-timer-write` | W3 | sim.js:2645 | risk=medium | stage=R1.4 | blockability=needs-adapter
  - Sim aktualisiert V1 Event-Timer/Cooldown bei Zeitbooster-Pfaden.
- `app-legacy-reset-write` | W5 | app.js:10916 | risk=medium | stage=R1.2 | blockability=yes
  - App-Resetpfade setzen V1 Event-Felder explizit zurueck.
- `tests-and-dev-v1-writes` | W6 | test/event-flow-integration.test.js:114 | risk=low | stage=R1.2 | blockability=no
  - Tests/Dev schreiben V1 absichtlich fuer Kompatibilitaetsabdeckung.

## Warnings

- none

## Recommendation

- deleteV1Now: false
- blockWritesNow: false
- nextPhase: R1.2 dev-only write observability and targeted gate contract draft

