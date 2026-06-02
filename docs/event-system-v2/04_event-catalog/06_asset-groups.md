# 06 — Asset Groups (AG-01 – AG-20)
*Grow Simulator V2 · Event System V2 · schemaVersion 3*

---

## 1. Philosophie: Warum Asset Groups?

Asset Groups sind **wiederverwendbare visuelle Bausteine**, die über mehrere Events hinweg eingesetzt werden. Statt für jedes Event komplett neue Assets zu erstellen, definiert das System eine begrenzte Anzahl hochwertiger Bild/Sprite-Sets, die kontextuell kombiniert werden.

**Vorteile:**
- Geringerer Asset-Produktionsaufwand (20 Gruppen statt 98+ Einzelsets)
- Konsistenter visueller Stil über alle Events
- Wiederverwendung schafft visuelle Sprache, die Spieler intuitiv lesen lernen
- Tier-System ermöglicht priorisierte Produktionsplanung

**Tier-System:**
| Tier | Priorität | Beschreibung | Beispiel |
|------|-----------|--------------|---------|
| **Tier 1** | MVP | Unbedingt notwendig für Kernspiel-Events | Pflanzensymptom-Sprites |
| **Tier 2** | V1.1 | Wichtig für Vollständigkeit und Qualitätsgefühl | Diagnose-Overlays |
| **Tier 3** | V2.0 | Premium-Features, Story-Tiefe | Cinematische Animationen |

---

## 2. Asset-Gruppen-Format

Jede Gruppe enthält:
- **Asset-IDs** (für JSON-Referenzen in Events)
- **Beschreibung** der visuellen Inhalte
- **Events**, die diese Gruppe nutzen
- **Tier-Klassifikation**
- **Technische Spezifikation**

---

## 3. Die 20 Asset-Gruppen

---

### AG-01: Pflanzen-Symptom-Sprites (Blätter)

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-01 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Pflanzensymptome |
| **Asset-Tag** | `symptom_leaf_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `symptom_leaf_yellow_tip` | Blattspitzen gelb, Rest grün | N-I-01, N-B-01 |
| `symptom_leaf_yellow_full` | Gesamtes Blatt gelb-blass | N-B-02 |
| `symptom_leaf_claw_down` | Blattspitzen nach unten eingerollt (N-Toxizität) | N-I-01 |
| `symptom_leaf_brown_edge` | Braune Ränder, verbrannt | W-B-03, L-I-01 |
| `symptom_leaf_purple_stem` | Lila/rote Stiele | K-B-01 |
| `symptom_leaf_spots_rust` | Rostbraune Flecken | P-B-04, N-O-01 |
| `symptom_leaf_interveinal` | Interveinalchlorose (Mg-Mangel) | N-B-02 |
| `symptom_leaf_droop` | Welkes, hängendes Blatt | W-I-02, K-I-03 |
| `symptom_leaf_curl_up` | Aufwärtsrollen (Hitzestress) | K-I-03, K-O-01 |
| `symptom_leaf_glossy` | Dunkelgrüne, glänzende Blätter (N-Überschuss) | N-I-01 |

**Technische Spec:**
- Format: PNG, transparent background
- Auflösung: 512×512px (Sprite-Sheet mit 10 Zuständen)
- Animation: leichtes Wippen-Loop (2fps, 3 Frames)
- Farbmodus: RGB, konsistent mit Pflanzenshader

---

### AG-02: Pflanzen-Gesundheits-Zustände (Ganzkörper)

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-02 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Pflanzen-Darstellung |
| **Asset-Tag** | `plant_state_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Trigger |
|----------|--------------|---------|
| `plant_state_healthy_veg` | Kräftige Pflanze, sattes Grün, Veg-Phase | Gesundheit > 80% |
| `plant_state_healthy_bloom` | Vollblüte, Buds sichtbar | Gesundheit > 80%, Stage S5+ |
| `plant_state_stressed_mild` | Leichte Droopiness, weniger Sattheit | Gesundheit 60–80% |
| `plant_state_stressed_heavy` | Deutliches Hängen, blasse Farbe | Gesundheit 40–60% |
| `plant_state_critical` | Fast tot, braune/gelbe Blätter dominant | Gesundheit < 40% |
| `plant_state_recovery` | Neuer Austrieb sichtbar trotz alter Schäden | Recovery-Events |
| `plant_state_harvest_ready` | Pralle Buds, Trichome sichtbar | Stage S7 |

