# Eventsystem V2 - Playable PWA Finish

## Ziel

Diese Phase schliesst den aktuellen Eventsystem-V2-Stand als spielbaren PWA-Zwischenstand ab. Ziel ist nicht Perfektion oder neues Balancing, sondern ein stabiler, praesentabler und testbarer Zustand, mit dem die weitere Grow-Simulator-Entwicklung wieder auf andere Spielbereiche wechseln kann.

## Scope

Im Scope:

- V2-Events im Event Center sichtbar und bedienbar pruefen
- finale Eventbilder ueber `hero.webp -> fallback.webp -> Premium-CSS-Fallback` absichern
- Resolve, History und Reload pruefen
- Mobile- und Browser-Smokes ausfuehren
- PWA/Cache-Bust ueber Build-ID absichern
- Ergebnis klar als spielbar oder nicht spielbar dokumentieren

Nicht im Scope:

- V1 loeschen
- alte Save-Felder loeschen
- riskante Save-Migration erzwingen
- neue echte Statusdeltas fuer Bulk-Events aktivieren
- Event Center neu bauen
- Daily, Retention, Missions, Push oder Monetarisierung umbauen

## Runtime-Enabled Events

Der aktuelle V2-Runtime-Pfad erlaubt sichtbare V2-Anzeige und Resolve fuer final bebilderte Events nur dann, wenn sie explizit in `state.eventV2.openEvents` liegen. Es findet keine breite automatische Event-Generierung statt.

Runtime-enabled Events:

- `indoor_dry_rootball`
- `shared_panic_watering_misread`
- `shared_light_distance_error`
- `shared_observation_recovery_after_stress`
- `shared_rootbound_warning`
- `shared_substrate_drainage_compaction`
- `indoor_fan_failure_airflow_drop`
- `indoor_heat_stress_air`
- `indoor_light_burn_canopy_top`
- `indoor_light_nutrient_tox_early`
- `indoor_overtraining_stall_mild`
- `indoor_overwatering_early`
- `indoor_rootzone_airless_medium`
- `indoor_soil_ph_out_of_range`
- `indoor_vpd_mismatch_veg`
- `outdoor_cold_night_stress`
- `outdoor_early_pest_pressure_leaf_underside`
- `outdoor_heatwave_dry_wind`
- `outdoor_heavy_rain_waterlogging_risk`
- `outdoor_pot_dries_by_afternoon`
- `outdoor_wind_exposure_stem_stress`
- `shared_early_pest_signs_mild`

## Browser-/PWA-Pruefung

Mindestens folgende Sample-Events werden ueber den sichtbaren V2-Pfad geprueft:

- `indoor_dry_rootball`
- `shared_panic_watering_misread`
- `indoor_heat_stress_air`
- `indoor_overwatering_early`
- `outdoor_heatwave_dry_wind`
- `shared_rootbound_warning`
- `shared_early_pest_signs_mild`

Erwartung pro Sample:

- V2-DOM-Marker vorhanden
- `hero.webp` sichtbar
- kein Legacy-/Cooldown-Text sichtbar
- kein V1-Eventbild sichtbar
- Optionen sichtbar und klickbar
- erste Option resolved sauber
- History-Eintrag wird geschrieben
- Reload erzeugt keine Duplikate
- keine Statusmutation ausser explizit freigegebener Policy

## PWA- und Cache-Regel

Der Build muss mit einer frischen Build-ID ausgeliefert werden, damit versionierte JS- und Asset-URLs nicht aus alten PWA-Caches stammen.

Aktueller Abschluss-Build:

- `20260601-event-v2-playable-pwa`

Manuelle Dev-Hinweise bei alten Browserzustaenden:

- Hard Reload ausfuehren
- Application Storage bei Bedarf leeren
- Service Worker unregister nur fuer lokale QA, falls alte Assets sichtbar bleiben

## Definition of Done

Diese Phase ist abgeschlossen, wenn:

- V2 Event Center im aktuellen PWA-Stand spielbar ist
- Bulk-V2-Events finale Bilder zeigen
- Sample-Events bedienbar sind
- Resolve, History und Reload stabil sind
- keine technischen Debugtexte im sichtbaren V2-Spielerpfad erscheinen
- keine alten V1-Bilder im V2-Pfad erscheinen
- `npm run check:syntax` gruen ist
- `npm run test:event-release` gruen ist
- `npm run test:smoke` gruen ist
- Visibility Health Report gruen ist
- Release Gate Snapshot `gate: "go"` meldet

