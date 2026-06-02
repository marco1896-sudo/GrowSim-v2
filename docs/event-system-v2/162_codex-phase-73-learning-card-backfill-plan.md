# Phase 73: Learning-Card Backfill Plan

## Ziel

Die naechste Quality-Lift-Welle soll die groessten semantischen Learning-Ref-Luecken schliessen, ohne den Mini-Katalog unnötig gross zu machen.

## Empfohlene neue Learning-Cards

### 1. `lc_light_intensity_distance_basics`

Thema:
- Lichtabstand
- Canopy-Reaktion auf zu viel Naehe / Intensitaet
- Lichtstress ist nicht automatisch Naehrstoffmangel

Betroffene Events:
- `indoor_light_burn_canopy_top`
- `shared_light_distance_error`

Nutzen:
- ersetzt aktuell das unpraezise Klima-Mapping
- verbessert Licht-/Canopy-Lernlogik deutlich
- hoher Nutzen fuer spaetere UI-Lab-Lesbarkeit

Textbudget-Risiko:
- niedrig bis mittel
- 3 klare Bullets reichen

DE-Kurzrichtung:
- "Oben hell bedeutet oft zu viel Licht, nicht automatisch zu wenig Futter."

EN-Kurzrichtung:
- "A pale top often points to light pressure before it points to feed shortage."

ES-Kurzrichtung:
- "Una punta palida suele hablar antes de exceso de luz que de falta de comida."

Prioritaet:
- sehr hoch

### 2. `lc_pest_observation_basics`

Thema:
- Blattunterseiten kontrollieren
- fruehe Punkte, Eier, Spuren lesen
- Monitoring vor Panikreaktion

Betroffene Events:
- `outdoor_early_pest_pressure_leaf_underside`
- `shared_early_pest_signs_mild`

Nutzen:
- trennt Beobachtung von allgemeinem Klima-Lernen
- verbessert Pest-Fruehwarnung und Monitoring-Kompetenz
- passt gut zu Coach-First und zu spaeterer Buddy-Erklaerung

Textbudget-Risiko:
- niedrig

DE-Kurzrichtung:
- "Fruehe Schaedigingszeichen gewinnt man durch Kontrolle, nicht durch hektisches Spruehen."

EN-Kurzrichtung:
- "Early pest control starts with checking, not blanket spraying."

ES-Kurzrichtung:
- "El control temprano empieza observando bien, no rociando a ciegas."

Prioritaet:
- sehr hoch

### 3. `lc_training_recovery_basics`

Thema:
- Training erzeugt Stress
- Erholungsfenster gehoeren zum Prozess
- Eingriffe nicht stapeln

Betroffene Events:
- `indoor_overtraining_stall_mild`
- optional spaeter auch trainingsnahe Folgebeats

Nutzen:
- schliesst die deutlichste neue Fachluecke aus Batch 2
- verbessert den Coaching-Wert des ersten Training-Events stark
- bildet gute Bruecke zu `EC-08`-Denken aus der Spec

Textbudget-Risiko:
- mittel
- muss knapp bleiben und darf nicht wie Volltutorial klingen

DE-Kurzrichtung:
- "Training ist Reiz plus Pause. Ohne Erholung wird Formung zu Stressstapel."

EN-Kurzrichtung:
- "Training only works as stress plus recovery, not as nonstop intervention."

ES-Kurzrichtung:
- "El training funciona como estimulo mas recuperacion, no como intervencion continua."

Prioritaet:
- sehr hoch

### 4. Optional: `lc_recovery_observation_basics`

Thema:
- nach richtiger Korrektur beobachten
- nicht sofort ueberkorrigieren
- Besserung als eigenes Signal lesen

Betroffene Events:
- `shared_observation_recovery_after_stress`
- spaeter weitere positive Recovery-Beats

Nutzen:
- macht positive Story-/Learning-Beats deutlich sauberer
- staerkt Beobachtungskompetenz als Premium-Moment
- verbessert das Ende der `watering_rootzone_chain`

Textbudget-Risiko:
- niedrig bis mittel

DE-Kurzrichtung:
- "Wenn die Pflanze sich erholt, ist Beobachtung oft die beste naechste Aktion."

EN-Kurzrichtung:
- "When recovery starts to show, the best next move is often to keep watching."

ES-Kurzrichtung:
- "Cuando la recuperacion ya se ve, lo mejor suele ser observar y no tocar."

Prioritaet:
- mittel bis hoch

## Remapping-Plan

### Pflicht-Remaps fuer Phase 74

- `indoor_light_burn_canopy_top`
  - von `lc_climate_vpd_basics`
  - zu `lc_light_intensity_distance_basics`

- `shared_light_distance_error`
  - von `lc_climate_vpd_basics`
  - zu `lc_light_intensity_distance_basics`

- `outdoor_early_pest_pressure_leaf_underside`
  - von `lc_climate_vpd_basics`
  - zu `lc_pest_observation_basics`

