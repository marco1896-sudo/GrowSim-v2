# Care Studio Premium Audit

## Executive Summary

Kurze Einschätzung:

- Aktueller Stand: Das Care Studio hat bereits eine starke Systembasis, solide Care-Logik, gute i18n-Grundlage und eine deutlich hochwertigere visuelle Richtung als ein Prototyp. Es wirkt aber noch nicht wie ein voll ausgereiftes App-Store-Premium-Feature, weil die entscheidende Nutzungslogik auf Mobile zu spät sichtbar wird.
- Größtes Premium-Defizit: Die erste Mobile-Ansicht verkauft Status und Atmosphäre, aber nicht die eigentliche Handlung. Auf `390x844` liegt die Action-Liste komplett unter dem ersten Fold; die Care-Entscheidung fühlt sich dadurch eher wie ein tiefer Formularbereich als wie das Herzstück des Features an.
- Größter UX-Hebel: Eine einzige klare Primärentscheidung oberhalb des Folds. Entweder eine starke empfohlene Aktion oder ein explizit validierter “Heute reicht Beobachten”-State.
- Größtes technisches Risiko: Der Guest-/Restore-Pfad ist aktuell nicht vollständig stabil. `test/guest-mode-startup.test.js` schlägt fehl, weil ältere Restores nicht sauber auf den normalen Daily-Teaser zurückfallen.
- Wichtigste nächste Phase: Eine kleine, sichere Mobile-First-Hierarchiephase für den oberen Care-Studio-Bereich, gefolgt von einer gezielten Copy-/Hint-Konsistenzphase.

## Current Strengths

- Die zugrunde liegende Care-Logik ist deutlich stärker als die aktuelle Oberfläche vermuten lässt. Wasser-, Root-Zone-, Salzlast-, Trend- und Diagnose-Modelle sind vorhanden und durch mehrere Tests abgesichert.
- Die Feuchte-/Risiko-Konsistenz zwischen Home und Care Studio ist technisch gut abgesichert. Der bestehende Konsistenztest für abgeleitete Moisture-/Risk-Werte lief grün.
- Der visuelle Grundton ist bereits deutlich näher an einem Premium-Mobile-Game als an einer Browser-Demo: dunkle Layer, klare Karten, Asset-gestützte Tabs, Buddy-Art, weiche Tiefe.
- Die Lokalisierungsstruktur ist grundsätzlich sauber. `check:i18n` lief grün, `de/en/es` sind formal synchron, und die gezielten Care-Locale-Checks liefen grün.
- Das Care Studio ist sauber in das bestehende Retention-/Buddy-/Weekly-/Decision-Ökosystem eingebettet, ohne eine zweite Authority zu bauen. Das ist für spätere Veredelung ein echter Architekturvorteil.

## Premium Gaps

- Das Care Studio verkauft im ersten Viewport vor allem Status, nicht Handlung. Der Nutzer sieht Titel, Chips, Buddy-Slot, Tabs und erst danach den eigentlichen Care-Nutzen.
- Die Primärhandlung ist auf Mobile zu tief. In der Live-Prüfung lag die Action-Liste bei `top: 820px`, die Decision-Zone bei `top: 1099px`, und im ersten Viewport waren `0` Action-Cards sichtbar.
- Der “Premium”-Teil mit Forecast, Delta-Chips, Aftercare und Hints ist nur nach Auswahl sichtbar. Im Default-State fühlt sich das Studio dadurch leerer und technischer an, als es eigentlich ist.
- Zu viele Elemente haben denselben visuellen Rang. Die vier Status-Chips, der Buddy-Block, die Tabs und der Feuchte-Block konkurrieren um Aufmerksamkeit, statt eine klare Reihenfolge zu bilden.
- Mehrere sichtbare Texte wirken funktional statt hochwertig: `Versorg.`, `Dryback`, `Wähle eine Methode.` und die wiederkehrenden Verdict-/Hint-Formeln.
- Buddy ist visuell präsent, aber im Care Studio selbst noch nicht stark genug als Coach spürbar.

## UX / Player Journey Findings

Analyse für Erstnutzer:

