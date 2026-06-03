# Grow Simulator Gastmodus Phase 4 - Release-Gate und Regression-Fokus

## Ausgangslage

Die Gastmodus-Phasen 1 bis 3 haben den blockierenden Startup-Auth-Flow entfernt, den lokalen Welcome-/Run-Builder-Start verbessert und Menu/Settings/Cloud-Kommunikation auf optionalen Cloud Sync ausgerichtet.

Phase 4 war eine Absicherungsphase. Ziel war nicht, neue Features zu bauen, sondern die kritischen Kernflows vor Release-Regressions zu pruefen: frischer Gaststart, bestehender lokaler Save, alter Save mit gespeichertem Auth-Gate, Logout, Session-Nutzung, Cloud-nahe Funktionen, Gameover/Death, Event-V2 und PWA/Service Worker.

## Ziel von Phase 4

- Gastmodus-Start und lokale Saves gegen Regression sichern.
- Alte UI-Snapshots mit `authGateActive: true` gezielt pruefen.
- Logout als Rueckfall in lokalen Gastmodus pruefen.
- Session-Nutzung gegen falsche Gast-Hinweise absichern.
- Gameover/Death und Event-V2 nach den Gastmodus-Aenderungen voll pruefen.
- Keine neue Account-Architektur, kein Cloud-Sync-Refactor, keine Save-Struktur-Aenderung.

## Gepruefte Flows

- Frischer Start ohne Session und ohne Storage.
- Lokaler Run-Start als Gast mit lokalem Save.
- Reload eines bestehenden lokalen Gast-Runs.
- Alter lokaler Save mit `ui.authGateActive: true`, offenem Menue und transientem Sheet.
- Session-Start mit gueltigem Token.
- Session-Settings mit verbundenem Cloud-Status.
- Logout aus dem Account-Dialog.
- Cloud Sync ohne Session als optionaler Hinweis.
- Menu/Settings ohne sichtbare interne Begriffe.
- Gameover/Death-Dialog mit Analyse, Reset und neuem Run.
- Event-V2 Runtime, Release-Tests und Release-Gate-Snapshot.
- Service-Worker-Shell-Assets und UTF-8-Encoding.

## Gefundene Probleme

1. Der Gastmodus-Hinweis im Run-Builder war statisch sichtbar. Dadurch konnte ein frischer Start mit gueltiger Session ebenfalls "Gastmodus aktiv" anzeigen.
2. Der Session-Smoke brauchte eine klarere Regression fuer Logout: Nach Logout darf kein Pflicht-Gate erscheinen, und Cloud muss auf lokalen Geraete-Save zurueckfallen.
3. Ein Reload-Test konnte einen nachlaufenden Missions-Reward-Dialog als wiederhergestellten transienten Menue-Zustand fehlklassifizieren, obwohl der gespeicherte Snapshot bereits sauber war.

## Behobene Probleme

- Der lokale Gast-Hinweis im Run-Builder wird jetzt nur angezeigt, wenn keine Auth-Session aktiv ist.
- Der Boot-Renderpfad neutralisiert transiente UI-Zustaende nach dem finalen Render noch einmal und rendert danach neu. Das schuetzt gegen spaet gesetzte Menue-/Sheet-Reste vor `__gsBootOk`.
- Der Guest-Startup-Test simuliert jetzt explizit einen alten lokalen Save mit `authGateActive: true`, offenem Menue, Dialogzustand und Sheet.
- Der Onboarding/Settings-Smoke prueft Logout als Rueckfall in lokalen Gastmodus.
- Der Onboarding/Settings-Smoke unterscheidet nun zwischen einem gespeicherten transienten Restore-Zustand und einem neu erzeugten, nicht gespeicherten Missions-Reward-Dialog.

## Geaenderte Dateien

Phase-4-relevant:

- `app.js`
- `test/guest-mode-startup.test.js`
- `test/ui-onboarding-settings-smoke.test.js`
- `docs/app-store-readiness/codex-guest-mode-phase-4-release-regression-gate.md`

Hinweis: Im Arbeitsbaum liegen weiterhin die offenen Aenderungen aus den Gastmodus-Phasen 1 bis 3, unter anderem an Menu/Settings/i18n/Storage-nahen Tests.

## Neue/geaenderte Tests

- `test/guest-mode-startup.test.js`
  - erweitert um alten lokalen Save mit `authGateActive: true`
  - prueft, dass Auth-Gate, Menue, Dialog und Sheet nach Reload nicht blockierend wiederhergestellt werden

