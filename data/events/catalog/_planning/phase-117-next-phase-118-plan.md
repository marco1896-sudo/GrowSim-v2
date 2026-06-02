# Phase 117 -> Phase 118 Plan

Recommended next phase:

`Phase 118: AssetRef Draft Normalization + Non-Active Patch Preview`

## Goal
Create a clean, normalized AssetRef draft under `_planning`.

## Scope
- Convert legacy `trialCategory` to `revisionStatus`.
- Add `sourcePhase: phase-112`.
- Preserve `hero`, `fallback`, optional `hero2x`, and `sourceCandidate`.
- Preserve watch/revision notes.
- Validate with `dev/run-event-v2-assetref-validation.draft.js`.

## Still Forbidden
- no Event file changes
- no AssetRefs activated
- no final assets
- no WebP conversion
- no Runtime/UI/Save changes

## Why This Next
The validator works, but the current draft still carries legacy field names.
Normalizing the draft first reduces risk before any later catalog patch preview.
