# Final Plant Asset Production Plan

## Kurzfazit

Die beste erste Ausbaustufe ist ein sauber getrenntes Pflanzen-System ohne eingebrannten Topf/Substrat-Look. Die Start-Charge sollte nicht viele Assets liefern, sondern genau die Assets, die sofort sichtbar mehr Qualität bringen: klare Baseline-Stages, saubere Stage-Transitions und wenige, sehr lesbare Condition-Assets fuer die wichtigsten Stressarten.

## Finale Asset-Produktionslogik

- Baseline-Assets sind immer die optische Hauptspur.
- Condition-Assets sind nur fuer klare, gameplayrelevante Lesbarkeit da.
- Topf und Substrat werden nicht in Pflanzenassets eingebrannt.
- Alle Pflanzenassets muessen dieselbe Kamera, denselben Lichtcharakter und dieselbe Grundperspektive haben.
- Die wichtigste Qualitaet entsteht durch konsistente Stages und organische Uebergaenge, nicht durch viele Spezialeffekte.
- Erst wenn die Baseline sauber steht, lohnen sich feinere Disease-, Pest- und Lockout-Varianten.
- Strain-Differenzierung ist fuer diese Phase noch nicht vorrangig. Erst die Pflanzenlogik, dann Spaetdifferenzierung.

## Vollstaendige Asset-Prioritaetenliste

