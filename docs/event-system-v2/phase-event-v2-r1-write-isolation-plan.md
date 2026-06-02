# Eventsystem V2 – R1 Write-Isolation Plan für V1-Rückbau

## Ziel der Phase

Diese Phase definiert einen kontrollierten Plan, um produktive V1-Writes schrittweise zu isolieren, ohne Legacy-Read, Alt-Saves oder Fallback-Stabilität zu gefährden.

Es werden in dieser Phase keine produktiven Writes hart blockiert und keine V1-Dateien gelöscht.

## Audit-Grundlage

- `docs/event-system-v2/phase-event-v2-v1-dependency-audit.md`
- `docs/event-system-v2/phase-event-v2-v1-dependency-audit-result.md`
- `data/events/catalog/_planning/phase-event-v1-dependency-audit.json`
- `data/events/catalog/_planning/phase-event-v1-dependency-audit.md`
- statischer Write-Isolation-Report:
  - `dev/run-event-v1-write-isolation-report.js`

## Antworten auf die Kernfragen

### 1) Wo schreibt V1 aktuell noch produktiv?

- `events.js`:
  - Event Create (`machineState = 'activeEvent'`, `activeEvent*`, `activeOptions`, `activeImagePath`)
  - Event Resolve (`machineState = 'resolving'`, `pendingOutcome`, `resolvedOutcome`, `history.push`)
  - Cooldown/Timer (`cooldownUntil*`, `eventCooldowns*`, `categoryCooldowns*`, `nextEventSimTimeMs`)
- `sim.js`:
  - Scheduler-/Cooldown-Timer-Anpassungen in Laufzeitpfaden (z. B. Boost)
- `ui.js`:
  - Legacy-Fallback-Resolve schreibt `state.events` (resolving/pendingOutcome)
- `app.js`:
  - einzelne Fallback-/Reset-Schreibpfade auf `state.events`

### 2) Welche V1-Writes sind kritisch für alte Saves?

- `storage.js`:
  - `migrateLegacyStateIntoCanonical(...)`
  - `syncLegacyMirrorsFromCanonical(...)`
  - Normalisierung und Persistenz von `state.events.*`
- `events.js`:
  - Spiegelung von Cooldown- und Timerfeldern, die weiterhin in Save/Restore auftauchen

### 3) Welche V1-Writes sind nur Fallback?

- `ui.js` Legacy-Sheet-Fallback-Resolve
- `app.js` Legacy-Fallback-Reset-/UI-Mode-Nebenpfade
- Teile von `sim.js` und `events.js`, die nur dann aktiv werden, wenn Legacy-States den Flow treiben

### 4) Welche V1-Writes könnten hinter ein Gate?

- W1 Create in `events.js` (R1.3)
- W2 Resolve in `events.js`/`ui.js` (R1.4)
- W3 Cooldown-/Timer-Writes in `events.js`/`sim.js` (R1.4/R1.5, adapterabhängig)
- W5 UI-Fallback-Writes (R1.4)

### 5) Welche V1-Writes dürfen später blockiert werden?

- Erst nach stabiler V2-Übernahme pro Pfad:
  - Create: blockierbar nach V2-Create-Authority für runtime-enabled Events
  - Resolve: blockierbar nach V2-Resolve/History-Abdeckung
  - UI-Fallback-Write: blockierbar nach V2-Sheet-First ohne Legacy-Actions
- Nicht früh blockieren:
  - Save-Normalisierung/Mirror (`storage.js`) bis Migrations-Gate

### 6) Wo muss V2 vorher vollständig übernehmen?

- Event Create/Selection für alle runtime-enabled Events
- Resolve -> History inkl. Reload-Idempotenz
- Cooldown-/Timer-Konsistenz (oder klarer canonical Adapter)
- UI-Aktionspfade im Event Sheet (kein Legacy-Action-Write als Primärpfad)

### 7) Welche Stellen brauchen Legacy-Read weiterhin?

- Storage Migration/Normalization
- Bridge/Fallback-Guard
- Defensive Darstellung bei alten Save-Zuständen
- Test/Dev-Kompatibilität bis Testmigration abgeschlossen ist

### 8) Welche Tests würden bei V1-Write-Isolation brechen?

- Event-Flow-/Persistence-Tests mit direkter `state.events`-Annahme
- UI/Event-Sheet-Fallback-Tests
- Timer-/Scheduler-Regressionen
- Save/Restore-Kompatibilitätstests

