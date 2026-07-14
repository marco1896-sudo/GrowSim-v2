# Premium UI/UX Audit - Grow Simulator

## 1. Executive Summary
- Grow Simulator wirkt funktional bereits deutlich reifer als ein Prototyp: Home, Care Studio, Missions, Events, Support, Coin-Shop, PWA und Buddy-Assets sind sichtbar vorhanden und miteinander verdrahtet.
- Der aktuelle Gesamteindruck ist "ambitionierte Premium-PWA mit starkem Simulationskern", aber noch nicht durchgehend AppStore-reif, weil Trust-Details, Sprache, Tap-Zonen und Payment-Flow an mehreren Stellen unfertig wirken.
- Wichtigste Staerke: Die Kernsysteme sind tief und passend zum Grow-Fantasy aufgebaut, besonders Care Studio, Daily/Weekly-Missions, Decision Cards und Event V2.
- Groesstes UI/UX-Risiko: Nutzer sehen im ersten Eindruck viele starke Systeme gleichzeitig, aber einzelne sichtbare Brueche wie `Naehrstoffe`, `unterst?tzen`, kleine Klimatasten, PayPal-Navigation und Remote-Save-Warnungen schwachen Vertrauen.
- Groesster Hebel fuer Premium-Gefuehl: Erstansicht und Menue auf wenige klare Tagesentscheidungen reduzieren, Copy/Encoding bereinigen und Buddy als ruhigen Coach sichtbarer machen.
- Groesster Hebel fuer Retention: Daily Care + Buddy Check + Care Studio als ein klarer Tagesloop statt als mehrere getrennte Flaechen erlebbar machen.
- Groesster Hebel fuer Monetarisierung ohne unserioes zu wirken: Supporter-Flow als freiwillige Projektunterstuetzung mit Dankmoment fuehren; Coin-Shop erst nach Trust-/Copy-Polish staerker zeigen.

## 2. Scorecard
| Bereich | Score | Begruendung |
| --- | ---: | --- |
| First Impression | 7.0 | Visuell dicht und hochwertiger als Standard-Webapp, aber Startscreen zeigt sehr viele Werte und teils technische Begriffe sofort. |
| Premium Visual Quality | 7.0 | Starke Playercard-/HUD-Richtung, gute Assets; Encoding- und Copy-Brueche verhindern Premium-Konsistenz. |
| Mobile Usability | 6.5 | Kein horizontaler Overflow bei 390x844, aber mehrere aktive Tap-Ziele liegen unter 44px. |
| Onboarding Clarity | 7.0 | Gefuehrter Run-Builder mit Buddy und sinnvollen Startoptionen; Smoke-Test zeigt aber Summary-Mismatch `Indoor Run` vs `Indoor`. |
| Buddy Integration | 7.0 | Onboarding und Missions nutzen Buddy bereits; Care Studio und Support/Coin-Shop verschenken Markenwirkung. |
| Care Studio UX | 7.5 | Beste Kernflaeche: echte Diagnose, Tabs, Vorschau und Coach-Line; Buddy-Slot/Labeling noch uneindeutig. |
| Gameplay Loop / Retention | 8.0 | Daily, Weekly, Decision Cards, Streaks, Coin Actions sind stark und plausibel; Sichtbarkeit im Home noch zu eng gepackt. |
| Monetization Trust | 5.5 | Freiwilliger Support ist richtig gerahmt, aber Tier-Klick oeffnet PayPal sofort; Coin-Shop wirkt mechanisch und vorteilsnah. |
| Accessibility | 6.0 | ARIA-Struktur und Sheet-Titel vorhanden; kleine Buttons, Fokus-/Encoding-Themen und dichte Texte bleiben Risiken. |
| AppStore Readiness | 6.5 | PWA-Smokes bestanden, aber Trust, Payment, Copy, First-Run-Test und mobile Tap-Zonen muessen vor Store-Pitch stabiler werden. |
| Technical UI Maintainability | 5.5 | Viele Systeme funktionieren, aber grosse Root-Dateien (`app.js`, `styles.css`, `index.html`) und globale Sheet-Wiring-Pfade erhoehen Polish-Risiko. |

