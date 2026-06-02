# Eventsystem V2 - Dev-only Runtime Telemetry Preview

## Ziel dieser Mini-Phase

Diese Mini-Phase fuehrt einen strukturierten Dev-Report ueber dem Runtime-Adapter-Harness ein.

Der Report macht transparent:

- Kontext-Status
- Event-Vorbereitung
- Save-Shape vor/nach Resolve
- Write-Gate-Ergebnis
- Resolve-Apply-Ergebnis
- Roundtrip-Ergebnis
- Safety-Zustand (`wouldWrite`, `usedProductiveStorage`, `mutatedInputState`)
- Blocker fuer spaetere Write-Readiness

## Warum Telemetry/Reporting jetzt sinnvoll ist

Die bisherigen Mini-Phasen haben einzelne Sicherheitsbausteine stabilisiert. Mit dem Runtime-Adapter gibt es jetzt einen verbundenen Ablauf.

Der naechste sinnvolle Schritt ist ein einheitlicher Dev-Report, der diesen Ablauf lesbar bewertet:

- welche Schritte laufen stabil?
- welcher Schritt blockiert?
- wie weit ist der Pfad von Write-Readiness entfernt?

## Ausgewertete Module

Der Telemetry-Report nutzt:

- `EventV2RuntimeAdapterPreview`
- indirekt darin:
  - `EventV2WriteGatePreview`
  - `EventV2ResolveApplyContract`
  - `EventV2SaveShapePreview`
  - `EventV2SaveLoadRoundtripPreview`

## Report-Struktur

Hauptfelder:

- `reportType: "event-v2-runtime-telemetry-preview"`
- `mode: "dev-only"`
- `eventId`
- `status`
- `readiness`
- `steps`
- `safety`
- `blockers`
- `warnings`
- `errors`
- `nextRecommendedStep`

Schrittstruktur:

- `context`
- `prepareEvent`
- `saveShapeBefore`
- `writeGate`
- `resolveApply`
- `saveShapeAfter`
- `roundtrip`
- `finalValidation`

## Readiness-Kategorien

Implementierte Kategorien:

- `preview-stable`
- `blocked`
- `not-write-ready`
- `write-simulation-ready`

Interpretation:

- `blocked`
  - ein kritischer Schritt fehlschlaegt oder Safety wird verletzt.
- `preview-stable`
  - Ablauf stabil im no-write Preview-Modus.
- `not-write-ready`
  - sicherer Preview-Zustand, aber noch keine Write-Simulation naechster Schritt.
- `write-simulation-ready`
  - alle dev-only Sicherheitschecks stabil; naechster Schritt kann isolierte Write-Simulation hinter Dev-Flag sein.

## Safety-Felder

Der Report fuehrt explizit:

- `wouldWrite` (muss `false` bleiben)
- `usedProductiveStorage` (muss `false` bleiben)
- `mutatedInputState` (muss `false` bleiben)
- `productiveCutover` (bleibt `false`)

## Was ausdruecklich nicht gemacht wird

- keine produktive Telemetrie
- kein externer Analytics-Call
- keine UI-Anzeige
- keine Runtime-Integration
- keine Storage-API-Nutzung
- keine Migration
- kein Cutover
- keine V1-Aenderung

## Verhaeltnis zu spaeterer Write-Simulation

Der Telemetry-Report ist ein interner Reifegrad-Check.

Er ersetzt keine Write-Freigabe, zeigt aber, ob der isolierte Pfad robust genug ist, um als naechste Mini-Phase eine streng begrenzte Write-Simulation hinter Dev-Flag zu testen.

## Restrisiken

- Report bewertet den isolierten Preview-Pfad, nicht die produktive Runtime.
- Bei spaeterer Einbindung koennen weitere Integrationszustandsfehler auftreten.
- Der Hauptpfad bleibt auf den Testevent `indoor_dry_rootball` fokussiert.

