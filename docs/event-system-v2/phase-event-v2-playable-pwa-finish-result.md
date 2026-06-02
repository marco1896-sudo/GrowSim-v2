# Eventsystem V2 - Playable PWA Finish Ergebnis

## Executive Summary

Der aktuelle Eventsystem-V2-Stand ist fuer die PWA spielbar genug, um die Arbeit an anderen Grow-Simulator-Bereichen fortzusetzen. Die final bebilderten V2-Events sind runtime-enabled, zeigen finale Eventbilder, lassen sich ueber den V2-Event-Center-Pfad resolven und bleiben nach Reload idempotent. Es wurden keine V1-Dateien geloescht, keine Save-Migration erzwungen und keine neuen riskanten Statusdeltas aktiviert.

## Ist V2 heute spielbar?

Ja.

Automatisierte Browser-, Mobile-, Reload-, Bulk- und Release-Gate-Smokes sind gruen. Die verbleibenden Hinweise sind bekannte nicht-kritische Dev-Noise (`service-worker-register-log`, `dev-404-resource-log`) und blockieren den spielbaren PWA-Stand nicht.

## Geaenderte Dateien

- `index.html`
- `app.js`
- `dev/run-event-center-v2-combined-visible-matrix-smoke.js`
- `dev/run-event-center-v2-combined-visible-mobile-matrix-smoke.js`
- `dev/run-event-v2-bulk-visible-sample-smoke.js`
- `src/events/legacy/EventV1WriteTelemetry.js`

## Neue Dateien

- `docs/event-system-v2/phase-event-v2-playable-pwa-finish.md`
- `docs/event-system-v2/phase-event-v2-playable-pwa-finish-result.md`

## Was wurde geaendert?

- Build-ID auf `20260601-event-v2-playable-pwa` aktualisiert, damit versionierte PWA-Scripts und Assets frisch geladen werden.
- Ein globaler Browser-Script-Konflikt im V1-Write-Telemetrie-Modul wurde minimal behoben: `DEV_QUERY_KEYS` wurde zu `V1_WRITE_TELEMETRY_DEV_QUERY_KEYS`, damit die V2 Seed DevTools im Browser sicher geladen werden.
- Sichtbare Rest-Debugtexte im V2-Spielerpfad wurden entfernt: `V2 Pilotpfad` und der Asset-Origin-Badge `Kategorie Visual` erscheinen nicht mehr im Event Sheet.
- Sichtbare Browser-/Mobile-/Bulk-Smokes pruefen diese Resttexte nun explizit als verbotene Spieler-Copy.
- Keine Eventlogik wurde erweitert.
- Keine neuen Deltas wurden aktiviert.
- V1 bleibt Legacy-Fallback.

## Runtime-Enabled Events

Aktuell runtime-enabled:

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

## Browserseitig gepruefte Events

Automatisiert sichtbar gepruefte Sample-Events:

- `indoor_heat_stress_air`
- `indoor_overwatering_early`
- `outdoor_heatwave_dry_wind`
- `shared_rootbound_warning`
- `shared_early_pest_signs_mild`

Zusaetzlich durch Combined Visible Browser/Mobile-Smokes geprueft:

- `indoor_dry_rootball`
- `shared_panic_watering_misread`

## Eventbilder

`dev/run-event-v2-final-assets-audit.js` meldet `ok: true`.

Alle runtime-enabled finalen Eventordner besitzen:

- `hero.webp`
- `fallback.webp`

Die sichtbaren Browser-Smokes pruefen, dass fuer V2-Events der `hero.webp`-Pfad im V2-Visual-Slot erscheint und keine Legacy-/Cooldown-Bilder sichtbar sind.

## Resolve / History / Reload

Ergebnis:

- `openEvents -> history` funktioniert.
- Reload bleibt idempotent.
- Keine doppelte History.
- Kein Double-Apply.
- V1-Parallelwrite bleibt blockiert.
- `indoor_dry_rootball/stabilize` bleibt der einzige bestaetigte mutierende Fall.
- Bulk-Events bleiben per Default `safe_default_review` / noDelta.

## Sichtbare Copy / Debugfreiheit