## 3. Screen-/Flow-Audit

### First-Run / Day-1-Overlay
- Gut: Run-Builder ist strukturiert, mobile-first gedacht und nutzt Buddy-Assets in `ui.js` (`ONBOARDING_BUDDY_ASSETS`) sowie echte Setup-Optionen in `index.html`.
- Nicht premium: Der Test `node test/ui-onboarding-settings-smoke.test.js` faellt, weil die Summary fuer Setup Mode `Indoor Run` statt `Indoor` liefert. Das ist klein, aber fuer First-Run-Vertrauen relevant.
- Neue Nutzer: Optionen sind sinnvoll, aber viele Karten, Badges und Effekte koennen sich wie Formular statt emotionaler Start anfuehlen.
- Empfehlung: Phase-1 nur Summary-Text, Copy-Konsistenz, Step-Hierarchie und Buddy-Startmoment pruefen, keine Setup-Logik aendern.

### Home / Dashboard
- Gut: Playercard, Tagesziel, Coins, Klima, Wachstum, Kernwerte und Schnellaktionen sind im ersten View erreichbar.
- Nicht premium: 390x844-Messung fand kleine Tap-Ziele: `menuToggleBtn` 31x31, Klima-Buttons ca. 15-18x14-20, Diagnose 22x22.
- Neue Nutzer: Home wirkt sehr informationsdicht; "Boost x24", "Night Shift", Klima-Werte und Event-Zeit konkurrieren mit Tagesziel und Care Studio.
- Empfehlung: Home zuerst auf "Was braucht mein Run heute?" ausrichten; Expertenwerte weiterhin erreichbar, aber visuell leiser.

### Care Studio
- Gut: Care Studio bietet echte Subsystemtiefe: Wasser, Duengung, Pflege, Diagnose, Vorhersage, Risiko und Coach-Line.
- Nicht premium: Static Markup enthaelt weiterhin den `+`-Glyph im Buddy-Slot; im Render war zwar ein Bild vorhanden, aber Textpfad enthielt weiter `+` und "Care Studio".
- Retention: Sehr guter taeglicher Kern, aber der Hero sollte klarer sagen: "Buddy liest den Run" statt nur einen generischen Studio-Slot zu zeigen.
- Datei-Hinweise: `index.html` Care-Sheet ab Zeile 414, `app.js` Care-Rendering um 16600+, `ui.js` Sheet-Wiring um 1898+.

### Buddy Coach Layer
- Gut: Onboarding, Missions und Daily Checks nutzen Buddy sichtbar und inhaltlich passend.
- Nicht premium: Support und Coin-Shop haben `shop-sheet-buddy`-Container, aber im gerenderten Check keine Buddy-Bilder. Care Studio mischt Bild, `+` und Label.
- Empfehlung: Buddy in drei klaren Rollen fuehren: Begruesser im First Run, Diagnose-Coach im Care Studio, Dank-/Vertrauensfigur im Supporter-Flow.

### Missions / Events / Decision Cards
- Gut: Missions-Sheet ist funktional stark: Daily Care, Streak, Decision Card, Weekly Mission, Coin-Helfer und Buddy Check sind sichtbar.
- Nicht premium: Sichtbare deutsche Texte nutzen teils ASCII-Fallbacks wie `Naehrstoffe`, `Ueberkorrektur`, `Laeuft`. Der i18n-Key-Audit findet das nicht, weil die Keys vollstaendig sind.
- Events: Event-Center hat moderne Bild-/Fallback-Pfade und Event V2-Markup, aber die getestete State-Probe zeigte nur inaktive "Grow-Lage". Aktive Event-Zustaende sollten manuell mit Dev-Seeds geprueft werden.

### Root Rush
- In den geprueften Dateien wurde kein auffindbarer `Root Rush`-, `root-rush`- oder `rootRush`-Entry gefunden. Es gibt viel Root-Zone-Logik, aber keine sichtbare Minigame-Integration.
- Risiko: Wenn Root Rush produktseitig erwartet wird, ist es fuer Nutzer aktuell nicht discoverable.
- Empfehlung: Erst als Konzept/Folgephase behandeln: Einstiegspunkt, Dauer, Reward-Limit, Failure-Verhalten und Verbindung zu Wurzelpflege klaeren.

