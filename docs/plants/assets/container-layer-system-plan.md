# Container Layer System Plan

## Kurzfazit

Die Pflanzen sollen weiter topffrei und transparent bleiben. Fuer die spaetere Visualisierung ist ein klar getrenntes Layer-System sinnvoll: separater Container, separates Medium, separate Pflanze, plus optionaler Kontakt-Schatten und ein Vorderkanten-/Occlusion-Layer fuer einen glaubwuerdigen Stem-Seat. Fuer die erste kleine Produktionsrunde reichen 8 Assets, wenn wir uns auf die bereits im Spiel angelegten Kernbegriffe `soil`, `coco` und `small|medium|large` fokussieren.

## Gefundene bestehende Topf-/Medium-Logik

- `state.setup.medium` ist im Schema als `soil | coco | hydro` vorgesehen.
- Live freigeschaltet ist aktuell nur `soil`; `coco` ist in der Progression bereits als spaeterer Unlock vorbereitet; `hydro` ist im State geplant, aber noch nicht als Setup-Unlock produktiv verdrahtet.
- `state.setup.potSize` laeuft aktuell ueber `small | medium | large`; Sim/Harvest kennen zusaetzlich bereits `xl/xlarge`.
- In den vorhandenen Onboarding-Assets existieren schon visuelle Kategorien fuer `pot_s`, `pot_m`, `pot_l`, `pot_xl` sowie `substrate_soil` und `substrate_coco`.
- Der bisherige Legacy-Pflanzen-Sprite war potgebunden. Der alte Alignment-Report arbeitet bereits mit `2048x2048` und einem konsistenten Topf-Rim-Y bei `1218`. Das ist ein brauchbarer Referenzwert fuer die spaetere Layer-Montage.

## Empfohlenes Layer-System

Ziel: Die Pflanze bleibt austauschbar nach Stage und Condition, waehrend Topf und Medium unabhaengig gewechselt werden koennen.

Bottom-to-top Render-Reihenfolge:

1. `shadow`
2. `container`
3. `substrate`
4. `plant`
5. `occlusion`

Layer-Bedeutung:

- `shadow`: nur kurzer Kontakt-/Bodenschatten unter dem Container, kein dramatischer Szenenschatten.
- `container`: der sichtbare Topf/Eimer/Netpot ohne Pflanze.
- `substrate`: die sichtbare Medium-Oberflaeche innerhalb des Containers.
- `plant`: transparentes Pflanzenasset ohne Topf und ohne Substrat.
- `occlusion`: vordere Rim-/Medium-Kante, die den unteren Stamm leicht ueberdeckt, damit die Pflanze nicht schwebt.

## Anchor- und Canvas-Regeln

- Alle Layer als `2048x2048` PNG mit Transparenz.
- Gemeinsamer Layer-Center: `x = 1024`.
- Empfohlene Container-Rim-Linie: `y = 1218`.
- Empfohlener Plant-Socket-Punkt: `x = 1024`, `y = 1232`.
- Die Pflanze selbst behaelt ihren virtuellen Bottom-Anchor; beim spaeteren Resolver wird dieser Anchor auf den Plant-Socket gelegt.
- Substratoberkante liegt leicht unter oder an der Rim-Linie, je nach Container-Typ.
- Occlusion ueberdeckt nur die untersten `20-40 px` des Stamms im Endbild, nie mehr.

Kompatibilitaetsregel:

- Neue Layer sollten sauber mathematisch auf `x = 1024` ausgerichtet werden.
- Beim spaeteren App-Hook darf fuer Legacy-Uebergaenge eine kleine Kompatibilitaetstoleranz von `+/- 8 px` erlaubt sein.

## Skalierungsregeln

- Container und Pflanze werden nicht gegenseitig in ihrer Biologie verfaelscht.
- Die Pflanzenstage bestimmt die Pflanzengroesse, nicht der Topf.
- Topfgroesse bestimmt nur, wie viel sichtbarer Rim, Medium-Flaeche und optischer Volumen-Kontrast sichtbar sind.

Faelle:

- Kleine Pflanze in grossem Topf:
  - viel sichtbare Medium-Flaeche
  - Stamm bleibt mittig
  - Pflanze nicht kuenstlich hochskalieren
- Grosse Pflanze in kleinem Topf:
  - Container darf bewusst etwas unterdimensioniert wirken
  - Pflanze nicht herunterskalieren, nur damit sie "passt"
  - Occlusion und Stem-Seat muessen sauber bleiben