- Der Erstnutzer landet nicht in einer klar isolierten Care-Welt, sondern in einem sehr dichten Gesamtbild. Die First-Run-/Setup-Ebene steht über einem bereits stark aktiven HUD. Das wirkt spielreich, aber auch kognitiv dicht.
- Im frischen Care-Studio-Check sind Titel, Tabs und Status klar, aber der eigentliche “Was mache ich jetzt?”-Moment bleibt schwach. Im geprüften Fresh-Run war keine Care-Decision sichtbar und das Feedback lautete nur `Wähle eine Methode.`.
- Die Erstnutzer-Coach-Line war im geprüften Live-State leer. Damit fehlt genau der eine Satz, der den Wechsel von “lesen” zu “handeln oder bewusst nicht handeln” elegant rahmen könnte.

Analyse für wiederkehrenden Spieler:

- Der wiederkehrende Spieler bekommt auf dem Home-Screen schon gutes Retention-Futter: Daily-Care, Buddy-Kommentar, Streak-/Task-Kontext.
- Im Care Studio selbst fällt dieser Kontext zu stark ab. Die Oberfläche wirkt dann wieder generisch und startet nicht mit “heute dein Fokus”, sondern mit einem neutralen Studio-Zustand.
- Dadurch wird Care aktuell eher als separater Infobereich wahrgenommen als als taktischer Kernmoment des Tageslaufs.

Analyse für Spieler mit Problemzustand:

- Die Diagnose- und Recommendation-Logik ist grundsätzlich vorhanden und sinnvoll.
- Das Problem ist nicht die Modelllogik, sondern die Priorisierung im UI: Wenn ein Spieler schnell handeln muss, liegt die eigentliche Handlungsliste trotzdem tief im Scroll.
- Zusätzlich entstehen an einzelnen Stellen Mikro-Widersprüche in der Action-Copy. Ein Spieler kann gleichzeitig `Besser warten` und `Diese Wassergabe passt gerade gut.` lesen. Das schwächt Vertrauen genau in den Momenten, in denen die UI Sicherheit geben sollte.

Analyse für Spieler ohne akuten Handlungsbedarf:

- Der ruhige “Beobachten ist heute okay”-Gedanke ist inhaltlich schon vorhanden und deutlich besser als früher.
- Er wird aber noch nicht wie eine valide positive Entscheidung inszeniert. Statt eines bestätigten “Heute: beobachten reicht” sieht der Spieler oft nur eine leere Decision-Zone und eine passive Aufforderung, eine Methode auszuwählen.
- Das erzeugt unnötigen Handlungsdruck in einem System, das eigentlich gerade mit biologischer Plausibilität überzeugen will.

## Mobile Findings

- Die wichtigste Mobile-Schwäche ist keine Kollision mehr, sondern Priorisierung. Die UI ist formal stabiler, aber auf dem Smartphone wird der wertvollste Bereich zu spät sichtbar.
- Auf `390x844` ist das Care Studio oberhalb des Folds fast komplett ein Lese-/Status-Bereich. Die eigentlichen Gieß-Methoden beginnen faktisch außerhalb des direkten Sichtfensters.
- Die Status-Chips sind kompakt, aber in der Praxis sehr klein. Label und Detailzeilen bewegen sich optisch eher in Richtung Instrumenten-UI als in Richtung entspannte Premium-Mobile-Lesbarkeit.
- Der Buddy-Slot ist mobil sichtbar und technisch stabil, aber zu klein, um als emotionaler oder didaktischer Anker stark genug zu tragen.
- Die Scrolltiefe bis zur tatsächlichen Entscheidung ist für ein Alltagsfeature zu hoch. Auf einem Smartphone sollte Care wie ein schneller, sicherer Ritual-Screen funktionieren, nicht wie ein tiefer Analyse-Scroll.
- Positiv: Close-Button, Header und Safe-Area wirken in der geprüften Runtime stabil; die früheren Basisprobleme dort wirken deutlich besser eingefangen.

## Visual Design Findings

- Die Farb- und Materialrichtung passt grundsätzlich: dunkel, weich, kontrolliert, leicht botanisch. Das ist eine gute Premium-Basis.
- Das Care Studio nutzt aktuell viele gleichartige Card-Surfaces. Dadurch entsteht zwar Wertigkeit, aber nicht genug Hierarchie.
- Die Status-Chips wirken mehr wie kompakte Telemetrie-Bausteine als wie “player-facing” Premium-Badges.
- Die Tabs sind optisch solide und sauber asset-gestützt, verbrauchen aber sehr wertvolle Fold-Fläche, ohne die Handlung sofort zu schärfen.
- Der Buddy-Bereich hat Branding-Wert, aber wenig dramaturgische Wirkung. Im aktuellen Zustand ist er näher an einem dekorativen Companion-Slot als an einem aktiven Care-Coach.
- Das Feuchteprofil ist visuell am stärksten und inhaltlich sinnvoll priorisiert. Es ist aktuell der hochwertigste Teil des Care Studios.
- Die Action-Liste darunter wirkt im Vergleich schwächer: viel korrekte Information, aber nicht genug visuelle Führung, Belohnungsgefühl oder Primärfokus.

