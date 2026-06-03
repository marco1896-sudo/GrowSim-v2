# Grow Simulator App-Store-Reife & User-Attraktivitaets-Audit

Stand: 2026-06-02  
Scope: Produkt-/UX-/App-Store-Audit ohne Codeaenderungen. Geprueft wurden die sichtbare Web/PWA-App im mobilen Viewport 390 x 844, die erreichbaren Hauptflaechen, Manifest/README, vorhandene Projektregeln, relevante fruehere Auditnotizen sowie `check:syntax` und `check:i18n`.

## 1. Kurzfazit

Grow Simulator wirkt aktuell nicht mehr wie ein roher Prototyp. Die App hat eine starke visuelle Richtung, ein echtes Simulationsfundament, mobile Premium-Ansaetze, ein erkennbares Setup-Onboarding, Care Studio, Analyse, Daily-/Progressionssignale, Eventsystem und PWA-Grundlage.

Aus Nutzersicht ist der Zustand aber eher **interne Beta / kontrollierter Preview-Build** als fast fertige App-Store-Version. Der groesste Grund ist nicht technische Instabilitaet, sondern Produktreife: Beim frischen Start blockiert ein Cloud-Sync/Login-Gate den Einstieg, mehrere sichtbare Texte rahmen die App noch als MVP/Dev/Legacy-System, einzelne UI-Flaechen wirken unfertig, und manche Screens sind fuer normale Nutzer zu technisch oder zu dicht.

Die wichtigsten Hebel fuer mehr Attraktivitaet:

- First-Time-User-Experience entkoppeln von Pflicht-Login.
- Alle MVP-/Dev-/Legacy-/Placeholder-Texte aus sichtbaren Nutzerflaechen entfernen.
- Eventsystem und Analyse in Spieler-/Coach-Sprache uebersetzen.
- Settings/Menu/Account/Coin-/Support-Flaechen vor Public Release produktklar machen.
- Mobile Layout-Polish fuer schmale Viewports priorisieren.
- Buddy staerker als Erklaerer fuer Einstieg, Events und Analyse nutzen.

Klare Einschaetzung: **Nicht app-store-ready. Nicht breit bewerben. Kontrolliert intern oder mit sehr kleiner Testgruppe nutzbar, wenn klar als Preview kommuniziert.**

## 2. Was bereits stark ist

- Die Hauptansicht hat einen eigenstaendigen Premium-Mobile-Game-Look mit starkem Grow-Room-Motiv, klaren Kernwerten und erkennbarer App-Identitaet.
- Das Run-Setup-Onboarding ist visuell deutlich ueber Prototyp-Niveau: Schrittlogik, Karten, Buddy-Visuals und finale Zusammenfassung sind vorhanden.
- Care Studio zeigt echte Simulationstiefe: Feuchte, Wurzelzone, Dryback, Risiko, Aktionstypen und Handlungsempfehlungen sind logisch verknuepft.
- Analyse/Statistik bietet bereits gute Produktideen: Ernteprognose, positive/negative Treiber, naechster Hebel, Verlauf, Retention Insights.
- Das Eventsystem hat eine moderne Darstellung und erkennbare Lern-/Diagnoseambition.
- Rechtliche Grundflaechen fuer Impressum und Datenschutz existieren.
- PWA-Grundlagen sind vorhanden: Manifest, Service Worker, Offline-/Reload-Testartefakte und Service-Worker-Regeln.
- Technische Checks sind stabil genug fuer weitere Produktarbeit: `check:syntax` und `check:i18n` liefen gruen.

## 3. Groesste Schwaechen aus Nutzersicht

1. **Der erste echte Eindruck wird von Login/Cloud Sync blockiert.** Ein neuer Nutzer sieht zuerst "Cloud Sync / Anmeldung erforderlich", nicht das Spiel.
2. **Die App nennt sich sichtbar noch MVP/Dev.** Manifest, README und Projektinfo enthalten MVP-/Prototype-Sprache; die UI zeigt im Dev-Pfad "Local Dev".
3. **Interne technische Begriffe sind fuer Nutzer sichtbar.** Beispiele: "Legacy bleibt autoritativ", "Schattenhinweis", "Event-System", "Fix 30-90m", "Local Dev", "CARESTUDIO.PREVIEW.VERDICT.AVOID".
4. **Settings zeigen Mobile-Overlap und unfertige Bedienflaechen.** Im 390px-Viewport ueberlappen Tempo-Buttons/Labels und Werte.
5. **Event Center wirkt bei leerem Zustand noch wie Systemdiagnose statt Gameplay.** Kein aktives Ereignis zeigt technische Erklaerung statt motivierender Erwartung oder Buddy-Coaching.
6. **Menueintraege versprechen mehr als aktuell produktreif wirkt.** Coin-Shop, Support, Leaderboard, Cloud Sync und Projektinfo brauchen klare Public-Release-Entscheidung.
7. **Fachwerte sind stark, aber fuer Anfaenger nicht ausreichend kontextualisiert.** pH, EC, VPD, PPFD, Dryback, Wurzelzone und Risiko brauchen mehr Cause-and-Effect-Hilfe.

