# Buddy Care+ Navigation and UX Evolution Report

## 1. Vorherige UX-Probleme

- Buddy Care+ wirkte zu stark wie eine einzige lange Seite.
- Heute, Pflanzen, Tagebuch, Verlauf, Testzugang und Feedback konkurrierten im gleichen Inhaltsstrom.
- Bei 2 bis 3 Pflanzen war nicht schnell genug klar, welche Pflanze heute Aufmerksamkeit braucht.
- Buddy war vorhanden, aber nicht konsequent als Coach-Hero und Kontextbegleiter priorisiert.
- Monetarisierungs- und Testelemente lagen zu nah am taeglichen Pflegefluss.

## 2. Neue Informationsarchitektur

Buddy Care+ ist jetzt als eigenstaendiger Mini-Produktbereich mit vier Hauptansichten aufgebaut:

1. Heute
2. Pflanzen
3. Tagebuch
4. Mehr

Es ist immer nur eine Hauptansicht sichtbar. Die Struktur trennt taegliche Pflege, Pflanzenverwaltung, Dokumentation und sekundaere Care+-Elemente klar voneinander.

## 3. Navigation und UI-State

- Lokaler UI-State: `activeBuddyCareView`.
- Kanonische Werte: `today`, `plants`, `diary`, `more`.
- `history` bleibt als interner Alias kompatibel und wird auf `diary` normalisiert.
- Default beim Oeffnen: `today`.
- Die untere Buddy-Care-Navigation bleibt innerhalb des Buddy-Care-Screens und veraendert keine globale App-Navigation.

## 4. Aufbau der vier Ansichten

- Heute: Buddy-Hero, Gesamtstatus, wichtigste heutige Prioritaet und kompakte Pflanzenaktionen.
- Pflanzen: kompakte 1-3-Pflanzenkarten, Setup, read-only Zustand nach Free-Downgrade und Einstieg ins Pflanzendetail.
- Tagebuch: zentrale Timeline mit Filter, manuellen Eintraegen, Daily-Check-Eintraegen, Tags, Hoehe und Pflanzenbezug.
- Mehr: Care+ Testzugang, Saisonpass-Vorschau, Aktivierungs-Onboarding, Feedback, Reset und Hinweise.

## 5. Pflanzendetail-Struktur

Das Pflanzendetail liegt innerhalb der Pflanzenansicht und nutzt eine Segmentnavigation:

- Uebersicht
- Tagescheck
- Tagebuch
- Verlauf
- Woche

Es wird jeweils nur ein Detailsegment aktiv gerendert. Tagebuch, Verlauf und Wochenrueckblick sind nicht mehr in einem gemeinsamen Detailbereich vermischt.

## 6. Buddy-Praesenz

- Heute: staerkste Buddy-Praesenz mit Hero und Coach-Zusammenfassung.
- Pflanzenliste: zurueckhaltend, ohne grosses Buddy-Bild auf jeder Karte.
- Pflanzendetail: Buddy in Uebersicht, Tagescheck und Verlauf gezielt als Begleiter.
- Tagebuch: dezent ueber Empty State und Zusammenfassung.
- Mehr: Buddy fuer Testzugang und Care+-Hinweise.

Die zentrale Asset-Zuordnung bleibt `src/buddy-care/buddyAssets.js`.

## 7. Scroll- und Mobile-Verhalten

- Buddy Care+ bleibt ein eigener vertikaler Scrollbereich.
- Die Bottom Navigation ist safe-area-aware.
- Hauptansichten erhalten ausreichend Bottom-Padding.
- Versteckte Views werden aus dem Layout entfernt.
- Der bestehende Buddy-Care-Scroll-Fix bleibt erhalten.
- Keine globalen `body`-/`html`-Overflow-Regeln wurden veraendert.

## 8. Daily-Check-Wizard

Der gefuehrte Tagescheck-Wizard ist umgesetzt.

Umsetzung:

