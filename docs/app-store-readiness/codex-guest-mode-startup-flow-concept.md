# Grow Simulator Gastmodus- und Startup-Flow-Konzept

Stand: 2026-06-02  
Scope: Konzept und Planung fuer Gastmodus/lokalen Spielstart ohne Pflicht-Login. Keine Codeaenderungen, keine Refactors, keine Testaenderungen.

## 1. Kurzfazit

Der wichtigste P0-Blocker aus dem App-Store-Reife-Audit ist bestaetigt: Der aktuelle Boot-Flow stellt Auth vor den Spielkontakt. Ohne gueltige Session wird ein Cloud-Sync/Login-Gate aktiviert, die Simulation pausiert und der Spieler sieht zuerst "Anmeldung erforderlich" statt Grow Simulator.

Die technische Grundlage fuer einen Gastmodus ist aber bereits weitgehend vorhanden. Die App hat lokale Persistenz ueber IndexedDB mit LocalStorage-Fallback. Remote Save wird als Zusatzpfad versucht und faellt bei fehlender Auth auf lokal zurueck. Viele Gameplay-Systeme, Run-Setup, Simulation, Care, Events, Analyse, Progression und Coins koennen lokal laufen.

Empfehlung: **Gastmodus als Standard-Start einfuehren.** Neue Nutzer starten lokal, legen direkt einen Run an und erhalten erst nach dem ersten Wertbeweis ein optionales Cloud-Sync-Angebot. Login bleibt fuer Cloud Save, Push, Leaderboard, verifizierte Ergebnisse und ggf. Account-gebundene Rewards erforderlich.

## 2. Aktueller Problemzustand

### Aktueller Auth-/Startup-Flow

Der relevante Startpfad liegt in `app.js` in `boot()`:

1. UI wird gemountet und gecached.
2. Storage Adapter wird erstellt.
3. `window.GrowSimAuth.restoreSession()` wird aufgerufen, falls vorhanden.
4. i18n wird vor dem Auth-Gate initialisiert.
5. `isAuthSessionValid()` prueft, ob `window.GrowSimAuth.isAuthenticated()` true ist.
6. Nur bei `localhost` oder `127.0.0.1` plus URL-Parameter `?dev=1` wird `shouldBypassAuthForLocalDev()` aktiv.
7. Ohne gueltige Session:
   - `ensureSettingsUiReady()`
   - `setAuthGateActive(true)`
   - `syncAuthModalContent()`
   - Loading Screen wird versteckt
   - `openCloudAuthModal({ gate: true })`
   - `waitForStartupAuthGateClear()` blockiert den weiteren Boot bis Login/Register gelingt
8. Erst danach laeuft `initOrMigrateState()`.

Das bedeutet: Aktuell wird lokaler Save/Restore fuer normale nicht eingeloggte Nutzer nicht als erstes Spielerlebnis genutzt, obwohl lokale Persistenz existiert.

### Welche Bedingungen fuehren zum Gate?

- Keine gueltige Auth-Session.
- Kein lokaler Dev-Bypass.
- Auth API existiert bzw. wird versucht wiederherzustellen.
- `restoreSession()` findet keinen Token oder validiert ihn nicht erfolgreich.

Der lokale Dev-Bypass erstellt eine technische Session mit:

- Token: `local-dev-token`
- User: `dev@growsim.local`
- Display Name: `Local Dev`

Das ist fuer Entwicklung nuetzlich, aber kein Produkt-Gastmodus.

### Welche UI blockiert aktuell den Spielstart?

Die blockierende UI ist das Auth Modal in `index.html`:

- `#authModal`
- Kicker: "Cloud Sync"
- Titel: `auth.required_title` -> aktuell "Anmeldung erforderlich"
- Tabs: Login / Registrieren
- E-Mail, Passwort, Sprache
- Primary Button Login/Register

In Gate Mode wird der Cancel Button versteckt. `closeCloudAuthModal()` verhindert Schliessen, solange `authGateActive` true ist und kein `force` gesetzt wurde.

### Welche Zustaende haengen an Auth/Cloud/Session?

Direkt auth-abhaengig:

- `src/auth/auth.js`
  - `AUTH_TOKEN_KEY = grow-sim-auth-token-v1`
  - `authState.token`
  - `authState.user`
  - `login()`, `register()`, `restoreSession()`, `logout()`
