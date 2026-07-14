# Buddy Care+ Phase 15 Navigation & Screen Architecture Report

## 1. Vorherige UX-Probleme

- Buddy Care+ lief als lange Ein-Seiten-Oberflaeche mit konkurrierenden Karten.
- "Heute wichtig" hatte keinen klaren Vorrang gegenueber Pflanzen-, Tagebuch- und Testzugang-Inhalten.
- Vollstaendige Pflanzendetails, Tagebuch und Zusatzbereiche wurden gleichzeitig gezeigt.
- Interne Uebergaenge fuehrten zwar fachlich weiter, aber nicht in eine klare Screen-Struktur.
- Nach der Navigationseinführung lagen versteckte Views technisch noch im Layout, weil CSS-`display` das HTML-`hidden` ueberschrieb.
- Das Tagebuchformular im Pflanzendetail war nach dem Umbau nicht mehr an die Submit-Logik angebunden.

## 2. Neue Informationsarchitektur

Buddy Care+ ist jetzt in vier Hauptansichten aufgeteilt:

1. `Heute`
2. `Pflanzen`
3. `Tagebuch`
4. `Mehr`

Es ist immer nur eine Hauptansicht gleichzeitig sichtbar. Die aktive Ansicht wird ueber lokalen UI-State gesteuert:

- `activeBuddyCareView = 'today' | 'plants' | 'diary' | 'more'`
- Default beim Oeffnen: `today`
- nicht persistent, nach erneutem Oeffnen wieder `today`

## 3. Navigationsverhalten

- Mobile: feste untere Buddy-Care-Navigation mit vier gleich grossen Touch-Zielen
- Desktop/Tablet: gleiche Architektur, nur kompakter skaliert
- Deep Links fuehren in die passende Ansicht:
  - Tagescheck aus `Heute` -> `Pflanzen` + Detailkontext + Tagescheck
  - `Details oeffnen` -> `Pflanzen` + Pflanzendetail
  - Tagebuch-CTAs -> `Tagebuch`
  - Testzugang / Locked Slots / Feedback -> `Mehr`
- Inaktive Views und die versteckte Navigation werden jetzt per CSS wirklich aus dem Layout entfernt:
  - `.buddy-care-view[hidden]`
  - `.buddy-care-nav[hidden]`

## 4. Buddy-Praesenz

- `Heute`: staerkster Buddy-Auftritt mit Hero-Kontext und Coach-Zusammenfassung
- `Pflanzen`: kompakter, Buddy bleibt aus den Karten weitgehend heraus
- `Pflanzendetail`: Buddy in Uebersicht und Tagescheck gezielt praesent
- `Tagebuch`: nur dezent
- `Mehr`: Clipboard-/Info-Charakter fuer Testzugang und Hinweise

Die zentrale Asset-Zuordnung bleibt bei `src/buddy-care/buddyAssets.js`.

## 5. Pflanzendetail-Struktur

Die Pflanzenansicht enthaelt jetzt ein eigenes Detailmodul innerhalb derselben Hauptansicht.

Struktur:

- Zurueck zu Pflanzen
- Pflanzenname
- Phase · Tag X
- Statusbadge
- Segmentnavigation:
  - `Uebersicht`
  - `Tagescheck`
  - `Tagebuch`
  - `Verlauf`
  - `Woche`

Es ist immer nur ein Detailsegment gleichzeitig aktiv.

## 6. Scroll- und Mobile-Verhalten

- Buddy Care bleibt ein eigener vertikaler Scroll-Container.
- Jede Hauptansicht hat zusaetzlichen Bottom-Space fuer die Sticky-Navigation.
- Interaktive Elemente im Detailbereich erhalten zusaetzliche `scroll-margin-bottom`, damit sie ueber der Bottom-Navigation erreichbar bleiben.
- Kein globaler Scroll-Reset ausserhalb von Buddy Care.
- Die Scroll-Reparatur aus Phase 3.1 bleibt erhalten.

## 7. Zusaetzliche Stabilisierung aus Phase 15

- Versteckte Buddy-Care-Views blockieren keine Klicks mehr.
- Versteckte Buddy-Care-Navigation blockiert das Age Gate nicht mehr.
- Das Tagebuchformular im Pflanzendetail wird wieder korrekt ueber die Screen-Submit-Logik verarbeitet.
- Der Browser-Smoke wurde auf die neue Architektur aktualisiert.

## 8. Tests

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
- `node test/buddy-care-navigation.test.js`
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

Zusaetzlicher Viewport-Smoke:

- 320 x 568
- 375 x 667
- 390 x 844
- 430 x 932
- 768 x 1024
- 1280 x 720
- 1440 x 900

Geprueft wurden dabei:

- eine aktive Hauptansicht gleichzeitig
- kein horizontaler Overflow
- Bottom-Navigation sichtbar
- 3-Pflanzen-Stand nach Aktivierung
- Pflanzen-Detail und Tagebuch-Navigation

## 9. Verbleibende Risiken

- Der Tagescheck ist weiterhin fachlich stabil, aber noch kein gefuehrter Schritt-fuer-Schritt-Wizard.
- Der Viewport-Smoke prueft Stabilitaet und Sichtbarkeit, aber keine pixelgenaue visuelle Abnahme.
- `scripts/i18n-audit.js` meldet weiterhin heuristisch ungenutzte Alt-Keys im Gesamtprojekt; fuer Buddy Care fehlen keine Keys.

## 10. Daily-Check-Wizard

Nicht in Phase 15 umgesetzt.

Empfehlung:

- als `Phase 15.1` umsetzen
- bestehende Daily-Check-Datenstruktur wiederverwenden
- Antworten erst am Ende speichern
- klaren Progress + Zurueck/Weiter bauen

Das ist jetzt getrennt genug, um ohne Architektur-Chaos als naechster UX-Schritt umgesetzt zu werden.

## 11. Readiness fuer externen Gratis-Test

Status nach Phase 15:

- Interner Test: bereit
- Externer Gratis-Test: bereit, wenn die Navigation als aktuelle Buddy-Care-Struktur getestet werden soll
- Bezahlter Pilot: weiterhin nicht bereit

Empfehlung:

- Fuer den kleinen externen Gratis-Test zuerst die neue 4-View-Navigation pruefbar machen
- Danach Phase 15.1 fuer den gefuehrten Tagescheck priorisieren
