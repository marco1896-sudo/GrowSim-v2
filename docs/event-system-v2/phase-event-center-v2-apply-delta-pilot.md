# Eventsystem V2 - Event Center ApplyDelta Pilot

## Ziel der Phase

Diese Mini-Phase aktiviert erstmals einen echten, minimalen In-Memory-Delta fuer genau einen bereits abgesicherten V2-Resolve-Pfad:

- Event: `indoor_dry_rootball`
- Option: `stabilize`

Der Event-Center-Pfad soll weiterhin eng begrenzt bleiben. V2 darf den offenen Event resolven, den Preview-Effekt behalten und zusaetzlich einen kleinen Status-Delta direkt auf den bestehenden Pflanzenstatus anwenden.

## Pilot-Event

Der Pilot bleibt auf `indoor_dry_rootball` begrenzt.

Andere V2-Events werden in dieser Phase nicht produktiv erweitert.

## Pilot-Option

Nur `stabilize` darf einen echten Status-Delta anwenden.

Die weiteren vorhandenen Optionen bleiben ohne echte Statusmutation:

- `inspect`
- `overreact`

Sie duerfen im Pilotpfad weiterhin als Preview/History nachvollziehbar sein, aber sie duerfen keinen produktiven ApplyDelta auf `state.status` ausloesen.

## Angewendete Statusfelder

Der Pilot erlaubt ausschliesslich kleine Deltas auf bestehende Statusfelder:

- `status.stress`
- `status.risk`
- `status.water`

Der aktuell genutzte Contract fuer `indoor_dry_rootball / stabilize` liefert:

- `status.stress: -1`
- `status.risk: -1`

Browser-Fallbacks duerfen mindestens einen erlaubten Statuswert anwenden, solange der Scope gleich bleibt.

## Delta-Regeln

Der Delta ist bewusst klein und defensiv:

- nur erlaubte Statusziele
- keine Coins
- keine XP
- keine Daily-/Retention-/Mission-Aenderungen
- keine Pushes
- keine Werte unter `0`
- keine Werte ueber `100`
- keine harten Spruenge
- keine Nebenwirkungen ausserhalb Pflanzenstatus und Event-History

## Idempotenz-Regel

Jeder angewendete Delta wird im History-Eintrag dokumentiert:

```js
appliedDelta: {
  applied: true,
  appliedAt: 1779785001000,
  source: "event-v2-apply-delta-pilot",
  eventId: "indoor_dry_rootball",
  selectedOption: "stabilize",
  deltas: [
    { target: "status.stress", delta: -1, before: 20, after: 19 }
  ]
}
```

Nach Reload wird der Delta nicht erneut angewendet, weil kein offenes Event mehr vorhanden ist und der History-Eintrag die Anwendung markiert.

## Save/Reload-Verhalten

Der Status wird im bestehenden State veraendert und dadurch ueber den vorhandenen Save-Zyklus mitgefuehrt. Es gibt keinen neuen direkten Storage-Zugriff aus V2.

Erwartung nach Reload:

- `eventV2.openEvents` bleibt leer
- `eventV2.history` enthaelt den geloesten Eintrag
- `history.applyPreview` bleibt erhalten
- `history.appliedDelta` bleibt erhalten
- der geaenderte Status bleibt erhalten
- es entsteht keine doppelte History
- der Delta wird nicht erneut angewendet

## Legacy-Fallback

V1 bleibt Legacy-Read-Fallback. Der Bridge-Pfad erlaubt keinen V1-Parallelwrite fuer diesen Resolve.

Alte V1-Daten werden nicht geloescht und duerfen weiterhin defensiv lesbar bleiben.

## Ausdruecklich nicht gemacht

- kein Full Event-Center-Cutover
- keine weiteren V2-Events produktiv aktiviert
- keine ApplyDelta-Aktivierung fuer `inspect` oder `overreact`
- keine V1-Dateien geloescht
- keine harte Migration
- keine Storage-API direkt aus V2 genutzt
- keine Daily-/Retention-/Mission-/Push-/Monetarisierungslogik veraendert

## Restrisiken

- Der Pilot ist fachlich noch ein enger Sonderpfad und kein generischer ApplyDelta-Executor.
- Die Statusfeld-Semantik ist minimal und muss vor breiter Aktivierung pro Event weiter validiert werden.
- Browser-Fallbacks koennen weniger Contract-Details liefern als das Node-Modul; der Scope bleibt trotzdem auf erlaubte Targets begrenzt.
