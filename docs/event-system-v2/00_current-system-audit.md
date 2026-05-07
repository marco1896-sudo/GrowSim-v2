# 00 — Current System Audit: Event-System (Grow Simulator)

**Status:** Audit-Entwurf, nur Lesen / Analysieren — keine Codeänderung.
**Zweck:** Bestehenden Stand verstehen, Risiken sichtbar machen, Grundlage für die Premium-Event-System-V2-Konzeption.
**Audit-Datum:** 2026-05-06
**Audit-Scope:** `src/events/`, `data/events*.json`, `app.js` (Event-relevante Teile), `test/event-*`, `dev/verify_event_*`, i18n, Asset-Registry.
**Nicht im Scope (separates Dokument):** Care-/Climate-System, Monetarisierung, Onboarding-Flows, allgemeine UI-Architektur.

---

## 1. Beteiligte Dateien (Datei-Inventar)

### 1.1 Engine-Module unter `src/events/`

Reine Funktion. Stand 2026-05-06.

| Datei | Verantwortung | Wichtige Exporte |
|---|---|---|
| `eventEngine.js` (sehr groß) | Orchestriert Feature-Flag, Shadow-Mode, QA-Sampling, ruft Sub-Module auf | `routeTick`, `getUiModel`, `onEventOptionClick`, `buildQaSamplingSummary` |
| `eventShared.js` | Math-/Snapshot-Helfer, Trigger-Auswertung (`field op value`), Stage/Setup-Constraints | `buildShadowSnapshot`, `getTriggerSignalScore`, `evaluateEventConstraints`, `deterministicUnit` |
| `eventFeatureFlag.js` | Vier Modi: `legacy`, `shadow`, `internal-soft-cutover`, `new` | `getMode`, `describeModeStatus`, `isShadowEnabled` |
| `eventEligibility.js` | Eligibility-Check pro Event (Phase, Stage, Constraints, Trigger-Signal) | `evaluateEvent`, `evaluateCatalog` |
| `eventActivation.js` | Scoring + Ranking der Kandidaten (Pressure, Signal, Repetition-Penalty) | `activateCandidate`, `scoreCandidate` |
| `eventPressure.js` | Latente Druck-Komponenten pro Kategorie (water/nutrition/env/disease/pest/positive) | `buildComponentScores`, `buildCategoryTargets`, `isRecoveryState` |
| `eventEscalation.js` | Zeitliche Eskalation: warning → escalating → escalated | `classifyEscalationStage`, `evaluateEscalation` |
| `eventCooldowns.js` | Per-Event-, Category- und Repeat-Cooldown | `isEventBlocked`, `getRepetitionPenalty` |
| `eventContradictions.js` | Verhindert konfligierende Events (z. B. „dry" + „wet" gleichzeitig) | `resolveCandidateConflicts` |
| `eventResolution.js` | Bewertet Spieler-Choices (Fit, Side-Effects, Outcome) | `findOptionById`, `classifyProblemPole` |
| `eventResolver.js` | Eingangspunkt aus UI für Choice-Verarbeitung (dünner Adapter) | unklar, ähnlicher Vertrag wie `onEventOptionClick` |
| `eventRewards.js` | Stable-Window-Tracking, Reward-Eligibility | `buildRewardState`, `evaluateRewardEligibility` |
| `eventChains.js` | Follow-Up-/Pending-Chain-Generation aus Hooks | `buildFollowUpCandidateFromHook`, `describePendingChain` |
| `eventAnalysis.js` | Narrative Templates für Outcome-Erklärung | `ensureAnalysisStore`, `injectAnalysisRecord` |
| `eventAnalysisRuntime.js` | Player-facing Analyse-Modell (Fit, Risiko, beitragende Faktoren) | `buildShadowAnalysis` |
| `eventMemory.js` | Event-History + Pending-Chains-Speicher (max 12) | `ensureMemory`, `addEvent`, `getLastEvents`, `getPendingChains` |
| `eventPersistenceAdapter.js` | Snapshot-Serialisierung (Save/Load), Versionierung, Stale-Pruning | `buildDefaultShadowRuntimeState`, `buildContractSnapshot`, `syncShadowRuntimeFromSnapshot` |
| `eventAssets.js` | Media-Registry, Bild-Lookup mit Fallback auf Placeholder | `buildMediaModel` |
| `eventFlags.js` | Stateless Flag-API (Foundation.flags) | `setFlag`, `clearFlag`, `hasFlag`, `getActiveFlags` |

