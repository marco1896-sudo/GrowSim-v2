# Phase 169 - Resolve Flow Rollback and Safety Gate

## Rollback-Mechanik
Wenn Resolve Preview Probleme macht, reicht ein dev-only Rollback:
1. Resolve Preview Section in der Preview-Galerie ausblenden.
2. Resolve Preview Interaction Controller nicht mehr binden.
3. Feedback-Copy-Layer (`EventV2ResolveFeedbackCopy`) ungenutzt lassen.
4. Event V2 bleibt im Dev/Test No-Write Modus ohne Apply/Resolve.
5. Event V1 bleibt vollständig maßgeblich.

## Guards, die aus bleiben müssen
- `runtimeWriteEnabled=false`
- `productionEnabled=false`
- `canResolve=false`
- `canApplyEffects=false`
- `canMutateState=false`
- `canMutateSave=false`
- `persistedResolveChoice=null`

## Warum keine Migration nötig ist
- Kein Save-Schema geändert.
- Keine Persistenzfelder eingeführt.
- Keine Storage-Schreibzugriffe durchgeführt.
- Keine Event-History geschrieben.

## Welche Dateien nicht zurückgebaut werden müssen
- Planungs- und Reportdateien unter `_planning`.
- Doku-Dateien unter `docs/event-system-v2`.
- Dev-only Smoke-Skripte können liegen bleiben, auch wenn sie nicht genutzt werden.

## Checks nach Rollback
- Resolve Preview Model Report
- Resolve Preview UI Smoke
- Resolve Preview Multi-Candidate Smoke
- Resolve Preview Interaction Smoke
- Feedback Copy Report + Smoke
- Hook-/Boundary-/No-Write-Checks aus dem Kernblock

## Safety-Fazit
Rollback ist klein, reversibel und ohne Save-/Migration-Risiko. Event V1 bleibt zu jeder Zeit die produktive Autorität.
