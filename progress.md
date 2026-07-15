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
- Care UI bugfix pass:
  - repaired broken German care-sheet strings at the catalog source and bumped the actions catalog version for clean reloads
  - tightened selected-card typography and spacing to remove layered/stacked text artifacts
  - stabilized care-sheet section sizing so the lower detail area no longer visually collides with surrounding content
  - integrated the action-list/effects scrollbars with reserved gutter spacing and mobile-friendly scrolling
  - added a dedicated care-sheet UI regression test for encoding, internal scrolling, and reachable lower controls

Open items:
- Watch live gameplay frequency of the new climate warnings vs positive rewards before broad balance tweaks.
- If players want stronger visual distinction later, event image styling can be refined without touching the event engine.

2026-03-27
- Started vertical-slice implementation for persistent meta progression and repeatable run loop.
- Added a dedicated progression helper module with:
  - persistent profile defaults
  - explicit XP thresholds
  - unlock catalog / readable UI labels
  - run finalization / summary generation
- Home HUD top-module polish pass:
  - removed the large in-layout run-goal card from the main scroll stack
  - merged player identity, active goal, and build identity into a compact top command header
  - added an inline expand/collapse detail area for goal/build details instead of a second heavy card
  - verified collapsed and expanded states visually in-browser with screenshots (`home-top-module-collapsed.png`, `home-top-module-expanded.png`)
- Wired `storage.js` to migrate and persist `state.profile` and `state.run`, including old-save fallback for active runs without the new run block.
- Added first run-summary overlay and extended landing setup with unlock-gated medium/light choices.
- Switched HUD level/xp display from fake sim-day placeholders to real persistent profile progression.
- Added `resetRunPreservingProfile()` and summary-driven new-run loop while keeping hard-reset behavior in `resetRun()`.
- Added death/downed persistence and guarded harvest finalization path in the simulation loop.
- Added lightweight real gameplay effects for unlocked setup choices:
  - outdoor already meaningful via existing mode handling
  - coco medium increases drain / slightly increases growth pressure
  - genetics now lightly changes stress/health/growth behavior

Open items:
- Verify controller/menu path and summary overlay path together in automated tests and live browser flow.
- If the new progression UI feels too subtle, add stronger in-HUD level-up feedback without changing save/state architecture.

- Summary motivation pass:
  - added central run-feedback text catalog in `src/progression/progression.js`
  - summary now derives a readable overall rating, highlight list, mistake list, positive list, and compact XP notices
  - overlay order now emphasizes interpretation first, numbers second
  - added logic coverage to keep bad runs explanatory and good runs affirming
- Mission Light pass:
  - added one active run goal per run with lightweight selection in `src/progression/progression.js`
  - goals are now persisted on `state.run.goal`, restored for old active saves, and re-evaluated during runtime sync
  - added compact HUD goal card with title, description, status, and progress
  - summary now shows goal result plus mission bonus XP
  - completed goals now add a dedicated XP bonus without changing the larger progression structure
  - added regression coverage for goal assignment, migration safety, bonus XP, and HUD/summary visibility
- Run identity / strategy pass:
  - sharpened three unlock-driven run archetypes around Hardy Genetics, Fast Genetics, and High Output Light
  - strengthened simulation-side tradeoffs so safe / fast / high-pressure runs now diverge more clearly in growth, stress, and resource pressure
  - added setup comparison text directly to landing options plus a compact run-profile preview card
  - active run HUD now keeps the chosen build visible next to the current mission
  - run summary now includes the selected build and setup-aware highlight/mistake/positive feedback
  - added regression coverage for build identity, strategic start preview, and summary references to the chosen setup

2026-06-16
- Phase 9 Safe typography pass completed for missions/daily surfaces.
- Limited changes to `styles.css` only:
  - slightly raised premium home retention teaser text sizes while keeping the compact playercard footprint
  - improved missions sheet helper/status/progress readability
  - increased claim button minimum height for better mobile tap comfort
  - modestly lifted micro-chip helper text readability
