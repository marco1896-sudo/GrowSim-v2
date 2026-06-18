# 47 — Codex Phase 29 Shadow-Bridge Guardrails

## 1. Was die erste Shadow-Bridge darf
- Read-only Laden von:
  - `data/events/catalog/events/**`
  - `data/events/catalog/learning-cards/**`
  - `src/i18n/locales/de.json`
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`
- Adapter-/Contract-/QA-Auswertung im isolierten V2-Bereich.
- Manuell ausgeloester Dry-Run ohne Seiteneffekte.

## 2. Was sie ausdruecklich nicht darf
- Keine Event-Aktivierung im Live-Spiel.
- Keine Mutation von Runtime-State.
- Keine Save-/Persistence-Schreiboperation.
- Keine UI-Ersetzung der bestehenden Event-UI.
- Keine Navigationseingriffe.

## 3. Read-only Grenzen
- Nur lesen, nie schreiben ausserhalb eigener Ergebnisdokumentation.
- Keine Dateizugriffe ausserhalb V2/Katalog/Locale-Kontext fuer Bridge-Logik.

## 4. No-Op Garantien
- Jeder Dry-Run muss ein No-Op-Result liefern:
  - `runtimeTouched=false`
  - `saveTouched=false`
  - `uiReplaced=false`
- Bei Unsicherheit immer Safe-Fallback auf No-Op.

## 5. Rollback-Strategie
- Rollback = sofortige Rueckkehr auf No-Op-Modus.
- Keine teilweisen Runtime-Hooks bestehen lassen.
- Bei Regelverletzung Bridge-Stubs entkoppeln und Dry-Run abbrechen.

## 6. Datei-Tabuliste
Nicht anfassen in der ersten Bridge-Iteration:
- `app.js`
- `src/events/*.js` (bestehende Runtime)
- `data/events.json`
- `data/events.v2.json`
- `data/events.foundation.json`
- bestehende Produktions-UI-Eventdateien ausserhalb V2-UI-Lab

## 7. Feature-Flag-Regeln
- Keine neuen oder geaenderten Feature-Flags.
- Kein verstecktes Runtime-Switching.
- Bridge bleibt manuell und isoliert.

## 8. Logging-/Diagnostics-Regeln
- Nur strukturierte Diagnostics aus V2-Adapter/QA.
- Keine Runtime-Log-Spam-Integration.
- Jede Abweichung (warning/error/blocker) muss im Ergebnisreport sichtbar sein.

## 9. Savegame-Schutzregeln
- Kein Schreiben in Save-Strukturen.
- Kein Save-Migration-Code in Bridge-Phase.
- Keine Persistenz-Adapter-Aktivierung fuer Live-Saves.

## 10. UI-Schutzregeln
- Bestehende Event-UI bleibt authority.
- UI-Lab bleibt isolierte Vorschauflaeche.
- Keine App-Navigation oder Modal-Routing-Umschaltung.

## 11. Performance-Schutzregeln
- Keine dauerhafte Tick-Verkabelung.
- Dry-Run nur manuell und begrenzt.
- Keine grossen synchronen Runtime-Scans in Live-Pfaden.

## 12. Abbruchkriterien
Sofort abbrechen, wenn eines eintritt:
- blocker/error Diagnostics > 0 im Bridge-Kontext.
- Jeder Versuch, Runtime- oder Save-State zu mutieren.
- Ein Importpfad aus Bridge-Code in bestehende Runtime-Module.
- Budget-Warnings > 0 in einem verpflichtenden Bridge-Preflight.