## 4. P0 - Pflicht vor finaler oeffentlicher Version

### P0.1 Startup-Login blockiert den ersten Spielkontakt

- Bereich: First-Time-User, Account, App-Store-Reife
- Prioritaet: P0
- Beschreibung: Beim frischen Start ohne lokale Session erscheint ein modaler "Cloud Sync / Anmeldung erforderlich"-Dialog. Der Spielstart ist verdeckt.
- Warum fuer Nutzer relevant: Normale Nutzer wollen zuerst verstehen und ausprobieren. Pflicht-Login vor Wertbeweis senkt Vertrauen und Conversion.
- Risiko, wenn nicht verbessert: Hohe Abbruchrate, schlechte Store-Bewertungen, App wirkt wie Account-/Cloud-Tool statt Spiel.
- Empfohlene Loesung: Gastmodus als Standard, Cloud Sync optional nach erstem Erfolgsmoment anbieten. Login erst fuer verifizierte Ergebnisse, Cloud Save, Leaderboard oder Push verlangen.
- Aufwand: mittel
- Umsetzungsrisiko: mittel, wegen Auth/Save/Persistence-Abhaengigkeit
- Codex spaeter umsetzen: ja
- Marco-Entscheidung vorher: ja, Produktentscheidung zu Gastmodus vs. Pflichtaccount
- Empfohlene Reihenfolge: 1

### P0.2 MVP-/Prototype-/Placeholder-Sprache in Public-Flaechen

- Bereich: App-Store-Reife, Inhalte, Markenwirkung
- Prioritaet: P0
- Beschreibung: Manifest nennt "Grow Simulator MVP" und "Offline-capable soil growth simulation MVP"; Projektinfo zeigt "Grow Simulator MVP - Weitere Infos folgen."; README spricht von "Phase 1 mobile-first PWA prototype".
- Warum fuer Nutzer relevant: Nutzer bewerten sichtbare Selbstbeschreibung als Reifestatus. "MVP" und "Weitere Infos folgen" signalisieren unfertig.
- Risiko, wenn nicht verbessert: App wirkt nicht vertrauenswuerdig, Store-Metadaten ungeeignet, public Bewerbung wird geschwaecht.
- Empfohlene Loesung: Alle sichtbaren Public-Texte auf Produktnamen, klare Kurzbeschreibung und ehrliche Release-Position umstellen. Interne Dev-Hinweise in Docs belassen, nicht in Nutzerflaechen.
- Aufwand: klein
- Umsetzungsrisiko: niedrig
- Codex spaeter umsetzen: ja
- Marco-Entscheidung vorher: ja, finaler Claim/Positionierung
- Empfohlene Reihenfolge: 2

### P0.3 Interne Systembegriffe sichtbar in Analyse/Event/Care

- Bereich: Texte, Eventsystem, Analyse, Care Studio
- Prioritaet: P0
- Beschreibung: Sichtbare Beispiele sind "Legacy bleibt autoritativ", "Schattenhinweis", "Event-System", "CARESTUDIO.PREVIEW.VERDICT.AVOID" und technische Statusformulierungen.
- Warum fuer Nutzer relevant: Nutzer sollen eine Pflanzensimulation erleben, keine Runtime-Diagnose.
- Risiko, wenn nicht verbessert: App wirkt unfertig, technisch, schwer verstaendlich und nicht store-reif.
- Empfohlene Loesung: Nutzertext-Audit fuer alle sichtbaren Screens; interne Runtime-/Dev-Begriffe durch Coach-/Gameplay-Sprache ersetzen. Zusaetzlich Runtime-Screening auf ALL_CAPS i18n keys und "Legacy/Dev/MVP".
- Aufwand: mittel
- Umsetzungsrisiko: niedrig bis mittel
- Codex spaeter umsetzen: ja
- Marco-Entscheidung vorher: nein fuer Fehlertexte, ja fuer Tonalitaetslinie
- Empfohlene Reihenfolge: 3