| Priority | Asset-ID | Strain | Stage | Asset-Typ | Condition | Severity | Zweck im Spiel | Warum dieses Asset wichtig ist | Abhaengigkeit zu bestehendem Asset | Generator-Hinweise | QA-Hinweise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | `cannabis_seedling_healthy_v001` | shared | seedling | baseline | healthy | none | Fruehspiel-Baseline | Erste klar lesbare, nackte Pflanze ohne Topf | Audit empfiehlt Ersatz des Foto-Sprites | voll sichtbar, zarte Keimlingform, sehr wenig Blattmasse | saubere Silhouette, kein Topf, kein Substrat |
| P0 | `cannabis_early_veg_healthy_v001` | shared | early_veg | baseline | healthy | none | Wachstumseinstieg | Macht den Sprung vom Seedling zur Veg lesbar | ersetzt veg-Cluster im Sprite | offene Internodien, erste echte Faecherblaetter | konsistente Hoehe und Anchor |
| P0 | `cannabis_mid_veg_healthy_v001` | shared | mid_veg | baseline | healthy | none | Haupt-Rhythmus | Wichtigste Standardansicht fuer den Run | Basis fuer viele Condition-Assets | ausgewogene Blattmasse, klare Struktur | starkste Alltagssicht, hochwertig und ruhig |
| P0 | `cannabis_late_veg_healthy_v001` | shared | late_veg | baseline | healthy | none | Pre-Flip-Reife | Zeigt dichte, reifere Veg ohne Sprung | ersetzt spaete Veg-Cluster | mehr Aeste, dichtere Krone, keine Blueten | keine Topfdominanz, gleiche Kameralinie |
| P0 | `cannabis_stretch_healthy_v001` | shared | stretch | baseline | healthy | none | Uebergang in Bloom | Macht den Stretch als eigene Phase sichtbar | mappen auf bisherige Cluster-Grenze | laengere Internodien, schlankere Form | klarer Unterschied zu late_veg und early_flower |
| P0 | `cannabis_early_flower_healthy_v001` | shared | early_flower | baseline | healthy | none | Bluete startet | Fruehe Blueten sichtbar, noch attraktiv | Basis fuer Flower-Conditions | erste Budsites, noch leichte Blattdominanz | keine uebertriebenen Buds |
| P0 | `cannabis_mid_flower_healthy_v001` | shared | mid_flower | baseline | healthy | none | Haupt-Diagnosephase | Wichtigste Stage fuer Diagnose und Condition-Lesbarkeit | Basis fuer Kernstress-Assets | klare Cola-Entwicklung, gute Blatt/Bud-Balance | sehr gute mobile Lesbarkeit |
| P0 | `cannabis_late_flower_healthy_v001` | shared | late_flower | baseline | healthy | none | Reifephase | Zeigt spaete Bluete mit mehr Masse | wichtig fuer Fade und Risiko-Look | dichtere Buds, natuerlicher Fade erlaubt | sauberer Uebergang zu harvest_ready |
| P0 | `cannabis_harvest_ready_healthy_v001` | shared | harvest_ready | baseline | healthy | none | Erntefenster | Abschlussbild fuer Run und Summary | finales Baseline-Asset | reife, volle Pflanze ohne Ueberladung | klar reif, aber nicht tot oder uebertrieben |
| P0 | `cannabis_mid_flower_underwatered_medium_v001` | shared | mid_flower | condition | underwatered | medium | Wasserstress lernen | Trockenstress muss sofort von Overwatering unterscheidbar sein | kann auf mid_flower healthy aufbauen | hängende, aber trockene Blatter, leichte Rollung | nicht zu extrem, aber klar lesbar |
| P0 | `cannabis_mid_flower_overwatered_medium_v001` | shared | mid_flower | condition | overwatered | medium | Wasserstress lernen | Overwatering braucht andere Form als Dry Stress | kann auf mid_flower healthy aufbauen | schwere, dunklere, nach unten gezogene Blatter | nicht mit underwatered verwechselbar |
| P0 | `cannabis_mid_flower_heat_stress_medium_v001` | shared | mid_flower | condition | heat_stress | medium | Klima lesen | Hitze/VPD sollen visuell sofort erkennbar sein | basiert auf mid_flower healthy | Taco-Leafs, gespannte Topzone, trockenere Anmutung | keine extreme Schaeden bei medium |
| P0 | `cannabis_mid_flower_nutrient_burn_medium_v001` | shared | mid_flower | condition | nutrient_burn | medium | Feed-Fehler lesen | Wichtiger Midgame-Fehler, braucht eigene Pflanzenreaktion | basiert auf mid_flower healthy | Spitzen- und Randnekrosen, sonst noch vital | nicht uebermaessig krank |
| P1 | `cannabis_early_veg_light_stretch_transition_v001` | shared | early_veg -> mid_veg | transition | healthy | none | weicher Stufenwechsel | Glattere Uebergangskurve statt harter Sprung | optionaler Ersatz fuer einzelnen Cluster-Frame | etwas mehr Volumen, aber noch juvenile Form | nur als Zwischenbild, nicht als neue Stage |
| P1 | `cannabis_mid_veg_light_stretch_transition_v001` | shared | mid_veg -> late_veg | transition | healthy | none | weicher Stufenwechsel | Verhindert Abriss zwischen Veg und spaeter Veg | optionaler Ersatz fuer einzelnen Cluster-Frame | dichter, breiter, aber nicht ueberreif | gleiche Kamera, gleicher Anchor |
| P1 | `cannabis_late_veg_to_stretch_transition_v001` | shared | late_veg -> stretch | transition | healthy | none | Flip sichtbar machen | Uebergang in Stretch ist gameplayrelevant | optionaler Grenzframe | erste Verlaengerung der Internodien | deutliche, aber elegante Morphologieaenderung |
| P1 | `cannabis_stretch_to_early_flower_transition_v001` | shared | stretch -> early_flower | transition | healthy | none | Bluete-Start sichtbar machen | Der wichtigste visuelle Phasenwechsel | optionaler Grenzframe | Stretch bleibt, erste Budsites tauchen auf | keine harten Spruenge |
| P1 | `cannabis_mid_flower_light_stress_v001` | shared | mid_flower | condition | light_stress | medium | Lichtstress lesen | Lichtprobleme sind im Code wichtig und muessen sichtbar werden | basiert auf mid_flower healthy | gebleichte Topzone, leichte Spitzenbelastung | nicht blendend weiss, nur plausibel heller |
| P1 | `cannabis_mid_flower_magnesium_deficiency_medium_v001` | shared | mid_flower | condition | magnesium_deficiency | medium | Deficiency lesen | Mg-Mangel muss von N-Mangel unterschieden werden | basiert auf mid_flower healthy | interveinale Chlorose, gruene Adern bleiben | nicht wie N-Mangel aussehen |
| P1 | `cannabis_mid_flower_nitrogen_deficiency_medium_v001` | shared | mid_flower | condition | nitrogen_deficiency | medium | Deficiency lesen | N-Mangel ist der haeufigste visuelle Reizfaktor | basiert auf mid_flower healthy | Vergilbung aelterer/unterer Blaetter | klar anderer Look als Mg |
| P1 | `cannabis_late_flower_mold_risk_warning_v001` | shared | late_flower | condition | mold_risk_flower | warning | Spaetrisiko anzeigen | Bud-Risiko braucht eine premium, subtile Lesbarkeit | basiert auf late_flower healthy | feuchte, riskante Budzone, aber noch nicht zerstort | nur in spaeten Stages |
| P2 | `cannabis_mid_flower_ph_lockout_medium_v001` | shared | mid_flower | condition | ph_lockout | medium | Mischsymptomatik | Wichtige Diagnose fuer spaeteres Gameplay | baut auf mid_flower healthy | gemischte Chlorose/Stresssignale, aber noch lesbar | nicht als Chaosbild |
| P2 | `cannabis_mid_flower_recovery_state_v001` | shared | mid_flower | optional | recovery | recovery | Erholung sichtbar machen | Recovery ist ein starkes Lern- und Belohnungssignal | basiert auf mid_flower condition-assets | neue gesunde Spitzen, Restschaden bleibt sichtbar | muss klar besser wirken als vorher |
| P2 | `cannabis_mid_flower_spider_mites_medium_v001` | shared | mid_flower | condition | pest_damage | medium | Pest lesen | Sehr wichtig fuer spaetere Diagnose und Feinlesbarkeit | basiert auf mid_flower healthy | feines Stippling, matte Leaf-Textur | nicht zu grob, nicht cartoonhaft |
| P2 | `cannabis_mid_flower_thrips_medium_v001` | shared | mid_flower | condition | pest_damage | medium | Pest lesen | Zweiter klarer Pest-Typ mit anderer Silhouette | basiert auf mid_flower healthy | silbrige Fraesspuren, kleine dunkle Punkte | deutlich anders als Mites |
| P3 | `cannabis_mid_flower_root_rot_severe_v001` | shared | mid_flower | condition | root_rot | severe | Spaetproblem lesen | Sehr wichtig, aber erst nach Kernpaket | basiert auf mid_flower healthy | stark welk, gelblich, feuchte Totwirkung | nur severe, nicht zu frueh |
| P3 | `cannabis_late_flower_budrot_warning_v001` | shared | late_flower | condition | budrot_warning | warning | Endgame-Risiko | Premium, aber erst nach Basis-Qualitaet | basiert auf late_flower healthy | kleine braune/graue Problemzonen in Buds | niemals grotesk oder gore-lastig |

