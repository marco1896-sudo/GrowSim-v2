# Eventsystem V2 - Branch-Readiness-Matrix (Dev-only)

## Ziel dieser Mini-Phase

Diese Mini-Phase prueft, ob der fuer `indoor_dry_rootball` etablierte Multi-Branch-Sicherheitsstandard auf ein weiteres bestehendes V2-Event uebertragbar ist.

Es erfolgt keine produktive Aktivierung.

## Warum kein produktiver Write erfolgt

Die Matrix ist ein dev-only Reifegradreport.

Sie bewertet Branch-Struktur und Simulationsfaehigkeit, fuehrt aber keine produktiven Writes, keine Migration und keinen Cutover aus.

## Warum ein weiteres Event geprueft wird

Der bisherige Standard basiert auf einem einzelnen Event.

Ein zweites Event zeigt, ob:

- Branch-Rollen konsistent modellierbar sind
- Option-IDs und Effekte fuer dieselbe Sicherheitslogik taugen
- der Standard nicht zufaellig nur fuer `indoor_dry_rootball` funktioniert

## Auswahlkriterien

Verwendete Kriterien:

1. mindestens 3 Optionen
2. klare gute/neutrale/schlechte Pfade
3. einfache, gut lesbare Semantik
4. geringe Abhaengigkeit von komplexen Folgeketten
5. geeignet fuer spaetere dev-only Branch-Simulation

## Gewaehltes Event

- `shared_panic_watering_misread`

Begruendung:

- besitzt genau 3 klar getrennte Optionen
- hat eine offensichtliche Fehlentscheidung (`isDeliberateMistake`)
- hat empfohlene und teilweise korrigierende Optionen
- passt strukturell gut zum vorhandenen Simulationsstandard

## Branch-Matrix

Vergleichsbasis:

- Referenz: `indoor_dry_rootball`
- Kandidat: `shared_panic_watering_misread`

Optionen (aus Katalog, nicht erfunden):

- `check_weight_before_watering`
- `inspect_rootzone_then_wait`
- `water_on_panic_signal`

Semantische Einordnung:

- `recommended`
- `neutral`
- `negative`

Pro Branch bewertet:

- `hasApplyPreviewPath`
- `hasHistoryPreviewPath`
- `hasPersistPayloadPath`
- `expectedDeltaType`
- `readyForWriteSimulation`

## Readiness-Ergebnis

Ergebnis fuer den Kandidaten:

- `readiness: ready`

Grund:

- 3 verwertbare Branches vorhanden
- Rollenabdeckung empfohlen/neutral/negativ vorhanden
- Effekte und IDs konsistent ableitbar
- Safety bleibt no-write/no-storage/no-mutation

## Sicherheitsregeln

Auch in der Matrix gilt:

- `productiveWrite: false`
- `usedProductiveStorage: false`
- `mutatedInputState: false`
- `productiveCutover: false`

## Was ausdruecklich nicht gemacht wird

- keine Katalog- oder Runtime-Aktivierung
- keine produktive Speicherung
- keine Migration
- keine V1-Aenderung
- keine breite Event-Umbauphase
- keine erzwungene zweite Vollsimulation

## Restrisiken

- Matrix zeigt Readiness, nicht produktive Integrationsreife.
- Event-spezifische Sonderfaelle koennen spaeter weitere Regeln benoetigen.
- Folgeketten- und Mehr-Event-Kombinationen sind nicht Teil dieser Phase.

