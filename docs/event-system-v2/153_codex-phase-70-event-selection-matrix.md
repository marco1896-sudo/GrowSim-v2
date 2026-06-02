# Phase 70: Event Selection Matrix

## Vorgeschlagene neue Events

### Indoor-Kandidaten

#### 1. `indoor_fan_failure_airflow_drop`

- Quelle aus Spec: `T-I-01` Luefterausfall
- Mode: Indoor
- Stage: 2-6
- Kategorie: setup / environment
- Warum jetzt: schliesst die groesste Indoor-Setup-Luecke mit hohem Lernwert
- Learning-Card noetig: ja, `lc_airflow_fundamentals`
- Chain-faehig: ja, Klima-/VPD-Folge moeglich
- Asset-Anforderung: vorhandener Technik-/Canopy-Fallback ausreichend
- Risiko: niedrig bis mittel
- Empfehlung: sehr hoch

#### 2. `indoor_light_burn_canopy_top`

- Quelle aus Spec: `L-I-01` Light Burn obere Canopy
- Mode: Indoor
- Stage: 3-5
- Kategorie: light
- Warum jetzt: starke Ursache-Wirkung, klarer visueller Anchor, gute UI-Lesbarkeit
- Learning-Card noetig: optional, kann ueber `lc_light_distance_basics` laufen
- Chain-faehig: ja, Lichtstress-Zyklus
- Asset-Anforderung: Leaf-burn / top-canopy Fallback
- Risiko: niedrig
- Empfehlung: hoch

#### 3. `indoor_rootzone_airless_medium`

- Quelle aus Spec: Wurzel-/Medium-Folge aus Ueberwaesserungs-/Substratlogik, nahe `EC-01`
- Mode: Indoor
- Stage: 2-5
- Kategorie: rootzone
- Warum jetzt: macht Wasserfehler kausal tiefer und chain-faehig
- Learning-Card noetig: ja, `lc_rootzone_oxygen_basics`
- Chain-faehig: ja, watering_mistake_chain
- Asset-Anforderung: bestehender Stress-/Root-Fallback
- Risiko: niedrig
- Empfehlung: hoch

#### 4. `indoor_overtraining_stall_mild`

- Quelle aus Spec: Training / Struktur, nahe `EC-08`
- Mode: Indoor
- Stage: 2-4
- Kategorie: training
- Warum jetzt: fuehrt erstmals eine echte Struktur-/Timing-Entscheidung ein
- Learning-Card noetig: optional, spaeter `lc_training_recovery_basics`
- Chain-faehig: begrenzt, eher als Einzel-Lernschritt
- Asset-Anforderung: Pflanze + gebogene Struktur, Fallback ausreichend
- Risiko: niedrig bis mittel
- Empfehlung: mittel bis hoch

### Outdoor-Kandidaten

#### 5. `outdoor_pot_dries_by_afternoon`

- Quelle aus Spec: Outdoor-Trockenstress-Familie, passend zur Hitze-/Topf-Logik
- Mode: Outdoor
- Stage: 2-5
- Kategorie: water
- Warum jetzt: hohe Outdoor-Relevanz, klare Spielerentscheidung, guter Lernwert
- Learning-Card noetig: kann `lc_watering_basics` nutzen
- Chain-faehig: ja, climate/water Folge
- Asset-Anforderung: droop / dry pot Fallback
- Risiko: niedrig
- Empfehlung: sehr hoch

#### 6. `outdoor_early_pest_pressure_leaf_underside`

- Quelle aus Spec: Outdoor-Pest-Fruehzeichen
- Mode: Outdoor
- Stage: 3-6
- Kategorie: pest
- Warum jetzt: Outdoor hat aktuell nur 3 Events und braucht fruehe Reaktionssignale
- Learning-Card noetig: ja, `lc_pest_observation_basics`
- Chain-faehig: ja, pest observation chain spaeter moeglich
- Asset-Anforderung: Blattunterseite / Punkte / Plaettchen, Fallback ausreichend
- Risiko: niedrig
- Empfehlung: hoch

#### 7. `outdoor_wind_exposure_stem_stress`