### Supporter / Premium / Coin-Flaechen
- Gut: Menue rahmt Coin-Shop als "Optionale Komfortaktionen" und Support als "Freiwilliger Support". Das ist die richtige Richtung.
- Risiko: Support-Tier-Klick navigierte im Browser direkt zu PayPal im selben Tab; kein Donation-Abschluss erfolgte, aber der Flow fuehlt sich abrupt an.
- Sichtbarer Fehler: PayPal-CTA im Support-Sheet renderte als `Mit PayPal unterst?tzen`.
- Coin-Shop: "Direkt anwenden", Auto-Care, Growth Boost und Event Reroll wirken eher wie Pay-to-advantage als Premium Support, solange Trust und Balance-Erklaerung fehlen.

### Settings / Sprache / PWA-Zustaende
- Gut: Manifest ist vorhanden, standalone, `de-DE`, Icons 192/512 inklusive maskable. Service Worker hat Shell-Cache, Runtime-Cache und Network-First-Navigation.
- Gut: `service-worker-shell-assets.test.js` und `offline-reopen-sw-boot.test.js` bestanden.
- Risiko: Browser-Run zeigte wiederkehrende `[remote-save] failed`, `[remote-load] failed` und `[sim-time] Large simulation time jump detected`. Auch wenn lokal erwartbar, wirkt es in einer AppStore-Debug-Konsole unruhig.

## 4. Premium-Gefuehl: konkrete Defizite

### P0
| Problem | Warum wichtig | Nutzerwirkung | Vermutete Ursache | Bereiche | Verbesserung |
| --- | --- | --- | --- | --- | --- |
| Support-Tier oeffnet PayPal sofort | Payment/Support ist Trust-kritisch | Nutzer fuehlt sich aus der App geworfen | `supportOptionList` ruft `onSupportTierSelected` direkt auf | `ui.js`, `app.js`, `supportSheet` | Tier nur auswaehlen, CTA separat oeffnen; PayPal in neuem externen Kontext mit vorherigem Dank-/Info-State. |
| First-Run-Smoke faellt | Erster Start muss stabil wirken | QA signalisiert Onboarding-Mismatch | Asset-/Label-Text ersetzt Summary-Erwartung | `ui.js`, `index.html`, Test | Summary-Label normalisieren oder Test bewusst aktualisieren, danach First-Run erneut pruefen. |

### P1
| Problem | Warum wichtig | Nutzerwirkung | Vermutete Ursache | Bereiche | Verbesserung |
| --- | --- | --- | --- | --- | --- |
| Kleine Touch-Ziele | Mobile AppStore-Qualitaet | Fehlklicks im wichtigsten Screen | Dichte HUD-Controls | Home Klima, Menu, Diagnose | Min. 44x44 Hit-Areas, visuelle Groesse darf kompakt bleiben. |
| Encoding/ASCII-Brueche | Premium wirkt sofort beschaedigt | "Unfertig"/"Web-Prototyp" | Mischquellen, Runtime-Fallbacks | Missions, Support, Event Copy | UTF-8-Textscan auf sichtbare Strings, nicht nur i18n-Key-Paritaet. |
| Coin-Shop zu direkt | Monetarisierung kann unserioes wirken | Spieler vermutet Pay-to-win | Direktkauf/Boost-Sprache | Coin-Shop, Coin Actions | Als Komfort/Analyse/Guidance rahmen, klare Grenzen und keine Simulation-Abkuerzung im Kernloop. |

### P2
| Problem | Warum wichtig | Nutzerwirkung | Ursache | Bereiche | Verbesserung |
| --- | --- | --- | --- | --- | --- |
| Buddy uneinheitlich stark | Buddy ist Markenanker | Mal Coach, mal Deko, mal nicht sichtbar | Verschiedene Integrationsstaende | Care, Missions, Support, Shop | Buddy-Rollenmatrix fuer 5 Kernmomente. |
| Home ueberlaedt | Premium braucht klare Prioritaet | Nutzer weiss nicht, wo anfangen | Alle Systeme im First View | Home | Daily Focus und Care Studio staerker priorisieren. |
| Event inactive state wirkt blass | Events sind Lern-/Retention-Hebel | Kein "Aha" ohne aktives Event | Inactive fallback dominiert Probe | Events | Empty state mit naechstem plausiblen Beobachtungsziel. |

