# Gameplay Activity Layer Phase 7: Polish & Mobile Visual QA

## Gepruefte Bereiche

Diese Phase hat den gesamten sichtbaren Gameplay-Loop im Home-/Missionen-Kontext geprueft:

- Home-Daily-Teaser
- Missions-Sheet-Kopf
- DailyCare-Karten
- Buddy Daily Check
- Weekly Mission
- Coin Actions
- Decision Cards
- leere / nicht verfuegbare / bereits genutzte Zustaende
- Mobile-Verhalten in mehreren Viewports

## Gefundene UX-Probleme

Beim Review sind vor allem kleine, aber wiederkehrende Reibungen sichtbar geworden:

- Abschnittstitel im Missions-Sheet waren teils noch generisch oder englischlastig (`Weekly Mission`, `Coin Actions`, `Decision Card`)
- Decision Cards lagen im Missions-Flow zu weit unten und wirkten dadurch eher versteckt
- Weekly-Zeilen wurden auf Mobile schnell textlastig, weil alle Fortschrittsmetriken direkt in einer Zeile landeten
- Coin-Action-Karten wirkten auf schmalen Viewports gedrungen, weil Copy, Status und Button nebeneinander zu viel Breite beanspruchten
- der Home-Teaser nutzte fuer die Mittelzeile zu lange Streak-/Reward-Kopie
- der Retention-Toast lag bei offenem Missions-Sheet auf kleinen Viewports noch zu nah am unteren Content
- der Coming-Soon-Zustand von `Recovery Snack` war funktional korrekt, aber sprachlich noch etwas generisch

## Geaenderte Dateien

- `app.js`
- `index.html`
- `styles.css`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `docs/gameplay-activity-layer-phase-7-polish-visual-qa-report.md`

## Konkrete Verbesserungen

### 1. Missions-Sheet-Hierarchie klarer gemacht

- neuer kleiner Kicker im Missions-Sheet:
  - `Heute im Run`
  - `Daily Care, Fokus & Fortschritt`
- Decision Cards wurden im Ablauf nach oben gezogen:
  - `Daily Care`
  - `Tagesentscheidung`
  - `Wochenziel`
  - `Coin-Helfer`

Damit liegt die situative Entscheidung naeher an den aktiven Tagesaufgaben und wird weniger leicht uebersehen.

### 2. Copy kompakter und klarer gemacht

In `de/en/es` wurden kleine, sichere Textverbesserungen vorgenommen:

- deutsche Abschnittstitel lokalisiert
- Weekly-/Coin-/Decision-Section-Namen klarer gemacht
- `Recovery Snack` Coming-Soon-Kopie verkuerzt
- Decision-Card-Anschlusszeilen lesbarer gemacht:
  - `Naechster Schritt: ...`
  - `Passt dazu: ...`

### 3. Home-Teaser verdichtet

Die mittlere Daily-/Streak-Zeile im Home-Teaser wurde kompakter gebaut, damit auf kleinen Geraeten weniger Textdruck entsteht.

### 4. Weekly-Zeile lesbarer gemacht

Die Weekly-Karte zeigt die Fortschrittsmetriken jetzt kompakter:

- zwei Kernmetriken direkt in der Karte
- restliche Info zusammen mit der Reward-Zeile darunter

Das reduziert Textstaus auf Mobile, ohne Informationen zu verlieren.

### 5. Mobile-Layout fuer dichte Karten verbessert

Fuer schmale Viewports wurde die Retention-Kartenzeile flexibler gemacht:

- `retention-task-row` darf auf Mobile umbrechen
- Copy bekommt auf schmalen Screens mehr Breite
- Status / Buttons druecken die Beschreibung weniger zusammen
- Decision-/Recovery-Button-Reihen bleiben sauber umbrechbar

### 6. Toast bei offenem Sheet entkoppelt

Wenn ein Sheet offen ist, verankert sich der Retention-Toast jetzt oben statt ueber dem unteren Missionsbereich.

Das aendert keine Runtime-Logik und keinen Startup-Flow, verbessert aber die mobile Lesbarkeit deutlich.

## Viewports / Visual-QA-Ergebnisse

Geprueft wurden:

- `360 x 740`
- `390 x 844`
- `430 x 932`

Verwendete representative Screenshot-Artefakte:

- `tmp_phase7_home_after_360x740.png`
- `tmp_phase7_sheet_after_360x740.png`
- `tmp_phase7_sheet_after_430x932.png`
- `tmp_phase7_sheet_toast_after_360x740.png`

Ergebnisse:

- kein horizontales Scrollen in allen 3 geprueften Viewports
- Missions-Sheet blieb bedienbar
- Texte brachen sauber um
- DailyCare / Decision / Weekly / Coin Actions blieben visuell unterscheidbar
- Decision Cards waren durch die neue Reihenfolge frueher sichtbar
- Coin-Action-Zeilen wirkten auf Mobile lockerer als vorher
- Toast lag mit offenem Sheet nicht mehr ueber dem unteren Missionsbereich

Wichtige Beobachtung:

- Nicht jede Aktionskarte liegt auf kleineren Screens ohne Scrollen direkt im ersten Fold. Das ist inhaltlich okay, solange das Sheet sauber scrollt. Nach der Politur blieb der Scrollpfad stabil.

## Tests und Ergebnisse

Ausgefuehrt:

- `node --check app.js` — bestanden
- `node scripts/i18n-audit.js` — bestanden
- `node test/decision-cards.test.js` — bestanden
- `node test/coin-actions.test.js` — bestanden
- `node test/weekly-missions.test.js` — bestanden
- `node test/buddy-daily-check.test.js` — bestanden
- `node test/daily-care-selection.test.js` — bestanden
- `node test/daily-tasks-runtime.test.js` — bestanden
- `node test/daily-tasks-ui-state.test.js` — bestanden
- `node test/guest-mode-startup.test.js` — bestanden
- `node test/storage-profile-run-migration.test.js` — bestanden
- `node test/reward-runtime-modes.test.js` — bestanden

Zusatz:

- Mobile Visual QA mit Playwright gegen `360x740`, `390x844`, `430x932`
- kein horizontaler Overflow in den geprueften Layouts

Hinweis:

- ein Versuch `node --check index.html` war kein Produktfehler, sondern nur ein ungueltiger Syntax-Check auf einen HTML-Dateityp

## Bekannte Grenzen

- Coin Actions bleiben textreicher als DailyCare-Karten, weil Kosten, Effekt und Status gleichzeitig sichtbar bleiben muessen
- Decision Cards sind weiter nur im Missions-Sheet sichtbar und nicht als eigene Home-Komponente ausgespielt
- der Start-Toast ist weiterhin sichtbar, aber jetzt mit offenem Sheet besser positioniert; er wurde bewusst nicht entfernt oder in einen neuen Flow umgebaut

## Empfehlung fuer naechste Phase

Als naechster sinnvoller Schritt bietet sich eine kleine inhaltliche Veredelung statt eines neuen Systems an:

- noch feinere Buddy-/Decision-Card-Kopie je Phase
- optional ein kleiner Home-Hinweis auf aktive Decision Card oder Weekly-Fortschritt
- weiter ohne neue Event-, Reward- oder Mission-Authority