- Quelle aus Spec: `K-O-04` Windstress
- Mode: Outdoor
- Stage: 2-6
- Kategorie: environment
- Warum jetzt: erweitert Outdoor jenseits von Regen/Hitze/Frost
- Learning-Card noetig: optional, `lc_airflow_fundamentals` kann spaeter mitgenutzt werden
- Chain-faehig: begrenzt, eher Setup-/Standort-Lernwert
- Asset-Anforderung: wind-stressed plant fallback
- Risiko: niedrig
- Empfehlung: mittel bis hoch

### Shared-Kandidaten

#### 8. `shared_panic_watering_misread`

- Quelle aus Spec: `W-B-01` Panik-Giessen
- Mode: Shared
- Stage: 2-5
- Kategorie: water
- Warum jetzt: extrem hoher Lernwert, klarer Noob-Fehler, guter Coach-First-Moment
- Learning-Card noetig: kann `lc_watering_basics` nutzen
- Chain-faehig: ja, watering_mistake_chain
- Asset-Anforderung: afternoon wilt / normal droop Fallback
- Risiko: niedrig
- Empfehlung: sehr hoch

#### 9. `shared_substrate_drainage_compaction`

- Quelle aus Spec: Rootzone / Medium / Drainageproblem
- Mode: Shared
- Stage: 2-6
- Kategorie: rootzone
- Warum jetzt: schliesst die Luecke zwischen Wasser- und Wurzelthema
- Learning-Card noetig: ja, `lc_rootzone_oxygen_basics`
- Chain-faehig: ja, watering_mistake_chain
- Asset-Anforderung: dense medium / wet rootzone fallback
- Risiko: niedrig
- Empfehlung: hoch

#### 10. `shared_observation_recovery_after_stress`

- Quelle aus Spec: Recovery-/Learning-Moment, nahe `W-B-05`
- Mode: Shared
- Stage: 2-5
- Kategorie: story / recovery
- Warum jetzt: fuehrt erstmals einen positiven Beobachtungs-/Recovery-Moment ein
- Learning-Card noetig: optional
- Chain-faehig: ja, als sauberer Chain-Abschluss oder Recovery-Step
- Asset-Anforderung: recovery/stress relief fallback
- Risiko: niedrig
- Empfehlung: mittel

## Vorgeschlagene Chains

### Chain 1: `watering_mistake_chain`

- Start:
  - `shared_panic_watering_misread`
  - oder `indoor_overwatering_early`
- Follow-up:
  - `indoor_rootzone_airless_medium`
  - oder `shared_substrate_drainage_compaction`
- Lernkarte:
  - `lc_watering_basics`
  - `lc_rootzone_oxygen_basics`
- Ziel:
  - Wasser -> Sauerstoff -> Wurzelstress als Kausalkette erklaeren
- Trigger-Logik:
  - falscher Giessrhythmus / feuchtes Substrat / steigender Stress
- Abbruchbedingungen:
  - korrektes Trocknenlassen
  - verbesserte Luft-/Drainagelogik
- Lernwert: sehr hoch
- UI-Lab-Darstellung: sehr gut
- Validator-Risiko: niedrig bis mittel

### Chain 2: `climate_vpd_chain`

- Start:
  - `indoor_fan_failure_airflow_drop`
  - oder `indoor_vpd_mismatch_veg`
- Follow-up:
  - `indoor_heat_stress_air`
  - optional spaeter `indoor_light_burn_canopy_top`
- Lernkarte:
  - `lc_climate_vpd_basics`
  - `lc_airflow_fundamentals`
- Ziel:
  - Klima nicht als Einzelfehler, sondern als System aus Luftstrom, Hitze und VPD zeigen
- Trigger-Logik:
  - schwacher Luftstrom + Hitze + RH/VPD-Missmatch
- Abbruchbedingungen:
  - Luftstrom korrigiert
  - Temperatur-/Klima-Regelung stabilisiert
- Lernwert: sehr hoch
- UI-Lab-Darstellung: gut
- Validator-Risiko: mittel

## Vorgeschlagene Learning-Cards

### 1. `lc_rootzone_oxygen_basics`

- Thema: warum Wurzeln Luft brauchen
- zugehoerige Events:
  - `indoor_overwatering_early`
  - `indoor_rootzone_airless_medium`
  - `shared_substrate_drainage_compaction`
- deutsche Kurzfassung:
  - Zu nasses oder verdichtetes Substrat nimmt Wurzeln den Sauerstoff.
- englische Kurzfassung:
  - Waterlogged or compact substrate starves roots of oxygen.
