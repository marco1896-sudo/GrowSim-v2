# 10 — Codex Stepwise Implementation Guide
*Grow Simulator V2 · Event System V2 · Master-Implementierungsdokument*
*Dieses Dokument ist die einzige Quelle der Wahrheit für die Implementierungsreihenfolge.*

---

## 1. Ziel der Implementierungsstrategie

Das Event System V2 ist kein Feature-Update — es ist eine fundamentale Neuarchitektur des spielerischen Kerns von Grow Simulator. Es betrifft Persistenz, Simulation, Engine, Coaching, Narration und UI gleichzeitig.

**Das Ziel dieser Strategie ist:**

> Event System V2 soll sich schrittweise, messbar und jederzeit umkehrbar neben dem bestehenden System aufbauen — bis es bereit ist, die Kontrolle zu übernehmen. Kein Big-Bang-Moment. Kein Leap of Faith. Kein „wir hoffen es funktioniert".

**Was diese Strategie garantiert:**
- Bestehende Spielstände werden nie unabsichtlich beschädigt
- Das Spiel bleibt zu jedem Zeitpunkt vollständig spielbar
- V2 kann jederzeit auf V1 zurückgefallen werden
- Jede Phase ist unabhängig testbar und abnahmeprüfbar
- Qualität entsteht durch Iteration, nicht durch Hoffnung

**Was diese Strategie NICHT ist:**
- Ein Zeitplan (Phasen haben keine festen Termine)
- Eine Erlaubnis für Shortcuts (Exit-Kriterien sind verbindlich)
- Ein Vorwand für technische Schulden (Shadow-Mode ist kein dauerhafter Zustand)

---

## 2. Warum kein Big-Bang-Rewrite

### Das Problem mit vollständigen Rewrites

Ein vollständiger Rewrite des Event-Systems würde bedeuten:

| Risiko | Konsequenz |
|--------|-----------|
| Bestehende Spielstände brechen | Alle aktiven Nutzer verlieren ihren Fortschritt |
| UI/UX ändert sich schlagartig | Verwirrung, Retention-Einbruch |
| Bugs die vorher nicht existierten | App-Store-Reviews zerstört |
| Balancing komplett neu kalibrieren | Monatelange Nacharbeit |
| Keine Messpunkte während Übergang | Blind fliegen |

### Das Strangler-Fig-Prinzip

V2 wächst um V1 herum, bis V1 nicht mehr nötig ist. Das bestehende System wird nicht ersetzt — es wird schrittweise verdrängt. Jede Komponente von V2 beweist sich zuerst im Schatten (Shadow-Mode), dann im Parallelbetrieb (Feature-Flag), dann als Default.

```
Zeitlinie:
[V1 allein] → [V2 beobachtet] → [V2 parallel] → [V2 als Default] → [V1 eingefroren]
     ↑              ↑                 ↑                  ↑                ↑
   Heute         Phase 3          Phase 12            Phase 14         Phase 15
```

---

## 3. Risiken des bestehenden Systems

Bevor V2 beginnt, müssen die Risiken des bestehenden V1-Systems dokumentiert sein. Diese dienen als Baseline für alle Vergleichstests.

### Bekannte Schwachstellen V1

| Bereich | Problem | Messbarer Impact |
|---------|---------|------------------|
| Event-Trigger | Keine echte Kausalität — Events sind zufällig | Lerneffekt gering |
| Keine Ketten | Einzelevents ohne Narrative | Kein emotionaler Bogen |
| Keine Tonalitätskontrolle | Gleichförmige Coach-Texte | Spieler ignoriert Coach |
| Kein Stage-Filtering | Events erscheinen zu falschen Zeitpunkten | Immersionsverlust |
| Keine Nachwirkungen | Events enden abrupt ohne Aftermath | Keine Wissensverfestigung |
| Keine Telemetrie | Kein Wissen über Spielerverhalten | Blindes Balancing |
| Hartkodierte Assets | Asset-Referenzen direkt im Code | Wartungsalbtraum |

### V1-Baseline messen (Phase 0)

Vor jeder Änderung muss der aktuelle Zustand gemessen werden:
```
Metriken zu erfassen:
- Durchschnittliche Event-Häufigkeit pro Spielstunde
- Häufigste Event-Abbrüche (Spieler ignoriert Event)
- Coach-Text-Interaktionsrate (wie oft wird weitergelesen)
- Session-Länge nach Event-Auftreten (Frustrations-Indikator)
- Häufigste Spielabbruch-Punkte
```

Diese Baseline-Werte sind die Vergleichsgröße für V2-Messungen in Phase 4+.

---

## 4. Warum Shadow-Mode entscheidend ist

### Definition Shadow-Mode

Shadow-Mode bedeutet: **V2-Engine läuft parallel zu V1, produziert Entscheidungen, die aber nicht sichtbar und nicht spielwirksam sind.**

```
V1 Engine  →  Spieler sieht V1-Ergebnis
     ↓
     ↓ (selbe Inputs)
     ↓
V2 Engine  →  Ergebnis wird nur geloggt, nicht angezeigt
```

### Warum das unersetzbar ist

| Ohne Shadow-Mode | Mit Shadow-Mode |
|-----------------|-----------------|
| Erster echter Test = Produktion | V2 hat 1000s von Runs bevor Spieler betroffen |
| Bugs treffen Spieler direkt | Bugs werden in Logs entdeckt |
| Balancing-Fehler sofort sichtbar | Balancing messbar bevor Rollout |
| Kein Vergleich möglich | Direkter V1-vs-V2-Vergleich pro Event |
| Rollback = Krisen-Response | Rollback = geplante Phase, keine Panik |

### Divergenz-Logging

Im Shadow-Mode wird bei jeder Entscheidung geloggt, ob V1 und V2 zu verschiedenen Ergebnissen kämen:

```json
{
  "timestamp": "2024-11-15T14:32:00Z",
  "gameState": { "stage": "S4", "health": 82, "setup": "indoor" },
  "v1Decision": { "eventId": null, "reason": "random_threshold_not_met" },
  "v2Decision": { "eventId": "W-I-01", "reason": "substrate_moisture_high_48h" },
  "diverged": true,
  "divergenceCategory": "v2_triggers_v1_misses"
}
```

Divergenz-Typen:
- **V2 triggers, V1 misses** → V2 ist responsiver (gut)
- **V1 triggers, V2 misses** → V2 hat möglicherweise zu hohe Schwelle
- **Both trigger, different event** → Kausalitäts-Unterschied
- **Both silent** → Übereinstimmung (kein Problem)

---

## 5. Vollständige Phasen-Übersicht

```
Phase  0: Fundament & Analyse          ← Keine Code-Änderung
Phase  1: Ordner + Contracts + Validator
Phase  2: Schema Loader + Parser
Phase  3: Shadow Event Engine           ← V2 läuft, aber unsichtbar
Phase  4: Telemetrie & Divergenz-Logging
Phase  5: Asset Layer + WebP Pipeline
Phase  6: Coach Layer Stub
Phase  7: Learning Layer Stub
Phase  8: Chain Engine Shadow Mode
Phase  9: Curator/Pacing Layer
Phase 10: Save/Persistence Erweiterung
Phase 11: Internal Soft-Cutover
Phase 12: UI Parallelisierung
Phase 13: Feature Flags & Rollback-System
Phase 14: Full Cutover Vorbereitung
Phase 15: Legacy Freeze
```

---

## PHASE 0: Fundament & Analyse

### Ziel
Den aktuellen Zustand des Systems vollständig verstehen und dokumentieren, bevor eine einzige Zeile geändert wird.

### Betroffene Dateien
```
LESEN (nicht ändern):
- src/systems/events/**/*
- src/data/events/**/*
- src/stores/**/*
- src/components/events/**/*
- package.json, tsconfig.json
```

### Erlaubte Änderungen
- **Keine.** Ausschließlich Lesen, Analysieren, Dokumentieren.

### Verbotene Änderungen
- Jede Änderung an bestehendem Code
- Neue Dateien außerhalb von `docs/`

### Erwartete Codex-Aufgaben
```
TASK 0A: Vollständiges Audit src/systems/events/ (Struktur + Interfaces)
TASK 0B: Vollständiges Audit src/data/events/ (aktuelles Schema dokumentieren)
TASK 0C: Vollständiges Audit Store-Layer (Welche Stores verwalten Event-State?)
TASK 0D: Vollständiges Audit UI-Components (Welche Komponenten rendern Events?)
TASK 0E: Dependency-Graph erstellen (Was hängt von was ab?)
TASK 0F: V1-Baseline-Metriken erheben (Telemetrie-Snapshot sofern möglich)
TASK 0G: Audit-Ergebnis als docs/event-system-v2/00_v1-audit.md schreiben
```

