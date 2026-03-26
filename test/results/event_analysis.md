# Event Analysis (10 Full Runs)

## 1. Gesamtübersicht
- Runs: 10
- Gesamt-Events: 381
- Durchschnittliche Eventrate pro Run: 38.1
- Positive Events: 157 (41.21%)
- Negative Events: 224 (58.79%)

## 2. Event-Verteilung (Top 10)
| Event ID | Count |
|---|---:|
| v2_positive_ideal_mild_days | 105 |
| v2_pest_thrips_wave | 53 |
| v2_positive_outdoor_sun_window | 52 |
| v2_water_dry_pot | 51 |
| v2_outdoor_storm_front | 35 |
| v2_pest_mites_spotted | 33 |
| v2_special_weather_shift | 33 |
| v2_environment_heat_spike | 19 |

## 3. Positive vs Negative
| Type | Count | Percent |
|---|---:|---:|
| Positive | 157 | 41.21% |
| Negative | 224 | 58.79% |

## 4. Stage Analyse
- Stage 3: v2_positive_ideal_mild_days (14), v2_water_dry_pot (8), v2_environment_heat_spike (3)
- Stage 4: v2_positive_ideal_mild_days (11), v2_positive_outdoor_sun_window (8), v2_water_dry_pot (7), v2_special_weather_shift (6), v2_pest_mites_spotted (4)
- Stage 5: v2_positive_ideal_mild_days (8), v2_positive_outdoor_sun_window (8), v2_pest_thrips_wave (6), v2_water_dry_pot (5), v2_outdoor_storm_front (5)
- Stage 6: v2_positive_ideal_mild_days (12), v2_water_dry_pot (7), v2_positive_outdoor_sun_window (5), v2_pest_thrips_wave (5), v2_pest_mites_spotted (4)
- Stage 7: v2_positive_ideal_mild_days (10), v2_positive_outdoor_sun_window (7), v2_water_dry_pot (7), v2_pest_thrips_wave (6), v2_outdoor_storm_front (5)
- Stage 8: v2_positive_ideal_mild_days (12), v2_positive_outdoor_sun_window (8), v2_water_dry_pot (8), v2_pest_thrips_wave (7), v2_outdoor_storm_front (6)
- Stage 9: v2_positive_ideal_mild_days (13), v2_water_dry_pot (9), v2_positive_outdoor_sun_window (8), v2_pest_thrips_wave (7), v2_pest_mites_spotted (4)
- Stage 10: v2_positive_ideal_mild_days (13), v2_pest_thrips_wave (10), v2_positive_outdoor_sun_window (8), v2_outdoor_storm_front (6), v2_special_weather_shift (6)
- Stage 11: v2_positive_ideal_mild_days (12), v2_pest_thrips_wave (9), v2_outdoor_storm_front (6), v2_pest_mites_spotted (5), v2_special_weather_shift (4)
- Stage 12: v2_pest_thrips_wave (3)

## 5. Auffälligkeiten
- Stage-unlogische Events: 0
- Identisches Event direkt nacheinander: 0
- Rain/Storm-Ketten (Cooldown-Muster): 0

## 6. Empfehlungen
- Positive-Events nur bei stabilen Zuständen triggern, zusätzliches globales Positiv-Cap prüfen.
- Outdoor-Event-Cooldowns (rain/storm) weiter erhöhen, falls in Live-Runs Ketten sichtbar.
- Für frühe Stages harte Trigger-Gates für disease/weather lassen (bereits aktiv), bei neuen Events beibehalten.
- Harness und Runtime-Gewichtungslogik regelmäßig gegenprüfen, damit Balancing reproduzierbar bleibt.

## 7. Stabilitätstest
- Keine Crashes in 10 Full-Runs
- Keine undefined state transitions beobachtet
- Keine unendlichen Event-Cooldowns im Runner