### P0.4 Rechtliche/Datenschutz-Aussagen passen noch nicht sicher zur Produktrealitaet

- Bereich: App-Store, Datenschutz, Account/Cloud
- Prioritaet: P0
- Beschreibung: Datenschutz spricht von Kontodaten, Cloud-Synchronisierung und Servern. Gleichzeitig ist Cloud/Auth sichtbar noch nicht als saubere Nutzerreise reif.
- Warum fuer Nutzer relevant: Rechtliche Texte muessen zu tatsaechlichen Funktionen passen und Store-Pruefung ueberstehen.
- Risiko, wenn nicht verbessert: Vertrauensverlust, Review-Risiko, unklare Datenverarbeitung.
- Empfohlene Loesung: Vor Public Release final klaeren: Gastmodus, Cloud Save, Auth, Push, Serverstandort, Datenarten, Loeschung, Kontakt, Impressum. Texte juristisch/praktisch finalisieren.
- Aufwand: mittel
- Umsetzungsrisiko: mittel, weil Produkt- und Rechtsentscheidung
- Codex spaeter umsetzen: teilweise
- Marco-Entscheidung vorher: ja
- Empfohlene Reihenfolge: 4

## 5. P1 - Wichtig vor breiter Bewerbung

### P1.1 First-run Onboarding ist gut, aber zu spaet sichtbar

- Bereich: First-Time-User
- Prioritaet: P1
- Beschreibung: Das Run-Setup ist stark, erscheint aber erst nach Auth-Bypass. Hinter dem Setup bleibt zudem bereits ein HUD mit Profil/Daily/Werten sichtbar bzw. semantisch vorhanden.
- Nutzerrelevanz: Der erste Flow sollte die App-Fantasie fokussiert erklaeren: Pflanze anlegen, erste Entscheidung treffen, erstes positives Feedback erhalten.
- Risiko: Neuer Nutzer versteht zu viel auf einmal oder erlebt Login vor Spielwert.
- Loesung: Startreihenfolge: Welcome/Buddy -> Run-Setup -> erster Pflege-Moment -> optional Account. HUD im Setup konsequent ruhig/inert halten.
- Aufwand: mittel
- Risiko: mittel
- Codex: ja
- Marco-Entscheidung: ja
- Reihenfolge: 5

### P1.2 Event Center braucht Spielerdramaturgie statt Systemstatus

- Bereich: Eventsystem V2
- Prioritaet: P1
- Beschreibung: Leerer Eventzustand zeigt "Legacy-Ereignisse", "Status: inaktiv", "Diagnosevorschau noch nicht berechnet". Das erklaert Technik, nicht Spiel.
- Nutzerrelevanz: Events sollten Spannung, Ursache, Entscheidung und Lernwert erzeugen.
- Risiko: Events fuehlen sich wie Meldungen/Debug an, nicht wie Gameplay.
- Loesung: Leerer Zustand als "Alles ruhig" mit naechstem Beobachtungsfokus; aktiver Zustand mit Ursache, Risiko, Optionen, Konsequenz und Buddy-Hinweis.
- Aufwand: mittel
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: nein, wenn Tonalitaet klar ist
- Reihenfolge: 6

### P1.3 Analyse ist wertvoll, aber zu dicht und teils widerspruechlich

- Bereich: Analyse/Statistik
- Prioritaet: P1
- Beschreibung: Analyse hat starke Module, aber mischt Ernteprognose, Event Center, Retention, Treiber, Wurzelzone und Detailwerte in einem langen Sheet.
- Nutzerrelevanz: Nutzer wollen wissen: "Was laeuft gut?", "Was bremst?", "Was mache ich jetzt?"
- Risiko: Aha-Effekt geht in Informationsdichte verloren.
- Loesung: Analyse als Coach priorisieren: Top 1 Status, Top 1 Ursache, Top 1 Aktion, danach Details. Fachwerte einklappbar.
- Aufwand: mittel
- Risiko: niedrig bis mittel
- Codex: ja
- Marco-Entscheidung: ja fuer Informationshierarchie
- Reihenfolge: 7

### P1.4 Settings haben Mobile-Overlap und wirken web-/adminnah