### Risiken
- Audit ist unvollständig → Überraschungen in späteren Phasen
- Falsche Annahmen über bestehende Struktur

### Notwendige Tests
- Kein Code → keine Tests; aber manuelle Verifikation des Audits durch zweite Person

### Exit-Kriterien
- [ ] `docs/event-system-v2/00_v1-audit.md` ist vollständig
- [ ] Alle V1-Event-Dateien sind inventarisiert
- [ ] Dependency-Graph ist vollständig und verifiziert
- [ ] V1-Baseline-Metriken dokumentiert
- [ ] Mindestens eine weitere Person hat Audit gelesen und bestätigt

### Rollback-Strategie
Keine nötig — es wurde nichts verändert.

---

## PHASE 1: Ordnerstruktur + Contracts + Catalog Validator

### Ziel
Die neue Datei- und Ordnerstruktur anlegen, TypeScript-Interfaces definieren und den Event-Catalog-Validator schreiben — **ohne** bestehenden Code zu berühren.

### Neue Dateien (vollständig neu, kein Überschreiben)
```
src/systems/events-v2/              ← Neues Verzeichnis, parallel zu events/
  contracts/
    EventV2.ts                      # Interface: EventV2, schemaVersion 3
    ChainV2.ts                      # Interface: EventChain
    BeatV2.ts                       # Interface: LearnBeat
    AssetRef.ts                     # Interface: AssetReference
    KnowledgeProfile.ts             # Interface: KnowledgeProfile
    index.ts                        # Re-exports

  validation/
    CatalogValidator.ts             # Validates event JSONs against contracts
    BotanicalConstants.ts           # Referenzwerte aus QR-02
    ToneBlocklist.ts                # Verbotene Phrasen aus QR-12
    ValidationResult.ts             # ValidationResult type

data/events-v2/                     ← Neues Verzeichnis, parallel zu data/events/
  catalog/                          # (leer — für Phase 2)
  chains/                           # (leer — für Phase 8)
  beats/                            # (leer — für Phase 7)

scripts/
  validate-catalog.ts               # CLI: npx ts-node scripts/validate-catalog.ts
```

### Erlaubte Änderungen
- Neue Dateien in `src/systems/events-v2/`
- Neue Dateien in `data/events-v2/`
- Neue Dateien in `scripts/`
- `package.json`: neue devDependency scripts (nicht Prod-Dependencies)

### Verbotene Änderungen
- Kein Anfassen von `src/systems/events/` (V1)
- Kein Anfassen von `data/events/` (V1)
- Keine Änderungen an bestehenden Stores
- Keine Änderungen an UI-Komponenten

### EventV2-Contract (Basis-Interface):
```typescript
// src/systems/events-v2/contracts/EventV2.ts
export interface EventV2 {
  eventId: string;                    // e.g. "W-I-01"
  schemaVersion: 3;                   // Literal type — muss 3 sein
  title: string;
  category: EventCategory;
  setup: "indoor" | "outdoor" | "both";
  stageRange: Stage[];
  severity: 1 | 2 | 3 | 4 | 5;
  eventType: EventType;
  cause: string;
  symptoms: string[];
  coachText: string;
  decisionOptions: DecisionOption[];
  solutionSteps: string[];
  aftermath: Aftermath;
  knowledgeProfileEffect: Partial<KnowledgeProfile>;
  assetRefs: AssetRef[];
  chainId?: string;                   // Optional: Zugehörigkeit zu Kette
  telemetry: TelemetryConfig;
  readabilityLevel: 1 | 2 | 3;
  tone: "crisis" | "observation" | "recovery" | "learning" | "near_miss";
}

export type EventCategory =
  | "CAT-1" | "CAT-2" | "CAT-3" | "CAT-4" | "CAT-5"
  | "CAT-6" | "CAT-7" | "CAT-8" | "CAT-9" | "CAT-10";

export type Stage = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7";

export type EventType = "crisis" | "observation" | "recovery" | "learning" | "near_miss";
```

### Risiken
- Interface-Entwurf ist unvollständig → Viele Breaking Changes in Phase 2
- Mitigation: Interface zuerst gegen 5–10 Beispiel-Events manuell testen

### Notwendige Tests
```typescript
// scripts/validate-catalog.ts — CLI-Aufruf
// Test: leere catalog/ → keine Fehler, korrekte Ausgabe
// Test: invalides JSON → korrekter Fehler mit Dateiname
// Test: valides JSON → "PASS"
```

### Exit-Kriterien
- [ ] `CatalogValidator.ts` compiliert ohne Fehler
- [ ] `validate-catalog.ts` läuft gegen leeres `catalog/` ohne Fehler
- [ ] Alle Interfaces in `contracts/index.ts` exportiert
- [ ] `tsconfig.json` kennt neuen Pfad (path alias `@events-v2`)
- [ ] Kein bestehender Test ist rot

### Rollback-Strategie
Neue Verzeichnisse löschen. V1 ist vollständig unberührt.


---

## PHASE 2: Schema Loader + Parser + Validation Layer

### Ziel
Einen vollständigen Schema-Loader bauen, der Event-JSONs aus `data/events-v2/catalog/` lädt, parst und gegen die V2-Contracts validiert. Erste echte Event-JSONs anlegen (5–10 Beispiele).

### Neue Dateien
```
src/systems/events-v2/
  loader/
    CatalogLoader.ts             # Lädt alle JSONs aus data/events-v2/catalog/
    EventParser.ts               # JSON → EventV2-Objekt
    ValidationLayer.ts           # Validiert geladene Events gegen Contracts

data/events-v2/catalog/
  w-i-01.json                    # Erster Event: Überwatering
  w-b-01.json                    # Near-Miss: Panik-Gießen
  n-b-01.json                    # Near-Miss: Seneszenz vs. Mangel
  k-i-01.json                    # VPD zu hoch
  p-b-02.json                    # Botrytis (Schwere 5)
  [5 weitere als Pilot-Set]
```

### Erlaubte Änderungen
- Neue Dateien wie oben
- `data/events-v2/catalog/` befüllen

### Verbotene Änderungen
- Kein Anfassen von V1-Code oder V1-Daten
- Kein Import aus `events-v2` in bestehenden Produktions-Code

### CatalogLoader-Architektur:
```typescript
// src/systems/events-v2/loader/CatalogLoader.ts
export class CatalogLoader {
  private catalog: Map<string, EventV2> = new Map();
  private validationErrors: ValidationError[] = [];

  async load(catalogPath: string): Promise<LoadResult> {
    const files = await glob(`${catalogPath}/**/*.json`);
    for (const file of files) {
      const raw = await readJson(file);
      const result = EventParser.parse(raw);
      if (result.success) {
        this.catalog.set(result.event.eventId, result.event);
      } else {
        this.validationErrors.push({ file, errors: result.errors });
      }
    }
    return {
      loaded: this.catalog.size,
      errors: this.validationErrors,
      catalog: this.catalog
    };
  }

  getEvent(id: string): EventV2 | undefined {
    return this.catalog.get(id);
  }
}
```

### Pilot-JSON-Format (w-i-01.json):
```json
{
  "eventId": "W-I-01",
  "schemaVersion": 3,
  "title": "Überwatering — Substrat dauerhaft nass",
  "category": "CAT-1",
  "setup": "indoor",
  "stageRange": ["S1", "S2", "S3", "S4"],
  "severity": 3,
  "eventType": "crisis",
  "cause": "Substrat zu häufig oder zu viel gegossen, Sauerstoffmangel an Wurzeln",
  "symptoms": [
    "Blätter hängen trotz nassem Substrat",
    "Substrat nach 3+ Tagen noch nass",
    "Leichtes Gelbwerden unterer Blätter"
  ],
  "coachText": "...",
  "decisionOptions": [...],
  "solutionSteps": [...],
  "aftermath": {...},
  "knowledgeProfileEffect": { "watering": 0.15, "observation": 0.05 },
  "assetRefs": ["water_substrate_wet", "plant_state_stressed_mild"],
  "telemetry": {
    "trackingId": "evt_w_i_01",
    "category": "watering",
    "expectedTriggerRate": 0.35,
    "targetSolveRate": 0.70
  },
  "readabilityLevel": 1,
  "tone": "crisis"
}
```

