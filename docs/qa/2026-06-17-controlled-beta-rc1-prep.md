# Controlled Beta RC1 Prep

Date: 2026-06-17
Branch: `main`
HEAD: `df63ff61f31fc1aceb355e68c155338153cd04c2`

## RC Gate Results

- `node scripts/i18n-audit.js`: passed
- `npm run check:syntax`: passed
- `npm run test:smoke`: passed
- `npm run test:runtime`: passed in 539.6s
- `node test/offline-reopen-sw-boot.test.js`: passed
- `node test/guest-mode-startup.test.js`: passed
- `node test/storage-profile-run-migration.test.js`: passed
- `node test/service-worker-shell-assets.test.js`: passed

## Beta Scope

Visible:
- Guest Mode
- Onboarding / First 5 Minutes
- Home / Care Studio
- Missions / Daily / Weekly
- Event Center / Event Sheet
- Climate Controller
- Run-Summary / Harvest
- Settings / Menu
- Legal / Privacy / Impressum
- PWA Install
- Offline-Reopen

Visible with beta or optional framing:
- Cloud / Auth
- Coin-Shop
- Support / PayPal external
- Insufficient-Coins flow
- EN / ES
- Rewarded / Coins

Hide or soften before wider public beta:
- Leaderboard until preview-origin verified backend path is checked
- Remote Save as an active promise
- Coin pack direct purchase as a live feature
- EN / ES as "finished" public localization

Later native or AppStore scope:
- Store billing
- Real in-app purchases
- Native packaging
- Rewarded ad provider rollout
- Cannabis / store policy framing

## Known Risks

- Dirty worktree is not yet frozen into a reproducible RC snapshot.
- Preview-origin cloud/auth/save path is not yet validated on a real hosted beta origin.
- Local dev-origin still showed CORS or failed-fetch noise against `https://api.growsimulator.tech/api/save` in earlier QA.

## Go / No-Go

Current verdict: No-Go for final controlled beta release snapshot until:

1. RC freeze branch and commit are created from a cleaned worktree.
2. Preview-origin guest/auth/cloud save roundtrip is checked on the real hosted beta URL.

After both are complete, the current product state is a reasonable candidate for controlled Web/PWA beta.
