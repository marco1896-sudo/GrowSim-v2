# Phase 166 Plan

## Empfohlene Phase
`Event V2 Resolve Preview UI - Multi-Candidate Flow, No Apply`

## Ziel
Resolve Preview UI über mehrere Candidates im Flow testen:
- Candidate A öffnen, Option klicken, Feedback prüfen
- zurück zur Liste
- Candidate B öffnen, andere Option klicken, Feedback prüfen
- Close/Back robust
- weiterhin kein Apply/Resolve/Write

## Muss erhalten bleiben
- `actions: []`
- `canResolve: false`
- `canApplyEffects: false`
- `selectedCandidate: null`
- `persistedSelectedCandidate: null`
- `persistedResolveChoice: null`
- `runtimeWriteEnabled: false`
- `productionEnabled: false`
- Save/Storage Writes: `0`

## Nicht erlaubt
- Keine echte Eventauslösung
- Kein RuntimeWrite
- Kein Save
- Keine Reward/Mission/Notification Mutation
- Keine Event-V1-Ersetzung
