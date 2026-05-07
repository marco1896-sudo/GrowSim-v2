# 03 — Architecture: Event System V2

**Status:** Architektur-Konzept, keine Codeänderung, keine Migration aktiviert.
**Zweck:** Technisches Architekturbild, das Codex schrittweise umsetzen kann. Soll garantieren, dass das Event-System sich wie ein **realistischer Grow-Coach** verhält — aus Zustand, Verlauf und Entscheidungen werden plausible Ereignisse und Lernmomente erzeugt, niemals reines Zufalls-Roulette.
**Datum:** 2026-05-06
**Vorgänger:** `00_current-system-audit.md`, `01_premium-vision.md`, `02_data-model.md`
**Nachfolger (geplant):** `04_event-catalog.md`, `06_ui-flow.md`, `07_balancing.md`, `08_telemetry.md`, `09_testing-plan.md`

---

## 1. Zielbild

Eine **modulare, datengetriebene, deterministische** Event-Pipeline, die

1. den **aktuellen Zustand der Pflanze** (Status, Klima, Wurzelzone, Setup) liest,
2. den **Verlauf** (Stresshistorie, vergangene Entscheidungen, offene Ketten, Lernfortschritt) berücksichtigt,
3. **plausible Ereignisse** auswählt — nie zufällig, immer mit Begründung — und
4. **lehrreiche Momente** zur richtigen Zeit liefert.

Architektur-Axiome:

- **Datengetrieben.** Inhalte leben in `data/events/catalog/`, Code interpretiert sie.
- **Deterministisch.** Mit gleichem Seed und Zustand kommt das gleiche Event heraus. Replay ist Pflicht.
- **Schichten mit klaren Verträgen.** Jede Schicht hat einen `describeContract()`-Selbstbericht.
- **Legacy-sicher.** Bestehende Saves und die alte Engine bleiben so lange Authority, bis V2 in Soak-Tests grün ist.
- **Coach-First.** Jeder Schritt der Pipeline kann eine Coach-Zeile produzieren; nichts passiert wortlos hinter den Kulissen.
- **Premium-Pacing.** Das System bremst sich selbst aktiv: Lieber Ruhe als Eventflut.

Architektur-Anti-Axiome:

- **Kein Random ohne Begründung.** Keine `Math.random()`-Aufrufe ohne Seed-Bezug.
- **Kein Logikcode in JSON.** Keine eingebetteten Funktionen, kein eval.
- **Kein Singleton-Globalstate.** State wird per Argument gereicht, nicht aus `window` gegriffen — bis auf den expliziten Engine-Boot in `app.js`.
- **Keine UI-Logik in der Engine.** Engine produziert nur Daten, UI rendert.

---

## 2. Layer-Architektur

Acht Schichten, klar getrennt, jeweils ein Ordner unter `src/events/v2/` (außer `simulation`, das bleibt im bestehenden Modul).

