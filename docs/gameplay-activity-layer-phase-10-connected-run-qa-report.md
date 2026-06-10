# Gameplay Activity Layer Phase 10 - Connected Run QA

## Ziel

Phase 10 prueft den bestehenden Gameplay Activity Layer als verbundenen 7-Tage-Loop. Fokus war nicht neue Funktionalitaet, sondern Flow, Wiederholung, Copy, Balance, Reload-Sicherheit und Mobile-Lesbarkeit.

## Gepruefte 7-Tage-Sequenz

Die Haupt-QA laeuft jetzt reproduzierbar in `test/gameplay-activity-connected-run-qa.test.js`.

### Tag 1 - `2026-06-11`

- Phase: `seedling`
- DailyCare: `seedling_moisture_round`, `seedling_stability_check`, engagement-orientierter Dritttask
- Buddy: `water_focus`
- Decision Card: `water_low`
- Weekly: `stable_start`
- Coin-Helfer: `safe_boost_check` verfuegbar
- Eindruck: sinnvoller Einstieg, Wasserlage und Guidance passen zusammen

### Tag 2 - `2026-06-12`

- Phase: `seedling`
- DailyCare: ruhiger Stabilitaets-Tag ohne Vollwiederholung vom Vortag
- Buddy: stabiler Seedling-Kontext
- Decision Card: bewusst keine
- Weekly: `stable_start` bleibt aktiv
- Coin-Helfer: `safe_boost_check` nicht verfuegbar
- Eindruck: guter Ruhe-Tag, Weekly-Kontext traegt den Flow

### Tag 3 - `2026-06-13`

- Phase: `vegetative`
- DailyCare: Wachstums-/Versorgungsfokus
- Buddy: passender Veg-Kontext
- Decision Card: beantworteter Task-Fokus (`answered_with_task`)
- Weekly: weiter `stable_start`
- Coin-Helfer: normale Daily-/Weekly-Helfer, kein aufdringlicher Safe-Boost
- Eindruck: beantwortete Tagesentscheidung fuehrt sauber zur Fokus-Aufgabe

### Tag 4 - `2026-06-14`

- Phase: `stretch`
- DailyCare: Stress-/Routine-Kontext
- Buddy: Stresslage statt generischer Risiko-Hinweise
- Decision Card: situativ moeglich, aber nicht erzwungen
- Weekly: `stable_start` wird in dieser Woche verstaendlich abschliessbar
- Coin-Helfer: `safe_boost_check` bleibt aus
- Eindruck: Druck fuehlt sich lesbar an, ohne den Spieler mit Tempo-Hinweisen zu stoeren

### Tag 5 - `2026-06-15`

- Phase: `flowering`
- DailyCare: Bluete-Fokus
- Buddy: Bloom-Kontext statt Risiko-Uebergewicht
- Decision Card: keine Fehlleitung durch reine Praeventiv-Tasks
- Weekly: Wochenwechsel auf `bloom_focus`
- Coin-Helfer: gekaufter `safe_boost_check` bleibt als `used` stabil
- Eindruck: Wochenwechsel ist nachvollziehbar, neue Woche fuehlt sich anders an

### Tag 6 - `2026-06-16`

- Phase: `flowering`
- DailyCare: Risiko-/Druck-Tag
- Buddy: Risiko-Kontext
- Decision Card: `risk_focus`
- Weekly: `bloom_focus`
- Coin-Helfer: Guidance bleibt vorhanden, aber die Decision Card traegt die Prioritaet
- Eindruck: echter Hochrisiko-Tag bekommt jetzt verlaesslich die passende Karte

### Tag 7 - `2026-06-17`

- Phase: `ripening`
- DailyCare: ruhiger spaeter Phasen-Kontext
- Buddy: kein monotones Wiederholen vom Vortag
- Decision Card: `timeboost_choice`
- Weekly: `bloom_focus` mit lesbarem Fortschritt
- Coin-Helfer: `safe_boost_check` wieder sinnvoll verfuegbar
- Eindruck: Abschluss der Sequenz fuehrt logisch in einen vorsichtigen Zeit-/Abschluss-Kontext

## Gefundene Wiederholungen

- Keine komplette 3er-Task-Wiederholung an aufeinanderfolgenden Tagen.
- Buddy-Texte wiederholen sich im 7-Tage-Lauf nicht wortgleich an benachbarten Tagen.
- Buddy-Kategorien bleiben in der QA-Sequenz bei maximal 2 gleichen Tagen in Folge.

## Gefundene Widersprueche

Vor den Korrekturen gab es drei auffaellige Punkte:

1. Eine stabile Bluete-Situation konnte durch rein praeventive Bloom-Tasks in `risk_focus` kippen.
2. Ein echter Hochrisiko-Tag konnte durch Decision-Card-Repeat-Penalty seine passende Risikokarte verlieren.
3. `safe_boost_check` war ueber zu viele Tage sichtbar und wirkte dadurch zu pushy.

