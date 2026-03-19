# Simulation Environment Core (Unified Model)

## Ziel
Dieses Dokument beschreibt das zentrale Umweltsystem, das direkt in die Simulationslogik eingreift (nicht nur UI-Werte liefert).

## Kernbereiche

### 1) Environmental Core
- Temperatur (`temperatureC`)
- Luftfeuchtigkeit (`humidityPercent`)
- Airflow (`airflowScore` / `airflowLabel`)
- VPD (`vpdKpa`) — abgeleitet aus Temperatur + Luftfeuchtigkeit

### 2) Root / Nutrient Zone
- pH (`ph`)
- EC (`ec`)
- Sauerstoff Wurzelzone (`oxygenPercent`)
- Root Health (`rootHealthPercent`)

### 3) Derived/Control
- Stage-Profil (`ENV_STAGE_PROFILES`)
- Abweichungsfaktoren (`stressFactor.*`)
- zusammengesetzter Umweltstress (`envStress`)
- zusammengesetzter Root-Stress (`rootStress`)
- Aufnahme-/Effizienzfaktoren (`uptakePenalty`, `ecoEfficiency`)

## Stage-Ranges (Sollbereiche)
Aus `sim.js` (`ENV_STAGE_PROFILES`):

- Stage 1–2 (seedling):
  - Temp: 22–28 °C
  - RH: 60–78 %
  - VPD: 0.50–1.10
  - EC: 0.7–1.3
  - pH: 5.8–6.3

- Stage 3–6 (veg):
  - Temp: 23–29 °C
  - RH: 50–70 %
  - VPD: 0.80–1.40
  - EC: 1.0–2.0
  - pH: 5.7–6.2

- Stage 7–10 (flower):
  - Temp: 21–28 °C
  - RH: 40–58 %
  - VPD: 1.00–1.65
  - EC: 1.2–2.2
  - pH: 5.8–6.3

- Stage 11–12 (late/harvest):
  - Temp: 20–26 °C
  - RH: 40–56 %
  - VPD: 0.90–1.55
  - EC: 0.8–1.6
  - pH: 5.8–6.4

## Wirkbeziehungen (In-Game)

### Wasserverbrauch
Steigt mit:
- höherem VPD (Transpiration)
- höherem Umweltstress (`envStress`)
- zunehmender Stage über `envInfluence`

### Nährstoffdynamik
- `uptakePenalty` basiert auf Root- und Umweltstress (stage-skaliert)
- schlechte Root-Bedingungen (pH/EC/Oxygen) erhöhen Nährstoffprobleme

### Stress / Risiko / Gesundheit
`applyStatusDrift()` koppelt Umwelt- und Root-Stress in alle Kernwerte ein:
- Stress steigt bei Abweichungen von Temp/RH/VPD/Airflow + pH/EC/Oxygen
- Risiko steigt bei chronischem Stress und Root/Env-Problemen
- Gesundheit sinkt bei anhaltendem Druck, erholt sich im Recovery-Band

### Wachstum
- `growthImpulse` wird mit `ecoEfficiency` skaliert
- schlechte Env/Root-Bedingungen senken Wachstumswirksamkeit

## Event-System-Verknüpfung
Event-Eligibility nutzt zusätzliche Felder:
- `env.temperatureC`, `env.humidityPercent`, `env.vpdKpa`, `env.airflowScore`
- `root.ph`, `root.ec`, `root.oxygenPercent`, `root.healthPercent`

Damit sind Event-Trigger und Simulationszustand konsistent gekoppelt.

## Teststatus
Es gibt Regression-Checks unter:
- `test/environment-core-regression.test.js`

Abgedeckte Szenarien:
- seedling baseline
- vegetative baseline
- flowering baseline
- stressed plant
- overwatered plant
- nutrient imbalance
- extreme environment

Die Tests prüfen Range-Kohärenz sowie Trend-Logik (z. B. höheres VPD => mehr Wasserdrain, ungünstige Root/Env-Bedingungen => schlechtere Effizienz).