### P3
- Menue laesst optionale, Fortschritt- und Info-Bereiche gut erkennen, koennte aber kuerzer gruppiert werden.
- Support-Tiers Samen/Wachstum/Bluete sind thematisch stark; brauchen nur Dankmoment, Buddy und saubere externe Navigation.
- PWA-Beschreibung ist solide, koennte fuer Store-Copy emotionaler werden, ohne Prototype-Sprache.

## 5. Retention-Analyse
- Nutzer kommen nach Tag 1 zurueck, weil Daily Care, Streak, Weekly Mission, Decision Card und Care Studio echte taegliche Gruende liefern.
- Nutzer springen ab, wenn sie im Home nicht verstehen, welche Aktion heute wirklich wichtig ist, oder wenn technische Kopiereste das Vertrauen stoeren.
- Buddy bindet in Missions und Onboarding bereits emotional, ist aber im taeglichen Care-Core noch nicht stark genug als wiederkehrender Coach inszeniert.
- Daily/Weekly/Missions sind sichtbar, aber der Home-Teaser ist sehr kompakt und kann neben Klima/Wachstum/Boost untergehen.
- Care Studio funktioniert als taeglicher Grund zum Oeffnen, wenn die erste Zeile immer eine konkrete, pflanzenlogische Empfehlung liefert.
- Staerkste Retention-Mechaniken:
  1. Buddy Daily Check mit direktem Care-Studio-Einstieg.
  2. Decision Card als kleine, erklaerbare Tagesentscheidung.
  3. Weekly Mission, die mehrere Daily-Care-Abschluesse sinnvoll verbindet.

## 6. Monetarisierungs-UX
- Natuerliche Einbettung: Supporter nach positivem Run-Moment, nach hilfreichem Buddy-Coach-Moment, im Settings/About-Bereich und nach freiwilligem "Projekt unterstuetzen".
- Aktuelles Vertrauensrisiko: Coin-Shop bietet direkte Simulationsvorteile, waehrend Support-Tiers direkt extern oeffnen und Copy-Encoding sichtbar fehlerhaft ist.
- Serioese Flaechen: Menue-Hinweise "Optional" und "Freiwilliger Support", Support-Tiers Samen/Wachstum/Bluete, deaktivierte Coin-Packs bis Provider-Setup.
- Vermeiden: "Direkt anwenden" fuer starke Effekte, aggressive Best-Value-Sprache, Ads als Rettung ohne klare Fairness-Grenzen, unerklaerte Boosts.
- Startnext/Supporter sauber integrieren: als Projektfortschritt mit freiwilligem Beitrag, Roadmap-Ausblick, Buddy-Dank, klarer Datenschutz-/Zahlungsweiterleitung.
- Beste bezahlbare Angebote:
  1. Supporter-Badge/Profilrahmen ohne Gameplay-Vorteil.
  2. Buddy Cosmetic/Coach-Skin oder Dankmoment.
  3. Premium Komfortpaket mit mehr Analyse-/Verlaufsansicht, aber ohne Kernsimulation zu brechen.

## 7. Buddy als Premium-Marke
- Aktuell ist Buddy gleichzeitig Coach und Markenfigur, aber noch nicht konsistent genug als taeglicher Begleiter.
- Staerker fuehren: First Run, Tagesfokus, Care-Studio-Diagnose, Event-Erklaerung, Supporter-Dank.
- Reduzieren: Routine-Listen, Shop-Kaufdruck, Bereiche mit rein technischen Zahlen.
- Retention-Momente: Morgencheck, "nach Aktion beobachte ich mit dir", Streak-Dank, Recovery nach Fehler, Wochenziel-Abschluss.
- Fehlende visuelle Zustaende: ruhiger Diagnoseblick, Dank/Support, vorsichtige Warnung, Erfolg ohne Uebertreibung, Lernmoment.
- Staerkste Buddy-Ideen:
  1. Buddy Daily Lens oben im Care Studio.
  2. Buddy bedankt sich nach freiwilligem Support statt sofort PayPal zu oeffnen.
  3. Buddy erklaert Decision Cards mit einem Satz "Warum das heute wichtig ist".

