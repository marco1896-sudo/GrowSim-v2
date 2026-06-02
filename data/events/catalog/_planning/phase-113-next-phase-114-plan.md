# Phase 113 - Next Phase 114 Plan

## Recommended Direction
`Safe Trial Asset Export Dry Run`

## Scope
- Select 3 pilot events:
  1. `shared_rootbound_warning` (ready)
  2. `shared_early_pest_signs_mild` (ready)
  3. `indoor_fan_failure_airflow_drop` (temporary_usable_needs_revision)
- Copy source candidates into a staging-only folder (e.g. `_trial_export`) without touching `final/`.
- Generate hash, dimensions, and format report only.
- No event file edits, no AssetRef activation, no runtime changes.

## Exit Criteria
- Staging copy succeeds.
- Format and integrity reports are reproducible.
- Clear go/no-go recommendation for Phase 115 wiring dry plan.
