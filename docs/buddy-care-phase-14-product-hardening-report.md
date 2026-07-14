# Buddy Care+ Phase 14 Product Hardening Report

## 1. Behobene P1-Findings

- Buddy Care+ bleibt jetzt auch im First-Run-Kontext erreichbar.
- Nichtkritische Simulator-Dialoge werden waehrend eines aktiven Buddy-Care-Screens gezielt zurueckgestellt und nach dem Schliessen wieder sauber gezeigt.
- Sichtbare Phase-, MVP-, Dev- und Mock-Copy wurde im Buddy-Care-Bereich durch produktreife Testzugang-Copy ersetzt.
- "Heute wichtig" bleibt der klare erste Anker, waehrend Trend-, Verlauf-, Tagebuch- und Wocheninhalte primaer im Detailbereich liegen.
- Pflanzenkarten wurden deutlich reduziert und fokussieren jetzt auf Name, Phase/Tag, Status, Checkzustand und CTA.
- Ungueltige Pflanzenprofile und verwaiste Buddy-Care-Daten werden bei der Normalisierung sicher abgefangen.
- Downgrade von `care_plus_mock` auf `free` loescht keine Pflanzen mehr automatisch; zusaetzliche Pflanzen bleiben gespeichert und werden read-only behandelt.
- Tagebuch-Loeschen fordert jetzt eine bestaetigte Nutzerentscheidung an, bevor etwas entfernt wird.

## 2. Behobene P2-Findings

- Buddy-Assets wurden in der Buddy-Care-Oberflaeche etwas kompakter gesetzt, damit sie mobil weniger Platz verdrängen.
- CTA-Wording wurde vereinheitlicht: `Tagescheck starten`, `Tagescheck ansehen`, `Details oeffnen`, `Testzugang aktivieren`, `Testzugang ansehen`.
- Free-/Care+-Abgrenzung liest sich jetzt wie ein Produktzustand statt wie ein Entwicklungszustand.
- Der Saisonpass-/Testzugang-Bereich wirkt ruhiger und vermeidet interne Readiness-Hinweise im sichtbaren UI.

## 3. Verbleibende Risiken

- Der volle `npm test`-Lauf wurde in Phase 14 nicht erneut gestartet, weil ein bekannter fremder Fehler in `daily-tasks-ui-state.test.js` den Buddy-Care-Block unnoetig verfälschen kann.
- Die Browser-E2E prueft die Loesch-Bestaetigung als erforderlichen Zwischenschritt plus Abbruchpfad; die eigentliche Datenentfernung ist zusaetzlich im State-Test abgesichert, aber nicht als separater Browser-Confirm-Pfad reproduziert.
- Der i18n-Audit meldet weiterhin viele heuristisch ungenutzte Keys im Gesamtprojekt; fuer Buddy Care wurden keine fehlenden Keys gefunden.
- Interne Entitlement-Namen wie `care_plus_mock` bleiben bewusst im Code und in der Persistenz erhalten. Das ist fuer den externen Gratis-Test okay, spaeter aber ein Kandidat fuer abstraktere Produktbenennung.

## 4. Getestete Flows

- Buddy Care aus aktivem First-Run-/Overlay-Kontext oeffnen
- Age Gate akzeptieren
- 1 Pflanze im Free-Zugang anlegen
- gesperrten Slot oeffnen
- Care+ Testzugang aktivieren
- 2. und 3. Pflanze anlegen
- Tagescheck oeffnen und speichern
- Detailbereich oeffnen
- manuellen Tagebucheintrag anlegen
- Tagebuch-Loeschen mit Bestaetigungsdialog pruefen
- Reload und erneutes Oeffnen von Buddy Care
- Rueckkehr zum normalen Simulator und Wiederaufnahme aufgeschobener Simulator-Dialoge

## 5. Getestete Viewports

- 320 x 568
- 390 x 844
- 430 x 932
- 768 x 1024
- 1280 x 720

Ergebnis:

- kein horizontales Overflow im Buddy-Care-Screen
- Buddy-Care-Screen bleibt intern scrollbar
- Paywall/Testzugang sichtbar und bedienbar
- Heute-Ansicht, Pflanzenliste, Detailbereich, Wochenrueckblick und Tagebuch bleiben erreichbar
- untere CTAs bleiben am Scroll-Ende erreichbar
- Buddy-Groessen bleiben in den geprueften Viewports im sicheren Bereich

## 6. Save-/Migrationsverhalten

- defekte oder unvollstaendige Pflanzen werden sicher normalisiert
- doppelte Pflanzen-IDs werden dedupliziert
- ungueltige Pflanzentypen, Umgebungen und Datumswerte fallen auf sichere Defaults zurueck
- verwaiste Daily Checks, Diary Entries, Tasks und Risk Signals werden bei der Normalisierung herausgefiltert
- Entfernen einer Pflanze entfernt verknuepfte Buddy-Care-Daten derselben Pflanze konsistent
- Downgrade auf Free haelt Pflanzendaten vor, statt sie zu loeschen
- Free bleibt trotz gespeicherter Zusatzpflanzen auf einen aktiven Slot begrenzt

## 7. Testresultate

Bestanden:

- `node --check app.js`
- `node --check ui.js`
- `node --check src/buddy-care/state.js`
- `node --check src/buddy-care/featureFlags.js`
- `node --check src/buddy-care/monetizationReadiness.js`
- `node --check src/buddy-care/phaseEngine.js`
- `node --check src/buddy-care/taskGenerator.js`
- `node --check src/buddy-care/buddyAssets.js`
- `node --check src/buddy-care/riskEngine.js`
- `node --check src/buddy-care/trendEngine.js`
- `node scripts/i18n-audit.js`
- `node test/buddy-care-state.test.js`
- `node test/buddy-care-ui-shell.test.js`
- `node test/buddy-care-phase-engine.test.js`
- `node test/buddy-care-task-generator.test.js`
- `node test/buddy-care-daily-check.test.js`
- `node test/buddy-care-diary.test.js`
- `node test/buddy-care-risk-engine.test.js`
- `node test/buddy-care-trend-engine.test.js`
- `node test/buddy-care-paywall-mock.test.js`
- `node test/buddy-care-activation-onboarding.test.js`
- `node test/buddy-care-monetization-readiness.test.js`
- `node test/buddy-care-product-hardening.test.js`
- `node test/buddy-care-e2e-smoke.test.js`
- `node test/ui-runtime-wiring.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`

Nicht ausgefuehrt:

- `npm test` wegen bekanntem, Buddy-Care-fremdem Risiko im bestehenden Testblock

## 8. Klare Bewertung

- Interner Test: bereit
- Externer Gratis-Test: bereit
- Bezahlter Pilot: noch nicht bereit