## Reduzierte Start-Charge

### Must-have Start-Charge

1. `cannabis_seedling_healthy_v001`
2. `cannabis_early_veg_healthy_v001`
3. `cannabis_mid_veg_healthy_v001`
4. `cannabis_late_veg_healthy_v001`
5. `cannabis_stretch_healthy_v001`
6. `cannabis_early_flower_healthy_v001`
7. `cannabis_mid_flower_healthy_v001`
8. `cannabis_mid_flower_underwatered_medium_v001`
9. `cannabis_mid_flower_overwatered_medium_v001`
10. `cannabis_mid_flower_heat_stress_medium_v001`
11. `cannabis_mid_flower_nutrient_burn_medium_v001`

### Nice-to-have danach

12. `cannabis_mid_flower_light_stress_v001`
13. `cannabis_mid_flower_magnesium_deficiency_medium_v001`
14. `cannabis_mid_flower_nitrogen_deficiency_medium_v001`
15. `cannabis_late_flower_healthy_v001`
16. `cannabis_harvest_ready_healthy_v001`

### Spaeterer Ausbau

- transition assets
- recovery state
- pest assets
- mold risk and budrot
- root rot
- pH lockout

## Vorbereitete Generator-Prompts fuer die Start-Charge

### 1) `cannabis_seedling_healthy_v001`

