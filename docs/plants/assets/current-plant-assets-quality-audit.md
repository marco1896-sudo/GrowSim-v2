# Current Plant Assets Quality Audit

## Zusammenfassung

Die Live-Pflanzendarstellung ist aktuell funktional, aber noch nicht auf Premium-Niveau. Die Runtime nutzt heute genau einen fotobasierten Pflanzen-Spritepfad mit 46 Frames in fest eingebautem Topf/Substrat-Look plus sechs kleine Zustands-Overlays. Die Simulation und Diagnose sind bereits deutlich feiner als die sichtbare Asset-Schicht: Viele Ursachen werden im Code unterschieden, visuell landen sie aber meist in generischen Sammelbildern oder nur in Textdiagnosen.

Der größte Qualitätshebel ist deshalb nicht "mehr von allem", sondern ein sauberer Wechsel von einer monolithischen Pflanzenserie zu einer klar getrennten Baseline- und Condition-Struktur: stage-spezifische Baseline-Pflanzen ohne Topf, dazu wenige, sehr lesbare Kernzustände mit organischen Übergängen und konsistenten Naming-/Anchor-Regeln aus dem vorhandenen Plant-Asset-Lab.

## Gefundene aktuelle Asset-Struktur

### Live-Produktionspfad

- Basis-Pflanze: `assets/plant_growth/`
- Hauptquellen:
  - `assets/plant_growth/plant_growth_sprite.png`
  - `assets/plant_growth/plant_growth_metadata.json`
  - `assets/plant_growth/aligned_frames/frame_001.png` bis `frame_046.png`
- Aktive Zustands-Icons/Overlays: `assets/gameplay/states/`
  - `healthy.png`
  - `underwatered.png`
  - `overwatered.png`
  - `nutrient_deficiency.png`
  - `nutrient_burn.png`
  - `heat_stress.png`
  - `light_stress.png`
  - `mold_warning.png`
  - `pest_mites.png`
  - `pest_thrips.png`
  - `root_rot.png`
  - `recovery.png`
  - `slow_growth.png`
  - `growth_boost.png`
  - `dead.png`
- Kleine Stage-Progression-Icons: `assets/gameplay/progression/`

### Live-Stage-Struktur

Simulation mit 12 Stufen:

1. `germination`
2. `seedling`
3. `early_vegetative`
4. `vegetative`
5. `late_vegetative`
6. `pre_flower`
7. `stretch`
8. `early_flower`
9. `flower`
10. `late_flower`
11. `ripening`
12. `harvest_ready`

Sprite-Mapping nutzt intern aber nur 8 visuelle Cluster:

- `seed`: 3 Frames
- `sprout`: 4 Frames
- `seedling`: 3 Frames
- `vegetative`: 17 Frames
- `preflower`: 4 Frames
- `flowering`: 7 Frames
- `late_flowering`: 5 Frames
- `harvest`: 3 Frames

### Aktuelle "Strains" / Genetik-Varianten

Im Produkt gibt es derzeit keine eigenen Pflanzenasset-Varianten pro Strain/Cultivar.

Vorhandene Gameplay-Genetikoptionen:

- `hybrid`
- `indica`
- `sativa`

Diese beeinflussen Progression/Build, aber nicht die Pflanzenvisualisierung.

### Aktuelle Live-Zustände / Conditions

Visuell direkt schaltbar sind heute effektiv nur diese Overlay-Zustände:

- `overlay_burn`
- `overlay_def_mg`
- `overlay_def_n`
- `overlay_mold_warning`
- `overlay_pest_mites`
- `overlay_pest_thrips`

Zusätzlich existieren zwar Zustandsdateien wie `underwatered.png`, `overwatered.png`, `heat_stress.png`, `light_stress.png`, `root_rot.png`, sie werden aber nicht als eigentliche Pflanzenzustände auf die Hauptpflanze gerendert.

### Konventionen heute

Live:

- Stages im Save/Runtime: `stage_01` bis `stage_12`
- Spriteframes: `frame_001.png` bis `frame_046.png`
- Sprite-Metadaten: `stage`-Labels wie `seed`, `sprout`, `vegetative`, `flowering`
- Overlay-IDs: `overlay_*`
- Gameplay-State-Dateien: kurze, generische snake_case-Namen

Plant-Asset-Lab:

- Zielkonvention: `cannabis_{growth_stage}_{condition}_{severity}_v001.png`
- Baseline: `cannabis_{growth_stage}_healthy_v001.png`
- Overlays separat
- Alles lowercase snake_case
- Pflanze ohne Topf, ohne Substrat, ohne Hintergrund

## Asset-/Simulation-Mismatch

### Was die Simulation unterscheiden kann

Die Diagnose-/Simulationslogik unterscheidet bereits u. a.:

- Wasserdefizit
- Wasserlogging / Überwässerung
- Nährstoffmangel
- Nährstoffdruck / Übersalzung / EC-Druck
- Klimadruck
- Root-Zone-Druck
- Stresslast
- Risiko-Exposition
- Wachstumsbremse

Zusätzlich existieren im Asset-Lab bereits Zielmodelle für:

- Wasserstress
- Hitze-/Kälte-/Licht-/VPD-Stress
- Defizienzen
- Toxizität/Lockout
- Krankheiten
- Schädlinge
- Recovery-/Overlay-Zustände

### Was die Pflanze tatsächlich zeigt

- Eine einzige fotobasierte Pflanze mit Topf/Substrat
- Stage-Fortschritt über Spriteframes
- Sechs generische Overlay-Badges/Bilder

### Konkrete Mismatches

- Überwässerung und Trockenstress werden diagnostisch getrennt, aber nicht als eigene Hauptpflanzenzustände dargestellt.
- `overlay_def_n` und `overlay_def_mg` zeigen beide dasselbe generische Asset `nutrient_deficiency.png`.
- Hitze-, Licht-, VPD-, pH- und Root-Zone-Probleme sind im Code wichtig, aber auf der Hauptpflanze nicht sauber differenziert.
- Die Runtime kennt 12 Simulationsstufen, das Asset-Lab plant 9 klare Kern-Baselines, die Live-Darstellung hängt aber noch an einem alten 8-Cluster-Sprite.
- Gameplay-Genetik (`hybrid`, `indica`, `sativa`) hat keine visuelle Differenzierung.
- Das Lab erzwingt "ohne Topf / separat layerbar", die Live-Pflanze ist weiterhin fest mit Topf und Substrat gebacken.

## Qualitätsprobleme

- Die Pflanze wirkt fotohaft statt bewusst game-polished.
- Topf und Substrat sind eingebrannt und verhindern saubere Layer-Kombinationen.
- Frühe Stages sind lesbar, aber zwischen Vegetation, Preflower und Flowering sind die Übergänge noch zu grob.
- Die 12 Gameplay-Stages haben keine 12 sauber lesbaren Hauptzustände.
- Condition-Lesbarkeit ist zu icon-lastig statt pflanzenbasiert.
- Deficiency-/Stress-Zustände sind visuell zu generisch.
- Überwässerung, Trockenstress, Hitze, Lichtstress und Nährstoffprobleme haben noch keine klar eigene Pflanzen-Silhouette.
- Perspektive/Topf/Beleuchtung sind innerhalb des bestehenden Sets recht konsistent, aber genau diese Konsistenz ist an den falschen Container gekoppelt: Topf+Substrat statt nackte Pflanzenbasis.
- Das Plant-Asset-Lab ist qualitativ die richtige Richtung, ist aber noch komplett unpromoted und praktisch ungenutzt.

## Verbesserungsmatrix