- Verification:
  - `node scripts/i18n-audit.js` passed
  - `npm run check:syntax` passed
  - `node test/daily-tasks-ui-state.test.js` passed
  - `node test/daily-tasks-runtime.test.js` passed
  - `node test/home-playercard-compactness-regression.test.js` passed
  - `node test/ui-onboarding-settings-smoke.test.js` passed on retry after one mission-reward overlay interception
  - `npm run test:smoke` hit the same overlay interception flake inside `ui-onboarding-settings-smoke.test.js`
  - remaining smoke tests passed individually
  - `npm run test:runtime` passed

Open items:
- Manual mobile check still recommended on 390px and 360px because the open local dev tab currently shows unrelated auth/i18n warning state not caused by this phase.

2026-06-17
- Phase 11.2 offline reopen / SW boot triage:
  - reproduced the offline reopen path with a fresh persistent browser profile against a local static server
  - verified service worker control, shell cache persistence, and guest/local boot reaching `window.__gsBootOk === true` after a full offline reopen
  - the previously reported guest startup failure is confirmed test drift against the newer honest push copy (`Lokales Spielen bleibt möglich`)
  - added a dedicated offline reopen regression test to lock in service-worker-backed boot readiness without changing product logic

2026-07-13
- Started approved Buddy Care+ reference UI implementation.
- Read the full task, project constraints, UI references, and Buddy asset workflow.
- Current focus: preserve the existing Care+ data/save/overlay architecture while completing the reference-style shell and targeted tests.
- Reworked the local Care+ view model and UI composition around Today, Plants, Plant Detail, History, and More without changing persistence.
- Added normalized plant filters, timeline/trends mode, existing phase/risk-based cannabis imagery, and reference-style Buddy placement.
- Syntax, i18n parity, navigation, shell, state, daily check, diary, trend, and product-hardening tests pass after the first implementation pass.
- Next: run the required browser interaction loop, inspect mobile screenshots, and correct any visual or runtime regressions.
- Browser QA completed at 390x844 for Today, Plants, Plant Detail, History, and More.
- Updated the existing mobile E2E smoke flow for the new information architecture and added horizontal-overflow, active-navigation, and detail-tab assertions.
- Fixed hidden-state CSS precedence, restored diary deletion in the real history timeline, and replaced checkerboard-backed plant files with existing phase-aligned growth frames.
- The complete Care+ flow now passes with three plants, daily check, diary entry, delete confirmation, reload, and persistence restoration.
- Next: complete the final static, state, i18n, and product-hardening regression suite.

2026-07-14
- Completed approved Buddy Care+ Phase 15.1 mobile navigation and UI cleanup.
- Split Care+ into a dedicated internal scroll region and one sibling bottom navigation with safe-area padding.
- Simplified zero-plant Today and Plants states, removed redundant Buddy/CTA blocks, hid filters without plants, and added direct setup opening without save changes.
- Corrected visible German Buddy Care copy to proper umlauts/ß and removed repeated Buddy-says prefixes in DE/EN/ES.
- Added architecture/mobile-cleanup regression tests and expanded the Care+ E2E flow with nav separation and setup reachability checks.
- Verified the full flow at 320x568, 375x667, 390x844, and 430x932; required syntax, i18n, state, UI, daily check, diary, risk, trend, monetization, hardening, and runtime tests pass.

Open items:
- Real-device Safari/PWA keyboard behavior remains a recommended manual check before the next external test.
- Transparent Buddy assets still have slightly different internal padding; CSS bounds now limit the visible inconsistency.