### 1.2 Daten-Layer (`data/`)

| Datei | Inhalt |
|---|---|
| `events.v2.json` | Schema v2, `~60+` Events, neue Struktur (triggers, options, shadowModel) — primärer Katalog |
| `events.json` | Legacy v1, `severity`, `pool`, `titleKey`/`descriptionKey` (i18n-Keys) — wird noch geladen, hauptsächlich für Kompatibilität |
| `events.foundation.json` | Foundation-Definitionen (Flags, Memory-Defaults) |
| `event-assets.registry.json` | 32 Bild-Assets, dimensions-validiert, Map `eventId → assetPath` |
| `event-assets.gaps.json` | States, die noch keine eigene Visualisierung haben |
| `actions.json` | Spieler-Aktionen außerhalb Events (Care, Climate) |
| `missions.json` | Missionssystem (separat, hat aber Berührungspunkte) |

### 1.3 Runtime-Bootstrap

- `app.js` (Root, ~14.6k Zeilen) bindet die Module über globale Namen (`window.GrowSimEventEngine`, `window.GrowSimEventShared`, …) ein und ruft im Tick `eventEngine.routeTick(nowMs, state)` auf, sonst Fallback auf interne Funktionen (`runEventStateMachine`, `eligibleEventsForNow`, `activateEvent`, `evaluateEventConstraints`, …).
- `index.html` lädt vermutlich Module per `<script src="src/events/...">` (klassische IIFE-Bindung an `globalScope`).

### 1.4 Tests & Verifier

- **Phase-Tests:** `event-phase1-foundation.test.js` … `event-phase17-release-readiness.test.js` (mind. 17 Phasen, viele davon mehrteilig: 9a/b/c, 10a/b/c/d/e).
- **Flow-/Integration-Tests:** `event-flow-multi-chain-persistence.test.js`, `event-flow-persistence.test.js`, `event-flow-integration.test.js`, `event-resolver-guards-integration.test.js`, `event-runner.js` (10 deterministische 56-Tage-Runs).
- **Regression-Tests:** `event-roll-threshold-regression.test.js`, `event-timer-balance-regression.test.js`, `event-env-pressure-regression.test.js`, `event-realism-runtime.test.js`, `event-scheduler-runtime.test.js`, `event-resume-reconciliation-runtime.test.js`, `event-shop-transaction-runtime.test.js`, `event-ui-exclusive-rendering.test.js`.
- **Verifier-Skripte:** `dev/verify_event_foundation.js`, `verify_event_pools.js`, `verify_event_pool_authoring.js`, `verify_event_weighting.js`, `verify_event_analysis.js`, `verify_event_resolver_guards.js`, `verify_event_catalog_guard_metadata.js`, `verify_pending_chain_lifecycle.js`, `verify_resolver_guards.js`, `verify_resolver_guard_pipeline.js`, `verify_domain_ownership.js`, `verify_boost_semantics.js`, `verify_core_syntax.js` sowie `dev/balance_harness.js`, `dev/run_resolver_replay.js`, `dev/compare_replay_trace.js`.

### 1.5 i18n

- `src/i18n/index.js` lädt `de.json | en.json | es.json` aus `src/i18n/locales/`.
- v1-Events nutzen Keys (`titleKey`, `descriptionKey`); v2-Events tragen Texte aktuell **inline auf Deutsch** im JSON — kein i18n-Resolver an dieser Stelle.

### 1.6 Top-Level-Hilfsdateien (verdächtig)

`apply_event_fix.js`, `fix_app_script.js`, `fix_test_script.js`, `atlas_verification.json` liegen im Repo-Root. Wirken wie One-Off-Patches und sollten dokumentiert/aufgeräumt werden.

---

## 2. Wie Events aktuell entstehen, aktiviert, gelöst und gespeichert werden

Lifecycle eines Events vom Tick bis zum Save-State, rekonstruiert aus `eventEngine.js`, `app.js` (Zeilen ~6700, 6979, 14590) und den Sub-Modulen.

### 2.1 Tick & Auswahl

1. `app.js` ruft im Spiel-Loop `runEventStateMachine(nowMs)` auf.
2. Das delegiert an `window.GrowSimEventEngine.routeTick(nowMs, state)` (Shadow- / Soft-Cutover-Pfad), bzw. fällt bei nicht eingebundener Engine auf `callCanonicalEventsRuntime(...)` zurück (Legacy-Pfad in `app.js`).
3. Ein Snapshot wird über `eventShared.buildShadowSnapshot(state)` gebaut: Status (water/nutrition/health/stress/risk/growth), Plant (phase, stageIndex 1-12, plantSize, rootMass), Sim-Zeit, Setup, Environment (Temp/Humidity/VPD/Airflow/Instability), Root-Zone (pH/EC/O₂/Health), Events (machineState, activeEventId).