### Risiken
- JSON-Schema zu streng → viele valide Events schlagen fehl
- JSON-Schema zu locker → Fehler erst in Phase 3+ entdeckt
- Mitigation: 10 Pilot-Events manuell durchlaufen, Schema iterieren

### Notwendige Tests
```typescript
describe("CatalogLoader", () => {
  it("lädt 10 Pilot-Events ohne Fehler")
  it("wirft ValidationError bei fehlendem eventId")
  it("wirft ValidationError bei schemaVersion !== 3")
  it("wirft ValidationError bei ungültigem severity-Wert")
  it("gibt leere Map zurück bei leerem Verzeichnis")
  it("lädt korrekt wenn Validierungsfehler in einzelnem File")
})
```

### Exit-Kriterien
- [ ] 10 Pilot-Event-JSONs erstellt und valide
- [ ] `CatalogLoader` lädt alle 10 ohne Fehler
- [ ] Validator-Tests 100% grün
- [ ] `npx validate-catalog` gibt korrekten Report aus
- [ ] Kein V1-Code importiert aus V2

### Rollback-Strategie
`data/events-v2/catalog/` leeren. Loader-Dateien löschen. V1 unberührt.

---

## PHASE 3: Shadow Event Engine (ohne Spielwirkung)

### Ziel
Die V2-Engine entscheidet parallel zu V1, welche Events getriggert werden sollen — aber **ihre Entscheidungen haben keine Auswirkung auf den Spielzustand**. Alles landet nur im Log.

### Neue Dateien
```
src/systems/events-v2/
  engine/
    ShadowEventEngine.ts         # Haupt-Engine — liest GameState, produziert EventDecision
    TriggerEvaluator.ts          # Prüft Trigger-Bedingungen gegen GameState
    PressureCalculator.ts        # categoryPressure 45% + signalScore 40% + specificPressure 15%
    ShadowDecisionLog.ts         # Schreibt Entscheidungen ins Log (nie in GameState)

  types/
    GameStateSnapshot.ts         # Read-only Snapshot des aktuellen GameState (V1-kompatibel)
    EventDecision.ts             # Output der Engine (nie in Store geschrieben)
```

### Erlaubte Änderungen
- Neue Dateien wie oben
- **Ein einziger Hook in V1**: In der Haupt-Game-Loop einen passiven Observer registrieren, der `GameStateSnapshot` erstellt und an `ShadowEventEngine` übergibt. Dieser Hook:
  - Liest nur (kein Write)
  - Ist hinter `if (SHADOW_MODE_ENABLED)` gatet
  - Kann jederzeit mit `SHADOW_MODE_ENABLED = false` deaktiviert werden

### Verbotene Änderungen
- ShadowEventEngine darf **niemals** `store.dispatch()`, `store.set()` oder ähnliches aufrufen
- Kein Schreiben in GameState, Saves, oder UI-State
- Keine Änderung der Spiellogik, auch nicht zur Verbesserung

### Shadow-Engine-Architektur:
```typescript
// src/systems/events-v2/engine/ShadowEventEngine.ts
export class ShadowEventEngine {
  private catalog: Map<string, EventV2>;
  private log: ShadowDecisionLog;

  // Wird von V1-Game-Loop aufgerufen (passiver Observer)
  async evaluate(snapshot: GameStateSnapshot): Promise<void> {
    if (!SHADOW_MODE_ENABLED) return; // Feature-Flag — sofortiger Ausstieg

    const decision = this.makeDecision(snapshot);
    this.log.write({
      timestamp: Date.now(),
      gameState: snapshot,
      v2Decision: decision,
      // v1Decision wird von außen übergeben (was V1 gerade tut)
    });
  }

  private makeDecision(snapshot: GameStateSnapshot): EventDecision {
    const pressure = this.calculatePressure(snapshot);
    const candidates = this.getCandidateEvents(snapshot);
    const selected = this.selectEvent(candidates, pressure);
    return {
      eventId: selected?.eventId ?? null,
      reason: selected?.triggerReason ?? "no_trigger",
      pressure,
      confidence: selected?.confidence ?? 0
    };
  }
}
```

### Pressure-Formel:
```typescript
// PressureCalculator.ts
function calculateTotalPressure(snapshot: GameStateSnapshot): number {
  const categoryPressure = getCategoryPressure(snapshot) * 0.45;
  const signalScore = getSignalScore(snapshot) * 0.40;
  const specificPressure = getSpecificPressure(snapshot) * 0.15;
  return categoryPressure + signalScore + specificPressure;
}
```

### Risiken
- Der V1-Hook verursacht Performance-Probleme (Observer zu häufig aufgerufen)
- Mitigation: Observer nur jede 30 Sekunden aufrufen, nicht bei jedem Frame
- Shadow-Engine schreibt doch in Store (Programmierfehler)
- Mitigation: Store-Write in Tests mocken und auf "nie aufgerufen" prüfen

### Notwendige Tests
```typescript
describe("ShadowEventEngine", () => {
  it("ruft niemals store.dispatch auf — auch nicht indirekt")
  it("schreibt Entscheidung in Log wenn SHADOW_MODE_ENABLED=true")
  it("tut nichts wenn SHADOW_MODE_ENABLED=false")
  it("gibt null-Decision zurück wenn keine Events passen")
  it("respektiert stageRange beim Event-Matching")
  it("respektiert setup-Filter beim Event-Matching")
  it("crasht nicht bei ungültigem GameStateSnapshot")
})
```

### Exit-Kriterien
- [ ] Shadow-Engine läuft 24h auf Develop-Build ohne Crash
- [ ] Keine Store-Writes durch Shadow-Engine (automatisch verifiziert)
- [ ] Log enthält valide Einträge
- [ ] `SHADOW_MODE_ENABLED = false` deaktiviert Engine vollständig
- [ ] Performance-Impact < 2ms pro Evaluation-Aufruf
- [ ] Alle Tests grün

### Rollback-Strategie
`SHADOW_MODE_ENABLED = false` in Konfiguration. Hook in V1 kann inline deaktiviert werden. Keine Datenverluste möglich (Engine schreibt nie).

---

## PHASE 4: Telemetrie & Divergenz-Logging

### Ziel
Das Divergenz-Logging aus Phase 3 zu einem echten Telemetrie-System ausbauen. V1-Entscheidungen und V2-Entscheidungen werden verglichen und analysierbar gemacht.

### Neue Dateien
```
src/systems/events-v2/
  telemetry/
    DivergenceLogger.ts          # Vergleicht V1- und V2-Entscheidungen
    TelemetryBatch.ts            # Batched Telemetrie (nicht bei jedem Event HTTP-Call)
    TelemetryAnalyzer.ts         # Lokale Analyse: Divergenzraten, Kategorien
    TelemetryReport.ts           # Report-Format für Dashboard

  config/
    telemetry.config.ts          # Sampling-Rate, Batch-Größe, Endpoint
```

### Erlaubte Änderungen
- Neue Dateien wie oben
- `DivergenceLogger` erhält V1-Entscheidung aus dem V1-Hook (nur lesen, nie ändern)
- Optional: Analytics-Endpoint-Integration (wenn vorhanden)

### Verbotene Änderungen
- Telemetrie darf Spieler-PII nicht übertragen
- Telemetrie darf den Spielzustand nicht beeinflussen
- Keine Telemetrie in Produktion ohne explizite Freischaltung

### Divergenz-Kategorien:
```typescript
export type DivergenceCategory =
  | "both_silent"           // V1 und V2 triggern nichts — Einigkeit
  | "both_trigger_same"     // Beide triggern dasselbe Event
  | "both_trigger_different"// Beide triggern, aber verschiedene Events
  | "v2_only"               // V2 triggert, V1 nicht → V2 responsiver
  | "v1_only"               // V1 triggert, V2 nicht → V2 zu konservativ
  | "v2_earlier"            // V2 hätte früher getriggert
  | "v2_later";             // V2 hätte später getriggert
```

### Telemetrie-Dashboard-Metriken (Ziel-KPIs):
| Metrik | Ziel (V2 reif) | Alert-Schwelle |
|--------|---------------|----------------|
| `v2_only` Rate | 20–40% (V2 ist responsiver) | > 60% (zu aggressiv) |
| `v1_only` Rate | < 20% (V2 verpasst wenig) | > 35% (zu passiv) |
| `both_trigger_same` Rate | > 30% (Grundkonsistenz) | < 15% (zu verschieden) |
| V2 Decision-Zeit | < 5ms | > 20ms |
| Log-Fehler | 0% | > 0.1% |