- Bereich: UI/UX/Mobile
- Prioritaet: P1
- Beschreibung: Im 390px-Viewport ueberlappen Simulationstempo, Event-Haeufigkeit, Tutorial/Autosave und x4/x8/x12/x16-Buttons sichtbar. Labels wie "Settings", "DEFAULT", "SAVE" und "Fix 30-90m" wirken technisch.
- Nutzerrelevanz: Settings sind eine Vertrauensflaeche. Ueberlappungen wirken sofort unfertig.
- Risiko: App verliert Premium-Gefuehl und mobile Glaubwuerdigkeit.
- Loesung: Settings mobil neu strukturieren: klare Zeilen, echte Controls, lokale Sprache, keine Debug-/Admin-Labels. Tempo als Segmented Control mit stabiler Hoehe.
- Aufwand: mittel
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: nein, wenn nur UX-Polish
- Reihenfolge: 8

### P1.5 Menu/Account/Leaderboard/Coin-Shop/Support brauchen Produktklarheit

- Bereich: UI Flow, Monetarisierung, Account
- Prioritaet: P1
- Beschreibung: Menue zeigt viele starke Punkte, aber auch unreife Versprechen: Leaderboard nur verifizierte Ergebnisse, Coin-Shop, Support, Cloud Sync, Push blockiert.
- Nutzerrelevanz: Nutzer brauchen klare Erwartungen, was schon funktioniert und warum es wichtig ist.
- Risiko: App wirkt ueberladen oder wie ein Store/Account-System, bevor das Kernspiel ueberzeugt.
- Loesung: Vor breiter Bewerbung Menue in "Spiel", "Fortschritt", "Konto", "Info" ordnen. Unfertige/optionale Flaechen entweder produktklar abschliessen oder dezent parken.
- Aufwand: mittel
- Risiko: mittel
- Codex: ja
- Marco-Entscheidung: ja
- Reihenfolge: 9

### P1.6 Buddy ist sichtbar, aber noch kein durchgaengiger Begleiter

- Bereich: Buddy, Markenwirkung, Onboarding
- Prioritaet: P1
- Beschreibung: Buddy erscheint im Setup und wirkt sympathisch. In Care, Analyse und Events koennte Buddy staerker fuehren.
- Nutzerrelevanz: Buddy ist laut Vision das emotionale Gesicht der App.
- Risiko: Marke bleibt austauschbarer, Fachwerte wirken trockener.
- Loesung: Buddy gezielt in drei Momenten nutzen: erster Run, erstes Problem, erste Verbesserung. Keine Dauerkommentare, sondern kurze hilfreiche Coach-Momente.
- Aufwand: mittel
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: ja fuer Buddy-Ton
- Reihenfolge: 10

### P1.7 Anfaenger-Hilfen fuer pH/EC/VPD/PPFD/Dryback fehlen als eingebauter Kontext

- Bereich: Verstaendlichkeit, Lernen
- Prioritaet: P1
- Beschreibung: Fachwerte sind vorhanden, werden aber nicht immer einsteigerfreundlich erklaert.
- Nutzerrelevanz: Anfaenger brauchen Ursache-Wirkung, Hobbygrower brauchen konkrete Handlung, erfahrene Grower brauchen Vertrauen in die Logik.
- Risiko: Nutzer ignorieren Werte oder fuehlen sich ueberfordert.
- Loesung: Tap-Details oder kurze "Warum wichtig?"-Hinweise fuer Fachwerte; Buddy/Analyse erklaert nur den aktuell relevanten Wert.
- Aufwand: mittel
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: nein
- Reihenfolge: 11

## 6. P2 - Qualitaetsverbesserungen

### P2.1 Onboarding-Preset ist sichtbar deaktiviert

- Bereich: Onboarding
- Prioritaet: P2
- Beschreibung: "Preset" ist im Setup sichtbar, aber deaktiviert.
- Nutzerrelevanz: Deaktivierte, unerklaerte Funktionen wirken unfertig.
- Risiko: Kleiner Vertrauensverlust im ersten Flow.
- Loesung: Entweder entfernen bis fertig oder als klaren "Empfohlen"-Auto-Start integrieren.
- Aufwand: klein
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: ja
- Reihenfolge: 12

### P2.2 Sprach- und Tonalitaetsmischung vereinheitlichen

- Bereich: Texte/i18n
- Prioritaet: P2
- Beschreibung: Deutsch, Englisch und technische Kurzlabels mischen sich: "Care Studio", "Settings", "Balanced Control", "Mode: Indoor Run", "REPORT", "TREIBER", "VERLAUF".
- Nutzerrelevanz: Konsistente Sprache wirkt professioneller.
- Risiko: Marke wirkt noch wie interner Build.
- Loesung: UI-Language-Map definieren: Welche Begriffe duerfen englisch bleiben, welche werden lokalisiert?
- Aufwand: mittel
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: ja
- Reihenfolge: 13