```
┌──────────────────────────────────────────────────────────────┐
│                       UI Layer (außerhalb)                   │
│           Modal, Banner, Akte, Bibliothek, Coach-Stub        │
└─────────────────────▲────────────────────────────────────────┘
                      │ getUiModel(state)
┌─────────────────────┴────────────────────────────────────────┐
│                      Coach Layer                             │
│       Wählt Tonalität, Zeile, Häufigkeit; liest Profile      │
└─────────────────────▲────────────────────────────────────────┘
                      │ buildCoachPacket(events, profile)
┌─────────────────────┴────────────────────────────────────────┐
│                  Story Curator Layer                         │
│   Story-Budget, Pacing, Story-Beats, Pflichtsequenzen        │
└─────────────────────▲────────────────────────────────────────┘
                      │ curate(candidates, run, profile)
┌─────────────────────┴────────────────────────────────────────┐
│                  Event Engine V2 (Core)                      │
│ Snapshot ▸ Eligibility ▸ Pressure ▸ Activation ▸ Escalation  │
│ ▸ Resolution ▸ Aftermath ▸ Chains ▸ Cooldowns ▸ Contradictions│
└─────▲───────────────────────────▲────────────────────▲───────┘
      │                           │                    │
      │                           │                    │
┌─────┴──────┐         ┌──────────┴────────┐  ┌────────┴──────┐
│ Learning   │         │   Asset Layer     │  │   Telemetry   │
│ Layer      │         │ Catalog, Sprites, │  │  Player + QA  │
│ KP, Cards  │         │ WebP, Lazy, Tags  │  │  Funnels, KPI │
└─────▲──────┘         └──────────▲────────┘  └────────▲──────┘
      │                           │                    │
      │                           │                    │
┌─────┴───────────────────────────┴────────────────────┴──────┐
│                   Persistence Layer                         │
│  Save-Migration, Snapshot, Pruning, Versioning, Hydration   │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ Snapshot, State-Reads
┌─────────────────────────────┴────────────────────────────────┐
│                  Bestehende Simulation                       │
│  Plant-State, Climate, Care, Time, Setup (legacy, intakt)    │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Bestehende Simulation (unverändert)

Quelle aller Eingangsdaten. Liefert weiterhin `state.status`, `state.plant`, `state.environmentControls`, `state.climate.tent`, `state.simulation`, `state.setup`. **Keine Änderung** im Zuge V2 — die V2-Engine liest nur, schreibt nicht direkt zurück.

### 2.2 Event Engine V2 (Core)

Pfad: `src/events/v2/core/engineV2.js`, plus `selection/`, `lifecycle/`.

Verantwortung:
- Snapshot bauen (`core/snapshot.js`).
- Catalog laden und pflegen (`content/catalog.js`).
- Pipeline-Phasen orchestrieren (siehe Abschnitt 3).
- Reine Datenstrukturen produzieren — keine UI, keine Audio, keine Persistenz-Schreiboperationen.

Vertrag:
```js
engineV2.tick(now, state) → {
  decisions: { activated: [...], escalated: [...], resolved: [...], chained: [...] },
  uiModel:   { popup, banner, akteUpdate, coachStub, mediaModel },
  telemetry: { impressions: [...], outcomes: [...], chainEvents: [...] },
  persistence: { mutations: { events, plantStateDelta, knowledgeProfileDelta, … } }
}
```

Die Engine **mutiert** den State **nicht** direkt. Sie liefert `mutations`; der Boot-Layer in `app.js` wendet sie an oder verwirft sie (Shadow-Mode).

### 2.3 Story Curator Layer

Pfad: `src/events/v2/core/curator.js`.

Aufgaben:
- Pflicht-Story-Beats pro Run garantieren (Stage-Übergänge, „Erste Trichome").
- Pacing erzwingen: keine zwei Krisen in unmittelbarer Folge, mindestens 2–4 Sim-h Ruhe nach Krise.
- Eventbudget pro Sim-Tag (max ~1.5 Events/Tag im Median).
- Kategorienverteilung nach Soll-Ranges aus `01_premium-vision.md`.
- Lerne-Beat-Quote überwachen (jedes 3.–4. Event hat Lern-Layer).
- Modus-bewusste Steuerung (Anfänger: weniger gleichzeitige Stressoren).

Vertrag:
```js
curator.curate(rankedCandidates, runState, playerProfile, simNow) → {
  selected: candidate | null,
  reasonsRejected: [...],
  pacing: { nextEarliestSimHour, recentDensity },
  storyBeatScheduled: { beatId, eta } | null
}
```

Der Curator **kann den Engine-Vorschlag ablehnen** und stattdessen einen Story-Beat einschieben oder **Stille** verordnen. Er ist die Premium-Bremse.

### 2.4 Coach Layer

Pfad: `src/events/v2/coach/coach.js`.

Aufgaben:
- Tonalität wählen (Anfänger: warm, Geführt: knapp, Profi: stumm).
- Coach-Zeilen pro Phase produzieren: Warning, Decision-Hint (nur Anfänger), Outcome, Aftermath.
- Wiederholungsbremse: Coach sagt zu derselben Eskalation nur **einmal** etwas.
- Profil-aware: bei `coachingNeed[water_basics] > Schwellwert` ergänzt der Coach in der Outcome-Karte einen Lernhinweis.

Vertrag:
```js
coach.buildCoachPacket(eventDecision, playerProfile, modeKey, recentCoachLog) → {
  lines: [{ slot: "warning"|"decision_hint"|"outcome"|"aftermath", textKey, tone }],
  suggestLearningCard: lcId | null,
  suggestQuietWindow: simHours
}
```

Der Coach hat **keinen** Schreibzugriff auf Plant-State; er liefert nur UI-Daten und Hinweis-Vorschläge.

### 2.5 Learning Layer

Pfad: `src/events/v2/learning/`.

Komponenten:
- `knowledgeProfile.js` — Lese/Schreib-API auf das Profil.
- `learningCardIndex.js` — Lade- und Lookup-Index.
- `presentationPolicy.js` — entscheidet, ob/wann eine Lernkarte erscheint (Erstauftritt, Modusabhängigkeit, Wiederholungsschutz).
- `mistakeAnalysis.js` — generiert die freiwillige Fehleranalyse aus Resolution-Daten.

Wiederholungsschutz: Karte erscheint im Spielerleben automatisch nur einmal; weitere Aufrufe nur über die Bibliothek.

### 2.6 Asset Layer

Pfad: `src/events/v2/content/assets.js`.

Aufgaben:
- Auflösung von `AssetRef` → finalen Pfad mit Größenvariante.
- Lazy-Loading mit Preload-Hinweisen pro Stage.
- Fallback-Kette `kind: image → fallback → _placeholder/cover.png`.
- WebP-Erstpräferenz, PNG nur als Sicherung.
- Asset-Tag-System (siehe Abschnitt 7) für Reuse über Eventgrenzen.

### 2.7 Telemetry Layer

Pfad: `src/events/v2/telemetry/`.

Komponenten:
- `playerTelemetry.js` — anonyme Player-Events (`event_impression`, `event_outcome`, `chain_step`, `learning_card_view`).
- `qaSamplingBridge.js` — bestehendes interne QA-Sampling weiterführen.
- `kpiBuckets.js` — KPI-Definitionen aus `08_telemetry.md` zentral.
- Trennung Player vs. QA strikt; QA niemals an Cloud.

### 2.8 Persistence Layer

Pfad: `src/events/v2/persistence/`.

Komponenten:
- `saveAdapter.js` — read/write `state.events.foundation` und neue v3-Bereiche.
- `migration_v1_v2_to_v3.js` — Mapping aktiver IDs, Cooldowns, Ketten.
- `pruning.js` — Stale-Pruning (TRACKED_EVENT_STALE_HOURS = 18 etc.).
- `schemaVersionGuard.js` — verhindert das Laden inkompatibler Saves ohne Migration.

---

## 3. Tick-Pipeline

Jeder Engine-Tick ist eine reine Funktion `tick(now, state) → { decisions, uiModel, telemetry, persistence }`. Sie hat **zehn Phasen**, alle deterministisch und individuell unit-testbar.

### 3.1 Pipeline-Übersicht

```
1. INPUT          ── Snapshot, RunState, PlayerProfile, RecentLog
2. SAFETY         ── State-Konsistenz, Schemaversion, Save-Sanity
3. RESOLVE OPEN   ── offene Ketten/Eskalationen weiterführen
4. ELIGIBILITY    ── Filterstufe pro Eventkandidat
5. PRESSURE       ── Druck-Komponenten und specificPressure berechnen
6. SCORE & RANK   ── Kandidaten gewichten, sortieren, Konflikte auflösen
7. CURATOR        ── Pacing, Story-Beats, Eventbudget anwenden
8. COMMIT         ── ausgewähltes Event aktivieren / Ruhe verordnen
9. AFTERMATH      ── nach Player-Choice: Outcome, Mutationen, Folge-Hooks
10. OUTPUT        ── uiModel, telemetry, persistence packen
```

Phasen 1–8 laufen jeden Tick. Phase 9 läuft nur, wenn UI eine Choice meldet. Phase 10 läuft immer.

### 3.2 Phase 1 — INPUT

Eingaben:
- `snapshot = buildShadowSnapshot(state)` (bestehend in `eventShared.js`, wird von V2 wiederverwendet).
- `runState = state.events.runState` (Story-Budget, Story-Beats-Plan, Eskalations-Tracker).
- `playerProfile = state.events.playerProfile` (KnowledgeProfile, KompetenceMap, PreferenceFlags, Modus).
- `recentLog = state.events.foundation.memory.events.slice(-20)` (jüngste Events).
- `pendingChains = state.events.foundation.memory.pendingChains`.

Ausgabe an Phase 2: ein **eingefrorener** Tick-Context. Ab hier wird nichts mehr aus `state` gelesen; jede Phase bekommt nur den Context plus eigene Hilfsdaten.

### 3.3 Phase 2 — SAFETY

Prüfungen:
- Schema-Versions-Match. Bei Mismatch → `noOp` Tick und `migration_required` Telemetry.
- Snapshot-Konsistenz (kein NaN in Status, Stage 1..12).
- Run-State-Vollständigkeit. Fehlende Felder → mit Defaults auffüllen, Warning ins Log.
- Notfall-Stop bei `state.deathState !== null` (kein neues Event auf toter Pflanze; nur Resolution-Pfade weiterlaufen).

### 3.4 Phase 3 — RESOLVE OPEN

Bevor neue Events erwogen werden, kümmert sich der Tick um **Bestand**:
- **Aktive Eskalation:** Eskalationsstufe anhand `afterSimHours` neu klassifizieren.
- **Pending Chains fällig?** Wenn `now >= chain.activatesAtRealTimeMs`, Folge-Event als „erzwungener Kandidat" markieren (höchste Priorität in Phase 6).
- **Verfallene Ketten** (`expiresAtRealTimeMs <= now`) sanft beenden (`endsChainAs: neutral`).
- **Aftermath-Wirkung** noch laufender Optionen anwenden (graduelle Effekte über `applyOver.simHours`).

Wichtige Regel: **Eine fällige Kette schlägt jeden neuen Kandidaten.** Damit fühlen sich Geschichten wie versprochen an.

### 3.5 Phase 4 — ELIGIBILITY

Pro Eventkandidat aus dem Catalog:
- Phase-Whitelist (`allowedPhases`).
- Stage-Range (`triggers.stage.min/max`).
- Setup-Constraint (`triggers.setup.modeIn`).
- Constraint-Block (`eligibility.constraints` inkl. Klima- und Wurzelzonen-Grenzen).
- PlayerProfile-Gate (`eligibility.playerProfile`).
- Cooldowns: per Event, per Category, Repeat-Penalty der letzten 6 Events.
- Contradictions: Konfliktgruppen sperren parallele Events.
- Trigger-Signal (`getTriggerSignalScore` aus bestehender `eventShared.js`, ergibt 0..1).

Ausgabe: Liste `eligibleCandidates[] = { eventDef, signalScore, reasons }`.

### 3.6 Phase 5 — PRESSURE

Berechnet pro Druckkanal (water_dry, water_wet, humidity_high, …) einen Aggregatwert aus dem Snapshot. Verwendet weiterhin die bestehenden Formeln aus `eventPressure.js`, ergänzt um:

- **Stresshistorie:** Letzte 24 Sim-Stunden Stressmittel modulieren `negativePressure` um ±15 %.
- **Klima-Instabilität:** wachsende `instabilityScore` erhöht `environmentPressure`.
- **Vorherige Entscheidungen:** Wer kürzlich „delay_action" gewählt hat, bekommt eine kleine Erhöhung des entsprechenden Druckes (Konsequenz fühlt sich greifbar an).
- **Recovery-Bonus:** Wenn `stableWindow.stableHours >= 2`, sinkt der Negative-Pressure-Floor; Belohnungs-Beats werden möglich.

### 3.7 Phase 6 — SCORE & RANK

Pro Kandidat:
```
score =
    0.40 * categoryPressureMatch          // Druck im aktuellen Hauptsignal
  + 0.30 * specificPressure               // Event-spezifische Formel
  + 0.20 * triggerSignalScore             // Trigger-Bedingungen
  + 0.05 * weight                         // Designer-Gewicht
  + 0.05 * playerProfileBoost             // KP-/Mode-Boost
  - repetitionPenalty
  - polarityFatiguePenalty                // viele negative in Folge → Dämpfung
  - storyBudgetPenalty                    // Kategorien-Quote überschritten