### Risiken
- Telemetrie verursacht Privacy-Bedenken (DSGVO)
- Mitigation: Nur aggregierte Daten, keine User-IDs, Opt-Out dokumentiert
- Batch-Log zu groß → Speicherproblem auf Device
- Mitigation: Max 500 Einträge im Speicher, dann flush oder discard

### Notwendige Tests
```typescript
describe("DivergenceLogger", () => {
  it("kategorisiert korrekt wenn beide silent")
  it("kategorisiert korrekt wenn nur V2 triggert")
  it("erzeugt keine PII in Log-Einträgen")
  it("batched korrekt (max 100 pro Batch)")
  it("flushed bei App-Pause")
})
```

### Exit-Kriterien
- [ ] Divergenz-Log läuft stabil für 72h auf Testgerät
- [ ] Batch-System funktioniert (kein Memory-Leak)
- [ ] Divergenz-Kategorien korrekt klassifiziert (Accuracy > 99%)
- [ ] Report lesbar und von nicht-technischen Personen interpretierbar
- [ ] DSGVO-Compliance bestätigt (kein PII in Logs)

### Rollback-Strategie
`TELEMETRY_ENABLED = false`. Kein Spielzustand betroffen.


---

## PHASE 5: Asset Layer + WebP Pipeline + Lazy Loading

### Ziel
Das Asset-System aus `06_asset-groups.md` implementieren: Asset-Registry, Tier-basiertes Lazy-Loading, WebP-Konvertierungs-Pipeline — alles ohne Berührung der bestehenden Asset-Verwaltung.

### Neue Dateien
```
src/systems/events-v2/
  assets/
    AssetRegistry.ts             # ID → Pfad-Mapping für alle 160 Assets
    AssetLoader.ts               # Tier-1 preload, Tier-2/3 lazy
    AssetGroups.ts               # 20 Gruppen-Definitionen

data/events-v2/
  assets/
    asset-manifest.json          # Vollständige Asset-Liste mit Metadaten

scripts/
  convert-assets-webp.ts         # Batch-Konvertierung PNG → WebP
  generate-asset-manifest.ts     # Manifest aus Ordnerstruktur generieren

src/ui/events-v2/assets/
  DynamicAssetImage.tsx          # Komponente (noch nicht in Produktion eingebunden)
  AssetPreloader.tsx             # Preloader-Komponente (noch nicht in Produktion)
```

### Erlaubte Änderungen
- Neue Dateien wie oben
- Neue Asset-Dateien in `assets/events-v2/` (neuer Unterordner, kein Überschreiben)
- Build-Script-Erweiterung für WebP-Konvertierung

### Verbotene Änderungen
- Keine Änderung bestehender Asset-Referenzen in V1-Code
- Keine Änderung bestehender Bild-Dateien
- Keine Einbindung neuer Assets in bestehende UI-Komponenten

### Asset-Loading-Strategie:
```typescript
// AssetLoader.ts — Tier-1 beim App-Start, Tier-2 bei Event-Trigger
export class AssetLoader {
  async preloadTier1(): Promise<void> {
    // Läuft beim App-Start — max 4MB
    const tier1Assets = assetRegistry.getByTier(1);
    await Promise.all(tier1Assets.map(a => this.load(a)));
  }

  async loadForEvent(eventId: string): Promise<void> {
    // Läuft wenn Event getriggert wird — Tier-2 nachladen
    const event = catalogLoader.getEvent(eventId);
    const missing = event.assetRefs.filter(id => !this.isLoaded(id));
    await Promise.all(missing.map(id => this.load(id)));
  }

  private async load(assetId: string): Promise<void> {
    const entry = assetRegistry.get(assetId);
    if (!entry) {
      console.warn(`[AssetLoader] Unknown asset: ${assetId}`);
      return; // Graceful fallback — kein Crash
    }
    // WebP mit PNG-Fallback
    const src = this.supportsWebP() ? entry.pathWebP : entry.pathPng;
    await this.prefetch(src);
  }
}
```

### WebP-Pipeline:
```bash
# scripts/convert-assets-webp.ts
# Konvertiert alle PNG in assets/events-v2/ zu WebP
# Behält Original-PNGs als Fallback
# Ziel: > 40% Größenreduktion
```

### Performance-Ziele:
| Metrik | Ziel |
|--------|------|
| Tier-1 Preload Größe | < 4 MB |
| Tier-1 Preload Zeit (4G) | < 3 Sekunden |
| Einzelnes Event Asset-Load | < 200ms |
| WebP-Einsparung | > 40% vs. PNG |
| Cache-Hit-Rate nach 2 Sessions | > 90% |

### Risiken
- WebP nicht auf alten iOS-Geräten (< iOS 14)
- Mitigation: PNG-Fallback immer vorhanden, Feature-Detection im Loader
- Tier-1 zu groß → langsamer App-Start
- Mitigation: Bundle-Größen-Test als CI-Check

### Exit-Kriterien
- [ ] Asset-Manifest generiert und valide
- [ ] Tier-1 Preload < 4MB
- [ ] WebP-Fallback auf PNG funktioniert (Test auf iOS 13 Simulator)
- [ ] `DynamicAssetImage` rendert korrekt (Storybook oder isolierter Test)
- [ ] Keine Änderungen an bestehenden Assets verifiziert (Git-Diff clean)

### Rollback-Strategie
Neue Asset-Dateien löschen, neue Komponenten nicht einbinden (sind noch nicht in Produktion).

---

## PHASE 6: Coach Layer Stub

### Ziel
Den Coach-Layer als eigenständigen Service implementieren — er empfängt Event-Entscheidungen von der Shadow-Engine und formuliert Coach-Texte, aber zeigt sie noch nicht an.

### Neue Dateien
```
src/systems/events-v2/
  coach/
    CoachService.ts              # Haupt-Service: Event → CoachMessage
    TonalitySelector.ts          # Wählt Ton basierend auf EventType + Spielerhistorie
    CoachMessageBuilder.ts       # Baut formatierte Coach-Nachrichten
    CoachConfig.ts               # Konfigurations-Parameter

  types/
    CoachMessage.ts              # { text, tone, followUp, journalPrompt }
```

### Coach-Tonalitäts-Logik:
```typescript
// TonalitySelector.ts
export function selectTonality(
  event: EventV2,
  playerHistory: PlayerHistory,
  kp: KnowledgeProfile
): CoachTonality {
  // Basis-Tonalität aus Event-Typ
  const base = EVENT_TYPE_TO_TONE[event.tone];

  // Modifikation basierend auf Spielererfahrung
  if (kp[event.category] > 0.7 && base === "crisis") {
    return "crisis_experienced"; // Weniger erklärend, mehr direktiv
  }
  if (isRepeatEvent(event.eventId, playerHistory)) {
    return "gentle_reminder"; // Spieler hat das schon erlebt
  }
  return base;
}
```

### Erlaubte Änderungen
- Neue Dateien wie oben
- Coach-Texte aus Event-JSONs nutzen (kein eigener Text-Store nötig)

### Verbotene Änderungen
- CoachService darf nicht in bestehende UI-Komponenten eingebunden werden
- Kein Anzeigen von V2-Coach-Texten in der aktuellen UI

### Exit-Kriterien
- [ ] CoachService produziert valide `CoachMessage` für alle 10 Pilot-Events
- [ ] Tonalitäts-Selektion korrekt für alle 5 Event-Typen
- [ ] Repeat-Event-Erkennung funktioniert
- [ ] Tests: 100% Coverage auf `TonalitySelector`

---

## PHASE 7: Learning Layer Stub

### Ziel
Den Learning-Layer implementieren: KnowledgeProfile-Updates, Beat-Trigger-Prüfung und Journal-Eintrags-Generierung — alles im Stub-Modus (keine Anzeige, keine echten Saves).

### Neue Dateien
```
src/systems/events-v2/
  learning/
    KnowledgeProfileService.ts   # Verwaltet KP-Updates
    LearnBeatCurator.ts          # Prüft Beat-Trigger-Bedingungen
    LearnBeatStore.ts            # In-Memory Store für Beat-Zustand (Phase 10: persistiert)
    JournalGenerator.ts          # Generiert Journal-Einträge aus Templates
    learnBeats.catalog.ts        # 27 Beat-Definitionen

data/events-v2/beats/
  sb-01.json … sb-27.json        # Beat-JSONs (aus 04_learning-story-beats.md)
```

