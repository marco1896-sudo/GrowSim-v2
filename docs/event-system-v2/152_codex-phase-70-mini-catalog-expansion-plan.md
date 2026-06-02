# Phase 70: Mini-Catalog Expansion Plan

## Ziel

Phase 70 plant den naechsten Ausbau des echten Event-V2-Mini-Katalogs, ohne Runtime-Ausweitung, ohne UI-Integration und ohne Eventaktivierung.

## Neue Dateien

- `docs/event-system-v2/152_codex-phase-70-mini-catalog-expansion-plan.md`
- `docs/event-system-v2/153_codex-phase-70-event-selection-matrix.md`
- `docs/event-system-v2/154_codex-phase-70-result.md`
- `data/events/catalog/_planning/phase-70-mini-catalog-expansion-plan.md`
- `data/events/catalog/_planning/phase-70-chain-learning-card-plan.md`

## 1. Aktueller Mini-Katalog-Stand

### Mengen

- Indoor-Events: 6
- Outdoor-Events: 3
- Shared-Events: 3
- Learning-Cards: 3
- Chains: 0

### Abgedeckte Stages

Aktuell abgedeckt:

- Stage 2 bis 11

Noch nicht abgedeckt:

- fruehe Seedling-/Early-Onboarding-Zone vor Stage 2
- spaete Ernte-/Qualitaets-/Reflexionszone als eigener inhaltlicher Fokus

### Abgedeckte Modes

- Indoor
- Outdoor
- Shared-Events sind ueber `modeIn: ["indoor","outdoor"]` technisch fuer beide Modi vorbereitet

### Abgedeckte Kategorien

Der Mini-Katalog deckt derzeit vor allem diese Kategorien:

- Wasser: 4
- Environment/Klima: 5
- Naehrstoffe: 2
- Pest: 1

Noch praktisch nicht abgedeckt:

- Technik / Setup
- Training / Strukturstress
- Bluete-/Erntequalitaet
- ausgepraegte Wurzel-/Substratketten
- Story-/Learning-Beats als echte Event-/Chain-Struktur

### Abgedeckte Learning-Refs

- `lc_watering_basics`
- `lc_climate_vpd_basics`
- `lc_ph_nutrient_uptake_basics`

### Was bereits gut abgedeckt ist

- fruehe Wasserfehler
- grundlegende Klima-/VPD-Probleme
- erster pH-/Naehrstoff-Bezug
- ein frueher Pest-Hinweis
- ein Rootbound-Warnsignal

### Offensichtliche Luecken

- kein einziger Chain-JSON
- keine Setup-/Technik-Events
- keine Training-/Entscheidungs-Events
- kaum Outdoor-Breite ausser Regen/Hitze/Kaeltenacht
- nur 3 Learning-Cards fuer 12 Events
- keine systematische Ursache-Wirkung-Kette zwischen Wasser -> Wurzel -> Klima

## 2. Was fuer einen ersten echten V2-Testlauf noch fehlt

Fuer einen spaeteren inhaltlich aussagekraeftigen Shadow-Testlauf fehlen vor allem:

1. **mehr Entscheidungsvielfalt pro Modus**
   - aktuell ist Outdoor deutlich duenner als Indoor

2. **erste echte Ketten**
   - ohne Chains bleibt Ursache-Wirkung noch zu flach

3. **eine breitere Kategorienbasis**
   - Training/Setup/Substrat fehlen fast komplett

4. **mehr Learning-Coverage**
   - vorhandene Learning-Cards werden stark wiederverwendet

5. **ein klarer "zweiter Ring" von Events**
   - Events, die nicht nur erste Warnung, sondern Follow-up oder Fehlentscheidung sichtbar machen

## 3. Ausbauziel fuer Phase 71–72

Empfohlene Zielgroesse:

- +10 neue Events
- +3 Learning-Cards
- +2 Event-Chains
- keine Asset-Produktion
- nur fallbackfaehige vorhandene Asset-Refs
- Locale-Keys direkt mitplanen
- Validation und Matrix-Re-Run direkt mitplanen

### Warum 10 Events

10 neue Events sind gross genug, um:

- Katalogtiefe sichtbar zu erhoehen
- 2 Chains sinnvoll zu tragen
- Outdoor und Shared fairer zu machen
- mehr Lernwert zu schaffen

Gleichzeitig bleibt der Schritt klein genug fuer:

- Data-only Umsetzung
- kontrollierbaren Locale-Backfill
- ueberschaubare QA-Matrix

## 4. Empfohlene inhaltliche Prioritaet

1. hoher Lernwert
2. klare Spielerentscheidung
3. gute UI-Lesbarkeit
4. starke Ursache-Wirkung
5. Chain-Faehigkeit
6. ausgeglichenere Indoor/Outdoor/Shared-Verteilung
7. niedriges Runtime-Risiko

## 5. Empfohlene Ausbauverteilung

### Indoor +4

- ein Technik-/Setup-Event
- ein Licht-/Abstands-Event
- ein Wurzel-/Medium-Folgeevent
- ein Training-/Stress-Event

### Outdoor +3

- ein Trocken-/Topf-Event
- ein frueherer Pest-/Feuchte-Folgepunkt
- ein Wind-/Standort- oder Regen-Folgeevent

### Shared +3

- ein falscher Giessrhythmus / Panik-Giessen
- ein Drainage-/Substratproblem
- ein Recovery-/Near-Miss-/Lernmoment oder trainingsnaher Stressentscheid

Damit wuerde der Mini-Katalog auf:

- Indoor 10
- Outdoor 6
- Shared 6
- Gesamt 22 Events

wachsen.

Das ist immer noch klar "mini", aber bereits deutlich aussagekraeftiger fuer spaetere Shadow-Bridge- und UI-Lab-Arbeit.

## 6. Sichere Umsetzungsreihenfolge fuer Phase 71–73

### Phase 71

`Data-only Events + 2 Learning-Cards`

- 8 neue Events
- 2 neue Learning-Cards
- noch keine Chains
- bestehende Fallback-Asset-Strategie beibehalten

### Phase 72

`Remaining Events + 2 Chains + CrossRefs`

- restliche 2 Events
- 2 Chain-JSONs
- Event-zu-Chain-Referenzen
- Learning-Ref-Abgleich

### Phase 73

`Locale Backfill + Validation + Matrix Re-Run`

- neue Locale-Slots in `de/en/es`
- Full Validator Run
- Full Adapter Matrix Re-Run
- Watchlist / Copy-QA / Budget-Review

## 7. Risikoanalyse

### Niedrig

- Data-only neue Event-JSONs
- neue Learning-Cards
- planbare Locale-Slots
- Chain-JSONs ohne Runtime-Aktivierung

### Mittel

- Copy-/Budget-Dichte kann wieder steigen
- mehr CrossRefs bedeuten mehr Validator-Flaeche

### Bewusst vermieden

- keine Runtime-Ausweitung
- keine Eventaktivierung
- keine UI-Integration
- kein echter Tick
- kein Live-State an V2

## 8. Empfohlene Phase 71

```text
Phase 71: Data-only Mini-Catalog Expansion Batch 1
```

Inhalt:

- 8 neue Event-JSONs
- 2 neue Learning-Cards
- nur vorhandene/fallbackfaehige Assets
- noch keine Runtime-Aktivierung

## Go/No-Go fuer Phase 71

Ergebnis:

```text
go_for_phase_71_data_only_mini_catalog_expansion_batch_1
```
