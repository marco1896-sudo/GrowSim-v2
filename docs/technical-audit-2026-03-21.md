# Technical Audit - 2026-03-21

## Scope

- Frontend runtime and screen/sheet flow
- Simulation/event regression baseline
- Service worker and reload behavior
- Backend auth/save integration status
- Figma-aligned UI honesty and product-state consistency

## System Summary

- The app boots reliably and the current simulation/event regression suite is green.
- The frontend runtime is still split between large legacy root files (`app.js`, `ui.js`, `sim.js`, `events.js`) and a newer modular `src/ui` architecture.
- The backend auth/save API exists, but the current frontend does not call `https://api.growsimulator.tech/api/auth` or `https://api.growsimulator.tech/api/save`.
- The UI is visually close to the referenced Figma screens, but several account/profile/menu surfaces are still placeholder or local-only.

## Confirmed Issues

### Fixed

1. Onboarding left the home HUD semantically active underneath the modal overlay.
   - Risk: focus leakage, assistive-tech confusion, accidental interaction through layered UI.
   - Fix: the HUD is now marked blocked/inert while onboarding is visible.

2. Reload restored transient UI overlays such as menu and menu dialog state.
   - Risk: confusing reload state, stacked overlays, stale session feel after refresh.
   - Fix: transient UI state is sanitized during restore.

3. Settings claimed "Cloud Sync: Verbunden" although the frontend currently operates local-only.
   - Risk: false product promise and misleading QA signal.
   - Fix: settings now label persistence honestly as local storage.

4. Onboarding exposed dead "Zurück" and "Preset" buttons with no functionality.
   - Risk: broken UX impression and avoidable confusion in first-run flow.
   - Fix: both controls are explicitly disabled until functionality exists.

### Still Open

1. Frontend/backend integration is incomplete.
   - The backend auth/save flow exists, but the frontend currently does not use it.

2. Large duplicated logic remains in `app.js` and `ui.js`.
   - This is the highest code-quality risk for future regressions.

3. Several menu/profile/account affordances are still placeholders.
   - They render cleanly, but they are not yet production-complete.

## Tests Run

- `npm run check:syntax`
- `node test/environment-core-regression.test.js`
- `node test/event-env-pressure-regression.test.js`
- `node test/event-flow-integration.test.js`
- `node test/event-flow-multi-chain-persistence.test.js`
- `node test/event-flow-persistence.test.js`
- `node test/event-resolver-guards-integration.test.js`
- `node test/event-roll-threshold-regression.test.js`
- `node test/night-fairness.test.js`
- `node test/offline-cap.test.js`
- `node test/event-runner.js`
- `backend: npm run check`
- `node test/ui-onboarding-settings-smoke.test.js`

## Added Test Coverage

- `test/ui-onboarding-settings-smoke.test.js`
  - verifies first-run onboarding visibility
  - verifies HUD is blocked while onboarding is open
  - verifies disabled onboarding placeholder buttons
  - verifies settings show local-only persistence honestly
  - verifies transient menu/dialog state is not restored after reload

## Recommended Next Steps

1. Wire the frontend to the backend auth/save API, or explicitly remove/rename account/cloud-sync claims until that work lands.
2. Continue collapsing duplicated UI/state logic from `app.js` and `ui.js` into one runtime path.
3. Add targeted regression coverage for service worker update behavior and local-vs-backend persistence switching.
