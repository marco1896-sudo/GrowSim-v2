# Eventsystem V2 - Final Completion Plan

## Zielstatus

Eventsystem V2 wird in dieser Abschlussphase als **dev-only / no-write / preview-stabil** abgeschlossen.

Kein produktiver Cutover, solange echter Resolve Apply, Save/Load und V1/V2-Write-Gating nicht vollstaendig implementiert und getestet sind.

## Letzte Pflichtaufgaben

1. Katalog validieren
   - doppelte IDs
   - Pflichtfelder
   - Stage-, Kategorie- und Severity-Werte
   - Decisions/Resolve-Preview-Daten
   - Follow-up-/Chain-Referenzen
   - Learning-Card-Referenzen
   - AssetRef-/Cover-Pfade

2. Engine-/Preview-Kern pruefen
   - Shadow Runtime Evaluation
   - Candidate Feed
   - Event-Center-Preview-Bridge
   - Resolve Preview Model
   - Resolve Preview Interaction
   - No-Write-Garantien

3. Runtime-/Save-Sicherheit bewerten
   - V2 darf in dieser Phase keine Save-Writes ausloesen
   - RuntimeWrite- und Production-Flags muessen false bleiben
   - fehlende produktive Save-Felder werden als Restblocker dokumentiert

4. UI/Event-Center-Preview absichern
   - mindestens ein V2-Candidate muss angezeigt werden koennen
   - Detailansicht und Resolve Preview muessen ohne echte Writes funktionieren
   - keine rohen i18n Keys in den getesteten Preview-Flows
   - mobile Preview-Smokes muessen ohne horizontalen Overflow laufen

5. Abschlussbericht schreiben
   - Statusentscheidung
   - geaenderte Dateien
   - Tests
   - Restrisiken
   - naechste Mini-Phase

## Reihenfolge der Umsetzung

1. Audit und Completion-Plan schreiben.
2. Bestehende Validierungs-/Smoke-Skripte ausfuehren.
3. Kleine eindeutige Katalog- oder Fallback-Fehler korrigieren, falls Tests sie zeigen.
4. Bei groesseren Write-/Save-/Resolve-Luecken keine Schnellimplementierung, sondern Dokumentation als Restblocker.
5. Tests erneut ausfuehren, falls Dateien korrigiert wurden.
6. Completion Result schreiben.

## Dateien, die geaendert werden duerfen

- `docs/event-system-v2/phase-final-v2-release-audit.md`
- `docs/event-system-v2/phase-final-v2-completion-plan.md`
- `docs/event-system-v2/phase-final-v2-completion-result.md`
- kleine eindeutige Katalogfixes unter `data/events/catalog/events/`
- kleine eindeutige Chain-/Learning-Card-Fixes unter `data/events/catalog/chains/` und `data/events/catalog/learning-cards/`
- kleine Validierungs- oder Dev-Smoke-Ergaenzungen unter `dev/`, falls eine Luecke die Abschlussbewertung verhindert
- `_planning/`-Notizen fuer verschobene Probleme

## Dateien, die moeglichst nicht geaendert werden sollen

- `app.js`
- `sim.js`
- `storage.js`
- `events.js`
- Service Worker Dateien
- zentrale UI-Dateien
- zentrale Save-/Migration-Dateien
- bestehende produktive V1-Eventdateien

Diese Dateien werden nur geaendert, wenn ein Test einen direkten Stabilitaetsfehler zeigt, der nicht per Dokumentation oder Dev-only-Fallback begrenzbar ist.

## Testplan

Pflichttests fuer diese Abschlussphase:

- `node dev/run-event-v2-assetref-validation.draft.js --active --stdout-only`
- `node dev/run-event-v2-runtime-shadow-evaluation-report.js`
- `node dev/run-event-v2-event-center-preview-bridge-report.js`
- `node dev/run-event-v2-resolve-preview-model-report.js`
- `node dev/run-event-v2-resolve-preview-interaction-flow-smoke.js`
- `node dev/run-event-v2-dev-test-no-write-mode-smoke.js`
- `npm run check:i18n`

Optionale Zusatztests, wenn Laufzeit und lokale Umgebung passen:

- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test`

## Rollback- / Fallback-Strategie

- Feature Flags bleiben auf no-write / non-production.
- V1 bleibt produktive Event-Autoritaet.
- V2 wird nicht als produktiver Event Writer registriert.
- Bei fehlerhaftem Katalogeintrag wird nur der konkrete Eintrag korrigiert oder als `_planning/`-Restpunkt dokumentiert.
- Bei UI-Smoke-Fehlern bleibt V2 im Dev Preview Entry und wird nicht sichtbarer fuer normale Spieler gemacht.
- Bei Save-/Resolve-Luecken wird kein improvisierter Write-Pfad gebaut.

## Definition of Done

- Audit-Datei existiert.
- Completion-Plan existiert.
- Aktiver Katalog wurde validiert oder konkrete Fehler wurden dokumentiert.
- Runtime Shadow Smoke laeuft durch oder scheitert mit dokumentierter Ursache.
- Event-Center-Preview-Bridge Smoke laeuft durch oder scheitert mit dokumentierter Ursache.
- Resolve Preview Model Smoke laeuft durch oder scheitert mit dokumentierter Ursache.
- Resolve Interaction Smoke laeuft durch oder scheitert mit dokumentierter Ursache.
- No-Write Smoke bestaetigt keine Save-/Runtime-Writes oder dokumentiert den Blocker.
- i18n-Audit wurde ausgefuehrt oder mit Begruendung ausgelassen.
- V2-Status ist eindeutig einer dieser Zustaende:
  - fertig aktivierbar
  - soft-enabled
  - dev-only mit konkretem Restblocker
- Abschlussbericht wurde geschrieben.

## Erwarteter Abschlussstatus

Auf Basis des Audits ist der erwartete Abschlussstatus:

**dev-only mit konkretem Restblocker**

Restblocker:

- echter Resolve Apply fehlt
- produktive Save/Load-Form fuer offene V2-Events fehlt
- V1/V2-Write-Gating ist noch nicht final umgesetzt
