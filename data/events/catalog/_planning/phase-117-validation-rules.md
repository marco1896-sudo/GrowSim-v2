# Phase 117 - Validation Rules

## Modes
- Draft Mode: planning drafts; final files may be missing.
- Active Mode: real Event catalog; productive final files must exist if referenced.

## Required Fields
- `hero`
- `fallback`
- `sourceCandidate`
- `status`
- `revisionStatus`
- `sourcePhase`

## Allowed Values
- `status`: `trial_asset_set_v1`
- `revisionStatus`: `ready`, `usable_with_watch`, `temporary_usable_needs_revision`
- `sourcePhase`: `phase-112`

## Optional Fields
- `notes`
- `hero2x`

## Forbidden Product Paths
- `_trial_export`
- `maual-import`
- `_manual_import`

## Draft Findings
- Phase-113 draft uses `trialCategory`; validator normalizes it with warnings.
- Phase-113 draft lacks `sourcePhase`; validator warns.
- Final files are not exported yet; validator reports this as info.

