# Buddy Home Daily Asset Integration Report

## Welche Dateien gelesen wurden

- `assets/buddy/transparent/buddy_asset_manifest.json`
- `src/ui/buddy/buddyVisualMap.js`
- `src/ui/buddy/buddyAssetResolver.js`
- `app.js`
- `styles.css`
- `src/gameplay/buddyDailyCheck.js`

## Welche Dateien geaendert / erstellt wurden

- `src/ui/buddy/buddyVisualMap.js`
- `app.js`
- `styles.css`
- `docs/buddy/buddy-home-daily-asset-integration-report.md`

## Welche Home-/Daily-Stelle angebunden wurde

- Der bestehende Home-/Retention-Teaser im Player-Card-Bereich
- Konkret die Renderstelle `homeMetaRetentionTeaserNode` in `app.js`
- Kein Umbau des Mission-Sheets und kein Eingriff in Daily-Task- oder Coin-Action-Logik

## Welche Kategorien gemappt wurden

- `stable_day`
- `water_focus`
- `stress_focus`
- `risk_focus`
- `timeboost_safe`
- `routine_focus`
- `mission_focus`
- `reward_focus`
- `coin_tip`
- `default`

## Welche Assets verwendet werden

Beispiele der aktiven Home-/Daily-Auswahl:

- `stable_day` -> `buddy_emotion_proud_confident_stance_v001`, `buddy_emotion_happy_big_smile_v001`
- `water_focus` -> `buddy_gameplay_watering_can_ready_v001`, `buddy_gameplay_watering_can_motivated_v001`
- `stress_focus` -> `buddy_emotion_worried_hand_to_chin_v001`, `buddy_emotion_confused_head_scratch_v001`
- `risk_focus` -> `buddy_emotion_surprised_hands_out_v001`, `buddy_emotion_worried_hand_to_chin_v001`
- `timeboost_safe` -> `buddy_emotion_happy_cheering_fists_v001`, `buddy_emotion_happy_raised_hands_v001`
- `mission_focus` -> `buddy_gameplay_clipboard_wave_v001`, `buddy_gameplay_pointing_up_instruction_v001`
- `reward_focus` -> `buddy_emotion_happy_cheering_fists_v001`, `buddy_emotion_proud_confident_stance_v001`, `buddy_reward_coins_celebrating_v001`
- `coin_tip` -> `buddy_gameplay_clipboard_presenting_blank_v001`, `buddy_emotion_confused_head_scratch_v001`

## Welche Fallbacks existieren

- Wenn der Buddy-Resolver nicht verfuegbar ist, bleibt die bisherige Teaser-Darstellung ohne neues Buddy-Bild bestehen.
- Wenn kein Mapping passt, faellt die Auswahl auf neutrale / positive Manifest-Assets zurueck.
- Wenn ein aufgeloester Bildpfad nicht laedt, springt das Bild automatisch auf `assets/ui/care-studio/buddy/care-buddy-base.png`.
- Wenn Manifest oder Fetch ausfallen, bleibt die App stabil und nutzt den bestehenden Fallback-Pfad.

## Welche Stellen bewusst nicht geaendert wurden

- Save-System
- Simulation / Balance
- `src/gameplay/buddyDailyCheck.js` Entscheidungslogik
- Coin-Economy / Coin-Action-Mechanik
- Eventsystem V2
- Service Worker / Cache
- Missions-Completion-Logik
- Animationen
- Reward-/Shop-Presentation ausser reinem Mapping-Vorrat

## Welche Tests ausgefuehrt wurden

- `node --check app.js`
- `node --check src/ui/buddy/buddyVisualMap.js`
- `node --check src/ui/buddy/buddyAssetResolver.js`
- `node test/ui-runtime-wiring.test.js`
- `node test/ui-care-sheet-regression.test.js`
- `node test/home-core-stats-popup-regression.test.js`

## Review-Liste

Fuer Home-/Daily bewusst nicht als Basisbilder bevorzugt:

- `buddy_gameplay_nutrients_bottle_v001`
  - sichtbarer `NUTRIENT`-Text
- `buddy_reward_premium_offer_sign_v001`
  - sichtbarer `PREMIUM OFFER`-Text
- `buddy_reward_shop_voucher_v001`
  - sichtbarer `VOUCHER`-Text
- `buddy_reward_trophy_surprised_v001`
  - sichtbarer `REWARD`-Text

Unklare / spaeter feinjustierbare Faelle:

- `buddy_gameplay_magnifier_leaf_inspection_v001`
- `buddy_gameplay_magnifier_leaf_inspection_v002`
  - gut fuer Diagnose, aber im Home-Teaser schnell etwas zu spezifisch

## Empfehlung fuer naechste Phase

- Reward-/Mission-Buddy als eigene Phase
  - gezielte Visuals fuer claimable rewards, mission cards und coin actions
- Animation Controller
  - erst sinnvoll, wenn echte Frame-Sets vorliegen
- Offline Asset Cache
  - spaeter optional ueber bestehende Asset-/Cache-Strategie planen, nicht in dieser Safe-Phase
