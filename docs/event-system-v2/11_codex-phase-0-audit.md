# 11 — Codex Phase 0 Audit

Status: Phase-0-Dokumentation (Read-only).  
Keine Runtime-Änderungen, keine Event-Migration, keine UI-/Locale-/Save-/Flag-Änderungen.

## 1. Kurze Zusammenfassung, was Event System V2 werden soll
Event System V2 soll ein modular aufgebautes, datengetriebenes, realistisches und lernorientiertes Event-System werden, das Kausalität (Ursache ? Symptom ? Entscheidung ? Nachwirkung), Event-Ketten, Coach-/Learning-Layer, klare Qualitätsregeln und eine sichere, schrittweise Einführung über Shadow-/Cutover-Phasen unterstützt. Ziel ist ein premium mobiles Spielerlebnis mit stabiler Persistenz und kontrollierbarer Rollback-Fähigkeit.

## 2. Welche bestehenden Event-Dateien aktuell relevant sind
Aktuell relevante bestehende Event-Dateien im Repository:

- `src/events/eventEngine.js`
- `src/events/eventShared.js`
- `src/events/eventEligibility.js`
- `src/events/eventActivation.js`
- `src/events/eventPressure.js`
- `src/events/eventEscalation.js`
- `src/events/eventCooldowns.js`
- `src/events/eventContradictions.js`
- `src/events/eventResolution.js`
- `src/events/eventResolver.js`
- `src/events/eventRewards.js`
- `src/events/eventChains.js`
- `src/events/eventAnalysis.js`
- `src/events/eventAnalysisRuntime.js`
- `src/events/eventMemory.js`
- `src/events/eventPersistenceAdapter.js`
- `src/events/eventAssets.js`
- `src/events/eventFeatureFlag.js`
- `src/events/eventFlags.js`

Relevante Event-Datenquellen:

- `data/events.json` (Legacy)
- `data/events.v2.json` (aktueller V2-Katalog)
- `data/events.foundation.json`
- `data/event-assets.registry.json`
- `data/event-assets.gaps.json`

## 3. Welche bestehenden Runtime-Dateien besonders vorsichtig behandelt werden müssen
Besonders vorsichtig zu behandeln (hohes Integrations-/Regressionsrisiko):

- `app.js` (zentraler Runtime-Einstieg und Event-Wiring)
- `src/events/eventEngine.js` (Orchestrierung + Tick-Routing)
- `src/events/eventPersistenceAdapter.js` (Save-Snapshot/Restore)
- `src/events/eventFeatureFlag.js` (Modussteuerung)
- `src/events/eventShared.js` (Snapshot-/Trigger-Baselogik)
- `src/events/eventResolution.js` und `src/events/eventResolver.js` (Choice-Auflösung)
- `src/events/eventCooldowns.js`, `eventContradictions.js`, `eventEscalation.js` (Balancing-/Konsistenzkern)

## 4. Welche neuen Ordner/Dateien laut Spezifikation später nötig werden
Später laut Spezifikation vorgesehen (noch nicht in Phase 0 umsetzen):

- `src/systems/events-v2/` (Contracts, Validation, Loader, Engine, Coach, Learning, Chains)
- `data/events-v2/` (catalog, chains, beats)
- alternativ/ergänzend in anderen Spezifikationen: `src/events/v2/`, `data/events/catalog/`, `data/events/schemas/`
- `scripts/validate-catalog.ts` und weitere Validator-/Simulationsskripte
- zusätzliche Dokumente/Artefakte für Phase-Fortschritte (z. B. Architektur-/Testing-/Catalog-Outputs)

Wichtig: Die Spezifikationen nennen zwei Strukturvarianten (`src/events/v2` vs. `src/systems/events-v2`). Das muss vor Phase 1 eindeutig entschieden werden.

