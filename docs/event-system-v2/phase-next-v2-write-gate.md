# Eventsystem V2 - Dev-only V1/V2 Write-Gate Contract

## Ziel dieser Mini-Phase

Diese Mini-Phase fuehrt ein dev-only Write-Gate-Contract-Modul ein, das die Event-Write-Zustaendigkeit zwischen V1 und V2 simuliert.

Es wird nichts produktiv geschaltet oder gespeichert.

Ziel ist der Sicherheitsnachweis:

- V1 und V2 schreiben niemals gleichzeitig denselben Eventfluss.
- V2 darf nur mit expliziter Freigabe als theoretische Write-Autoritaet auftreten.
- Standard bleibt V1 oder no-write.
- ungueltige oder unklare Zustaende werden geblockt.

## Warum ein Write-Gate noetig ist

Nach Resolve-Contract, Save-Shape und Roundtrip fehlt noch die klare Autoritaetsregel:

- Wer waere fuer Event-Writes zustaendig?
- Unter welchen Bedingungen darf V2 ueberhaupt theoretisch schreiben?
- Wie wird Doppelautoritaet sicher verhindert?

Ohne Gate koennte ein spaeterer Cutover V1/V2-Kollisionen erzeugen.

## Autoritaeten

Es gibt zwei moegliche Write-Autoritaeten:

- V1 (`state.events`-Welt, produktiv etabliert)
- V2 (`state.eventV2`-Welt, aktuell dev-only)

In dieser Phase gilt weiterhin:

- kein produktiver Write
- kein Runtime-Cutover
- V1 bleibt praktisch produktiv
- V2 bleibt no-write/dev-only

## Gate-Modi

Das Contract-Modul kennt folgende Modi:

- `v1-only`
- `v2-preview`
- `v2-dry-run`
- `v2-active`
- `blocked`

Bedeutung:

- `v1-only`
  - V1 waere alleinige Write-Autoritaet.
  - V2 schreibt nicht.
- `v2-preview`
  - V2 darf Preview/Analyse.
  - V2 schreibt nicht.
  - V1 bleibt Autoritaet.
- `v2-dry-run`
  - V2 darf Dry-Run-Simulation.
  - V2 schreibt nicht.
  - V1 bleibt Autoritaet.
- `v2-active`
  - nur theoretischer Zielmodus.
  - verlangt explizite dev-only Freigabe.
  - ohne Freigabe wird geblockt.
- `blocked`
  - ungueltiger Modus
  - ungueltige Shape/Version
  - Doppelautoritaet
  - fehlende Voraussetzungen

## Entscheidungsregeln

Das Gate prueft mindestens:

- existiert `state.eventV2`?
- ist das `eventV2` Save-Shape gueltig?
- ist `schemaVersion` gueltig?
- ist der Gate-Modus gueltig?
- ist `v2-active` explizit erlaubt?
- wuerde V1 schreiben?
- wuerde V2 schreiben?
- entsteht eine doppelte Autoritaet?

Regel fuer `singleAuthority`:

- genau eine von `v1CanWrite` oder `v2CanWrite` darf `true` sein
- sonst `blocked`

## Blocked-Zustaende

`blocked` wird gesetzt bei:

- unbekanntem Gate-Modus
- ungueltigem `eventV2` Shape
- ungueltiger oder unbekannter `schemaVersion`
- `v2-active` ohne explizite Freigabe
- gleichzeitiger V1/V2-Write-Absicht
- fehlender Voraussetzung fuer angeforderten V2-Modus

## Verhaeltnis zu V1

V1 bleibt unveraendert und wird nicht umgebaut.

Das Gate simuliert nur, ob V1 oder V2 zustaendig waeren. Es greift nicht in V1-Logik oder produktive Eventpfade ein.

## Verhaeltnis zu `eventV2.mode`

Ableitung ohne expliziten Gate-Override:

- `eventV2.mode: no-write` -> `v1-only`
- `eventV2.mode: dry-run` -> `v2-dry-run`
- `eventV2.mode: active` -> `v2-active` (weiterhin freigabepflichtig)
- fehlendes `eventV2` -> `v1-only`

## Warum noch kein produktiver Write erfolgt

Diese Phase ist ein Contract/Harness-Block:

- `wouldWrite` bleibt immer `false`
- `usedProductiveStorage` bleibt immer `false`
- keine Storage-API wird genutzt
- kein echter State wird mutiert

## Spaetere Kriterien fuer `v2-active`

Bevor `v2-active` produktiv werden darf, sollten mindestens erreicht sein:

- finaler V1/V2-Write-Gate mit Runtime-Integration
- Save/Load-Absicherung fuer alte und neue Saves
- explizites Rollback-Verhalten
- produktive Tests fuer Single-Authority unter Lastfaellen
- abgesicherter Cutover-Plan

## Restrisiken

- Das Gate ist aktuell dev-only und nicht in produktive Runtime eingehangen.
- `v2-active` ist nur theoretisch validiert, nicht produktiv aktiviert.
- Ohne spaetere Runtime-Einbindung bleibt der Nachweis auf Contract-Ebene.

