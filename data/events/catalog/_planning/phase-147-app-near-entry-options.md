# Phase 147 - App-Near Entry Options (Read-Only Review)

## Option 1: Existing Event Center / Debug Sheet Entry
- App-Nähe: hoch
- Risiko: mittel bis hoch (produktive Sheet-Pfade)
- Aufwand: mittel
- Rollback: gut über Flag möglich
- Save-Risiko: niedrig, wenn strikt no-write
- UI-Risiko: mittel

## Option 2: Hidden Debug Link / Dev Route
- App-Nähe: mittel
- Risiko: mittel (Routing/entry plumbing)
- Aufwand: mittel
- Rollback: sehr gut
- Save-Risiko: niedrig
- UI-Risiko: niedrig bis mittel

## Option 3: Weiter nur dev HTML
- App-Nähe: niedrig
- Risiko: sehr niedrig
- Aufwand: niedrig
- Rollback: trivial
- Save-Risiko: sehr niedrig
- UI-Risiko: sehr niedrig

## Option 4: Settings-/Debug-Fläche mit verstecktem Button
- App-Nähe: hoch
- Risiko: niedrig bis mittel (wenn rein dev-guarded)
- Aufwand: mittel
- Rollback: sehr gut (Flag off / button hidden)
- Save-Risiko: niedrig
- UI-Risiko: niedrig bis mittel

## Empfehlung
Option 4 als Phase-148-Ziel: versteckter dev/test-only Entry im app-nahen Debug/Settings-Kontext, strikt no-write, no-actions, no-production-default.