## Gameplay & Retention Findings

- Systemisch trägt das Care Studio schon zum Spielgefühl bei. Es ist klar mehr als eine reine Anzeige.
- Im tatsächlichen Spielergefühl kippt es aber noch zu oft in “ich lese Formfelder” statt “ich treffe eine saubere Grow-Entscheidung”.
- Die Daily-/Buddy-/Weekly-/Decision-Architektur ist vorhanden, wird im Care Studio selbst aber noch nicht stark genug ausgespielt.
- Es fehlt ein positives Ritualgefühl für gute Zurückhaltung. Gerade in einer realistischeren Grow-Sim ist “nichts überstürzen” eine spielerisch wertvolle Entscheidung und sollte sich belohnt anfühlen.
- Kleine potenzielle Retention-Hebel ohne Simulationsbruch:
  - eine klare Tagesfokus-Zeile im Care Studio
  - Buddy-Lob für korrektes Nicht-Handeln
  - kleine Aftercare-Bestätigungen auch für Beobachten/Warten
  - stärkere Verbindung zu Daily Tasks und Decision Cards direkt im Screen
- Monetarisierbare spätere Richtungen ohne Pay-to-Win-Risiko:
  - tiefere Buddy-Erklärungen oder Care-Insights als Komfort-/Knowledge-Layer
  - kosmetische Care-Studio-Themes
  - History-/Compare-Views für Forecasts und Trends
  - Premium-Polish-Features rund um Lesbarkeit und Rückblick statt Power-Vorteile

## Buddy Findings

- Buddy funktioniert aktuell im Home-/Daily-Kontext besser als im Care Studio selbst.
- Im geprüften Live-Care-State war der Buddy-Hinweis in Fresh- und Returning-Sicht praktisch derselbe, obwohl die Spielerlage unterschiedlich ist. Das macht Buddy im Studio weniger lebendig, als er sein könnte.
- Die Coach-Line war in den geprüften Live-Zuständen leer. Dadurch fehlt Buddy genau im Moment, in dem der Nutzer Orientierung sucht.
- Der Buddy-Slot ist stark genug, um Wiedererkennung zu stützen, aber noch nicht stark genug, um als echter Coach, Beruhiger oder Warner zu fungieren.
- Besonders wertvolle Buddy-Zustände im Care Studio wären:
  - ruhige Bestätigung bei stabilem Zustand
  - vorsichtige Warnung bei nasser Root Zone
  - Lob für gute Zurückhaltung
  - kurze Erklärung, warum eine Empfehlung “warten” statt “gießen” lautet
  - leichte Event-Sensibilität, wenn der Gesamt-Run Druck hat, auch wenn die Pflanzenwerte selbst noch ruhig wirken

## Copy & i18n Findings

- Positiv:
  - Die formale DE/EN/ES-Struktur ist sauber.
  - Die gezielten Care-Locale- und i18n-Audits liefen grün.
  - Es wurden im geprüften Runtime-Pfad keine rohen `careStudio.*`-Leaks sichtbar.

- Konkrete Probleme:
  - `Dryback` wirkt im deutschen Premium-Kontext zu technisch und halb englisch.
  - `Versorg.` spart Platz, kostet aber Wertigkeit.
  - `Wähle eine Methode.` ist korrekt, aber nicht hilfreich genug.
  - Mehrere Action-Hints sind semantisch zu generisch oder widersprüchlich.
  - In der Routine-Ansicht erben mehrere Karten Formulierungen wie `Leichtes Training passt gerade gut.`, obwohl es dort auch um Blätter prüfen, Topfgewicht schätzen oder Hygiene geht.

