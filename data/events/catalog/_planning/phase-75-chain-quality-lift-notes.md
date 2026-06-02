# Phase 75 Chain Quality Lift Notes

## Scope
- No new events.
- No new learning cards.
- No runtime changes.
- Two existing chains refined inside the current schema.
- Related `chainHooks` updated to match clearer step IDs.

## Chain Analysis Before Lift
### watering_rootzone_chain
- Strongest part: the causal story was already coherent.
- Weakest part: step IDs were generic and did not explain branch intent well.
- UI-Lab risk: outdoor dryback looked like a random detour unless the summary explained it as a branch case.

### airflow_climate_chain
- Strongest part: good indoor-to-outdoor climate theme.
- Weakest part: the branch between indoor heat and outdoor exposure was semantically broad.
- UI-Lab risk: the chain summary needed to explain that the outdoor steps are not a random second chain, but a related exposure branch.

## What Was Tightened
### watering_rootzone_chain
- Renamed steps to explicit authoring IDs:
  - `step_misread_signal`
  - `step_outdoor_dryback`
  - `step_drainage_lock`
  - `step_rootzone_oxygen_drop`
  - `step_recovery_hold`
- Summary now explicitly describes the full causal arc.
- `expectedSpanSimHours.max` widened slightly so the full branch reads more honestly.
- Related `chainHooks` updated to the new step IDs.

### airflow_climate_chain
- Renamed steps to explicit authoring IDs:
  - `step_airflow_drop`
  - `step_vpd_drift`
  - `step_heat_pressure`
  - `step_outdoor_exposure_branch`
  - `step_outdoor_dry_wind`
- Summary now explains the indoor start, escalation logic, and outdoor branch more clearly.
- Related `chainHooks` updated to the new step IDs.

## Schema Limitation Acknowledged
The current chain schema does not expose dedicated per-step label or reasoning fields. For this phase, clarity was improved through:
- more expressive step IDs
- stronger chain title/summary copy
- stricter hook alignment
- cleaner documentation

## CrossRef Result
- Every chain step still points to an existing event.
- Every `to` target still points to an existing step.
- Updated `chainHooks` point to valid chain IDs and valid step IDs.
- Learning-card `linkedEventIds` remained valid and did not need further widening.

## QA / Health Interpretation
- CrossRef quality improved.
- Validation remained at `0/0/0`.
- Adapter matrix stayed `22/22 pass`.
- Health score stayed `70.44` because info diagnostics still dominate the scoring model.
- RC-QA remains red because the release-candidate gate still expects a higher score threshold, not because the chain authoring is broken.
