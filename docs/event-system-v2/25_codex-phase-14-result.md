# Codex Phase 14 Result - Baseline Evolution Rules + Scenario Versioning

## 1. Welche Dateien neu angelegt wurden

- `src/events/v2/reporting/ScenarioVersion.js`
- `src/events/v2/reporting/ScenarioVersionRegistry.js`
- `src/events/v2/reporting/AssertionVersion.js`
- `src/events/v2/reporting/AssertionVersionRegistry.js`
- `src/events/v2/reporting/BaselineEvolutionRule.js`
- `src/events/v2/reporting/BaselineEvolutionPolicy.js`
- `src/events/v2/reporting/ExpectedChange.js`
- `src/events/v2/reporting/ExpectedChangeReviewGate.js`
- `src/events/v2/reporting/QaChangeLog.js`
- `src/events/v2/reporting/QaChangeLogReport.js`
- `docs/event-system-v2/25_codex-phase-14-result.md`

Optionale Versioning-Metadaten:

- `data/events/catalog/_scenarios/versioning.README.md`
- `data/events/catalog/_scenarios/scenario-set.v1.json`
- `data/events/catalog/_scenarios/assertion-set.v1.json`
- `data/events/catalog/_scenarios/expected-changes.v1.json`

## 2. Welche V2-Dateien erweitert wurden

- `src/events/v2/reporting/ScenarioPack.js`
- `src/events/v2/reporting/ScenarioPackRegistry.js`
- `src/events/v2/reporting/ScenarioAssertion.js`
- `src/events/v2/reporting/ScenarioAssertionRegistry.js`
- `src/events/v2/reporting/MatrixRunComparison.js`
- `src/events/v2/reporting/DriftAnalysis.js`
- `src/events/v2/reporting/DriftReport.js`
- `src/events/v2/reporting/QaMatrixReport.js`
- `src/events/v2/reporting/TrafficLightReport.js`

## 3. Welche bestehenden Runtime-Dateien unverändert geblieben sind

Unverändert geblieben:

- `app.js`
- bestehende Dateien unter `src/events/*.js`
- `data/events.json`
- `data/events.v2.json`
- `data/events.foundation.json`
- Locales
- UI
- Save-/Persistence
- Feature-Flags
- `package.json`

## 4. Wie ScenarioVersion funktioniert

`ScenarioVersion` beschreibt versionierte Scenario-Sets mit:

- `version`
- `scenarioSetId`
- `createdAt`
- `reason`
- `scenarios`
- `compatibilityNotes`

`ScenarioVersionRegistry` liefert aktuell `v1` als read-only Registry-Eintrag.

## 5. Wie AssertionVersion funktioniert

`AssertionVersion` beschreibt versionierte Assertion-Sets analog zu ScenarioVersion.
`AssertionVersionRegistry` liefert aktuell `v1` als read-only Registry-Eintrag.

## 6. Wie BaselineEvolutionPolicy funktioniert

`BaselineEvolutionPolicy` bündelt formale Regeln:

- erwartete und begründete Änderungen sind grundsätzlich zulässig
- neue Blocker/Errors sind reviewpflichtig
- Ampel-Regressionen (z. B. grün->gelb, gelb->rot) sind reviewpflichtig
- Verbesserungen (rot->gelb, gelb->grün) sind zulässig

Ausgabe:

- `allow`
- `requiresReview`
- `reject`

## 7. Wie ExpectedChange und ReviewGate funktionieren

`ExpectedChange` modelliert erwartete Decision-/Ampel-Übergänge inkl. `approved`.
`ExpectedChangeReviewGate` prüft beobachtete Änderungen gegen erwartete Änderungen:

- erwartet + approved => `allow`
- erwartet, aber nicht approved => `requiresReview`
- nicht erwartet => `requiresReview`

## 8. Wie QaChangeLog funktioniert

`QaChangeLog` sammelt QA-Änderungsentscheidungen rein in-memory als Datenobjekte.
`QaChangeLogReport` liefert strukturierte Daten + Markdown.

## 9. Welche Versioning-Dateien angelegt wurden und warum sie nicht produktiv sind

Unter `_scenarios` wurden nur QA-Versioning-Metadaten angelegt (`scenario-set.v1`, `assertion-set.v1`, `expected-changes.v1`).
`versioning.README.md` markiert klar: **not loaded by runtime**.

## 10. Welche Checks weiterhin bewusst begrenzt sind

- keine Runtime-Anbindung
- keine Eventaktivierung
- keine State-Mutationen
- keine automatische Persistenz von QA-Runs
- keine CLI/package.json-Integration

## 11. Warum weiterhin keine Runtime-Anbindung besteht

Alle Änderungen bleiben isoliert unter `src/events/v2/` und `data/events/catalog/_scenarios/` (nur QA-Metadaten). Keine Imports in bestehende Runtime.

## 12. Empfehlung für Phase 15

Phase 15: **Governance Profiles + Approval Traceability**

- formale Rollenprofile für QA-Änderungsfreigaben
- nachvollziehbare Approval-Trace-Objekte pro erwarteter Änderung
- konsolidierter Audit-Report über Baseline/Assertion/ExpectedChange-Versionen
