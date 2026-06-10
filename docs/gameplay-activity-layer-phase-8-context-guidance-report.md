# Gameplay Activity Layer Phase 8 - Context Guidance Report

## Checked Areas

- Home-Teaser im Startscreen
- Missions-Sheet-Kopf `Heute im Run`
- DailyCare-Karten
- Buddy Daily Check
- Tagesentscheidung / Decision Cards
- Wochenziel / Weekly Mission
- Coin-Helfer inklusive `Recovery Snack`

## Changed Files

- `app.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/daily-tasks-ui-state.test.js`

## What Guidance Was Improved

- Decision-Card-Ergebnistexte sind jetzt klarer als naechster Schritt formuliert und erklaeren besser, ob ein DailyCare-Fokus oder nur eine optionale Guidance gemeint ist.
- Die Hinweiszeilen unter Decision Cards wurden von generischem `Naechster Schritt` / `Passt dazu` auf direktere Spielerfuehrung umgestellt.
- Weekly-Mission-Beschreibungen betonen staerker, dass Fortschritt ueber bestehende DailyCare-Abschluesse und Claims entsteht.
- Coin-Action-Texte machen jetzt klarer unterscheidbar:
  - reine Guidance (`Buddy Extra Tip`, `Safe Boost Check`)
  - echter Claim-Bonus (`Daily Focus Boost`)
  - reiner Weekly-Fortschritt ohne neues Rewardsystem (`Weekly Push`)
- `Recovery Snack` erklaert deutlicher, dass er bewusst noch gesperrt ist und in dieser Phase keinen aktiven Effekt hat.
- Buddy-Variante `daily_task_hint` verbindet die heutige Reihenfolge jetzt expliziter mit dem Weekly-Kontext.

## Home Hint

- Ja. Der Home-Teaser zeigt jetzt einen sehr kurzen Zusatzhinweis aus bestehendem `retention`-State.
- Prioritaet:
  1. offene Tagesentscheidung
  2. beantwortete Tagesentscheidung mit Fokus-/Action-Hinweis
  3. aktives Wochenziel
- Es wurde keine neue Authority, kein neuer Save-Pfad und kein Startup-Overlay eingefuehrt.

## i18n Changes

- Neue kurze Retention-Kontexttexte in `de/en/es`:
  - offene Tagesentscheidung
  - beantwortete Tagesentscheidung mit Fokus
  - beantwortete Tagesentscheidung mit optionalem Helfer
  - Weekly-Hinweis
- Bestehende Texte in `de/en/es` wurden fuer Buddy, Weekly, Coin Actions und Decision Cards sprachlich verdichtet und auf Mobile kuerzer bzw. direkter gemacht.
- Keine hardcodierten neuen UI-Texte eingefuehrt.

## Mobile QA

- Leichte viewport-basierte Sichtpruefung wurde fuer `360x740`, `390x844` und `430x932` ausgefuehrt.
- Ergebnis:
  - kein horizontaler Overflow auf Body-Ebene
  - kein horizontaler Overflow im Missions-Sheet-Container
  - Screenshots wurden als temporaere Artefakte erzeugt:
    - `tmp_phase8_360x740_home.png`
    - `tmp_phase8_360x740_sheet.png`
    - `tmp_phase8_390x844_home.png`
    - `tmp_phase8_390x844_sheet.png`
    - `tmp_phase8_430x932_home.png`
    - `tmp_phase8_430x932_sheet.png`
- Das war bewusst eine kleine Flow-Pruefung, keine vollstaendige manuelle Langzeit-Visual-QA.

## Tests And Results

- `node --check app.js` - passed
- `node scripts/i18n-audit.js` - passed
- `node test/decision-cards.test.js` - passed
- `node test/coin-actions.test.js` - passed
- `node test/weekly-missions.test.js` - passed
- `node test/buddy-daily-check.test.js` - passed
- `node test/daily-care-selection.test.js` - passed
- `node test/daily-tasks-runtime.test.js` - passed
- `node test/daily-tasks-ui-state.test.js` - passed
- `node test/guest-mode-startup.test.js` - passed
- `node test/storage-profile-run-migration.test.js` - passed
- `node test/reward-runtime-modes.test.js` - passed

## Known Limits

- Phase 8 fuehrt bewusst keine neue Mechanik ein. Decision Cards bleiben Guidance-only und veraendern die Simulation nicht.
- Der Home-Hinweis ist absichtlich sehr kurz und priorisiert nur Decision-/Weekly-Kontext. Er ersetzt keine ausfuehrliche Missions-Erklaerung.
- Die Mobile-QA pruefte Layout-Stabilitaet und Overflow, aber nicht jede moegliche Tages-/Phasen-Kombination manuell.

## Recommendation For Next Step

- Ein sinnvoller naechster Schritt waere eine kleine Phase 8.5 oder 9 fuer Copy-Konsistenz und Langzeit-QA:
  - feineres Tuning einzelner Buddy-/Decision-Varianten je Pflanzenphase
  - kurze manuelle Mehrtages-QA fuer Home-Teaser, Missions-Sheet und Reloads
  - nur weiter auf bestehendem `retention`-Layer, ohne neue Authority