**Technische Spec:**
- Vektorgrafik-Basis (SVG) für skalierbare Detailstufen
- 7 Zustandsstufen, interpolierbar
- Integration mit Health-Bar-System (prozentualer Übergang)

---

### AG-03: Wurzel-Visualisierungen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-03 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Wurzelzone |
| **Asset-Tag** | `root_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `root_healthy_white` | Weiße, dichte Wurzeln | R-B-02, SB-06 |
| `root_brown_rot` | Braune, schleimige Wurzeln | R-I-03 |
| `root_rootbound` | Wurzeln dicht gewickelt am Topfrand | R-I-01 |
| `root_compacted` | Substrat verdichtet, kaum Wurzeln sichtbar | R-I-02, R-O-01 |
| `root_oxygen_bubbles` | Sauerstoffblasen im Substrat (Hydroponik) | R-I-03 Recovery |
| `root_new_growth` | Feine weiße Wurzelspitzen (Wachstum) | R-B-02 |

**Technische Spec:**
- Durchschnitts-Cutaway-View (Querschnitt Topf)
- Zwei Rendermodi: „Querschnitt" (Tutorial) und „Lupe-Close-Up" (Detail)

---

### AG-04: Wasser- und Gieß-Indikatoren

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-04 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Wasser/Substrat |
| **Asset-Tag** | `water_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `water_substrate_dry` | Substrat trocken, hell, rissig | W-I-02, SB-03 |
| `water_substrate_ideal` | Dunkles Substrat, locker | Gesundheitszustand |
| `water_substrate_wet` | Substrat nass, dunkel, kompakt | W-I-01, W-B-01 |
| `water_runoff_normal` | Klares Runoff-Wasser | W-B-02 |
| `water_runoff_dark` | Dunkles, salziges Runoff | W-B-03 |
| `water_lift_test_light` | Topf-Heben-Animation (leicht) | SB-03 Tutorial |
| `water_lift_test_heavy` | Topf-Heben-Animation (schwer) | SB-03 Tutorial |
| `water_droplet_icon` | UI-Ikon für Gieß-Zustand | Global-HUD |

**Technische Spec:**
- Substrat-Sprites: 128×128px mit Farbverlauf-Shader
- Lift-Test-Animation: 8-Frame-Loop, physikbasiert

---

