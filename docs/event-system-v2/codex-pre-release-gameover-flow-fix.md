# Pre-Release Gameover Flow Fix

## Fehlerbild

Nach dem Tod der Pflanze blieb der Dialog "Pflanze ist eingegangen" fuer Nutzer faktisch blockierend. Die Aktionen "Run verwerfen & neu starten" und "Analyse oeffnen" wirkten nicht verlaesslich. Zusaetzlich war im Dialog ein kaputter Analyse-Umlaut sichtbar und die Offline-Nacht-Rettungsmeldung konnte doppelt erscheinen.

## Ursache

- `openMenuDialog()` setzte beim Death-Reset zwar `menuDialogOpen`, aber nicht verlaesslich `menuOpen`. Dadurch wurde der bestaetigende Dialog aus dem Death-Overlay-Pfad nicht sichtbar bzw. nicht klickbar gerendert.
- `renderDeathOverlay()` schloss einen offenen Menu-Dialog wieder, solange das Death-Overlay sichtbar war. Das konnte den Reset-Bestaetigungsdialog direkt nach dem Klick wieder entfernen.
- Der gleiche Offline-Nacht-Text wurde als Rescue-Subtext und als Rescue-Feedback ausgegeben.
- `analysis.open_analysis` war in der deutschen Locale als `Analyse ?ffnen` gespeichert.
- Im Folgecheck fiel ein Restore-Risiko auf: Legacy-`sim.simEpochMs` konnte beim Laden als `startRealTimeMs` uebernommen werden. Das konnte aktive Boosts nach Reload sofort ablaufen lassen und Runtime-Tests destabilisieren.
- Transiente Menu-/Dialogzustände konnten in den Persist-Snapshot gelangen und nach Reload wieder offen erscheinen.

## Betroffene Dateien

- `app.js`
- `ui.js`
- `storage.js`
- `src/i18n/locales/de.json`
- `test/gameover-flow-runtime.test.js`
- `test/time-system-runtime.test.js`

## Fix

- Death-Reset-Dialog oeffnet jetzt den Menu-Layer mit, damit der Bestaetigungsdialog sichtbar und klickbar ist.
- Death-Overlay schliesst den Death-Reset-Bestaetigungsdialog nicht mehr sofort weg.
- Rescue-Feedback im Death-Overlay wird nur noch angezeigt, wenn es nicht identisch mit dem Rescue-Subtext ist.
- Deutsche i18n-Zeile `analysis.open_analysis` wurde auf `Analyse öffnen` korrigiert.
- Legacy-Zeitmigration nutzt `simEpochMs` nicht mehr als Realzeit-Fallback.
- Persistenz speichert transiente Menu-/Dialogzustände bereinigt, ohne den aktuellen UI-Zustand in der Session zu veraendern.
- Neuer gezielter Runtime-Smoke fuer den Gameover-Flow ergaenzt.
- `time-system-runtime` wurde gegen Haenger, Race Conditions und Szenario-State-Leaks abgesichert.

## Ergebnis Gameover Buttons

- "Run verwerfen & neu starten": funktioniert wieder. Der Klick oeffnet den sichtbaren Bestaetigungsdialog, die Bestaetigung beendet den toten Run und fuehrt in den vorgesehenen Run-Summary-/Neuer-Run-Flow.
- "Analyse öffnen": funktioniert wieder. Der Klick schliesst das Death-Overlay und oeffnet die Analyse-/Dashboard-Ansicht.
- "Notfallrettung gesperrt": darf weiterhin gesperrt sein; die anderen Aktionen bleiben klickbar.

## Weitere sichtbare Punkte

- Doppelte Offline-Nacht-Meldung: behoben.
- Encoding "Analyse öffnen": behoben.

## Ausgefuehrte Tests

- `node test/gameover-flow-runtime.test.js` - passed
- `npm run check:syntax` - passed
- `node --check storage.js` - passed
- `npm run check:i18n` - passed
- `node test/encoding-utf8-regression.test.js` - passed
- `node test/time-system-runtime.test.js` - passed
- `npm run test:runtime` - passed
- `npm run test:smoke` - passed
- `npm run test:event-release` - passed
- `node dev/run-event-v2-release-gate-snapshot.js` - passed, `gate: go`
- `node test/service-worker-shell-assets.test.js` - passed

## Nicht geaendert

- Keine Event-V2-Daten oder Event-V2-Logik umstrukturiert.
- Keine Savegame-Struktur geaendert.
- Keine neuen Features oder UI-Experimente.
- Keine Cache-Version geaendert.

## Finale Einschaetzung

go
