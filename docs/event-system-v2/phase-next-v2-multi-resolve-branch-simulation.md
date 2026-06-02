# Eventsystem V2 - Multi-Resolve-Branch Write-Simulation (Dev-only)

## Ziel dieser Mini-Phase

Diese Mini-Phase erweitert die bestehende Single-Event Write-Simulation fuer `indoor_dry_rootball` auf mehrere Resolve-Zweige.

Der Fokus bleibt dev-only und no-storage.

## Warum mehrere Resolve-Zweige wichtig sind

Ein einzelner erfolgreicher Pfad reicht nicht aus, um die spaetere Write-Nachvollziehbarkeit zu sichern.

Mehrere Zweige zeigen:

- unterschiedliche Entscheidungsfolgen erzeugen unterschiedliche Apply-/History-Payloads
- Safety-Grenzen bleiben in allen Zweigen stabil
- Blocked-Verhalten fuer ungueltige Optionen bleibt kontrolliert

## Genutztes Event

- `indoor_dry_rootball`

## Gepruefte Branches

- `recommended`
- `neutral`
- `overreact`

## Verwendete Option-IDs

Aus dem bestehenden Resolve-Contract:

- `stabilize` (empfohlen)
- `inspect` (neutral/beobachtend)
- `overreact` (schlecht/ueberreagierend)

Keine neuen Katalog-Optionen wurden eingefuehrt.

## Erwartete Branch-Unterschiede

- `stabilize`:
  - mehrere kleine negative Deltas fuer Stress/Risiko
  - erwartete Qualitaet gut
- `inspect`:
  - geringe/gezielte Delta-Aenderung (beobachtend)
  - erwartete Qualitaet gut
- `overreact`:
  - negative Verhaltensfolge mit steigenden Stress-/Risiko-Deltas
  - erwartete Qualitaet schlecht

## Sicherheitsregeln

Auch im Multi-Branch-Modus gilt fuer jeden Branch:

- `wouldWrite: true` (simuliert)
- `productiveWrite: false`
- `usedProductiveStorage: false`
- `mutatedInputState: false`
- kein produktiver Cutover

## Verhaeltnis zur spaeteren echten In-Memory-Mutation

Die Branch-Simulation zeigt nur hypothetische Write-Objekte.

Es findet keine echte In-Memory-Mutation des App-States und keine Persistenz statt. Fuer spaetere echte Mutation sind separate Sicherheitsphasen noetig.

## Was ausdruecklich nicht gemacht wird

- keine produktiven Writes
- keine Storage-API-Nutzung
- keine Migration
- kein Cutover
- keine V1-Aenderung
- keine Runtime-Einbindung in produktive Owner-Dateien
- kein neues Event als Phasenfokus

## Restrisiken

- Der Nachweis bleibt auf ein Event begrenzt.
- Komplexere Folgeketten mehrerer Events sind nicht Teil dieser Phase.
- Produktive Integrationsrisiken bleiben bis zu spaeteren Runtime-/Save-Phasen getrennt.