## 8. Accessibility & Mobile
- Touch-Ziele: Mehrere Home-Controls unter 44px gemessen; P1 vor AppStore-Polish.
- Kontraste: Nicht voll automatisiert geprueft; dunkle Premium-Palette wirkt grundsaetzlich brauchbar, aber kleine Labels und Chips brauchen gezielte Contrast-Pruefung.
- Schriftgroessen: Home ist dicht; wichtige Zahlen sind lesbar, Sekundaertexte im Teaser/Missions koennen klein werden.
- Fokuszustaende: CSS besitzt viele Hover/Focus-Regeln, aber externe PayPal-Navigation und kleine Icon-Buttons sollten manuell mit Tastatur geprueft werden.
- Scrollverhalten: 390x844 hatte keinen horizontalen Overflow; Menue und Sheets sind aber lang und muessen auf 360x740 erneut geprueft werden.
- Modals/Overlays: Bottom sheets funktionieren, aber Support-Flow kann den App-Kontext verlassen.
- Reduzierte Animation: Buddy-Motion-Klassen haben Media-Query-Hinweise im CSS; bitte final mit `prefers-reduced-motion` visuell pruefen.
- Fehlerzustande: Remote-save/load-Warnungen und Time-Jump-Warnung brauchen bessere Nutzer-/Dev-Trennung.
- Einhandbedienung: Hauptaktionen rechts sind erreichbar; Klima-Microcontrols oben rechts sind zu klein.

## 9. Technische UI-Risiken
- CSS-Komplexitaet: `styles.css` ist sehr gross; Premium-Polish kann leicht Seiteneffekte erzeugen.
- Globale Styles/Selektoren: Viele globale Klassen und IDs; Sheet-Polish sollte pro Bereich erfolgen.
- Fragile DOM-Selektoren: Tests und UI nutzen viele konkrete IDs; gut fuer Smoke, aber riskant bei Strukturumbau.
- i18n-Risiken: Key-Paritaet ist gut, aber sichtbare ASCII-/Encoding-Fehler bleiben unentdeckt.
- Save/Reload-Risiken: Browser-Run zeigte Remote-Save/Load-Warnungen und Time-Jump-Warnung; PWA-Smokes bestanden dennoch.
- Asset/Performance-Risiken: Viele Bilder, Buddy-Assets, event visuals und grosse CSS/JS-Dateien; mobile Performance sollte vor Release separat profiliert werden.
- Gefaehrliche Polish-Stellen: Home-HUD Layout, Care Studio Hero, Support Flow, Coin-Shop, service worker cache list, Event V2 sheet exclusivity.

## 10. Priorisierter Schritt-fuer-Schritt-Umsetzungsplan

### Phase 1: Premium First Impression ohne Runtime-Risiko
- Ziel: sichtbare Copy-/Encoding-/Tap-Ziel-Probleme beheben.
- Warum jetzt: geringes Logikrisiko, hoher Trust-Effekt.
- Risiko: CSS-Hit-Areas koennen Layout verschieben.
- Betroffene Dateien: `index.html`, `styles.css`, `src/i18n/locales/*.json`, evtl. `ui.js`.
- Aufgaben: Encoding-Scan, 44px Hit-Areas, Home-Textprioritaet, Support-CTA-Text.
- Akzeptanz: kein `?`, `ae/ue/oe` in sichtbarer deutscher Runtime-Copy, mobile Tap-Ziele >=44px.
- Test: i18n audit, public text readiness, onboarding smoke, 390/360 mobile visual pass.
- Nicht anfassen: Simulation, Save, Economy, Service Worker.

