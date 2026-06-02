# 27 — Codex Phase 16 Architecture Checkpoint

## 1. Zusammenfassung des aktuellen V2-Unterbaus
Der V2-Unterbau ist als isolierte, read-only Schicht unter `src/events/v2/` breit aufgebaut: Contracts, Catalog-Loader/Parser/Index, Validation-Pipeline (Schema/Integrity/CrossRef/Quality), deterministisches Shadow-Scoring, Snapshot/Delta/Gate-Reporting, Governance- und Approval-Audit. Es gibt weiterhin keine Runtime-Anbindung, keine State-Mutationen und keine Event-Aktivierung im Spiel.

## 2. Welche Bereiche inzwischen stabil wirken
- Pfad- und Modulstruktur unter `src/events/v2/` ist konsistent und skalierbar.
- Catalog-Ladepfade, Parsing und Typklassifikation sind vorhanden.
- Diagnostics (Severity + Scope + RuleFamily) sind strukturiert.
- Reporting-Kette (Validation Report, Health Score, Delta, Matrix, Drift) ist reproduzierbar.
- Governance/Approval/Audit ist für den aktuellen Vorbereitungsstand ausreichend formalisiert.

## 3. Welche Bereiche noch Stub-/Vorbereitungscharakter haben
- Fachliche Tiefe vieler Validierungsregeln ist bewusst nur Teilmenge (kein vollwertiger JSON-Schema-Interpreter).
- Deterministisches Scoring ist transparent, aber weiterhin eher kalibrierter Stub statt finaler botanischer Priorisierungslogik.
- Full-Catalog-Mode ist vorbereitet, aber ohne produktiv befüllte echte V2-Katalogdaten.
- Chain-Verhalten ist konzeptionell abgedeckt, aber praktisch noch nicht an realen Datensätzen validiert.

## 4. Welche Risiken vor echten Katalogdaten bestehen
- Erhöhtes Diagnostic-Noise-Risiko bei erster echter Datenbefüllung.
- i18n-Key-Abweichungen (flat/nested Mischformen) können zu vielen Fehlmeldungen führen.
- Asset-Referenzen und Tag-Konsistenz sind in echten Daten meist die ersten Bruchstellen.
- Cross-References (Event?Learning?Chain) können ohne diszipliniertes ID-Schema schnell inkonsistent werden.
- Zu großer Erstumfang würde Debug/Qualität streuen und die Governance unnötig belasten.

## 5. Welche Validatoren/Reports für echte Katalogdaten relevant sind
Primär relevant vor und während Phase 17:
- `ValidationPipeline` (schema/integrity/crossRef/quality)
- `JsonSchemaDeepValidator`, `SchemaShapeValidator`, `SchemaRegistry`
- `StageModeCategoryValidator`
- `I18nKeyValidator` + `LocaleIntegrityValidator` + `LocaleKeyResolver`
- `AssetRefValidator` + `AssetIntegrityValidator` + `AssetTypeRules`
- `CrossReferenceValidator`
- `QualityRuleValidator`
- `CatalogIntegrityReport`, `CatalogValidationReport`, `HealthScoreReport`
- optional für Vergleichsläufe: `DeltaReport`, `DriftReport`, `QaMatrixReport`

## 6. Welche Governance-/QA-Schichten jetzt ausreichend sind
Für den Einstieg in einen kleinen echten Mini-Katalog sind ausreichend:
- Gate-Presets + ReleaseBlockerPolicy
- ReadinessChecklist
- QaDecision + TrafficLight-Logik
- Scenario Assertions + Drift Analysis
- ExpectedChangeReviewGate + ApprovalTrace/GovernanceAudit

Damit kann ein kontrollierter „klein anfangen, hart prüfen“-Prozess gefahren werden.

## 7. Welche Governance-Themen bewusst später verschoben werden sollten
Sinnvoll auf später verschieben:
- Multi-Stage Approval Timelines (zeitliche Freigabe-Ketten)
- komplexe, organisationsweite Sign-off-Orchestrierung
- automatisierte Persistenz/Historisierung auf Disk als Prozesspflicht

Begründung: Erst echte Mini-Katalog-Daten validieren, dann Governance-Prozess verschärfen.

## 8. Empfehlung für die erste echte Mini-Katalog-Struktur
Empfohlene Struktur (neu, klein, klar):
- `data/events/catalog/events/indoor/*.event.json`
- `data/events/catalog/events/outdoor/*.event.json`
- `data/events/catalog/events/shared/*.event.json`
- `data/events/catalog/learning-cards/*.learning-card.json`
- optional: `data/events/catalog/chains/*.chain.json` (max. 1 einfache Chain)

Prinzip:
- klare ID-Namenskonvention pro Setup/Kategorie
- alle Dateien schemaVersion-konsistent
- zuerst nur Kernfälle mit hoher Alltagsrelevanz

## 9. Empfehlung für die ersten 10–12 echten V2-Events
Vorschlag (12 Events):
- Indoor (6):
  - Überwatering (Symptom + Ursache)
  - Unterwässerung/Trockener Rootball
  - pH außerhalb Zielbereich (Erde)
  - Nährstoffüberschuss (leichte Tox)
  - Hitzestress indoor (Luft/Temperatur)
  - Luftfeuchte/VPD-Missmatch im Veg
- Outdoor (3):
  - Starkregen/Staunässe-Risiko
  - Hitzewelle/Trockenwind-Stress
  - Kälte-Nachtstress (frühe/übergangsnahe Stage)
- Shared (3):
  - Lichtdistanz-Fehler (zu nah/zu stark)
  - Frühe Schädlingsanzeichen (mild)
  - Rootbound-Warnsignal vor schwerer Eskalation