2026-07-14 — Buddy Care+ full audit and hardening
- Current task: audit the existing Care+ architecture, reproduce defects, apply targeted P0/P1 and low-risk P2 fixes, add regression coverage, and validate mobile/reload/accessibility behavior.
- Initial inventory confirms Care+ uses the existing `src/buddy-care/state.js` canonical state, `storage.js` save normalization, `app.js` render/actions, `index.html` shell, shared `styles.css`, locale JSON files, and focused `test/buddy-care-*.test.js` coverage.
- Implemented targeted hardening for persisted active-plant selection, unique daily-check/diary ids, same-day check updates, defensive date/height validation, and downgrade-safe read-only plant handling.
- Consolidated the supported Free/Test access presentation, isolated the four Care+ views with `hidden`/`inert`/ARIA state, and converted the age gate into a modal focus/scroll lock with explicit focus return.
- Made Plants list, setup, plant detail, and daily check mutually exclusive subviews so inactive sections no longer retain layout space or duplicate main headings.
- Added localized inline form errors and terminology parity for de/en/es; the i18n audit reports 2,566 keys per locale with no missing or extra keys.
- Added and expanded focused Care+ state, access, navigation, accessibility, validation, reload, unicode, and mobile E2E tests.
- Validation: all 19 `buddy-care*.test.js` files pass; E2E passes at 320x568, 375x667, 390x844, 393x852, 430x932, 768x1024, and 1280x800; syntax, i18n, UI architecture, and general smoke checks pass.
- Known unrelated baseline issue: `test/daily-tasks-ui-state.test.js` expects German streak copy but reproducibly receives `Daily Streak 3`; this remains outside the Care+ change scope.

2026-07-15 — Buddy Care+ local intelligence system
- Current approved task: evolve Care+ into a deterministic, local, context-aware plant coach without external AI.
- Preserve the existing Care+ save/access/UI architecture and all uncommitted user changes.
- Initial analysis: `state.buddyCare` is canonical; `state.js` owns normalization, `storage.js` persistence, and `app.js` the Care+ view model/render path.
- Planned additive modules: context, robust trends, weighted causes, safety/priority, targeted questions, action/effect tracking, plant patterns, and insight orchestration.
- Do not change Free/Test plant limits, user/auth/premium behavior, service worker, or unrelated simulation systems.
- Phase A complete:
  - bumped only the Care+ slice to version 3 and added a versioned `intelligence` substate
  - added defensive normalization for actions, question answers, insights, and plant patterns
  - preserved unknown legacy Care+ fields while normalized canonical fields remain authoritative
  - added state mutation/read APIs for insight, action, and question persistence
  - targeted state/migration tests pass
- Phases B-D complete:
  - added pure context, robust multi-check trend, cause scoring, priority, question, action/effect, plant-pattern, safety, and insight modules
  - covered worsening/improving/stable/unknown trends, recurring moisture, contradictions, overdue checks, watering-demand shifts, frequent interventions, and action outcomes
  - persisted question answers, confirmed/performed actions, effect outcomes, latest insights, and median-based plant patterns
- Phase E integrated:
  - Today and plant detail now use one intelligence-fed main priority with legacy task fallback
  - added compact targeted question, explicit action confirmation/completion, effect control, and “Warum zeigt Buddy das?” details
  - added matching DE/EN/ES copy and mobile styles
  - focused 390x844 Playwright screenshots reviewed for wet-root and effect-control states
- Phase F regression and closeout complete:
  - all 25 focused `buddy-care*.test.js` files pass, including migration, access limits, daily checks, diary, weekly review, navigation, UI, intelligence, reload, and effect-loop coverage
  - syntax, i18n parity (2,691 keys per locale), UI architecture, guest-name resolution, and UTF-8 regression checks pass
  - the final 390x844 action/effect flow was rerun and visually reviewed with one clear primary priority
  - generated QA screenshots were removed after inspection and the local test server was stopped

Open item:
- `test/guest-mode-startup.test.js` still fails before Care+ renders because its expected first-day seedling hero class is absent; this is reproducible in isolation and was not changed because it is outside the Care+ scope.