### AG-05: VPD- und Klima-Visualisierungen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-05 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Klima/VPD |
| **Asset-Tag** | `climate_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `climate_vpd_chart` | VPD-Ampel-Chart (grün/gelb/rot Zonen) | K-I-01, K-I-02, SB-07 |
| `climate_thermometer_high` | Thermometer rot, Hitzewarnzeichen | K-I-03, K-O-01 |
| `climate_thermometer_low` | Thermometer blau, Kälte | K-O-02, K-O-05 |
| `climate_humidity_droplets` | Wassertropfen-Cluster (hohe Luftfeuchtigkeit) | K-I-02, P-I-03 |
| `climate_airflow_arrows` | Luftstrom-Pfeile-Animation | T-I-01, K-I-04 |
| `climate_frost_overlay` | Frost-Kristalle-Overlay über Pflanze | K-O-02, K-O-05 |
| `climate_heat_shimmer` | Hitzeflimmer-Partikel | K-I-03, K-O-01 |
| `climate_co2_bubble` | CO₂-Blasen-Icon mit Konzentrations-Balken | K-I-04 |

**Technische Spec:**
- VPD-Chart: dynamisch generiert (keine statische Grafik), Werte aus GameState
- Partikel-Effekte: Shader-basiert, kein CPU-Overhead


---

### AG-06: Schädlings- und Krankheits-Sprites

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-06 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Schädlinge/Krankheiten |
| **Asset-Tag** | `pest_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `pest_spider_mite` | Spinnmilbe-Closeup + Webnetz | P-I-01 |
| `pest_fungus_gnat` | Trauermücke + Larve im Substrat | P-I-02 |
| `pest_thrips` | Thripse-Silhouette + Saugspuren | P-B-01 |
| `pest_aphid` | Blattlaus-Kolonie mit Ameise | P-O-02 |
| `pest_caterpillar` | Raupe + Fraßschaden | P-O-01 |
| `pest_slug_trail` | Schnecke + Schleimpur | P-O-05 |
| `disease_botrytis` | Botrytis-Grauschimmel auf Bud | P-B-02, P-O-03 |
| `disease_powdery_mildew` | Weißer Mehltau auf Blatt | P-I-03, P-O-04 |
| `disease_septoria` | Septoria-Flecken (gelb mit braunem Rand) | P-B-04 |
| `disease_pythium` | Pythium-Befund (braune Wurzeln mit Schleimfilm) | R-I-03 |

**Technische Spec:**
- Alle Schädlings-Sprites: Makro-Stil, naturalistisch
- Krankheits-Overlays: semi-transparent, layerbar auf Pflanzenzustand
- Bewegungs-Animation für Milben/Läuse (einfacher 2-Frame-Loop)

---

### AG-07: Licht- und PPFD-Visualisierungen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-07 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Licht/PPFD |
| **Asset-Tag** | `light_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `light_burn_bleached` | Ausgebleichte, weiß-gelbe Blattspitzen | L-I-01 |
| `light_ppfd_heatmap` | PPFD-Heatmap-Overlay (blau-grün-rot) | L-I-06, SB-07 |
| `light_dli_bar` | DLI-Balkendiagramm mit Tagessumme | L-I-04 |
| `light_spectrum_switch` | Lichtfarb-Vergleich (Veg-blau vs. Bloom-rot) | L-I-05 |
| `light_distance_diagram` | Lampe-Abstand-Schema mit Intensitätsgefälle | L-I-01 Tutorial |
| `light_leak_night` | Lichtleck im dunklen Raum (dramatisch) | L-I-03 |
| `light_seedling_soft` | Sanftes Licht über Keimling (Tutorial) | L-I-04 |
| `light_canopy_even` | Gleichmäßige Canopy von oben (Zielzustand) | L-I-06 |

**Technische Spec:**
- PPFD-Heatmap: dynamisch aus echten Messwerten generiert
- Light-Burn-Sprites: mit Verlaufs-Shader (gesund → verbrannt)

---

### AG-08: Nährstoff- und pH-Diagramme

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-08 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Nährstoffe/pH |
| **Asset-Tag** | `nutrient_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `nutrient_ph_scale` | pH-Skala 4.0–8.0 mit Verfügbarkeits-Balken | N-B-03, SB-11 |
| `nutrient_ec_meter` | EC-Meter-Animation (Wert zu hoch/niedrig) | T-I-04, W-B-03 |
| `nutrient_deficiency_chart` | Nährstoff-Mangel-Tabelle (visuell) | N-B-02, N-O-01 |
| `nutrient_lockout_icon` | Schloss-Icon über Nährstoffmolekül | N-B-03 |
| `nutrient_flush_water` | Flush-Wasserstrahl mit klarem Runoff | B-I-01 |
| `nutrient_salt_buildup` | Weißliche Salzablagerungen auf Substrat | W-B-03, N-O-02 |
| `nutrient_organic_matter` | Kompost/Humus-Textur (Outdoor-Kontext) | N-O-01, N-O-03 |

**Technische Spec:**
- pH-Skala: dynamisch animiert (Pfeil auf aktuellem pH-Wert)
- Nährstoff-Tabelle: als interaktive Karte (Spieler kann tippen für Details)

