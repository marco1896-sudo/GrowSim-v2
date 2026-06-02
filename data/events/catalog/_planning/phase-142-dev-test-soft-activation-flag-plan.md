# Phase 142 - Dev/Test Soft Activation Flag Plan

## Scope
Plan-only. No flag activation is executed in Phase 142.

## Target for later Phase 143 (dev/test only)
- `eventV2EventCenterPreviewEnabled: true`
- `eventV2ShadowFeedEnabled: true`
- Optional: `eventV2RuntimeShadowEnabled: true`

## Must remain OFF
- `eventV2RuntimeWriteEnabled: false`
- `eventV2ProductionEnabled: false`

## Safety Boundaries
- no gameplay activation
- no runtime cutover
- no state/save writes
- no production UI replacement

## Rollback
Disable `eventV2EventCenterPreviewEnabled` and optional `eventV2RuntimeShadowEnabled`.
V1 authority remains unchanged.