- Konkrete Copy-Verbesserungsvorschläge:
  - Statt `Dryback`
    - DE: `Abtrocknung`
    - EN: `Dryback` kann bleiben
  - Statt `Versorg.`
    - DE: `Versorgung`
    - EN: `Supply`
  - Statt `Wähle eine Methode.`
    - DE: `Wenn du heute eingreifen willst, starte mit einer Methode. Bei stabilen Werten reicht Beobachten.`
    - EN: `Pick a method if you want to intervene today. If values stay calm, observing is enough.`
  - Statt `Lies erst Wasser, Wurzelzone und Versorgung sauber, dann wähle die klarste Aktion.`
    - DE: `Heute erst lesen, dann handeln. Feuchte und Wurzelzone geben den Ton vor.`
    - EN: `Read first, act second. Moisture and root zone set the tone today.`
  - Für stabile Wasserlage statt generischem Neutralton:
    - DE: `Heute ist Ruhe ein guter Zug. Beobachte zuerst, ob die Wurzelzone weiter sauber abtrocknet.`
  - Für Wait-Verditcts auf Action-Karten:
    - DE: `Noch nicht ideal. Die Oberfläche wirkt trockener als die tiefe Zone.`
    - EN: `Not ideal yet. The surface looks drier than the deeper zone.`

## Data Consistency / Logic Findings

- Die eigentliche Werte- und Modelllogik wirkt in den geprüften Bereichen solide.
- `care-studio-moisture-risk-consistency.test.js` lief grün und bestätigt die zentrale Feuchte-/Risiko-Ableitung zwischen Home und Care Studio.
- Die Root-Zone-Gewichtung in `deriveCareSummary()` ist sinnvoll und unterstützt das Realismusziel.
- Das größte verbleibende Risiko liegt aktuell weniger in falschen Zahlen als in falscher Lesart:
  - sichtbare Widersprüche zwischen Verdict und Hint auf Action-Karten
  - routinefremde Hints für nicht-trainingartige Aktionen
  - starkes Home-Daily-Narrativ vs. relativ neutraler Care-Studio-Entry
- Es gibt einen potenziellen Cross-System-Kommunikationsspalt: Auf Home kann der Tageskontext deutlich druckvoller wirken als im Care Studio selbst. Das ist nicht zwingend ein Berechnungsfehler, kann aber die wahrgenommene Klarheit senken.

## Accessibility / Trust Findings

- Die dekorativen Assets halten korrekt leere `alt`-Texte. Das ist positiv.
- Die eigentliche Lesbarkeit ist aber noch nicht auf Premium-/Trust-Niveau:
  - sehr kleine Label
  - viel Großschreibung in Mikro-Typografie
  - dunkle Kontraste mit wenig optischer Luft
- Der Nutzer muss scrollen, bevor er die eigentliche Handlung überhaupt sieht. Das schwächt Orientierung und erhöht Fehlinterpretationsrisiko.
- Zustände werden oft über kurze Chips und Farbtöne kommuniziert. Für kritische Pflegeentscheidungen fehlt häufiger noch ein expliziter, menschlicher Satz mit klarer Bedeutung.
- Ein “Warten ist richtig”-State ist vorhanden, aber noch nicht stark genug als vertrauenswürdige Entscheidung inszeniert.
- Der aktuell fehlschlagende Guest-/Restore-Test ist ein echter Vertrauensbefund, weil er genau an einem sensiblen Wiederkehrerpfad sitzt.

## Technical Maintainability Findings

- `app.js` trägt einen sehr großen Teil der finalen Care-Studio-Präsentation: Chrome, Tabs, Feedback, Decision-Zone, Assets, Buddy, Renderpfade, Retention-Bridge.
- `src/simulation/careModel.js` und die Mapping-Dateien sind vergleichsweise sauber strukturiert. Das Problem ist weniger die Modellschicht als die stark konzentrierte Präsentationsschicht.
- Für kleine Premium-Verbesserungen ist das noch tragbar, aber jeder UI-/Copy-/Priority-Pass wird aktuell schnell zu einer breit verteilten `app.js`-Arbeit.
- Die Testabdeckung für Care selbst ist gut und ein echter Pluspunkt.
- Der rote Guest-Startup-Test zeigt aber, dass Ersttag-/Restore-/Teaser-/Overlay-Zustände noch fragil gekoppelt sind.
- `check:i18n` meldet sehr viele heuristisch ungenutzte Keys. Das ist kein direkter Blocker, erhöht aber langfristig die Unsicherheit bei Copy-Polish und Aufräumarbeiten.

## Priority Roadmap

### P0 — Must fix before AppStore premium push

