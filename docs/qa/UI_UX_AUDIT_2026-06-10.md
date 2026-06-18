# GrowSimulator – UI/UX & AppStore-Readiness Audit

**Datum:** 2026-06-10 · **Rolle:** Senior Product Designer / Mobile UI-UX Auditor · **Modus:** Nur Audit, keine Codeänderungen
**Geprüfte Quellen:** `index.html` (1.921 Zeilen), `styles.css` (18.156 Zeilen), `app.js` (25.318 Zeilen), `ui.js`, `src/i18n/` (de/en/es, je ~3.000 Zeilen), `manifest.webmanifest`, `sw.js`, Buddy-Asset-Bibliothek, `docs/POST_UPDATE_AUDIT_20260321.md`, `package.json`-Testlandschaft.

---

## 1. Executive Summary

**UI/UX-Reifegrad: ~62 %** (Premium-Ziel = 100 %)

| Dimension | Reife | Kommentar |
|---|---|---|
| Feature-Tiefe & Simulation | ~85 % | Sehr stark. Eventsystem, Harvest-Forecast, Klima, Missionen, Leaderboard, Shop – alles vorhanden. |
| Visuelles Design-System | ~70 % | Tokens, konsistente Karten, eigenes Premium-Playercard-Design. Gute Basis. |
| Copy & Sprachqualität | **~40 %** | Größter Einzelblocker: ASCII-Umlaute ("fuer", "spaeter") + Deutsch/Englisch-Mix quer durch die UI. |
| Mobile Ergonomie | ~60 % | 137 Deklarationen mit 9–11px Schrift, ~90 Touch-Ziele unter 40px Höhe, fester 393×852-Frame. |
| AppStore-/Produktreife | ~55 % | Impressum/Datenschutz vorhanden (gut), aber Prototyp-Reste ("X"-Buttons, deaktivierter Preset-Button, Demo-Werte im HTML). |
| Monetarisierungs-UX | ~65 % | Flows existieren komplett (Shop, Packs, Support, Rewarded-Stub), aber ohne emotionale Verpackung. |

**Kernbefund:** Die App ist funktional weiter als sie sich anfühlt. Das, was sie aktuell "billig" wirken lässt, ist fast nie Architektur, sondern **Oberflächenpolitur**: Sprachkonsistenz, Mikro-Typografie, Prototyp-Reste und unausgespielte Buddy-Momente. Das ist eine gute Nachricht – die wirksamsten Maßnahmen sind klein und risikoarm.

---

## 2. Die 10 wichtigsten Schwächen