| Priorität | Asset-ID oder geplanter Asset-Typ | Stage | Condition | Severity | Aktueller Zustand | Problem | Verbesserung | Gameplay-Nutzen | Risiko bei Umsetzung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | `baseline_stage_pack_v2` | alle Kernstages | healthy | none | Live nutzt einen Topf-gebundenen Foto-Sprite | Kein sauberes Layer-System, kein Premium-Look | 9 neue Baseline-Pflanzen ohne Topf/Substrat nach Lab-Konvention vorbereiten | Grundlage für alle späteren Zustände | Mittlerer Integrationsaufwand in späterer Phase |
| P0 | `cannabis_mid_flower_underwatered_medium_v001` | mid_flower | underwatered | medium | Nur generisches Icon, keine echte Pflanzenreaktion | Trockenstress ist gameplayrelevant, aber kaum sichtbar | Eigene Hauptpflanze mit klarer Turgor-/Hängeblatt-Lesbarkeit | Bessere Diagnose und schnellere Spielerreaktion | Mittel |
| P0 | `cannabis_mid_flower_overwatered_medium_v001` | mid_flower | overwatered | medium | Kein eigener Live-Pflanzenzustand | Überwässerung unterscheidet sich optisch nicht sauber von Trockenstress | Eigene schwere, dunklere, nach unten "geclawte" Version | Verhindert Fehlinterpretationen | Mittel |
| P0 | `cannabis_mid_flower_nutrient_burn_medium_v001` | mid_flower | nutrient_burn | medium | Nur kleines Badge/Overlay | Wichtiger Mid-/Late-Game-Fehler ist nicht auf Pflanzenebene lesbar | Sichtbare Blattspitzen-/Randnekrose auf Hauptpflanze | Höhere Lern- und Diagnosequalität | Mittel |
| P0 | `cannabis_mid_flower_heat_stress_medium_v001` | mid_flower | heat_stress | medium | Keine Hauptpflanzenvariante | Hitze/VPD sind im Code stark, visuell aber schwach | Taco-Blätter und Top-Canopy-Stress als klarer Midflower-State | Stärkerer Zusammenhang zwischen Klima und Pflanze | Mittel |
| P1 | `cannabis_mid_flower_light_stress_v001` | mid_flower | light_stress | medium | Nur generisches State-Icon vorhanden | Lichtstress fehlt in der Hauptpflanze | Gebleichte obere Zonen, leichte Spitzenbelastung | Bessere Lesbarkeit von PPFD-/Distanzfehlern | Mittel |
| P1 | `cannabis_mid_flower_magnesium_deficiency_medium_v001` | mid_flower | magnesium_deficiency | medium | `overlay_def_mg` nutzt generisches Deficiency-Bild | Mg-Mangel ist diagnostisch unsauber | Eigene interveinale Chlorose mit erkennbaren grünen Blattadern | Verbessert Diagnose-Gameplay deutlich | Mittel |
| P1 | `cannabis_mid_flower_nitrogen_deficiency_medium_v001` | mid_flower | nitrogen_deficiency | medium | `overlay_def_n` nutzt dasselbe Bild wie Mg | N- und Mg-Mangel sind visuell nicht getrennt | Eigene Vergilbung der unteren/älteren Fächerblätter | Spieler lernen Ursachen statt nur "Mangel" | Mittel |
| P1 | `cannabis_late_flower_mold_risk_warning_v001` oder Overlay-Set | late_flower | mold_risk_flower | warning | Nur `mold_warning`-Badge | Späte Feuchterisiken nicht glaubwürdig an Bud-/Canopy-Struktur ablesbar | Late-flower-spezifische Risk-Variante oder subtiler Overlay-Layer | Höhere Spannung in kritischer Spätphase | Niedrig bis mittel |
| P1 | `organic_transition_microset` | veg/preflower/flower | healthy | none | Stages springen über Cluster statt über echte Mikroübergänge | Harte Wahrnehmungssprünge zwischen Phasen | Zusätzliche Zwischenbilder für Übergangspunkte definieren | Weicher, hochwertiger Verlauf | Mittel |
| P2 | `cannabis_mid_flower_ph_lockout_medium_v001` | mid_flower | ph_lockout | medium | Diagnose kennt Root-/Uptake-Druck, Pflanze nicht | Wichtige Mischsymptomatik bleibt abstrakt | Eigene "mixed symptom" Pflanze für spätere Diagnose-Tiefe | Besserer Endgame-Lernwert | Mittel bis hoch |
| P2 | `condition_overlay_pack_v2` | mehrere | mildew/webbing/necrosis/yellowing | mixed | Overlays heute stilistisch iconhaft | Badge-Look statt Premium-Composite-Look | Echte transparente Pflanzen-Overlays nach Lab-Konzept | Saubere Trennung Baseline vs Condition | Niedrig |
| P2 | `genetics_variant_rules` | mehrere | genotype silhouette bias | none | `hybrid/indica/sativa` ohne Visual | Build-Auswahl hat keinen sichtbaren Charakter | Spätere Morphologie-Regeln pro Genetik definieren | Mehr Identität und Replay-Wert | Hoch, wenn zu früh umgesetzt |
| P3 | `late_game_disease_pack` | late_flower/harvest | bud_rot, septoria, root_rot | medium-heavy | Im Code/State-Universum vorbereitet, aber live kaum relevant sichtbar | Noch nicht der größte sofortige Gewinn | Späterer Ausbau mit disease-spezifischen Pflanzen und Overlays | Tiefere Diagnose und Endgame-Spannung | Hoch |

