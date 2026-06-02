# Phase 123 - Controlled Final Export Plan

## Plan Coverage
- Events covered: 22
- Source set: `phase-122-safe-assetref-draft-normalized-v2.json`
- Outputs per event:
  - `hero.webp`
  - `fallback.webp`
  - optional `hero@2x.webp`

## Current Eligibility Snapshot
- 22/22 source candidates exist
- 22/22 are Wide-Hero compatible
- `hero@2x.webp` is currently optional and not eligible without upscaling in the present source set

## Export Parameters
- `hero.webp`: max width 1280, quality 84, no upscale
- `fallback.webp`: max width 960, quality 78, no upscale
- `hero@2x.webp`: optional, only when source width >= 2560, no upscale

## Safety
Export plan is non-active:
- no final asset writes in this phase
- no Event-file changes
- no AssetRef activation