1. **ASCII-Umlaute in der deutschen Copy (kritisch).** `de.json` und Onboarding-HTML sind voll von "fuer", "spaeter", "naechste", "Geraetewechsel", "anfuehlt", "genuegen" – gemischt mit korrekten Umlauten ("Schließen", "Menü") im selben Screen. Für deutsche Nutzer (Primärmarkt, `lang: de-DE` im Manifest) ist das das stärkste "unfertig"-Signal der ganzen App. Der vorhandene `textEncoding.js`-Mojibake-Reparierer zeigt, dass das Encoding-Thema historisch gewachsen ist.
2. **Deutsch/Englisch-Mix in Kern-UI.** Home zeigt "Boost x24 Bereit", "Night Shift", "Climate Stabilize", "TARGET"; Care Studio hat englische HTML-Defaults ("Root zone stable", "Wait", "Water actions", "Choose a method."); Leaderboard ist komplett englisch betitelt ("Weekly Overall", "Around Me", "Top verifiziert"-Mix). Ein Markenname als Anglizismus ist ok – ein zufälliger Mix nicht.
3. **"X" als Close-Button (13–16 Vorkommen).** Ein nackter Buchstabe "X" statt Icon ist das klassischste Prototyp-Merkmal. Das `#icon-close`-SVG-Symbol existiert bereits im Sprite und wird nicht genutzt.
4. **Mikro-Typografie unter Lesbarkeitsgrenze.** 137 Deklarationen mit 9–11px, viele davon kombiniert mit Low-Opacity-Farben (z. B. `rgba(199,216,203,0.56)` bei 10px) → WCAG-Kontrastverletzungen und "Ameisentext"-Gefühl, v. a. in Event-Karten und Badges.
5. **Touch-Ziele unter 44px.** ~90 Höhen-Deklarationen im Bereich 20–39px. Apple HIG fordert 44×44pt; betroffen sind u. a. Stepper, Chips, kleine Menüeinträge.
6. **Run-Summary ist eine Textwand.** 8+ gestapelte Sektionen (Harvest, Report, Highlights, Bremsen, Positives, Ziel, XP, Unlocks) ohne Hierarchie-Dramaturgie. Der wichtigste emotionale Moment des Spiels (Ernte!) liest sich wie ein QA-Protokoll – direkte Verletzung der eigenen "keine Textwände"-Regel.
7. **Buddy ist im Kernloop fast unsichtbar.** Die Buddy-Bibliothek ist reich (60+ gerenderte Posen/Emotionen, sauber gemappt in `buddyVisualMap.js`), aber: Care-Studio-Slot zeigt ein "+"-Platzhalter-Glyph, First-Run-Intro hat nur Text-Buddy-Zeilen ohne Bild, Home hat gar keinen Buddy. Der "emotionale Anker" der Marke existiert als Asset, nicht als Erlebnis.
8. **Klima-Sheet ist ein Expertenwerkzeug.** VPD-Buffer in kPa, Ramp %/min, Übergangsminuten, Min/Max-Abluft – direkt neben einem Onboarding, das "drei kurze Entscheidungen" verspricht. Das Advanced-`<details>`-Panel ist der richtige Ansatz, aber auch die Hauptebene wirkt wie ein Hausautomations-Dashboard, nicht wie Gameplay.
9. **Prototyp-Reste in sichtbarer UI.** Deaktivierter "Preset"-Button mit Tooltip "wird später aktiviert" im Onboarding; statische Demo-Sektion "Positives Event" mit hartkodiertem "+12%" im Event-Sheet; Demo-Werte ("Max Mustergrower", "LVL 9", "2.480") im HTML, die während des langen sequenziellen Script-Loads (60+ Skripte, `async=false`, seriell geladen) kurz sichtbar werden können.
10. **i18n-Lücken bei ganzen Screens.** Leaderboard-Sheet, Support-Sheet, Coin-Shop-Sektionsköpfe ("Gameplay-Kontrolle", "Coin-Packs"), Missions-Streak-Block ("Daily Streak", "Heute offen"), Death-Overlay-Teile und Run-Summary-Sektionen sind hartkodiert deutsch ohne `data-i18n` – EN/ES-Nutzer bekommen dort deutschen Text. Die Locale-Dateien sind dagegen sauber dreisprachig gepflegt (je ~2.950 Zeilen, Parität vorhanden).

## 3. Die 10 größten Chancen

1. **Sprach-Sweep = größter Qualitätssprung pro Stunde.** Umlaute reparieren + Sprachmix vereinheitlichen verändert die Wahrnehmung der gesamten App, ohne ein einziges Layout anzufassen.
2. **Buddy-Aktivierung mit vorhandenen Assets.** Die Asset-Bibliothek ist fertig und gemappt. Buddy ins First-Run-Intro, in den Care-Studio-Slot und in den Daily-Check zu bringen ist Verdrahtung, keine Asset-Produktion. (Achtung: CLAUDE.md-Regel "Assets erst integrieren, wenn Set komplett & approved" – Buddy-Set wirkt komplett, Freigabe durch dich nötig.)
3. **Harvest-/Run-Ende als Belohnungsmoment inszenieren.** Score-Reveal zuerst, Buddy-Reaktion (Trophy/Celebrate-Assets existieren!), dann aufklappbare Details. Direkter Retention- und Zahlungsbereitschafts-Hebel.
4. **Der Klima-Controller als Premium-Signature-Element.** Das Hardware-Controller-Design der Klimakarte ist die eigenständigste Idee der UI. Konsequent als "Gerät im Growroom" inszeniert (Display-Glow, Tasten-Feedback) wird es zum Marken-Merkmal statt Dashboard.
5. **First 5 Minutes sind strukturell schon gut** – 4-Schritte-Onboarding, geführter Tag 1 mit Entscheidung, Ergebnis & Belohnung ist sauber gebaut und voll i18n-isiert. Mit Buddy-Visuals + Umlaut-Fix wird aus "solide" → "charmant", für sehr wenig Aufwand.
6. **Coin-Shop → Buddy-Shop.** Reward-Assets (Coins, Chest, Gift, Premium-Shades) existieren. Buddy als Verkäufer/Präsentator gibt dem Shop Wärme und nimmt der Monetarisierung das Transaktionale.
7. **Support-Sheet emotionalisieren.** Die Stufen Samen/Wachstum/Blüte sind ein starkes thematisches Konzept – aktuell aber nüchterne Buttons. Mit Pflanzen-Iconografie + Buddy-Dank + i18n wird daraus ein echter Supporter-Flow.
8. **Typografie-Token-Disziplin.** Es gibt bereits `--gs-space-*` und Radius-Tokens, aber keine Font-Size-Tokens – daher die 137 Streuwerte. Eine 5-stufige Typo-Skala (11/12/14/16/20) als Tokens einführen und schrittweise migrieren.
9. **PWA-Manifest aufwerten.** `description` englisch, keine `screenshots`, keine `shortcuts`, Default-Sprache im Code `en` vs. Manifest `de-DE`. Screenshots + Shortcuts ("Run fortsetzen", "Missionen") verbessern Install-Prompt und Store-Listing (TWA/PWABuilder) erheblich.
10. **Settings ehrlich machen.** Mehrere `figma-static-row`-Zeilen (Lautstärke 84 %, Effekte "Hoch", Haptik "An") sehen interaktiv aus, sind aber statisch. Entweder funktional machen oder ausblenden – nicht-funktionale Controls sind ein klassischer App-Review-/Vertrauenskiller.

