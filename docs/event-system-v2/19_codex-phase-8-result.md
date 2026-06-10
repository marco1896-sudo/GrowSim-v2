# Codex Phase 8 Result - Validation Pipeline + Noise Filter + Delta Reporting

## 1. Neue Dateien

- `src/events/v2/validation/ValidationPipeline.js`
- `src/events/v2/validation/ValidationStage.js`
- `src/events/v2/validation/NoiseFilter.js`
- `src/events/v2/validation/RuleFamily.js`
- `src/events/v2/validation/RuleFamilyWeights.js`
- `src/events/v2/reporting/ReportSnapshot.js`
- `src/events/v2/reporting/DeltaReport.js`
- `src/events/v2/reporting/DeltaReportFormatter.js`

## 2. Erweiterte V2-Dateien

- `src/events/v2/validation/ValidationDiagnostic.js`
- `src/events/v2/validation/SchemaDiagnostic.js`
- `src/events/v2/validation/CatalogIntegrityReport.js`
- `src/events/v2/validation/validateCatalogExamples.js`
- `src/events/v2/validation/index.js`
- `src/events/v2/reporting/CatalogValidationReport.js`
- `src/events/v2/reporting/HealthScore.js`
- `src/events/v2/reporting/HealthScoreReport.js`
- `src/events/v2/reporting/TopIssueGrouper.js`
- `src/events/v2/reporting/ShadowScoringReport.js`

## 3. Unveränderte bestehende Runtime-Dateien

Unverändert geblieben in diesem Schritt:

- `app.js`
- bestehende Dateien unter `src/events/*.js`
- `data/events.json`
- `data/events.v2.json`
- `data/events.foundation.json`
- Locales
- UI-Dateien
- Save-/Persistence-Dateien
- Feature-Flag-Dateien
- `package.json`

## 4. ValidationPipeline + Stages

`ValidationPipeline` kapselt vier Stages als read-only Ablauf:

- `schema`
- `integrity`
- `crossRef`
- `quality`

Jede Stage liefert eigene Diagnostics. Es werden keine Dateien verändert.

## 5. NoiseFilter

`NoiseFilter` kann Diagnostics konfigurierbar filtern nach:

- `minimumSeverity`
- `ruleScope`
- `ruleFamily`
- `entryKind`

Damit kann die Report-Ausgabe gezielt auf relevante Findings reduziert werden.

## 6. RuleFamily + RuleFamilyWeights

`RuleFamily` führt die Familien ein:

- `schema`
- `i18n`
- `asset`
- `crossReference`
- `quality`
- `scoring`
- `future`

`RuleFamilyWeights` stellt kalibrierbare Gewichte pro Familie bereit.

## 7. Health-Score-Kalibrierung

`HealthScore` unterstützt jetzt zwei Modi:

- klassisch über Severity-Counts
- kalibriert über konkrete Diagnostics + `RuleFamilyWeights`

Der Score bleibt deterministisch und read-only.

## 8. ReportSnapshot + DeltaReport

`ReportSnapshot` beschreibt einen Reportzustand als reines Datenobjekt.

`DeltaReport` vergleicht zwei Snapshots und liefert:

- neue Issues
- behobene Issues
- verschärfte Issues
- entschärfte Issues
- Score-Differenz

`DeltaReportFormatter` kann die Delta-Daten als strukturierte Daten oder Markdown ausgeben.

## 9. Bewusst begrenzte Checks

Weiterhin bewusst begrenzt:

- keine Runtime-Integration
- keine Event-Aktivierung
- keine Game-State-Mutationen
- Cross-Reference weiterhin nur auf geladene Catalog-Examples/CatalogIndex
- keine CLI-Anbindung

## 10. Warum weiterhin keine Runtime-Anbindung

Alle Module liegen isoliert unter `src/events/v2/` und werden nirgends in bestehende Runtime importiert. Dadurch bleibt das produktive Verhalten unverändert.

## 11. Empfehlung für Phase 9

Empfohlen: **Phase 9 als vollständiger Catalog-Modus mit Snapshot-Historie und stabilen Baseline-Vergleichen** vorbereiten, inklusive klarer Policy, wann ein Delta als Release-Blocker gilt.