- `isAuthSessionValid()`
- `getAuthDisplayIdentity()`
- `settingsCloudSyncValue`
- Auth Modal logged-in/logged-out view
- Push-Aktivierung und Push-Test
- Remote Save/Load via Bearer Token
- Harvest/Leaderboard-Verifikation und weekly/verified Rewards, soweit sichtbar

Nicht zwingend auth-abhaengig:

- Run-Setup
- lokaler Spielstand
- Simulation Tick
- Care Studio
- lokale Analyse
- lokale Ernteprognose
- lokale Coins/Shop-Mechanik, falls nicht monetarisiert/extern verifiziert
- lokale Missionen/Retention
- Eventsystem

## 3. Zielbild fuer neue Nutzer

Neue Nutzer sollen Grow Simulator zuerst als Spiel erleben:

1. App oeffnet ohne Pflichtlogin.
2. Kurzer Buddy-/Welcome-Moment erklaert: "Du kannst lokal starten. Cloud Sync ist spaeter optional."
3. Nutzer erstellt einen Run.
4. Erster lokaler Save passiert automatisch.
5. Nach einem ersten Wertbeweis wird Cloud Sync optional angeboten.

Wertbeweis kann sein:

- Run wurde erstellt.
- Erste Pflegeentscheidung wurde getroffen.
- Erster Tag/erste Session wurde erfolgreich gespeichert.
- Erste Analyse/Prognose ist sichtbar.

Der Start soll nicht wie Account-/Cloud-Tool wirken, sondern wie:

- Premium mobile game
- lokale Simulation
- sicherer erster Test
- spaeter erweiterbar durch Account

## 4. Gastmodus-Regeln

### Was darf ein Gastnutzer tun?

Gastnutzer duerfen:

- App starten.
- Sprache waehlen.
- Run erstellen.
- Simulation lokal spielen.
- Pflegeaktionen ausfuehren.
- Klima/Care/Analyse/Event Center nutzen.
- lokale Coins und lokale Progression verwenden.
- Missionen/Dailies lokal sehen und abschliessen.
- lokalen Run beenden und lokale Zusammenfassung sehen.
- lokalen Spielstand im Browser/auf dem Geraet behalten.
- spaeter Account erstellen oder einloggen.

### Was bleibt ohne Login gesperrt?

Ohne Login sollte gesperrt oder optional verborgen bleiben:

- Cloud Sync.
- Remote Save/Load.
- Push-Benachrichtigungen, falls Server/Token erforderlich.
- Leaderboard.
- verifizierte Ergebnisse.
- serverseitige Harvest-Verifikation.
- Account-gebundene Rewards.
- echte Zahlungen/Support-Flows, falls Nutzerdaten oder externe Provider betroffen sind.

Wichtig: Gesperrte Bereiche sollen nicht wie Fehler wirken. Sie sollen als freiwillige Erweiterung erklaert werden.

### Wann wird Login angeboten?

Empfohlene Angebotsmomente:

1. Nach erfolgreichem Run-Start: kleine, unaufdringliche Cloud-Sync-Zeile.
2. Nach erstem lokalen Save: "Dein Run ist lokal gespeichert."
3. Beim Oeffnen von Cloud Sync in Settings/Menu.
4. Beim Versuch, Push zu aktivieren.
5. Beim Versuch, Leaderboard oder verifizierte Ergebnisse zu nutzen.
6. Nach Run-Ende, wenn Ergebnis hoch genug fuer Verifikation/Leaderboard waere.

Nicht anbieten:

- Vor dem ersten Spielkontakt.
- Als blockierendes Startup-Modal.
- Bei jedem Reload.
- Direkt nach kleinen Fehlermeldungen.

### Was passiert bei Logout?

Produktregel:

- Logout beendet nur die Cloud-/Account-Verbindung.
- Der lokale Spielstand bleibt erhalten.
- Nach Logout wechselt die App in Gastmodus.
- Push wird deaktiviert oder als "Account erforderlich" markiert.
- Remote Sync pausiert.
- Leaderboard/verifizierte Ergebnisse werden ausgeblendet oder als "Login erforderlich" markiert.

Nicht tun:

- Lokalen Spielstand loeschen.
- Startup-Login-Gate erneut erzwingen.
- Simulation dauerhaft stoppen.

### Was passiert bei beschaedigtem lokalen Save?