- Ersten Fold des Care Studios neu priorisieren, damit mindestens eine klare Care-Entscheidung ohne Scroll sichtbar ist.
- Guest-/Restore-Regression im Startup-Teaser beheben, damit ältere Restores wieder sauber in den normalen Daily-Teaser fallen.
- Widersprüchliche Action-Copy bereinigen, besonders Wait-Verditcts gegen positive Hint-Sätze.
- In-Care-Onboarding für neue und wiederkehrende Spieler klarer trennen und den ersten Nutzersatz im Studio wirklich kontextabhängig machen.

### P1 — High impact premium polish

- Status-Chips, Buddy-Hero und Tabs kompakter gewichten, damit die wertvollste Information höher rutscht.
- Default-State der Decision-Zone sinnvoll machen: empfohlene Aktion oder bestätigtes Beobachten statt leerem Bereich.
- Buddy im Care Studio stärker als Coach statt nur als visuelle Begleitung einsetzen.
- Copy auf Premium-Niveau heben: weniger Abkürzungen, weniger technische Halbanglizismen, stärkere “why now / why wait”-Sätze.
- Daily-/Weekly-/Decision-Kontext direkt im Care Studio spiegeln, damit der Screen spürbar Teil des Loops wird.

### P2 — Nice to have

- Zusätzliche Vergleichs- oder History-Ansichten für letzte Pflegefolgen und Trends.
- Stärkeres visuelles Reward-Feedback für saubere Care-Entscheidungen.
- Spätere Komfort-/Cosmetic-Layer rund um Buddy-Insights, Themes oder Forecast-History.

## Recommended Next Codex Phases

1. Phase: Mobile First-Fold Hierarchy Pass
   - Ziel: Oberhalb des Folds eine klare Primärentscheidung sichtbar machen.
   - Betroffene Bereiche: `index.html`, `styles.css`, Care-Renderlogik in `app.js`
   - Risiko: Niedrig bis mittel
   - Erwarteter Premium-Effekt: Sehr hoch
   - Empfohlene Tests/QA: `ui-care-sheet-regression`, `care-studio-runtime`, Mobile-Check auf `390x844`, `375x812`, `360x740`

2. Phase: Care Action Copy Consistency Pass
   - Ziel: Verdict-, Hint- und Methodentexte fachlich und tonal konsistent machen.
   - Betroffene Bereiche: `app.js`, `src/i18n/locales/de.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json`
   - Risiko: Niedrig
   - Erwarteter Premium-Effekt: Hoch
   - Empfohlene Tests/QA: `check:i18n`, `care-studio-de-locale`, `care-studio-runtime`, manuelle Tab-Prüfung für Wasser/Feed/Pflege/Diagnose

3. Phase: Buddy In-Care Coaching Pass
   - Ziel: Buddy im Care Studio kontextsensitiver und emotional nützlicher machen.
   - Betroffene Bereiche: Care-Hero in `app.js`, Buddy-Mapping, Daily/Buddy-Bridge
   - Risiko: Mittel
   - Erwarteter Premium-Effekt: Hoch
   - Empfohlene Tests/QA: Fresh-Run-Care-Flow, Returning-Run-Care-Flow, Guest-/Reload-Checks, Buddy-/Daily-Tests

4. Phase: Retention-to-Care Bridge Pass
   - Ziel: Daily-, Weekly- und Decision-Kontext sichtbar in das Care Studio einziehen.
   - Betroffene Bereiche: `src/gameplay/dailyCareSelection.js`, `src/gameplay/buddyDailyCheck.js`, `src/gameplay/weeklyMissions.js`, `src/gameplay/decisionCards.js`, Care-UI in `app.js`
   - Risiko: Mittel
   - Erwarteter Premium-Effekt: Hoch für Bindung und Spielgefühl
   - Empfohlene Tests/QA: `daily-care-selection`, `buddy-daily-check`, `weekly-missions`, `decision-cards`, manuelle Tageswechsel-Stichproben

5. Phase: Guest Restore / First-Day State Hardening
   - Ziel: Ersttag-, Reload- und Restore-Zustände im Home-/Care-Handoff wieder vollständig vertrauenswürdig machen.
   - Betroffene Bereiche: Home-Teaser, Startup-/Restore-Flow, Guest-Mode-bezogene Runtimepfade
   - Risiko: Mittel
   - Erwarteter Premium-Effekt: Mittel bis hoch
   - Empfohlene Tests/QA: `guest-mode-startup`, `ui-onboarding-settings-smoke`, Reload-/Restore-Stichproben mit altem Save

