# Phase 73: Mini-Catalog Quality Lift Plan

## Ziel

Phase 73 plant den naechsten Qualitaetslift fuer den 22-Event-Mini-Katalog, ohne Runtime-Ausweitung und ohne Katalogdaten sofort zu veraendern.

Der Fokus liegt auf:
- besseren Learning-Ref-Zuordnungen
- staerkeren, engeren Learning-Cards
- klarerer Chain-Semantik
- besserer UI-Lab-Tauglichkeit
- einer realistischeren Route Richtung `Health Score > 80`

## Aktuelle Staerken

Der Mini-Katalog steht bereits stabil in mehreren wichtigen Punkten:

- 22 Events data-only vorhanden
- 5 Learning-Cards vorhanden
- 2 Chains vorhanden
- Vollvalidierung gruen (`0/0/0`)
- Adapter Matrix `22/22 pass`
- Combined Report `pass`
- keine Runtime-Aktivierung
- keine Save-/UI-/Hook-Ausweitung im Katalogschritt

## Qualitaetsdiagnose

### 1. Temporare Learning-Ref-Mappings, die ersetzt werden sollten

Diese Zuordnungen sind funktional akzeptabel, aber fachlich zu breit oder zu indirekt:

- `indoor_light_burn_canopy_top -> lc_climate_vpd_basics`
- `outdoor_early_pest_pressure_leaf_underside -> lc_climate_vpd_basics`
- `indoor_overtraining_stall_mild -> lc_climate_vpd_basics`
- `shared_observation_recovery_after_stress -> lc_watering_basics`

### 2. Bestehende Learning-Cards, die zu breit genutzt werden

#### `lc_climate_vpd_basics`

Aktuell an 9 Events gebunden:
- `indoor_heat_stress_air`
- `indoor_light_burn_canopy_top`
- `indoor_overtraining_stall_mild`
- `indoor_vpd_mismatch_veg`
- `outdoor_cold_night_stress`
- `outdoor_early_pest_pressure_leaf_underside`
- `outdoor_heatwave_dry_wind`
- `shared_early_pest_signs_mild`
- `shared_light_distance_error`

Problem:
- die Card erklaert Klima/VPD gut
- sie traegt aber gerade auch Lichtabstand, fruehe Pestbeobachtung und Trainingserholung mit
- dadurch sinkt die Praezision des Coach-First-Lernsignals

#### `lc_watering_basics`

Aktuell an 7 Events gebunden:
- `indoor_dry_rootball`
- `indoor_overwatering_early`
- `outdoor_heavy_rain_waterlogging_risk`
- `outdoor_pot_dries_by_afternoon`
- `shared_observation_recovery_after_stress`
- `shared_panic_watering_misread`
- `shared_rootbound_warning`

Problem:
- die Card deckt Wassergrundlagen solide ab
- `shared_observation_recovery_after_stress` fuehlt sich aber eher wie Beobachtung/Recovery als wie Basisgiessen an

### 3. Events, die fachlich bereits gut stehen

Besonders stabil und lehrstark wirken aktuell:

- `indoor_rootzone_airless_medium`
- `shared_substrate_drainage_compaction`
- `shared_panic_watering_misread`
- `indoor_fan_failure_airflow_drop`
- `outdoor_pot_dries_by_afternoon`
- `outdoor_wind_exposure_stem_stress`

Warum diese stark sind:
- klare Ursache-Wirkung
- gute Diagnosehaken
- klare Fehlentscheidung
- gute Coach-Tonalitaet
- passende vorhandene Learning-Refs

### 4. Events, die in Copy oder Lernpraezision geschaerft werden sollten

#### `indoor_light_burn_canopy_top`
- Eventlogik ist gut.
- Hauptschwaeche ist nicht die Struktur, sondern die zu allgemeine Learning-Card.
- Der Coachtext kann spaeter noch etwas staerker auf Abstand/Intensitaet statt "allgemeiner Klimaantwort" fokussieren.

#### `outdoor_early_pest_pressure_leaf_underside`
- Fachlich gut.
- Das Event schreit foermlich nach einer eigenen Beobachtungs-/Monitoring-Card.
- Aktuell wird das Thema durch die Klima-Card nur ungenau gespiegelt.