### 2.2 Eligibility

Pro Event aus dem Katalog ruft `eventEligibility.evaluateEvent(eventDef, snapshot, state)` auf:
- `isPhaseAllowed` gegen `allowedPhases`
- `evaluateEventConstraints` (minStage/maxStage, environmentState, rootZone)
- `getTriggerSignalScore` (`triggers.all`, `triggers.any`, `triggers.stage`, `triggers.setup`, in Range 0..1)
- `eventCooldowns.isEventBlocked` (Event-, Category-, Repeat-Cooldown)
- `eventContradictions.resolveCandidateConflicts` (z. B. nicht „dry" + „wet" gleichzeitig)
Ergebnis: `eligible: bool`, `signalScore: number`, `reasons: string[]`.

### 2.3 Aktivierung & Scoring

`eventActivation.scoreCandidate(eventDef, evaluation, pressureState)`
≈ `0.45 * categoryPressure + 0.40 * signalScore + 0.15 * specificPressure + weightInfluence`
- Klassifikation: `score ≥ 60 → active`, `≥ 45 → warning`, sonst `latent`.
- Sortierung: Score desc → State desc → TieBreaker → eventId.
- Output: `topCandidate`, `activeCandidates`, `warnings`, `latentCandidates`.

### 2.4 Eskalation

`eventEscalation.evaluateEscalation` trackt für jeden Kandidaten `firstObservedSimTimeMs`, `warningSinceSimTimeMs`, `unresolvedSinceSimTimeMs`. Ein warnendes Event wird zu `escalating` (≥ 6 h ungelöst + verschlechternd) oder `escalated` (≥ 9 h + Score > 80).

### 2.5 Choice & Resolution

1. UI ruft `eventEngine.onEventOptionClick(state, eventId, optionId)`.
2. `eventResolution.findOptionById` zieht die Option, `classifyProblemPole` leitet `dry|wet|lockout|deficit` ab.
3. Outcome-Grading kombiniert `option.intent`, `option.contextFit` und Druck-Reduktion → `strong_recovery | partial_mitigation | poor_outcome | no_action`.
4. `option.effects` werden auf `state.status` (water/nutrition/health/stress/risk) angewendet.
5. `eventAnalysisRuntime.buildShadowAnalysis` baut narrative Outcome-Daten.
6. `eventChains.buildFollowUpCandidateFromHook` erzeugt Pending-Chains aus `shadowModel.escalationProfile.poorOutcomeHooks` etc.

### 2.6 Rewards

`eventRewards.evaluateRewardEligibility` erhöht `stableWindow.stableHours` solange Stress ≤ 22, Risk ≤ 20, kein negativer Druck > 18 und nichts eskaliert ist. Ab `stableHours ≥ 2 h` wird das nächste positive Event freigeschaltet (mit eigenem `rewardCooldownUntilSimTimeMs`).

### 2.7 Persistenz

`eventPersistenceAdapter.buildContractSnapshot(state.events)` produziert das Save-Format `version: 'legacy-compatible-v1'`:
- `scheduler`: `eventCooldownsSim`, `categoryCooldownsSim`, `nextEventSimTimeMs`
- `activeEventId`, `activeOptions`, `activeSeverity`, `activeCategory`, `activeImagePath`
- `warnings`, `latentPressures`, `chains`
- `history` (Array)
- `foundation`:
  - `memory.events[]`: `{ eventId, category, optionId, quality, timestamp, … }`
  - `memory.pendingChains{}`: `chainId → { targetEventId, sourceEventId, activatesAtRealTimeMs, expiresAtRealTimeMs, meta }`
  - `analysis[]`, `flags{}`

Window-Konstanten: `TRACKED_EVENT_STALE_HOURS = 18`, `RECENT_RESOLUTION_WINDOW_HOURS = 24`, `CHAIN_CONTEXT_WINDOW_HOURS = 12`, `MAX_PENDING_CHAINS = 12`.

### 2.8 Cooldown & History

`eventCooldowns.setEventCooldown` setzt Per-Event- und Category-Cooldown. `eventMemory.addEvent` schreibt in History; `getLastEvents` (~6) wird für Repeat-Penalty genutzt.

