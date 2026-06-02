# Phase 148 Plan - Event V2 Hidden Dev/Test Entry (App-Near, No RuntimeWrite)

## Scope
- Hidden dev/test-only entry in app-near debug/settings/event-center context.
- Candidate preview only, no gameplay activation, no runtime write.

## Likely Files To Touch (Phase 148)
- app-near debug/settings entry module (preferred over global app flow changes)
- `src/events/v2/preview/EventV2DevTestCandidateFeedController.js` (read usage only, optional minor glue)
- optional small adapter/wiring helper under `src/events/v2/preview/`

## Files To Keep Untouched
- `index.html`
- `sw.js`
- event catalog files under `data/events/catalog/events/**`
- locale files
- save/migration modules

## app.js in Phase 148
- Avoid if possible.
- If unavoidable, minimal dev-guarded hook only (hidden, flag-gated, no-write).

## Required Flag State
- Keep ON (lab/dev preview): `eventV2PreviewEnabled`, `eventV2ShadowFeedEnabled`
- Keep OFF: `eventV2RuntimeWriteEnabled`, `eventV2ProductionEnabled`
- Use explicit dev/test toggle for hidden entry exposure only.

## Rollback
- Hide/disable dev entry toggle.
- Keep v1 event authority unchanged.
- Keep v2 preview/shadow artifacts inactive.

## Mandatory Verification
- Browser smoke (360/390/430/768)
- No-write verification (state/save/storage writes == 0)
- actions empty + selectedCandidate null
- existing event-v2 guard/bridge/runtime checks green

## Watch Handling
- `scoring_watch_vpd_vs_dry_rootball` remains backlog watchpoint, not a blocker.