Produktregel:

- App versucht lokalen Save zu reparieren/normalisieren.
- Wenn das nicht moeglich ist, wird ein sicherer Recovery-Dialog gezeigt.
- Nutzer bekommt Optionen:
  - "Neuen lokalen Run starten"
  - "Cloud-Spielstand laden" nur wenn eingeloggt
  - "Problem melden" optional

Textlich wichtig:

- Nicht "Save corrupted" oder technische Details zeigen.
- Einfach: "Dein lokaler Spielstand konnte nicht sauber gelesen werden."

## 5. Login-/Cloud-Sync-Regeln

### Cloud Sync als optionaler Mehrwert

Cloud Sync soll als Vorteil erscheinen, nicht als Eintrittskarte.

Cloud Sync darf bieten:

- Spielstand auf mehreren Geraeten.
- Schutz bei Browserdatenverlust.
- verifizierte Ergebnisse.
- Leaderboard.
- Push/Erinnerungen.

Cloud Sync darf nicht suggerieren:

- Ohne Account sei lokales Spielen unsicher.
- Ohne Account gehe der Run sofort verloren.
- Login sei fuer Simulation notwendig.

### Account-Ueberfuehrung eines Gasts

Beim spaeteren Login/Register gibt es ein Merge-Risiko. Deshalb braucht es eine klare Regel:

1. Lokaler Gast-Spielstand bleibt primaer, solange er frischer ist.
2. Remote Save wird nach Login geladen und mit lokalem Save nach Frische verglichen.
3. Wenn beide existieren und unterschiedlich sind, nicht still ueberschreiben.
4. Sichere UX:
   - "Lokalen Run behalten und in Cloud sichern"
   - "Cloud-Spielstand laden"
   - optional "Abbrechen"

Technisch passt das zur vorhandenen `choosePreferredRestoreSnapshot()`-Logik, aber fuer Nutzer sollte bei Konflikten kein stiller Wechsel passieren.

### Bestehende Nutzer

Bestehende eingeloggte Nutzer:

- sollen weiter automatisch ihre Session nutzen koennen.
- sollen nicht durch Gastmodus downgraded werden.
- sollen bei gueltigem Token remote Restore wie bisher nutzen koennen.

Bestehende Nutzer ohne gueltigen Token:

- sollen nicht mehr im Startup-Gate haengen.
- sollen lokal weiterspielen koennen.
- sollen in Settings sehen: "Cloud Sync nicht verbunden".

## 6. Save-/Persistenz-Konzept

### Aktuelle lokale Speicherung

Die lokale Speicherung liegt in `storage.js`:

- `localStorageAdapter()` liest/schreibt `LS_STATE_KEY`.
- `createStorageAdapter()` nutzt IndexedDB, falls verfuegbar, und LocalStorage als Fallback/Spiegel.
- IndexedDB verwendet `DB_KEY`.
- Wenn IndexedDB-Save existiert, aber LocalStorage explizit fehlt, wird der IndexedDB-Save als stale ignoriert und bereinigt.
- `choosePreferredRestoreSnapshot()` waehlt zwischen lokalem und remote Save nach Frischemetriken.
- `stampStatePersistence()` schreibt `meta.persistence.lastSavedAtRealMs`.
- `createPersistableStateSnapshot()` entfernt transiente UI-Zustaende wie Menu/Dialog/Stat-Popup.
- `persistState()` schreibt lokal und versucht danach `saveRemoteState(state)`.
- `schedulePersistState()` throttled oder persistiert sofort.

### Was funktioniert bereits ohne Account?

Ohne Token:

- lokales Lesen/Schreiben kann funktionieren.
- `loadRemoteSave()` faellt bei 401/403 oder fehlendem Token auf null zurueck.
- `saveRemoteState()` gibt bei Auth-Block false zurueck.
- viele Gameplay-Calls rufen `schedulePersistState()` direkt auf.

Das aktuelle Problem ist nicht fehlende lokale Persistenz, sondern die Reihenfolge im Boot-Flow und das aktive Auth-Gate.

### Transiente Daten

Nicht dauerhaft oder nur bereinigt speichern:

- offene Menues
- offene Dialoge
- aktive Stat-Popups
- Auth Modal Zustand
- Login-Formularfelder
- Busy-States
- laufende UI-Overlays
- ggf. Push-Request-Busy-Status

