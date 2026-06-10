# Mobile Visual Premium QA

## Ausgangslage

Die vorherigen Guest-Mode-, Core-Loop-, Care-Studio-, Analyse- und Event-V2-Phasen waren laut vorhandenen Readiness-Berichten bereits gruen.

## Ziel der Phase

Mobile Visual QA und risikoarme Premium-Polish-Fixes fuer die Hauptscreens, ohne neue Features, Save-Aenderungen, Event-V2-Umbauten oder groessere Layout-Rewrites.

## Gepruefte Viewports

- `390x844`
- `375x812`
- `360x740`

## Gepruefte Screens

- Frischer Gaststart / Run-Builder
- Home nach erstem Run
- Care Studio
- Analyse / Statistik
- Event Center (leerer Zustand)
- Menue
- Settings / Cloud / Privacy
- Death-Flow / Gameover-Overlay

## Gefundene Probleme nach Prioritaet

### P1

- Settings-Sheet: Der Block `Simulationstempo` kollidierte visuell mit den folgenden Zeilen. Auf mobilen Breiten wurden Werte und Labels ineinander geschoben.
- Settings-Sheet: Karteninhalte wurden im vertikalen Flow zu stark gestaucht. Dadurch wirkten Gameplay- und Audio-Bereich app-unreif und schwer lesbar.

### P2

- First-Run Buddy-Toast liegt auf kurzen Hoehen sichtbar ueber unteren Sheet-Bereichen, besonders in Settings und Event Center.

### P3

- Privacy-Sheet ist lesbar, bleibt aber textlastig und braucht fuer eine spaetere Premium-Runde eher inhaltliche Verdichtung als weitere CSS-Kosmetik.

## Behobene Probleme

- Der `Simulationstempo`-Block wurde aus dem problematischen kompakten Row-Flow in einen stabilen Block-Flow ueberfuehrt.
- Settings-Zeilen stapeln sich auf schmalen Breiten ruhiger untereinander statt Wert und Label gegeneinander zu pressen.
- Settings-Karten schrumpfen im mobilen Sheet nicht mehr unter ihre Inhaltshoehe.
- Die Lesbarkeit des Settings-Sheets wurde ueber etwas dichtere Kartenhintergruende verbessert.

## Bewusst zurueckgestellte Punkte

- Buddy-Toast-Overlay auf kurzen Hoehen. Das ist sichtbar, greift aber in globales Feedback-Verhalten ein und sollte als eigene kleine Folgephase behandelt werden.
- Guest-Mode-Reload-Testfehler. Der Fehler kommt aus einer separaten, bereits vorhandenen Missionsdialog-Wiedereroeffnung nach Reload und wurde in dieser Minimal-Polish-Phase nicht angefasst.

## Geaenderte Dateien

- `index.html`
- `styles.css`

## Mobile-Verhalten

- Run-Builder wirkte auf allen drei Breiten stabil, inklusive Bottom-Buttons und Safe-Area.
- Home, Care Studio, Analyse, Menue und Death-Overlay blieben visuell bedienbar.
- Der deutlichste mobile Reifegewinn liegt im Settings-Sheet.

## Visuelle Bewertung je Hauptscreen

- Gaststart / Run-Builder: gut
- Home nach erstem Run: gut
- Care Studio: gut
- Analyse / Statistik: gut
- Event Center leer: gut
- Menue: gut
- Settings / Cloud / Privacy: verbessert, aber mit verbleibendem Toast-Overlay
- Gameover / Death-Flow: gut

## Tests

### Tests Run

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `node test/gameover-flow-runtime.test.js`
- `node test/stability-top5-regression.test.js`
- `node test/care-studio-runtime.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-visibility-health-report.js`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`
- `node test/encoding-utf8-regression.test.js`

### Testergebnisse

- Bestanden: `check:syntax`, `check:i18n`, `public-text-readiness`, `ui-onboarding-settings-smoke`, `gameover-flow-runtime`, `stability-top5-regression`, `care-studio-runtime`, `test:runtime`, `test:smoke`, `test:event-release`, `event-v2-visibility-health-report`, `event-v2-release-gate-snapshot`, `service-worker-shell-assets`, `encoding-utf8-regression`
- Fehlgeschlagen: `node test/guest-mode-startup.test.js`

## Offene Risiken

- Der Guest-Mode-Startup-Test bleibt rot. Reproduktion: Nach Guest-Reload kann sich nach einigen Sekunden erneut ein `mission-reward`-Dialog oeffnen und die Menue-Ebene blockieren.
- Dadurch ist die formale Reload-/Guest-Mode-Gate-Bewertung fuer diese Phase nicht voll gruen, auch wenn die visuelle Hauptflaechen-QA und die uebrigen Release-Gates stabil sind.

## Finale Einschaetzung

`no-go`

Begruendung: Die mobilen Hauptscreens wirken nach dem Settings-Fix deutlich app-reifer, aber ein zentraler Guest-Mode-Reload-Test ist weiterhin rot. Nach der definierten Phase-Regel bleibt die Freigabe deshalb `no-go`, bis dieser Gastmodus-/Reload-Pfad wieder gruen ist.

## Next Logical Step

Eine kleine Folgephase nur fuer den Guest-Reload-Pfad: Missions-/Dialog-Trigger nach Restore entkoppeln oder unterdruecken, danach Guest-Mode- und Top5-Gates erneut laufen lassen.
