# Phase 12 Event Metadata Note

Internal note for the first authored metadata pass on event definitions.

## Added metadata shape

Normalized events may now include:

- `shadowModel.problemPolarity`
- `shadowModel.conflictGroup`
- `shadowModel.warningProfile`
- `shadowModel.escalationProfile`
- `shadowModel.rewardProfile`
- option-level `intent`
- option-level `contextFit`

This metadata is meant for the modular shadow runtime first. Legacy gameplay authority remains unchanged.

## First normalized subsets

The first pass focuses on the most common or high-value event groups:

- water warnings and wet/dry root-zone issues
- nutrition deficit/lockout and pH-drift issues
- environment heat/cold warning cases
- common foundation follow-up/reward definitions
- a small legacy-catalog subset for compatibility coverage

The second pass extends coverage into:

- pest outbreak events
- disease and mold-pressure events
- root-pressure and root-damage events
- worsening/follow-up-prone event paths

## Runtime usage

The modular runtime should now prefer explicit metadata for:

- problem polarity
- contradiction grouping
- option fit / intent evaluation
- follow-up plausibility hooks
- reward/recovery significance

If metadata is missing, the old heuristic path must still work.

## Still heuristic-backed

Many events are still intentionally heuristic-backed in this phase.

That is acceptable as long as:

- explicit metadata is preferred when present
- unmigrated events remain backward-compatible
- no broad event-data migration is forced in one step
