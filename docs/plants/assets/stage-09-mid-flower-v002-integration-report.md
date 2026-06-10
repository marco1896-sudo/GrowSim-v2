# Stage 09 Mid Flower v002 Integration Report

## Kurzfazit

Die sichtbare Pflanzensimulation nutzt fuer `stage_09_mid_flower` jetzt bevorzugt die freigegebenen v002-Assets, ohne die bestehende allgemeine Pflanzen-Renderlogik umzubauen. Die Aktivierung ist bewusst eng gehalten und faellt bei nicht passenden Situationen automatisch auf die bisherige Darstellung zurueck.

## Integrierte v002-Assets

- `assets/plants/strains/shared/stage_09_mid_flower/healthy_none_v002.png`
- `assets/plants/strains/shared/stage_09_mid_flower/underwatered_medium_v002.png`
- `assets/plants/strains/shared/stage_09_mid_flower/overwatered_medium_v002.png`
- `assets/plants/strains/shared/stage_09_mid_flower/heat_stress_medium_v002.png`

## Bewusst nicht integriert

- `assets/plants/strains/shared/stage_09_mid_flower/nutrient_burn_medium_v002.png`
  - bleibt wegen `needs_review` ausserhalb der automatischen Auswahl

## Geaenderte Dateien

- `app.js`
- `docs/plants/assets/stage-09-mid-flower-v002-integration-report.md`

## Fallback-Verhalten

- Der neue Hook greift nur bei `stage_09`.
- `underwatered_medium_v002` wird nur bei klarem Trockenstress bevorzugt.
- `overwatered_medium_v002` wird nur bei klarem Ueberwaesserungszustand bevorzugt.
- `heat_stress_medium_v002` wird nur bei klarem Hitzestress bevorzugt.
- Wenn kein klarer Stage-09-Zustand vorliegt, wird `healthy_none_v002` genutzt.
- Wenn ein v002-Bild nicht geladen werden kann, faellt der Renderer automatisch auf die bisherige Pflanzendarstellung zurueck.

## Risiken

- Die Zuordnung arbeitet absichtlich nur mit kleinen, konservativen Status-Schwellen und nicht mit neuer Diagnose-Logik.
- `nutrient_burn_medium_v002` bleibt weiter ohne produktive Aktivierung.
- Andere Stages der Start-Charge sind von dieser Integration bewusst unberuehrt.

## Visueller Test

- Pflanze in `stage_09_mid_flower` im Home-Screen oeffnen.
- Einmal gesunden Zustand pruefen und die neue Healthy-v002-Silhouette bestaetigen.
- Danach gezielt klaren Trockenstress, klaren Ueberwaesserungszustand und klaren Hitzestress simulieren und jeweils den Bildwechsel pruefen.
- Anschliessend in einen neutralen oder anderen Stage-Zustand wechseln und bestaetigen, dass der bisherige Fallback weiter greift.

## Naechste empfohlene Phase

Ein kurzer visueller Smoke-Test fuer Stage 09 auf mobilen Groessen. Wenn die konservativen Schwellen sauber lesen, kann danach separat entschieden werden, ob `nutrient_burn_medium_v002` spaeter nach Freigabe ebenfalls angebunden werden soll.