## 10. Warum diese Events als Start-Set sinnvoll sind
- hohe Anfängerrelevanz
- klare Ursache?Symptom?Entscheidung
- geringe narrative Komplexität
- gute Verteilbarkeit über Stage/Setup
- ideal, um Validatoren, i18n, Assets und CrossRefs unter realen Daten zu testen

## 11. Welche Indoor-/Outdoor-/Shared-Verteilung das Start-Set haben sollte
Empfohlen und passend zum Vorschlag:
- 6 Indoor
- 3 Outdoor
- 3 Shared

Begründung: Indoor deckt den häufigsten Einsteigerpfad ab, Outdoor und Shared sichern frühe Breite ohne Overhead.

## 12. Welche Learning-Cards dazu nötig wären
Mindestens 3 Learning-Cards:
- LC-01: Gießen richtig lesen (Topfgewicht, Timing, Sauerstoff)
- LC-02: Klima-Grundlagen (Temp/RLF/VPD praxisnah)
- LC-03: pH & Nährstoffaufnahme (Ursache statt Symptom-Doktern)

Optional später ergänzen: LC zu Lichtmanagement und Schädlings-Früherkennung.

## 13. Welche Chains im Start-Set noch vermieden werden sollten
Noch vermeiden:
- mehraktige Eskalationsketten mit 3–5 Akten
- saisonale Outdoor-Ketten
- Meister-Ketten mit mehreren Systemkopplungen

Optionaler Kandidat (einfach):
- 1 kurze 2-Akt-Mini-Chain „Overwatering early warning ? manifestes Overwatering“
  - nur wenn CrossRef/IDs/i18n/Assets im Kernset bereits stabil laufen.

## 14. Welche Asset-Tags für das Start-Set nötig wären
Minimal benötigte Tag-Gruppen:
- Symptom-Blätter (`symptom_leaf_*`)
- Plant-State (`plant_state_*`)
- Root-State (`root_*`)
- Klima/Umfeld-Indikatoren (`climate_*` o. ä.)
- einfache Alert/Coach-Visual-Hinweise

Für Phase 17 reicht: konsistente Referenzierbarkeit und erlaubte Formate; keine neue Asset-Produktion erzwingen.

## 15. Welche i18n-Key-Struktur vorbereitet werden müsste
Empfohlene Struktur:
- `events.v2.<eventId>.title`
- `events.v2.<eventId>.coach.summary`
- `events.v2.<eventId>.coach.why`
- `events.v2.<eventId>.coach.actions.<n>`
- `events.v2.<eventId>.aftermath.lesson`
- `events.v2.learning.<cardId>.*`

Wichtig: einheitliches Key-Schema pro Eventtyp, damit Resolver (flat+nested) sauber validieren kann.

## 16. Welche Quality-Gates vor Mini-Katalog-Erstellung erfüllt sein müssen
Mindest-Gates vor/bei Phase 17:
- keine `blocker` in required-Regeln
- keine invaliden Asset-Formate
- keine fehlenden Pflichtfelder (`id`, category, stage etc.)
- keine required-CrossRef-Fehler
- i18n required keys pro Eintrag vorhanden (mind. Basissprache konsistent)
- nachvollziehbarer Health-Score über vereinbarter Schwelle (für Development-Startset pragmatisch)

## 17. Konkreter Vorschlag für Phase 17
Phase 17 sollte als „First Real Mini-Catalog (Data-Only)“ geschnitten werden:
1. Neue echte V2-Katalogdateien in kleinem Umfang anlegen (12 Events + 3 Learning-Cards, optional 1 Mini-Chain).
2. Einheitliche IDs, Stages, Categories, Modes und Asset/i18n-Refs gemäß bestehender V2-Validatoren verwenden.
3. Mit bestehender ValidationPipeline + Reports + QaDecision prüfen.
4. Erst bei stabilem Gate-Ergebnis den Umfang schrittweise erweitern.

---

## Klare Antworten

### Ist der V2-Unterbau bereit für echte Mini-Katalogdaten?
Ja, für einen kleinen, streng kontrollierten Einstieg ist der Unterbau bereit. Empfehlung: bewusst kleiner Scope, harte Gates, iterative Nachschärfung.

### Welche Dateien sollen in Phase 17 erstellt werden?
Empfohlene neue Dateien (nur Katalogdaten/Planung, keine Runtime):
- `data/events/catalog/events/indoor/` (6 neue `*.event.json`)
- `data/events/catalog/events/outdoor/` (3 neue `*.event.json`)
- `data/events/catalog/events/shared/` (3 neue `*.event.json`)
- `data/events/catalog/learning-cards/` (3 neue `*.learning-card.json`)
- optional: `data/events/catalog/chains/mini-overwatering.chain.json`
- `docs/event-system-v2/28_codex-phase-17-mini-catalog.md` (Umsetzungs-/Validierungsprotokoll)

Optional zur Planung vor Datenerstellung:
- `data/events/catalog/_planning/phase-17-mini-catalog-plan.md`

### Welche Dateien sollen in Phase 17 ausdrücklich NICHT angefasst werden?
- `app.js`
- bestehende `src/events/*.js`
- `data/events.json`
- `data/events.v2.json`
- `data/events.foundation.json`
- Locales (schreibend)
- UI-Dateien
- `package.json`
- Save-/Migration-/Feature-Flag-Dateien

### Sollte UI-Lab jetzt schon starten oder erst nach dem ersten validierten Mini-Katalog?
Erst nach dem ersten validierten Mini-Katalog starten. Zuerst Datenqualität und Regelstabilität sichern, dann UI-Lab auf belastbare Eventdaten aufsetzen.