- `test/ui-onboarding-settings-smoke.test.js`
  - prueft, dass angemeldete Nutzer keinen falschen Gastmodus-Hinweis sehen
  - prueft Cloud-Status mit Session
  - prueft Logout ohne Pflicht-Gate
  - prueft lokalen Cloud-Fallback nach Logout
  - prueft transienten Reload-Zustand differenzierter

## Verhalten frischer Gaststart

Ein frischer Start ohne Session bootet lokal, erzeugt initialen lokalen State, zeigt den Run-Builder und oeffnet kein Auth-/Cloud-Gate. Der Gast-Hinweis bleibt im frischen Gaststart sichtbar und beschreibt lokalen Save sowie optionalen Cloud Sync.

## Verhalten bestehender lokaler Save

Ein lokal gestarteter Gast-Run wird nach Reload weiter geladen. Landing/Run-Builder bleiben nach gestartetem Run geschlossen, kein Login-Gate erscheint, und der lokale Save bleibt die Grundlage.

## Verhalten alter Save mit `authGateActive`

Ein manipulierter alter lokaler Save mit `ui.authGateActive: true`, offenem Menue, Dialogzustand und Sheet wird beim Restore neutralisiert. Nach Reload bleibt `authGateActive` false, Auth-Modal bleibt geschlossen, Menue bleibt geschlossen und `openSheet` ist `null`.

## Verhalten Logout

Logout entfernt den Auth-Token, schliesst den Account-Dialog, setzt kein Pflicht-Gate und laesst den aktiven lokalen Run sichtbar. Cloud Sync faellt auf "Lokal auf diesem Geraet" zurueck und bleibt optional beschrieben.

## Verhalten Session-Nutzer

Mit gueltiger Session wird Auth weiter erkannt, Cloud-Status zeigt die verbundene Identitaet, und der Run-Builder zeigt keinen falschen "Gastmodus aktiv"-Hinweis. Session-Cloud-Verhalten bleibt nutzbar.

## Verhalten Gameover/Death

Der Death-Dialog bleibt klickbar. "Analyse oeffnen" oeffnet den Analyse-/Dashboard-Pfad, "Run verwerfen & neu starten" fuehrt ueber den bestaetigten Reset in die Run-Zusammenfassung, und ein neuer Run ist danach moeglich. Kein Auth-Gate wird durch den Death-Reset aktiviert.

## Verhalten Event-V2

Event-V2 Runtime-Tests, Release-Tests und Release-Gate-Snapshot bleiben gruen. Der Snapshot meldet `ok: true` und `gate: go`. Keine Event-V2-Umstrukturierung wurde vorgenommen.

## Tests

Ausgefuehrt:

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/guest-mode-startup.test.js`
- `node test/menu-ui-presentation.test.js`
- `node test/push-ui-presentation.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `node test/gameover-flow-runtime.test.js`
- `node test/stability-top5-regression.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`
- `node test/encoding-utf8-regression.test.js`

## Testergebnisse

Alle ausgefuehrten Tests sind bestanden.

Der i18n-Check meldet weiterhin nur bekannte Heuristik-Hinweise zu ungenutzten Keys. Missing Keys, Extra Keys und fehlende verwendete Keys stehen bei 0.

`npm run test:runtime` gibt erwartete i18n-Fallback-Logs fuer bewusst fehlende Test-Keys aus, laeuft aber erfolgreich durch.

Der Event-V2 Release-Gate-Snapshot:

- `ok: true`
- `gate: go`
- `blockers: []`
- `warnings: []`

## Offene Risiken

- Die Account-Konvertierung eines spaeteren Gastnutzers in einen Cloud-Account bleibt ein eigenes spaeteres Thema.
- Cloud-nahe Features wie Leaderboard, Cloud Save, Push mit Cloud-Bezug und verifizierte Ergebnisse bleiben accountnah und sollten bei jeder spaeteren UI-Aenderung erneut gegen Startup-Blocking geprueft werden.
- Der Browser kann in manueller QA weiterhin alte Service-Worker-/Cache-Zustaende halten. Der automatisierte Shell-Asset-Test ist gruen; fuer manuelle Erststart-QA sollte Storage/Cache bewusst geleert werden.
- Nachlaufende Missions-Reward-Dialoge koennen in Runtime-Smokes auftreten. Sie sind kein gespeicherter Auth-/Gastmodus-Blocker, sollten aber bei spaeterer UX-Politur separat bewertet werden.

## Finale Einschaetzung

go

Frischer Gaststart, bestehender lokaler Save, alter Save mit `authGateActive`, Logout, Session-Nutzung, Gameover/Death, Event-V2 und PWA/Shell-Assets sind gruen. Es gibt keinen blockierenden Login-/Cloud-Gate-Rueckfall.
