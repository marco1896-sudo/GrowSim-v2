# 02 — Data Model: Event System V2

**Status:** Konzept-Entwurf, keine Codeänderung, keine bestehenden Eventdaten verändert.
**Zweck:** Codex-fertiges Datenmodell für die V2-Event-Engine. Definiert Schemas, Katalogstruktur, Beispiele und Migrationsweg.
**Datum:** 2026-05-06
**Vorgänger:** `00_current-system-audit.md`, `01_premium-vision.md`
**Nachfolger (geplant):** `03_architecture.md`, `04_event-catalog.md`

> Begriffsklärung: „Event System V2" ist der **Featurename** des Premium-Umbaus. Das JSON-Schema selbst springt von `schemaVersion: 2` (Stand `data/events.v2.json`) auf **`schemaVersion: 3`** — diese Version trägt die neuen Premium-Felder. Sobald in diesem Dokument von „v3" die Rede ist, ist immer das Schema gemeint, nicht das Feature.

---

## 1. Ziel des neuen Datenmodells

Ein **lehrbares, kuratiertes, deterministisch reproduzierbares** Event-Datenmodell, das

1. **Premium-Inhalt** trägt (Ursache, Symptom, Diagnose, Lösung, Nachwirkung als Erststufenfelder),
2. **App-Store-tauglich** ist (Pflicht-i18n, Asset-Verlässlichkeit, Barrierefreiheit, Telemetry-Hooks),
3. **Codex-fertig** ist (jedes Feld hat klare Semantik, validierbare Schemas, eindeutige IDs, klare Defaults),
4. **abwärtskompatibel migrierbar** ist (keine Save-Brüche, klare Mapping-Regeln aus v1/v2),
5. **anfängerfreundlich** zu autoren ist (kleine Dateien pro Event, Beispiele neben dem Schema, lesbare Feldnamen),
6. **erweiterbar** bleibt (Tag-System, Plugin-artige Subschemas für Sondertypen).

Das Modell ist datengetrieben — neue Events erfordern keinen Engine-Code, sondern nur eine validierte JSON-Datei.

### 1.1 Designaxiome

- **Ein Event = eine Datei.** Keine 2 000-Zeilen-Mega-Json mehr.
- **Pflichttexte tragen Keys, optionale Erklärungen tragen Inline-Strings.** Pflichttexte (Titel, Symptom, Optionen, Diagnoseergebnis) sind **immer i18n-Keys**; lange optionale Erläuterungen können während der Authoring-Phase als Inline-DE erlaubt sein, müssen aber vor Release einen Key bekommen.
- **Trennung von Daten und Mechanik.** Kein JavaScript-Schnipsel im Datenmodell. Logik kommt ausschließlich aus benannten **Engine-Hooks**.
- **Strenge IDs, lockere Inhalte.** IDs sind kebab-case und unique; freie Texte sind unbegrenzt aber müssen einer Stilrichtlinie folgen (siehe Abschnitt 9).
- **Ein Schema, mehrere Subjektarten.** Events, Story-Beats, Learning-Beats und Reward-Beats teilen ein Basisschema und unterscheiden sich nur über das Feld `type`.

---

## 2. Begriffsabgrenzung

Klare Sprachregelung, damit Audit, Doku, Code und Content dieselben Wörter benutzen.