Die sichtbaren Smokes pruefen, dass keine Legacy-/Cooldown-Copy im V2-Pfad erscheint. Technische Debugtexte wie `ApplyPreview`, `ApplyDelta`, `Authority: V2 Pilot`, `eventV2PilotActive`, `diagnostic_only` und `guardrail_only` bleiben aus dem Spielerpfad heraus.

## Testbefehle

Ausgefuehrt:

- `node dev/run-event-v2-final-assets-audit.js`
- `node dev/run-event-v2-bulk-activation-smoke.js`
- `node dev/run-event-v2-bulk-visible-sample-smoke.js`
- `node dev/run-event-v2-visibility-health-report.js`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node dev/run-event-center-v2-pilot-options-matrix-smoke.js`
- `node dev/run-event-center-v2-combined-visible-matrix-smoke.js`
- `node dev/run-event-center-v2-combined-visible-mobile-matrix-smoke.js`
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

Zusatzchecks:

- `node --check app.js`
- `node --check ui.js`
- `node --check sim.js`
- `node --check storage.js`
- `node --check events.js`
- `node --check src/events/EventSystemRuntimeBridge.js`
- `node --check src/events/v2/runtime/EventV2ActivationRegistry.js`
- `node --check src/events/v2/runtime/EventV2OutcomePolicy.js`
- `node --check src/events/v2/ui/EventV2PresentationMap.js`
- `node --check src/events/v2/dev/EventV2PilotSeedDevTools.js`
- `node --check src/events/legacy/EventV1WriteTelemetry.js`
- `node dev/run-event-v1-write-telemetry-smoke.js`
- `node dev/run-event-v1-write-telemetry-report.js`
- `node dev/run-event-v1-dependency-audit.js`
- `node dev/run-event-v1-write-isolation-report.js`

## Testergebnisse

- Final Assets Audit: gruen
- Bulk Activation Smoke: gruen
- Bulk Visible Sample Smoke: gruen
- Visibility Health Report: gruen
- Release Gate Snapshot: `gate: "go"`
- Combined Visible Browser Smoke: gruen
- Combined Visible Mobile Smoke: gruen
- Pilot Options Matrix Smoke: gruen
- Syntax Check: gruen
- Event Release Tests: gruen
- Smoke Tests: gruen

Hinweis: `node --check index.html` wurde kurz ausprobiert und ist fuer HTML nicht anwendbar (`ERR_UNKNOWN_FILE_EXTENSION`). Das ist kein Produkt- oder PWA-Fehler.

## Bekannte Restrisiken

- Bekannte nicht-kritische Dev-Noise bleibt sichtbar: Service-Worker-Register-Log und vereinzelter Dev-404-Resource-Log.
- In manuellen lokalen Browserlaeufen ohne Test-Auth-Harness kann die Remote-Save-API CORS-Noise erzeugen; die App faellt dabei auf lokale Save-Pfade zurueck. Das wurde nicht als V2-Blocker gewertet.
- Bulk-Events sind spielbar sichtbar, aber fachlich bewusst konservativ: neue Statuswirkungen muessen spaeter eventweise freigegeben werden.
- V1 ist weiterhin Legacy-Fallback und darf noch nicht geloescht werden.
- Manuelle QA auf echten Endgeraeten bleibt empfohlen, auch wenn die Mobile-Smokes fuer 360/390/430 gruen sind.

## Bewusst nicht geaendert

- Kein V1-Delete.
- Keine alte Save-Felder geloescht.
- Keine Storage-Migration erzwungen.
- Keine neuen echten Statusdeltas fuer Bulk-Events.
- Kein Event-Center-Redesign.
- Keine Daily-/Retention-/Missions-/Push-/Monetarisierungs-Aenderung.

## Empfehlung

Marco kann mit anderen Spielbereichen weitermachen. Der aktuelle Eventsystem-V2-Stand ist spielbar, sichtbar und durch die vorhandenen Gates ausreichend abgesichert. Naechste sinnvolle Arbeit ist nicht noch ein weiterer V2-Polish-Loop, sondern entweder manuelle Endgeraete-QA oder ein Wechsel zu einem anderen priorisierten Spielsystem.