Zielbild: junge, premium wirkende Cannabis-Pflanze als transparente Einzelpflanze ohne Topf und ohne Hintergrund.

Stage: seedling

Pflanzenstruktur: sehr kleiner Keimling, feiner Haupttrieb, erste echte Blatter, stabiler Basispunkt.

Blattmasse: minimal, nur wenige zarte Blatter.

Internodien / Stretch: sehr kurz, noch kein Stretch.

Blutenstatus: keine Bluten.

Condition: healthy

Severity: none

Stilvorgaben: hochwertiger semi-realistischer Premium-Game-Asset-Look, botanisch plausibel, sauber zentriert, klare mobile Lesbarkeit, gleiche Lichtlinie wie alle anderen Assets.

Hintergrundvorgaben: komplett transparent, kein Podest, keine Erde, keine Umgebung.

Transparenz/Freistellung: volle Pflanze sichtbar, sauber freigestellt, keine abgeschnittenen Blaetter.

Negative Prompts: kein Topf, kein Substrat, keine Erde, kein Text, keine UI, keine Haende, keine Werkzeuge, kein Grow-Tent, kein Hintergrund, kein Cartoon-Look, keine uebertriebene Fotorealistik, keine zweite Pflanze.

QA-Kriterien: sauberer Anchor, lesbare Silhouette auf Mobile, keine Topfreste, keine unlogische Blattmasse, konsistenter Lichtlook.

### 2) `cannabis_early_veg_healthy_v001`

Zielbild: fruehe vegetative Cannabis-Pflanze als transparente Einzelpflanze ohne Topf.

Stage: early_veg

Pflanzenstruktur: junger, leicht oeffnender Wuchs, mehrere echte Blattpaare, frische Vitalitaet.

Blattmasse: gering bis mittel, noch luftig.

Internodien / Stretch: moderat kurz, noch kompakter Veg-Charakter.

Blutenstatus: keine Bluten.

Condition: healthy

Severity: none

Stilvorgaben: identische Kamera, identisches Licht, klarer Premium-Game-Asset-Stil, saubere Blattkanten.

Hintergrundvorgaben: transparent, keine Szene.

Transparenz/Freistellung: voll sichtbar, keine abgeschnittenen Spitzen.

Negative Prompts: kein Topf, kein Text, keine Umgebung, keine Werkzeuge, keine Haende, keine Ueberladung, kein Busch-Look.

QA-Kriterien: klar fruehveg, aber bereits deutlich groesser als Seedling, ohne harte Style-Spruenge.

### 3) `cannabis_mid_veg_healthy_v001`

Zielbild: mittlere Vegetationsphase als saubere Baseline fuer den Hauptrhythmus.

Stage: mid_veg

Pflanzenstruktur: ausgewogene, symmetrische Hauptpflanze mit stabilem Haupttrieb und sauberen Seitentrieben.

Blattmasse: mittel bis hoch, aber noch nicht ueberladen.

Internodien / Stretch: normal, nicht gestreckt.

Blutenstatus: keine Bluten.

Condition: healthy

Severity: none

Stilvorgaben: premium, botanisch glaubwuerdig, leichte Game-Polish, einheitlicher Hintergrund-Nullzustand.

Hintergrundvorgaben: transparent, keine optischen Ablenkungen.

Transparenz/Freistellung: komplette Pflanze sichtbar, sauberer Ankerpunkt, keine Crop-Verluste.

Negative Prompts: kein Topf, kein Substrat, kein Text, kein Logo, keine Hands, keine Tools, kein photorealistischer Studio-Topf.