### P2.3 Daily Achievements brauchen klareren ersten Nutzen

- Bereich: Progression/Retention
- Prioritaet: P2
- Beschreibung: "Heute 0/3 Aufgaben" ist sichtbar, aber der konkrete Nutzen im ersten Run bleibt klein.
- Nutzerrelevanz: Daily Tasks koennen Motivation geben, duerfen aber nicht wie Aufgabenliste vor Spielverstaendnis wirken.
- Risiko: Fruehe UI wirkt ueberladen.
- Loesung: Im ersten Run nur eine einfache Starter-Mission sichtbar machen; weitere Dailies nach erstem Erfolg freischalten.
- Aufwand: mittel
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: ja
- Reihenfolge: 14

### P2.4 Home-HUD ist stark, aber fuer Tag 1 sehr informationsdicht

- Bereich: UI/UX, Spielgefuehl
- Prioritaet: P2
- Beschreibung: Auf Tag 1 sind Ernteprognose, Klima, Wachstum, Events, Boost, Daily, Kernwerte und Coins gleichzeitig sichtbar.
- Nutzerrelevanz: Premium heisst auch gute Reihenfolge, nicht nur viele Daten.
- Risiko: Neue Nutzer wissen nicht, was jetzt wichtig ist.
- Loesung: Progressive Disclosure: Tag 1 Fokus auf Pflanze, Wasser/Naehrstoffe, eine klare Aktion; Ernte/Events/Advanced-Werte spaeter staerker machen.
- Aufwand: mittel bis gross
- Risiko: mittel
- Codex: ja
- Marco-Entscheidung: ja
- Reihenfolge: 15

### P2.5 Push-Status wirkt als Fehlermeldung statt optionaler Komfort

- Bereich: Settings/Menu/PWA
- Prioritaet: P2
- Beschreibung: "Push ist blockiert" erscheint prominent im Menue.
- Nutzerrelevanz: Nutzer ohne Push-Erlaubnis sollen sich nicht defekt fuehlen.
- Risiko: App wirkt kaputt, obwohl nur eine Browser-/OS-Berechtigung fehlt.
- Loesung: Neutraler Text: "Optional: Erinnerungen sind aus" plus kurzer Vorteil und Aktivieren-CTA.
- Aufwand: klein
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: nein
- Reihenfolge: 16

### P2.6 App-Metadaten fuer Store/Installationsgefuehl aufwerten

- Bereich: PWA/App Store
- Prioritaet: P2
- Beschreibung: Manifest ist funktional, aber Name/Beschreibung sind MVP-gepraegt. Maskable Icon existiert, aber Store-Texte/Screenshots/Privacy-Hinweise sind nicht auditierbar final.
- Nutzerrelevanz: Installation und Store-Auftritt muessen hochwertig wirken.
- Risiko: PWA/Wrapper fuehlt sich unfertig an.
- Loesung: Manifest finalisieren, App-Name/Short-Name/Description pruefen, Icon-Safe-Area validieren, Splash/Loading final bewerten.
- Aufwand: klein bis mittel
- Risiko: niedrig
- Codex: ja
- Marco-Entscheidung: ja
- Reihenfolge: 17

## 7. P3 - Spaeter / Nice-to-have

### P3.1 Community-Polls fuer Event-/Buddy-Ideen

- Bereich: Community
- Prioritaet: P3
- Beschreibung: Event-, Buddy- und Onboarding-Varianten eignen sich gut fuer Instagram-Polls oder Carousel-Feedback.
- Nutzerrelevanz: Community kann Vertrauen und Identitaet staerken.
- Risiko: Zu fruehes Marketing vor Produktpolish kann Erwartungen ueberziehen.
- Loesung: Erst P0/P1 bereinigen, dann gezielte Polls: "Welche Buddy-Hilfe im ersten Problem?", "Welche Eventkarte wirkt klarer?"
- Aufwand: klein
- Risiko: niedrig
- Codex: nein
- Marco-Entscheidung: ja
- Reihenfolge: 18

### P3.2 Premium-Features erst nach Kernspiel-Beweis

