# Mobile Visual Premium QA Follow-up: Mission Reward Reload Fix

## Ausgangslage

Die Mobile-Visual-QA-Phase hatte die Settings sichtbar verbessert, blieb formal aber auf `no-go`, weil `node test/guest-mode-startup.test.js` rot war.

## Fehlerbild

Nach Guest-Reload oeffnete sich einige Sekunden spaeter erneut ein blockierender `mission-reward`-Dialog. Dadurch wurden Menue und Settings auf dem wiederhergestellten Run ungewollt ueberlagert.

## Ursache

- Der Dialog wird von `window.completeMission(...)` in [app.js](/C:/Users/Marco/Desktop/Entwicklung/GrowSim-v2-main/app.js:22379) geoeffnet.
- Er wurde nicht aus gespeichertem UI-State wiederhergestellt.
- Der eigentliche Trigger war eine passive Missionspruefung im Restore-Run:
  `mission_004` (`Gruener Daumen`, `min_health >= 95`) wurde nach Reload einige Sekunden spaeter neu abgeschlossen, weil `averageHealth` im laufenden Restore-Tick weiter anstieg.
- Die Mission und Coins waren produktseitig legitim, aber das daraus folgende Overlay war im Startup-/Reload-Kontext der blockierende Fehler.

## Geaenderte Dateien

- `app.js`
- `storage.js`
- `test/guest-mode-startup.test.js`

## Fix

- Restore-Metadaten werden nun transient erfasst, wenn beim Boot wirklich ein bestehender Snapshot geladen wurde.
- Fuer wiederhergestellte aktive Runs gibt es ein kleines Startup-Schutzfenster.
- Wenn in diesem Schutzfenster eine passive Tick-Mission abgeschlossen wird, bleiben Mission und Coin-Belohnung erhalten, aber der blockierende `mission-reward`-Dialog wird nicht automatisch geoeffnet.
- Interaktive oder spaetere Missionsabschluesse ausserhalb dieses Restore-Fensters bleiben unveraendert.

## Verhalten nach Guest-Reload

- Der wiederhergestellte Guest-Run bleibt stabil sichtbar.
- Menue und Settings bleiben erreichbar.
- `mission_004` kann weiterhin sauber abgeschlossen werden.
- Die Mission-Coins werden weiterhin gutgeschrieben.
- Der blockierende Reward-Dialog erscheint in diesem Restore-Sonderfall nicht ungefragt ueber der UI.

## Auswirkung auf Mission-/Reward-Dialoge

- Kein globales Abschalten.
- Kein Verlust von Rewards.
- Kein Umbau der Missionsmechanik.
- Nur passive Tick-basierte Missionsdialoge waehrend des Restore-Startup-Fensters eines bereits wiederhergestellten Runs werden entkoppelt.

## Neue/geaenderte Tests

- `test/guest-mode-startup.test.js`
  - prueft jetzt zusaetzlich, dass die passive Health-Mission nach Guest-Reload weiterhin abgeschlossen wird
  - prueft, dass die Reward-Coins erhalten bleiben
  - prueft, dass Menue und `mission-reward`-Dialog dabei nicht blockierend wieder aufgehen

## Ausgefuehrte Tests

- `node test/guest-mode-startup.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
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

## Testergebnisse

- Alle oben genannten Tests sind gruen durchgelaufen.

## Finale Einschaetzung

`go`

Begruendung: `guest-mode-startup.test.js` ist gruen, der Guest-Reload stellt keinen blockierenden `mission-reward`-Dialog mehr wieder her, und die restlichen Gates bleiben gruen.