QA-Kriterien: beste Alltagslesbarkeit, ruhige Form, starke Silhouette, ideal fuer Vergleich und Diagnose.

### 4) `cannabis_late_veg_healthy_v001`

Zielbild: dichte spaete Vegetationsphase als Vorbereitung auf Flip.

Stage: late_veg

Pflanzenstruktur: breiter, dichter, mehr Aeste, klar reifer Veg-Charakter.

Blattmasse: hoch, aber noch keine Blueten.

Internodien / Stretch: kurz bis moderat, keine Blueten-Ansatze dominieren.

Blutenstatus: keine ausgepraegten Bluten.

Condition: healthy

Severity: none

Stilvorgaben: gleiche Perspektive und Lichtlinie, hochwertige Premium-Anmutung, glaubwuerdige Blattarchitektur.

Hintergrundvorgaben: transparent, ohne Szene.

Transparenz/Freistellung: voll sichtbar, keine ueberschuessigen Randobjekte.

Negative Prompts: kein Topf, keine Erde, kein Text, keine Umgebung, keine Futuristik.

QA-Kriterien: klar von Mid Veg unterscheidbar, aber nicht wie Blute aussehend.

### 5) `cannabis_stretch_healthy_v001`

Zielbild: Streckphase als sichtbar anderer Morphotyp.

Stage: stretch

Pflanzenstruktur: laengere Hauptachse, aufwaerts gerichteter Wuchs, fruehe Umformung in Richtung Bloom.

Blattmasse: mittel, etwas luftiger als late veg.

Internodien / Stretch: deutlich laenger, klarer Stretch-Look.

Blutenstatus: nur minimale Vorbluetenspuren, noch keine volle Bluete.

Condition: healthy

Severity: none

Stilvorgaben: elegante, lesbare Uebergangsform, nicht ueberstreckt, nicht schwach.

Hintergrundvorgaben: transparent.

Transparenz/Freistellung: komplette Pflanze sichtbar, saubere Spitze.

Negative Prompts: kein Topf, keine Blutenmasse wie in Flower, kein Text, keine Szene.

QA-Kriterien: eindeutig als Transition lesbar, nicht mit early flower verwechselbar.

### 6) `cannabis_early_flower_healthy_v001`

Zielbild: fruehe Bluete mit ersten klar sichtbaren Budsites.

Stage: early_flower

Pflanzenstruktur: noch recht gruen, aber mit ersten Bluetenansaetzen und klarer Umstellung.

Blattmasse: mittel bis hoch, Blattdominate noch vorhanden.

Internodien / Stretch: Stretch noch sichtbar, aber Ruhe kehrt ein.

Blutenstatus: kleine, frische Budsites / Pistillcluster.

Condition: healthy

Severity: none

Stilvorgaben: Premium-Game-Asset, sauberer Bloom-Start, keine Ueberladung.

Hintergrundvorgaben: transparent, keine Umgebung.

Transparenz/Freistellung: voll sichtbar, Spitze und Seitentriebe nicht abgeschnitten.

Negative Prompts: kein Topf, kein Substrat, keine uebertrieben dichten Buds, kein Text, keine Haende.

QA-Kriterien: klarer Unterschied zu Stretch und Mid Flower, aber noch frueh genug und glaubwuerdig.

### 7) `cannabis_mid_flower_healthy_v001`

Zielbild: wichtigste Standard-Bloom-Baseline mit sehr guter Diagnose-Lesbarkeit.

Stage: mid_flower

Pflanzenstruktur: voll entwickelte Bluetenstruktur, aber noch attraktiv und vital.

Blattmasse: mittel, Buds klar sichtbar, Blatt/Bud-Balance ausgeglichen.

Internodien / Stretch: moderat, bereits Bloom-Charakter.

Blutenstatus: deutliche Bluten / Buds mit Vitalitaet.

Condition: healthy

Severity: none

