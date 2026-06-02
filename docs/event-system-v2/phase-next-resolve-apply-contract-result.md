# Eventsystem V2 - Resolve Apply Contract Result

## Executive Summary

Die Mini-Phase ist abgeschlossen.

Es existiert jetzt ein sicherer, dev-only Resolve Apply Contract fuer den engen Testfall `indoor_dry_rootball`. Der Contract nimmt V2-Resolve-Input an, validiert Event, Option und Version, erzeugt ein nachvollziehbares Apply-Preview-Result und bereitet einen History-Preview-Eintrag vor.

V2 schreibt weiterhin nicht produktiv:

- kein State-Write
- kein Save-Write
- keine V2 Open-Event-Persistenz
- keine V1-Ersetzung
- kein produktiver Event-Center-Cutover

Statusentscheidung:

**Resolve Apply Contract vorbereitet, V2 bleibt dev-only/no-write.**

## Geaenderte Dateien

Keine bestehenden produktiven Runtime-, Save-, UI- oder V1-Dateien wurden geaendert.

## Neue Dateien

- `docs/event-system-v2/phase-next-resolve-apply-contract.md`
  - Dokumentiert Ziel, Contract-Struktur, erlaubte/verbotene Mutationen, No-Write-Verhalten, Write-Readiness-Kriterien, Risiken und Teststrategie.
- `src/events/v2/preview/EventV2ResolveApplyContract.js`
  - Dev-only Contract-Modul fuer Apply Preview und defensive Validierung.
- `dev/run-event-v2-resolve-apply-contract-smoke.js`
  - Smoke-Script fuer gueltige Inputs, ungueltige Inputs, fehlenden State und Write-Mode-Ablehnung.
- `docs/event-system-v2/phase-next-resolve-apply-contract-result.md`
  - Dieser Abschlussbericht.

## Was implementiert wurde

- Enger Contract fuer genau einen Testevent:
  - `eventId: indoor_dry_rootball`
  - `eventVersion: 3`
  - Optionen: `inspect`, `stabilize`, `overreact`
- Erlaubte Preview-Zielbereiche:
  - `status.stress`
  - `status.risk`
  - `status.health`
- Verbotene Zielbereiche:
  - Coins, XP, Profile, Daily, Retention, Push, Monetization, Storage
  - produktive V1/V2 Event-Queues und produktive Event-History
- Defensives Error-Result statt unkontrolliertem Throw fuer erwartbare Validierungsfehler.
- Apply Preview mit Before-/After-Werten.
- History Preview Entry, nicht persistiert.
- Harte No-Write-Diagnostics mit 0 State-/Save-/Storage-Writes.
- Produktiver Write-Modus wird kontrolliert abgelehnt.

## Was ausdruecklich nicht implementiert wurde

- Keine produktive Resolve Apply Action.
- Keine echte State-Mutation.
- Keine Savegame-Migration.
- Keine Speicherung von `eventV2.openEvents`.
- Keine Speicherung von `eventV2.history`.
- Keine Coins-/XP-/Daily-/Retention-Effekte.
- Keine Integration in `app.js`, `sim.js`, `storage.js` oder produktive Event-Center-Flows.
- Keine Veraenderung am V1-Verhalten.
- Keine breite Aktivierung fuer alle V2-Events.

## Testergebnisse

- `node --check src/events/v2/preview/EventV2ResolveApplyContract.js`
  - Ergebnis: bestanden.
- `node --check dev/run-event-v2-resolve-apply-contract-smoke.js`
  - Ergebnis: bestanden.
- `node dev/run-event-v2-resolve-apply-contract-smoke.js`
  - Ergebnis: bestanden.
  - Valider Resolve akzeptiert.
  - Ungueltige Event-ID abgelehnt.
  - Ungueltige Option abgelehnt.
  - Fehlender State crasht nicht.
  - Write-Modus abgelehnt.
  - `stateMutations: 0`, `saveWrites: 0`.
- `node dev/run-event-v2-resolve-preview-model-report.js`
  - Ergebnis: bestanden.
  - Bestehender Resolve-Preview-Pfad bleibt no-write stabil.
- `node dev/run-event-v2-final-catalog-audit.js`
  - Ergebnis: bestanden.
  - 22 Events, 2 Chains, 9 Learning-Cards, 0 Duplicate IDs, 0 fehlende V2-i18n Keys, 0 fehlende Assets, 0 ungueltige Referenzen.

## Restrisiken

- Der Contract ist noch kein produktiver Apply-Pfad.
- Die Mutation-Deltas sind technische Safe Defaults, kein finales Balancing.
- History Preview ist noch keine echte History-Persistenz.
- Save/Load fuer V2 Open Events bleibt der naechste echte Blocker.
- V1/V2-Write-Gate ist weiterhin nicht final fuer produktiven Cutover umgesetzt.

## Naechste empfohlene Mini-Phase

1. Versioniertes Save-Shape fuer `eventV2.openEvents` und `eventV2.history` als No-Write-/Dry-Run-Contract definieren.
2. V1/V2-Write-Gate testen: genau eine Autoritaet darf echte Events schreiben.
3. Danach erst einen einzelnen dev-only Write-Experimentpfad fuer `indoor_dry_rootball` planen.
