# Phase 115 - Event Catalog AssetRef Wiring Plan

## Catalog Structure Findings (read-only)
- Event files are consistent JSON (*.event.json) across indoor/outdoor/shared groups.
- Current image runtime field is ssets.cover with src + allback.
- Existing validator (AssetRefValidator) currently checks ssets.cover.src, not a new ssetRefs block.
- ssets.spriteOverlays is present and should remain untouched in first wiring pass.

## Recommended Minimal Wiring Strategy
1. Keep ssets.cover as runtime-safe primary during transition.
2. Add ssetRefs as optional metadata block in a later controlled patch phase.
3. Activate runtime usage only after final assets exist + validation passes.
4. Do not write any _trial_export paths into product files.

## Readiness Snapshot
- Events scanned: 22
- has assets.cover.src: 22
- has assets.cover.fallback: 22
- has assets.spriteOverlays: 22

## Patch Order (future phase only)
1. Confirm WebP export tooling.
2. Export final files (non-mutating report first).
3. Hash/dimension/existence report.
4. Generate catalog patch draft.
5. Static validate patch.
6. Run event catalog tests.
7. Run shadow/noop checks.
8. Then explicit activation approval.

