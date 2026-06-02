# Eventsystem V2 - Versioned Save Shape Result

## Executive Summary

Die Mini-Phase ist abgeschlossen.

Es existiert jetzt ein versioniertes, defensives Save-Shape fuer zukuenftige V2 Open Events und V2 History. Das Shape ist dokumentiert und per dev-only Dry-Run validierbar.

Statusentscheidung:

**V2 bleibt dev-only, preview-stabil und no-write. Es gibt weiterhin keinen produktiven Save-Write, keine Save-Migration und keinen Cutover.**

## Neue Dateien

- `docs/event-system-v2/phase-next-v2-save-shape.md`
  - Dokumentiert Ziel, `state.eventV2` Struktur, Open-Event-Shape, History-Shape, Modi, verbotene Felder, Versionierung, Risiken und Write-Readiness-Kriterien.
- `src/events/v2/preview/EventV2SaveShapePreview.js`
  - Dev-only Preview-/Dry-Run-Modul fuer das zukuenftige V2 Save-Shape.
- `dev/run-event-v2-save-shape-dry-run-smoke.js`
  - Smoke-Script fuer gueltige und ungueltige Save-Shape-Faelle.
- `docs/event-system-v2/phase-next-v2-save-shape-result.md`
  - Dieser Abschlussbericht.

## Geaenderte Dateien

Keine bestehenden produktiven Runtime-, Save-, UI-, V1-, Service-Worker-, Push-, Daily-, Retention- oder Monetarisierungsdateien wurden geaendert.

Insbesondere nicht geaendert:

- `app.js`
- `sim.js`
- `storage.js`
- `events.js`

## Definierte Save-Struktur

Zukuenftiges Shape:

```js
state.eventV2 = {
  schemaVersion: 1,
  mode: 'no-write',
  openEvents: [],
  history: [],
  meta: {
    lastGeneratedAt: null,
    lastResolvedAt: null,
    lastAuditAt: null,
    lastError: null,
    counters: {
      generated: 0,
      resolved: 0,
      rejected: 0,
      expired: 0
    }
  }
}
```

Unterstuetzte Version:

- `schemaVersion: 1`

Unterstuetzte Modi:

- `no-write`
- `dry-run`
- `active`

Default dieser Phase:

- `mode: 'no-write'`

`active` ist nur als spaeterer Modus definiert. Er wird in dieser Phase nicht aktiviert.

## Was implementiert wurde

- Erzeugung eines leeren V2 Save-Shapes.
- Defensive Dry-Run-Auswertung eines vorhandenen `state.eventV2`.
- Dry-Run-Vorschlag fuer States ohne `eventV2`, ohne den State zu mutieren.
- Validierung von:
  - `schemaVersion`
  - `mode`
  - `openEvents[]`
  - `history[]`
  - `meta`
- Defensive Ablehnung unbekannter Versionen.
- Defensive Ablehnung ungueltiger Modi.
- Validierung gueltiger Open-Event- und History-Beispiele.
- Strukturierte Result-Objekte mit:
  - `ok`
  - `mode`
  - `wouldInitialize`
  - `wouldNormalize`
  - `wouldWrite: false`
  - `shape`
  - `warnings`
  - `errors`
  - `diagnostics`
- Harte No-Write-Diagnostics:
  - `stateMutations: 0`
  - `saveWrites: 0`
  - `localStorageWrites: 0`
  - `indexedDbWrites: 0`

## Was ausdruecklich nicht implementiert wurde

- Keine produktive Speicherung von `state.eventV2`.
- Keine Migration alter Saves.
- Keine Initialisierung in `storage.js`.
- Keine Runtime-Aktivierung.
- Keine Event-Center-Aktivierung.
- Keine V1-Ersetzung.
- Keine echte Speicherung von V2 Open Events.
- Keine echte Speicherung von V2 History.
- Keine Apply-Write-Verbindung zum Resolve Apply Contract.
- Keine Coins-/XP-/Daily-/Retention-/Push-/Monetarisierungswirkungen.

## Testbefehle

- `node --check src/events/v2/preview/EventV2SaveShapePreview.js`
- `node --check dev/run-event-v2-save-shape-dry-run-smoke.js`
- `node dev/run-event-v2-save-shape-dry-run-smoke.js`
- `node dev/run-event-v2-resolve-apply-contract-smoke.js`
- `node dev/run-event-v2-final-catalog-audit.js`

## Testergebnisse

- `node --check src/events/v2/preview/EventV2SaveShapePreview.js`
  - Ergebnis: bestanden.
- `node --check dev/run-event-v2-save-shape-dry-run-smoke.js`
  - Ergebnis: bestanden.
- `node dev/run-event-v2-save-shape-dry-run-smoke.js`
  - Ergebnis: bestanden.
  - Leerer State crasht nicht.
  - Fehlendes `eventV2` erzeugt nur Dry-Run-Vorschlag.
  - Gueltiges `eventV2` wird akzeptiert.
  - Ungueltige `schemaVersion` wird erkannt.
  - Ungueltiger `mode` wird abgelehnt.
  - Ungueltiges `openEvents[]` Objekt wird erkannt.
  - Ungueltiges `history[]` Objekt wird erkannt.
  - Gueltiger Open-Event-Eintrag wird akzeptiert.
  - Gueltiger History-Eintrag wird akzeptiert.
  - Original-State wird nicht mutiert.
  - `saveWrites: 0`.
- `node dev/run-event-v2-resolve-apply-contract-smoke.js`
  - Ergebnis: bestanden.
  - Resolve Apply Contract bleibt no-write.
  - `stateMutations: 0`, `saveWrites: 0`.
- `node dev/run-event-v2-final-catalog-audit.js`
  - Ergebnis: bestanden.
  - 22 Events, 2 Chains, 9 Learning-Cards.
  - 0 Duplicate IDs, 0 fehlende i18n Keys, 0 fehlende Assets, 0 ungueltige Referenzen, 0 ungueltige Pflichtfelder.

## Restrisiken

- Das Save-Shape ist noch kein echter Save/Load-Roundtrip.
- `active` ist dokumentiert, aber bewusst nicht aktiviert.
- `previewPayload` muss vor produktivem Einsatz eng begrenzt werden, damit Saves nicht aufblaehen.
- Eine spaetere Migration braucht eigene Tests fuer alte Saves ohne `eventV2`.
- V1/V2-Write-Gate ist weiterhin Voraussetzung fuer jeden produktiven Write-Pfad.

## Naechste empfohlene Mini-Phase

1. Dev-only Save/Load-Roundtrip-Harness fuer ein einzelnes `eventV2` Beispiel ohne produktive Integration.
2. V1/V2-Write-Gate-Kontrakt definieren: genau eine schreibende Event-Autoritaet.
3. Danach erst einen expliziten dev-only Write-Experimentpfad fuer `indoor_dry_rootball` planen.

