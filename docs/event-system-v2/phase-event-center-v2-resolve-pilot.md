# Eventsystem V2 - Event Center Resolve Pilot

## Ziel der Phase

Das bestehende Event Center darf genau ein abgesichertes V2-Event lesen und ueber den V2-Pfad resolven:

- `indoor_dry_rootball`

Der Pilot ist bewusst eng gehalten. Er ersetzt nicht das komplette Event Center und aktiviert keine weiteren V2-Events.

## Pilot-Event

Unterstuetztes Event:

- `indoor_dry_rootball`

Unterstuetzte Optionen aus dem bestehenden Resolve-Apply-Contract:

- `inspect`
- `stabilize`
- `overreact`

Es wurden keine neuen Katalog-Optionen erfunden.

## Event-Center-Hook

Die zentrale Bridge stellt den V2-Pilotpfad bereit:

- `buildEventCenterV2PilotViewModel(state)`
- `prepareEventCenterV2PilotOpenEvent(state, options)`
- `resolveEventCenterV2PilotEvent(state, optionId, options)`

`ui.js` fragt vor dem Legacy-Rendering, ob `state.eventV2.openEvents` ein unterstuetztes V2-Pilot-Event enthaelt. Falls ja, rendert das bestehende Event Sheet die V2-Daten mit der vorhandenen Button-Struktur.

Wenn kein unterstuetztes V2-Pilot-Event offen ist, bleibt der bestehende Legacy-Fallback erhalten.

## Resolve-Ablauf

Beim Klick auf eine V2-Pilot-Option:

1. `app.js` konsultiert die Bridge.
2. V1-Resolve bleibt im Bridge-Pfad blockiert.
3. `resolveEventCenterV2PilotEvent(...)` validiert Event und Option.
4. Der Resolve-Apply-Contract erzeugt ein ApplyPreview.
5. Die Eventinstanz wird aus `eventV2.openEvents` entfernt.
6. Ein History-Eintrag wird in `eventV2.history` geschrieben.
7. `eventV2.meta` wird aktualisiert.
8. UI wird neu gerendert und der bestehende Save-Zyklus darf den State wie gewohnt persistieren.

## ApplyDelta-Verhalten

Status-Deltas werden in dieser Phase nicht direkt auf `state.status` angewendet.

Die Deltas werden als kontrolliertes `applyPreview` im V2-History-Eintrag gespeichert:

- `applyDeltaAppliedToStatus: false`
- `applyDeltaStoredAsPilotPreview: true`

Damit ist der Resolve-Pfad nachvollziehbar, ohne Sim-Balancing oder Save-Kompatibilitaet auszuweiten.

## Save/Reload-Verhalten

Der Pilot nutzt das definierte `state.eventV2` Save-Shape:

- offenes Event in `eventV2.openEvents`
- geloestes Event in `eventV2.history`
- versioniertes `schemaVersion: 1`
- keine alten V1-Felder geloescht

Der Smoke prueft einen JSON-basierten Save/Reload-aehnlichen Roundtrip. Ein manueller Browser-Reload mit realem Local-State bleibt als Folgecheck empfohlen.

## Legacy-Fallback

V1 bleibt lesbar und wird nicht geloescht.

Im Bridge-Pfad gilt:

- V1 Create: deaktiviert
- V1 Resolve: deaktiviert
- V1 Write: deaktiviert
- V1 Legacy Read: bleibt erhalten

Alte V1-Eventdaten im State werden nicht entfernt und duerfen nicht crashen.

## Sicherheitsregeln

- maximal ein produktiv angebundener V2-Pilot: `indoor_dry_rootball`
- keine direkte Storage-API aus V2
- keine harte Migration
- kein Katalog-Massenumbau
- kein Service-Worker-/Push-/Daily-/Retention-/Monetarisierungsumbau
- kein Event-Center-Redesign
- ungueltige Optionen werden geblockt
- doppelte V1/V2-Schreibautoritaet wird verhindert

## Browser-Checkliste

- App startet im Devmode.
- Event Center laesst sich oeffnen.
- Ein vorbereitetes `indoor_dry_rootball` V2-Pilot-Event wird angezeigt.
- Optionen `inspect`, `stabilize`, `overreact` erscheinen.
- Resolve schreibt nach `eventV2.history`.
- `eventV2.openEvents` enthaelt die Instanz danach nicht mehr offen.
- Alte V1-Daten crashen nicht.

## Ausdruecklich nicht gemacht

- kein zweites Pilot-Event aktiviert
- kein Full Event-Center-Cutover
- keine direkte Status-Delta-Anwendung
- keine neue Persistenzschicht
- keine V1-Dateien geloescht
- kein UI-Redesign

## Restrisiken

- Der echte Browser-Reload wurde in dieser Phase nicht als automatisierter Browser-Test abgedeckt.
- Das Event Center zeigt fuer V2 nur den engen Pilotpfad.
- Apply-Deltas sind noch Preview-Daten und keine echte Sim-Mutation.
- Weitere V2-Events brauchen eigene Branch-/Resolve-Abdeckung, bevor sie ueber diesen Pfad laufen duerfen.