## Validation Performed

- Live-Inspektion des Care Studios im gerenderten Build über In-App-Browser und Playwright
- Mobile-Prüfung auf Smartphone-Niveau mit Fokus auf `390x844`
- Frische First-Run-/Onboarding-Oberfläche gelesen
- Returning-Player-/aktiver Run-Care-Studio-Livezustand geprüft
- Gezielte Code-, Style-, i18n- und Test-Lektüre der Care-relevanten Dateien
- Bestehende Runtime-/Regressionstests gezielt ausgeführt

## Files Inspected

- `AGENTS.md`
- `.codex/ARCHITECTURE_MAP.md`
- `.codex/CODEX_MASTER.md`
- `.codex/PRODUCT_VISION.md`
- `.codex/IDEA_WORKFLOW.md`
- `.codex/GAME_DESIGN_RULES.md`
- `.codex/UI_STYLEGUIDE.md`
- `.codex/FEATURE_CONCEPT_TEMPLATE.md`
- `.codex/IMPLEMENTATION_RULES.md`
- `.codex/ASSET_PIPELINE.md`
- `.codex/SAVE_AND_MIGRATION_RULES.md`
- `.codex/I18N_RULES.md`
- `.codex/BACKEND_ADMIN_RULES.md`
- `.codex/MONETIZATION_RULES.md`
- `.codex/PWA_SERVICE_WORKER_RULES.md`
- `.codex/MINIGAME_RULES.md`
- `.codex/TESTING_AND_QA.md`
- `.codex/PROMPT_LIBRARY.md`
- `package.json`
- `index.html`
- `styles.css`
- `app.js`
- `src/ui/mappings/careMapping.js`
- `src/ui/mappings/homeMapping.js`
- `src/ui/mappings/playerFacingStatus.js`
- `src/ui/care/careActionHints.js`
- `src/simulation/careModel.js`
- `src/gameplay/dailyCareSelection.js`
- `src/gameplay/buddyDailyCheck.js`
- `src/gameplay/weeklyMissions.js`
- `src/gameplay/decisionCards.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `docs/app-store-readiness/codex-care-studio-first-visit-polish.md`
- `docs/app-store-readiness/codex-care-studio-stable-action-explanation-polish.md`
- `docs/app-store-readiness/codex-mobile-visual-premium-qa.md`
- `docs/gameplay-activity-layer-phase-2-dailycare-report.md`
- `docs/gameplay-activity-layer-phase-3-buddy-daily-check-report.md`
- `docs/gameplay-activity-layer-phase-3-5-dailycare-ui-polish-report.md`
- `docs/gameplay-activity-layer-phase-4-weekly-missions-report.md`
- `docs/gameplay-activity-layer-phase-6-decision-cards-report.md`
- `test/care-studio-runtime.test.js`
- `test/ui-care-sheet-regression.test.js`
- `test/care-studio-moisture-risk-consistency.test.js`
- `test/care-studio-de-locale.test.js`
- `test/daily-care-selection.test.js`
- `test/buddy-daily-check.test.js`
- `test/weekly-missions.test.js`
- `test/decision-cards.test.js`
- `test/care-trends.test.js`
- `test/ui-onboarding-settings-smoke.test.js`
- `test/guest-mode-startup.test.js`

## Skills Used

- `design-taste-frontend`
  - Für die Premium-/Mobile-/Visual-Hierarchie-Bewertung und zur Prüfung auf generische UI-Muster
- `build-web-apps:frontend-testing-debugging`
  - Für die gerenderte Frontend-Prüfung mit Live-Viewport, DOM-Inspektion und Screenshot-basierter QA
- `browser:control-in-app-browser`
  - Für die In-App-Browser-Inspektion des laufenden Builds
- `web-testing`
  - Für die Auswahl und Einordnung der relevanten Care-/Regressionstests

## Out of Scope

- Keine Runtime-Änderungen
- Keine UI- oder CSS-Änderungen
- Keine Refactors
- Keine neuen Features
- Kein echtes Geräte-QA auf physischem iPhone/Android
- Kein vollumfänglicher Desktop-/Tablet-/Cross-Browser-Matrixlauf
- Keine Monetarisierungs-, Backend-, Save- oder Event-V2-Umbauten
- Keine Bewertung von Store-Listing, Store-Screenshots oder Release-Metadaten außerhalb des Care-Studio-Kontexts