```

Klassifikation: `>= 60 active`, `>= 45 warning`, sonst `latent`.

Sortierung: Score desc → State desc → Tiebreaker (deterministisch über `deterministicUnit(seed, eventId)`).

Konflikte: `eventContradictions.resolveCandidateConflicts` reduziert die Liste.

### 3.8 Phase 7 — CURATOR

Curator nimmt das ranked-list, fragt:
1. **Steht jetzt ein Story-Beat an?** → Story-Beat überschreibt.
2. **Habe ich Pacing-Schulden?** → Wenn die letzte Krise weniger als `minQuietSimHours` her ist, **alles ablehnen**.
3. **Bin ich über Eventbudget heute?** → Nur Belohnung/Story zulassen.
4. **Brauche ich einen Lernbeat?** → Wenn Lernanteil-Quote unter Soll, bevorzuge Kandidaten mit `learning_beat`-Tag.
5. **Ist die ausgewählte Kategorie zu häufig vertreten?** → Auf zweite/dritte Wahl ausweichen.

Curator gibt **eines** der Folgenden zurück:
- `selected: candidate` (eintreten)
- `selected: null, suggestQuietWindow: simHours` (verordne Stille)
- `selected: storyBeat` (Beat einschieben)

### 3.9 Phase 8 — COMMIT

Wenn `selected` vorhanden:
- Aktivierungs-Datensatz schreiben (`state.events.machineState = activeEvent`, `activeEventId`, …) — als **Mutation** im Output, nicht direkt.
- Cooldown-Stamps setzen.
- Eskalations-Tracker initialisieren.
- Telemetry: `event_impression`.

Wenn `selected: null`:
- Optional Belohnungs-Beat anstoßen, falls `evaluateRewardEligibility` grün.
- Sonst Tick endet ohne Eventänderung.

### 3.10 Phase 9 — AFTERMATH (nur bei Player-Choice)

Aufgerufen aus `engineV2.handleChoice(eventId, optionId, now)`:
- `findOptionById` und `gradeOptionOutcome` (bestehend, in V2 portiert).
- `aftermathProfile.perOutcomeQuality[<quality>]` anwenden:
  - `plantStateMutations` → an `Persistence Layer` als Mutation.
  - `knowledgeProfileGains` → KP-Update.
  - `permanentMarkers` → in `runState.permanentMarkers`.
  - `runChronicleTags` → in der Run-Chronik.
- Folge-Hooks aktivieren:
  - `escalationProfile.poorOutcomeHooks` und `unresolvedHooks` zu Pending-Chains umsetzen.
  - `chainHooks.advancesChainsOnOutcome` für offene Ketten anwenden.
- Coach-Packet bauen (Outcome-Zeile + ggf. Lernhinweis).
- Score-Reward in `runState.score` schreiben.

### 3.11 Phase 10 — OUTPUT

Pakete:
- `uiModel`: Popup-Daten (Cover, Symptom, Optionen, Risk-Reward-Chips), Banner (Eskalation, Kette), Akte-Update, Coach-Stub, MediaModel.
- `telemetry`: alle Player-Telemetry-Datensätze, plus QA-Routing-Beobachtungen.
- `persistence.mutations`: gesammelte Veränderungen, von `app.js` bzw. dem Boot-Layer angewandt.

### 3.12 Wie die Pipeline „Eventflut" verhindert

Vier ineinandergreifende Bremsen:
1. **Kategorie-Cooldown** (bestehend, V2 ergänzt).
2. **`polarityFatiguePenalty`** in der Score-Formel.
3. **Curator-Pacing** (`minQuietSimHours`, `dailyEventBudget`).
4. **Pending-Chain-Vorrang** — verhindert, dass parallele neue Events alte Geschichten überschreiben.

Ergebnis-Ziel: 12–18 Events pro 56-Sim-Tage-Run, kein Sim-Tag mit > 2 Events.

---

## 4. Realismus-Regeln

Diese Regeln sind die **inhaltliche Brücke** vom rein numerischen Druck zur „fühlt sich wie ein echter Coach an"-Erfahrung. Sie werden in der Engine als gewichtete Modulatoren oder als Hard-Gates umgesetzt.

### 4.1 Indoor / Outdoor / Greenhouse-Trennung

- **Hard-Gate:** `triggers.setup.modeIn` filtert. Ein Outdoor-Sturm ist im Indoor-Setup nicht eligible.
- **Soft-Gewichtung:** Outdoor-Setups erhöhen das Gewicht von Wetter-/Insekten-Events; Indoor-Setups das von Klimakontroll-Fehlern und Lichtbrand.
- **Greenhouse:** Mischmodus, beide Pools möglich, aber Wetter abgeschwächt (gedämpft × 0.6).

### 4.2 Pflanzenphase (Stage)

- Stage-Range pro Event ist **Pflicht** (`triggers.stage.min/max`).
- Stage modifiziert Druck:
  - Vegetativ (Stage 3–5): höhere Wassertoleranz, niedrige Krankheitsanfälligkeit.
  - Streckung (Stage 6–7): hohe Empfindlichkeit für Lichtbrand und Klimaschwankung.
  - Blüte (Stage 8–10): starke Empfindlichkeit gegen Feuchte → `humidity_high` Druck × 1.4.
  - Reife (Stage 11–12): jeder Stress wirkt schwerer; Curator reduziert Eventdichte um 30 %.

### 4.3 Pflanzengröße

`plantSize` (0..100, abgeleitet aus Stage + Progress) beeinflusst:
- Schädlingsdruck (kleine Pflanzen sind verletzlicher).
- Wasserzyklus (große Pflanzen brauchen mehr).
- Trainings-Events erst ab `plantSize >= 25`.
- `eligibility.constraints.minPlantSize` erlaubt feine Gates pro Event.

### 4.4 Klima

Direkte Eingangsgrößen aus `snapshot.environment`:
- Temperatur (10..40 °C).
- Luftfeuchte (0..100 %).
- VPD (0.4..2.4 kPa) — wichtigste Druckquelle in Stage 6+.
- Airflow-Score (0..100).
- Instability-Score (Schwankungen über 24 h).

Realismus-Tabelle (Auszug):

| Phase | VPD-Sweet-Spot | High-Risk-Trigger |
|---|---|---|
| Seedling | 0.6–0.9 kPa | < 0.4 oder > 1.2 |
| Vegetativ | 0.8–1.2 kPa | > 1.6 |
| Blüte | 0.9–1.3 kPa | < 0.7 (Schimmel) oder > 1.6 (Stress) |

VPD-Verletzungen erhöhen den `environmentPressure` linear; >= 24 h außerhalb des Bands triggern eine Klima-Lernkarte.

### 4.5 Licht

Snapshot trägt vorerst keinen direkten Lux-Wert, aber:
- `setup.lampTypeIn` und `setup.lightHours` werden aus dem bestehenden Setup gelesen.
- Lichtbrand-Risiko skaliert mit `setup.lampPower` × `plantHeightProximity` (vom Care-System geliefert).
- Dunkel-Phasen-Verletzungen (Licht in der Nachtphase) sind in Stage ≥ 8 ein eigener Trigger (`flowering_dark_period_violation`).

### 4.6 Wasser

- `status.water` 0..100. Trockenstress-Druck wächst exponentiell unter 30.
- Topf-Größe (`setup.potLiterIn`) moduliert Druckskalierung.
- Über-Wässerung wird über `risk` und `oxygenPercent` (Wurzelzone) erkannt.

### 4.7 Nährstoffe

- `status.nutrition`, `controls.ec`, `controls.ph` zusammen ergeben den Nährstoff-Druck.
- pH-Drift > 0.6 in 12 h → Lockout-Druck steigt.
- EC-Spike > 0.6 in 6 h → Salt-Buildup-Risiko.
- Stage-bewusste Soll-NPK-Werte (separate Tabelle in `07_balancing.md`).

### 4.8 Stresshistorie

`runState.stressHistory[]` ist ein Ringpuffer der letzten 168 Sim-Stunden:
- Mittlerer Stress > 35 in den letzten 24 h → globale Empfindlichkeit × 1.2.
- Stresszacken > 70 hinterlassen `permanentMarkers.stage_stress_memory` — bremsen Final-Yield.
- Curator zieht aus dieser Kurve seinen Pacing-Bedarf.

### 4.9 Vorherige Entscheidungen

`runState.recentResolutions[]` enthält die letzten 12 Entscheidungen mit `optionId`, `intent`, `quality`. Modulationen:
- Drei `delay_action` in Folge → Curator zieht mindestens ein Lernevent vor („Was ist Aufschieben?").
- Wiederholtes `heavy_water_push` bei Trockenheit → Erhöhung von `risk` und `oxygenPercent`-Druck (Folgeevent „Staunässe").
- Erfolgreiche `gradual_*`-Optionen erhöhen den `mastery`-Wert in der KompetenceMap → späte Events werden nuancierter.

### 4.10 Ein wichtiges Anti-Muster

Die Engine darf Events **nicht** als „Strafe" einsetzen. Wenn ein Spieler oft falsch entscheidet, wird das Lernsystem aktiver, aber Eventdichte oder Schwere steigen **nicht**. Nichts an Grow Simulator soll sich wie eine Spirale anfühlen.

---

## 5. Event-Chain-Architektur

Eine Kette ist eine **deklarative Datendatei** (`*.chain.json`). Die Engine interpretiert sie zur Laufzeit; keine Sonderlogik pro Kette.

### 5.1 Lebenszyklus einer Kette

```
preconditions match → chain instance born → step1 active
            ↓
        step1 outcome → transitionsOnOutcome → step2 scheduled (with delay)
            ↓
        step2 active when delay elapsed
            ↓
        … bis transitionsOnOutcome.endsChainAs ∈ {success|failure|neutral}
