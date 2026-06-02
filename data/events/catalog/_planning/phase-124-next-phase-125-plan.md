# Phase 124 - Next Phase 125 Plan

## Recommended Phase
`Phase 125: Controlled Final Export Write Pilot (3 Events) + Hash/Dimension Verification`

## Why
- Tooling is now available (`sharp`).
- Dry-run validated all 22 mappings with zero blockers.
- A small write pilot reduces risk before full 22-event export.

## Scope (Phase 125)
- Use `dev/run-event-v2-final-asset-export.js` with `--write` for only 3 selected events.
- Keep `--overwrite` disabled.
- Validate written outputs:
  - existence
  - hashes
  - dimensions
  - file sizes
- Keep event catalog unchanged.
- Keep AssetRefs inactive.

## Safety Conditions
- No event file mutation.
- No assets.cover mutation.
- No AssetRef activation.
- No overwrite of existing final targets.

## Exit Criteria
- Pilot writes succeed for selected 3 events.
- Report confirms expected dimensions/format.
- No conflicts or unintended writes.
- Green signal for full-batch export phase.