### KnowledgeProfile-Update-Logik:
```typescript
// KnowledgeProfileService.ts
export class KnowledgeProfileService {
  // Immer additiv (kein Subtrahieren), immer clamped 0.0–1.0
  applyEventEffect(
    current: KnowledgeProfile,
    effect: Partial<KnowledgeProfile>,
    quality: "optimal" | "correct" | "suboptimal" | "wrong"
  ): KnowledgeProfile {
    const multiplier = QUALITY_MULTIPLIER[quality]; // 1.0 / 0.7 / 0.3 / 0.1
    return Object.entries(effect).reduce((kp, [key, delta]) => ({
      ...kp,
      [key]: Math.min(1.0, (kp[key] ?? 0) + (delta * multiplier))
    }), current);
  }
}
```

### Erlaubte Änderungen
- Neue Dateien wie oben
- Beat-JSONs anlegen

### Verbotene Änderungen
- KP-Updates dürfen nicht in echten Saves landen (Phase 10)
- Beats dürfen nicht angezeigt werden (Phase 12)
- Keine Änderung am bestehenden Progressions-System

### Exit-Kriterien
- [ ] KP-Update korrekt für alle Quality-Stufen
- [ ] Beat-Trigger-Prüfung korrekt für 5 unterschiedliche Beat-Typen
- [ ] Journal-Template-Generierung für alle 27 Beats
- [ ] `LearnBeatStore` korrekt (gesehen/ungesehen/locked)

---

## PHASE 8: Chain Engine Shadow Mode

### Ziel
Die Event-Chain-Engine implementieren: Alle 10 Ketten (EC-01–EC-10) werden im Shadow-Mode simuliert — Akt-Übergänge werden berechnet und geloggt, aber nicht im Spiel ausgelöst.

### Neue Dateien
```
src/systems/events-v2/
  chains/
    ChainEngine.ts               # Haupt-Chain-Orchestrator
    ChainStore.ts                # Chain-Zustand (In-Memory, Shadow-Mode)
    BreakPointEvaluator.ts       # Prüft ob Spieler Break-Point genutzt hat
    chainCatalog.ts              # 10 Chain-Definitionen

data/events-v2/chains/
  ec-01.json … ec-10.json        # Chain-JSONs (aus 05_event-chains.md)
```

### Chain-Engine-Architektur:
```typescript
// ChainEngine.ts — Shadow Mode
export class ChainEngine {
  evaluate(snapshot: GameStateSnapshot): ChainDecision | null {
    if (!CHAIN_SHADOW_ENABLED) return null;

    const activeChain = chainStore.getActive(snapshot.setup);
    if (activeChain) {
      return this.evaluateExistingChain(activeChain, snapshot);
    }
    return this.checkNewChainTrigger(snapshot);
  }

  private evaluateExistingChain(chain: ChainState, snap: GameStateSnapshot): ChainDecision {
    const currentAct = chain.acts[chain.currentActIndex];
    const breakPointUsed = BreakPointEvaluator.check(currentAct, snap);

    if (breakPointUsed) {
      return { action: "chain_resolve", chainId: chain.chainId, reason: "break_point" };
    }
    if (snap.hoursSinceLastAction > currentAct.escalationTriggerHours) {
      return { action: "chain_advance", chainId: chain.chainId, nextActIndex: chain.currentActIndex + 1 };
    }
    return { action: "chain_continue", chainId: chain.chainId };
  }
}
```

### Exit-Kriterien
- [ ] Alle 10 Ketten-JSONs valide
- [ ] Chain-Engine korrekt für alle 3 Chain-Actions (resolve/advance/continue)
- [ ] Break-Point-Erkennung für EC-01 korrekt (Unit-Test)
- [ ] Maximal 1 aktive Kette pro Setup (Constraint verifiziert)
- [ ] Shadow-Mode: kein Einfluss auf Spielzustand

---

## PHASE 9: Curator/Pacing Layer

### Ziel
Den Story Curator implementieren — er steuert das globale Pacing: welche Events wann erscheinen dürfen, Cooldowns zwischen Events, Beat-Timing, Tonalitätswechsel.

### Neue Dateien
```
src/systems/events-v2/
  curator/
    StoryCurator.ts              # Haupt-Pacing-Controller
    CooldownManager.ts           # Event-Cooldowns, Schwere-4/5 Governor
    TonalitySequencer.ts         # Verhindert identische Tonalitäten hintereinander
    PacingConfig.ts              # Konfigurations-Parameter für Pacing
```

### Pacing-Regeln (aus QR-04):
```typescript
// CooldownManager.ts
const PACING_RULES = {
  afterSeverity4or5: { cooldownHours: 72 },
  maxEventsPerDay: 3,
  minTimeBetweenEvents: { hours: 4 },
  maxConsecutiveSameTone: 2,
  beatCooldownAfterCrisis: { hours: 24 }, // Kein Beat direkt nach Schwere 5
};
```

### Curator-Entscheidungs-Flow:
```
GameStateSnapshot
     ↓
CooldownManager.canTrigger()    ← Nein? Abbruch
     ↓
ChainEngine.evaluate()          ← Ketten haben Priorität
     ↓
ShadowEventEngine.evaluate()    ← Einzelevents wenn keine Kette aktiv
     ↓
TonalitySequencer.filter()      ← Gleiche Tonalität 3× hintereinander? Filter
     ↓
LearnBeatCurator.check()        ← Beat passt zum ruhigen Moment? Trigger Beat
     ↓
CoachService.prepare()          ← Coach-Text vorbereiten
     ↓
[Decision geloggt — nicht angewendet]
```

### Exit-Kriterien
- [ ] Cooldown-Regeln verifiziert (Schwere-4/5 triggert nie öfter als 1× in 72h in Shadow-Simulation)
- [ ] Tonalitätswechsel korrekt (niemals 3× gleiche Tonalität in Folge)
- [ ] Beat-Timing korrekt (kein Beat während aktiver Krise)
- [ ] 1000-Run-Simulation zeigt Pacing im Ziel-Bereich (QR-04)


---

## PHASE 10: Save/Persistence Erweiterung

### Ziel
Das Save-System um V2-State-Felder erweitern — ohne bestehende Saves zu brechen. Vorwärts- UND Rückwärts-Kompatibilität sind zwingend.

### Neue Felder im Save-Format
```typescript
// Neue optionale Felder — bestehende Saves ohne diese Felder bleiben valide
interface SaveGameV2Extension {
  eventSystemV2?: {
    schemaVersion: number;        // Aktuelle Version des V2-Save-Blocks
    knowledgeProfile?: KnowledgeProfile;
    seenBeats?: string[];          // Beat-IDs die bereits gesehen wurden
    activeChain?: ChainSaveState;
    completedChains?: string[];
    lastEventTimestamp?: number;
    pressureGovernor?: PressureGovernorState;
  }
}
```

### Save-Migrations-Strategie:
```typescript
// SaveMigrator.ts
export class SaveMigrator {
  migrate(rawSave: unknown): SaveGame {
    const version = (rawSave as any)?.version ?? 1;

    if (version < 2) {
      rawSave = this.migrateV1toV2(rawSave);
    }
    // eventSystemV2 Block ist optional — wenn nicht vorhanden, Default-Werte
    if (!(rawSave as any).eventSystemV2) {
      (rawSave as any).eventSystemV2 = this.createDefaultV2Block();
    }
    return rawSave as SaveGame;
  }

  private createDefaultV2Block(): SaveGameV2Extension["eventSystemV2"] {
    return {
      schemaVersion: 1,
      knowledgeProfile: DEFAULT_KNOWLEDGE_PROFILE,
      seenBeats: [],
      completedChains: [],
    };
  }
}
```

### Kritische Invarianten (niemals brechen):
```
INVARIANTE 1: Ein Save ohne eventSystemV2-Block muss immer ladbar sein
INVARIANTE 2: V2-State kann resettet werden ohne V1-Spielfortschritt zu verlieren
INVARIANTE 3: Ein V2-Save muss auf einer V1-Codebasis ladbar sein (V2-Block wird ignoriert)
INVARIANTE 4: Kein V2-Feld darf required in der Save-Spec sein
```

### Backup-Strategie (vor jeder Migration):
```typescript
// Vor Save-Schreiben mit V2-Feldern immer:
await saveBackup.createSnapshot(currentSave, "pre_v2_migration");
// Backup aufbewahren für 30 Tage
```