- Bereich: Monetarisierung
- Prioritaet: P3
- Beschreibung: Coin-Shop/Support/Premium-Hooks sind sichtbar, sollten aber erst nach starker Core-Loop voll beworben werden.
- Nutzerrelevanz: Nutzer zahlen eher, wenn Grundspiel fair, hilfreich und hochwertig wirkt.
- Risiko: Zu fruehe Monetarisierung wirkt billig.
- Loesung: Premium spaeter auf Komfort, kosmetische Buddy-/Room-Elemente, Analyse-Vertiefung und freiwilligen Support fokussieren.
- Aufwand: gross
- Risiko: mittel
- Codex: teilweise
- Marco-Entscheidung: ja
- Reihenfolge: 19

## 8. First-Time-User-Experience

Aktueller Eindruck:

- Ohne Dev-Bypass startet die App mit einem Auth-Gate. Das ist fuer normale Nutzer der groesste Einstiegsbruch.
- Mit Dev-Bypass ist das Run-Setup sichtbar und insgesamt stark: "Grow-Run erstellen", Schritt 1 bis 6, Topf, Setup, Substrat, Licht, Genetik, Zusammenfassung.
- Der erste Bildschirm nach Start ist visuell stark, aber sehr informationsreich.
- Die erste Erfolgserfahrung ist noch nicht klar genug inszeniert. Nach "Run starten" landet man in einem vollen HUD; eine kurze Buddy-Bestaetigung oder erste Pflegeempfehlung waere wertvoll.

Konkrete Verbesserungen:

1. Auth erst nach Wertbeweis.
2. Run-Setup als fokussierten ersten Flow ohne aktive Hintergrundkomplexitaet.
3. Nach Run-Start eine "erste sinnvolle Aktion" fuehren: z. B. "Heute nur beobachten, deine Feuchte ist stabil" oder "Pruefe Topfgewicht".
4. Erste Belohnung klein halten: XP, Buddy-Reaktion, "Run gestartet" statt Coins/Boost-Spam.
5. Erst nach Tag 1/erster Aktion Daily, Events und Analyse voll sichtbar machen.

## 9. Gameplay & Motivation

Was funktioniert:

- Pflegewerte wirken relevant.
- Ernteprognose gibt ein mittelfristiges Ziel.
- Daily Achievements und XP/Coins geben Progressionssignale.
- Events und Analyse koennen Lernwert erzeugen.

Was fehlt aus Nutzerperspektive:

- Ein klarer "Warum spiele ich weiter?"-Rhythmus fuer die ersten 5 Minuten.
- Events fuehlen sich im leeren Zustand noch nicht wie Spiel an.
- Entscheidungen brauchen staerker sichtbare Konsequenzen.
- Wachstum sollte belohnender inszeniert werden: kleine sichtbare Veraenderungen, Tagesabschluss, Buddy-Kommentar, Prognoseveraenderung.

Empfehlung:

- Eine fruehe Core Loop definieren: Setup -> erster Tagescheck -> Pflege/Beobachtung -> Feedback -> kleiner Fortschritt -> naechster Tag/naechstes Ziel.
- Care Studio und Analyse nicht als getrennte Expertensysteme wirken lassen, sondern als zwei Seiten derselben Coach-Logik.

## 10. UI / UX / Mobile-Reife

Stark:

- Hauptscreen hat klare Spiel-App-Optik.
- Touchziele der Hauptaktionen wirken gross genug.
- Bottom-/Sheet-Design ist konsistent.
- Onboarding-Karten sind mobile-first gedacht.

Kritisch:

- Settings im 390px-Viewport zeigen sichtbares Overlap.
- Einige Buttons haben kein sichtbares Textlabel und verlassen sich auf Symbol/aria; das ist optisch okay, muss aber fuer Nutzer eindeutig bleiben.
- Lange Sheets wie Analyse/Care sind dicht und scrolllastig.
- Menu ist voll und mischt Core-Spiel, Account, Monetarisierung, Info, Push und New Run.
- Einige Close-Buttons zeigen "X", andere "SCHLIESSEN"; das ist funktional, aber tonal uneinheitlich.

Dringend verbessern:

- Settings responsive stabilisieren.
- Menu gruppieren.
- Leere Zustaende produktnah formulieren.
- Fachdetails einklappbar machen.

## 11. Eventsystem V2 aus Nutzersicht

Technisch scheint viel Arbeit im System zu stecken. Aus Spielersicht ist der aktuell sichtbare Eindruck aber noch nicht stark genug:

- Leerer Eventzustand: zu technisch.
- Analyse verweist auf Event Center mit "Schattenhinweis" und "Legacy".
- "Kein aktives Ereignis" erklaert nicht, warum das gut ist oder worauf der Spieler achten soll.
- Resolve-/Konsequenz-Flow konnte in diesem Audit nicht voll aktiv erlebt werden; vorhandene Docs deuten auf umfangreiche Tests hin, aber die Nutzerwirkung muss separat poliert werden.

Zielbild:

- Event Center als "Grow-Moment": Was beobachte ich? Warum passiert es? Was riskiere ich? Welche Option passt zu ruhiger Pflege? Was lerne ich daraus?
- Buddy kann hier sehr stark helfen: kurze Einordnung, keine langen Erklaertexte.

## 12. Buddy & Markenwirkung

Buddy ist ein echter Vorteil, aber noch nicht voll ausgespielt.

Gute Stellen:

- Setup-Schritte mit Buddy-Bildern.
- Finale Run-Bereit-Karte.
- Visuell warme, freundliche Markenwirkung.

Fehlende Stellen:

- Auth-Gate sollte nicht Buddy-frei und kalt starten.
- Erstes Problem/Event sollte Buddy erklaeren.
- Analyse sollte einen kurzen Buddy-Aha-Satz haben.
- Care Studio koennte Buddy als ruhigen Assistenten nutzen, wenn Werte technisch werden.

Empfehlung:

- Buddy nur fuer Schluesselmomente einsetzen: Start, erstes Problem, erste Verbesserung, Run-Ende.
- Buddy-Ton: kurz, hilfreich, nicht kindisch, nicht uebererklaerend.

## 13. App-Store-/PWA-/Wrapper-Reife

Vorhanden:

- `manifest.webmanifest`
- `sw.js`
- Icons 192/512
- Offline-/PWA-Testartefakte in `visual-tests`
- Datenschutz/Impressum-Sheets

Nicht fertig fuer App Store:

- Manifest nennt MVP.
- Pflicht-Login vor Spielwert ist store-/conversionkritisch.
- Cloud/Auth/Push/Leaderboard muessen als Produktversprechen konsistent sein.
- Datenschutz muss final zur tatsaechlichen Datenverarbeitung passen.
- Native Wrapper wuerde die aktuellen Web-/PWA-UX-Probleme mitverpacken.
- Store-Screenshots, App-Beschreibung, Alters-/Inhaltsangaben, Support-URL und Datenschutzdetails sind im Projekt nicht final nachweisbar.

Empfehlung:

- Erst P0/P1 bereinigen, dann PWA-Installationslauf testen: erster Load, Reload, Offline, Update, Save/Restore, Gastmodus, Account optional.

## 14. Monetarisierungs-Reife

Aktuell noch nicht stark genug fuer ernsthafte Premium-Vermarktung:

- Core-Loop muss fuer neue Nutzer klarer und belohnender werden.
- Monetarisierungsflaechen sollten nicht vor dem Spielwert dominieren.
- Coin-Shop/Support koennen Vertrauen schwaechen, wenn MVP-/Dev-Texte gleichzeitig sichtbar sind.

Potentiell wertvolle Premium-Bereiche spaeter:

- Kosmetische Grow-Room-/Buddy-Varianten.
- Erweiterte Analyse/Verlaufsvergleiche.
- Komfort-Saves/Cloud Sync.
- Saisonale Challenges oder verifizierte Leaderboards.
- Freiwilliger Support mit klarer, unaufdringlicher Kommunikation.

Kostenlos stark bleiben sollten:

- Kernsimulation.
- Grundlegende Pflegeaktionen.
- Lernfeedback.
- Ein fairer kompletter Run.

## 15. Empfohlene Umsetzungsreihenfolge

### Phase A: Pflicht-Stabilitaet / Blocker

1. Gastmodus/Account-Gate entscheiden und Startfluss entblocken.
2. MVP/Dev/Legacy/Placeholder-Texte aus Public-Flaechen entfernen.
3. Sichtbare i18n-Key-Leaks und interne Runtime-Begriffe bereinigen.
4. Manifest/App-Metadaten auf Public-Readiness bringen.
5. Datenschutz/Impressum mit realer Cloud/Auth/Push-Strategie abgleichen.

### Phase B: First-Time-User & Onboarding

1. Onboarding ohne Login-Zwang starten.
2. Ersten Run mit Buddy und einer klaren ersten Aktion abschliessen.
3. Preset-Button entfernen oder sinnvoll aktivieren.
4. First-run HUD progressiv vereinfachen.

### Phase C: Gameplay-/Event-Erlebnis