---

## 3. Legacy-Strukturen und Risiken

### 3.1 Doppelte Wahrheit zwischen `app.js` und `src/events/`

- `app.js` enthält weiterhin lokale Implementierungen: `runEventStateMachine`, `activateEvent`, `eligibleEventsForNow`, `fallbackEventsForCurrentPhase`, `isEventEligible`, `isEventPhaseAllowed`, `buildEventConstraintSnapshot`, `evaluateEventConstraints` u. a.
- `src/events/eventShared.js` und `src/events/eventEligibility.js` definieren dieselbe Logik teils mit anderen Datenpfaden (`snapshot.plant.stageIndexOneBased` vs. `state.plant.stageIndex+1`).
- **Risiko:** Subtile Drift zwischen Legacy- und Shadow-Engine; Tests können je nach geladenem Pfad grün sein, während Spieler andere Resultate sehen.

### 3.2 Vier Feature-Modi gleichzeitig

`legacy`, `shadow`, `internal-soft-cutover`, `new`. Aktuell laut `eventEngine` `liveAuthority: 'legacy'`. Soft-Cutover ist auf einen sehr engen Scope begrenzt (`shadow_activation_preflight`, `shadow_choice_preview_packaging`, `ui_model_packaging`).
**Risiko:** Sehr hohe Komplexität, schwer für Codex zu navigieren. Fehler werden oft nur unter einem Modus reproduzierbar.

### 3.3 Doppelte v1/v2 Datendateien

`events.json` (v1) und `events.v2.json` (v2) leben parallel. v1 nutzt i18n-Keys, v2 hardcoded deutsche Strings. Schema-Felder unterscheiden sich (`choices` vs. `options`, `severity` vs. `weight`).
**Risiko:** Spieler bekommen je nach Pfad/Pool unterschiedliche Tonalität, Übersetzung ist nicht durchgängig.

### 3.4 Doppelte Schritt-4-Einträge im Devlog

`DEVELOPMENT_LOG_EVENT_SYSTEM.md` enthält zweimal „Schritt 4". Hinweis auf historisch parallele Refactor-Pfade.

### 3.5 Top-Level-Patches im Repo

`apply_event_fix.js`, `fix_app_script.js`, `fix_test_script.js` sind manuelle Modifikationsskripte (z. T. mit hartkodierten Pfaden). Nicht Teil des Builds, aber im Repo.
**Risiko:** Verwirrung für neue Mitwirkende, latente Inkonsistenzen falls jemand sie ausführt.

### 3.6 Asset-Doppelungen

`assets/events/` hat etliche Pärchen wie `event-co2-enrichment.png` + `event-CO2-enrichment-2.png`, `event-heat-wave.png` + `event-heat-wave-2.png`, dazu thematische Dubletten (`event-overwatering.png` + `event-overwatering-event.png`).
**Risiko:** Inkonsistente Bild-Auswahl je nach Mapping; größere App-Bundle-Size.

### 3.7 i18n-Halbstand bei v2

v2-Events tragen deutsche Texte direkt im JSON. Englisch und Spanisch fehlen für diese Events vollständig.

### 3.8 Massive `app.js`

Über 14.000 Zeilen mit Config, API-Wrapper, Tick, Render, Reward-Engine, Coin-Economy. Event-bezogene Helper sind verstreut.
**Risiko:** Codex muss bei jeder Event-Erweiterung in `app.js` editieren; Merge-Konflikte und Test-Brüche sehr wahrscheinlich.

### 3.9 Fehlende Telemetrie für Spieler-Wirkung

QA-Sampling ist intern markiert (`internalOnly: true`). Es gibt keine eindeutig getrennte Player-Telemetry für Event-Engagement, Choice-Distribution, Recovery-Time.

---

## 4. Stabile Bestandteile (erhalten)

