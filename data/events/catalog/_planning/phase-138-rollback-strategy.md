# Phase 138 - Rollback Strategy

## Rollback Trigger
Any regression in runtime boundary, bridge safety, or preview feed correctness.

## Rollback Actions
1. Disable runtime-facing flags first:
   - eventV2RuntimeShadowEnabled = false
   - eventV2EventCenterPreviewEnabled = false
2. Keep v1 event authority unchanged (already authoritative path).
3. Keep assetRefs and final webp files in repo (non-breaking metadata/assets).
4. Keep shadow feed and preview modules available but inactive.

## What can remain without rollback edits
- `assets.cover` webp paths
- root-level `assetRefs`
- preview/shadow model files
- planning reports and docs

## What must stay disabled after rollback
- Any runtime-write candidate path
- Any gameplay activation path for event-v2

## Post-rollback verification
- assetref active validation
- shadow runtime boundary report
- shadow bridge combined report
- guarded entry contract tests
- browser bridge candidate tests
