# Start-Charge Plant Assets v1 Generated Report

## Kurzfazit

Die 11 Start-Charge-Assets wurden in diesem Run als echte PNG-Dateien erzeugt und an die vorgesehenen Zielpfade geschrieben. Die Serie ist insgesamt brauchbar; einzelne Assets sollten vor einer spaeteren Promotion noch einmal manuell im direkten Nebeneinander geprueft werden.

## Erzeugte Assets

- `cannabis_seedling_healthy_v001` -> `assets/plants/strains/shared/stage_02_seedling/healthy_none.png`
- `cannabis_early_veg_healthy_v001` -> `assets/plants/strains/shared/stage_03_early_veg/healthy_none.png`
- `cannabis_mid_veg_healthy_v001` -> `assets/plants/strains/shared/stage_04_mid_veg/healthy_none.png`
- `cannabis_late_veg_healthy_v001` -> `assets/plants/strains/shared/stage_05_late_veg/healthy_none.png`
- `cannabis_stretch_healthy_v001` -> `assets/plants/strains/shared/stage_07_stretch/healthy_none.png`
- `cannabis_early_flower_healthy_v001` -> `assets/plants/strains/shared/stage_08_early_flower/healthy_none.png`
- `cannabis_mid_flower_healthy_v001` -> `assets/plants/strains/shared/stage_09_mid_flower/healthy_none.png`
- `cannabis_mid_flower_underwatered_medium_v001` -> `assets/plants/strains/shared/stage_09_mid_flower/underwatered_medium.png`
- `cannabis_mid_flower_overwatered_medium_v001` -> `assets/plants/strains/shared/stage_09_mid_flower/overwatered_medium.png`
- `cannabis_mid_flower_heat_stress_medium_v001` -> `assets/plants/strains/shared/stage_09_mid_flower/heat_stress_medium.png`
- `cannabis_mid_flower_nutrient_burn_medium_v001` -> `assets/plants/strains/shared/stage_09_mid_flower/nutrient_burn_medium.png`

## QA-Status

- `cannabis_seedling_healthy_v001`: `pass`
- `cannabis_early_veg_healthy_v001`: `needs_review`
- `cannabis_mid_veg_healthy_v001`: `pass`
- `cannabis_late_veg_healthy_v001`: `pass`
- `cannabis_stretch_healthy_v001`: `pass`
- `cannabis_early_flower_healthy_v001`: `pass`
- `cannabis_mid_flower_healthy_v001`: `pass`
- `cannabis_mid_flower_underwatered_medium_v001`: `needs_review`
- `cannabis_mid_flower_overwatered_medium_v001`: `pass`
- `cannabis_mid_flower_heat_stress_medium_v001`: `pass`
- `cannabis_mid_flower_nutrient_burn_medium_v001`: `needs_review`

## Zweiter Versuch

- `cannabis_early_veg_healthy_v001`
- `cannabis_mid_flower_healthy_v001`
- `cannabis_mid_flower_heat_stress_medium_v001`

## Risiken

- `cannabis_early_veg_healthy_v001` wirkt noch leicht hochgewachsen fuer fruehes Veg.
- `cannabis_mid_flower_underwatered_medium_v001` und `cannabis_mid_flower_nutrient_burn_medium_v001` sollten im direkten Vergleich zur Healthy-Baseline noch einmal auf Morphologie-Naehe geprueft werden.
- Die Mid-Flower-Conditions lesen unterschiedlich, aber der finale Serienabgleich bei kleiner mobiler Darstellung bleibt wichtig.

## Konkrete manuelle QA-Hinweise

- Alle 7 Baselines nebeneinander auf natuerlichen Wachstumsverlauf pruefen.
- `mid_flower` healthy gegen alle 4 Conditions auf gleiche Grundmorphologie und Anchor-Position abgleichen.
- Bei `underwatered`, `overwatered` und `heat_stress` die Ursache im ersten Blick auf kleiner Darstellung pruefen.
- Auf Resthalos und zu sichtbare Checkerboard-Raender im Export achten.