## 5. Welche Risiken vor Phase 1 geklärt sein müssen
- Zielpfad-Konflikt: Spezifikation nutzt teils `src/systems/events/**`, Repo hat aktuell `src/events/**`.
- Scope-Konflikt: Einige Spec-Phasen erlauben `package.json`-Änderungen; aktueller Auftrag verbietet das explizit.
- Quellenkonflikt: Mehrere Dokumente geben unterschiedliche „nächste Codex-Aufträge“ (#001/#002/#003/#004/#005*).
- Naming-/Schema-Konflikt: `data/events-v2/*` vs. `data/events/catalog/*`.
- Startpunkt-Konflikt: `10_codex-stepwise-implementation.md` fordert eigenes `00_v1-audit.md`, vorhanden ist bereits `00_current-system-audit.md`.
- Dirty Worktree: Aktuell bestehen ungeklärte Änderungen außerhalb des Event-V2-Scopes.

## 6. Welche Tests aktuell als Sicherheitsnetz relevant sind
Relevantes bestehendes Sicherheitsnetz (ohne neue Tests zu schreiben):

- Event-Phasen-Tests: `test/event-phase*.test.js`
- Integrations-/Flow-Tests: `test/event-flow-*.test.js`, `test/event-resolver-guards-integration.test.js`
- Runtime-/Regression-Tests: z. B. `test/event-realism-runtime.test.js`, `test/event-scheduler-runtime.test.js`, `test/event-timer-balance-regression.test.js`, `test/event-roll-threshold-regression.test.js`, `test/event-ui-exclusive-rendering.test.js`
- Verifier-Skripte in `dev/`: z. B. `dev/verify_event_foundation.js`, `dev/verify_event_pools.js`, `dev/verify_event_weighting.js`, `dev/verify_event_analysis.js`, `dev/verify_event_resolver_guards.js`, `dev/verify_event_catalog_guard_metadata.js`, `dev/verify_pending_chain_lifecycle.js`

## 7. Welche Punkte aus den Specs widersprüchlich, unklar oder riskant wirken
- Widerspruch bei Zielarchitekturpfaden (`src/events/v2` vs. `src/systems/events-v2`, `data/events-v2` vs. `data/events/catalog`).
- Widerspruch bei erlaubten Änderungen in frühen Phasen (`package.json` in manchen Specs erlaubt, in diesem Auftrag verboten).
- Umfangsrisiko: einige Katalogdokumente sind sehr groß und nutzen teilweise andere Zählungen/Bezeichnungen (z. B. Story-Beats 10 vs. 27), dadurch Integrationsrisiko im Datenmodell.
- Prozessrisiko: „einzige Quelle der Wahrheit“ im Stepwise-Dokument kollidiert faktisch mit bereits parallel bestehenden Detailaufträgen in anderen Event-V2-Dokumenten.
- Realitätsabgleich: Stepwise nennt Audit-Zielpfade, die so im aktuellen Repo nicht vorhanden sind.

## 8. Welche minimale Phase-1-Umsetzung du empfiehlst
Empfohlene minimale, sichere Phase 1 (ohne Runtime-Eingriff):

1. Endgültige Pfadkonvention festlegen (einmalig):
   - Option A: `src/systems/events-v2` + `data/events-v2`
   - Option B: `src/events/v2` + `data/events/catalog`
2. Nur neue, leere Struktur + Contracts + Validator-Skelett anlegen.
3. Keine Imports in bestehende Runtime.
4. Keine package.json-Änderung in diesem Schritt.
5. Validierung zunächst manuell per Node-Aufruf (ohne CI-Hook).

## 9. Exakte Datei-Liste für Phase 1
Empfehlung für eine minimale und konfliktarme Datei-Liste (Variante A gemäß Stepwise-Hauptpfad):

- `src/systems/events-v2/contracts/EventV2.ts`
- `src/systems/events-v2/contracts/ChainV2.ts`
- `src/systems/events-v2/contracts/BeatV2.ts`
- `src/systems/events-v2/contracts/AssetRef.ts`
- `src/systems/events-v2/contracts/KnowledgeProfile.ts`
- `src/systems/events-v2/contracts/index.ts`
- `src/systems/events-v2/validation/CatalogValidator.ts`
- `src/systems/events-v2/validation/BotanicalConstants.ts`
- `src/systems/events-v2/validation/ToneBlocklist.ts`
- `src/systems/events-v2/validation/ValidationResult.ts`
- `data/events-v2/catalog/.gitkeep`
- `data/events-v2/chains/.gitkeep`
- `data/events-v2/beats/.gitkeep`
- `scripts/validate-catalog.ts`

Wichtig: Nur neue Dateien. Keine bestehenden Dateien ändern.

## 10. Klare Verbotsliste für Phase 1
- Keine Änderung an `app.js`
- Keine Änderung an `src/events/**`
- Keine Migration oder Änderung in `data/events.json`, `data/events.v2.json`, `data/events.foundation.json`
- Keine Änderung an `src/i18n/locales/*.json`
- Keine UI-Änderungen in bestehenden Komponenten
- Keine Save-/Persistence-Migration
- Keine Aktivierung/Änderung von Feature-Flags
- Keine package.json-Änderung (für den aktuellen Auftrag)
- Keine Test-Suite-Umbauten

## 11. Exit-Kriterien für Phase 0
Phase 0 ist abgeschlossen, wenn:

- Alle geforderten Spezifikationsdokumente vollständig gelesen wurden.
- Bestehende Event-/Runtime-Risiken und Konflikte dokumentiert sind.
- Eine klare minimale Phase-1-Dateiliste vorliegt.
- Verbotsliste für Phase 1 eindeutig festgehalten ist.
- Keine bestehenden Projektdateien im Zuge von Phase 0 geändert wurden.

Empfehlung: Phase 1 kann sicher starten, sobald Pfadkonvention (Strukturvariante A/B) einmalig bestätigt ist.