```

### 5.2 Startbedingungen

- `chain.preconditions` werden bei jedem Tick gegen Snapshot geprüft.
- Eine Kette startet **nur über** ein Event, das `chainHooks.startsChain: <chainId>` trägt.
- Automatischer Start ohne Auslöser-Event ist nicht erlaubt — Premium-Geschichten brauchen einen narrativen Funken.

### 5.3 Eskalationsstufen pro Schritt

Jeder Step verweist auf ein Event, das selbst seine `escalationProfile.stages` mitbringt. Der Chain-Layer **respektiert** die Eskalation des Events; er addiert nichts hinzu.

### 5.4 Auflösung

`endsChainAs`:
- `success` → kosmetische Belohnung, Score-Bonus, Eintrag in Run-Chronik mit Tag `chain_resolved`.
- `failure` → permanenter Run-Marker, Score-Malus, optional Coach-Reflexion.
- `neutral` → keine Effekte, sauberer Abschluss.

### 5.5 Nachwirkungen

Auch nach Kettenende gilt der Aftermath des letzten Schritts. Zusätzlich kann eine Kette eine **„Reflexions-Lernkarte"** anstoßen (`chain.summary` plus `learningCard.ref`).

### 5.6 Coach-Erklärungen nach schlechten Entscheidungen

Spezielle Logik im Coach Layer:
- Wenn ein Step mit `poor_outcome`/`no_action` endet, wird **keine** sofortige Bestrafung kommuniziert. Stattdessen:
  - Coach-Zeile in der Outcome-Karte: ruhig, partnerschaftlich.
  - Wenn `coachingNeed[<dimension>]` einen Schwellwert erreicht: Lernkarte als optionale Zugabe, nicht als Modal-Wand.
  - Bei Critical-Step ohne Lösung: Coach bietet **Diagnose-Übung** an („Möchtest du einmal selbst nachsehen, was hier schiefgegangen ist?") — öffnet die Mistake-Analysis-Ansicht.

### 5.7 Maximal-Parallelität

- Maximal **eine** offene Krisen-Kette pro Pflanze.
- Eine offene Belohnungs-Kette darf parallel laufen.
- Eine offene Story-Beat-Kette (z. B. „Trichom-Reife") darf parallel laufen.

---

## 6. Lernsystem

### 6.1 Knowledge Profile

Datenstruktur:
```js
playerProfile.knowledgeProfile = {
  water_basics:        0.42,
  humidity_vpd:        0.18,
  nutrient_lockout:    0.05,
  pest_recognition:    0.0,
  flower_humidity_risk: 0.31,
  // … weitere Dimensionen
}
```

Werte von 0..1. Anstieg über `learningCard.gainOnFirstView` und `aftermathProfile.knowledgeProfileGains`. Dämpfung über Decay nicht vorgesehen — Wissen verblasst nicht im Spiel.

### 6.2 KompetenceMap

Parallel zum Wissen wird Verhalten getrackt:
```js
playerProfile.kompetenceMap = {
  water_dry: { attempts: 7, optimal: 5, mistakes: 1, lastAt: simTime },
  humidity_high: { attempts: 3, optimal: 2, mistakes: 1 },
  …
}
```

Die KompetenceMap füttert die Pressure-Phase (Phase 5) mit dem Modulator „Spieler beherrscht das Thema schon → Engine sucht Variation".

### 6.3 Anfänger-/Geführt-/Profi-Modus

| Aspekt | Anfänger | Geführt | Profi |
|---|---|---|---|
| Eventbudget/Sim-Tag | 1.0 | 1.4 | 1.8 |
| Eskalations-Lead-Time | × 1.5 | × 1.0 | × 0.7 |
| Coach aktiv? | ja, ausführlich | ja, knapp | nein |
| Diagnose verfügbar | always | rationed | tools_only |
| Empfohlene Option markiert | ja | nein | nein |
| Mehrdeutige Symptome | nein | manchmal | oft |
| Doppel-Krisen erlaubt | nein | selten | ja |
| Pflanzentod < Stage 3 möglich? | nein | nein | nein |

Der Modus ist eine `runState.mode`-Eigenschaft und kann zwischen Runs gewechselt werden.

### 6.4 Lernkarten

Lifecycle:
1. `presentationPolicy` prüft `alreadySeenIds` und Modus.
2. Wenn Erstauftritt: vor Decision (Anfänger), nach Outcome (Geführt), nie automatisch (Profi).
3. „Verstanden"-Klick aktualisiert `gainOnFirstView`.
4. Wiederaufruf nur über die Bibliothek, dann mit `gainOnLaterView` (klein).

Wiederholungs-Schutz:
- **Innerhalb eines Runs** maximal 2 automatische Lernkarten pro 24 Sim-Stunden.
- **Über Runs hinweg** maximal 1 automatische Wiederholung derselben Karte pro 7 Spielsitzungen.

### 6.5 Fehleranalyse

Trigger: jedes `quality ∈ {poor_outcome, no_action}` mit Schweregrad ≥ `warning`.

UI: ein zarter Banner unter der Outcome-Karte: „Lust auf eine kurze Auswertung?" — niemals Modal.

Inhalt:
- Was geschah (Symptom, Wahl, Outcome).
- Welche Signale gab es vorher (aus Snapshot-Vorgeschichte).
- Welche Optionen wären besser gewesen (aus `recommendedIn`-Markierung).
- Welcher Lerninhalt vertieft das (Lernkartenvorschlag).

Engine-seitig: `mistakeAnalysis.buildAnalysis(eventDecision, playerProfile)` produziert ein UI-Datenpaket.

### 6.6 Wiederholung ohne Nervfaktor

Kernregel: **Coach und Lernsystem dürfen sich pro Sim-Tag maximal zweimal melden, pro Eskalation maximal einmal.**

Implementierung:
- `playerProfile.coachLog` als Ringpuffer.
- `presentationPolicy.canSpeak(now, topic)` zentralisiert die Prüfung.
- Curator unterstützt mit „Quiet Window"-Verordnung.

---

## 7. Asset-Architektur

### 7.1 WebP-Erstpräferenz

- Neue Cover-Assets werden als WebP geliefert (qualität 80, max 1024 × 1024).
- PNG-Bestand bleibt erhalten, aber Resolver bevorzugt WebP wenn vorhanden.
- Pixel-Art-Sprites bleiben PNG (verlustfrei, klein).

### 7.2 Asset-Reuse

Asset-Tag-System:

```jsonc
"assets": {
  "cover": {
    "kind": "image",
    "src": "assets/events/water/dry_pot_cover.webp",
    "altKey": "alt.events.v3_water_dry_pot.cover",
    "fallback": "assets/events/_placeholder/cover.webp",
    "tags": ["water", "stage:vegetative-flowering", "indoor"]
  }
}
```

Tags ermöglichen es dem Resolver, Assets unter Events zu teilen. Z. B. trägt `assets/events/water/dry_pot_cover.webp` Tags, die auch `v3_water_overwater_warning` mit einer Variation matchen, wenn dort kein eigenes Cover existiert.

### 7.3 Fallback-Kette

```
Event-spezifischer src
   ↓ fehlt