- Seedling/Nursery:
  - besonders viel sichtbare leere Rim-/Medium-Flaeche erlaubt
- XL/Hydro spaeter:
  - breiterer Container-Footprint, aber identischer Socket

## Visuelle Regeln

- gleiche Perspektive fuer alle Layer
- gleiche Lichtquelle fuer Container, Medium und Pflanze
- kein Text
- keine UI
- kein Hintergrund
- kein eingebrannter Raum oder Tent
- Premium-Game-Asset-Look, leicht stilisiert, nicht noisy-fotografisch
- Pflanzen duerfen nicht im Topf schweben
- Stammfuss muss glaubwuerdig im Medium sitzen
- mobile Lesbarkeit auf `320 px` Hoehe, brauchbar auf `180 px`
- Container-Silhouette darf die Pflanze nicht dominieren

## Empfohlene Startlisten

### Container

- `nursery_pot_seedling`
- `plastic_round_3l`
- `plastic_round_7l`
- `fabric_pot_11l`
- `fabric_pot_15l`
- `fabric_pot_30l`
- `air_pot_15l`
- `hydro_bucket_20l`
- `rdwc_bucket_20l`

### Substrat / Medium

- `lightmix_soil`
- `living_soil_dark`
- `coco_perlite`
- `clay_pebbles`
- `rockwool_cube`
- `hydro_netpot_clay_pebbles`

## Produktionsmatrix

| Priority | Asset-ID | Asset-Typ | Groesse / Medium | Zweck im Spiel | Abhaengigkeit | Generator-Hinweis | QA-Hinweis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | `container_nursery_pot_seedling_v001` | container | nursery / seedling | glaubwuerdige Keimling- und Early-Veg-Basis | keine | kleiner schlichter Kunststoff-Anzuchttopf, frontale leichte 3/4-Perspektive, transparent | Rim sauber, nicht zu dominant, genug freie Medium-Flaeche |
| P0 | `container_plastic_round_3l_v001` | container | small | fruehe Standard-Topfklasse | keine | klassischer runder Kunststofftopf, robust, neutral | klare Silhouette, nicht cartoonhaft |
| P0 | `container_plastic_round_7l_v001` | container | medium | heutige Haupt-Basisklasse fuer Soil/Coco | keine | runder Kunststofftopf, etwas breiter und stabiler als 3l | Rim und Innenoeffnung gut lesbar |
| P0 | `container_fabric_pot_15l_v001` | container | large | groesserer Spaet-Run-Topf ohne Hydro | keine | dunkler Stofftopf, weiche Wandfalten, sauberer Rand | Stoffstruktur lesbar, aber nicht noisy |
| P1 | `container_fabric_pot_30l_v001` | container | xlarge | grosse Outdoor-/Late-Run-Variante | keine | breiter Stofftopf, mehr Volumen | nicht zu massiv, mobile lesbar |
| P2 | `container_air_pot_15l_v001` | container | large / airpot | spaetere Belueftungs-/Rootzone-Variante | keine | air-pot mit charakteristischer Loch-/Noppenstruktur | Muster darf nicht flimmern auf Mobile |
| P3 | `container_hydro_bucket_20l_v001` | container | hydro 20l | spaetere DWC-Basis | hydro medium spaeter | sauberer schwarzer Hydro-Bucket ohne Szene | klar als Bucket lesbar, nicht wie Erdetopf |
| P3 | `container_rdwc_bucket_20l_v001` | container | hydro 20l | spaetere RDWC-Variante | hydro medium spaeter | Bucket mit dezent technischem Deckel-Look | nicht zu technisch ueberladen |
| P0 | `substrate_lightmix_soil_moist_v001` | substrate | soil / moist | erste Standard-Soil-Oberflaeche | soil container | dunkle lockere Blumenerde, leicht feucht, sauber innerhalb des Topfrands | keine Steine/Objekte, klare Oberflaeche |
| P1 | `substrate_lightmix_soil_dry_v001` | substrate | soil / dry | trockene Soil-Variante fuer spaetere Zustandswechsel | soil container | heller, trockener, leicht krumiger Soil-Look | nicht sandig, nicht totgrau |
| P1 | `substrate_lightmix_soil_wet_v001` | substrate | soil / wet | stark feuchte Soil-Variante | soil container | dunkler, nasser, aber ohne Pfuetze | nicht spiegelnd, nicht schlammig |
| P0 | `substrate_coco_perlite_moist_v001` | substrate | coco / moist | wichtigste Coco-Basis fuer spaeteren Unlock | coco container | coco-braune Struktur mit klar sichtbaren Perlite-Punkten | Perlite lesbar, aber nicht ueberzeichnet |
| P1 | `substrate_coco_perlite_dry_v001` | substrate | coco / dry | trockene Coco-Variante | coco container | hellere, trockenere Coco-Oberflaeche mit Perlite | nicht mit Soil verwechseln |
| P1 | `substrate_coco_perlite_wet_v001` | substrate | coco / wet | nasse Coco-Variante | coco container | dunklere Coco-Oberflaeche, noch strukturiert | nicht matschig schwarz |
| P2 | `substrate_clay_pebbles_moist_v001` | substrate | hydro clay pebbles | Hydro-Start fuer Netpot/Bucket | hydro container | runde LECA-Pebbles, sauber lesbar | keine chaotische Tiefe |
| P2 | `substrate_rockwool_cube_v001` | substrate | hydro rockwool | fruehe Hydro-/Clone-Variante | hydro container | sauberer Rockwool-Block, neutral, leicht feucht | kein Labor-Look |
| P1 | `occlusion_front_rim_generic_v001` | occlusion | generic | laesst Stamm glaubwuerdig im Topf sitzen | Container-Rim-Geometrie | sehr dezente Vorderkante / vorderer Medium-Saum | darf Pflanze nicht verdecken |
| P1 | `shadow_contact_soft_generic_v001` | shadow | generic | erdet den Container optisch | Container-Silhouette | weicher kurzer Kontaktschatten, keine Szene | sehr subtil, mobil nicht matschig |