### Phase 2: First 5 Minutes / Onboarding verstaendlicher und emotionaler machen
- Ziel: First-Run-Smoke reparieren und Buddy-Start scharfstellen.
- Warum jetzt: erster Nutzerkontakt.
- Risiko: Setup-Summary/Test-Mismatch.
- Dateien: `index.html`, `ui.js`, `test/ui-onboarding-settings-smoke.test.js`.
- Aufgaben: Summary-Labels normalisieren, Buddy-Intro kuerzen, Startklar-Moment pruefen.
- Akzeptanz: Smoke gruen, keine neuen Setup-Werte.
- Test: onboarding smoke, fresh local storage manual.
- Nicht anfassen: Setup-Balancing.

### Phase 3: Home/Dashboard visuell aufwerten
- Ziel: Tagesfokus vor Nebenwerten.
- Warum jetzt: Home ist taeglicher Einstieg.
- Risiko: Layout-Kaskade.
- Dateien: `index.html`, `styles.css`, Home-Mapping.
- Aufgaben: Daily teaser groesser/lesbarer, Klima-Microcontrols als echte Hit-Areas, Diagnose-Button groesser.
- Akzeptanz: keine Overlaps 360/390/430, klare erste Handlung.
- Test: mobile screenshots, home layout tests.
- Nicht anfassen: Klima-Logik.

### Phase 4: Care Studio als taegliches Kernfeature schaerfen
- Ziel: Buddy + Diagnose + naechste Aktion klarer.
- Warum jetzt: groesster Gameplay-UX-Hebel.
- Risiko: Care-Rendering komplex.
- Dateien: `index.html`, `app.js`, `styles.css`, Care tests.
- Aufgaben: `+`-Glyph entfernen/ersetzen, Buddy-Rolle definieren, Coach-Line priorisieren.
- Akzeptanz: Care Studio liest sich ohne generischen Slot, Tests gruen.
- Test: care sheet regression, care runtime, mobile sheet pass.
- Nicht anfassen: Care-Methoden-Balancing.

### Phase 5: Buddy-Coach-Layer emotionaler und funktionaler machen
- Ziel: Buddy-Rollenmatrix ueber Kernmomente.
- Warum jetzt: Marke und Retention.
- Risiko: Uebernutzung.
- Dateien: Buddy resolver/map, Home/Missions/Care/Support.
- Aufgaben: Coach, Warnung, Dank, Recovery, Erfolg mappen.
- Akzeptanz: Buddy hilft in 3 Kernmomenten, keine Deko-Flut.
- Test: visual/manual, asset fallback.
- Nicht anfassen: neue Assets ohne Asset-Pipeline.

### Phase 6: Retention-Flaechen sichtbarer machen
- Ziel: Daily/Weekly/Decision klarer im Home und Missions-Sheet.
- Warum jetzt: vorhandene Systeme koennen mehr leisten.
- Risiko: UI-Dichte.
- Dateien: Missions UI, daily/weekly presentation.
- Aufgaben: Tagesfokus, Claim-Zustand, Buddy-Hinweis, Weekly Progress besser staffeln.
- Akzeptanz: Nutzer versteht Aufgabe, Fortschritt, Reward ohne Scrollstress.
- Test: daily runtime/UI-state tests.
- Nicht anfassen: Reward-Balancing.

### Phase 7: Supporter-/Premium-Funnel serioes einbauen
- Ziel: Support freiwillig, warm, sicher.
- Warum jetzt: Aktueller Flow kann Vertrauen kosten.
- Risiko: externe Payment-Flows.
- Dateien: `index.html`, `ui.js`, `app.js`, support tests.
- Aufgaben: Tier select != PayPal open, Dankmoment, externe Weiterleitung erklaeren, Buddy visual.
- Akzeptanz: Tier-Auswahl bleibt in App, CTA oeffnet extern bewusst.
- Test: browser flow, no-payment click audit.
- Nicht anfassen: echte Payment-Konfiguration ohne Freigabe.

