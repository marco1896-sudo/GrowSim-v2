# Phase 165 - No Apply / No Write

## Verifikation
- Optionen sind klickbar, aber ausschließlich lokal/ephemer.
- Keine Persistenz von Resolve-Choice (`persistedResolveChoice: null`).
- Keine Actions erzeugt (`actions: []`).
- Kein Apply, kein Resolve, keine Trigger/Reward-Pfade.
- Runtime/Save/Storage unverändert (`RuntimeWrite false`, Writes `0`).

## Safety
- `canResolve: false`
- `canApplyEffects: false`
- `selectedCandidate: null`
- `persistedSelectedCandidate: null`
- `productionEnabled: false`

## Fazit
Resolve Preview liefert UX-Feedback ohne jede Mutation und bleibt vollständig no-write.