---

### AG-09: Technik-Equipment-Illustrationen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-09 |
| **Tier** | 2 (V1.1) |
| **Kategorie** | Technik/Equipment |
| **Asset-Tag** | `tech_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `tech_fan_broken` | Lüfter mit Rauch/rotem X | T-I-01 |
| `tech_ph_meter_dirty` | pH-Meter mit Kalkablagerungen | T-I-02 |
| `tech_timer_error` | Timer mit falschem Zeitplan angezeigt | T-I-03 |
| `tech_ec_meter_drift` | EC-Meter mit Driftwert-Warnung | T-I-04 |
| `tech_carbon_filter_clogged` | Kohlefilter mit Verstopfungsindikator | T-I-05 |
| `tech_pump_failure` | Pumpe mit Luft-Blasen/Fehlerzustand | T-I-06 |
| `tech_led_overheat` | LED-Treiber rot leuchtend + Temperaturwarnung | T-I-07 |
| `tech_hygrometer_wrong` | Hygrometer an falscher Stelle (Wand vs. Canopy) | T-I-08 |
| `tech_checklist` | Checklisten-UI-Element für Technik-Wartung | Global |

**Technische Spec:**
- Illustrativer Stil (nicht foto-realistisch), konsistent mit Game-Artstyle
- Fehler-Zustand erkennbar durch Rot/Gelb-Highlights + Icon-Overlay

---

### AG-10: Trichom-Makro-Visualisierungen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-10 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Ernte/Trichome |
| **Asset-Tag** | `trichome_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `trichome_clear` | Klare, transparente Trichome | SB-18 |
| `trichome_cloudy` | Milchweiße, wolkige Trichome | SB-18, B-B-01 |
| `trichome_amber` | Bernsteinfarbene Trichome (Überreife) | SB-18, B-B-01 |
| `trichome_mixed_optimal` | Mix 70% wolkig / 30% bernstein | SB-20 |
| `trichome_zoom_animation` | Zoom-In-Animation von Bud auf Einzeltrichom | SB-18 |
| `trichome_loupe_overlay` | Lupen-UI-Overlay für Minispiel | B-B-01 |

**Technische Spec:**
- Makro-Fotografie-Stil (sehr hoher Detailgrad)
- Zoom-Animation: 60fps, 3-Sekunden-Sequenz
- Trichome: 3D-modelliert, Lichtbrechung simuliert

---

### AG-11: Training-Techniken-Illustrationen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-11 |
| **Tier** | 2 (V1.1) |
| **Kategorie** | Training |
| **Asset-Tag** | `training_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `training_lst_correct` | LST richtig: Ast gebogen, fixiert | TR-I-01 Tutorial |
| `training_lst_wrong` | LST falsch: Ast gebrochen | TR-I-01 Fehler |
| `training_topping_diagram` | Topping-Schnittstelle mit Pfeil + Callouts | TR-I-02 |
| `training_lollipop_before` | Pflanze vor Lollipopping (viel Unterholz) | TR-I-03 |
| `training_lollipop_after` | Pflanze nach Lollipopping (sauber) | TR-I-03 |
| `training_scrog_net` | SCROG-Netz mit Ast-Integration | TR-B-02 |
| `training_branch_splint` | Gebrochener Ast mit Pflaster/Splint | TR-O-01 |
| `training_canopy_top_view` | Draufsicht: gleichmäßige Canopy Ziel | TR-B-02 |

**Technische Spec:**
- Diagramm-Stil mit Annotations (kein Fotorealismus)
- „Before/After"-Splits für Trainings-Effekte


---

### AG-12: Outdoor-Wetter-Visualisierungen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-12 |
| **Tier** | 1 (MVP, Outdoor) |
| **Kategorie** | Outdoor/Wetter |
| **Asset-Tag** | `weather_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `weather_heatwave` | Sonne + Hitzeflimmer-Overlay | K-O-01 |
| `weather_frost` | Frost-Kristalle auf Blättern + blauer Himmel | K-O-02, K-O-05 |
| `weather_heavy_rain` | Regenvorhang + Pfützen | K-O-03, W-O-01 |
| `weather_wind` | Windböe-Partikel, Äste im Wind | K-O-04 |
| `weather_forecast_icon` | Wetter-Vorhersage-UI (3-Tage-Vorschau) | K-O-01–05 |
| `weather_sunscald` | Verbrannte Stellen nach Sonnenexposition | W-O-03 |
| `weather_overcast` | Bewölkter Himmel, gedämpftes Licht | K-O-03 |
| `weather_autumn_light` | Warmes Herbstlicht, niedrige Sonne | EC-09, K-O-05 |