2026-07-15 — Buddy Care+ local photo documentation
- Current approved task: add fully local, privacy-friendly plant photos without image analysis, cloud upload, or image data in the normal Care+ snapshot.
- Required architecture: small photo IDs only in Care+ state; metadata and blobs in an isolated, versioned IndexedDB with local canvas re-encoding.
- Integration scope: primary plant photo, up to three Daily Check photos, up to five diary photos, per-plant photo history, same-plant comparison, deletion/reset cleanup, DE/EN/ES copy, mobile/PWA QA.
- Existing dirty-tree changes are user-owned and must be preserved.

2026-07-15 — Buddy Care+ external free-test stabilization
- Reproduced the baseline: all 25 `buddy-care*.test.js` files passed; only `guest-mode-startup.test.js` failed at the first-day seedling hero contract.
- Root cause confirmed as runtime integration drift: seedling-specific CSS and test coverage existed, while the overlay markup still used the base class and old leaf-only asset.
- Restored the intended existing seedling hero class, image class, and aligned `frame_006.png` asset without weakening the test.
- Extended the guest startup flow to prove neutral Care+ copy, no login gate, no blocking first-day overlay, and Care+ reachability.
- The extended test exposed and now covers a missing persist on Care+ close; Home is saved before an immediate reload, keeping the first-day teaser intact.
- `guest-mode-startup.test.js` now passes.
- Added deterministic multi-day Care Intelligence coverage for stable, wet, dry, light discoloration, successful action, failed action, contradictory data, overdue checks, and three-plant isolation.
- Calibrations are evidence-driven and covered by the new multi-day test:
  - rapid contradictory moisture reports now request one moisture recheck instead of staying silent
  - stale moderate concerns are capped at `today` unless a current rapid-risk signal still exists
  - new `urgent_check` evidence now outranks an older due effect review while the review remains available
- Mobile matrix passed at 390x844, 375x667, 360x800, 430x932, and 768x1024 for the full Care+ flow and the intelligence action/effect loop.
- Raised only Care+ question/effect option targets from 36px to 44px after the mobile assertion exposed undersized controls.
- Corrected the fixed-width Care+ coach card on tablet/desktop viewports so its responsive layout follows the 393px app shell rather than the outer viewport; 768x1024 clipping is now covered and visually rechecked.
- PWA/persistence validation passed: service-worker shell assets, online-to-offline persistent-context reopen, offline availability of all Care Intelligence modules, schema-3 normalization, old-save migration, and partial intelligence defaults.
- Final targeted regression passed:
  - all 26 `buddy-care*.test.js` files
  - `guest-mode-startup.test.js`
  - syntax, i18n parity (2,691 keys per locale), UI architecture, neutral display-name resolution, UTF-8, and `git diff --check`
- Existing test screenshots were visually reviewed at 375x667, 360x800, and 768x1024; generated artifacts were removed after review and the local dev server was stopped.

Remaining real-device checks:
- iOS Safari/PWA virtual-keyboard resize, safe-area behavior on a notched device, install/add-to-home-screen flow, and touch feel still require physical-device confirmation.