#### `indoor_overtraining_stall_mild`
- Guter neuer Themenraum.
- Aktuell noch leicht generisch im Vergleich zu starker Spec-Vorlage `TR-B-01`.
- Die Card-Mismatch ist hier der groesste Qualitaetsverlust.
- Perspektivisch kann auch die Kategorie-/Tonalitaetslinie von "special" in Richtung klarerer Trainingssprache geschaerft werden.

#### `shared_observation_recovery_after_stress`
- Positiver Beat ist wertvoll.
- Aktuell noch handlungsnah formuliert, waehrend ein echter Recovery-/Story-Beat staerker auf Beobachtung, Ruhe und bestaetigendes Lernen gehen darf.
- Die jetzige Wasserbasis-Card ist dafuer nur bedingt passend.

### 5. Chains: aktuelle Staerken und Schwaechen

#### `watering_rootzone_chain`

Staerken:
- kausaler Lernpfad ist gut lesbar
- von Fehlinterpretation -> Strukturproblem -> Wurzelzonenstress -> Recovery
- starke Verbindung zu `lc_watering_basics` und `lc_rootzone_oxygen_basics`

Schwaechen:
- kombiniert absichtlich zu nass / zu trocken / kompakt in einer Kette
- das ist botanisch plausibel, braucht aber spaeter sehr gute UI-Lab-Kommunikation
- `step_recover` wird deutlich besser, wenn es eine Recovery-/Beobachtungs-Card gibt

#### `airflow_climate_chain`

Staerken:
- gute Mikroklima-Idee
- verbindet stehende Luft, VPD, Hitze und Exposition
- starke Ursache-Wirkung fuer spaetere Shadow-/UI-Lab-Erzaehlung

Schwaechen:
- die Kette springt von Indoor-Problemen in Outdoor-Exposition
- fachlich plausibel als Themenfamilie, aber erzahlerisch breiter als `watering_rootzone_chain`
- hier braucht es spaeter schaerfere Chain-Copy, damit "Branch" und "Eskalation" in der UI klar lesbar bleiben

## Warum der Health Score bei 72.69 liegt

Der Score ist aktuell nicht wegen Blockern oder Datenfehlern niedrig.
Die groessten Treiber sind Informations- und Stub-Diagnosen:

- `asset_integrity_extension_check: info` -> 117x
- `schema_deep_validation_stub_notice: info` -> 29x
- `asset_refs_filesystem_integrity_todo: info` -> 24x
- `asset_refs_missing_assets_block: info` -> 5x

Interpretation:
- Der Katalog ist authoring-seitig sauber genug fuer Entwicklung.
- Der numerische Score wird noch deutlich von Validator-/Asset-Info-Rauschen gedrueckt.
- Ein reiner Content-Lift verbessert fachliche Qualitaet klar, aber nicht automatisch allein den Score ueber 80.

## Welche Massnahmen den Score und die reale Katalogqualitaet verbessern

### Sicherer fachlicher Hebel
- neue fokussierte Learning-Cards anlegen
- Event-Remapping auf diese Cards
- Chain-Resolution inhaltlich schaerfen
- positive Recovery-Beats sauberer von Problemkarten trennen

### Zusatzeffekt auf UI-Lab-Tauglichkeit
- klarere Lernzuordnung verbessert Coach/Aftermath/Modal-Verstaendnis
- spaeter bessere Hero-/Buddy-/Caption-Planung moeglich

### Was den numerischen Health Score wahrscheinlich zusaetzlich braucht
- spaeteren Validator-/Asset-Info-Review
- oder klarere Asset-/Schema-Policy-Reduktion

Wichtig:
- Wir sollten den Score nicht "wegkonfigurieren".
- Erst der fachliche Lift, dann gegebenenfalls ein sauber begruendeter Validator-/Info-Noise-Review.

## Empfohlene Richtung fuer Phase 74

`Learning-Card Backfill Batch A`

Fokus:
- 3 neue Learning-Cards sicher umsetzen
- die 3 klarsten Fehlmappings remappen
- `shared_observation_recovery_after_stress` bewusst entscheiden: entweder gleich eigene Recovery-Card oder noch eine Phase spaeter