Bereits bereinigt:

- `menuOpen`
- `menuDialogOpen`
- `activeStatPopup`
- `statDetailKey`

Fuer Gastmodus zusaetzlich schuetzen:

- `ui.authGateActive` darf nicht aus altem Save heraus wieder Startup erzwingen.
- Auth Modal darf nicht als transienter Zustand wiederhergestellt werden.
- Cloud-Sync-CTA darf nicht als blockierendes Modal persistiert werden.

### Daten, die im Gastmodus erhalten bleiben muessen

Persistieren:

- `simulation`
- `plant`
- `status`
- `care`
- `environmentControls`
- `climate`
- `events`
- `eventV2`
- `history`
- `setup`
- `settings`
- `profile`
- `run`
- `missions`
- `retention`
- Coins/currency state
- Harvest summary/forecast, soweit lokal
- Rescue-/death-/run-summary-relevante Zustande, soweit bereits produktiv

### Risiken bei alten Saves

Risiken:

- Alte Saves koennen `ui.authGateActive = true` enthalten.
- Alte Saves koennen Auth/Cloud-bezogene Erwartungen tragen.
- Remote und lokal koennen auseinanderlaufen.
- LocalStorage geloescht, IndexedDB noch vorhanden: aktuell wird IndexedDB dann absichtlich als stale ignoriert.
- Ein alter eingeloggter Nutzer koennte bei token loss lokal starten und spaeter Remote-Konflikt erleben.

Schutz:

- Beim Restore `ui.authGateActive` immer als transient behandeln.
- Gastmodus-Flag nicht mit Dev-Session verwechseln.
- Kein stiller Remote-Overwrite nach Login, wenn lokaler Save frischer oder aktiv ist.
- Save-Konflikt-Dialog nur nach Login/Register, nicht beim ersten Start.

## 7. UI-/UX-Startfluss

### Erster App-Start ohne Account

Flow:

1. Loading Screen.
2. Lokalen Save pruefen.
3. Wenn kein Save:
   - Welcome-/Buddy-Moment.
   - Run-Setup oeffnen.
4. Wenn lokaler Save:
   - Direkt Home/Run wiederherstellen.
   - dezente Statusmeldung: "Lokal gespeichert".
5. Keine Login-Pflicht.

### Kurzer Welcome-/Buddy-Moment

Ziel:

- Nicht als Landingpage aufblasen.
- 1 kompakter Buddy-Hinweis vor oder im Run-Setup.

Inhalt:

- Grow Simulator ist lokal spielbar.
- Cloud Sync ist optional.
- Erste Aktion: Run erstellen.

### Run erstellen

Bestehendes Setup bleibt Kern:

- Topfgroesse
- Setup indoor/outdoor
- Substrat
- Licht
- Genetik
- Zusammenfassung

Verbesserung:

- "Preset" entweder entfernen oder als echte Empfehlung aktivieren.
- Technische Mix-Texte wie "Mode: Indoor Run" spaeter glätten.

### Erster lokaler Save

Nach `Run starten`:

- Sofort `schedulePersistState(true)`.
- Kurzes Feedback:
  - "Run lokal gespeichert"
  - "Du kannst spaeter Cloud Sync aktivieren"

Nicht:

- sofort Cloud Modal oeffnen.
- Login erzwingen.

### Optionaler Cloud-Sync-Hinweis spaeter

Geeignete Anzeige:

- kleine Settings/Menu-Zeile
- Toast nach erstem lokalen Save
- Buddy-Hinweis nach erstem Erfolg
- Run-Ende/Leaderboard-Versuch

Beispiel:

"Dein Run ist lokal gespeichert. Cloud Sync kannst du spaeter aktivieren, wenn du ihn auf mehreren Geraeten sichern willst."

## 8. Vorgeschlagene Nutzertexte

### Login optional

Titel:

- "Cloud Sync aktivieren"

Kurztext:

- "Du kannst Grow Simulator lokal spielen. Mit einem Account sicherst du deinen Run zusaetzlich in der Cloud."

Buttons:

- "Lokal weiterspielen"
- "Einloggen"
- "Account erstellen"

### Cloud Sync

Settings-Zeile:

