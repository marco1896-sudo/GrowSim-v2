# Eventsystem V2 - Dev-only Runtime-Adapter-Harness

## Ziel dieser Mini-Phase

Diese Mini-Phase fuehrt einen isolierten Runtime-Adapter-Harness ein, der bestehende V2-Sicherheitsbausteine in der richtigen Reihenfolge zusammensetzt.

Der Harness bleibt strikt dev-only:

- kein produktiver Write
- kein produktiver Storage
- keine Mutation am echten Input-State
- keine Aenderung an V1

## Warum ein Runtime-Adapter-Harness noetig ist

Bisherige Mini-Phasen haben einzelne Bausteine abgesichert:

- Resolve Apply Contract
- Save-Shape-Validierung
- Save/Load-Roundtrip
- V1/V2 Write-Gate

Der naechste Schritt ist der Integrationsnachweis im isolierten Simulationspfad:

- greifen die Bausteine zusammen?
- wird das Gate vor Resolve ausgefuehrt?
- bleibt no-write auch im Ablauf stabil?

## Zusammengesetzte Module

Der Harness kombiniert:

- `EventV2WriteGatePreview`
- `EventV2ResolveApplyContract`
- `EventV2SaveShapePreview`
- `EventV2SaveLoadRoundtripPreview`

## Ablauf des Harness

1. Isolierten Runtime-Preview-Kontext erzeugen.
2. Preview-Event fuer `indoor_dry_rootball` vorbereiten.
3. Save-Shape vor Resolve validieren.
4. Write-Gate auswerten.
5. Resolve Apply Contract ausfuehren (no-write).
6. Preview-Shape nach Resolve erneut validieren.
7. Save/Load-Roundtrip (serialize/deserialize/validate) auf Preview-Shape pruefen.
8. Finales Result validieren und No-Write-Grenzen bestaetigen.

## Sicherheitsregeln

- Gate vor Resolve: kein Resolve-Writepfad ohne Gate-Entscheid.
- `wouldWrite` bleibt `false`.
- `usedProductiveStorage` bleibt `false`.
- keine Storage-API-Nutzung.
- keine globale Runtime-Aenderung.
- keine V1-Logik-Aenderung.

## No-Write Verhalten

Auch bei erfolgreichem Ablauf gilt:

- nur Preview-Ergebnisse
- keine Persistenz
- keine App-State-Mutation
- `v2-dry-run` bleibt nicht-schreibend

`v2-active` ohne explizite Freigabe wird geblockt.

## Verhaeltnis zu V1

V1 bleibt unveraenderte Referenz-Autoritaet.

Der Harness simuliert nur V2-Preview-Zusammenspiel und ersetzt keine produktive V1-Write-Entscheidung.

## Verhaeltnis zu spaeterem Cutover

Der Harness ist Vorstufe, kein Cutover.

Er reduziert Risiko, indem die Reihenfolge und Safety-Gates in Isolation bewiesen werden. Eine produktive Runtime-Einbindung braucht spaeter eigene abgesicherte Schritte.

## Was ausdruecklich nicht gemacht wird

- kein Einbau in `app.js`, `sim.js`, `storage.js`, `events.js`
- kein produktiver Event-Center-Pfad
- keine Migration
- keine Feature-Flag-Aktivierung fuer produktiven V2-Write
- kein V1-Ersatz

## Restrisiken

- Der Ablauf ist isoliert und noch nicht produktiv verdrahtet.
- Es wird ein enger Testevent-Pfad (`indoor_dry_rootball`) geprueft.
- Blocked-/Fehlercodes sind stabil, aber spaetere Runtime-Integration kann weitere Kontexte erfordern.

