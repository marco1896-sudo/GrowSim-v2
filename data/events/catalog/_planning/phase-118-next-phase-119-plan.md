# Phase 118 -> Phase 119 Plan

Recommended next phase:

`Phase 119: AssetRef Final Export Readiness Gate + Source Candidate Existence Report`

## Goal
Confirm whether the normalized AssetRef draft is ready for a later final export phase.

## Scope
- Read `phase-118-safe-assetref-draft-normalized.json`.
- Verify all `sourceCandidate` paths exist.
- Verify all planned final directories and filenames are deterministic.
- Confirm no refs point to `_trial_export`, `maual-import`, or `_manual_import`.
- Produce a readiness report for eventual WebP export.

## Still Forbidden
- no Event file changes
- no AssetRefs activated
- no final assets
- no WebP conversion unless explicitly approved in a later export phase
- no Runtime/UI/Save changes

## Why This Next
The schema is now clean. Before any final export or patch preview becomes operational, the pipeline should verify that every source candidate is present and safe to export.
