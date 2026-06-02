# Phase 122 -> Phase 123 Plan

Recommended next phase:

`Phase 123: Sharp Dependency Decision Gate + Controlled Final Export Plan`

## Why
- Source candidate readiness is now complete: 22/22 exist and are wide-hero compatible.
- Remaining blocker is tooling/policy, not asset format.

## Phase 123 Scope
1. Decide whether `sharp` may be added (explicit approval gate).
2. Define controlled final-export plan for all 22 assets.
3. Keep Event files unchanged in the planning step.
4. Keep AssetRefs inactive until final files exist and checks pass.

## Still Forbidden Without Explicit Approval
- no dependency install
- no package.json mutation
- no final asset writes
- no Event file patches
- no AssetRef activation