### Exit-Kriterien
- [ ] Alter V1-Save lädt ohne Fehler (automatisierter Test mit 3 Fixture-Saves)
- [ ] V2-Block wird korrekt hinzugefügt wenn fehlend
- [ ] V2-Block kann vollständig resettet werden ohne V1-Verlust
- [ ] Backup wird vor jeder Migration erstellt
- [ ] Save-Round-Trip: Laden → Ändern → Speichern → Laden → identisch

### Rollback-Strategie
- Backup-Restore auf Pre-V2-Save
- `eventSystemV2`-Block wird von V1 ignoriert (kein Breaking Change)

---

## PHASE 11: Internal Soft-Cutover

### Ziel
V2-Engine übernimmt intern die Event-Entscheidungen für ein **abgeschlossenes internes Testteam** (nicht öffentlich). V1-Engine läuft weiterhin als Fallback. Spieler merken noch nichts.

### Was sich ändert
- V2-Engine-Entscheidungen gelten jetzt für interne Tester (Feature-Flag per User-ID)
- V1 bleibt für alle anderen Spieler vollständig aktiv
- Telemetrie vergleicht echtes V2-Spielerverhalten mit V1-Baseline

### Feature-Flag-System:
```typescript
// FeatureFlags.ts
export const FEATURE_FLAGS = {
  EVENT_ENGINE_V2: {
    enabled: false,           // Default: aus
    rolloutUserIds: [],       // Interne Tester
    rolloutPercent: 0,        // Prozent des Traffics (Phase 13: erhöhen)
  }
};

// In Game-Loop:
const engine = FeatureFlags.isEnabled("EVENT_ENGINE_V2", userId)
  ? eventEngineV2
  : eventEngineV1;
```

### Qualitätsschwellen vor Soft-Cutover:
| Metrik | Mindest-Wert |
|--------|-------------|
| V2 Divergenz-Analyse: ≥100h Shadow-Daten | ✓ |
| V2 Solve-Rate interner Tester | ≥ 60% |
| V2 Event-Trigger-Häufigkeit | Im QR-04 Bereich |
| Kein Crash in 72h | ✓ |
| Rollback in < 5 Minuten möglich | ✓ |

### Exit-Kriterien
- [ ] 5+ interne Tester haben > 10 Spielstunden auf V2
- [ ] Solve-Rate > 60%
- [ ] Kein Schwere-5-Event hat V2 gecrasht
- [ ] Rollback erfolgreich getestet (V2 → V1 mitten in Session)

---

## PHASE 12: UI Parallelisierung

### Ziel
Neue V2-UI-Komponenten für Events, Beats und CompetenceMap entwickeln und intern testen — parallel zur bestehenden V1-UI.

### Neue Dateien
```
src/ui/events-v2/
  EventCard.tsx                  # Event-Darstellung mit 5-Typ-Kodierung
  DecisionPanel.tsx              # Entscheidungs-Buttons (Multi-Choice)
  CoachBubble.tsx                # Coach-Text mit Tonalitäts-Theming
  AftermathScreen.tsx            # Nachwirkungs-Anzeige
  StoryBeatOverlay.tsx           # Beat-Overlay (A/B/C Tonalität)
  CompetenceMap.tsx              # Spinnennetz-Diagramm KnowledgeProfile
  JournalEntry.tsx               # Journal-Eintrag-Karte
  AchievementToast.tsx           # Achievement-Notification
  EventChainProgress.tsx         # Kettenfortschritt-Anzeige
```

### UI-Parallelisierungs-Prinzip:
- Neue Komponenten werden in **Storybook** oder isolierten Pages entwickelt
- Kein Einbinden in aktive Spielrouten ohne Feature-Flag
- A/B-Test-fähig: V1-UI vs. V2-UI per Flag schaltbar

### Mobile-First-Anforderungen:
```
Mindest-Breakpoints: 375px (iPhone SE) und 390px (iPhone 14)
Touch-Targets: min. 44×44px (Apple HIG)
Swipe-Gesten für Event-Navigation
Keine Hover-Dependent UI (Mobile hat kein Hover)
Tap-to-Reveal für komplexe Diagnose-Karten
```

### Exit-Kriterien
- [ ] Alle 9 Komponenten in Storybook dargestellt
- [ ] WCAG 2.1 AA Kontrast erfüllt
- [ ] Touch-Target-Test auf iPhone SE bestanden
- [ ] Kein Layout-Overflow auf 375px Viewport

---

## PHASE 13: Feature Flags & Rollback-System

### Ziel
Ein vollständiges Feature-Flag- und Rollback-System implementieren, das schrittweises Ausrollen an echte Nutzer ermöglicht.

### Feature-Flag-Architektur:
```typescript
// Stufen-weises Rollout
export class FeatureFlagService {
  isEnabled(flag: string, context: UserContext): boolean {
    const config = FLAGS[flag];
    if (!config.enabled) return false;
    if (config.rolloutUserIds.includes(context.userId)) return true;
    if (config.rolloutPercent > 0) {
      return this.hashUser(context.userId) < config.rolloutPercent;
    }
    return false;
  }
}

// Rollout-Stufen:
// 0% → interne Tests (Phase 11)
// 5% → Early Adopters (Phase 13 Start)
// 20% → Breiter Test
// 50% → Mehrheit
// 100% → Full Cutover (Phase 14)
```

### Rollback-Protokoll:
```
ROLLBACK TRIGGER: Wenn eine der folgenden Metriken überschritten:
  - Crash-Rate > 0.5% in V2-Gruppe
  - Solve-Rate < 40% in V2-Gruppe
  - Session-Abbrüche > 15% mehr als V1-Gruppe
  - App-Store-Bewertung fällt in 48h um > 0.2

ROLLBACK-SCHRITTE:
  1. FeatureFlags.set("EVENT_ENGINE_V2", { rolloutPercent: 0 }) ← < 1 Minute
  2. Monitoring 24h auf V1-Stabilität
  3. Post-Mortem: Was hat Rollback ausgelöst?
  4. Fix in V2, neue Soft-Cutover-Phase
```

### Exit-Kriterien
- [ ] Rollback in < 5 Minuten durchführbar (getestet)
- [ ] Rollback-Trigger sind im Monitoring-Dashboard definiert
- [ ] 5%-Rollout stabil für 72h
- [ ] Keine Sign-up-Verluste durch V2-Einführung

---

## PHASE 14: Full Cutover Vorbereitung

### Ziel
V2 auf 100% der Nutzer ausrollen. V1-Engine auf passiv setzen (noch vorhanden, nicht mehr genutzt).

### Checkliste vor Full Cutover:
```
TECHNISCH:
  [ ] V2 stabil auf > 50% der Nutzer für ≥ 7 Tage
  [ ] Solve-Rate ≥ 65%
  [ ] Kein ungelöster Severity-Critical-Bug
  [ ] Save-Migration verifiziert auf 100 Fixture-Saves
  [ ] Asset-Loading < 3s auf 3G-Verbindung

QUALITATIV:
  [ ] App-Store-Rating stabil oder verbessert
  [ ] Support-Tickets zu Events nicht gestiegen
  [ ] Coach-Interaktionsrate ≥ 20% (Spieler liest Coach)
  [ ] Session-Länge gleich oder gestiegen

SICHERHEIT:
  [ ] Rollback-System weiterhin aktiv (V1 noch nicht entfernt)
  [ ] V2 auf V1 zurückschaltbar innerhalb 5 Minuten
  [ ] Alle Saves vor Cutover gesichert (Full Backup)
```

### Full-Cutover-Ablauf:
```
Tag 1 (Vorbereitung):
  - Full-Backup aller Saves
  - Monitoring-Alert-Schwellen schärfen

Tag 2 (Cutover):
  - FeatureFlags: rolloutPercent = 100
  - Monitoring: stündliche Checks für 24h
  - Team on-call

Tag 3–7 (Stabilisierung):
  - Tägliche Telemetrie-Review
  - Support-Ticket-Monitoring

Nach 7 Tagen stabil: → Phase 15
```

---

## PHASE 15: Legacy Freeze

### Ziel
V1-Event-Engine einfrieren: Code bleibt vorhanden, wird aber nicht mehr aktiv genutzt. Keine neuen Features, keine Bugfixes in V1.

