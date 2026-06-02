# Phase 129 - Next Phase 130 Plan

## Recommended Phase 130
`UI-Lab AssetRef Preview Wiring`

## Objective
Show that `assetRefs.hero` can be consumed in isolated UI-Lab preview safely before any `assets.cover` migration.

## Scope
- update UI-Lab asset resolver priority for preview context only
- keep `assets.cover` untouched in event catalog
- keep runtime and app UI behavior unchanged
- run validation + shadow/noop/bridge checks

## Exit Criteria
- UI-Lab can display all 22 event hero previews via `assetRefs.hero`
- zero runtime/UI-side regression in existing check suite
- clear go/no-go for 3-event `assets.cover` pilot (Phase 131)
