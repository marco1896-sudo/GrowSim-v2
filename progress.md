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