| Bestandteil | Warum behalten |
|---|---|
| `eventShared.js` Snapshot-Bau und Trigger-Auswertung | Sauber, deterministisch, gut testbar |
| `eventEligibility.js` (Filterstruktur) | Klare Verantwortung, gute Testbarkeit |
| `eventCooldowns.js` (Per-Event + Category + Repeat-Penalty) | Hat in QA-Runs nachweislich Spam reduziert (49 → 0 direkte Wiederholungen) |
| `eventContradictions.js` | Verhindert offensichtliche UX-Brüche, sollte ausgebaut werden |
| `eventEscalation.js` (warning → escalating → escalated) | Konzeptionell genau das Premium-Konzept „Ursache → Symptom → Entscheidung" |
| `eventChains.js` (Pending-Chains, Hooks) | Fundament für „Event-Ketten statt Zufall" — exakt das, was V2 verlangt |
| `eventPersistenceAdapter.js` (Save-Format `legacy-compatible-v1`) | Keine Save-Brüche, Versions-/Pruning-Strategie gibt es schon |
| Test-Suite mit Phasen 1–17 | Sehr breite Abdeckung, Regressionsschutz beim Umbau |
| Asset-Registry mit Gap-List | Skalierbarer Ansatz, sollte als Leitstruktur bleiben |
| Deterministische Auswahl per `deterministicUnit(seed, key)` | Replay-fähig, exzellent für Debugging |

---

## 5. Teile, die für ein Premium-Event-System erweitert / ersetzt werden sollten

### 5.1 Event-Datenmodell (events.v2.json)

**Aktuell:** flach, ein Event = Trigger + Optionen + ShadowModel.
**V2 braucht:**
- `cause` (Ursache), `symptoms[]` (sichtbare Anzeichen), `decisionPrompt`, `solutionPaths[]`, `aftermath` (Nachwirkung) als getrennte Felder.
- `learning.real` mit echten Grow-Lerntexten + Quellenhinweis.
- `chain` als first-class: `chainId`, `chainStep`, `precondition`, `nextSteps[]` mit Wahrscheinlichkeiten.
- `severity` als enum (`info | warning | critical | emergency`) statt 1–4.
- `tone` (`educational | dramatic | calm | celebratory`).
- `unlock` (Stage-/Skill-Voraussetzungen).
- `monetization` (z. B. Premium-Hint-Slot).

### 5.2 Event-Auswahl & Balancing

**Aktuell:** Score = 0.45 Pressure + 0.40 Signal + 0.15 Spezifisch + Weight, plus Repeat-Penalty.
**V2 braucht:**
- Spielerprofil-bewusste Modulation (Anfänger vs. Fortgeschrittener).
- Tag-/Wochen-Verteilung (nicht nur Per-Event-Cooldown).
- Kuratierte „Story-Beats": z. B. mindestens 1 Lernevent in Stage 3.
- Difficulty-Curve im Save (Spieler lernt → System steigert).

### 5.3 Resolution-Pipeline