- `shared_early_pest_signs_mild`
  - von `lc_climate_vpd_basics`
  - zu `lc_pest_observation_basics`

- `indoor_overtraining_stall_mild`
  - von `lc_climate_vpd_basics`
  - zu `lc_training_recovery_basics`

### Entscheidungs-Remap fuer Recovery-Beat

Zwei saubere Optionen:

#### Option A
- `shared_observation_recovery_after_stress`
  - vorerst auf `lc_watering_basics` lassen
  - eigene Recovery-Card in Phase 75 nachschieben

Vorteil:
- Phase 74 bleibt klein und fokussiert

Nachteil:
- die positive Beobachtungsseite bleibt noch einen Schritt zu allgemein

#### Option B
- `shared_observation_recovery_after_stress`
  - direkt auf `lc_recovery_observation_basics`

Vorteil:
- beste semantische Qualitaet
- verbessert die `watering_rootzone_chain` sofort sichtbar

Nachteil:
- eine vierte Card vergroessert den Umfang von Phase 74

## Chain Quality Lift Bewertung

### `watering_rootzone_chain`

Aktuelle Staerke:
- klarer Lernpfad
- starke Rootzone-/Drainage-Logik
- gute Aufloesung mit Recovery-Beat

Verbesserung durch neue Cards:
- `lc_rootzone_oxygen_basics` bleibt passend
- `lc_watering_basics` bleibt fuer Fehlstart passend
- `lc_recovery_observation_basics` wuerde das Chain-Ende deutlich staerken

Empfehlung:
- Phase 74 inhaltlich unangetastet lassen
- Phase 75 nur Chain-Texte/Labels und Recovery-Beat-Semantik schaerfen

### `airflow_climate_chain`

Aktuelle Staerke:
- gutes Systemdenken fuer Mikroklima
- starke thematische Klammer fuer Indoor-Airflow, VPD, Hitze und Exposition

Schwachstelle:
- aktuell breiter als die Wasserkette
- Indoor/Outdoor-Sprung braucht spaeter bessere Banner-/Summary- und Schrittcopy

Verbesserung durch neue Cards:
- keine neue Pflicht-Card fuer diese Kette
- `lc_airflow_fundamentals` und `lc_climate_vpd_basics` bleiben hier vorerst passend

Empfehlung:
- nicht in Phase 74 anfassen
- spaeter in Phase 75 als reiner Chain-Copy-/Clarity-Pass verbessern

## QA- und Health-Ziele

### Ziel fuer Development nach Phase 74/75

- Validation: `0/0/0`
- Adapter Matrix: `100% pass`
- Budget Warnings: `0`
- Dev-QA: `ready=true`
- Health Score Ziel: `>80`

### Ehrliche Einschraenkung

Ein reiner Learning-Card-Backfill verbessert die Fachqualitaet stark, aber nicht garantiert allein den numerischen Score ueber 80.
Dafuer werden wahrscheinlich zwei Ebenen noetig sein:

1. Content-Lift
- neue Cards
- bessere Remaps
- schaerfere Chain-Lesbarkeit

2. spaeterer Validation-/Info-Noise-Review
- weil der aktuelle Score stark durch Info-Diagnosen aus Asset-/Schema-Stubs gedrueckt wird

### Release-Candidate-Ziel

Noch nicht zwingend gruen.
Realistisches Zwischenziel:
- von `red` Richtung `yellow`
- mit klar dokumentierten Restgruenden

## Empfohlene Umsetzungsreihenfolge

### Phase 74
`Learning-Card Backfill Batch A`

Empfohlen:
- `lc_light_intensity_distance_basics`
- `lc_pest_observation_basics`
- `lc_training_recovery_basics`
- Pflicht-Remaps fuer die drei klarsten Fehlzuordnungen
- Entscheidung, ob die Recovery-Card schon in denselben Batch kommt

### Phase 75
`Chain Quality Lift + Optional Recovery Card + Matrix Refresh`

Empfohlen:
- falls noch offen: `lc_recovery_observation_basics`
- Chain-Summary-/Banner-/Step-Clarity-Pass
- Learning-Ref-Abgleich erneut validieren
- Matrix/Health/QA neu fahren

### Phase 76
`UI-Lab Real Catalog Review Pass`

Empfohlen:
- Real-Content-Lesbarkeit im UI-Lab
- Coach Summary / Why / Aftermath / Learning Flow auf engem Screen pruefen
- Buddy-/Asset-Prioritaeten fuer spaetere visuelle Phase ableiten

## Empfohlene Phase 74

`Learning-Card Backfill Batch A`

Minimal sichere Kernfassung:
- 3 neue Learning-Cards
- 5 Event-Remaps
- keine Chain-Aktivierung
- keine Runtime-Aenderung

Alternative:
- dieselbe Phase direkt mit optionaler `lc_recovery_observation_basics`, wenn wir die positive Recovery-Seite sofort sauber ziehen wollen

## Go/No-Go fuer Phase 74

Ergebnis:
`go_for_phase_74_learning_card_backfill_batch_a`