**Technische Spec:**
- Wetter-Overlays: full-screen, semi-transparent
- Forecast-Icon: dynamisch aus Wetter-Engine generiert

---

### AG-13: Botrytis- und Pilz-Progression

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-13 |
| **Tier** | 1 (MVP) |
| **Kategorie** | Schädlinge/Pilze (detailliert) |
| **Asset-Tag** | `botrytis_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `botrytis_early_brown` | Frühe Botrytis: einzelne braune Stelle am Bud | P-B-02 früh |
| `botrytis_gray_mold` | Fortgeschrittener Grauschimmel | P-B-02, P-O-03 |
| `botrytis_full_bud_loss` | Kompletter Bud-Verlust durch Botrytis | P-B-02 Schwere 5 |
| `botrytis_removal_correct` | Chirurgisches Entfernen mit Desinfektions-Icon | P-B-02 Lösung |
| `botrytis_spore_closeup` | Botrytis-Sporen-Makro (Lernvisualisierung) | Lernkontext |

**Technische Spec:**
- Progression: 4-stufige Animation (früh → mittel → schwer → verloren)
- Emotionaler Impact bewusst gestaltet (nicht zu eklig, aber eindeutig ernst)

---

### AG-14: Kompetenz-Karte (CompetenceMap UI)

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-14 |
| **Tier** | 1 (MVP) |
| **Kategorie** | UI/HUD |
| **Asset-Tag** | `competence_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `competence_map_base` | Basis-Spinnennetz-Diagramm (leer) | CompetenceMap |
| `competence_map_filled` | Gefülltes Diagramm mit KP-Werten | CompetenceMap |
| `competence_skill_watering` | Wasser-Icon für KP-Bereich | CompetenceMap |
| `competence_skill_nutrients` | Nährstoff-Icon | CompetenceMap |
| `competence_skill_climate` | VPD/Klima-Icon | CompetenceMap |
| `competence_skill_pests` | Schädlings-Icon | CompetenceMap |
| `competence_skill_harvest` | Ernte-Icon | CompetenceMap |
| `competence_skill_training` | Training-Icon | CompetenceMap |
| `competence_level_up_flash` | Level-Up-Aufblitz-Animation | Beat-System |
| `competence_mastery_badge` | Mastery-Abzeichen für SB-27 | SB-27 |

**Technische Spec:**
- Spinnennetz-Diagramm: dynamisch gerendert (SVG/Canvas), animiert bei Level-Up
- Farb-Gradient: Grau (0.0) → Grün (0.5) → Gold (1.0)

---