- Label: "Cloud Sync"
- Nicht verbunden: "Optional"
- Verbunden: "Verbunden"
- Tooltip/Untertext nicht verbunden: "Dein aktueller Run ist lokal gespeichert. Cloud Sync sichert ihn zusaetzlich online."
- Tooltip/Untertext verbunden: "Cloud Sync ist aktiv. Dein Spielstand kann online gesichert werden."

### Lokaler Spielstand

Status:

- "Lokal gespeichert"
- "Wird lokal gespeichert..."
- "Lokaler Spielstand bereit"
- "Nur auf diesem Geraet"

Erklaerung:

- "Dein Run wird automatisch auf diesem Geraet gespeichert."
- "Wenn du Browserdaten loeschst, kann der lokale Spielstand verloren gehen."

### Menue-/Settings-Beschriftung

Menu:

- "Konto & Cloud"
- "Cloud Sync optional"
- "Leaderboard braucht Login"
- "Push braucht Login"

Settings:

- "Spielstand"
- "Lokal gespeichert"
- "Cloud Sync optional"
- "Jetzt verbinden"

### Datenschutz-Hinweis in einfacher Sprache

Kurzfassung fuer Settings oder Cloud Modal:

"Ohne Account speichern wir deinen Spielstand nur lokal auf deinem Geraet. Wenn du Cloud Sync aktivierst, werden dein Account und dein Spielstand online gespeichert, damit du ihn wiederherstellen oder auf anderen Geraeten nutzen kannst."

### Login bei gesperrten Features

Leaderboard:

"Leaderboard ist fuer verifizierte Runs. Melde dich an, wenn du dein Ergebnis vergleichen moechtest."

Push:

"Push-Erinnerungen brauchen einen Account, damit deine Benachrichtigungen deinem Run zugeordnet werden koennen."

Cloud Save:

"Cloud Save ist optional. Dein Run bleibt lokal spielbar."

Logout:

"Du bist abgemeldet. Dein lokaler Spielstand bleibt erhalten. Cloud Sync und Push sind pausiert."

Beschaedigter lokaler Save:

"Dein lokaler Spielstand konnte nicht sauber gelesen werden. Du kannst einen neuen lokalen Run starten oder dich anmelden, um einen Cloud-Spielstand zu laden."

## 9. Risiken und Schutzmassnahmen

### Risiko fuer Savegames

Bewertung: mittel

Risiken:

- Boot-Reihenfolge aendert Restore-Verhalten.
- Remote und lokal koennen nach Login kollidieren.
- Alte UI-Auth-Zustaende koennten versehentlich wiederhergestellt werden.

Schutz:

- Lokalen Restore vor Auth-Gate erlauben.
- `ui.authGateActive` als transient behandeln.
- Nach Login Merge-/Konfliktregel statt stillem Ueberschreiben.
- Save/Load-Roundtrip mit Gast, Login, Logout, Reload testen.

### Risiko fuer Auth/Cloud

Bewertung: mittel

Risiken:

- Bisherige Annahme "kein Token = Gate" wird gebrochen.
- Remote Load nach Login muss kontrolliert bleiben.
- Cloud Sync Status muss ehrlich sein.

Schutz:

- Auth-Session weiter wiederherstellen, aber nicht erzwingen.
- Remote Sync nur bei Token.
- Settings zeigen lokale/Cloud-Zustaende getrennt.

### Risiko fuer bestehende Nutzer

Bewertung: mittel

Risiken:

- Eingeloggte Nutzer duerfen ihren Cloud-Flow nicht verlieren.
- Nutzer mit abgelaufenem Token sollen nicht verwirrt werden.

Schutz:

- Gueltige Session nutzt weiter Cloud.
- Abgelaufene Session wird Gastmodus mit Hinweis, nicht Blockade.
- Kein Logout-getriggerter Pflichtlogin.

### Risiko fuer Tests

Bewertung: hoch fuer bestehende Auth-Gate-Tests, niedrig fuer Core-Simulation

Bekanntes Testsignal:

- `test/stability-top5-regression.test.js` enthaelt Erwartungen, dass Startup ohne gueltige Session `authGateActive === true` setzt.

Schutz:

- Tests explizit auf neue Produktregel umstellen:
  - Ohne Session startet Gastmodus.
  - Cloud Modal ist optional.
  - Login-Pflicht nur bei Cloud/Push/Leaderboard.
- Bestehende authenticated-startup Tests erhalten.

### Risiko fuer App-Store-Reife