Tag-Match in Asset-Pool
   ↓ kein Match
Kategorie-Default in assets/events/<category>/_default.webp
   ↓ fehlt
Globaler Placeholder assets/events/_placeholder/cover.webp
```

Engine-Resolver liefert in **jedem** Fall ein gültiges Bildreferenz-Objekt — UI bricht nie auf.

### 7.4 Lazy Loading

- Cover-Assets werden **on-demand** beim Modal-Open geladen, nicht beim Catalog-Laden.
- Stage-spezifische Preloader: vor Stage-Übergang die wahrscheinlichsten Assets der nächsten Stage in den Browser-Cache.
- Sprites-Overlays (Eskalationsstufen) werden geclumpt zu einem Spritesheet pro Eskalations-Set.

### 7.5 Responsive Größen

Drei Größenvarianten pro Cover:
- `cover@1x` (512 × 512) für kleine Modals und Listen.
- `cover@2x` (1024 × 1024) für Standard-Modal.
- `cover@3x` (1536 × 1536) für High-DPI / Tablet.

Naming-Konvention: `dry_pot_cover@2x.webp`. Resolver wählt anhand `window.devicePixelRatio` und Modal-Höhe.

### 7.6 Doublet-Migration

Die existierenden Doppel-Assets (`event-co2-enrichment.png` + `-2`, `-overwatering.png` + `-event.png`) werden in den V2-Ordner **nicht** mehrfach übernommen. Migration läuft nach folgendem Schema:
- Reviewer entscheidet pro Pärchen, welches besser ist.
- Die schlechtere Datei wandert nach `assets/events/_attic/` (read-only, später entfernbar).
- Eine `data/events/legacy/asset-doublets.md` dokumentiert die Entscheidungen (siehe `00_current-system-audit.md`).

---

## 8. Save-Format und Migration

### 8.1 Was gespeichert werden muss

Pro Save:
- `state.events.machineState`, `activeEventId`, `activeOptions[]`, `activeSeverity` (bestehendes Format, beibehalten).
- `state.events.scheduler.eventCooldownsSim`, `categoryCooldownsSim`.
- `state.events.foundation.memory.events[]` (History-Liste).
- `state.events.foundation.memory.pendingChains{}`.
- `state.events.foundation.flags{}`.

Neu in v3:
- `state.events.runState`:
  - `mode: "beginner|guided|pro"`.
  - `storyBudget: { eventsToday, eventsTotal, dailyCapacity }`.
  - `storyBeatPlan: [{ beatId, etaSimDay, completed: bool }]`.
  - `permanentMarkers: ["botrytis_scar", "stage_water_stress_memory"]`.
  - `recentCoachLog` (Ringpuffer 24 Zeilen).
  - `stressHistory` (Ringpuffer 168 Sim-Stunden).
  - `recentResolutions` (Ringpuffer 12 Entscheidungen).
- `state.events.playerProfile`:
  - `knowledgeProfile`.
  - `kompetenceMap`.
  - `preferenceFlags` (z. B. `prefersHints`, `prefersImages`).
  - `learningCardsSeen` (Set/Array von IDs).

### 8.2 Save-Versionierung

Header:
```js
state.events.saveSchemaVersion = 3
```

`schemaVersionGuard` führt die Migration aus, sobald ein Save mit niedrigerer Version geladen wird:
- v1 → v3: über v2 als Zwischenschritt.
- v2 → v3: direkt.

### 8.3 Wie Legacy-Saves kompatibel bleiben

- Migrations-Adapter ist **idempotent**: Mehrfach-Anwendung produziert dasselbe Ergebnis.
- Felder, die in v3 neu sind, werden mit sicheren Defaults befüllt (`mode: "guided"`, `knowledgeProfile: {}`).
- Aktive v1/v2-Event-IDs werden über die `migration.supersedes`-Tabelle der Events gemappt. Fehlt ein Mapping, wird das Event sanft beendet (`endsChainAs: neutral`, kein Score-Malus).
- Pending-Chains aus alten Saves, die in v3 keine entsprechende Chain-Datei haben, werden mit `expiresAtRealTimeMs: now` ablaufen gelassen.
- Cooldowns werden 1:1 übernommen.

### 8.4 Wie alte Runs geschützt werden

- **Read-only-Modus** für sehr alte Saves (`saveSchemaVersion < 1`): Der Spieler kann den Run noch ansehen, aber nicht weiterspielen, bis er eine explizite Migrationsbestätigung gibt.
- **Backup-vor-Migration:** Vor jeder Migration legt der Adapter `state.events.__migrationBackup` mit dem alten Stand an. Bei Problemen kann der Spieler im Settings-Menü „Auf vorherige Version zurücksetzen" wählen (nur einmal).
- **Telemetry:** Migrationen werden mit `migration_outcome: success|fallback|aborted` geloggt.

---

## 9. Feature-Flags und Cutover-Strategie

Vier Phasen, kontrolliert über die bestehende `eventFeatureFlag.js` plus eine neue Konstante für den V2-Engine-Anteil.

### 9.1 Phase A — Legacy bleibt Authority

- `mode: "legacy"` aktiv.
- V2-Engine **lädt sich**, wird aber **nicht** in den Tick eingehängt.
- Catalog-Validator in `dev/events-v2/validate-catalog.js` läuft bei jedem Build.
- Acceptance: keine Verhaltensänderung im Spiel.

### 9.2 Phase B — Shadow-Mode

- `mode: "shadow"` aktiv.
- V2-Engine bekommt jeden Tick zusätzlich, produziert ihre `decisions`-Objekte, **schreibt aber keine Mutationen**.
- Telemetry vergleicht V2-Vorschlag mit Legacy-Aktion (`shadow_divergence_*`).
- Acceptance: 50-Run-Replay zeigt < 5 % Divergenz in den Hauptkategorien.

### 9.3 Phase C — Internal Soft-Cutover (begrenzt)

- `mode: "internal-soft-cutover"`.
- V2 übernimmt **eingegrenzte Verantwortlichkeiten**:
  - Asset-Resolution (`media-model-packaging`).
  - Coach-Stub (`coach-line-packaging`).
  - Ketten-Banner (`chain-banner-packaging`).
- Activation, Choice-Resolution und Plant-State bleiben Legacy.
- Acceptance: Soak-Test 30 Sitzungen, kein Regressions-Crash, Spielergefühl unverändert.

### 9.4 Phase D — Full Cutover

- `mode: "new"`.
- V2 übernimmt vollständig. Legacy bleibt als Fallback unter `eventFeatureFlag.rollback()` erhalten, aber nicht aktiv.
- Acceptance: 50-Run-Vergleich, KPI-Bänder aus `08_telemetry.md` getroffen, keine offenen Severity-`critical`-Bugs.
- Nach Phase D wird Phase C abgeschaltet, die Soft-Cutover-Konstanten entfernt.

### 9.5 Rollback-Pfad

Jeder Spieler hat über Settings → Erweitert → „Event-Engine zurücksetzen" Zugriff auf einen Hard-Rollback auf Legacy. Nach Rollback werden V2-spezifische Felder gepflegt, aber nicht gelesen — bis zum nächsten Cutover.

---

## 10. Risiken und Schutzmaßnahmen

| # | Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Schutzmaßnahme |
|---|---|---|---|---|
| R1 | V2- und Legacy-Engine driften, Saves werden inkonsistent | hoch | hoch | Strenge Mutations-Disziplin, V2 schreibt nur über Mutations-Objekt; Schema-Guard; Backup vor Migration |
| R2 | Curator unterdrückt zu viele Events, Spiel fühlt sich leer an | mittel | mittel | Mindest-Eventbudget, automatischer Fallback auf Legacy-Pacing wenn Tagesbudget < 0.7 erreicht |
| R3 | Coach wirkt nervig | mittel | hoch | Strenge Wiederholungsbremse, Modus-Stummschaltung (Profi), Telemetrie-KPI „coach_dismiss_rate" |
| R4 | Lernkarten werden nicht gelesen | mittel | mittel | A/B-fähige Presentation-Policy, Erstauftritt vor Decision (Anfänger), nicht überspringbar |
| R5 | Save-Migration verliert aktive Events | niedrig | hoch | Pre-Migration-Backup, Test-Suite für Migration in `09_testing-plan.md` |
| R6 | Asset-Lazy-Loading führt zu Modal-Verzögerung | mittel | mittel | Preload bei Stage-Übergang, Placeholder bei Ladezeit > 200 ms |
| R7 | Story-Beats triggern zu früh oder zu spät | mittel | mittel | StoryBudget mit `etaSimDay`-Toleranzfenster, Manueller Override im Curator |
| R8 | Telemetrie sammelt sensitive Daten versehentlich | niedrig | sehr hoch | Whitelist-basierte Telemetrie, Code-Review-Pflicht, ausschließlich Schemata aus `kpiBuckets.js` |
| R9 | Ketten enden in Endlosschleifen | niedrig | hoch | Zwingender `endsChainAs`-Endpunkt im Schema; Validator prüft Erreichbarkeit; Maximum 6 Schritte pro Kette |
| R10 | Übermäßige Eskalation tötet Pflanzen frustig | mittel | hoch | Modus-Schwellenwerte, Anfänger-Sicherheitsnetz erste 7 Sim-Tage |
| R11 | Kategorien-Verteilung kollabiert (alle Events sind „water") | mittel | mittel | `storyBudgetPenalty` in Score-Formel, Validator prüft Catalog-Verteilung |
| R12 | Plugin-/MCP-Layer bringt fremde Daten in den Tick | niedrig | hoch | Engine akzeptiert nur whitelisted Felder im Snapshot; alles andere wird vor Phase 1 gestrippt |

---

## 11. Codex-Auftrag #004

Codex implementiert in diesem Schritt **noch keine** Engine-Logik. Der Auftrag legt das **Grundgerüst** der V2-Engine an, plus den **Catalog-Validator**, der ohne Lade-Pfad als CLI laufen kann.

### 11.1 Ziele

1. V2-Modul-Skelette anlegen — leere, dokumentierte Funktionen mit `describeContract()`.
2. Catalog-Validator schreiben (`dev/events-v2/validate-catalog.js`), der gegen die Schemas aus `data/events/catalog/_schema/` prüft.
3. Architektur-Doku in den Modulen über JSDoc spiegeln.

### 11.2 Erlaubte Aktionen

1. Neue Dateien anlegen unter `src/events/v2/**` (alles **leer/Skelett**).
2. Neue CLI-Tools unter `dev/events-v2/`.
3. JSDoc-Kommentare im Skelett-Code.
4. Einen `package.json`-`scripts`-Eintrag `"validate:events-v2": "node dev/events-v2/validate-catalog.js"` ergänzen — **nur diesen einen Eintrag**, kein anderer Build-Hook.

### 11.3 Verbotene Aktionen

- Keine Änderungen an `app.js`, `src/events/<legacy>`, `data/events.json`, `data/events.v2.json`, `src/i18n/**`, `test/**`.
- Keine Tests anlegen (kommen mit Auftrag #007).
- Kein Lade-Code, der den Catalog ins Spiel zieht.
- Keine Locales anfassen.
- Keine bestehenden Eventdaten migrieren.

### 11.4 Zu erstellende Skelette unter `src/events/v2/`

```
src/events/v2/
  core/
    engineV2.js            ← exportiert tick(), handleChoice(), describeContract()
    snapshot.js            ← exportiert buildEngineSnapshot(state) (delegiert vorerst an legacy eventShared.js)
    curator.js             ← exportiert curate(rankedCandidates, runState, profile, simNow)
    scheduler.js           ← exportiert nextEventEta(runState)
  selection/
    eligibility.js         ← exportiert evaluateCatalog(...)
    scoring.js             ← exportiert scoreCandidates(...)
    contradictions.js      ← exportiert resolveCandidateConflicts(...)
    cooldowns.js           ← exportiert isEventBlocked(...), getRepetitionPenalty(...)
  lifecycle/
    activation.js
    escalation.js
    resolution.js
    rewards.js
    chains.js
  content/
    catalog.js             ← exportiert loadCatalog(rootPath), getEventById(id), getChainById(id)
    assets.js              ← exportiert resolveAssetRef(ref, options)
    i18nBridge.js          ← exportiert resolveLocalizedRef(ref, locale, fallbackLocale)
  persistence/
    saveAdapter.js
    migration_v1_v2_to_v3.js
    pruning.js
    schemaVersionGuard.js
  telemetry/
    playerTelemetry.js
    qaSamplingBridge.js
    kpiBuckets.js
  coach/
    coach.js
    presentationPolicy.js
    mistakeAnalysis.js
  learning/
    knowledgeProfile.js
    learningCardIndex.js
  ui/
    modalModel.js
    chainBanner.js
    analysisCard.js
  README.md                ← „V2-Engine, noch nicht aktiv; gestartet mit Auftrag #004."
```

Jede Datei beginnt mit:

```js
'use strict';
/**
 * Layer: <Layer-Name>
 * Source-of-Truth: docs/event-system-v2/03_architecture.md, Abschnitt <X.Y>
 * Status: SKELETON — keine Logik aktiv. Kein Konsument außer Tests.
 */