---

## 4. Quick Wins (1–2 Stunden, jeweils)

| # | Maßnahme | Wirkung | Risiko |
|---|---|---|---|
| QW1 | Umlaut-Fix in `de.json` (Suchen/Ersetzen mit Wortgrenzen-Review: fuer→für, spaeter→später, naechste→nächste, ae/oe/ue-Fälle einzeln prüfen, z. B. "Aktionen" nicht anfassen) | Sehr hoch | Niedrig (nur Locale-Datei; `check:i18n` läuft danach) |
| QW2 | Umlaut-Fix in den hartkodierten Onboarding-/HTML-Texten in `index.html` | Hoch | Niedrig |
| QW3 | Alle `>X<`-Close-Buttons auf das vorhandene `#icon-close`-Sprite umstellen | Hoch | Niedrig (reine Markup-Kosmetik, `aria-label` bleibt) |
| QW4 | "Preset"-Button im Onboarding entfernen/ausblenden statt disabled zu zeigen | Mittel | Sehr niedrig |
| QW5 | Statische "Positives Event"-Demo-Sektion aus dem Event-Sheet-Markup entfernen (ist bereits `aria-hidden`) | Mittel | Niedrig (vorher prüfen, dass kein JS sie referenziert) |
| QW6 | Care-Studio-HTML-Defaults von Englisch auf i18n-Keys bzw. deutsche Defaults stellen ("Root zone stable" → Key existiert vermutlich schon) | Hoch | Niedrig |
| QW7 | Manifest: deutsche `description`, `shortcuts` (2 Einträge), Sprach-Default-Abgleich | Mittel | Niedrig |
| QW8 | Repo-Hygiene: `apply_event_fix.js`, `fix_app_script.js`, `fix_test_script.js` aus Root in `dev/` o. ä. verschieben; Ordner "buddy referenz" und Dateien mit Leerzeichen ("Basic screen.jpg", "App loadingscreen.webm") langfristig umbenennen (Vorsicht: CSS/HTML-Referenzen!) | Niedrig–Mittel | QW8b (Umbenennen) nur mit Referenz-Suche |

## 5. Mittlere Maßnahmen (1–2 Tage, jeweils)