- Schrittfolge: Medium, Blaetter, Wachstum, Umgebung, Schaedlinge, Hoehe/Notiz, Ergebnis.
- Je Schritt ist nur eine Frage beziehungsweise ein Eingabebereich sichtbar.
- Zurueck und Weiter bleiben lokal im Wizard-State.
- Buddy-Hinweise sind pro Schritt kurz und kontextbezogen.
- Antworten werden als Entwurf gehalten und erst im Ergebnis-Schritt gespeichert.
- Abbrechen schliesst den Check und verwirft den nicht gespeicherten Entwurf.
- Das bestehende Daily-Check-Datenmodell und `addDailyCheck` bleiben erhalten.
- Das Ergebnis nutzt die vorhandene Risiko-/Ampelbewertung als Vorschau.

## 9. Tests

Ausgefuehrt:

- `node --check app.js` bestanden
- `node --check ui.js` bestanden
- `node --check src/buddy-care/state.js` bestanden
- `node --check src/buddy-care/featureFlags.js` bestanden
- `node --check src/buddy-care/monetizationReadiness.js` bestanden
- `node --check src/buddy-care/phaseEngine.js` bestanden
- `node --check src/buddy-care/taskGenerator.js` bestanden
- `node --check src/buddy-care/buddyAssets.js` bestanden
- `node --check src/buddy-care/riskEngine.js` bestanden
- `node --check src/buddy-care/trendEngine.js` bestanden
- `node scripts/i18n-audit.js` bestanden; keine fehlenden Keys, nur heuristisch ungenutzte Keys im Gesamtprojekt
- `node test/buddy-care-state.test.js` bestanden
- `node test/buddy-care-ui-shell.test.js` bestanden
- `node test/buddy-care-navigation.test.js` bestanden
- `node test/buddy-care-daily-check-wizard.test.js` bestanden
- `node test/buddy-care-phase-engine.test.js` bestanden
- `node test/buddy-care-task-generator.test.js` bestanden
- `node test/buddy-care-daily-check.test.js` bestanden
- `node test/buddy-care-diary.test.js` bestanden
- `node test/buddy-care-risk-engine.test.js` bestanden
- `node test/buddy-care-trend-engine.test.js` bestanden
- `node test/buddy-care-paywall-mock.test.js` bestanden
- `node test/buddy-care-activation-onboarding.test.js` bestanden
- `node test/buddy-care-monetization-readiness.test.js` bestanden
- `node test/buddy-care-product-hardening.test.js` bestanden
- `node test/buddy-care-external-test-readiness.test.js` bestanden
- `node test/buddy-care-e2e-smoke.test.js` bestanden
- `node test/ui-runtime-wiring.test.js` bestanden
- `node test/ui-onboarding-settings-smoke.test.js` bestanden

## 10. Verbleibende Risiken

- Die Tagebuch-Hauptansicht nutzt weiterhin intern einzelne History-Begriffe fuer Timeline/Trend-Logik; sichtbar ist sie als Tagebuch ausgerichtet.
- Kein echtes Payment und kein bezahlter Pilot ohne Payment-Provider- und Compliance-Pruefung.
- `npm test` wurde nicht ausgefuehrt; fruehere Gesamtlaeufe hatten bekannte Buddy-Care-fremde Fehler in allgemeinen Projektbereichen.
- Der Wizard wurde per E2E-Smoke geprueft, aber noch nicht manuell auf allen Zielgroessen visuell abgenommen.

## 11. Empfehlung naechster Entwicklungsschritt

Als naechstes den Wizard manuell auf echten Mobile-Groessen pruefen und danach die externe Gratis-Test-Copy final glätten:

- 320 x 568, 390 x 844 und 430 x 932
- Abbruchpfad, Rueckwaerts-Navigation und Reload nach gespeichertem Check
- kurze Community-Testfrage: "Ist der gefuehrte Tagescheck klarer als das alte Formular?"

## 12. Readiness-Einschaetzung

- Bereit fuer internen Test: ja
- Bereit fuer externen Gratis-Test: ja
- Bereit fuer bezahlten Pilot: nein