Stilvorgaben: hochwertig, klar, premium, keine harschen Kontraste, gute mobile Lesbarkeit.

Hintergrundvorgaben: transparent, keine Szene.

Transparenz/Freistellung: kompletter Pflanzenkoerper sichtbar, sauberer Anchor.

Negative Prompts: kein Topf, kein Text, keine UI, keine Umgebung, keine uebertriebenen Kristalle, keine Cartoon-Optik.

QA-Kriterien: beste Diagnose-Basis, sauberer Standard fuer alle Condition-Assets.

### 8) `cannabis_mid_flower_underwatered_medium_v001`

Zielbild: klare Trockenstress-Reaktion, aber noch nicht kollabiert.

Stage: mid_flower

Pflanzenstruktur: gleiche Grundform wie healthy, aber sichtbar an Turgor verloren.

Blattmasse: mittel, Blatter haengen etwas, bleiben jedoch intakt.

Internodien / Stretch: unveraendert bis leicht gespannter Look.

Blutenstatus: Buds bleiben lesbar und nicht zerstoert.

Condition: underwatered

Severity: medium

Stilvorgaben: deutlich lesbar, kein Chaos, Trockenheit muss optisch klar sein.

Hintergrundvorgaben: transparent.

Transparenz/Freistellung: komplette Pflanze, keine Crop-Verluste.

Negative Prompts: kein Topf, keine Ueberwuerfung, keine extreme Welke wie in severe, kein Text, keine Szene.

QA-Kriterien: eindeutig trocken, aber nicht krankhaft tot; klar anders als overwatered.

### 9) `cannabis_mid_flower_overwatered_medium_v001`

Zielbild: klare Ueberwuerung mit schwerer, dunklerer Haltung.

Stage: mid_flower

Pflanzenstruktur: gleiche Basispflanze, aber schwerer, dunkler, nach unten gedrueckt.

Blattmasse: mittel, Blatter wirken schwer und wenig elastisch.

Internodien / Stretch: leicht traege, keine Trocken-Rollung.

Blutenstatus: Buds sauber lesbar, nicht faulig.

Condition: overwatered

Severity: medium

Stilvorgaben: deutlich getrennt von underwatered, nicht als "nur etwas schlaff" rendern.

Hintergrundvorgaben: transparent.

Transparenz/Freistellung: voll sichtbar, klare Silhouette.

Negative Prompts: kein Topf, kein Trockenstress-Look, keine gelb-braune Krankheit, kein Text, keine Szene.

QA-Kriterien: muss sich auf den ersten Blick von Trockenstress unterscheiden.

### 10) `cannabis_mid_flower_heat_stress_medium_v001`

Zielbild: Hitze-/VPD-Stress als oberer Canopy-Stress mit Taco-Look.

Stage: mid_flower

Pflanzenstruktur: vital, aber mit gespannter Topzone und klaren Hitzesignalen.

Blattmasse: mittel bis hoch, Topblatter stehen sichtbar unter Druck.

Internodien / Stretch: normal, keine extreme Streckung.

Blutenstatus: Buds lesbar, nicht verbrannt.

Condition: heat_stress

Severity: medium

Stilvorgaben: plausibel, nicht dramatisch uebertrieben, klare Taco-Blatter.

Hintergrundvorgaben: transparent.

Transparenz/Freistellung: kompletter Pflanzenkoerper sichtbar.

Negative Prompts: kein Topf, keine Flammen, keine apokalyptische Trockenheit, kein Text, keine Szene.

QA-Kriterien: Hitze muss als obere Spannungsreaktion lesbar sein, nicht als Wasserstress.

### 11) `cannabis_mid_flower_nutrient_burn_medium_v001`

Zielbild: saubere, glaubwuerdige Nutrient-Burn-Reaktion.

Stage: mid_flower

Pflanzenstruktur: ansonsten vitale Pflanze, aber mit sichtbar belasteten Blattspitzen und -raendern.

Blattmasse: mittel bis hoch, keine Totoptik.

Internodien / Stretch: normal.