(function initModule(globalScope) {
  const api = Object.freeze({
    describeContract() {
      return Object.freeze({
        layer: '<Layer>',
        version: 'v3-schema-skeleton',
        functions: ['<list>']
      });
    }
    // weitere Stub-Funktionen geben { skeleton: true } zurück
  });

  globalScope.GrowSimEventV2_<Module> = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
```

### 11.5 Catalog-Validator (`dev/events-v2/validate-catalog.js`)

Pflichtfunktionen:
- Lade alle Schemas aus `data/events/catalog/_schema/`.
- Compile via `ajv` (zur Bestätigung der Draft-07-Korrektheit).
- Iteriere `data/events/catalog/_examples/` — jede Datei wird gegen das passende Schema validiert (`*.event.json` → event.schema, `*.chain.json` → chain.schema, `*.learning-card.json` → learning-card.schema).
- Zusatzregeln (über Schema hinaus):
  - Unique IDs.
  - Asset-Pfade vorhanden ODER `fallback` gesetzt.
  - Kein Live-Catalog-Verzeichnis lesen — Validator arbeitet **nur** im Examples-Ordner.
- Ausgabe als Mensch-lesbarer Bericht plus `--json` für CI.

CLI:
```bash
node dev/events-v2/validate-catalog.js --strict
node dev/events-v2/validate-catalog.js --root data/events/catalog/_examples
node dev/events-v2/validate-catalog.js --json > out/validation-report.json
```

### 11.6 Akzeptanzkriterien

1. `node --check` über alle neuen Dateien ✅.
2. `node dev/events-v2/validate-catalog.js` läuft erfolgreich gegen `_examples/`.
3. Jeder Skelett-Modulexport gibt `describeContract()` zurück; alle anderen Funktionen liefern `{ skeleton: true }`.
4. Bestehende Tests laufen unverändert.
5. `git status` zeigt nur Neu-Dateien plus den **einen** Eintrag in `package.json`-`scripts`.
6. Kein Lade-Pfad zur V2-Engine in `app.js`.
7. Validator erkennt absichtlich kaputt gemachte Beispieldatei (Codex erstellt im Beispielordner einen `_negative_examples/` mit einem fehlerhaften JSON; Validator soll diesen erkennen, aber per Default überspringen — nur mit `--include-negatives` läuft er drüber).

### 11.7 Übergabe

Codex liefert:
- Liste aller neuen Dateien.
- Beispiel-Output des Validators (positiv und mit `--include-negatives`).
- Aktualisierten `docs/event-system-v2/03_architecture.md` Abschnitt 11.6 falls Schritte konkretisiert werden mussten — oder eine separate `03a_codex_notes.md`.

Direkt nach #004 folgt **Auftrag #005 — Catalog-Loader und Read-only Engine-Anbindung an `app.js`** (separates Briefing, nicht Teil dieses Dokuments).

---

## 12. Anhang — Architektur-FAQ

**Warum baut V2 nicht einfach in `app.js` weiter?**
Weil `app.js` >14k Zeilen hat. Jede neue Funktion dort verzehnfacht das Drift-Risiko zur Legacy-Engine. V2 lebt in `src/events/v2/`, `app.js` bekommt nur einen schmalen Boot-Layer.

**Warum ein Curator zusätzlich zur Engine?**
Weil Score+Cooldown allein „Premium-Pacing" nicht erzeugen können. Der Curator ist die kuratorische Stimme über der reinen Numerik.

**Warum verschwindet `legacy` nicht sofort?**
Save-Stabilität. Phase A → D ist explizit konservativ designt.

**Wie passt das Coach Layer zum Engine Layer?**
Coach liest, schreibt nicht. Er erhält das Decision-Paket der Engine und produziert UI-Daten. Coach hat keinen Einfluss auf Eligibility oder Score.

**Wie wird verhindert, dass Coach zur „Hauptfigur" wird?**
Strenge Wiederholungsbremse, Profi-Stummschaltung, Telemetrie-KPI „coach_dismiss_rate". Wenn Spieler den Coach wegklicken, wird er leiser.

**Warum nicht JSON-Patching im Catalog laden?**
Performance und Determinismus. Catalog wird einmalig in den Speicher geladen, Schema-validiert, dann unveränderbar.

**Wie kommen neue Inhalte ohne Build-Schritt ins Spiel?**
Über `data/events/catalog/<category>/*.event.json`. Engine-Catalog-Loader liest beim Boot, Hot-Reload nur in Dev-Mode.

---

*Ende Architektur-Entwurf 03.*