## Priorisierte Asset-Roadmap

### Sofort sinnvoll / P0

- 9 saubere Baseline-Assets ohne Topf/Substrat definieren:
  - `seedling`
  - `early_veg`
  - `mid_veg`
  - `late_veg`
  - `stretch`
  - `early_flower`
  - `mid_flower`
  - `late_flower`
  - `harvest_ready`
- 4 Kern-Condition-Assets für `mid_flower` vorbereiten:
  - `underwatered_medium`
  - `overwatered_medium`
  - `nutrient_burn_medium`
  - `heat_stress_medium`

### Sehr sinnvoll / P1

- Lesbare Deficiency-Trennung auf Pflanzenebene:
  - `nitrogen_deficiency_medium`
  - `magnesium_deficiency_medium`
- Lichtstress als eigener Midflower-State
- Late-flower-spezifische Mold-/Humidity-Risk-Darstellung
- Definierte Übergangsbilder an den harten Grenzen:
  - `late_veg -> stretch`
  - `stretch -> early_flower`
  - `late_flower -> harvest_ready`

### Optionaler Ausbau / P2

- pH-/Lockout-Mischsymptomatik
- echte transparente Condition-Overlays statt iconhafter Badges
- Recovery-State
- pest-/mildew-spezifische Overlays
- frühe Zusatzstages wie `germination` und `sprout` als eigene neue Baseline-Regeln

### Später / P3

- Genetik-/Strain-Varianten
- tiefe Disease-Packs
- Spezialzustände wie `overripe`, `senescent`, `failed_or_dead`

## Empfohlene nächste Phase

Nächster sinnvoller Schritt ist keine Bildgenerierung, sondern eine saubere Finalisierung der Zielmatrix:

- finaler Live-Scope für Baseline-Assets festlegen
- finaler Live-Scope für erste Condition-Assets festlegen
- genaue Stage-Mappings zwischen aktueller 12-Stufen-Simulation und neuem 9er-Baseline-Pack definieren
- klare Trennung dokumentieren:
  - Baseline-Assets
  - Full-plant Condition-Assets
  - Overlay-Assets
  - optionale Diagnose-/Leaf-Detail-Assets
- anschließend pro Asset einen konsistenten Generator-Prompt vorbereiten

## Konkreter Folgeprompt für Codex

```text
Du arbeitest weiter im Grow Simulator Repository.

Nutze als Grundlage:
- docs/plants/assets/current-plant-assets-quality-audit.md
- den vorhandenen Plant-Asset-Workflow / Plant-Asset-Lab
- nur die minimal nötigen Asset-Lab-Dateien

Wichtig:
- Noch keine Bilder generieren
- Keine Runtime-Änderungen
- Keine Savegame-Änderungen
- Keine unnötigen Refactors
- Keine Asset-Dateien verändern

Ziel:
Erstelle die endgültige, produktionsreife Pflanzen-Asset-Liste für Phase 1 der neuen Pflanzenvisualisierung und bereite dafür konsistente Prompt-Pakete vor.

Aufgabe:
1. Leite aus dem Audit eine finale Asset-Liste für Phase 1 ab.
2. Trenne klar zwischen:
   - Baseline-Assets
   - Full-plant Condition-Assets
   - Overlay-Assets
   - Optionalen Leaf-/Diagnosis-Assets
3. Mappe die neue Asset-Liste sauber auf die bestehende 12-Stufen-Simulation.
4. Entscheide, welche Stages in Phase 1 wirklich eigene Baseline-Assets brauchen und welche noch gemappt werden dürfen.
5. Definiere für jedes Asset:
   - finale Asset-ID
   - Dateiname
   - Stage
   - Condition
   - Severity
   - Einsatz im Spiel
   - ob Baseline, Full-plant Condition oder Overlay
6. Erstelle danach für jedes Phase-1-Asset einen konsistenten Prompt-Entwurf nach Plant-Asset-Lab-Standard.
7. Markiere offene Entscheidungen separat.

Output:
Erstelle einen Report unter:
docs/plants/assets/phase-1-plant-asset-list-and-prompt-prep.md

Der Report soll enthalten:
- finale Asset-Liste
- Stage-Mapping
- Begründung pro Asset-Gruppe
- Prompt-Vorlagen
- offene Entscheidungen

Kurz halten, aber konkret und umsetzbar.
```