| Begriff | Was es ist | Was es **nicht** ist |
|---|---|---|
| **Event** | Eine in-game spielbare Begegnung mit Phasen (Symptom → Entscheidung → Wirkung → Nachwirkung). Eine Datei = ein Event. | Kein Trigger im Code. Kein Modal-Layout. |
| **Story-Beat** | Sondertyp eines Events (`type: "story_beat"`), vom Curator garantiert eingebracht. Trägt narratives Gewicht (z. B. „Erste Trichome"). | Kein Crisis-Event. Kein eigener Datentyp jenseits Event. |
| **Learning Card** | Mikro-Lektion ohne Spielmechanik. Eigenes Schema (`learning-card.schema.json`). Wird **getrennt** von Events gespeichert, aber von Events **referenziert**. | Kein Event. Keine Optionen, keine Effects. |
| **Chain** | Geordnete Sequenz von Event-Schritten mit Übergangsregeln. Eigene Schema-Datei (`chain.schema.json`). | Kein Event. Keine eigenen Optionen. Verweist auf bestehende Events per ID. |
| **Escalation** | Zustand **eines** Events, der über Zeit voranschreitet (`latent → warning → escalating → critical`). Im Event-Schema als `escalationProfile`. | Kein eigener Datentyp. Lebt im Event. |
| **Aftermath** | Vom Outcome erzeugte **Nachwirkung**, die in den Plant-State, in Folge-Events und in die Run-Chronik schreibt. Im Event-Schema als `aftermathProfile`. | Kein Event. Kein UI-Bildschirm. Eine Datenmutation + Folge-Hooks. |

Hilfreiche Eselsbrücke:

- **Event** = der Lebensaugenblick.
- **Chain** = die Geschichte über mehrere Augenblicke.
- **Story-Beat** = ein gepushter Augenblick.
- **Learning Card** = das stille Hintergrundwissen.
- **Escalation** = wie schlimm es **gerade jetzt** wird.
- **Aftermath** = was **danach** noch nachhallt.

---

## 3. Neue Katalogstruktur unter `data/events/catalog/`

Anfängerfreundlich, eine Datei pro Sache, klar getrennte Schemas und Beispiele.

```
data/
  events/
    catalog/
      _schema/
        event.schema.json
        chain.schema.json
        learning-card.schema.json
        player-profile.schema.json        ← in 02.x weiter beschrieben
        run-state.schema.json             ← Story-Budget, Storyboards
        common-defs.schema.json           ← geteilte Sub-Schemas (Effect, Trigger, …)
        README.md
      _examples/
        water_dry_pot.event.json
        late_flower_humidity_chain.chain.json
        learning_water_basics.learning-card.json
        README.md
      water/
        v3_water_dry_pot.event.json
        v3_water_overwater_warning.event.json
        ...
      nutrition/
        v3_nutrient_lockout_n.event.json
        ...
      environment/
        v3_env_heat_wave.event.json
        ...
      pest/
        v3_pest_fungus_gnats.event.json
        ...
      disease/
        v3_disease_botrytis_risk.event.json
        ...
      positive/
        v3_positive_ideal_window.event.json
        ...
      special/
        v3_special_outdoor_storm_front.event.json
        ...
      story_beats/
        v3_story_first_trichomes.event.json
        ...
      learning_cards/
        lc_water_basics.learning-card.json
        lc_humidity_vpd.learning-card.json
        ...
      chains/
        chain_late_flower_humidity.chain.json
        chain_first_pest_outbreak.chain.json
        ...
    legacy/
      events.json                          ← bestehende v1-Datei, wird **nicht** verschoben, nur referenziert
      events.v2.json                       ← bestehende v2-Datei, wird **nicht** verschoben, nur referenziert
```

> Wichtig: Die existierenden Dateien `data/events.json` und `data/events.v2.json` bleiben unangetastet, bis die Migration in einer eigenen Phase aktiviert wird.

### 3.1 Datei-Naming

- Event-Datei: `<eventId>.event.json` mit `eventId` in `kebab_or_snake_case` (snake bevorzugt für IDs, bleibt konsistent zur bisherigen v2-Naming).
- Chain-Datei: `<chainId>.chain.json`.
- Learning-Card-Datei: `<learningCardId>.learning-card.json`.
- Schema-Datei: `<schemaName>.schema.json`.

### 3.2 Lade-Reihenfolge (geplant für `03_architecture.md`)

1. Schemas laden und cachen.
2. Common-Defs validieren.
3. Lernkarten-Index aufbauen (für Referenz-Auflösung).
4. Events pro Kategorieordner laden, gegen Schema validieren, in Index aufnehmen.
5. Chains laden, gegen Schema validieren, alle referenzierten Event-IDs gegenprüfen.
6. Migrations-Schicht mappt v1/v2 nach v3 und merged sie in den Index (bis Vollabschaltung der Legacy-Daten).

---

## 4. JSON-Schema-Konzept Event v3

### 4.1 Top-Level eines Event-Dokuments

```jsonc
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://growsimulator/schemas/event.schema.json",
  "schemaVersion": 3,

  "id": "v3_water_dry_pot",
  "type": "event",                        // event | story_beat | reward_beat
  "category": "water",                    // siehe 01_premium-vision.md §5
  "tags": ["learning_beat", "chain_starter", "indoor_only"],

  "title": { "key": "events.v3_water_dry_pot.title" },
  "shortSymptom": { "key": "events.v3_water_dry_pot.symptom" },
  "longDescription": { "key": "events.v3_water_dry_pot.description" },

  "cause": {
    "kind": "watering_gap",
    "explanation": { "key": "events.v3_water_dry_pot.cause" }
  },

  "symptoms": [
    {
      "id": "leaves_drooping_mild",
      "label": { "key": "symptoms.leaves_drooping_mild" },
      "spriteOverlay": "drooping_v1",
      "weight": 1.0
    }
  ],

  "diagnostics": {
    "available": ["soil_touch", "weight_check", "ph_stick"],
    "modeAvailability": {
      "beginner": "always",
      "guided": "rationed",
      "pro": "tools_only"
    },
    "rations": {
      "guided": { "perSimDay": 3 }
    },
    "results": {
      "soil_touch": {
        "label": { "key": "diagnostics.soil_touch.dry_pot" },
        "informationValue": "high",
        "revealsCauseHints": ["watering_gap"]
      }
    }
  },

  "options": [
    {
      "id": "water_slow",
      "label": { "key": "options.water_slow" },
      "intent": "gradual_rehydrate",
      "contextFit": ["dry"],
      "effects": { "water": 14, "stress": -3, "risk": -1 },
      "applyOver": { "realSeconds": 120, "simHours": 4 },
      "recommendedIn": ["beginner", "guided"],
      "isDeliberateMistake": false
    }
  ],

  "triggers": {
    "all": [
      { "field": "status.water", "op": "<=", "value": 30 },
      { "field": "status.stress", "op": ">=", "value": 25 },
      { "field": "simulation.isDaytime", "op": "==", "value": true }
    ],
    "any": [],
    "stage": { "min": 3, "max": 9 },
    "setup": {
      "modeIn": ["indoor", "greenhouse"]
    }
  },

  "eligibility": {
    "allowedPhases": ["vegetative", "flowering", "harvest"],
    "constraints": {
      "minDay": 2,
      "maxDay": 60,
      "minPlantSize": 8,
      "environmentState": { "minVpdKpa": 0.6 }
    },
    "playerProfile": {
      "minKnowledge": null,
      "blockIfKnowledgeAtLeast": null
    }
  },

  "pressure": {
    "primaryPressure": "water_dry",
    "weight": 0.9,
    "specificPressureFormula": "linear:status.water:0..30",
    "polarity": "negative"
  },

  "severity": {
    "level": "warning",
    "scale": "info|warning|critical|emergency"
  },

  "warningProfile": {
    "cadence": "early_visible",
    "leadTimeSimHours": 2
  },

  "escalationProfile": {
    "stages": [
      {
        "id": "warning",
        "afterSimHours": 0,
        "spriteOverlay": "drooping_v1",
        "coachLineKey": "coach.water_dry.warning"
      },
      {
        "id": "escalating",
        "afterSimHours": 6,
        "spriteOverlay": "drooping_v2",
        "addsRiskPerHour": 1
      },
      {
        "id": "critical",
        "afterSimHours": 12,
        "spriteOverlay": "drooping_v3",
        "addsHealthLossPerHour": 0.5,
        "deathPathEligible": false
      }
    ],
    "noActionHooks": ["pressure_retention_possible"],
    "poorOutcomeHooks": ["pressure_retention_possible"],
    "unresolvedHooks": ["chain.late_flower_humidity_risk"]
  },

  "aftermathProfile": {
    "perOutcomeQuality": {
      "strong_recovery": {
        "plantStateMutations": { "stress": -4 },
        "runChronicleTags": ["recovered_water_dry"],
        "knowledgeProfileGains": { "water_basics": 0.06 }
      },
      "partial_mitigation": {
        "plantStateMutations": { "stress": -1 },
        "knowledgeProfileGains": { "water_basics": 0.03 }
      },
      "poor_outcome": {
        "plantStateMutations": { "risk": 4, "stress": 6 },
        "permanentMarkers": ["stage_water_stress_memory"]
      },
      "no_action": {
        "plantStateMutations": { "risk": 6, "stress": 8 },
        "permanentMarkers": ["stage_water_stress_memory"]
      }
    },
    "narrativeTextKey": "aftermath.v3_water_dry_pot"
  },

  "rewards": {
    "score": {
      "strong_recovery": 60,
      "partial_mitigation": 25,
      "poor_outcome": 0,
      "no_action": -10
    },
    "cosmeticUnlock": null,
    "coachVoiceLineKey": "coach.water_dry.outcome"
  },

  "ui": {
    "presentation": "modal",
    "modalLayout": "symptom_first",
    "audioCue": "soft_alert_v1",
    "haptic": "single_pulse",
    "modalDismissPolicy": "after_outcome",
    "recommendedOptionId": "water_slow",
    "showRiskRewardChips": true
  },

  "assets": {
    "cover": {
      "kind": "image",
      "src": "assets/events/water/dry_pot_cover.png",
      "altKey": "alt.events.v3_water_dry_pot.cover",
      "fallback": "assets/events/_placeholder/cover.png"
    },
    "spriteOverlays": {
      "drooping_v1": "assets/sprites/overlays/leaves_drooping_v1.png",
      "drooping_v2": "assets/sprites/overlays/leaves_drooping_v2.png",
      "drooping_v3": "assets/sprites/overlays/leaves_drooping_v3.png"
    }
  },

  "i18n": {
    "requiredKeys": [
      "events.v3_water_dry_pot.title",
      "events.v3_water_dry_pot.symptom",
      "events.v3_water_dry_pot.description",
      "events.v3_water_dry_pot.cause",
      "options.water_slow",
      "alt.events.v3_water_dry_pot.cover"
    ],
    "supportedLocales": ["de", "en", "es"]
  },

  "telemetry": {
    "eventName": "event_impression",
    "tags": ["water", "learning_beat"],
    "kpiBuckets": ["recovery_path_water"]
  },

  "learningCard": {
    "ref": "lc_water_basics",
    "presentation": "before_decision_first_time_only"
  },

  "chainHooks": {
    "startsChain": null,
    "advancesChainsOnOutcome": {
      "poor_outcome": ["chain.late_flower_humidity_risk@step1"],
      "no_action": ["chain.late_flower_humidity_risk@step1"]
    }
  },

  "migration": {
    "supersedes": ["v2_water_dry_pot"],
    "mappingNotes": "Identische Trigger, ergänzt um diagnostics, escalationProfile.stages, aftermathProfile."
  },

  "authoring": {
    "owner": "design",
    "lastReviewed": "2026-05-06",
    "qualityChecklistVersion": 1,
    "status": "draft"
  }
}
```

### 4.2 Pflichtfelder vs. optional

| Bereich | Pflicht | Optional |
|---|---|---|
| Identität | `schemaVersion`, `id`, `type`, `category`, `title`, `shortSymptom` | `tags`, `longDescription` |
| Spielmechanik | `options` (≥ 2), `triggers`, `eligibility.allowedPhases`, `pressure.primaryPressure`, `severity.level` | `pressure.specificPressureFormula`, `eligibility.constraints` |
| Premium-Layer | `escalationProfile.stages` (≥ 1), `aftermathProfile.perOutcomeQuality.strong_recovery`, `aftermathProfile.perOutcomeQuality.no_action` | `cause`, `symptoms`, `diagnostics`, `warningProfile`, `chainHooks` |
| Asset-Layer | `assets.cover.src` mit `assets.cover.altKey`, `assets.cover.fallback` | `assets.spriteOverlays` |
| i18n | `i18n.requiredKeys`, `i18n.supportedLocales` enthält mindestens `de`, `en` | `learningCard.ref` |
| Telemetrie | `telemetry.eventName` | `telemetry.tags`, `telemetry.kpiBuckets` |
| Authoring | `authoring.status`, `authoring.lastReviewed` | `authoring.owner`, `authoring.qualityChecklistVersion` |

### 4.3 Common-Defs (geteilte Sub-Schemas)

Sammeln in `_schema/common-defs.schema.json`:

- `LocalizedRef` = `{ key: string }`
- `Effect` = `{ water?: number, nutrition?: number, health?: number, stress?: number, risk?: number, growth?: number }`
- `TriggerCondition` = `{ field: string, op: enum, value: any }`
- `StageRange` = `{ min: integer 1..12, max: integer 1..12 }`
- `SetupRule` = `{ modeIn?: ["indoor","outdoor","greenhouse"] }`
- `AssetRef` = `{ kind: enum, src: string, altKey?: string, fallback?: string }`
- `OutcomeQuality` = `enum: strong_recovery | partial_mitigation | poor_outcome | no_action`
- `EscalationStageId` = `enum: latent | warning | escalating | critical`
- `Severity` = `enum: info | warning | critical | emergency`

### 4.4 Validierungsregeln (über JSON-Schema hinaus)

Werden später in einem dedizierten Validator-Skript geprüft (Auftrag #004). Nicht in v3-Schema selbst, aber Bestandteil dieses Modells:

1. **Unique IDs** über alle Events und Chains hinweg.
2. **Referenz-Integrität:** jede `learningCard.ref`-ID existiert; jede `chainHooks`-Referenz zeigt auf gültige Chain + Step.
3. **Asset-Existenz:** jeder `src` in `assets.*` muss real auf der Disk vorhanden sein, oder ein `fallback` ist gesetzt.
4. **i18n-Vollständigkeit:** vor Release sind alle `requiredKeys` in allen `supportedLocales` vorhanden; in der Authoring-Phase nur in `de`.
5. **Mindestoptionen:** `options.length >= 2`, davon **mindestens** zwei mit `recommendedIn`-Eintrag.
6. **Trigger-Plausibilität:** `triggers.stage.min <= triggers.stage.max`; bei `category: "water"` mindestens eine Trigger-Bedingung auf `status.water`.
7. **Aftermath-Pflicht:** mindestens `strong_recovery` und `no_action` definiert.
8. **Eskalations-Monotonie:** `escalationProfile.stages[*].afterSimHours` strikt aufsteigend.
9. **Severity-Konsistenz:** `severity.level === "emergency"` → `escalationProfile.stages` muss eine `critical`-Stufe enthalten.
10. **Story-Beat:** `type === "story_beat"` → `tags` enthält `story_beat`; Curator setzt `triggers` ggf. selbst.
11. **Polarity-Tag:** bei `pressure.polarity === "positive"` muss `category` aus `{positive, special}` sein.

---

## 5. Felder im Detail (per Bereich)

### 5.1 Trigger

- `triggers.all`: Array von Bedingungen, **alle** müssen wahr sein (UND).
- `triggers.any`: Array, **mindestens eine** muss wahr sein (ODER).
- `triggers.stage`: numerische Phase 1..12.
- `triggers.setup`: `modeIn`, `lampTypeIn`, `mediumIn` etc.
- Operatoren (`op`): `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`.
- Felder (`field`) ausschließlich aus einer **whitelist** (siehe `eventShared.resolveField`); kein dynamischer Pfad.

### 5.2 Eligibility

- `allowedPhases`: Array aus dem Phasenenum (`germination`, `seedling`, `vegetative`, …).
- `constraints`: Stage-Range, Tag-Range, Plant-Size, Wurzelmasse, Klima- und Wurzelzonen-Grenzen.
- `playerProfile`: optionale Gates aus dem `KnowledgeProfile`.

### 5.3 Pressure

- `primaryPressure`: Schlüssel aus dem `PressureRegistry` (z. B. `water_dry`, `humidity_high`, `pest_mites`).
- `weight`: Modulationsfaktor in der Score-Formel (Ziel-Range 0.5..1.5).
- `specificPressureFormula`: textuelles, deterministisch interpretierbares Mini-DSL (`linear:<field>:<min>..<max>`, `inverseLinear:...`, später erweiterbar).
- `polarity`: `negative | neutral | positive`.

### 5.4 Severity

- `level`: `info | warning | critical | emergency`.
- Steuert Coach-Tonalität, Audio-Cue-Vorgabe, Modal-Dauer-Untergrenze.

### 5.5 Learning

- `learningCard.ref`: ID einer Lernkarte.
- `learningCard.presentation`: `before_decision_first_time_only | after_outcome | optional_button`.
- `cause.explanation`: i18n-Key zur retrospektiven Erklärung.

### 5.6 UI

- `ui.presentation`: `modal | toast | banner` (Default `modal`).
- `ui.modalLayout`: `symptom_first | image_first | data_first`.
- `ui.audioCue`, `ui.haptic`: Schlüssel aus zentraler Audio/Haptik-Registry.
- `ui.modalDismissPolicy`: `after_outcome | after_choice | manual`.
- `ui.recommendedOptionId`: nur wirksam in Anfänger-/Geführt-Modus.

### 5.7 Rewards

- `rewards.score`: punktebasierte Belohnung pro `OutcomeQuality`.
- `rewards.cosmeticUnlock`: Pflanzen-Sprite-Variante, Akten-Stamp etc.
- `rewards.coachVoiceLineKey`: i18n-Key der Coach-Zeile beim Outcome.

### 5.8 Assets

- `assets.cover`: Hauptbild für Modal/Banner.
- `assets.spriteOverlays`: Pflanzen-Sprite-Overlays pro Eskalationsstufe oder Symptomvariante.
- Jedes Asset trägt `altKey` (i18n) und `fallback`.

### 5.9 i18n

- `i18n.requiredKeys`: explizite Liste der Pflicht-Keys.
- `i18n.supportedLocales`: schon zur Authoring-Zeit gepflegt (Validator nutzt das Feld).

### 5.10 Telemetry

- `telemetry.eventName`: feste Konstante `event_impression` für Standard-Events; eigene Namen nur für besondere Beats.
- `telemetry.tags`: zusätzliche Filter.
- `telemetry.kpiBuckets`: Verbindung zu KPI-Definitionen aus `08_telemetry.md`.

### 5.11 Migration

- `migration.supersedes`: Array alter Event-IDs (v1/v2), die das v3-Event ersetzt.
- `migration.mappingNotes`: lesbare Notiz für Audit / Reviewer.

---

## 6. Beispiele für einfache Events

Drei Beispiele, die den Schema-Umfang abdecken: minimal, typisch, Lern-Beat.

### 6.1 Minimal-Event („Topf trocken")

Siehe `data/events/catalog/_examples/water_dry_pot.event.json` (Codex-Auftrag #003 legt es als Skelett an).

Kernmerkmale:
- Eine Pflicht-Lernkarte (`lc_water_basics`).
- Eine Eskalationsstufe.
- Drei Optionen, davon eine bewusst falsch.
- Einfache Aftermath-Mutationen ohne permanente Marker (außer beim no_action-Pfad).

### 6.2 Typisches Krisen-Event („Spätblüte-Feuchte-Risiko")

```jsonc
{
  "schemaVersion": 3,
  "id": "v3_late_flower_humidity_risk",
  "type": "event",
  "category": "disease",
  "tags": ["chain_starter", "ambiguous", "indoor_only"],

  "title": { "key": "events.v3_late_flower_humidity_risk.title" },
  "shortSymptom": { "key": "events.v3_late_flower_humidity_risk.symptom" },
  "longDescription": { "key": "events.v3_late_flower_humidity_risk.description" },

  "cause": { "kind": "humidity_high_stage9", "explanation": { "key": "events.v3_late_flower_humidity_risk.cause" } },

  "symptoms": [
    { "id": "humidity_meter_high", "label": { "key": "symptoms.humidity_meter_high" }, "spriteOverlay": null, "weight": 1.0 }
  ],

  "diagnostics": {
    "available": ["humidity_meter", "bud_close_up"],
    "modeAvailability": { "beginner": "always", "guided": "rationed", "pro": "tools_only" },
    "rations": { "guided": { "perSimDay": 2 } },
    "results": {
      "bud_close_up": {
        "label": { "key": "diagnostics.bud_close_up.early_botrytis" },
        "informationValue": "high",
        "revealsCauseHints": ["humidity_high_stage9"]
      }
    }
  },

  "options": [
    {
      "id": "increase_airflow",
      "label": { "key": "options.increase_airflow" },
      "intent": "lower_humidity",
      "contextFit": ["humidity_high"],
      "effects": { "risk": -8, "stress": 2 },
      "applyOver": { "realSeconds": 240, "simHours": 8 },
      "recommendedIn": ["beginner", "guided"]
    },
    {
      "id": "lower_temp_target",
      "label": { "key": "options.lower_temp_target" },
      "intent": "lower_temperature",
      "contextFit": ["temperature_high"],
      "effects": { "risk": -3, "stress": -1 }
    },
    {
      "id": "delay_action",
      "label": { "key": "options.delay_action" },
      "intent": "delay_action",
      "contextFit": ["any"],
      "effects": { "risk": 5 },
      "isDeliberateMistake": true
    }
  ],

  "triggers": {
    "all": [
      { "field": "env.humidityPercent", "op": ">=", "value": 65 },
      { "field": "plant.stageIndex", "op": ">=", "value": 9 }
    ],
    "stage": { "min": 9, "max": 11 },
    "setup": { "modeIn": ["indoor", "greenhouse"] }
  },

  "eligibility": { "allowedPhases": ["flowering", "harvest"] },

  "pressure": { "primaryPressure": "humidity_high", "weight": 1.1, "polarity": "negative" },
  "severity": { "level": "critical" },

  "warningProfile": { "cadence": "subtle", "leadTimeSimHours": 4 },

  "escalationProfile": {
    "stages": [
      { "id": "warning",     "afterSimHours": 0,  "spriteOverlay": null },
      { "id": "escalating",  "afterSimHours": 6,  "spriteOverlay": "bud_grey_speck", "addsRiskPerHour": 1.5 },
      { "id": "critical",    "afterSimHours": 14, "spriteOverlay": "bud_botrytis_spot", "addsHealthLossPerHour": 0.8, "deathPathEligible": true }
    ],
    "unresolvedHooks": ["chain.late_flower_humidity_risk@step2"]
  },

  "aftermathProfile": {
    "perOutcomeQuality": {
      "strong_recovery": { "plantStateMutations": { "risk": -10, "stress": -2 }, "knowledgeProfileGains": { "flower_humidity_risk": 0.08 } },
      "partial_mitigation": { "plantStateMutations": { "risk": -4 }, "knowledgeProfileGains": { "flower_humidity_risk": 0.04 } },
      "poor_outcome": { "plantStateMutations": { "risk": 8, "health": -3 }, "permanentMarkers": ["botrytis_scar"] },
      "no_action": { "plantStateMutations": { "risk": 14, "health": -8 }, "permanentMarkers": ["botrytis_scar"] }
    },
    "narrativeTextKey": "aftermath.v3_late_flower_humidity_risk"
  },

  "rewards": { "score": { "strong_recovery": 90, "partial_mitigation": 30, "poor_outcome": -20, "no_action": -50 } },

  "ui": {
    "presentation": "modal",
    "modalLayout": "symptom_first",
    "audioCue": "soft_alert_v2",
    "haptic": "double_pulse",
    "modalDismissPolicy": "after_outcome",
    "recommendedOptionId": "increase_airflow",
    "showRiskRewardChips": true
  },

  "assets": {
    "cover": { "kind": "image", "src": "assets/events/disease/late_flower_humidity_cover.png", "altKey": "alt.events.v3_late_flower_humidity_risk.cover", "fallback": "assets/events/_placeholder/cover.png" }
  },

  "i18n": { "requiredKeys": ["events.v3_late_flower_humidity_risk.title", "events.v3_late_flower_humidity_risk.symptom"], "supportedLocales": ["de", "en", "es"] },

  "telemetry": { "eventName": "event_impression", "tags": ["disease", "chain_starter"], "kpiBuckets": ["disease_humidity_path"] },

  "learningCard": { "ref": "lc_humidity_vpd", "presentation": "before_decision_first_time_only" },

  "chainHooks": { "startsChain": "chain_late_flower_humidity_risk", "advancesChainsOnOutcome": null },

  "migration": { "supersedes": ["v2_late_flower_humidity"], "mappingNotes": "Trigger nahezu identisch; ergänzt um Eskalationsstufen und Aftermath-Marker." }
}
```

### 6.3 Reines Lern-Event („Erste Trichome", Story-Beat)

```jsonc
{
  "schemaVersion": 3,
  "id": "v3_story_first_trichomes",
  "type": "story_beat",
  "category": "positive",
  "tags": ["story_beat", "learning_beat", "any_setup"],

  "title": { "key": "events.v3_story_first_trichomes.title" },
  "shortSymptom": { "key": "events.v3_story_first_trichomes.symptom" },

  "options": [
    { "id": "celebrate", "label": { "key": "options.celebrate" }, "intent": "acknowledge", "contextFit": ["positive"], "effects": {} },
    { "id": "learn_more", "label": { "key": "options.learn_more" }, "intent": "study", "contextFit": ["positive"], "effects": {} }
  ],

  "triggers": { "all": [{ "field": "plant.stageIndex", "op": ">=", "value": 9 }] },
  "eligibility": { "allowedPhases": ["flowering"] },

  "pressure": { "primaryPressure": "narrative_only", "weight": 0.0, "polarity": "positive" },
  "severity": { "level": "info" },

  "escalationProfile": { "stages": [{ "id": "warning", "afterSimHours": 0 }] },

  "aftermathProfile": {
    "perOutcomeQuality": {
      "strong_recovery": { "knowledgeProfileGains": { "flower_phenology": 0.1 } },
      "no_action": {}
    }
  },

  "rewards": { "score": { "strong_recovery": 30 } },

  "ui": { "presentation": "modal", "modalLayout": "image_first", "audioCue": "soft_celebrate_v1", "haptic": "single_pulse", "modalDismissPolicy": "after_choice" },

  "assets": { "cover": { "kind": "image", "src": "assets/events/positive/first_trichomes_cover.png", "altKey": "alt.events.v3_story_first_trichomes.cover", "fallback": "assets/events/_placeholder/cover.png" } },

  "i18n": { "requiredKeys": ["events.v3_story_first_trichomes.title"], "supportedLocales": ["de", "en", "es"] },

  "telemetry": { "eventName": "story_beat_impression", "tags": ["story_beat", "phenology"], "kpiBuckets": ["story_first_trichomes"] },

  "learningCard": { "ref": "lc_trichome_basics", "presentation": "after_outcome" },

  "chainHooks": { "startsChain": null, "advancesChainsOnOutcome": null },

  "authoring": { "status": "draft", "lastReviewed": "2026-05-06" }
}
```

---

## 7. Beispiel für eine Event-Kette

Eine Kette in eigener Datei verbindet vorhandene Events; sie definiert keine Optionen oder Effects.

```jsonc
{
  "$schema": "../_schema/chain.schema.json",
  "schemaVersion": 3,
  "id": "chain_late_flower_humidity_risk",

  "title": { "key": "chains.late_flower_humidity_risk.title" },
  "summary": { "key": "chains.late_flower_humidity_risk.summary" },

  "expectedSpanSimHours": { "min": 12, "max": 36 },

  "preconditions": {
    "stageIn": ["flowering"],
    "anySetup": true
  },

  "steps": [
    {
      "id": "step1",
      "eventId": "v3_late_flower_humidity_risk",
      "role": "trigger",
      "transitionsOnOutcome": {
        "strong_recovery": { "to": "step_recover", "delaySimHours": 4 },
        "partial_mitigation": { "to": "step2", "delaySimHours": 8 },
        "poor_outcome": { "to": "step2", "delaySimHours": 6 },
        "no_action": { "to": "step2", "delaySimHours": 4 }
      }
    },
    {
      "id": "step2",
      "eventId": "v3_disease_botrytis_onset",
      "role": "escalation",
      "transitionsOnOutcome": {
        "strong_recovery": { "to": "step_recover", "delaySimHours": 6 },
        "no_action": { "to": "step3_critical", "delaySimHours": 8 }
      }
    },
    {
      "id": "step3_critical",
      "eventId": "v3_disease_botrytis_critical",
      "role": "critical",
      "transitionsOnOutcome": {
        "strong_recovery": { "to": "step_recover", "delaySimHours": 8 },
        "no_action": { "to": null, "endsChainAs": "failure", "delaySimHours": 4 }
      }
    },
    {
      "id": "step_recover",
      "eventId": "v3_positive_recovery_window",
      "role": "resolution",
      "transitionsOnOutcome": {
        "strong_recovery": { "to": null, "endsChainAs": "success", "delaySimHours": 0 },
        "no_action":      { "to": null, "endsChainAs": "neutral", "delaySimHours": 0 }
      }
    }
  ],

  "uiBanner": {
    "presentWhileActive": true,
    "labelKey": "chains.late_flower_humidity_risk.banner",
    "tone": "warning"
  },

  "telemetry": {
    "kpiBuckets": ["chain_late_flower_humidity"],
    "logSteps": true
  },

  "authoring": { "status": "draft", "lastReviewed": "2026-05-06" }
}
```

Eigenschaften:

- Eindeutig benannte Schritte mit `eventId`-Referenz.
- Übergänge pro `OutcomeQuality`, mit Verzögerung in Sim-Stunden.
- `endsChainAs` schließt eine Kette mit `success | failure | neutral` ab.
- Eigener UI-Banner pro Kette.
- Eigene Telemetry-Bucket-Definition.

---

## 8. Beispiel für eine Lernkarte

Lernkarten leben in `data/events/catalog/learning_cards/`, eigenes Schema, eigenes Lifecycle.

```jsonc
{
  "$schema": "../_schema/learning-card.schema.json",
  "schemaVersion": 3,
  "id": "lc_water_basics",

  "title": { "key": "learningCards.lc_water_basics.title" },
  "subtitle": { "key": "learningCards.lc_water_basics.subtitle" },

  "presentation": {
    "preferredHeroAsset": "assets/learning/water_basics_hero.png",
    "estimatedReadSeconds": 60,
    "layout": "hero_then_bullets"
  },

  "content": {
    "bullets": [
      { "key": "learningCards.lc_water_basics.bullet_1" },
      { "key": "learningCards.lc_water_basics.bullet_2" },
      { "key": "learningCards.lc_water_basics.bullet_3" }
    ],
    "realWorldNoteKey": "learningCards.lc_water_basics.real_world_note",
    "moreReadingRef": "library.water.advanced_irrigation"
  },

  "knowledgeProfile": {
    "primaryDimension": "water_basics",
    "gainOnFirstView": 0.05,
    "gainOnLaterView": 0.01
  },

  "appearsIn": {
    "linkedEventIds": ["v3_water_dry_pot", "v3_water_overwater_warning"],
    "minStage": 1,
    "modes": ["beginner", "guided"]
  },

  "i18n": {
    "requiredKeys": [
      "learningCards.lc_water_basics.title",
      "learningCards.lc_water_basics.bullet_1",
      "learningCards.lc_water_basics.bullet_2",
      "learningCards.lc_water_basics.bullet_3",
      "learningCards.lc_water_basics.real_world_note"
    ],
    "supportedLocales": ["de", "en", "es"]
  },

  "authoring": { "owner": "design", "status": "draft", "lastReviewed": "2026-05-06" }
}
```

Anforderungen an Lernkarten:

- 3–5 Stichpunkte, jeder ≤ 18 Wörter.
- Reale Quelle / Begründung im `realWorldNoteKey`.
- `gainOnFirstView` setzt Lernfortschritt; Wiederholungs-Gewinn ist klein.
- Maximal **eine** Lernkarte pro Event-Auftritt; weitere nur via Bibliothek.

---

## 9. Regeln für App-Store-taugliche Contentqualität

Diese Regeln gelten als Definition of Done für jedes neue Event und jede Lernkarte. Validator-Skripte (Auftrag #004) prüfen sie automatisiert, soweit möglich.

### 9.1 Sprache und Tonalität

1. Keine reißerische Sprache, keine Drohungen.
2. Keine Diagnose, die einer realen medizinischen oder rechtlichen Beratung entspricht.
3. Verwendung von Realbegriffen (VPD, EC, NPK, …) nur, wenn der Modus es vorsieht.
4. Keine Pflanzen-Anthropomorphisierung über das Spielinterne hinaus („sie leidet" ja, „sie weint" nein).
5. Keine Witze auf Kosten von Spielern, Setups oder Kulturen.
6. Niemals belehrender Imperativ; immer partnerschaftlicher Vorschlag.

### 9.2 Faktentreue

1. Jede Lernkarte verweist intern auf eine reale Quelle (kein PII, kein Kommerz).
2. Jeder „Aftermath-Hint" deckt sich mit echter Pflanzenphysiologie.
3. Keine garantierten Heilungen, keine 100-Prozent-Versprechen.

### 9.3 Sicherheit für junge / sensible Spieler

1. Keine Suchtanspielungen.
2. Keine reale Drogenkonsum-Anleitung.
3. Erntethemen werden in spielerischer, neutraler Sprache behandelt.
4. Verfügbare Inhalte nicht zur Anleitung für Realanbau missbrauchbar (kein „Schritt-für-Schritt-Outdoor-Versteck").

### 9.4 Barrierefreiheit / Lokalisierung

1. Alle Pflichttexte i18n, mit DE/EN/ES vor Release.
2. Cover-Asset hat `altKey`.
3. Symptomerkennung hat textuelle Beschreibung, nicht nur Sprite.
4. Sound ist nie alleinige Informationsquelle.

### 9.5 Mechanische Hygiene

1. Mindestens eine **richtige** Option, mindestens eine **bewusst falsche** Option (`isDeliberateMistake: true`).
2. Outcome `no_action` muss definiert sein (Spieler verlässt das Modal nicht ohne Konsequenzen).
3. `escalationProfile` mit mindestens einer Stage; `critical` nur wenn `severity` ≥ `critical`.
4. Ein Event darf maximal **einen** `chainHooks.startsChain`-Eintrag haben.
5. Kein Event setzt `health` direkt auf 0; Pflanzentod nur über Eskalations- und Stage-Übergangslogik.

### 9.6 Authoring-Status

`authoring.status` durchläuft: `draft → review → approved → published → frozen`. Validator akzeptiert in der Authoring-Phase `draft` und `review`, im Build nur `approved` oder höher.

---

## 10. Migration aus `events.json` (v1) und `events.v2.json` (v2) → v3

### 10.1 Strategie

- **Schritt A — Coexistenz:** v1, v2 und v3 koexistieren in einem Übergangs-Index; v3-Events haben Priorität bei doppelter `migration.supersedes`-Beziehung.
- **Schritt B — schrittweise Ablösung:** Jeder v2-Eintrag wird durch ein v3-Pendant ersetzt, dokumentiert in `migration.supersedes`.
- **Schritt C — Frozen Legacy:** Sobald alle v2-Einträge ein v3-Pendant haben, wird v2 nur noch aus den Legacy-Saves gelesen (Read-only) und nicht mehr in den Live-Index geladen.
- **Schritt D — Save-Migration:** Save-Adapter mappt aktive v1/v2-Event-IDs auf v3-IDs gemäß `supersedes`-Tabelle. Falls keine Mappingbeziehung existiert, wird das aktive Event sanft beendet (`endsChainAs: neutral`, ohne Score-Strafe).

### 10.2 Field-Mapping v2 → v3

| v2-Feld | v3-Feld | Mapping-Regel |
|---|---|---|
| `id` | `id` | 1:1, aber Präfix `v3_` empfohlen |
| `category` | `category` | 1:1 |
| `title` (string) | `title.key` | Authoring legt einen Key an, alter String wandert ins `de.json` |
| `description` (string) | `longDescription.key` | s. o. |
| `triggers` | `triggers` | 1:1 |
| `weight` | `pressure.weight` | 1:1, Range 0.5..1.5 |
| `cooldownRealMinutes` | (cooldown bleibt in Engine-Config, nicht im Event) | wird in Engine-Tabelle übernommen, nicht ins Event |
| `options[].label` | `options[].label.key` | siehe Title |
| `options[].effects` | `options[].effects` | 1:1 |
| `options[].intent` | `options[].intent` | 1:1 |
| `options[].contextFit` | `options[].contextFit` | 1:1 |
| `learningNote` | `learningCard.ref` (neue Card erzeugen) **oder** `cause.explanation.key` | Reviewer entscheidet |
| `allowedPhases` | `eligibility.allowedPhases` | 1:1 |
| `shadowModel.problemPolarity` | `pressure.primaryPressure` | Mapping-Tabelle (`dry → water_dry`, `wet → water_wet`, …) |
| `shadowModel.escalationProfile.noActionHooks` | `escalationProfile.noActionHooks` | 1:1 |
| `shadowModel.rewardProfile` | `rewards.*` (Aufteilung) | per Reviewer |
| (neu) | `severity.level` | initial aus alter `severity` (1..4) → enum |
| (neu) | `escalationProfile.stages[]` | mind. `warning` als Stub |
| (neu) | `aftermathProfile.perOutcomeQuality.no_action` | aus alten Effects abgeleitet |
| (neu) | `assets.cover` | aus `event-assets.registry.json` übernommen |
| (neu) | `i18n.requiredKeys` | aus den `*.key`-Verweisen erzeugt |

### 10.3 v1-Spezifika

- `severity` (1..4) → `severity.level`-Enum: `1 → info, 2 → warning, 3 → critical, 4 → emergency`.
- `pool: "recovery"` → `category: "positive"`.
- `titleKey`/`descriptionKey` aus v1 werden direkt übernommen, sofern sie in `de.json` existieren.

### 10.4 Save-Migration

- `eventCooldownsSim`, `categoryCooldownsSim` werden in das v3-Engine-State übernommen, IDs ggf. via Mapping ersetzt.
- `pendingChains` werden gegen die neue Chain-Datei geprüft. Unbekannte ChainIDs werden mit `endsChainAs: neutral` archiviert.
- `foundation.flags` und `foundation.memory.events` bleiben im Format `legacy-compatible-v1`. v3-Felder werden additiv ergänzt.

### 10.5 Reihenfolge der Umsetzung

1. v3-Schema und Validator stehen (Auftrag #003 / #004).
2. Erste 5 v3-Events angelegt (typische Kategorien).
3. Engine V2 liest v2 und v3 parallel über Migrations-Adapter (Auftrag #005).
4. Schrittweise Umstellung pro Kategorieordner (Auftrag #006 ff.).
5. v2 wird Read-only deklariert, sobald alle Kategorien migriert sind.

---

## 11. Codex-Auftrag #003

Codex implementiert weiterhin **keinen Engine-Code**. Schritt #003 legt nur Daten- und Schema-Skelette an.

### 11.1 Ziel

Datenmodell-Gerüste so anlegen, dass Codex später (Auftrag #004) einen Validator schreiben und (Auftrag #005) die Engine V2 daran andocken kann — **ohne** dass jetzt schon irgendetwas geladen, gerendert oder geändert wird.

### 11.2 Erlaubte Aktionen

1. **Neue Dateien anlegen**, alle unterhalb der unten aufgeführten Pfade.
2. **Bestehende Dateien lesen** (nur zu Referenz).
3. **Markdown-Stubs** für angekündigte, aber noch nicht geschriebene Folge-Dokumente erzeugen (`03_architecture.md`, `04_event-catalog.md`, `09_testing-plan.md`) als bloße Inhaltsverzeichnisse.

### 11.3 Verbotene Aktionen

- Keine Änderung an `app.js`, `src/events/*`, `data/events.json`, `data/events.v2.json`, `data/events.foundation.json`, `data/event-assets.*`.
- Keine Tests anlegen.
- Keine Locales (`src/i18n/locales/*.json`) verändern.
- Kein Code, der Schemas lädt oder validiert.
- Kein Bewegen oder Löschen bestehender Dateien.

### 11.4 Konkrete Datei-Liste

```
data/
  events/
    catalog/
      _schema/
        event.schema.json                ← JSON-Schema-Skelett, Draft-07, mit description-Feldern, ohne harte Constraints
        chain.schema.json                ← analog
        learning-card.schema.json        ← analog
        common-defs.schema.json          ← LocalizedRef, Effect, TriggerCondition, AssetRef, OutcomeQuality, EscalationStageId, Severity
        player-profile.schema.json       ← KnowledgeProfile, KompetenceMap, PreferenceFlags
        run-state.schema.json            ← StoryBudget, StoryBeats, EskalationsTrace
        README.md                        ← „Diese Schemas werden von der V2-Engine geladen, nicht direkt von app.js."
      _examples/
        water_dry_pot.event.json
        late_flower_humidity_risk.event.json
        story_first_trichomes.event.json
        chain_late_flower_humidity_risk.chain.json
        learning_water_basics.learning-card.json
        learning_humidity_vpd.learning-card.json
        README.md                        ← „Beispiel-Material zum v3-Schema. Nicht im Live-Katalog."
docs/
  event-system-v2/
    03_architecture.md                   ← Inhaltsverzeichnis-Stub mit TBD-Markierungen
    04_event-catalog.md                  ← Inhaltsverzeichnis-Stub
    09_testing-plan.md                   ← Inhaltsverzeichnis-Stub
```

### 11.5 Minimum-Inhalte pro Schema-Skelett

- Gültiges `$schema: "http://json-schema.org/draft-07/schema#"`.
- `$id` setzen, eindeutig.
- `title` und `description` setzen.
- `type: "object"`.
- `required: []` mit Pflichtfeldern aus Abschnitt 4.2 dieses Dokuments — als Liste, nicht als hartes Schema-Constraint mit Type-Checks.
- `properties: { … }` als reine Stub-Map: jedes Feld mit `description` aber ohne `type`, `pattern` oder `enum`.
- **Keine** `additionalProperties: false` (das blockiert spätere Erweiterungen).

### 11.6 Minimum-Inhalte pro Beispiel-JSON

- Vollständige, gegen das in Abschnitt 4 beschriebene Modell **konsistente** Struktur.
- Reale Asset-Pfade aus dem Repo (sofern vorhanden), sonst `_placeholder/cover.png` (existiert noch nicht — `fallback`-Wert reicht).
- Nutzung echter, in den bestehenden Events vorkommender Felder (Wasser, Stress, Risiko etc.), damit Reviewer schnell vergleichen können.
- Authoring-Status `"draft"`.

### 11.7 Akzeptanzkriterien

1. `node --check` auf `app.js`, `src/events/eventEngine.js`, `src/events/eventShared.js`: ✅ unverändert.
2. Alle bestehenden Tests laufen unverändert.
3. `node -e "JSON.parse(require('fs').readFileSync('data/events/catalog/_examples/water_dry_pot.event.json'))"` erfolgreich (Datei ist gültiges JSON).
4. Alle neuen Schema-Dateien sind valides JSON-Schema Draft-07 (manuelle Sicht / `ajv compile` durch Reviewer).
5. `git status` zeigt ausschließlich Neu-Dateien, keine Modifikationen an existierenden.
6. Kein neuer Lade-Pfad in `app.js`.

### 11.8 Ergebnis-Übergabe

Codex liefert am Ende:

- Liste aller neu erzeugten Dateien.
- Eine kurze README in `data/events/catalog/README.md` (Eingangstür, verlinkt auf `_schema/` und `_examples/`).
- Eine PR-Beschreibung, die auf dieses Dokument (`02_data-model.md`) als Quelle verweist.

---

## 12. Offene Punkte für Folgedokumente

- **`03_architecture.md`** — wie Curator, Coach, V2-Engine, Migrations-Adapter, Persistence ineinandergreifen.
- **`04_event-catalog.md`** — die konkrete Liste aller geplanten v3-Events pro Kategorie und Stage.
- **`05_chains.md`** — narrative Storyboards, Pacing-Profile.
- **`06_ui-flow.md`** — Modal-Choreografie, Banner, Akte.
- **`07_balancing.md`** — Pressure-Gewichte, Story-Budget-Formeln.
- **`08_telemetry.md`** — KPIs, Funnel-Definitionen.
- **`09_testing-plan.md`** — Validator, Schema-Tests, Replay, UI-Snapshots.
- **`10_codex-stepwise-implementation.md`** — die Auftragskette #001 bis #N als Gantt.

---

*Ende Datenmodell-Entwurf 02.*
