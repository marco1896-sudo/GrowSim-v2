Original prompt: Perform a visual polish and hierarchy pass on the rebuilt reference-style main HUD. Keep gameplay logic unchanged and preserve structure.

2026-03-14
- Started visual polish pass with develop-web-game skill.
- Goal: improve premium hierarchy/readability/focal balance using CSS-only refinements.
- Installed Playwright as dev dependency (`npm install -D playwright`).
- Added visual capture runner: `visual-tests/hud-visual-pass.mjs`.
- Installed Chromium runtime for Playwright (`npx playwright install chromium`).
- Captured HUD screenshots to `visual-tests/screenshots/` in multiple simulated visual states.
- Applied visual polish pass (CSS hierarchy/spacing/icon/readability tuning) without gameplay logic changes.
- Refined Boost subtitle runtime text for compact readability.

Open items:
- Some state captures get overridden by live simulation updates between scripted assignments and screenshot timing.
- Icon art for certain rows is serviceable but still lacks bespoke direction compared to reference.
- Focused correction pass completed:
  - Reduced hero plant scale and rebalanced plant-to-badge spacing.
  - Converted actions to icon-first medallion treatment (larger atlas icons, smaller secondary labels).
  - Ensured floating menu uses atlas menu icon with premium corner styling.
  - Final screenshots regenerated in visual-tests/screenshots.

2026-03-26
- Investigated climate readout separation bug using live browser path against local static server.
- Verified latest code path keeps top HUD temp/RH/airflow stable immediately after controller target changes.
- Hardened app-level fallback `deriveEnvironmentReadout()` to prefer `state.climate.tent.*` actuals instead of controller mirrors.
- Added regression tests for:
  - no instant RH snap after target change
  - no instant temperature snap after target change
- Found likely live-app root cause for persistent user-visible bug: stale cached `sim.js` / `app.js` in PWA shell due unchanged script query strings and service worker cache version.
- Bumped `sim.js` and `app.js` query versions in `index.html` and updated `sw.js` cache version to force fresh runtime assets.
- Extended the event system with climate-driven indoor tent events in `data/events.v2.json`:
  - positive climate rewards
  - stress/risk climate penalties
  - neutral climate drift warnings
- Added lightweight event image resolution in `events.js` using keyword-based matching against `assets/events`.
- Added event image rendering support to the event sheet in `index.html`, `styles.css`, `ui.js`, and `app.js` via `state.events.activeImagePath`.
- Added actual-climate instability telemetry in `sim.js` for fluctuation-based event triggers.
- Added regression coverage for:
  - `env.instabilityScore`
  - indoor-only climate event gating
  - event asset mapping for heat / ideal / humidity-risk climate events
- Small positive-event tuning pass:
  - slightly increased the payoff of ideal VPD / stable comfort / veg humidity rewards
  - nudged stable comfort weight up a little without changing cooldown architecture
- Care Patch 1:
  - added gameplay-asset resolver for care actions
  - care action cards now prefer `assets/gameplay/actions/*`
  - selected care action now shows a compact preview image + short note in the detail area
- Care Patch 2 / watering redesign:
  - added optional `rootZoneInfluence` and `climateInfluence` support to actions
  - redesigned plain water, deep water, nutrient solution watering, and flush to feel distinct
  - added a watering regression test to lock in EC/RH-direction differences
- Care Patch 3 / fertilizing redesign:
  - reworked light feed, balanced feed, CalMag, and strong feed into clearer cultivation roles
  - reused the lightweight `rootZoneInfluence` model so feeding affects EC / pH pressure more believably
  - kept feeding climate-neutral in this patch to avoid fake environmental side effects
  - added a fertilizing regression test to lock in tiering and action distinctness
- Care Patch 4 / training + environment redesign:
  - reworked canopy arrangement, LST, and topping into clearer short-term stress vs later-payoff decisions
  - renamed environment actions toward believable grower tasks like airflow clearing, hygiene, and major tent service
  - added lightweight `environmentInfluence` support so only the airflow-care action nudges baseline airflow while hygiene/service skip generic airflow bumps
  - added a training/environment regression test to lock in tradeoffs and realistic environment-task roles

Open items:
- Watch live gameplay frequency of the new climate warnings vs positive rewards before broad balance tweaks.
- If players want stronger visual distinction later, event image styling can be refined without touching the event engine.