### Legacy-Freeze-Maßnahmen:
```typescript
// src/systems/events/index.ts (V1 — nach Freeze)
/**
 * @deprecated Seit Event System V2 (Phase 15).
 * Dieser Code wird nicht mehr aktiv verwendet.
 * Nicht für neue Features nutzen.
 * Wird in v3.0 entfernt.
 */
export * from "./legacy/EventEngineV1";
```

### Was NICHT passiert in Phase 15:
- V1-Code wird **nicht gelöscht** (brauchen es für Rollback-Notfall)
- V1-Tests werden **nicht gelöscht** (dienen als Regression-Baseline)
- V1-Daten werden **nicht migriert** (bleiben parallel)

### Was in Phase 15 passiert:
- V1-Verzeichnis erhält `@deprecated`-Marker
- CI-Warnung wenn V1 importiert wird (außer aus V2-Kompatibilitäts-Layer)
- Dokumentation: V1 wird in Haupt-Version x+1 entfernt

### Exit-Kriterien Phase 15:
- [ ] V2 stabil für ≥ 30 Tage auf 100%
- [ ] V1 mit `@deprecated` markiert
- [ ] Entfernungs-Datum für V1 in Roadmap eingetragen
- [ ] Kein aktiver Code-Pfad in V2 importiert direkt aus V1


---

## 6. Teststrategie

### Test-Pyramide für Event System V2

```
         [E2E Tests]               ← Wenige, langsam, teuer — nur kritische Flows
        /     5%      \
       /                \
      [Integration Tests]          ← Engine + Store + UI zusammen
     /       25%         \
    /                      \
   [Unit Tests]                    ← Einzelne Klassen, Funktionen, Transformer
  /           70%            \
```

### Unit-Test-Prioritäten (höchste Priorität zuerst):
1. `CatalogLoader` — Fehler hier brechen alles
2. `EventParser` + Validation — Datenintegrität
3. `PressureCalculator` — Balancing-Grundlage
4. `KnowledgeProfileService` — Permanenter Spieler-Fortschritt
5. `SaveMigrator` — Save-Schutz
6. `BreakPointEvaluator` — Chain-Logik
7. `TonalitySelector` — Coach-Qualität

### Integration-Test-Szenarien:
```typescript
// Kritische End-to-End-Szenarien
describe("Event System V2 Integration", () => {
  it("Kompletter Grow-Zyklus: S0 bis S7 ohne Crash")
  it("EC-01 Kette: Akt 1 → Akt 4 korrekt eskaliert wenn ignoriert")
  it("EC-01 Kette: Akt 1 Break-Point korrekt beendet Kette")
  it("SB-27 Mastery-Beat: triggert wenn alle KP >= 0.60")
  it("Schwere-5-Event: 72h Cooldown danach eingehalten")
  it("V1-Save migriert korrekt zu V2-kompatiblem Format")
  it("Feature-Flag OFF: exakt V1-Verhalten, kein V2-Einfluss")
  it("Rollback: V2 auf V1 schalten ohne Spielzustandsverlust")
})
```

### Automatisierte Regressions-Tests (bei jedem PR):
```bash
npx validate-catalog        # QR-01 bis QR-12
npx simulate-pressure       # QR-04 Pacing-Simulation
npx test:unit               # Unit-Test-Suite
npx test:integration        # Integration-Szenarien
npx bundle-size-check       # Asset-Tier-1 < 4MB
```

---

## 7. Performance-Strategie

### Mobile-Performance-Ziele:
| Metrik | Ziel | Messung |
|--------|------|---------|
| Shadow-Engine Evaluation | < 5ms | Chrome DevTools |
| Katalog-Load beim Start | < 200ms | Lighthouse |
| Event-Card-Render | < 16ms (60fps) | React Profiler |
| Beat-Overlay-Animation | 60fps | Frame rate monitor |
| Save-Write mit V2-Block | < 50ms | Performance.now() |
| Memory-Usage V2 (gesamt) | < 30MB zusätzlich | Chrome Memory |

### Optimierungs-Taktiken:
```typescript
// 1. Katalog-Lazy-Loading: Nur Phase-relevante Events laden
const stageEvents = catalog.getByStage(currentStage);

// 2. Memoization für Pressure-Berechnung
const pressure = useMemo(
  () => pressureCalculator.calculate(gameState),
  [gameState.stage, gameState.health, gameState.daysSinceLastEvent]
);

// 3. Event-Deduplizierung in Shadow-Engine
if (this.lastEvaluatedHash === stateHash) return; // Skip if state unchanged

// 4. Beat-Overlay: Render nur wenn Overlay aktiv (conditional mount)
{activeBeat && <StoryBeatOverlay beat={activeBeat} />}
```

---

## 8. Mobile- und PWA-Risiken

### Kritische Mobile-Risiken:

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|-----------|
| App pausiert während Event | Hoch | Mittel | Event-State persistent zwischen Sessions |
| Schlechte Verbindung → Asset-Load fehlt | Mittel | Hoch | Graceful Fallback (Placeholder statt Crash) |
| iOS Safari: WebP nicht unterstützt | Niedrig (iOS 14+) | Mittel | PNG-Fallback immer verfügbar |
| Shadow-Engine im Background-Tab | Niedrig | Mittel | Visibility-API: Engine pausiert bei Hidden |
| Save-Write während App-Kill | Mittel | Sehr hoch | Autosave vor App-Pause + Write-Confirm |
| Speicher-Limit auf Low-End-Geräten | Mittel | Hoch | Tier-1 < 4MB, Tier-2 on-demand |

### PWA-Spezifische Risiken:
```typescript
// App-Pause-Handler: Event-State sichern
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    shadowEngine.pause();
    saveManager.emergencySave();
    telemetryBatch.flush();
  }
});
```

---

## 9. Savegame-Schutz

### Die 5 Savegame-Gebote:

**Gebot 1: Niemals Daten löschen**
Alte Felder im Save werden nicht gelöscht — sie werden deprecated markiert.

**Gebot 2: Immer Backup vor Migration**
Jede Save-Format-Änderung erzeugt automatisch ein Backup der alten Version.

**Gebot 3: Rückwärts-Kompatibilität ist heilig**
Ein V2-Save muss auf einer V1-Codebasis ladbar sein (V2-Block wird ignoriert).

**Gebot 4: Atomare Writes**
Save-Schreiben ist entweder vollständig oder nicht vorhanden — kein halb-geschriebenes Save.

**Gebot 5: Testbarer Migrations-Pfad**
Mindestens 5 Fixture-Saves (V1) werden bei jedem CI-Run durch Migration geführt.

### Save-Versionierungs-Schema:
```
Save Version 1: Aktueller Stand (V1-Engine)
Save Version 2: + eventSystemV2 optionaler Block
Save Version 3: + knowledgeProfile im Hauptblock (wenn V2 als Default)
```

### Fixture-Save-Anforderungen:
```
fixture_save_01.json: Frischer Save, S0, kein Fortschritt
fixture_save_02.json: Mitte Veg, S2, 5 Events gelöst
fixture_save_03.json: Blüte, S5, Chain aktiv
fixture_save_04.json: Kurz vor Harvest, S6
fixture_save_05.json: Zweiter Grow, alle KP > 0.5
```

---

## 10. Telemetrie-Strategie

### Telemetrie-Prinzipien:
1. **Opt-Out verfügbar** — Spieler kann Telemetrie deaktivieren
2. **Kein PII** — Keine User-IDs, E-Mails, oder identifizierbare Daten
3. **Aggregiert** — Nur anonyme Spielmuster, keine Einzel-Sessions
4. **Minimalinvasiv** — Kein Einfluss auf Spielperformance

### Phasen-Telemetrie-Übersicht:
| Phase | Telemetrie-Inhalt | Zweck |
|-------|------------------|-------|
| Phase 3–4 | Shadow-Divergenz-Log | V1 vs. V2 Vergleich |
| Phase 11 | Solve-Rates interner Tester | Balancing |
| Phase 13 | A/B-Test V1 vs. V2 Cohorts | Release-Entscheidung |
| Phase 14+ | Ongoing Game-Health | Dauerbetrieb |

### Telemetrie-Events-Katalog:
```typescript
// Vollständige Liste aller getrakten Events
export const TELEMETRY_EVENTS = {
  // Engine
  "engine.event_triggered": { eventId: string, setup: string, stage: string },
  "engine.event_resolved": { eventId: string, quality: string, timeToResolveSeconds: number },
  "engine.chain_advanced": { chainId: string, actNumber: number },
  "engine.chain_broken": { chainId: string, actNumber: number },

  // Coach
  "coach.message_shown": { eventId: string, tone: string },
  "coach.hint_used": { eventId: string, hintNumber: number },

  // Beats
  "beat.triggered": { beatId: string, tone: string },
  "beat.dismissed_fast": { beatId: string, secondsShown: number }, // < 3s → nicht gelesen

  // Performance
  "perf.engine_evaluation_ms": { ms: number },
  "perf.asset_load_ms": { assetId: string, ms: number, tier: number },
} as const;
```