1. **i18n-Vervollständigung der hartkodierten Screens.** Leaderboard, Support, Coin-Shop-Köpfe, Missions-Streak, Run-Summary-Sektionen, Death-Overlay auf `data-i18n` umstellen + Keys in alle drei Locales. Der vorhandene `scripts/i18n-audit.js` sichert das ab.
2. **Sprachmix-Bereinigung im Gameplay-Vokabular.** Entscheidung pro Begriff: Markenbegriff (bleibt englisch, z. B. "Care Studio", "Boost") vs. UI-Text (wird übersetzt, z. B. "Wait" → "Warten", "TARGET" → "ZIEL"). Als kleines Glossar in `docs/` festhalten, dann konsequent anwenden.
3. **Typo-Token-System.** `--gs-font-xs/sm/base/lg/xl` definieren, Minimum 11px, und die schlimmsten 10px-Cluster (Event-Karten, Badges, Captions) migrieren. Kontrast bei Low-Opacity-Texten auf ≥ 4.5:1 anheben.
4. **Touch-Target-Pass.** Alle interaktiven Elemente < 40px Höhe identifizieren (Stepper, Chips, kleine Buttons) und per Padding/`min-height: 44px`/unsichtbarer Hit-Area vergrößern – ohne visuelle Größe zwingend zu ändern.
5. **Buddy in den Care-Studio-Slot + First-Run-Intro.** Den "+"-Platzhalter durch den bereits existierenden `buddyAssetResolver`-Pfad ersetzen; im First-Run-Intro pro Step ein passendes Buddy-Visual (wave_hello, watering_can, celebrate). Kein neues Asset nötig.
6. **Run-Summary-Redesign (Stufe 1, nur Struktur).** Hero-Moment (Score + Qualitätslinie + Buddy-Reaktion) oben, alles andere in einklappbare Sektionen. Kein Logikumbau, nur Präsentationsreihenfolge + `<details>`/Accordion.
7. **Settings-Ehrlichkeit.** Statische Pseudo-Controls entweder verdrahten (Lautstärke, Haptik) oder hinter "Bald verfügbar"-Kennzeichnung bündeln bzw. entfernen.

## 6. Größere Produktmaßnahmen (später, mit eigenem Konzept)

1. **Klima-UX zweistufig:** Spieler-Modus (3 Presets: "Schonend / Standard / Push" + Buddy-Empfehlung) als Default, Experten-Modus (heutige Slider) als Opt-in. Hohes Risiko-Areal (Simulation!), daher nur als geplantes Projekt mit Tests.
2. **Performance-/Boot-Strategie:** 60+ seriell geladene Skripte bündeln (Build-Step) und Loading-Video parallel als Skeleton nutzen. Betrifft App-Startpfad = High-Risk-Zone, nur mit sauberem Plan.
3. **Onboarding-Frame für größere Geräte:** Der feste 393×852-Frame mit `background-size: 100% 100%` verzerrt den Hintergrund auf abweichenden Seitenverhältnissen und verschenkt Fläche auf 430px-Geräten. Responsive Skalierungsstrategie (Frame skalieren statt croppen) als eigenes Designthema.
4. **Monetarisierungs-Erlebnis V2:** Buddy-präsentierter Shop, Supporter-Identität (Badge/Rahmen für Unterstützer), Rewarded-Ad-Flow mit klarer Wertkommunikation. Erst nach Sprach-/Polish-Phase – Monetarisierung auf unpolierter UI senkt Zahlungsbereitschaft.
5. **Store-Packaging:** PWA→TWA/Capacitor-Entscheidung, Screenshots-Pipeline, Store-Texte (drei Sprachen), Alterseinstufung & Content-Rating-Strategie (Cannabis-Edukation: Apple/Google-Richtlinien früh prüfen – das ist für die Store-Zulassung potenziell entscheidender als jedes UI-Detail).

---

## 7. Screens/Komponenten zuerst

In dieser Reihenfolge (Wirkung × Sichtbarkeit ÷ Risiko):

1. **Onboarding + First-Run-Intro** – erste 5 Minuten entscheiden über Retention; nur Copy + Buddy-Bild nötig.
2. **Home / Player Card** – meistgesehener Screen; Sprachmix ("Boost x24 Bereit", "TARGET") + Demo-Werte-Flash.
3. **Care Studio** – Kernloop-Screen; englische Defaults + Buddy-Platzhalter.
4. **Run-Summary / Harvest** – emotionaler Höhepunkt; aktuell Textwand.
5. **Event-Sheet** – "Ereignis-Popup"-Titel, Demo-Sektion, 10px-Metatexte.
6. **Coin-Shop & Support-Sheet** – Monetarisierungsfläche; i18n + Wärme.
7. **Missions-Sheet** – Streak-Block hartkodiert, viele kleine Texte.
8. **Settings** – statische Pseudo-Controls.

## 8. Priorisierte Roadmap