### AG-15: Journal- und Achievement-UI-Elemente

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-15 |
| **Tier** | 2 (V1.1) |
| **Kategorie** | UI/Journal |
| **Asset-Tag** | `journal_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `journal_page_texture` | Papier-Textur für Journal-Einträge | Journal-UI |
| `journal_ink_pen_animation` | Stift-Schreib-Animation | Beat nach Event |
| `journal_stamp_success` | Grüner Stempel „Gelöst" | Nach Event-Lösung |
| `journal_stamp_fail` | Roter Stempel „Gelernt" | Nach Plant-Loss |
| `achievement_toast_bg` | Hintergrund für Achievement-Toast | Achievement-System |
| `achievement_icon_shield` | Schild-Icon für Schädlings-Achievements | AG-06-Achievements |
| `achievement_icon_droplet` | Tropfen-Icon für Wasser-Achievements | AG-04-Achievements |
| `achievement_icon_star` | Stern-Icon für Mastery-Achievements | SB-27 |

**Technische Spec:**
- Journal: Papier-Textur + Handschrift-Typografie-Option
- Achievement-Toast: Non-blocking, 3s Dauer, slide-in von rechts

---

### AG-16: Story-Beat-Overlay-Rahmen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-16 |
| **Tier** | 2 (V1.1) |
| **Kategorie** | UI/Story |
| **Asset-Tag** | `beat_overlay_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `beat_overlay_tonality_a` | Rahmen Typ A (warm, amber, Bloom-Partikel) | SB mit Tonalität A |
| `beat_overlay_tonality_b` | Rahmen Typ B (kühl, blau/teal, Diagramm-Option) | SB mit Tonalität B |
| `beat_overlay_tonality_c` | Rahmen Typ C (neutral, grau, ruhig) | SB mit Tonalität C |
| `beat_coach_avatar_wonder` | Coach-Avatar: staunend, Augen groß | Tonalität A |
| `beat_coach_avatar_explain` | Coach-Avatar: erklärend, zeigend | Tonalität B |
| `beat_coach_avatar_pause` | Coach-Avatar: nachdenklich, ruhig | Tonalität C |
| `beat_background_bloom` | Sanfter Licht-Bloom-Hintergrund | Alle Beats |

**Technische Spec:**
- Overlays: full-screen modal, Hintergrund dimmed zu 70%
- Coach-Avatar: animiert (Mund-Lipp-Sync bei Sprachausgabe falls aktiviert)

---

### AG-17: Outdoor-Saison-Panoramen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-17 |
| **Tier** | 3 (V2.0) |
| **Kategorie** | Outdoor/Cinematisch |
| **Asset-Tag** | `outdoor_panorama_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `outdoor_panorama_spring` | Frühlingsgarten, grünes Licht, Aufbruchsstimmung | SB-25, S-O-01 |
| `outdoor_panorama_summer` | Hochsommer, volle Sonne, üppiges Wachstum | K-O-01 |
| `outdoor_panorama_autumn` | Herbstlicht, goldene Töne, Ernte-Stimmung | EC-09, S-O-02 |
| `outdoor_panorama_frost` | Frost-Morgen, blaues Licht, Dringlichkeit | K-O-05 |
| `outdoor_transition_timelapse` | Saison-Zeitraffer: Frühling → Herbst | EC-09 Abschluss |

**Technische Spec:**
- Panorama: 2:1 Format, parallax-scrollbar
- Zeitraffer: 30-Sekunden-Sequenz, 4K-Textur-Basis
- Tier 3: Produktion abhängig von Budget-Phase V2.0

---

### AG-18: Ernte- und Trocknungs-Visualisierungen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-18 |
| **Tier** | 2 (V1.1) |
| **Kategorie** | Post-Harvest |
| **Asset-Tag** | `harvest_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `harvest_scissors_slow` | Zeitlupe-Schere-Animation | SB-20 |
| `harvest_drying_room` | Hängende Buds im Trocknungsraum | SB-24 |
| `harvest_hygrometer_room` | Hygrometer in Trocknungsraum | SB-24 |
| `harvest_stem_snap_test` | Stem-Snap-Test-Animation (knackt) | SB-24 |
| `harvest_jar_opening` | Glas öffnen, Duft-Partikel | SB-24 Abschluss |
| `harvest_bud_closeup` | Bud-Makro fertig getrocknet | Post-Harvest |

**Technische Spec:**
- Scissors-Animation: 60fps, physikbasiert
- Duft-Partikel: Partikel-System, kaum sichtbar aber atmosphärisch

---

