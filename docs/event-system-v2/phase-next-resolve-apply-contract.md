# Eventsystem V2 - Resolve Apply Contract Mini-Phase

## Ziel dieser Mini-Phase

Diese Mini-Phase bereitet einen sicheren Resolve Apply Contract fuer genau einen engen V2-Testfall vor.

Der Contract beschreibt und prueft, wie ein V2-Resolve spaeter kontrolliert kleine State-Auswirkungen anwenden darf. In dieser Phase wird aber weiterhin **nicht produktiv geschrieben**.

Statusziel:

- dev-only
- deterministisch testbar
- no-write als Default
- kein produktiver Event-Center-Cutover
- keine Save-Migration
- keine Aenderung am V1-Verhalten

## Warum Resolve Apply der naechste Blocker ist

Der letzte Abschluss hat V2 als preview-stabil und no-write abgeschlossen. Der wichtigste verbliebene Blocker ist nicht mehr Katalog oder Darstellung, sondern die Frage:

**Welche V2-Resolve-Auswahl darf spaeter welche minimale, sichere Mutation ausloesen?**

Ohne diesen Contract waere jeder Write-Cutover riskant, weil unklar bliebe:

- welche Zielbereiche erlaubt sind
- welche State-Felder tabu bleiben
- wie Fehler defensiv behandelt werden
- wie Preview, Apply und Save voneinander getrennt bleiben
- wie V1/V2-Parallelbetrieb verhindert wird

## Contract-Struktur

Der dev-only Contract besteht aus:

- `eventId`
- `optionId`
- `eventVersion`
- `currentState`
- `requestedWriteMode`
- `allowedStateTargets`
- `forbiddenStateTargets`
- `expectedMutations`
- `previewResult`
- `historyPreview`
- `diagnostics`

Der erste enge Testfall ist:

- Event: `indoor_dry_rootball`
- Event-Version: `3`
- Optionen:
  - `inspect`
  - `stabilize`
  - `overreact`

Diese Optionen entsprechen dem bestehenden Resolve-Preview-Pfad, nicht einer produktiven Katalogaktion.

## Erlaubte Mutationen

In dieser Phase sind nur kleine, reversible, numerische Status-Deltas als Preview erlaubt:

- `status.stress`
- `status.risk`
- optional spaeter `status.health` in engem Wertebereich

Zusaetzlich darf ein **History Preview Entry** vorbereitet werden. Dieser wird nicht gespeichert.

Erlaubte Delta-Grenzen:

- `status.stress`: -3 bis +3
- `status.risk`: -3 bis +3
- `status.health`: -2 bis +2

Alle Werte werden fuer die Preview auf 0 bis 100 geklemmt.

## Verbotene Mutationen

In dieser Phase verboten:

- Savegame-Migration
- echte Writes in `state`
- echte Writes in `localStorage`, IndexedDB oder Remote Storage
- Coins
- XP
- Daily Rewards
- Retention
- Push
- Monetarisierung
- produktive Event-Center-Actions
- produktive V2 Open Event Queue
- V1-Eventersetzung
- irreversible Pflanzenzustandsaenderungen

Verbotene Zielbereiche:

- `coins`
- `xp`
- `profile`
- `daily`
- `retention`
- `push`
- `monetization`
- `storage`
- `events.activeEventId`
- `events.openEvents`
- `events.history`
- `eventV2.openEvents`
- `eventV2.history`

## No-Write Verhalten

`requestedWriteMode` steht standardmaessig auf `no_write`.

Bei `no_write` gilt:

- Result wird erzeugt.
- Mutationsplan wird berechnet.
- `stateAfterPreview` darf als Kopie entstehen.
- Original-State wird nicht veraendert.
- `canMutateState` bleibt `false`.
- `canMutateSave` bleibt `false`.
- `saveWrites` bleibt `0`.

Wenn ein echter Write-Modus angefordert wird, lehnt diese Mini-Phase kontrolliert ab.

## Fehlerverhalten

Fehler werfen nicht unkontrolliert, sondern erzeugen ein strukturiertes Result:

- `ok: false`
- `accepted: false`
- `reason`
- `errors`
- `diagnostics`

Abgelehnt werden unter anderem:

- unbekannte Event-ID
- unbekannte Option
- falsche Event-Version
- Mutation ausserhalb erlaubter Zielbereiche
- Mutation ausserhalb Delta-Grenzen
- produktiver Write-Modus

Fehlender oder unvollstaendiger State darf nicht crashen. Es werden sichere Defaults fuer die Preview genutzt.

## Preview-Ergebnis

Das Preview-Ergebnis enthaelt:

- akzeptierte Eingabe
- geplante Mutationen
- Before-/After-Werte als Preview
- vorbereiteten History-Eintrag
- Safety Labels
- Diagnostics mit `stateMutations: 0` und `saveWrites: 0`

## Spaeterer Write-Modus

Ein spaeterer Write-Modus darf erst aktiviert werden, wenn:

- Save-Felder versioniert geplant sind
- alte Saves defensive Defaults erhalten
- V1/V2-Write-Gate eine einzige Autoritaet garantiert
- Apply nur fuer erlaubte Targets moeglich ist
- History/Dedupe-Regeln vorhanden sind
- ein Save/Load-Smoke fuer V2 offene und geloeste Events gruen ist

## Risiken

- Zu frueher Write-Cutover koennte V1 und V2 gegeneinander arbeiten lassen.
- Zu breite Mutationsziele wuerden Economy, Retention oder Savegame-Stabilitaet gefaehrden.
- Preview-Deltas duerfen nicht als final gebalanced missverstanden werden.
- History Preview ist noch keine echte Persistenz.

## Teststrategie

Der Smoke muss pruefen:

- valider Resolve erzeugt Apply Preview Result
- erwartete Mutationen sind nachvollziehbar
- Original-State bleibt unveraendert
- unbekannte Event-ID wird abgelehnt
- unbekannte Option wird abgelehnt
- fehlender State crasht nicht
- produktiver Write-Modus wird abgelehnt
- No-Write-Diagnostics bleiben auf 0 Writes

Relevante Befehle:

- `node --check src/events/v2/preview/EventV2ResolveApplyContract.js`
- `node --check dev/run-event-v2-resolve-apply-contract-smoke.js`
- `node dev/run-event-v2-resolve-apply-contract-smoke.js`