**Phase 1 – Premium First Impression (Woche 1)**
QW1–QW6 (Sprache, X-Buttons, Prototyp-Reste) + M3-Teilmenge (schlimmste 10px/Kontrast-Fälle auf Home & Event-Karten). Ergebnis: Kein Screen sagt mehr "Prototyp".

**Phase 2 – First 5 Minutes (Woche 2)**
M5 (Buddy in Care Studio + First-Run-Intro), Onboarding-Feinschliff, QW4, Demo-Werte-Flash beim Boot kaschieren (Loading-Screen erst ausblenden, wenn Player-Card-Daten gerendert sind – vermutlich bereits so, verifizieren).

**Phase 3 – Daily Loop & Retention (Woche 3–4)**
M1 (i18n-Vervollständigung Missions/Leaderboard), M6 (Run-Summary Stufe 1), M4 (Touch-Targets), Buddy-Daily-Check sichtbarer im Missions-Sheet.

**Phase 4 – Monetarisierung & Supporter (Woche 5)**
Coin-Shop/Support-Sheet i18n + visuelle Wärme (Buddy-Reward-Assets), Insufficient-Coins-Flow polieren, Supporter-Dank-Moment. Keine Balancing-Änderungen (No-Go-Regel).

**Phase 5 – AppStore-Polish (Woche 6+)**
QW7 + Manifest-Screenshots/Shortcuts, Icon-Review, Offline-Smoke-Test (aus POST_UPDATE_AUDIT offen), Settings-Ehrlichkeit (M7), Store-Richtlinien-Recherche Cannabis-Edukation, dann G2/G5 als eigene Projekte.

---

## 9. Codex-ready Aufgabenliste

> Format gemäß CLAUDE.md §14. Reihenfolge = empfohlene Ausführungsreihenfolge. Jede Aufgabe ist einzeln ausführ- und verifizierbar.

### Task 1 – Umlaut-Normalisierung de.json

```
## Goal
Ersetze ASCII-Ersatzschreibweisen (ae/oe/ue/ss) durch echte Umlaute/ß in der deutschen Locale-Datei – ausschließlich in Wörtern, wo es orthografisch korrekt ist.

## Context
de.json enthält gemischte Schreibweisen ("fuer", "spaeter", "naechste" neben korrektem "Schließen"). Datei ist UTF-8.

## Files to Inspect
src/i18n/locales/de.json, scripts/i18n-audit.js

## Allowed Changes
Nur String-VALUES in src/i18n/locales/de.json. Keine Keys, keine Struktur, keine Platzhalter ({primaryTask} etc.).

## No-Go Areas
en.json, es.json, app.js, index.html, alle src/-Dateien.

## Required Steps
1. Liste aller Vorkommen von ae/oe/ue/ss-Kandidaten erstellen.
2. Wortweise ersetzen (kein blindes Global-Replace: "Aktionen", "Quelle", "aussen" vs. "außen" einzeln prüfen; Fremdwörter wie "Level" unangetastet).
3. JSON-Validität prüfen.

## Verification
node scripts/i18n-audit.js && npm run test:runtime (mind. i18n-runtime.test.js)

## Completion Report Format
Completed / Changed Files / Verification / Risks & Notes (Liste unsicherer Wortfälle!) / Suggested Next Step
```

### Task 2 – Umlaut- und Copy-Fix index.html (statische Texte)

```
## Goal
Korrigiere ASCII-Umlaute in hartkodierten deutschen Texten in index.html (Onboarding-Steps, Auth-Note, Guest-Hinweis).

## Context
Z. B. Zeilen ~1313–1452: "anfuehlt", "genuegen", "spaeter", "Geraetewechsel".

## Files to Inspect
index.html

## Allowed Changes
Nur Textknoten/Attributtexte in index.html. Keine IDs, Klassen, data-Attribute, Struktur.

## No-Go Areas
Script-Blöcke in index.html, alle JS-Dateien, styles.css.

## Required Steps
1. Vorkommen suchen, 2. Wortweise korrigieren, 3. Diff reviewen.

## Verification
npm run check:syntax && npm run test:smoke

## Completion Report Format
wie Standard
```

### Task 3 – Close-Buttons: "X" → Icon