## Start-Charge mit maximal 8 Assets

Ziel: wenige Assets, aber sofort brauchbare Tests fuer aktuelle Spielrealitaet `soil + coco` sowie `small + medium + large`.

1. `container_nursery_pot_seedling_v001`
2. `container_plastic_round_3l_v001`
3. `container_plastic_round_7l_v001`
4. `container_fabric_pot_15l_v001`
5. `substrate_lightmix_soil_moist_v001`
6. `substrate_lightmix_soil_dry_v001`
7. `substrate_coco_perlite_moist_v001`
8. `substrate_coco_perlite_dry_v001`

Bewusste Nichtaufnahme in diese erste Charge:

- Hydro-Container und Hydro-Medien, weil sie im Live-Setup noch nicht priorisiert sind
- Shadow/Occlusion, weil die 8er-Startcharge zuerst Container- und Medium-Familien absichern soll
- `wet`-Varianten, weil fuer erste visuelle Stack-Tests `dry` und `moist` den groessten Unterschied liefern

## Vorbereitete Generator-Prompts fuer die Start-Charge

Gemeinsame Negativvorgaben fuer alle 8 Assets:

- kein Hintergrund
- kein Text
- keine UI
- keine Haende
- keine Werkzeuge
- keine Grow-Zelt-Szene
- keine zweite Pflanze
- keine Labels oder Skalen
- keine schmutzigen Fotoreste
- transparentes PNG

### `container_nursery_pot_seedling_v001`

Premium mobile game container asset, small neutral nursery seedling pot, simple thin plastic starter pot, front-facing slight 3/4 view, centered on transparent 2048x2048 canvas, clean rim opening, believable scale for very young cannabis seedling, no plant, no soil, no background, soft studio-like lighting, premium semi-realistic game asset style, readable silhouette at mobile size.

### `container_plastic_round_3l_v001`

Premium mobile game container asset, round 3 liter plastic grow pot, neutral dark gray plastic, front-facing slight 3/4 perspective, centered on transparent 2048x2048 canvas, clean circular rim and stable base, realistic but polished material, no plant, no substrate, no background, consistent light direction, strong readable silhouette.

### `container_plastic_round_7l_v001`

Premium mobile game container asset, round 7 liter plastic grow pot, slightly wider and more stable than a 3 liter nursery pot, neutral dark plastic, front-facing slight 3/4 perspective, transparent 2048x2048 canvas, clean interior opening, premium semi-realistic mobile game look, no plant, no soil, no background.

### `container_fabric_pot_15l_v001`

Premium mobile game container asset, 15 liter fabric pot, dark charcoal grow bag with soft realistic folds and clean stitched rim, front-facing slight 3/4 perspective, centered on transparent 2048x2048 canvas, believable thickness and volume, no plant, no substrate, no background, high readability at phone scale.

### `substrate_lightmix_soil_moist_v001`

