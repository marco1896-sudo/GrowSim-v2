# Buddy Reward / Mission Asset Integration Report

## Scope

- UI-only extension of the existing Buddy asset resolver
- No changes to mission logic, reward granting, save data, economy, event flow, or service worker behavior
- Integration limited to two mission/reward surfaces inside the existing Missions sheet

## Integrated Surfaces

1. Missions sheet Buddy hint near the daily Buddy check text
2. Weekly mission card inside the Missions sheet

## What Changed

- Added small mission/reward-specific Buddy category mappings in `src/ui/buddy/buddyVisualMap.js`
- Added `resolveMissionRewardBuddyAsset(...)` in `app.js` to translate mission UI states into existing Buddy asset candidates
- Rendered a Buddy visual next to the daily Buddy hint in the Missions sheet header area
- Rendered a Buddy visual on the weekly mission card for progress, claimable, and claimed states
- Reused the existing asset-frame hydration and fallback behavior so broken or missing Buddy assets still fall back safely
- Added minimal CSS for the new compact Buddy frames in mission UI

## State Mapping

- Header hint:
  - claimable daily tasks -> `mission_claimable`
  - finished day -> `mission_completed`
  - active hint text -> `mission_progress`
  - fallback -> `default`
- Weekly mission card:
  - `in_progress` -> `mission_progress`
  - `claimable` -> `reward_claimable`
  - `claimed` -> `reward_claimed`
  - fallback/open -> `mission_open`

## Safety Notes

- Existing text, buttons, claim handlers, analytics, and reward calculations were not changed
- Existing Buddy manifest + resolver remain the single source of truth
- Fallback path remains `assets/ui/care-studio/buddy/care-buddy-base.png` when no resolved transparent asset is available

## Verification

- `node --check app.js`
- `node --check src/ui/buddy/buddyVisualMap.js`
- `node --check src/ui/buddy/buddyAssetResolver.js`
- `node test/ui-runtime-wiring.test.js`
- `node test/home-core-stats-popup-regression.test.js`
- `node test/weekly-missions.test.js`
