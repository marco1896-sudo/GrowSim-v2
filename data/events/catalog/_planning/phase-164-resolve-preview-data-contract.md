# Phase 164 - Resolve Preview Data Contract

## Pflichtfelder (Root)
- `ok` (boolean)
- `mode` (string, `event_v2_resolve_preview_no_write`)
- `eventId` (string)
- `candidateId` (string|null)
- `title` (string)
- `question` (string)
- `options` (array, 2-3 Einträge)
- `safetyLabels` (array)
- `actions` (empty array)
- `selectedCandidate` (null)
- `persistedSelectedCandidate` (null)
- `canResolve` (false)
- `canApplyEffects` (false)
- `runtimeWriteEnabled` (false)
- `productionEnabled` (false)
- `diagnostics` (object)

## Option-Felder (Pflicht)
- `optionId` (string)
- `label` (string)
- `intent` (string)
- `expectedQuality` (`good|bad` in Draft)
- `feedbackPreview` (string)
- `plannedEffectsPreview` (object)
- `canApply` (false)
- `canResolve` (false)

## Safety-Felder
- `canActivateGameplay=false`
- `canMutateState=false`
- `canMutateSave=false`
- `runtimeWriteEnabled=false`
- `productionEnabled=false`
- `diagnostics.stateMutations=0`
- `diagnostics.saveWrites=0`
- `diagnostics.localStorageWrites=0`
- `diagnostics.indexedDbWrites=0`

## Forbidden Fields/Verhalten
- Keine echten Resolve-/Apply-Actions
- Keine Persistenz-IDs für committed outcome
- Keine Reward-/Mission-/Notification-Felder
- Keine Save-/Storage-Verweise

## Erweiterung zu echtem Resolve (später)
- Outcome-ID und Idempotenz-Schlüssel
- Resolve-Commit-State und History-Verknüpfung
- Reward-Dedupe und Mission-Kopplung
- Write-Gates vor jeder Mutation

## Abgrenzung zu Event V1
- V1 bleibt authoritative Resolve-Pfad.
- V2 Phase 164 ist nur no-write Preview-Vertrag.