---

## 11. Asset-Migrationsstrategie

### Bestehende Assets schützen:
- Kein Umbenennen oder Löschen bestehender Asset-Dateien
- Neue V2-Assets in `assets/events-v2/` — separater Ordner
- Build-Pipeline V2-Assets werden addiert, nicht ersetzt

### Schritt-für-Schritt Asset-Migration:
```
Phase 5:  Tier-1-Assets produzieren + WebP-Konvertierung
Phase 6:  Coach-Avatar-Assets (AG-16)
Phase 7:  Beat-Overlay-Assets (AG-16)
Phase 12: Alle UI-Assets für neue Komponenten
Phase 14: Finale Asset-Bereinigung (Duplikate prüfen)
```

### Asset-Deduplizierungs-Check:
```bash
# Prüft ob neue Assets bereits als V1-Assets existieren (verhindern doppelter Produktion)
npx ts-node scripts/check-asset-duplicates.ts
```

---

## 12. i18n-Strategie

### Grundprinzip: Neue Keys, keine Überschreibungen

Alle V2-Texte bekommen eigene i18n-Keys in neuen Namespaces — bestehende Keys werden nicht überschrieben.

### Namespace-Struktur:
```
locales/
  de/
    events-v2.json             # Alle V2-Event-Texte
    beats-v2.json              # Alle Beat-Texte
    coach-v2.json              # Alle Coach-Nachrichten
    achievements-v2.json       # Alle Achievement-Titel
  en/
    [identisch]
```

### i18n-Key-Konvention:
```json
// events-v2.json
{
  "events": {
    "w-i-01": {
      "title": "Überwatering — Substrat dauerhaft nass",
      "coachText": "...",
      "solutionSteps": ["...", "..."],
      "aftermath.lesson": "..."
    }
  }
}
```

### i18n-Qualitäts-Gate:
- Alle V2-Events müssen DE- und EN-Keys haben vor Phase 11
- Automatischer Check: `npx validate-i18n --namespace events-v2`
- Missing-Key-Fallback: immer EN, nie leerer String

---

## 13. Qualitäts-Gates vor jeder Phase

Vor jeder Phase-Transition muss das folgende Gate erfolgreich sein:

```
GATE ALPHA (vor Phase 1–4):
  ✓ Phase-0-Audit vollständig
  ✓ V1-Baseline dokumentiert
  ✓ Kein offener Critical-Bug in V1

GATE BETA (vor Phase 5–9):
  ✓ Alle Tests Phase 1–4 grün
  ✓ Shadow-Engine 72h stabil
  ✓ Telemetrie-Daten plausibel
  ✓ Kein Store-Write durch Shadow-Engine verifiziert

GATE GAMMA (vor Phase 10–12):
  ✓ 10 Pilot-Events vollständig valide
  ✓ KP-Update korrekt für alle Quality-Stufen
  ✓ Asset Tier-1 < 4MB
  ✓ Save-Migration: 5 Fixtures OK

GATE DELTA (vor Phase 13–14):
  ✓ Interne Tester: > 10h Spielzeit
  ✓ Solve-Rate > 60%
  ✓ Rollback in < 5 Minuten getestet
  ✓ i18n DE + EN vollständig

GATE EPSILON (vor Phase 15):
  ✓ V2 auf 100% stabil für 30 Tage
  ✓ App-Store-Rating nicht gefallen
  ✓ Support-Tickets nicht gestiegen
  ✓ Session-Länge gleich oder gestiegen
```

---

## 14. Do-Not-Break-Liste

Diese Dinge dürfen unter **keinen Umständen** beschädigt werden:

```
SPIELZUSTAND:
  ✗ Bestehende Spielstände (Saves) verlieren Fortschritt
  ✗ Aktuell laufende Events werden abgebrochen
  ✗ Pflanzenleben durch technischen Fehler verloren
  ✗ KP wird negativ (Lernfortschritt rückgängig)

PERFORMANCE:
  ✗ App-Startzeit steigt um > 1 Sekunde
  ✗ Event-Frame-Rate fällt unter 55fps
  ✗ Memory-Usage steigt um > 50MB

TECHNISCH:
  ✗ V1-Tests werden rot durch V2-Änderungen
  ✗ TypeScript-Compilation schlägt fehl
  ✗ Bestehende i18n-Keys überschrieben oder gelöscht
  ✗ Bestehende Asset-Referenzen broken

SPIELERLEBNIS:
  ✗ Spieler sieht V2-Debug-Output in Produktion
  ✗ Spieler sieht Feature-Flag-Informationen
  ✗ Inkonsistentes Verhalten zwischen V1 und V2 ohne Erklärung
  ✗ Unverständliche Coach-Texte durch Regressionsfehler

BUSINESS:
  ✗ App-Store-Rating fällt durch V2-Release
  ✗ Crash-Rate steigt um > 0.2%
  ✗ DAU sinkt um > 5% in Rollout-Woche
```

---

## 15. Codex-Auftrag #010 — Master-Implementierung

**Scope:** Gesamtes Event System V2, alle 15 Phasen

**Einstiegspunkt:** Phase 0 (Audit) — kein Code schreiben vor Audit-Abschluss.

**Strenge Reihenfolge:** Phasen sind sequenziell. Phase N+1 startet nicht ohne bestandene Exit-Kriterien von Phase N.

**Verantwortlichkeiten Codex:**
```
Phase 0:  Audit durchführen, docs/event-system-v2/00_v1-audit.md schreiben
Phase 1:  Contracts + Validator schreiben (kein Produktions-Code ändern)
Phase 2:  Loader + Parser + 10 Pilot-JSONs
Phase 3:  Shadow-Engine (read-only Hook in V1 — explizit markieren)
Phase 4:  Telemetrie-System
Phase 5:  Asset-Registry + WebP-Pipeline
Phase 6:  Coach-Service
Phase 7:  Learning-Layer + Beat-JSONs
Phase 8:  Chain-Engine + Chain-JSONs
Phase 9:  Curator/Pacing-Layer
Phase 10: Save-Erweiterung (Backward-Compat-Test pflicht)
Phase 11: Feature-Flag + interner Rollout
Phase 12: Neue UI-Komponenten (isoliert)
Phase 13: Stufenweiser Rollout (5% → 20% → 50%)
Phase 14: Full Cutover (nach Gate-Epsilon)
Phase 15: V1 deprecaten
```

**Code-Qualitäts-Standards:**
```
- TypeScript strict mode aktiv (keine any-Casts ohne Kommentar)
- Keine direkten Store-Writes aus Event-Engine (immer durch Actions)
- Alle public Methoden: JSDoc mit Beispiel
- Komplexität: McCabe ≤ 10 pro Funktion
- Test-Coverage: ≥ 80% für Engine-Layer, ≥ 60% für UI
- Bundle-Size-Impact pro Phase dokumentieren
```

**Kommunikation:**
- Nach jeder Phase: Kurzer Status-Report mit Exit-Kriterien-Checkliste
- Bei unerwarteten Blocking-Issues: Sofort melden, nicht umgehen
- Wenn Exit-Kriterien nicht erfüllt: Phase wiederholen, nicht überspringen

**Dateien die Codex niemals anfassen darf (ohne explizite Freigabe):**
```
data/events/             ← V1-Event-Daten
src/systems/events/      ← V1-Engine
src/stores/              ← Bestehende Stores
locales/                 ← Bestehende Übersetzungen (nur addieren, nicht ändern)
saves/                   ← Spieler-Saves (niemals direkt editieren)
```

**Erstes Ziel:**
> Starte mit `TASK 0A`: Führe ein vollständiges Audit von `src/systems/events/` durch und dokumentiere die Ergebnisse in `docs/event-system-v2/00_v1-audit.md`.

---

*Datei: `docs/event-system-v2/10_codex-stepwise-implementation.md`*
*Stand: Vollständig — 15 Phasen + 10 Strategieabschnitte*
*Dieses Dokument ist die einzige Quelle der Wahrheit für die Implementierungsreihenfolge.*
*Letzte Aktualisierung: 2026-05-08*
