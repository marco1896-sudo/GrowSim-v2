# Phase 166 - No Apply / No Write (Multi-Candidate)

## Verifikation
- Optionenklick bleibt lokal/ephemer.
- Candidate-Wechsel übernimmt keine alte Auswahl.
- persistedResolveChoice bleibt null.
- RuntimeWrite/Save/Storage bleiben aus.

## Fazit
Resolve Preview Interaction bleibt vollständig no-write und no-apply, auch im Multi-Candidate-Flow.
