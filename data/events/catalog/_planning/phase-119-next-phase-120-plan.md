# Phase 119 -> Phase 120 Plan

Recommended next phase:

`Phase 120: Asset Format Correction Batch - indoor_vpd_mismatch_veg`

## Why
All 22 source candidates exist, but one candidate is not Wide-Hero compatible:

- `indoor_vpd_mismatch_veg`
- dimensions: 1448x1086
- ratio: 1.3333
- status: `blocked_invalid_format`

The WebP tooling decision remains necessary later, but the immediate gate blocker is source format.

## Scope
- Prepare a corrected Wide-Hero source candidate for `indoor_vpd_mismatch_veg`.
- Keep the existing candidate as a reference, do not overwrite it.
- Import the corrected candidate as a new review candidate or document an approved crop plan.
- Re-run the Phase-119 source candidate readiness check.
- Do not activate AssetRefs until final files exist and validation passes.

## Still Forbidden Until Explicit Approval
- no dependency install
- no package.json mutation
- no final asset writes
- no Event file changes
- no AssetRef activation