Bewertung: niedrig nach Umsetzung, aktuell hoch

Gastmodus reduziert:

- Abbruch beim Start
- Account-Zwang
- Misstrauen
- "Cloud Tool statt Spiel"-Wirkung

Schutz:

- Cloud Sync als optionalen Nutzen beschreiben.
- Datenschutz anpassen.
- Keine falschen Store-Versprechen.

### Besonders zu schuetzende Bereiche

- `boot()` Reihenfolge
- `setAuthGateActive()`
- `openCloudAuthModal()`
- `closeCloudAuthModal()`
- `initOrMigrateState()`
- `restoreState()`
- `persistState()`
- `refreshStateAfterAuth()`
- `performAuthLogout()`
- Settings Cloud Sync Row
- Push Enable/Test
- Leaderboard/verified harvest flows

## 10. Empfohlene Umsetzungsphasen

### Phase 1: Kleinster technischer Einstieg

- Ziel: Startup ohne Session laedt lokalen Zustand und startet als Gast, ohne Auth Modal zu blockieren.
- Betroffene Dateien:
  - `app.js`
  - ggf. `test/stability-top5-regression.test.js`
- Kernidee:
  - Auth restore weiterhin versuchen.
  - Wenn keine Session: `setAuthGateActive(false)`, kein `waitForStartupAuthGateClear()`.
  - `initOrMigrateState()` immer ausfuehren.
  - Auth Modal nur optional ueber Settings/Feature-CTA.
- Risiko: mittel
- Aufwand: mittel
- Empfohlene Tests:
  - Startup ohne Token startet Home/Onboarding.
  - Startup mit gueltigem Token bleibt authenticated.
  - Reload als Gast erhaelt lokalen Save.
  - Auth Modal blockiert nicht.
- Einzeln committen: ja

### Phase 2: UI/UX Startfluss