Premium mobile game substrate layer, moist lightmix soil top surface for a cannabis container, centered transparent 2048x2048 canvas, visible only as the top fill surface seen from a slight front perspective, loose dark brown potting soil, lightly moist, fine crumb structure, no pot, no plant, no background, no mulch, no stones, clean readable texture.

### `substrate_lightmix_soil_dry_v001`

Premium mobile game substrate layer, dry lightmix soil top surface for a cannabis container, centered transparent 2048x2048 canvas, same perspective and framing as moist soil version, slightly lighter and drier crumb texture, believable dry top layer, no cracks of desert earth, no pot, no plant, no background.

### `substrate_coco_perlite_moist_v001`

Premium mobile game substrate layer, moist coco perlite top surface for a cannabis container, centered transparent 2048x2048 canvas, slight front perspective, medium-brown coco texture with clearly readable white perlite particles, slightly moist but not muddy, no pot, no plant, no background, strong mobile readability.

### `substrate_coco_perlite_dry_v001`

Premium mobile game substrate layer, dry coco perlite top surface for a cannabis container, centered transparent 2048x2048 canvas, same composition as moist coco version, slightly lighter drier coco fibers with visible perlite, no pot, no plant, no background, clean premium game texture, no extra debris.

## QA-Regeln

- alle Layer `2048x2048`
- transparenter Hintergrund
- keine Textelemente
- keine UI-Elemente
- gleiche Lichtquelle ueber alle Familien
- gleiche Perspektive ueber alle Familien
- Container-Rim gut lesbar
- Medium sitzt glaubwuerdig innerhalb eines gedachten Containers
- Medium darf nicht wie loses Freisteller-Chaos aussehen
- Container-Silhouette darf auf `320 px` und `180 px` nicht matschig werden
- keine stilistische Mischung aus Foto-Cutout und Cartoon
- Farbwerte von Soil und Coco muessen klar unterscheidbar bleiben
- Seedling-Topf muss klein genug sein, um spaetere kleine Pflanzen glaubwuerdig zu tragen

## Risiken

- Die Live-Setup-Logik kennt aktuell nur abstrakte Groessenbegriffe; Liter-Mappings bleiben fuer die spaetere Integration ein Resolver-Thema.
- Hydro ist datenmodellseitig angedeutet, aber noch kein gleichwertiger produktiver Setup-Pfad.
- Ohne spaetere Occlusion-/Shadow-Layer kann selbst ein guter Container-/Medium-Satz noch leicht "aufgesetzt" wirken.
- Die aktuelle Pflanzenserie ist ausserhalb Stage 09 noch nicht vollstaendig normalisiert; die Layer-Spezifikation muss deshalb anchor-streng bleiben.

## Empfohlene naechste Phase

Genau diese 8 Start-Charge-Assets erzeugen, visuell auf Perspektive/Anchor/Lesbarkeit pruefen und erst danach entscheiden, ob als naechstes `wet`-Varianten oder die generischen `shadow`-/`occlusion`-Layer folgen sollen.

## Konkreter Folgeprompt fuer die Generierung

Arbeite im Grow Simulator Repository.

Nutze zwingend den Plant-Assets-Skill:
`C:/Users/Marco/.codex/skills/grow-simulator-plant-asset-factory/SKILL.md`

Verbindliche Quelle:
`docs/plants/assets/container-layer-system-plan.md`

Ziel:
Generiere ausschliesslich die 8 dort definierte Start-Charge fuer das neue Container-/Substrat-Layer-System.

Zu erzeugende Assets:

1. `container_nursery_pot_seedling_v001`
2. `container_plastic_round_3l_v001`
3. `container_plastic_round_7l_v001`
4. `container_fabric_pot_15l_v001`
5. `substrate_lightmix_soil_moist_v001`
6. `substrate_lightmix_soil_dry_v001`
7. `substrate_coco_perlite_moist_v001`
8. `substrate_coco_perlite_dry_v001`

Regeln:

- keine App-Integration
- keine Runtime-Aenderungen
- keine Simulation-Aenderungen
- keine Savegame-Aenderungen
- keine UI-Aenderungen
- keine zusaetzlichen Assets
- alle Assets als transparente PNGs auf `2048x2048`
- gleiche Perspektive und Lichtlinie fuer die gesamte Charge
- keine Pflanze in Container-Assets
- kein Topf in Substrat-Assets
- keine Texte, keine Hintergruende, keine Umgebung

Output:

- echte Bildassets, falls Bildgenerierung verfuegbar ist
- sonst eine saubere Generierungs-Queue nur fuer diese 8 Assets
- kurzer Report mit QA-Status pro Asset
