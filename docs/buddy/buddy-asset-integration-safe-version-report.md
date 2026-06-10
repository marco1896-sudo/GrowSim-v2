# Buddy Asset Integration Safe Version Report

## Gelesene Dateien

- `assets/buddy/transparent/buddy_asset_manifest.json`
- `app.js`
- `src/gameplay/buddyDailyCheck.js`
- `index.html`
- `package.json`

## Geaenderte / erstellte Dateien

- `src/ui/buddy/buddyVisualMap.js`
- `src/ui/buddy/buddyAssetResolver.js`
- `index.html`
- `app.js`
- `docs/buddy/buddy-asset-integration-safe-version-report.md`

## Wie das Manifest geladen wird

- Der Loader liegt in `src/ui/buddy/buddyAssetResolver.js`.
- Das Manifest wird ueber `fetch('assets/buddy/transparent/buddy_asset_manifest.json')` mit Build-Version-Query geladen.
- Der Load ist nicht-blockierend und startet beim Script-Init.
- Wenn Manifest oder JSON nicht verfuegbar sind, bleibt die UI funktionsfaehig und faellt auf das bisherige Care-Studio-Basisbild zurueck.
- Der Loader spamt keine Fehler-Schleifen; Fetch- und Shape-Warnungen werden nur einmal ausgegeben.

## Unterstuetzte Mapping-Keys

### Care-Hints

- `careStudio.buddy.waterGoodTiming`
- `careStudio.buddy.waterTooSoon`
- `careStudio.buddy.monitorRoots`
- `careStudio.buddy.feedReady`
- `careStudio.buddy.feedTooRisky`
- `careStudio.buddy.feedLight`
- `careStudio.buddy.routineStable`
- `careStudio.buddy.stabilizeFirst`
- `careStudio.buddy.routineCareful`

### Daily-Kategorien

- `risk_focus`
- `stress_focus`
- `water_focus`
- `nutrient_focus`
- `bloom_focus`
- `seedling_veg_focus`
- `timeboost_safe`
- `timeboost_unsafe`
- `daily_task_hint`
- `stable_day`
- `fallback`

### Coin-Tip-Kategorien

- `risk`
- `stress`
- `water`
- `nutrition`
- `weekly`
- `focus`
- `fallback`

## Aktive Fallbacks

- Wenn der Resolver nicht verfuegbar ist: `assets/ui/care-studio/buddy/care-buddy-base.png`
- Wenn Manifest-Fetch fehlschlaegt: `assets/ui/care-studio/buddy/care-buddy-base.png`
- Wenn Manifest invalide ist: `assets/ui/care-studio/buddy/care-buddy-base.png`
- Wenn kein Mapping passt: zuerst neutrales Manifest-Fallback, sonst `care-buddy-base.png`
- Wenn ein aufgeloester Buddy-Pfad im DOM nicht laedt: das bestehende Care-Studio-Basisbild wird automatisch als Bild-Fallback gesetzt

## Angebundene UI-Stellen

- Care Studio Buddy-Hero in `app.js`
  - bisher statisches `CARE_STUDIO_ASSET_PATHS.buddyBase`
  - jetzt kontextabhaengige Auswahl ueber `buddyHintKey`, `riskLevel`, `overallLevel`
- Keine Daily-/Home-Teaser-Anbindung in dieser Safe-Version
  - bewusst verschoben, um keine groessere Layout-Aenderung zu erzwingen

## Bewusst nicht geaendert

- Save-/Load-Format
- `src/gameplay/buddyDailyCheck.js` Entscheidungslogik
- `src/simulation/careModel.js` Logik
- Coin-Action-Mechanik
- Eventsystem V2
- Service Worker
- CSS-Struktur des Care Studios
- Home-/Daily-Teaser-Markup

## Review-Liste fuer unklare / spaetere Assets

- `buddy_gameplay_nutrients_bottle_v001`
  - enthaelt eingebetteten `NUTRIENT`-Text
- `buddy_reward_premium_offer_sign_v001`
  - enthaelt eingebetteten `PREMIUM OFFER`-Text
- `buddy_reward_shop_voucher_v001`
  - enthaelt eingebetteten `VOUCHER`-Text
- `buddy_reward_trophy_surprised_v001`
  - enthaelt eingebetteten `REWARD`-Text
- `buddy_gameplay_magnifier_leaf_inspection_v001`
- `buddy_gameplay_magnifier_leaf_inspection_v002`
  - brauchbar fuer Diagnose, aber spaeter noch auf Produktkontext pruefen

## Empfehlung fuer naechste Phase

- Animation Controller
  - nur mit echten Frame-Sets, nicht aus Einzelposen erzwingen
- Home Buddy
  - kleine Bild-Komponente fuer Retention-/Daily-Teaser separat planen
- Reward Buddy
  - dedizierte Reward-/Shop-Integration nur nach Auswahl textfreier oder gezielt akzeptierter Reward-Assets
