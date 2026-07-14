# Buddy Care+ Phase 15 External Test Readiness Report

## 1. Umgesetzte Testvorbereitung

- externer Buddy-Care-Testmodus per Flag ergaenzt
- einmalige Test-Intro-Karte fuer den ersten Einstieg eingebaut
- kompakte Test-Checkliste mit dynamisch erkanntem Fortschritt ergaenzt
- lokales Feedbackformular mit klarer Teststruktur eingebaut
- Buddy-Care-spezifischer Reset fuer Testdaten ergaenzt
- lokaler Export fuer sanitizte technische Test-Events ergaenzt
- lokale Testzusammenfassung ueber Runtime-Funktion vorbereitet

## 2. Testmodus-Verhalten

- nur UI- und Testhinweise werden beeinflusst
- Pflanzenlimits, Age Gate, Care+-Logik und Save-System bleiben produktnah
- kein echtes Payment oder Checkout wird aktiviert
- der Testmodus zwingt keine Tour und blockiert den bestehenden Buddy-Care-Flow nicht

## 3. Tracking- und Datenschutzgrenzen

Lokal erfasst werden nur technische Kernpfad-Events, zum Beispiel:

- Test gestartet
- Age Gate abgeschlossen
- erste oder zweite Pflanze angelegt
- Tagescheck gestartet oder abgeschlossen
- Tagebuchbereich geoeffnet
- Testzugang angesehen oder aktiviert
- Feedback geoeffnet oder abgeschickt

Nicht in Test-Events enthalten:

- Pflanzenname
- Notizen
- Daily-Check-Inhalte
- Hoehenwerte
- Tagebuchtexte
- persoenliche Daten

## 4. Feedbackstruktur

Das Feedbackformular deckt ab:

- Verstaendlichkeit
- hilfreichster Bereich
- Unklarheiten oder Stoerfaktoren
- Weiternutzungsinteresse
- grundsaetzliche Zahlungsbereitschaft
- bevorzugtes Modell
- realistischer Saisonpass-Preis

Freitext bleibt lokal und wird nicht in Tracking-Events uebernommen.

## 5. Reset-Verhalten

`Testdaten zuruecksetzen` entfernt nur Buddy-Care-Daten:

- Pflanzen
- Tageschecks
- Tagebuch
- Buddy-Care-Testevents
- Buddy-Care-Testfeedback

Der normale Grow Simulator bleibt unveraendert.

## 6. Erstellte Dokumente

- `docs/buddy-care-external-test-guide.md`
- `docs/buddy-care-external-test-results-template.md`
- `docs/buddy-care-phase-15-external-test-readiness-report.md`

## 7. Tests

Bestanden:

- `node --check app.js`
- `node --check ui.js`
- `node --check src/buddy-care/state.js`
- `node --check src/buddy-care/featureFlags.js`
- `node --check src/buddy-care/monetizationReadiness.js`
- `node --check src/buddy-care/externalTestReadiness.js`
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
- `node test/buddy-care-external-test-readiness.test.js`
- `node test/buddy-care-e2e-smoke.test.js`
- `node test/ui-runtime-wiring.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`

## 8. Verbleibende Risiken

- keine externe Analytics-Plattform vorhanden; Auswertung bleibt lokal und manuell
- Feedback bleibt lokal, solange keine zusaetzliche Sammelroutine ausserhalb des Produkts genutzt wird
- voller `npm test`-Lauf wurde weiterhin nicht als Buddy-Care-Signal genutzt, weil bekannte fremde Fehler den Block verfaelschen koennen

## 9. Klare Anleitung zum Start des externen Tests

1. Build mit aktiviertem Buddy-Care-Testmodus bereitstellen
2. 5 bis 10 Tester mit `docs/buddy-care-external-test-guide.md` briefen
3. Tester Buddy Care+ einmal komplett durchlaufen lassen
4. lokales Feedback im Buddy-Care-Feedbackbereich erfassen lassen
5. bei Bedarf technische Test-Events lokal exportieren
6. Ergebnisse in `docs/buddy-care-external-test-results-template.md` sammeln
7. danach ueber UX-Nacharbeit, weiteren Gratis-Test oder Payment-Pilot-Vorbereitung entscheiden
