# Grow Simulator Gastmodus Phase 3 - Menu, Settings und Cloud-Polish

## Ausgangslage

Phase 1 hat den blockierenden Auth-Start entfernt: ein frischer Start ohne Session initialisiert den lokalen State und oeffnet den lokalen Gastmodus. Phase 2 hat den ersten Spielkontakt ueber Welcome, Buddy-Moment und Run-Setup geglaettet.

Phase 3 baut darauf auf. Der normale lokale Spielstart sollte nicht mehr durch Login, Cloud Sync, Push oder verifizierte Features wie Leaderboard sprachlich wie technisch verdunkelt werden. Die App soll im Menue und in den Settings klar als lokal spielbares Spiel wirken, waehrend Account- und Cloud-Funktionen optional bleiben.

## Ziel von Phase 3

- Menue und Settings sprachlich von internen Begriffen wie Runtime, AuthGate, Debug oder Pflicht-Login befreien.
- Cloud Sync als optionales Backup erklaeren, nicht als Startvoraussetzung.
- Lokalen Gastmodus sichtbar bestaetigen.
- Push, Leaderboard, Rewards und Shop klar als optional oder accountnah markieren.
- Mobile Settings-Aktionen gegen enge Breiten schuetzen.
- Boot-, Auth-, Cloud- und Save-Struktur nicht tief umbauen.

## Geaenderte Dateien

- `index.html`
- `styles.css`
- `app.js`
- `src/ui/state/menuUiPresentation.js`
- `src/ui/state/pushUiPresentation.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/guest-mode-startup.test.js`
- `test/ui-onboarding-settings-smoke.test.js`
- `test/menu-ui-presentation.test.js`
- `test/push-ui-presentation.test.js`
- `docs/app-store-readiness/codex-guest-mode-phase-3-menu-settings-cloud-polish.md`

## Aenderungen am Menue

- Das Menue wurde in klare Gruppen gegliedert: Run, Fortschritt, Optional und Info.
- Leaderboard kommuniziert jetzt, dass verifizierte Ergebnisse ein Konto nutzen koennen, ohne den lokalen Run zu blockieren.
- Coin Shop und Support werden als optionale Komfort- beziehungsweise Supportbereiche beschrieben.
- Settings werden mit "Tempo, Sprache, Cloud" beschrieben, statt technisch zu wirken.
- Interne oder entwicklungsnahe Begriffe wurden aus sichtbaren Menue-Texten entfernt.
- Reward-Hinweise sprechen jetzt von optionalen/verifizierten Belohnungen statt von Debug-, Direct- oder Runtime-Modi.

## Aenderungen an Settings

- Settings heissen in Deutsch sichtbar "Einstellungen".
- Der Kopfbereich beschreibt die Flaeche als "Tempo, Speicher und Cloud".
- Gameplay, lokaler Spielstand und Cloud wurden sprachlich getrennt.
- Autosave wird als lokaler Spielstand erklaert.
- Cloud Sync zeigt ohne Session "Lokal auf diesem Geraet" und erklaert optionales Backup.
- Push wurde in "Erinnerungen" umbenannt und als optionaler Bereich gefuehrt.
- Reset-, Default- und Save-Aktionen wurden kompakter und mobiler angeordnet.

## Aenderungen an Cloud- und Login-Kommunikation

- Ohne Session erscheint kein blockierendes Login-/Cloud-Gate.
- Cloud Sync wird als optionales Backup erklaert.
- Cloud-nahe Aktionen duerfen weiterhin Login verlangen, formulieren dies aber ohne den lokalen Run zu blockieren.
- Push-Hinweise sagen klar, dass lokales Spielen weiter moeglich bleibt.
- Leaderboard-Hinweise trennen lokale Spielbarkeit von verifizierten Ergebnissen.

## Verhalten Gastmodus

- Frischer Start ohne Session bleibt lokal startbar.
- `initOrMigrateState()` laeuft weiterhin vor dem ersten spielbaren Kontakt.
- Menue und Settings koennen ohne Login geoeffnet werden.
- Lokales Autosave bleibt sichtbar und verstaendlich.
- Cloud Sync ist nicht automatisch aktiv.

## Verhalten mit Session

- Bestehende Session-Nutzung bleibt erhalten.
- Cloud Sync kann weiter als verbunden angezeigt werden.
- Account-nahe Ziele wie verifizierte Ergebnisse, Cloud Save oder Push mit Cloud-Bezug koennen weiterhin Login beziehungsweise Session verlangen.
- Phase 3 hat keinen Auth- oder Remote-Sync-Refactor eingefuehrt.

## Mobile-Polish

- Settings-Aktionsbuttons erhalten stabile Mindesthoehen und umbrechende Grid-Spalten.
- Auf sehr engen Breiten wechseln Settings-Aktionen in eine einspaltige Anordnung.
- Push-Werte duerfen umbrechen, damit keine harte horizontale Spannung entsteht.
- Gestapelte Cloud-Zeilen trennen Label und Erklaertext visuell ruhiger.

## Neue oder geaenderte Texte

- "Lokal auf diesem Geraet"
- "Optionales Backup, lokales Spielen bleibt moeglich."
- "Lokaler Spielstand"
- "Lokal alle {seconds}s"
- "Erinnerungen"
- "Erinnerungen sind optional und aktuell aus."
- "Verifizierte Ergebnisse mit Konto"
- "Optionale Komfortaktionen"
- "Freiwilliger Support"
- "Tempo, Sprache, Cloud"
- "Aktuellen Run sichern und neu starten"

Die Texte wurden in Deutsch, Englisch und Spanisch ergaenzt, damit der i18n-Gleichstand erhalten bleibt.

## Tests

Gezielt erweitert:

- `test/guest-mode-startup.test.js`
  - prueft Start ohne Session
  - prueft aktiven Gastmodus
  - prueft kein blockierendes Auth-Gate
  - prueft Settings-Zugang ohne Login
  - prueft lokale Cloud-Anzeige
  - prueft Reload mit lokalem Save

- `test/ui-onboarding-settings-smoke.test.js`
  - prueft Menuegruppen
  - prueft Settings-Werte
  - prueft sichtbare Texte gegen interne Woerter

- `test/menu-ui-presentation.test.js`
  - prueft optionale Reward- und Menue-Kommunikation

- `test/push-ui-presentation.test.js`
  - prueft Push-Hinweise fuer signed-out/local-only Zustaende

## Testergebnisse

Ausgefuehrt und bestanden:

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/menu-ui-presentation.test.js`
- `node test/push-ui-presentation.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`

Das Event-V2 Release Gate meldet `ok: true` und `gate: go`.

Hinweis: Der i18n-Check meldet weiterhin nur bekannte Heuristik-Hinweise zu moeglicherweise ungenutzten Keys. Missing Keys, Extra Keys und fehlende verwendete Keys stehen bei 0.

## Offene Risiken

- Es wurde kein tiefer Cloud-Sync- oder Auth-Refactor vorgenommen. Das ist fuer Phase 3 gewollt, laesst aber spaetere Account-Konvertierung weiterhin als eigenes Thema offen.
- Die mobile Politur wurde ueber Struktur, CSS und Smoke-Tests abgesichert, aber nicht als separate pixelgenaue Screenshot-Abnahme dokumentiert.
- Verifizierte Features bleiben accountnah. Spaetere Phasen sollten jeden Einstiegspunkt einzeln darauf pruefen, dass kein neuer Startup-Blocker entsteht.

## Finale Einschaetzung

go

Der lokale Gaststart bleibt unblocked, Menue und Settings kommunizieren Cloud/Login klar optional, und alle geforderten Gates sind gruen.