2026-07-15 — Buddy Care+ local photo documentation complete
- Added an isolated IndexedDB photo database with atomic metadata/blob writes, plant/source indexes, primary-photo handling, targeted deletion, full reset, and orphan maintenance.
- Added local JPEG/PNG/WebP validation and canvas re-encoding: 15 MB input limit, 1600 px maximum long edge, WebP preferred with JPEG fallback, adaptive quality/size control, no upscaling, and source EXIF payload removal.
- Integrated camera/gallery inputs, draft previews/categories/notes, three Daily Check photos, five journal photos, optional plant primary photos, per-plant history, detail actions, and same-plant before/after comparison.
- Care+ state is version 4 and stores only small photo references plus the one-time privacy-notice flag; existing saves receive defensive defaults.
- Added cleanup for photo, journal, Daily Check, plant, orphan, and full-Care reset paths. Object URLs are revoked across replacement, removal, modal close, plant change, and rerender.
- Added DE/EN/ES copy, a persistent local-storage privacy note in More, and a real-device checklist in `docs/qa/BUDDY_CARE_PHOTO_DEVICE_CHECKLIST.md`.
- Validation passed: all 30 `buddy-care*.test.js` files, the four dedicated photo tests, syntax, i18n parity (2,748 keys per locale), UI architecture, guest startup, offline boot, and smoke checks.
- Photo E2E passed at 390x844, 375x667, 430x932, and 768x1024; service-worker-controlled online-to-cold-offline reopen, load, compare, delete, and second offline reopen passed.
- Visual gallery/comparison screenshots were reviewed at the required viewports and removed after inspection. No physical iPhone or Android tests were claimed.
- Known unrelated runtime-suite baselines remain: `daily-tasks-ui-state.test.js` receives `Daily Streak 3`; `coin-shop-runtime-fix.test.js` lacks visible unavailable-service feedback. Both are outside Care+ photo scope.

2026-07-15 - Buddy Care+ photo readback stabilization
- Current approved task: end-to-end debug and stabilize the existing fully local Care+ photo flow without backend, login, cloud sync, or image data in normal localStorage.
- Baseline: model, IndexedDB/blob, and offline reopen tests pass; the real photo E2E fails during profile-photo selection before `primaryPhotoId` is set.
- Initial render audit found that every Care+ render revokes all persisted photo object URLs and hydrates images sequentially, so a later render can cancel visible-image readback.
- Next: capture the concrete profile-upload error, fix the smallest proven storage/render causes, then strengthen visible-image, rerender, reload, offline, comparison, and mobile assertions.
- Root cause confirmed in the readback/render layer: all persisted object URLs were revoked at the start of every hydration, images were loaded sequentially, and a newer render invalidated the in-flight generation. Care+ opening also triggered redundant asynchronous full rerenders that could replace photo inputs and loaded nodes.
- Storage now accepts only real non-empty JPEG/PNG/WebP blobs, stores an explicit blob record, atomically writes metadata/blob, and verifies both records by matching photo ID and byte size after commit.
- Photo hydration now loads in parallel, manages URLs per visible render slot, waits for actual decode, rejects stale generations, revokes only replaced/removed slots, and exposes a localized controlled missing-photo state.
- Strengthened E2E coverage proves profile replacement/removal, Daily Check, diary edit retention, gallery, detail, comparison, plant switching, rerender, reload, localStorage privacy, missing-blob fallback, and object-URL cleanup.
- Offline persistent-context coverage now proves two decoded local `blob:` sources in the comparison after a cold offline reopen, followed by deletion and a second offline reopen.
- Visual checks passed at 390x844, 375x667, 360x800, 430x932, and 768x1024 with no horizontal overflow.
- Validation passed: all 30 Buddy Care tests, syntax, i18n parity, UI architecture, service-worker shell, offline boot, guest startup, and smoke suite.
- Unrelated baseline failures remain unchanged: `daily-tasks-ui-state.test.js` expects German streak copy but receives `Daily Streak 3`; `coin-shop-runtime-fix.test.js` expects unavailable-service feedback.
- A final repeated E2E run exposed the native file-picker race directly: full Care+ rerenders could replace the file input before its `change` event. Care+ now pauses rerendering only while the camera/gallery picker is active and unlocks on selection, focus return, close, or timeout; five consecutive photo E2E runs passed.
- Diary composer/edit values are now preserved across internal Care+ rerenders, preventing typed notes/tags/height from being lost while a photo is processed; the E2E test asserts the pre-photo diary note reaches the saved entry.
- The full upload/save/profile replacement/Daily Check/diary/gallery/detail/compare/delete/reload/missing-blob flow passed with each required initial viewport: 390x844, 375x667, 360x800, 430x932, and 768x1024.