```
## Goal
Ersetze die Text-Inhalte "X" aller .sheet-close-Buttons durch das vorhandene SVG-Sprite-Symbol #icon-close.

## Context
index.html enthält 13+ Buttons der Form <button class="sheet-close" ...>X</button>. Das Sprite-Symbol #icon-close existiert bereits (Zeile ~92).

## Files to Inspect
index.html, styles.css (Suche: .sheet-close)

## Allowed Changes
Button-Innenmarkup in index.html: <svg class="sheet-close__icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-close"></use></svg>. Optional eine kleine CSS-Regel für .sheet-close__icon (Größe ~20px, currentColor). aria-label bleibt unverändert.

## No-Go Areas
JS-Selektoren (data-close-sheet bleibt), Care-Sheet-Close mit Text "Schließen" (hat data-i18n – nicht anfassen), alle JS-Dateien.

## Required Steps
1. Alle >X<-Buttons identifizieren, 2. Markup ersetzen, 3. visuell prüfen (alle Sheets öffnen/schließen).

## Verification
npm run test:smoke && npm run test:runtime (ui-runtime-wiring)

## Completion Report Format
wie Standard
```

### Task 4 – Care-Studio-Defaults eindeutschen / i18n-fähig machen

```
## Goal
Englische hartkodierte Default-Texte im Care-Sheet (index.html) durch die deutschen Default-Werte der zugehörigen i18n-Keys ersetzen.

## Context
Defaults wie "Root zone stable", "Wait", "Water actions", "Choose a method." haben bereits data-i18n-Keys – nur der statische Fallback-Text im HTML ist englisch und blitzt vor i18n-Anwendung auf.

## Files to Inspect
index.html (#careSheet), src/i18n/locales/de.json (careStudio.*)

## Allowed Changes
Nur statische Textinhalte innerhalb von #careSheet in index.html, identisch zum de.json-Wert des jeweiligen Keys.

## No-Go Areas
data-i18n-Attribute, IDs, Klassen, JS-Dateien, Locale-Dateien.

## Verification
npm run test:smoke (ui-care-sheet-regression.test.js)

## Completion Report Format
wie Standard
```

### Task 5 – Prototyp-Reste entfernen (Preset-Button, Demo-Event-Sektion)

```
## Goal
Entferne den deaktivierten Preset-Button im Onboarding und die statische "Positives Event"-Demosektion aus dem Event-Sheet.

## Files to Inspect
index.html (#setupPresetBtn, figma-section-card--event-positive), app.js + ui.js (Referenz-Suche auf beide)

## Allowed Changes
Löschen der beiden Markup-Blöcke, NUR wenn die Referenz-Suche keine JS-Zugriffe zeigt; sonst class="hidden" + Report.

## No-Go Areas
Onboarding-Logik, Event-Sheet-Logik, eventSheetLegacyRoot-Struktur darüber hinaus.

## Verification
npm run test:smoke && npm run test:event-release (mind. event-phase9b-event-presentation)

## Completion Report Format
wie Standard
```

### Task 6 – i18n-Nachrüstung Leaderboard-Sheet (Muster für weitere Sheets)

```
## Goal
Alle hartkodierten Strings im Leaderboard-Sheet auf data-i18n umstellen; Keys in de/en/es ergänzen.

## Context
#leaderboardSheet ist komplett ohne data-i18n ("Weekly Overall", "Mein Weekly-Stand", "Around Me", ...). Dient als Blaupause für Support-Sheet, Coin-Shop-Köpfe, Missions-Streak (Folge-Tasks).

## Files to Inspect
index.html (#leaderboardSheet), src/i18n/locales/*.json, app.js (Leaderboard-Render-Funktionen für dynamische Strings)

## Allowed Changes
data-i18n-Attribute + neue Keys unter "leaderboard." in allen drei Locales. Dynamische JS-Strings nur, wenn klar lokalisierbar (i18nT-Aufruf), sonst im Report listen.

## No-Go Areas
Leaderboard-Logik, API-Aufrufe, Reward-Berechnung.

## Verification
node scripts/i18n-audit.js && npm run test:runtime

## Completion Report Format
wie Standard
```

### Task 7 – Buddy-Visual im Care-Studio-Slot