### Phase 8: Mobile/Accessibility/AppStore-Polish
- Ziel: Store-taugliche Bedienbarkeit.
- Warum jetzt: vor Beta/Store.
- Risiko: viele kleine CSS-Aenderungen.
- Dateien: CSS, index labels, tests.
- Aufgaben: 360/390/430 viewports, focus states, reduced motion, contrast.
- Akzeptanz: keine kleinen Haupt-Tap-Ziele, keine Clip/Overlap.
- Test: mobile screenshots, keyboard smoke.
- Nicht anfassen: Featureumfang.

### Phase 9: Performance-/Asset-/Animation-Polish
- Ziel: schnelle Premium-PWA auf Mobile.
- Warum jetzt: visuelle Dichte ist hoch.
- Risiko: Asset-Pipeline.
- Dateien: CSS, asset refs, service worker nur nach Freigabe.
- Aufgaben: groesste Bilder pruefen, Animationen reduzieren, lazy/eager audit.
- Akzeptanz: keine jankenden Kernanimationen, Asset-Fallbacks sauber.
- Test: Lighthouse/DevTools, offline smoke.
- Nicht anfassen: cache strategy ohne explizite Freigabe.

### Phase 10: Release-Readiness-Audit
- Ziel: finale AppStore-/PWA-Checkliste.
- Warum jetzt: nach Polish.
- Risiko: keine.
- Dateien: docs, manifest, tests.
- Aufgaben: Fresh install, reload, offline, mobile, copy, support flow, event active states.
- Akzeptanz: alle P0/P1 geschlossen oder bewusst akzeptiert.
- Test: gezielte Smoke-Suite plus manuelle Screens.
- Nicht anfassen: neue Features.

## 11. Quick Wins
| Aenderung | Wirkung | Risiko | Dateien | Aufwand |
| --- | --- | --- | --- | --- |
| PayPal-CTA-Encoding `unterst?tzen` fixen | Sofort mehr Trust | Niedrig | i18n/Support render | S |
| Support-Tier nur auswaehlen, nicht direkt oeffnen | Payment-Flow wirkt sicher | Mittel | `ui.js`, `app.js` | M |
| Klima-/Diagnose-Hit-Areas auf 44px bringen | Mobile Bedienbarkeit | Mittel | `styles.css` | S |
| Onboarding Summary `Indoor Run` vs `Indoor` klaeren | Smoke wieder gruen | Niedrig | `ui.js`/Test | S |
| Missions ASCII-Copy bereinigen | Premium-Sprache | Niedrig | i18n/runtime copy | S |
| Care Studio `+`-Glyph entfernen | Buddy-Slot wirkt final | Niedrig | `index.html`, render | S |
| Coin-Shop Sprache von "Direkt anwenden" auf Wirkung/Grenzen umbauen | Mehr Seriositaet | Mittel | i18n/app render | M |
| Support-Sheet Buddy-Visual aktivieren | Marke und Waerme | Niedrig-Mittel | Buddy resolver/support render | M |
| Home Daily Focus visuell priorisieren | Retention klarer | Mittel | CSS/Home | M |
| Root Rush Entry auditieren | Erwartungsabgleich | Niedrig | docs/source search | S |

## 12. Groesste Risiken
1. Payment-/Support-Flow verlaesst App zu abrupt.
2. Sichtbare Encoding-Fehler brechen Premium-Vertrauen.
3. Kleine mobile Tap-Ziele fuehlen sich nicht AppStore-reif an.
4. Home ueberfordert neue Nutzer mit zu vielen gleich lauten Systemen.
5. Coin-Shop wirkt vor Trust-Polish zu vorteilsorientiert.
6. First-Run-Smoke ist aktuell rot.
7. i18n-Key-Audit deckt sichtbare ASCII-/Encoding-Probleme nicht ab.
8. Grosse Root-Dateien machen UI-Polish fehleranfaellig.
9. Remote-save/load-Warnungen koennen Cloud-/Guest-Vertrauen schwaechen.
10. Root Rush ist in den geprueften Pfaden nicht auffindbar/discoverable.

