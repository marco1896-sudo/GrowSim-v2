# Phase 138 - Feature Flag Strategy

## Activation Route
Shadow-first, no-write, rollback-first.

## Flag Matrix

### 1) eventV2AssetsEnabled
- Purpose: mark final asset/catalog readiness
- Default: true (already validated)
- Environment: dev/test/prod metadata only
- Save mutation: no
- UI change: indirect only via existing catalog paths
- Rollback: keep enabled; no risk
- Required checks: asset integrity + catalog validation

### 2) eventV2PreviewEnabled
- Purpose: enable lab/preview rendering
- Default: true in dev/lab, off in production surfaces
- Environment: dev/lab
- Save mutation: no
- UI change: lab-only
- Rollback: switch off preview surface
- Required checks: preview browser smoke + visual QA

### 3) eventV2ShadowFeedEnabled
- Purpose: enable catalog-driven shadow feed model
- Default: true in dev/lab, off outside lab bridge
- Environment: dev/lab
- Save mutation: no
- UI change: lab-only
- Rollback: disable shadow feed mode
- Required checks: shadow feed readiness + browser smoke

### 4) eventV2EventCenterPreviewEnabled
- Purpose: allow Event-Center dev-preview consumption of v2 shadow feed
- Default: false
- Environment: dev only
- Save mutation: no
- UI change: yes (dev preview only)
- Rollback: disable flag, fall back to existing preview path
- Required checks: adapter matrix + event-center preview smoke

### 5) eventV2RuntimeShadowEnabled
- Purpose: run v2 evaluation in parallel (read-only diagnostics)
- Default: false
- Environment: dev/test only
- Save mutation: no
- UI change: optional debug/status only
- Rollback: disable flag; no data migration required
- Required checks: runtime boundary + combined safety + hook safety

### 6) eventV2RuntimeWriteEnabled
- Purpose: allow v2 runtime state writes
- Default: false
- Environment: none for now
- Save mutation: yes (potentially)
- UI change: yes (indirect)
- Rollback: must be preplanned and gated
- Required checks: dedicated future gate, not part of phase 138

### 7) eventV2ProductionEnabled
- Purpose: soft launch / production rollout control
- Default: false
- Environment: staged production only
- Save mutation: depends on runtime write strategy
- UI change: yes
- Rollback: production flag off + fallback to v1 authoritative path
- Required checks: full regression + rollout guardrails

## Recommended immediate defaults
- ON (dev/lab): `eventV2PreviewEnabled`, `eventV2ShadowFeedEnabled`
- OFF: `eventV2EventCenterPreviewEnabled`, `eventV2RuntimeShadowEnabled`, `eventV2RuntimeWriteEnabled`, `eventV2ProductionEnabled`