### AG-19: Event-Typen-Icons (UI)

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-19 |
| **Tier** | 1 (MVP) |
| **Kategorie** | UI/Icons |
| **Asset-Tag** | `event_type_icon_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `event_type_crisis` | 🔴 Rotes Ausrufezeichen | Schwere-4/5-Events |
| `event_type_observation` | 🔵 Blaues Auge | Beobachtungs-Events |
| `event_type_recovery` | 🟢 Grünes Aufwärtspfeil-Herz | Recovery-Events |
| `event_type_learning` | 🟡 Gelbes Buch/Glühbirne | Lernmomente |
| `event_type_nearmiss` | 🟠 Oranges Dreieck/Warnung | Near-Miss-Events |
| `event_chain_icon` | Kettenglied-Icon für Ketten-Events | Alle Chain-Akte |
| `event_beat_icon` | Stern-Icon für Story-Beats | Alle Beats |

**Technische Spec:**
- Icons: 64×64px, klar lesbar auch bei 50% Größe
- Farbkodierung strikt nach Event-Typ-Taxonomie (konsistent mit 03_shared-events.md)

---

### AG-20: Diagnose-Karten und Vergleichstabellen

| Feld | Inhalt |
|------|--------|
| **Group-ID** | AG-20 |
| **Tier** | 2 (V1.1) |
| **Kategorie** | UI/Lernhilfe |
| **Asset-Tag** | `diagnosis_*` |

**Enthaltene Assets:**

| Asset-ID | Beschreibung | Genutzt von |
|----------|--------------|-------------|
| `diagnosis_trichome_vs_mildew` | Vergleich: Trichome vs. Mehltau | P-B-03, SB-18 |
| `diagnosis_senescence_vs_deficiency` | Seneszenz vs. echter N-Mangel | N-B-01 |
| `diagnosis_overwater_vs_underwater` | Überwatering vs. Trockenheit (Symptomvergleich) | W-B-01, W-I-02 |
| `diagnosis_ph_lockout_chart` | pH-Lockout-Tabelle pro Nährstoff | N-B-03 |
| `diagnosis_vpd_window` | VPD-Zielbereich pro Wachstumsphase | K-I-01, SB-07 |
| `diagnosis_interactive_card` | Interaktive Diagnose-Karte (tippbar) | Globales Diagnosesystem |

**Technische Spec:**
- Diagnose-Karten: interaktiv (tippen für Detailansicht)
- Vergleichstabellen: side-by-side Layout, farbkodiert
- Exportierbar ins Journal nach erstem Anzeigen


---

## 4. Übersichtstabelle: Alle 20 Asset-Gruppen

| Group-ID | Titel | Tier | Kategorie | Assets | Key-Events |
|----------|-------|------|-----------|--------|-----------|
| AG-01 | Symptom-Sprites Blätter | 1 | Symptome | 10 | N-I-01, N-B-02, K-B-01 |
| AG-02 | Pflanzen-Gesundheitszustände | 1 | Pflanze | 7 | Global |
| AG-03 | Wurzel-Visualisierungen | 1 | Wurzel | 6 | R-I-03, R-B-02, SB-06 |
| AG-04 | Wasser-/Gieß-Indikatoren | 1 | Wasser | 8 | W-I-01, W-B-02, SB-03 |
| AG-05 | VPD/Klima-Visualisierungen | 1 | Klima | 8 | K-I-01, K-I-02, SB-07 |
| AG-06 | Schädlings-/Krankheits-Sprites | 1 | Schädlinge | 10 | P-B-02, P-I-01, R-I-03 |
| AG-07 | Licht/PPFD-Visualisierungen | 1 | Licht | 8 | L-I-01, L-I-06, SB-18 |
| AG-08 | Nährstoff-/pH-Diagramme | 1 | Nährstoffe | 7 | N-B-03, SB-11 |
| AG-09 | Technik-Equipment | 2 | Technik | 9 | T-I-01–T-I-08 |
| AG-10 | Trichom-Makros | 1 | Ernte | 6 | SB-18, SB-20, B-B-01 |
| AG-11 | Training-Illustrationen | 2 | Training | 8 | TR-I-01, TR-I-02, TR-B-02 |
| AG-12 | Outdoor-Wetter | 1 | Outdoor | 8 | K-O-01–05, EC-09 |
| AG-13 | Botrytis-Progression | 1 | Pilze | 5 | P-B-02, P-O-03 |
| AG-14 | CompetenceMap UI | 1 | UI/HUD | 10 | Global |
| AG-15 | Journal/Achievement UI | 2 | UI | 8 | Global |
| AG-16 | Story-Beat-Overlays | 2 | UI/Story | 7 | Alle Beats |
| AG-17 | Outdoor-Panoramen | 3 | Cinematic | 5 | EC-09, SB-25 |
| AG-18 | Ernte/Trocknungs-Visuals | 2 | Post-Harvest | 6 | SB-20, SB-24 |
| AG-19 | Event-Typ-Icons | 1 | UI/Icons | 7 | Global |
| AG-20 | Diagnose-Karten | 2 | UI/Lernhilfe | 6 | P-B-03, N-B-01, N-B-03 |

**Asset-Zählung nach Tier:**
- **Tier 1 (MVP):** AG-01–08, AG-10, AG-12, AG-13, AG-14, AG-19 → 13 Gruppen, ~111 Assets
- **Tier 2 (V1.1):** AG-09, AG-11, AG-15, AG-16, AG-18, AG-20 → 6 Gruppen, ~44 Assets
- **Tier 3 (V2.0):** AG-17 → 1 Gruppe, ~5 Assets

**Total: 20 Gruppen, ~160 Asset-Einträge**

---

## 5. Codex-Auftrag #005F — Asset-System implementieren

**Scope:** Asset-Referenzsystem + Asset-Loader

**Neue Dateien:**
```
src/assets/
  assetRegistry.ts         # Zentrale Asset-ID → Pfad Zuordnung
  assetGroups.ts           # 20 Gruppen-Definitionen (typisiert)
  AssetLoader.ts           # Lazy-Loading mit Priorität nach Tier