- spanische Kurzfassung, grob:
  - Un sustrato encharcado o compacto deja a las raices sin oxigeno.
- Textbudget-Risiko: niedrig
- UI-Lab-Relevanz: hoch

### 2. `lc_airflow_fundamentals`

- Thema: Luftbewegung, Hitzestaus und VPD-Balance
- zugehoerige Events:
  - `indoor_fan_failure_airflow_drop`
  - `indoor_heat_stress_air`
  - `outdoor_wind_exposure_stem_stress`
- deutsche Kurzfassung:
  - Luftbewegung verteilt Hitze und Feuchte, aber Windstress ist etwas anderes.
- englische Kurzfassung:
  - Air movement balances heat and humidity, but wind stress is a separate problem.
- spanische Kurzfassung, grob:
  - El movimiento de aire equilibra calor y humedad, pero el estres por viento es otra cosa.
- Textbudget-Risiko: mittel
- UI-Lab-Relevanz: hoch

### 3. `lc_pest_observation_basics`

- Thema: fruehe Schaedlingssignale richtig lesen
- zugehoerige Events:
  - `shared_early_pest_signs_mild`
  - `outdoor_early_pest_pressure_leaf_underside`
- deutsche Kurzfassung:
  - Fruehe Schaedlingszeichen sind oft klein, aber das Timing macht den Unterschied.
- englische Kurzfassung:
  - Early pest signs look small, but timing changes the whole outcome.
- spanische Kurzfassung, grob:
  - Las primeras senales de plagas parecen pequenas, pero el momento cambia todo.
- Textbudget-Risiko: niedrig
- UI-Lab-Relevanz: mittel bis hoch

## Locale-/Copy-Plan

Fuer jedes neue Event direkt mitplanen:

- `title`
- `symptom`
- `description`
- `cause`
- `coach.summary`
- `coach.why`
- `coach.actions.0..1`
- `options.<id>`
- `options_details.<id>`
- `aftermath.lesson`
- `alt.events.v2.<eventId>`

Copy-Richtung:

- Ursache -> sichtbares Signal -> Entscheidung -> Nachwirkung
- ruhiger Coach-Ton
- keine Alarmrhetorik
- 360px-kompatible Decision-Details

## Asset-/Buddy-Vorplanung

Noch keine Assets erstellen.

Spaeter Buddy-/Event-Motive besonders sinnvoll fuer:

- `shared_panic_watering_misread`
  - Buddy-Pose: bremsend, zeigend
  - Sprechblase: ja, klein
  - Pflanze + hängende Blaetter + Buddy sinnvoll: sehr

- `indoor_fan_failure_airflow_drop`
  - Buddy-Pose: aufmerksam / warnend auf Equipment
  - Sprechblase: optional
  - Pflanze + stiller Canopy + kaputter Luefter sinnvoll: sehr

- `outdoor_pot_dries_by_afternoon`
  - Buddy-Pose: erklaerend / beobachtend
  - Sprechblase: eher nein
  - Pflanze + trockener Topf + Sonne sinnvoll: sehr

- `outdoor_early_pest_pressure_leaf_underside`
  - Buddy-Pose: Lupe / genauer Blick
  - Sprechblase: klein moeglich
  - Pflanze + Blattunterseite + Buddy sinnvoll: gut

Erstmal fallbackfaehig bleiben duerfen:

- alle 10 Kandidaten

## Empfohlene Phase 71

```text
Phase 71: Data-only Mini-Catalog Expansion Batch 1
```

Umfang:

- 8 Events:
  - `indoor_fan_failure_airflow_drop`
  - `indoor_light_burn_canopy_top`
  - `indoor_rootzone_airless_medium`
  - `outdoor_pot_dries_by_afternoon`
  - `outdoor_early_pest_pressure_leaf_underside`
  - `outdoor_wind_exposure_stem_stress`
  - `shared_panic_watering_misread`
  - `shared_substrate_drainage_compaction`
- 2 Learning-Cards:
  - `lc_rootzone_oxygen_basics`
  - `lc_airflow_fundamentals`

## Kandidaten fuer Phase 72

- `indoor_overtraining_stall_mild`
- `shared_observation_recovery_after_stress`
- Chain `watering_mistake_chain`
- Chain `climate_vpd_chain`
- Learning-Card `lc_pest_observation_basics`