## 13. Empfohlene naechste Codex-Prompts
1. `Validiere nur docs/premium-ui-ux-audit-appstore-readiness.md gegen aktuelle App. Lies nur den Report, AGENTS.md und die genannten Dateien. Keine Codeaenderungen. Pruefe, ob Findings konkret, priorisiert und testbar sind.`
2. `Setze Phase 1 aus docs/premium-ui-ux-audit-appstore-readiness.md um. Nur Copy/Encoding/Tap-Ziel-Polish, keine Runtime-, Save-, Economy- oder Service-Worker-Logik. Fuehre gezielte UI- und i18n-Tests aus.`
3. `Setze Phase 2 um: First-Run/Onboarding-Smoke reparieren und Summary-Labels klaeren. Lies nur AGENTS.md, .codex-Regeln, index.html, ui.js und test/ui-onboarding-settings-smoke.test.js. Keine neuen Features.`
4. `Erstelle ein Care Studio Premium-Polish-Konzept. Nicht implementieren. Fokus: Buddy-Slot, Hero-Hierarchie, Diagnose-Text, mobile Sheet-Dichte. Drei Varianten nach Idea Workflow, dann stoppen.`
5. `Fuehre einen finalen AppStore-Readiness-Check nach Phase 1/2 aus. Starte lokal, pruefe 390x844 und 360x740, Support-Flow ohne Zahlung, Care Studio, Missions, PWA reload/offline. Keine Codeaenderungen.`

## Gelesene Dateien
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
- `README.md`
- `index.html`
- `ui.js`
- `app.js`
- `styles.css` (gezielte Such-/Kontextstellen)
- `manifest.webmanifest`
- `sw.js`
- `src/i18n/locales/de.json` (gezielte Suchstellen)
- `src/i18n/locales/en.json` (gezielte Suchstellen)
- `src/gameplay/**` (gezielte Suchstellen)
- `src/ui/**` (gezielte Suchstellen)
- `src/events/**` (gezielte Suchstellen)
- `test/**` relevante UI/PWA/Retention-Dateien via Suche und ausgefuehrte Tests
- `docs/qa/UI_UX_AUDIT_2026-06-10.md` (Such-/Kontexttreffer)
- `docs/REPOSITORY_AUDIT.md` (Such-/Kontexttreffer)
- angehaengte Aufgabenbeschreibung `pasted-text.txt`

## Genutzte Skills / Hinweise
- `.codex` Projektregeln und `AGENTS.md`
- `design-taste-frontend`
- `frontend-skill`
- `build-web-apps:frontend-testing-debugging`
- `browser:control-in-app-browser`

## Ausgefuehrte Checks
| Check | Ergebnis |
| --- | --- |
| Lokaler Browser-Load `http://127.0.0.1:5173` | Pass: Seite laedt, Titel `Grow-Simulator`, kein Blank Screen. |
| Desktop/Mobile DOM- und Konsolencheck | Pass mit Warnungen: keine Error-Logs, aber remote load/save und sim-time jump Warnungen. |
| Mobile 390x844 | Pass fuer horizontalen Overflow; Fail/Risiko fuer mehrere Tap-Ziele unter 44px. |
| Care Studio Sheet | Pass: sichtbar, Tabs/Actions vorhanden, Care-Sheet-Regressions-Test gruen. |
| Missions Sheet | Pass: Daily/Weekly/Decision/Buddy sichtbar; Copy-Risiko durch ASCII-Fallbacks. |
| Support Sheet | Fail/Risiko: `unterst?tzen`, kein Buddy-Bild, Tier-Klick fuehrt extern zu PayPal. |
| Coin Shop Sheet | Risiko: starke Direktaktionen, kein Buddy-Bild im Rendercheck. |
| `npm run check:i18n` | Pass: 1997 Keys je Locale, 0 missing; heuristisch 1216 unused de keys. |
| `node test/ui-onboarding-settings-smoke.test.js` | Fail: expected `Indoor`, actual `Indoor Run`. |
| `node test/ui-care-sheet-regression.test.js` | Pass. |
| `node test/public-text-readiness.test.js` | Pass. |
| `node test/service-worker-shell-assets.test.js` | Pass. |
| `node test/offline-reopen-sw-boot.test.js` | Pass. |

## Erstellte/geaenderte Dateien
- `docs/premium-ui-ux-audit-appstore-readiness.md`