data/assets/
  asset-manifest.json      # Vollständige Asset-Liste mit Metadaten

src/ui/assets/
  AssetPreloader.tsx       # Preload Tier-1-Assets beim App-Start
  DynamicAssetImage.tsx    # Komponente für kontextabhängige Asset-Auswahl
```

**Asset-Registry-Format:**
```typescript
interface AssetEntry {
  assetId: string;          // e.g. "symptom_leaf_yellow_tip"
  groupId: string;          // e.g. "AG-01"
  tier: 1 | 2 | 3;
  path: string;             // e.g. "assets/symptoms/leaf_yellow_tip.png"
  type: "sprite" | "animation" | "diagram" | "overlay" | "icon";
  usedByEvents: string[];   // Event-IDs die dieses Asset nutzen
  dimensions: { width: number; height: number };
}
```

**Ladereihenfolge:**
1. App-Start: Tier-1-Assets preloaden
2. Event-Trigger: Event-spezifische Tier-2-Assets nachladen
3. Story-Beats: Beat-Overlays (AG-16) nur bei Beat-Trigger laden
4. Tier-3: Nur nachladen wenn User in entsprechender Game-Phase

**Quality-Check für Codex:**
- [ ] Alle Asset-IDs in Event-JSONs sind in assetRegistry.ts registriert
- [ ] Tier-1-Assets verursachen < 5MB initialen Download
- [ ] Keine Asset-IDs doppelt vergeben
- [ ] Fallback-Assets für alle Tier-2/3-Einträge definiert (Tier-1-Equivalent)
- [ ] Asset-Manifest versioniert (Breaking changes bei Umbenennung)

---

*Datei: `docs/event-system-v2/04_event-catalog/06_asset-groups.md`*
*Stand: Vollständig — 20 Asset-Gruppen, ~160 Assets, Tier-1/2/3-Klassifikation*
*Erstellt als Teil von Event System V2 Spec — schemaVersion 3*
