# Gameplay Activity Layer Phase 9 - Multi-Day QA & Balance Report

## Gepruefte Tage, Phasen und Situationen

- Run-Start / Seedling
- Veg / stabil
- Stretch / Stress erhoeht
- Flower / stabil
- Flower / Risiko erhoeht
- Ripening / stabil
- Wasser niedrig
- aktive Weekly Mission
- offene Decision Card
- Coin Action gekauft
- Reload nach Restore / Guest-Mode

## QA-Matrix

| Situation | DailyCare | Buddy | Decision Card | Weekly | Coin-Helfer | Ergebnis |
| --- | --- | --- | --- | --- | --- | --- |
| Run-Start / Seedling | seedling-lastige Basics | wasser- oder phase-passend | `water_low` bei Feuchte-Druck | `stable_start` | verfuegbar, klein | stimmig |
| Veg / stabil | Veg-Tasks + Engagement | jetzt phase-fokussiert statt Naehrstoff-Rauschen | `growth_routine` | `growth_focus` | klar lesbar | verbessert |
| Stretch / Stress hoch | Druck-Task + Veg + Engagement | `stress_focus` | jetzt `stress_elevated` statt pauschal `risk_focus` | `risk_reset` | unveraendert | verbessert |
| Flower / stabil | Bloom-Tasks + Engagement | jetzt `bloom_focus` statt generischem Task-/Risiko-Drift | bloom-passend oder keine harte Card | `bloom_focus` | unveraendert | verbessert |
| Flower / Risiko hoch | Druck-/Bloom-Task | `risk_focus` | `risk_focus` | `risk_reset` | unveraendert | stimmig |
| Ripening / stabil | Ripening-Tasks | `bloom_focus` oder `timeboost_safe` | situativ | `bloom_focus` | unveraendert | stimmig |
| Wasser niedrig | Wasser-Task + Phase + Engagement | `water_focus` | jetzt wieder `water_low` | nicht mehr unnoetig `risk_reset` | unveraendert | verbessert |
| Reload nach Restore | bestehende Authoritys bleiben | inline | reload-sicher | reload-sicher | reload-sicher | Guest-Mode stabil |

## Gefundene Wiederholungsprobleme

- Buddy driftete auf ruhigen Veg-Tagen zu schnell in `nutrient_focus`, nur weil `veg_feed_support` im Task-Set lag.
- Buddy driftete auf stabilen Tagen mit `open_app_twice` zu leicht in `timeboost_safe`.
- Bloom-Tage mit praeventiven Analyse-Tasks kippten zu schnell in `risk_focus`.
- Weekly-Mission `risk_reset` sprang schon bei reinem Wasser-Druck oder praeventivem `flower_mold_watch` an.
- Decision Cards kippten ueber `weekly.missionId === risk_reset` zu leicht auf `risk_focus`, obwohl die Tageslage eher Stress als Risiko war.

## Gefundene Copy-/Guidance-Probleme

- Die groessten Guidance-Probleme waren weniger fehlende Texte als falsche Kontext-Zuordnung:
  - Buddy-Kommentar und Primary Task passten nicht immer sauber zusammen
  - Weekly-Risiko-Kontext konnte die Tagesentscheidung uebersteuern
- Sichtbare generische Fallbacks im Activity-Layer wurden in dieser Phase nicht neu gefunden.

## Gefundene Balance-Probleme

- `risk_reset` war als Weekly-Mission etwas zu aggressiv in der Auswahl.
- Decision-Card-Prioritaet fuer `risk_focus` war zu breit, weil Weekly-Kontext die Tageslage ueberlagern konnte.
- Coin-Kosten und Coin-Staerke wirkten im Test weiterhin grob passend:
  - `Daily Focus Boost` bleibt bei `+8` fuer `24` Coins
  - `Weekly Push` bleibt bei `+1` Weekly-Task fuer `28` Coins
  - Guidance-only-Aktionen bleiben klar klein

## Geaenderte Dateien

- `app.js`
- `src/gameplay/buddyDailyCheck.js`
- `src/gameplay/weeklyMissions.js`
- `src/gameplay/decisionCards.js`
- `test/buddy-daily-check.test.js`
- `test/weekly-missions.test.js`
- `test/decision-cards.test.js`
- `test/gameplay-activity-multiday-balance.test.js`
- `docs/gameplay-activity-layer-phase-9-multiday-qa-balance-report.md`

## Konkrete Korrekturen

- `weeklyMissions.js`
  - `risk_reset` reagiert nicht mehr auf reinen `water_recovery_round`
  - `risk_reset` reagiert nicht mehr auf praeventiven `flower_mold_watch` allein
- `buddyDailyCheck.js`
  - phasenbezogene Kategorien werden jetzt vor generischem Timeboost-/Task-Hint priorisiert
  - `veg_feed_support` triggert nicht mehr automatisch `nutrient_focus`
  - pro Kategorie wird die Primary Task jetzt gezielter passend ausgewaehlt
  - `risk_focus` reagiert nicht mehr auf praeventiven Bloom-Watch allein
- `decisionCards.js`
  - `weekly.risk_reset` erzwingt nicht mehr automatisch die `risk_focus`-Karte
- Tests
  - neue Mehrtages-/Balance-Matrix
  - neue Guardrails fuer Buddy-, Weekly- und Decision-Konflikte
- `app.js`
  - Restore-Suppress-Guard fuer passive Mission-Reward-Dialoge bei Guest-Reload von `15s` auf `30s` erweitert, damit Startup-/Reload-Jitter nicht wieder blockierende UI oeffnet

## Tests und Ergebnisse

- `node --check app.js` - passed
- `node --check storage.js` - passed
- `node --check src/gameplay/dailyCareSelection.js` - passed
- `node --check src/gameplay/buddyDailyCheck.js` - passed
- `node --check src/gameplay/weeklyMissions.js` - passed
- `node --check src/gameplay/coinActions.js` - passed
- `node --check src/gameplay/decisionCards.js` - passed
- `node --check test/gameplay-activity-multiday-balance.test.js` - passed
- `node scripts/i18n-audit.js` - passed
- `node test/gameplay-activity-multiday-balance.test.js` - passed
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

## Mobile-QA-Ergebnisse

- Viewports geprueft:
  - `360x740`
  - `390x844`
  - `430x932`
- Gepruefter Kontext:
  - Home-Teaser
  - Missions-Sheet
- Ergebnis:
  - kein horizontaler Overflow auf Body-Ebene
  - kein horizontaler Overflow im Missions-Sheet-Container
- Diese QA war leichtgewichtig und flow-orientiert, keine vollstaendige visuelle Langzeit-QA.

## Bekannte Grenzen

- Phase 9 fuehrt bewusst keine neue Mechanik ein. Decision Cards bleiben guidance-only.
- Die QA-Matrix ist stark genug fuer Guardrails, aber keine vollstaendige Simulation aller moeglichen Tageskombinationen.
- Coin-Balance wurde grob geprueft, nicht mit einer langen oekonomischen Telemetrie-Serie.

## Empfehlung fuer den naechsten Schritt

- Sinnvoll waere als naechstes eine kleine Phase 10 fuer gezielte Langzeit-Politur:
  - 5-7 simulierte Ingame-Tage als zusammenhaengender QA-Run
  - feinere Buddy-/Decision-Copy fuer einzelne Bloom-/Ripening-Lagen
  - weiter ohne neue Authority, nur auf bestehendem `retention`-Layer
