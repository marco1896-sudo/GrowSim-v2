# Buddy Coin Action Asset Integration Report

## Read Files

- `app.js`
- `styles.css`
- `src/ui/buddy/buddyVisualMap.js`
- `assets/buddy/transparent/buddy_asset_manifest.json`
- `test/daily-tasks-ui-state.test.js`

## Changed / Created Files

- Changed: `app.js`
- Changed: `styles.css`
- Changed: `src/ui/buddy/buddyVisualMap.js`
- Created: `docs/buddy/buddy-coin-action-asset-integration-report.md`

## Integrated UI Surface

- `#missionsCoinActionsWrap` inside the Missions sheet
- Integration limited to the existing Coin-Action row rendering

## Mapping Keys Used / Added

- Used:
  - `coin_action_tip`
  - `coin_action_warning`
- Added:
  - `coin_action_timeboost`
  - `coin_action_reward`
  - `coin_action_default`

## Asset Usage

- `buddy_gameplay_clipboard_presenting_blank_v001`
- `buddy_gameplay_pointing_up_instruction_v001`
- `buddy_gameplay_thumbs_up_approval_v001`
- `buddy_emotion_worried_hand_to_chin_v001`
- `buddy_emotion_surprised_hands_out_v001`
- `buddy_emotion_happy_cheering_fists_v001`
- `buddy_emotion_proud_confident_stance_v001`
- `buddy_reward_coins_celebrating_v001`
- `buddy_emotion_neutral_standing_v001`
- `buddy_emotion_happy_big_smile_v001`

## Resolver / Fallback Behavior

- Uses the existing Buddy asset resolver only
- If resolver runtime is unavailable, the Coin-Action row keeps the previous text-first layout
- If no transparent Buddy asset resolves, fallback goes to the known base image:
  - `assets/ui/care-studio/buddy/care-buddy-base.png`
- If an image fails to load, the existing frame hydration falls back without changing row text or buttons

## Coin Action State Mapping

- `buddy_extra_tip` with active purchased tip -> `coin_action_tip`
- `safe_boost_check` and warning-like context -> `coin_action_warning`
- `daily_focus_boost` / `weekly_push` active context -> `coin_action_timeboost`
- reward/boost-success leaning available states -> `coin_action_reward`
- all other safe cases -> `coin_action_default`

## Intentionally Not Changed

- Save system
- Eventsystem V2
- Simulation / balance
- Mission completion logic
- Coin costs
- Reward calculation
- New coin actions
- Premium / shop flows
- Reward overlays
- Home teaser
- Care Studio
- Weekly mission card
- Service worker / cache handling

## Tests Run

- `node --check app.js`
- `node --check src/ui/buddy/buddyVisualMap.js`
- `node --check src/ui/buddy/buddyAssetResolver.js`
- `node test/ui-runtime-wiring.test.js`
- `node test/home-core-stats-popup-regression.test.js`
- `node test/weekly-missions.test.js`
- `node test/daily-tasks-ui-state.test.js`

## Review List

- Avoid broad reuse of text-bearing reward assets beyond explicit reward/celebration context
- Do not use nutrient bottle assets as generic Coin-Action hints
- `buddy_reward_coins_celebrating_v001` is acceptable for reward-like states, but should stay limited to clear reward/claim/boost-success contexts
- Tip categories from `buddyTip.category` still rely on existing category semantics; unclear future categories should default defensively

## Next Phase Recommendation

- Buddy Animation Controller concept
- Offline asset cache / service worker readiness
- Separate audit for reward/shop-specific Buddy assets before broader reuse
