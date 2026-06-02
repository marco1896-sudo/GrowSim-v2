# Phase 153 - Single Candidate Detail Preview

## Ziel
Eine einzelne Candidate-Detailansicht im dev/test Event-Center-Context bereitstellen, ohne Resolve oder Writes.

## Umsetzung
- Neues Preview-Modell fuer eine einzelne Candidate-Karte.
- Detail-Overlay in der dev-only Surface mit Bild, Diagnose, Learning-Hinweisen und Safety Labels.
- Nur Back/Close Interaktion; keine Gameplay- oder Reward-Actions.

## Safety
- `canResolve: false`
- `actions: []`
- `selectedCandidate: null`
- `runtimeWriteEnabled: false`
- `productionEnabled: false`