**Aktuell:** `findOptionById` + `gradeOptionOutcome` → effects auf status.
**V2 braucht:**
- Mehrstufige Auflösung („Soforthilfe", „Beobachtung", „Folgeentscheidung").
- Time-Lapse-Ergebnis (Effekt entfaltet sich über Stunden, nicht instant).
- Reversible Choices (in den ersten X Sekunden korrigierbar).
- Verbindung zu Inventory-/Tool-System (z. B. „pH-Messgerät" benötigt).

### 5.4 UI-Flow für Events

**Aktuell:** vermutlich Modal mit Optionen-Liste plus Bild.
**V2 braucht:**
- Klare Phasen-Anzeige: **Beobachten → Analysieren → Entscheiden → Auflösen → Lernen**.
- Hint-System mit Premium-Gate (kostenpflichtige Diagnose).
- Lerne-Mehr-Ebene (separate Detailseite, nicht im Modal vergraben).
- History-View pro Event in der Pflanzenakte.

### 5.5 i18n & Texte

**Aktuell:** v2-Events deutsch hardcoded.
**V2 braucht:** alle Texte über i18n-Keys, mit DE/EN/ES vollständig. Trennung Pflichttext (Symptom, Optionen) vs. optionalem Lerntext.

### 5.6 Aufräumen Legacy-Pfade

`app.js` Event-Helper schrittweise an die `src/events/`-Module delegieren, bis `app.js` nur noch Glue-Code bleibt. Den Soft-Cutover-Modus bewusst vorantreiben oder gänzlich entfernen — der aktuelle Schwebezustand ist riskant.

### 5.7 Telemetrie

Eigenes Player-facing Telemetry-Modul, getrennt vom internen QA-Sampling.

---

## 6. Fehlende Datenstrukturen

Konzeptionelle Vorschläge — werden in 02_data-model.md detailliert.

### 6.1 Auf Event-Ebene

- `event.cause` (`enum`): Hauptursache (`overwatering`, `low_humidity_flower`, …).
- `event.symptoms[]`: sichtbare Pflanzen-Symptome mit Zeit-Offset.
- `event.diagnosisOptions[]`: optionale Spieler-Aktionen vor der Entscheidung (Messen, Beobachten).
- `event.solutionPaths[]`: jede Lösung mit `costs`, `risks`, `expectedOutcome`, `learningPoint`.
- `event.aftermath`: was passiert in 1–24 h danach.
- `event.realWorldNote`: echter Grow-Hintergrund mit Disclaimer.
- `event.relatedEvents[]`: Empfehlung, was folgen kann.

### 6.2 Auf Spielerstand-Ebene

- `player.knowledgeProfile`: welche Lerninhalte schon gesehen wurden.
- `player.eventCompetenceMap`: wie oft eine Eventklasse korrekt gelöst wurde.
- `player.preferenceFlags`: lernt lieber durch Bilder vs. Text vs. Hands-on.

### 6.3 Auf Run-Ebene

- `run.eventBudget`: pro Tag/Woche (Premium-Gefühl statt Eventflut).
- `run.storyBeats[]`: garantierte Lehr-Events, die kommen müssen.

### 6.4 Auf Kette-Ebene

- `chain.title`, `chain.expectedSpan` (Tage), `chain.failurePath`, `chain.successPath`.
- `chain.recoveryHints` für UX.

---

## 7. UI- / UX-Probleme, die zu erwarten sind

1. **Modal-Stack-Konflikte:** Wenn ein Event und ein Tutorial-/Shop-Modal gleichzeitig auftreten, ist nicht klar dokumentiert, welches dominiert.
2. **Bildqualität & Konsistenz:** Mehrfach-Assets mit Suffix `-2` lassen vermuten, dass kein Kuratierungspass über die Bildsprache lief.
3. **Lange Texte im Modal:** Aktuelle Events tragen Erklärung + Lernnote im selben Block — UX erwartbar überfrachtet, Mobile schlecht lesbar.
4. **Optionen ohne klares Risk/Reward-Signal:** `effects` werden nicht visuell vermittelt; Spieler raten.
5. **Keine sichtbare Konsequenz:** Choices wirken oft instant, das Premium-Gefühl von „Konsequenz im Verlauf" fehlt.
6. **Anfänger verlieren Kontext:** `learningNote` ist nur reaktiv, es gibt keinen vorgelagerten Tutorial-Layer.
7. **Eskalation unsichtbar:** Spieler sehen vermutlich nicht, dass sich ein Event in 6 h verschärft, wenn er nichts tut — pure Engine-Logik ohne UI-Anker.
8. **Pending-Chains werden im Save abgelegt, aber UI-Aufhänger fehlt:** Spieler weiß nicht, dass ein Folge-Event geplant ist.
9. **Fail-Sound/Haptik & Belohnungs-Feedback:** unklar, ob konsistent integriert (kein Treffer in den Audit-Quellen).
10. **i18n-Lücken:** EN/ES-Spieler bekommen für v2-Events deutsche Texte → inakzeptabel für Store-Tauglichkeit.
11. **Sehr viele Events pro Run:** 10-Run-Test zeigte 47 Events / 56 Tage. Eventflut führt zu Banalisierung — Premium-Gefühl bedingt eher 5–15 kuratierte, starke Events pro Run.

---

## 8. Notwendige Tests (Premium-Niveau)

Bestehende Tests bleiben Pflicht. Zusätzlich:

### 8.1 Unit-Tests (neu)

- `scoreCandidate` Komponenten-Math (Pressure-Gewichtung, Repetition-Penalty-Formel).
- `classifyEscalationStage` Zeitfenster-Edge-Cases.
- `buildFollowUpCandidateFromHook` für jede Hook-Variante.
- `gradeOptionOutcome` für jeden `problemPole × intent`-Mix.
- Trigger-Auswertung gegen einen kuratierten Fixture-Set.

### 8.2 Schema-Tests (neu)

- Jeder v2-Event muss valide gegen ein zentrales JSON-Schema sein (alle Pflichtfelder).
- Alle `id`-Werte unique (über v1 + v2 hinweg).
- Alle referenzierten Assets müssen physisch existieren.
- Alle `chainStep.nextSteps` müssen gültige IDs sein.
- Alle Texte haben i18n-Keys oder sind in DE/EN/ES.

### 8.3 Balancing-Tests (erweitern)

- 50-Run-Replay mit drei Schwierigkeitsgraden.
- Polarity-Verteilung pro Stage (Ziel: ~30–40 % positiv in stabilen Runs).
- Maximal-Eventdichte pro Sim-Tag (Premium-Cap).
- Verteilung Lernevents vs. Krise vs. Belohnung.

### 8.4 UI-Tests (neu)

- Snapshot-Test für Event-Modal in jeder Severity-Stufe.
- Tap-Target ≥ 44 px (Mobile-Tauglichkeit, WCAG-Touch-Größe).
- Tutorial-Overlay greift bei erstem Auftreten einer neuen Eventklasse.
- Pending-Chain-Indicator wird sichtbar.

### 8.5 Save-Migration

- Save aus v1-Schema laden → v2-State korrekt initialisiert.
- Save mit aktiven Events laden → kein Verlust, Modal taucht wieder auf.
- Save mit veralteten Pending-Chains → Pruning korrekt.

### 8.6 Telemetry-Tests (neu)

- Event-Impressions zählen pro Event-ID.
- Choice-Distribution pro Event mit ausreichend Sample.
- Recovery-Time-Verteilung.
- Drop-Off während Event-Modal.

---

## 9. Vorschlag für Event-System-V2-Ordnerstruktur

Anfängerfreundlich, klar getrennte Schichten, Codex-fertig.

```
docs/
  event-system-v2/
    00_current-system-audit.md            ← dieses Dokument
    01_premium-vision.md                  ← Spiel-/Lernziele, Tone, KPI
    02_data-model.md                      ← Event-Schema v3, Chain-Schema, Player-Profile
    03_architecture.md                    ← Module-Verträge, Tick-Pipeline, Save-Format
    04_event-catalog.md                   ← Liste aller geplanten Events + Stage-Mapping
    05_chains.md                          ← Ketten-Konzepte, Story-Beats, Beispiel-Storyboards
    06_ui-flow.md                         ← Beobachten → Analysieren → Entscheiden → Lernen
    07_balancing.md                       ← Eventbudgets, Pressure-Gewichte, Difficulty-Curve
    08_telemetry.md                       ← KPI, Logging, Funnel
    09_testing-plan.md                    ← Detail zu Abschnitt 8
    10_codex-stepwise-implementation.md   ← konkreter Umsetzungsplan
    appendix/
      A_glossary.md
      B_real-world-grow-references.md
      C_legacy-cleanup-plan.md            ← apply_event_fix.js etc., app.js-Slicing

src/
  events/
    legacy/                               ← erhalten, schrittweise reduzieren
      eventShared.js
      eventEligibility.js
      ...
    v2/                                   ← neue Premium-Engine
      core/
        engineV2.js                       ← Tick, Pipeline, Authority
        snapshot.js                       ← reiner Snapshot-Builder
        scheduler.js                      ← Event-Budget, Story-Beats
      selection/
        eligibility.js
        scoring.js
        contradictions.js
        cooldowns.js
      lifecycle/
        activation.js
        escalation.js
        resolution.js
        rewards.js
        chains.js
      content/
        catalog.js                        ← Lädt + validiert events.v3.json
        assets.js                         ← Asset-Resolver mit Gap-Strategie
        i18nBridge.js                     ← Texte via Keys aus locales/
      persistence/
        saveAdapter.js
        migration_v1_to_v3.js
      telemetry/
        playerTelemetry.js
        qaSamplingBridge.js
      ui/
        modalModel.js                     ← Build UI-Daten für das Event-Modal
        chainBanner.js
        analysisCard.js

data/
  events/
    catalog/
      water/*.json                        ← ein Event pro Datei, übersichtlich
      nutrition/*.json
      environment/*.json
      pest/*.json
      disease/*.json
      positive/*.json
      special/*.json
    chains/*.json                         ← Ketten-Definitionen
    schemas/
      event.schema.json
      chain.schema.json
    legacy/
      events.v2.json                      ← Frozen, read-only Migration-Quelle
      events.json

src/i18n/locales/
  de.json
  en.json
  es.json
  events/
    de.events.json                        ← große Eventtexte ausgelagert
    en.events.json
    es.events.json

test/
  events-v2/
    unit/*.test.js
    schema/*.test.js
    flow/*.test.js
    balance/*.test.js
    ui/*.test.js
    persistence/*.test.js

dev/
  events-v2/
    validate-catalog.js
    balance-replay.js
    chain-graph-export.js
```

Vorteile: Anfänger findet pro Bereich genau einen Ort. Codex bekommt feingranulare Zielordner. Legacy bleibt isoliert und kann pro Modul abgelöst werden.

---

## 10. Konkreter nächster Schritt für Codex

Codex soll **noch nichts implementieren**. Der nächste Schritt ist analytisch-strukturierend.

**Codex-Auftrag #001 — „Repo-Vorbereitung Event-System V2"**

1. **Verzeichnisstruktur anlegen** (leer, nur Ordner und Platzhalter-Markdowns) gemäß Abschnitt 9. Konkret:
   - `docs/event-system-v2/` mit Stub-Dateien `01_*.md` … `10_*.md` und `appendix/*.md`.
   - `src/events/v2/` mit allen Unterordnern und je einer `README.md`-Stub.
   - `data/events/catalog/<category>/` Ordner anlegen, leer.
   - `data/events/schemas/` mit Platzhalter-Schemas (`event.schema.json` mit `$schema` und `description`, sonst leer).
   - `test/events-v2/` mit leeren Unterordnern + `README.md`.
   - `dev/events-v2/` mit `README.md`.
2. **Legacy-Markierung:** `src/events/legacy/README.md` anlegen mit dem Hinweis: „Dieser Ordner wird Schritt für Schritt durch `src/events/v2/` ersetzt. Keine neuen Features hier hinzufügen."
3. **Aufräum-Stub:** `docs/event-system-v2/appendix/C_legacy-cleanup-plan.md` mit einer Punkt-für-Punkt-Liste der Top-Level-Dateien zur Bereinigung (`apply_event_fix.js`, `fix_app_script.js`, `fix_test_script.js`, `atlas_verification.json`) — **nur dokumentieren, nicht löschen**.
4. **Asset-Inventar einfrieren:** `data/events/legacy/asset-doublets.md` mit Liste aller Asset-Pärchen und Vorschlag zur Vereinheitlichung — **keine Bilder löschen**.
5. **Code-Verboten:** Keine Engine-, Daten- oder UI-Logik schreiben. Keine `package.json`-Skripte ändern. Keine Tests schreiben.

Akzeptanz-Check nach Schritt #001:
- Bestehende Tests laufen unverändert.
- `node --check app.js` ✅, `node --check src/events/eventEngine.js` ✅.
- Neue Ordner und README-Stubs existieren wie spezifiziert.
- `git status` zeigt nur Neu-Dateien, keine Modifikationen an bestehenden Dateien.

Direkt danach folgt **Audit-Dokument 01_premium-vision.md** und **02_data-model.md** durch den Product Architect.

---

## Anhang A — Datei-Querverweise (für schnelle Codex-Orientierung)

- Tick-Eintritt in app.js: `app.js:6699-6705` (`runEventStateMachine`).
- Engine-Routing: `src/events/eventEngine.js` (`routeTick`, große Datei).
- Snapshot-Bau: `src/events/eventShared.js` (`buildShadowSnapshot`).
- Trigger-Auswertung: `src/events/eventShared.js` (`getTriggerSignalScore`).
- Eligibility-Schleife: `src/events/eventEligibility.js` (`evaluateCatalog`).
- Scoring & Ranking: `src/events/eventActivation.js` (`scoreCandidate`, `activateCandidate`).
- Eskalation: `src/events/eventEscalation.js`.
- Choice-Verarbeitung: `src/events/eventEngine.js` (`onEventOptionClick`) → `src/events/eventResolution.js`.
- Save-Snapshot: `src/events/eventPersistenceAdapter.js` (`buildContractSnapshot`).
- Catalog: `data/events.v2.json`.
- Assets: `data/event-assets.registry.json`, `data/event-assets.gaps.json`.

## Anhang B — Offene Fragen an Marco

1. Soll der Soft-Cutover-Modus ausgebaut oder ersetzt werden? (Empfehlung: gezielt ablösen, nicht weiter pflegen.)
2. Ziel-Eventdichte pro Run? (Aktuell ~47 Events / 56 Tage. Premium-Vorschlag: 12–20 starke Events pro Run.)
3. Soll das System Mehrspieler-/Cloud-Save irgendwann unterstützen? (Beeinflusst Save-Format-Entscheidung.)
4. Wieviel Lernanteil ist gewünscht? (Vorschlag: jedes 3.–4. Event hat einen expliziten „Lern-Layer".)
5. Monetarisierung im Event-Layer: Hint-Slot? Zeitabkürzung? Premium-Pflanze? (Beeinflusst Schema-Felder in 02_data-model.md.)

---

*Ende Audit-Entwurf 00.*