Diese Punkte sind in Phase 10 gezielt korrigiert worden.

## Balance-Einschaetzung

- DailyCare-Rotation ist ueber 7 Tage ausreichend abwechslungsreich fuer ein MVP.
- Buddy bleibt funktional und dekoriert den Loop nicht nur.
- Decision Cards wirken situationsbasiert statt zufaellig, solange Risiko wirklich hoch oder Wasser/Tempo logisch relevant sind.
- Weekly Progress bleibt ueber Tages-Claims nachvollziehbar.
- Coin-Helfer bleiben klar lesbar und nicht zu stark; `safe_boost_check` wirkt nach der Eingrenzung deutlich kontrollierter.

## Geaenderte Dateien

- `src/gameplay/decisionCards.js`
- `src/gameplay/coinActions.js`
- `test/decision-cards.test.js`
- `test/coin-actions.test.js`
- `test/daily-tasks-runtime.test.js`
- `test/gameplay-activity-connected-run-qa.test.js`

## Konkrete Korrekturen

### Decision Cards

- `risk_focus` wird nicht mehr allein durch praeventive Bloom-Tasks wie `flower_mold_watch` aktiviert.
- Hochrisiko-Signale bekommen mehr Gewicht, damit echte Risiko-Tage die passende Karte trotz Repeat-Schutz behalten.
- `stress_elevated` und `water_low` wurden leicht in der Priorisierung geschaerft, damit klare Tageslagen stabiler aufgeloest werden.

### Coin-Helfer

- `safe_boost_check` ist jetzt nur noch verfuegbar, wenn ein Zeit-/Tempo-Kontext wirklich vorliegt:
  - passender DailyCare-Task oder
  - Buddy-Kategorie `timeboost_safe` / `timeboost_unsafe`

### Tests

- Neue Connected-Run-QA ueber 7 Tage abgesichert.
- Decision-Card-Tests decken jetzt stabile Bloom-Tage und High-Risk-Override gegen Repeat-Penalty ab.
- Coin-Action-Tests decken jetzt situative `safe_boost_check`-Verfuegbarkeit ab.
- Daily-Runtime-Test wurde an den strengeren Time-Context fuer `safe_boost_check` angepasst.

## i18n-Aenderungen

- Keine neuen i18n-Keys in Phase 10.
- `node scripts/i18n-audit.js` bleibt gruen.

## Mobile-QA

Zusatz-Smoke fuer betroffene Home-/Missionen-Flows ausgefuehrt:

- Viewports: `360x740`, `390x844`, `430x932`
- Gepruefte Zustaende:
  - stabiler Seedling-/Weekly-Kontext
  - beantwortete Decision-Card im Veg-Flow
  - offene Risiko-Decision in der Bluete

Ergebnis:

- kein horizontaler Overflow im Home- oder Missions-Kontext
- Missions-Sheet bleibt innerhalb der Viewport-Hoehe bedienbar
- DailyCare-, Decision-, Weekly- und Coin-Abschnitte bleiben lesbar

## Tests und Ergebnisse

- `node --check app.js` - passed
- `node --check storage.js` - passed
- `node --check src/gameplay/dailyCareSelection.js` - passed
- `node --check src/gameplay/buddyDailyCheck.js` - passed
- `node --check src/gameplay/weeklyMissions.js` - passed
- `node --check src/gameplay/coinActions.js` - passed
- `node --check src/gameplay/decisionCards.js` - passed
- `node --check test/gameplay-activity-multiday-balance.test.js` - passed
- `node --check test/gameplay-activity-connected-run-qa.test.js` - passed
- `node scripts/i18n-audit.js` - passed
- `node test/gameplay-activity-multiday-balance.test.js` - passed
- `node test/gameplay-activity-connected-run-qa.test.js` - passed
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

## Bekannte Grenzen

- Die 7-Tage-QA bleibt ein reprasentativer Testlauf, kein kompletter Simulations-Volltest ueber alle Pflanzenphasen und Event-Kombinationen.
- Mobile-QA war bewusst ein Smoke auf Home-/Missions-Flows, keine vollstaendige visuelle Dauer-QA.
- Phase 10 fuehrt keine neuen Texte oder Mechaniken ein; offene Feinheiten liegen daher eher in spaeterer Copy-Kalibrierung als in Systemluecken.

## Empfehlung

Der Gameplay Activity Layer kann auf MVP-Niveau als abgeschlossen gelten.

Eine weitere Mini-Korrektur ist nicht zwingend noetig. Der naechste sinnvolle Schritt waere nur noch eine spaetere, klar getrennte Feinkalibrierung von Copy und Situationsgewichtung, nicht mehr ein struktureller Eingriff in den Layer.
