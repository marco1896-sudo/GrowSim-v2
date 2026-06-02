# 40 — Codex Phase 25 Shadow-Bridge Adapter Prep Result

## 1. Neu erstellte Dateien
- `src/events/v2/ui-lab/contracts/EventV2UiSlotContract.js`
- `src/events/v2/ui-lab/contracts/EventV2UiSlotFallbacks.js`
- `src/events/v2/ui-lab/contracts/EventV2UiTextBudgetContract.js`
- `src/events/v2/ui-lab/contracts/EventV2UiTokenContract.js`
- `src/events/v2/ui-lab/contracts/README.md`
- `src/events/v2/ui-lab/adapter/EventV2CatalogToUiAdapter.js`
- `src/events/v2/ui-lab/adapter/EventV2LocaleResolver.js`
- `src/events/v2/ui-lab/adapter/EventV2AssetResolver.js`
- `src/events/v2/ui-lab/adapter/EventV2UiAdapterDiagnostics.js`
- `src/events/v2/ui-lab/adapter/README.md`
- `src/events/v2/ui-lab/EventV2UiLabDataFromCatalog.js` (optional helper)
- `docs/event-system-v2/39_codex-phase-25-shadow-bridge-contract-mapping.md`
- `docs/event-system-v2/40_codex-phase-25-shadow-bridge-adapter-prep-result.md`

## 2. Geaenderte UI-Lab-Dateien
- keine bestehenden UI-Lab-Dateien geaendert
- nur neue isolierte Contract-/Adapter-Dateien angelegt

## 3. Wie das Slot-Mapping funktioniert
- `EventV2CatalogToUiAdapter.mapEventToUiLabModel(...)` nimmt:
  - Event-Dokument
  - optionales Learning-Card-Dokument
  - Locale-Bundle (`de/en/es`)
  - Mapping-Optionen (`locale`, `fallbackLocale`, `compactMode`)
- Ausgabe:
  - `uiModel` im UI-Lab-Format
  - `diagnostics` mit Schweregrad
  - `summary` (blocker/error/warning/info)
  - referenzierte Contract-Metadaten

## 4. Welche Fallbacks gelten
- Hero: Cover -> Event-Fallback -> globales Placeholder-Asset
- Alt-Text: Alt-Key -> Titel -> generischer Fallback
- Coach: ruhige generische Summary/Why/Actions
- Decision-Quality: default `situational`
- Learning: optional, kann fehlen
- Aftermath: neutraler Hinweis, wenn Lesson fehlt

## 5. Welche Diagnostics existieren
- `ui_adapter_missing_title` (blocker)
- `ui_adapter_missing_decisions` (blocker)
- `ui_adapter_missing_hero` (warning)
- `ui_adapter_missing_learning_card` (warning)
- `ui_adapter_missing_aftermath` (warning)
- `ui_adapter_locale_missing_title` / Decision-Label (error)
- `ui_adapter_budget_long` (warning)
- `ui_adapter_budget_short` (info)

## 6. Isolierter Smoke-Check
Ja, moeglich und durchgefuehrt (isoliert, ohne Runtime-Hook).

Getestet:
- `indoor_overwatering_early` + `lc_watering_basics`
- `shared_early_pest_signs_mild` + `lc_climate_vpd_basics`

Ergebnis:
- beide Events erfolgreich auf UI-Lab-Objekt gemappt
- je Event 3 Decisions vorhanden
- Gesamt-Diagnostics:
  - blocker: 0
  - error: 0
  - warning: 0
  - info: 22

Hinweis:
- Viele `info` stammen aus Textbudget-Hinweisen (bewusst nicht blockierend in dieser Phase).

## 7. Risiken vor echter Shadow-Bridge
- Finale Slot-Qualitaet fuer alle 12 Events muss als kompletter Matrixlauf nochmals geprueft werden.
- Locale-Resolver loest technisch auf, semantische Copy-Qualitaet bleibt ein manueller Abnahmepunkt.
- Learning-Panel-Policy (immer/optional) muss vor Runtime-Bridge final festgezurrt werden.

## 8. Runtime-Status
- Runtime weiterhin unangetastet
- keine Imports in bestehende Runtime
- keine bestehende Event-UI ersetzt
- keine Navigation geaendert

## 9. Empfehlung fuer Phase 26
**Phase 26: Full Mini-Catalog Adapter Matrix + Slot QA Baseline**
1. Alle 12 Events + 3 Learning-Cards durch den Adapter laufen lassen.
2. Slot-Vollstaendigkeit und Budgetverletzungen als Baseline reporten.
3. Fehlertoleranzen fuer Shadow-Bridge-Go/No-Go je Slotgruppe definieren.
4. Weiterhin isoliert ohne Runtime-Anbindung.