- Ziel: Neuer Nutzer erlebt Welcome/Buddy -> Run erstellen -> lokaler Save.
- Betroffene Dateien:
  - `index.html`
  - `app.js`
  - `ui.js` falls Onboarding dort verdrahtet ist
  - `styles.css`
  - `src/i18n/locales/de.json`
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`
- Kernidee:
  - kurzer Buddy-Hinweis fuer lokalen Start.
  - nach Run-Start lokaler Save-Toast/Hinweis.
  - keine Cloud-Modal-Unterbrechung.
- Risiko: mittel
- Aufwand: mittel
- Empfohlene Tests:
  - Onboarding Smoke.
  - Mobile 390px Screenshot.
  - i18n audit.
  - Reload direkt nach Run-Start.
- Einzeln committen: ja

### Phase 3: Settings/Menu/Cloud Sync optional

- Ziel: Cloud Sync sauber als optionaler Mehrwert darstellen.
- Betroffene Dateien:
  - `index.html`
  - `app.js`
  - `ui.js`
  - `styles.css`
  - `src/i18n/locales/*.json`
  - ggf. `src/ui/state/menuUiPresentation.js`
  - ggf. `src/ui/state/pushUiPresentation.js`
- Kernidee:
  - Settings: "Spielstand: Lokal gespeichert", "Cloud Sync: Optional/Verbunden".
  - Menu: "Konto & Cloud" statt blockierender Cloud-Sprache.
  - Push/Leaderboard zeigen Login als Feature-Anforderung.
  - Logout fuehrt in Gastmodus, nicht in Startup-Gate.
- Risiko: mittel
- Aufwand: mittel
- Empfohlene Tests:
  - Settings UI Smoke.
  - Push UI Presentation Tests.
  - Menu UI Presentation Tests.
  - Logout -> Gastmodus -> Reload.
- Einzeln committen: ja

### Phase 4: Tests und Release-Gate

- Ziel: Neue Gastmodus-Regel gegen Regression absichern.
- Betroffene Dateien:
  - `test/stability-top5-regression.test.js`
  - `test/ui-onboarding-settings-smoke.test.js`
  - `test/ui-runtime-wiring.test.js`
  - ggf. neuer Gastmodus-Smoke-Test
  - ggf. `test/support/browserRuntime.js`
- Kernidee:
  - Alte Erwartung "kein Token = Auth Gate" ersetzen.
  - Neue Erwartung "kein Token = Gastmodus, lokale Persistenz aktiv".
  - Login-pflichtige Features separat pruefen.
- Risiko: mittel bis hoch, weil alte Tests bewusst anderes Verhalten erwarten.
- Aufwand: mittel
- Empfohlene Tests:
  - `npm run check:syntax`
  - `npm run check:i18n`
  - relevante UI smoke tests
  - runtime wiring
  - save/load roundtrip
  - event scheduler/runtime smoke
- Einzeln committen: ja

### Phase 5: Datenschutz-/Textabgleich

- Ziel: Rechtliche und Produkttexte an Gastmodus/Cloud optional anpassen.
- Betroffene Dateien:
  - `index.html`
  - `src/i18n/locales/*.json`
  - ggf. `manifest.webmanifest`
  - ggf. README/Docs nach separater Freigabe
- Kernidee:
  - einfache Datenschutz-Kurzfassung fuer lokale Speicherung.
  - Cloud Sync erklaert erst bei Aktivierung.
  - keine MVP-/Dev-Sprache in Public-Flaechen.
- Risiko: niedrig technisch, mittel produkt/rechtlich
- Aufwand: klein bis mittel
- Empfohlene Tests:
  - i18n audit.
  - Legal sheets sichtbar.
  - Settings/Menu Textreview.
  - Mobile Screenshot.
- Einzeln committen: ja

## 11. Tests fuer spaetere Umsetzung

### Technische Tests

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/stability-top5-regression.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `node test/ui-runtime-wiring.test.js`
- `node test/menu-ui-presentation.test.js`
- `node test/push-ui-presentation.test.js`
- `node test/event-scheduler-runtime.test.js`
- `node test/event-resume-reconciliation-runtime.test.js`
- Save/Load-Roundtrip fuer Gastmodus, falls neuer Test entsteht.

### Browser-/Mobile-Checks

- Frischer Start ohne Token, ohne `?dev=1`.
- Frischer Start mit lokalem Save.
- Reload nach Run-Start.
- Login nach aktivem Gast-Run.
- Remote Save vorhanden plus lokaler Save vorhanden.
- Logout nach Login.
- Settings Cloud Sync Row.
- Push aktivieren ohne Login.
- Leaderboard ohne Login.
- 390 x 844 und sehr schmale Viewports.

### Persistenzszenarien

1. Kein lokaler Save, kein Token: Welcome/Onboarding.
2. Lokaler Save, kein Token: lokaler Run wird wiederhergestellt.
3. Gueltiger Token, kein lokaler Save: Remote Restore, falls vorhanden.
4. Gueltiger Token plus lokaler Save: Frische-/Konfliktregel.
5. Abgelaufener Token plus lokaler Save: Gastmodus, kein Gate.
6. Logout: lokaler Save bleibt, Cloud pausiert.
7. LocalStorage geloescht, IndexedDB vorhanden: aktuelles stale-Verhalten bewusst pruefen.
8. Beschaedigter LocalStorage JSON: App faellt sicher zurueck.

### UX-/Textchecks

- Kein sichtbares "Anmeldung erforderlich" beim ersten Start.
- Kein sichtbares "Local Dev" ausser im Dev-Bypass.
- Kein Cloud-Sync-Zwang vor Run-Setup.
- Cloud Sync wird als optional erklaert.
- Datenschutz-Kurztext ist einfach und korrekt.

## 12. Finale Empfehlung

Der Gastmodus sollte als naechster konkreter P0-Schritt umgesetzt werden, aber in klar getrennten Phasen. Die technische Basis ist guenstig, weil lokale Persistenz bereits robust angelegt ist und Remote Sync schon fallbackfaehig arbeitet. Der groesste Eingriff liegt in der Boot- und Auth-Gate-Produktlogik, nicht in der Simulation.

Empfohlene Entscheidung:

- Gastmodus ist Standard fuer neue Nutzer.
- Login ist optionaler Upgrade-Pfad.
- Cloud Sync, Push, Leaderboard und verifizierte Ergebnisse duerfen Login verlangen.
- Logout fuehrt in Gastmodus, nicht zurueck in ein blockierendes Startup-Gate.
- Lokaler Save bleibt die sichere Basis, bis Cloud Sync bewusst aktiviert wird.

Damit wird Grow Simulator beim Start wieder als Spiel wahrgenommen: erst Pflanze, Pflege und Buddy; danach Cloud, Account und Wettbewerb.