1. Event Center leere/aktive Zustaende in Gameplay-Sprache ueberarbeiten.
2. Event-Entscheidungen mit Ursache/Folge/Lernen staerken.
3. Analyse auf Top-Status, Top-Ursache, Top-Aktion verdichten.
4. Growth-/Reward-Feedback fuer erste Minuten verbessern.

### Phase D: Mobile-/App-Feeling

1. Settings-Overlap fixen.
2. Menu gruppieren und visuell beruhigen.
3. Lange Sheets fuer mobile Lesbarkeit verbessern.
4. Einheitliche Button-/Close-/Status-Tonalitaet herstellen.

### Phase E: App-Store-Vorbereitung

1. PWA-Installations- und Offline-Test mit finalem Manifest.
2. Save/Restore/Gastmodus/Login-Wechsel testen.
3. Store-Texte, Screenshots, Datenschutz, Support-Links vorbereiten.
4. Wrapper-Risiken pruefen.

### Phase F: Monetarisierung spaeter

1. Kostenlosen Core-Run stark machen.
2. Premium-Wert aus Komfort/Kosmetik/Analyse ableiten.
3. Coin-Shop/Support erst nach klarer Produktreife oeffentlich zeigen.

## 16. Kleinster sinnvoller naechster Schritt

**Naechster sinnvoller Einzelschritt:** Konzept fuer "Gastmodus statt Startup-Login-Gate" erstellen.

Warum zuerst:

- Es verbessert sofort First-Time-User-Experience, App-Store-Reife und Nutzervertrauen.
- Es beruehrt zwar Account/Save, aber ist klar abgrenzbar.
- Danach koennen Onboarding, Buddy und Event-Polish sinnvoll getestet werden.

Empfohlener Scope fuer das Konzept:

- Gast startet lokal.
- Cloud Sync bleibt optional im Menu/Settings.
- Login wird erst fuer Cloud Save, Push, verifizierte Ergebnisse oder Leaderboard noetig.
- Datenschutz/Settings zeigen lokale Speicherung ehrlich.
- Reload/Persistence muss fuer Gastmodus stabil bleiben.

## 17. Finale Empfehlung

- Aktuell kontrolliert veroeffentlichen: **Ja, intern oder kleine geschlossene Testgruppe, wenn als Preview deklariert.**
- Aktuell breit bewerben: **Nein.**
- Aktuell App-Store-ready: **Nein.**
- Realistische App-Store-Reife entsteht, wenn zuerst Auth-Gate, MVP-/Dev-/Legacy-Texte, mobile Settings, Event-/Analyse-Tonalitaet und rechtliche Cloud/Auth-Klarheit bereinigt werden.

Grow Simulator hat genug Substanz, um aus Nutzersicht attraktiv zu werden. Der naechste Qualitaetssprung ist aber kein weiteres grosses Feature, sondern ein konsequenter Public-Readiness-Pass: Einstieg entblocken, Sprache enttechnisieren, mobile UI glaetten und Buddy als freundlichen Coach an den wichtigsten Momenten einsetzen.

## Audit-Evidenz und Tests

Gepruefte Flaechen:

- Frischer Start ohne Dev-Bypass: Auth-Gate sichtbar.
- Dev-Bypass `?dev=1`: Onboarding Schritt 1 bis 6, Home nach Run-Start, Care Studio, Analyse, Event Center, Menu, Settings.
- Statische Hinweise: `manifest.webmanifest`, `README.md`, `index.html`, `app.js`, `ui.js`, vorhandene Auditdocs.

Tests/Checks:

- `npm run check:i18n`: bestanden. Locale keys de/en/es jeweils 1444, keine fehlenden Keys in en/es vs de, keine fehlenden verwendeten Keys in de. Hinweis: sichtbarer Key `CARESTUDIO.PREVIEW.VERDICT.AVOID` wurde trotzdem in der UI beobachtet, vermutlich dynamischer/fallback-naher Pfad.
- `npm run check:syntax`: bestanden.

Nicht ausgefuehrt:

- Vollstaendiges `npm test`: nicht ausgefuehrt, weil Auftrag ein Produkt-/UX-Audit war und aktuelle technische Release-Gates laut Auftrag bereits gruen sind.
- Voller Offline-/Update-/Wrapper-Test: nicht ausgefuehrt; nur PWA-Artefakte und Manifest/Service-Worker-Kontext geprueft.
- Aktiver Event-Resolve-Flow: nicht voll erlebt, da im geprueften Lauf kein aktives Ereignis anstand.
- Native App-Store-Verpackung: nicht geprueft.