```
## Goal
Ersetze den "+"-Platzhalter im Care-Studio-Hero durch ein Buddy-Bild über den vorhandenen buddyAssetResolver.

## Context
.care-studio-buddy-slot zeigt aktuell ein Glyph "+". buddyVisualMap.js mappt careStudio.buddy.*-Hints bereits auf Asset-IDs; Resolver existiert.

## Files to Inspect
index.html (#careSheet Hero), src/ui/buddy/buddyAssetResolver.js, src/ui/buddy/buddyVisualMap.js, app.js (Care-Studio-Render)

## Allowed Changes
Markup des Buddy-Slots (img-Element), eine Render-Anbindung an den bestehenden Resolver, CSS für die Bildgröße im Slot.

## No-Go Areas
buddyVisualMap-Inhalte, Care-Logik, Asset-Dateien. KEINE neuen Assets einbinden, nur die bereits gemappten.

## Required Steps
1. Bestehenden Hint-Key-Fluss nachvollziehen, 2. img mit Fallback (FALLBACK_ASSET_ID) verdrahten, 3. Fehlerfall: Slot unsichtbar statt Broken-Image.

## Verification
npm run test:smoke (ui-care-sheet-regression) + manueller Check aller Care-Tabs

## Completion Report Format
wie Standard
```

### Task 8 – Typo-Tokens einführen (nur Definition + 1 Pilotbereich)

```
## Goal
Definiere Font-Size-Tokens in :root und migriere ausschließlich die Event-Karten-Metatexte (10px-Cluster um Zeilen ~4063–4912 in styles.css) auf min. 11px mit angehobenem Kontrast.

## Files to Inspect
styles.css (:root, .event-*-Klassen)

## Allowed Changes
Neue CSS-Variablen --gs-font-*; Ersetzen der font-size/color-Werte NUR in den genannten Event-Klassen.

## No-Go Areas
Alle anderen Komponenten, Layout-Eigenschaften, JS.

## Verification
npm run check:ui-architecture && visueller Vergleich Event-Center/Event-Sheet

## Completion Report Format
wie Standard; Screenshot-Vergleich erwünscht (stable-change-screenshots/)
```

### Task 9 – Manifest-Polish

```
## Goal
Manifest: deutsche description, 2 shortcuts, Konsistenz-Check lang vs. i18n-Default.

## Files to Inspect
manifest.webmanifest, sw.js (Cache-Liste!), src/i18n/index.js

## Allowed Changes
Nur manifest.webmanifest. Falls sw.js das Manifest precacht: Eintrag prüfen, NICHT die Cache-Strategie ändern.

## No-Go Areas
sw.js-Logik, start_url, scope, id, Icon-Pfade.

## Verification
Manifest-JSON validieren; PWA-Install im Browser testen; npm run test:runtime

## Completion Report Format
wie Standard
```

---

## 10. Klare Empfehlung

**Zuerst (diese Woche):** Task 1 + 2 (Umlaute) → Task 3 (X-Buttons) → Task 4 (Care-Defaults) → Task 5 (Prototyp-Reste). Das sind fünf kleine, fast risikofreie Aufgaben, die zusammen den Sprung von "Prototyp" zu "Produkt" in der Wahrnehmung machen. Alle sind durch bestehende Tests (`check:i18n`, `test:smoke`, `test:runtime`) abgesichert.

**Ausdrücklich noch NICHT:**

- **Kein Klima-Sheet-Redesign** – berührt Simulation/Eventsystem (High-Risk), braucht erst ein Konzept.
- **Kein Script-Bundling / Boot-Umbau** – App-Startpfad ist No-Go-Zone ohne expliziten Auftrag; aktuell funktioniert er.
- **Keine Monetarisierungs-/Balancing-Änderungen** – No-Go laut CLAUDE.md; erst Polish, dann Monetarisierungs-UX.
- **Kein Run-Summary-Logikumbau** – erst die reine Präsentations-Stufe (M6), Datenfluss unangetastet.
- **Keine Massenmigration aller 137 Font-Sizes auf einmal** – Pilotbereich (Task 8) zuerst, dann schrittweise.
- **Kein Eingriff in Eventsystem V2, Savegame, Service-Worker-Strategie** – ohnehin No-Go.

**Wichtigster nicht-UI-Punkt:** Vor größeren Store-Investitionen die **Plattform-Richtlinien für Cannabis-bezogene Edukations-Apps** (Apple App Store Review Guidelines / Google Play) recherchieren. Das Ergebnis beeinflusst Packaging-Strategie (PWA vs. Store) stärker als jedes Designdetail.