Blutenstatus: Buds intakt und attraktiv.

Condition: nutrient_burn

Severity: medium

Stilvorgaben: hochwertige, lesbare Spitzennekrosen, nicht uebersteuert.

Hintergrundvorgaben: transparent.

Transparenz/Freistellung: gesamte Pflanze sichtbar, keine Beschneidung der Blattspitzen.

Negative Prompts: kein Topf, kein schwerer Krankheitssymptom-Mix, kein Text, keine Szene.

QA-Kriterien: Burn muss sofort als Feed-/EC-Problem erkennbar sein, nicht als allgemeiner Schaden.

## QA-Regeln

- Immer gleiche Kamera, gleicher Lichtcharakter, gleiche Anchor-Logik.
- Keine eingebrannten UI-Elemente.
- Kein Text im Bild.
- Kein Topf und kein Substrat in Pflanzenassets.
- Pflanze voll sichtbar und freigestellt.
- Moderate Zustande nie zu schwer zeichnen.
- Overwatering und Underwatering muessen sofort unterscheidbar sein.
- N-Mangel und Mg-Mangel muessen klar verschieden sein.
- Heat Stress darf nicht wie Water Stress wirken.
- Light Stress muss oben auftreten und als Bleaching lesbar sein.
- Jede Baseline muss als eigene Formstufe funktionieren, nicht nur als farbliche Variation.
- Condition-Assets muessen gameplayseitig in kleiner Ansicht lesbar bleiben.

## Risiken

- Zu viele Assets im ersten Schritt wuerden die Produktionskette verlangsamen.
- Genetik-Differenzierung zu frueh einzufuehren wuerde den visuellen Stil unnnoetig verwischen.
- Zu starke Krankheiten oder Defizite bei moderaten Severity-Stufen wuerden die Premium-Wirkung schwächen.
- Wenn Baseline und Condition nicht sauber getrennt werden, wird das spaetere Layer-System schwer wartbar.

## Empfohlene naechste Phase

Phase 2 soll die Must-have-Start-Charge tatsaechlich als erste Produktionswelle vorbereiten und dabei den Plant-Assets-Skill fuer Prompt-Pakete, Naming und QA direkt nutzen. Danach erst sollten Transition-Assets und die naechsten Deficiency-/Lightstress-Varianten folgen.

## Konkreter Folgeprompt fuer die Asset-Erzeugung

```text
Du arbeitest weiter im Grow Simulator Repository.

Nutze als Grundlage:
- docs/plants/assets/final-plant-asset-production-plan.md
- den Plant-Assets-Skill
- die Regeln aus assets/plant_asset_lab/STYLE_GUIDE.md
- die QA-Regeln aus assets/plant_asset_lab/QUALITY_CHECKLIST.md

Ziel:
Bereite die Must-have Start-Charge aus dem Produktionsplan als finalen Prompt-Satz und Asset-Briefing vor.

Wichtig:
- Noch keine Bilder generieren, solange nicht explizit freigegeben
- Keine Asset-Dateien aendern
- Keine Runtime- oder Savegame-Logik aendern
- Keine Simulation aendern

Aufgabe:
1. Nimm nur die 11 Must-have-Assets aus dem Produktionsplan.
2. Erstelle fuer jedes Asset ein sauberes Prompt-Briefing im Plant-Asset-Factory-Format.
3. Halte Baseline-Assets und Condition-Assets strikt getrennt.
4. Erzeuge pro Asset:
   - finale Asset-ID
   - Zielstage
   - Condition und Severity
   - Prompt
   - Negative Prompt
   - QA-Checkliste
5. Falls noetig, priorisiere die 3 wichtigsten Assets fuer den ersten echten Generationslauf.
6. Gib am Ende eine klare Reihenfolge fuer die Generierung aus.

Output:
Erstelle einen neuen Report unter:
docs/plants/assets/start-charge-asset-prompt-pack.md

Kurz, konkret und direkt generierungsbereit.
```
