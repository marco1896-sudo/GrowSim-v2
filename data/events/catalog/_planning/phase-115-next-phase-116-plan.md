# Phase 115 -> Phase 116 Plan

## Recommended Sequence
1. `Phase 116: WebP Export Tooling Decision + Non-Mutating Script Draft`
2. `Phase 117: AssetRef Schema Validation Script Draft`

## Why this order
- Without reproducible export tooling, asset existence checks for activation are unreliable.
- Once export path is stable, schema validation script can enforce activation gates with fewer false negatives.

## Phase 116 scope
- decide tooling (prefer sharp)
- draft non-mutating exporter script design
- do not write final assets
- do not patch event files
