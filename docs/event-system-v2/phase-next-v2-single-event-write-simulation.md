# Eventsystem V2 - Single-Event Write-Simulation (Dev-only)

## Ziel dieser Mini-Phase

Diese Mini-Phase fuehrt eine isolierte Write-Simulation fuer genau ein V2-Testevent ein:

- `indoor_dry_rootball`

Die Simulation zeigt, welche Write-Objekte spaeter entstehen wuerden, ohne produktiv zu schreiben.

## Warum jetzt eine Write-Simulation sinnvoll ist

Nach Save-Shape, Roundtrip, Write-Gate, Runtime-Adapter und Telemetry fehlt der naechste Nachweis:

- kann ein einzelner V2-Fall den kompletten Simulations-Write-Pfad sauber durchlaufen?
- bleibt alles strikt no-storage/no-runtime-mutation?

Damit wird der Pfad fuer spaetere, kontrollierte Write-Freigaben vorbereitet, ohne schon produktiv zu werden.

## Warum weiterhin keine produktive Persistenz erfolgt

Auch in dieser Phase gilt:

- kein echter Storage-Write
- keine Migration
- kein Cutover
- keine Runtime-Integration in produktive Owner-Dateien

`wouldWrite: true` bedeutet nur: der Harness simuliert, welche Write-Objekte entstünden.

## Rolle des Dev-Flags

Die Simulation laeuft nur mit expliziter Freigabe:

- `permissions.allowDevWriteSimulation === true`

Ohne dieses Flag wird der Ablauf kontrolliert geblockt.

## Ablauf der Simulation

1. Kontext erzeugen.
2. Dev-Flag pruefen.
3. Save-Shape vor Simulation validieren.
4. Write-Gate pruefen (`v2-active` nur mit dev-only Freigabe).
5. OpenEvent-Writeobjekt simulieren.
6. Resolve Apply Contract ausfuehren.
7. History-Writeobjekt simulieren.
8. Apply-Deltas simulieren.
9. Persist-Payload simulieren.
10. Save-Shape nach Simulation validieren.
11. Roundtrip auf simuliertem Payload pruefen.
12. Safety-Grenzen verifizieren.

## Simulierte Write-Objekte

- Open Event Objekt (`openEvents`-Eintrag, Preview-Kontext)
- Resolve-Ergebnis (aus bestehendem Resolve Apply Contract)
- History-Eintrag (`history`-Eintrag)
- Apply-Deltas (aus `expectedMutations`)
- Hypothetisches Persist-Payload (`eventV2` Payload fuer spaeteres Schreiben)

## Sicherheitsregeln

- `wouldWrite: true` (simulierter Schreibbedarf)
- `productiveWrite: false`
- `usedProductiveStorage: false`
- `mutatedInputState: false`
- `productiveCutover: false`

Keine V1-Logik wird geaendert.

## Verhaeltnis zu V1/V2 Write-Gate

Die Simulation respektiert das bestehende Gate:

- ohne passende Freigabe -> blocked
- bei Doppelautoritaet -> blocked
- fuer diesen Dev-Case wird `v2-active` nur als theoretische, dev-only Simulation erlaubt

## Verhaeltnis zu spaeterem echten Save-Write

Die Phase liefert nur ein isoliertes Simulationsabbild.

Ein echter Save-Write erfordert spaeter:

- Runtime-Einbindung hinter sicherem Gate
- Migrations- und Legacy-Save-Absicherung
- klaren Rollback-Pfad

## Restrisiken

- Der Nachweis ist auf ein einzelnes Testevent fokussiert.
- Kein produktiver Integrationstest wird ersetzt.
- Weitere Eventtypen koennen eigene Simulationskanten mitbringen.