### 9) Welche Reihenfolge ist risikoarm?

1. Beobachten und markieren (R1.2), noch nicht blockieren.
2. Create-Gate (R1.3) für runtime-enabled V2-Events.
3. Resolve-Gate (R1.4) für V2-authoritative Flows.
4. Timer/Cooldown-Entkopplung (R1.4/R1.5) nur mit Adapter und Testschutz.
5. Save/Migration entkoppeln (R1.5) als letzter Schritt vor Löschkandidaten.

## Klassifikation W1–W6

### W1: Produktiver V1-Create

- Hauptquelle: `events.js` ActiveEvent-Aktivierung.
- Risiko: Hoch.
- Isolation: R1.3.

### W2: Produktiver V1-Resolve

- Hauptquelle: `events.js` (resolving/resolved/history), `ui.js` Fallback-Resolve.
- Risiko: Hoch.
- Isolation: R1.4.

### W3: V1-Cooldown-/Timer-Write

- Hauptquelle: `events.js`, `sim.js`.
- Risiko: Hoch (Tick/Scheduler/Save-Verzahnung).
- Isolation: R1.4/R1.5 mit Adapterbedarf.

### W4: V1-Save-Normalisierung

- Hauptquelle: `storage.js`.
- Risiko: Sehr hoch für Alt-Saves.
- Isolation: R1.5, nie als erster Schritt.

### W5: UI-Fallback-Write

- Hauptquelle: `ui.js`, einzelne `app.js` Pfade.
- Risiko: Mittel bis hoch.
- Isolation: R1.4 nach V2-UI-First.

### W6: Test-/Dev-only Write

- Hauptquelle: `test/`, `dev/`.
- Risiko: Niedrig produktiv, hoch für QA-Signal.
- Isolation: parallel zur Testmigration.

## R1-Stufenplan

### R1.0 – Status quo dokumentieren

- V1 schreibt in produktiven Pfaden.
- V2 ist für runtime-enabled Events sichtbar/auflösbar aktiv.
- Legacy-Read bleibt notwendig.

### R1.1 – V1-Write-Gate vorbereiten

- Zentrale Gate-API spezifizieren (noch nicht hart aktivieren):
  - `canLegacyV1Write(context)`
  - `canLegacyV1CreateEvent(context)`
  - `canLegacyV1ResolveEvent(context)`
- Kontextfelder:
  - `eventId`, `machineState`, `activeEventSystem`, `isRuntimeEnabled`, `isLegacySavePath`, `source`

### R1.2 – Dev-only Write-Report

- Read-only Report/Telemetry über verbleibende V1-Write-Orte.
- Keine produktive Blockade.
- Ergebnisbasis für R1.3/R1.4 Priorisierung.

### R1.3 – V1-Create hinter Gate (später)

- Wenn V2 runtime-enabled + autoritativ:
  - Legacy Create blocken.
- Legacy-Read bleibt aktiv.

### R1.4 – V1-Resolve hinter Gate (später)

- Resolve-Writes nur dort erlauben, wo V1 noch explizit zuständig ist.
- Für V2-authoritative Events: kein paralleler V1-Resolve-Write.

### R1.5 – Save/Restore entkoppeln (später)

- `eventV2` primär, V1 nur Legacy-Read/Mirror.
- Keine destruktive Migration.
- Versioniertes Save-Gate mit Rollback-Option.

## Risiken

- Höchstes Risiko: verfrühte Blockade von `storage.js` Legacy-Normalisierung.
- Zweithöchstes Risiko: Timer/Cooldown-Drift bei teilweiser Write-Sperre ohne Adapter.
- Drittes Risiko: Testsuite signalisiert falsch-grün/falsch-rot bei Mischzuständen.

## Was jetzt noch nicht gemacht wird

- Kein V1-Delete.
- Keine produktive Write-Hardsperre.
- Keine Save-Feld-Entfernung.
- Kein Runtime-Cutover-Upgrade.

## Klare Empfehlung für nächste technische Phase

**Nächste Mini-Phase:** R1.2 technisch ausbauen:

1. Dev-only Write-Telemetrie in den Hauptschreibpfaden (ohne Blockade).
2. Gate-Contract als no-op vorbereiten.
3. Zieltestmatrix definieren, die vor R1.3 grün sein muss.

