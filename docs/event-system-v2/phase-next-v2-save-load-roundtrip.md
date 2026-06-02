# Eventsystem V2 - Dev-only Save/Load Roundtrip Mini-Phase

## Ziel der Mini-Phase

Diese Mini-Phase fuehrt einen isolierten Dev-Harness fuer ein einzelnes `eventV2` Beispiel ein.

Der Harness zeigt:

- ein gueltiges `eventV2` Beispiel kann erzeugt werden
- das Beispiel ist JSON-serialisierbar
- das Beispiel ist wieder JSON-deserialisierbar
- das geladene Objekt bleibt Save-Shape-konform
- `openEvents` und `history` bleiben konsistent
- ungueltige Eingaben werden defensiv abgelehnt

Status bleibt:

- dev-only
- no-write
- kein produktiver Save-Pfad
- kein Cutover
- keine Migration
- V1 unveraendert

## Warum ein Roundtrip-Harness noetig ist

Nach Save-Shape-Definition und Dry-Run-Validierung ist der naechste Nachweis:

- die Struktur ist praktisch roundtrip-faehig
- Ladefaelle lassen sich ohne produktive Storage-Pfade pruefen
- Fehlerfaelle bleiben kontrolliert

Damit wird der Persistenzblocker weiter entschärft, ohne Runtime oder Speicherlogik des Spiels zu aktivieren.

## Was getestet wird

- Fixture-Erzeugung fuer `eventV2`
- Save-Shape-Validierung vor Serialisierung
- JSON-Serialisierung
- JSON-Deserialisierung
- Save-Shape-Validierung nach Deserialisierung
- Feldintegritaet:
  - `openEvents[0].eventId`
  - `openEvents[0].instanceId`
  - `history[0].eventId`
  - `history[0].instanceId`
  - `schemaVersion`
  - `mode`
- Defensivfaelle:
  - ungueltiges JSON
  - ungueltige `schemaVersion`
- No-Write-Grenzen:
  - kein produktiver Storage
  - keine State-Mutation

## Was ausdruecklich nicht getestet wird

- produktive Speicherung in `storage.js`
- produktiver Save/Load-Pfad der App
- Migration alter Saves
- Event-Center-Cutover
- V2-Aktivierung im Live-Spiel
- V1/V2-Umschaltung
- UI- oder Runtime-Integration

## Warum kein produktiver Save-Pfad genutzt wird

Diese Phase ist eine Sicherheitsphase.

Vor produktiven Writes muessen weiterhin getrennt geklaert werden:

- V1/V2-Write-Gate mit genau einer schreibenden Autoritaet
- alte Save-Kompatibilitaet mit realen Ladefaellen
- Migrationsstrategie pro Schema-Version

Der Harness bleibt daher strikt in Node und verwendet nur JSON in-memory.

## Fixture-Struktur

Der Harness nutzt ein einzelnes, stabiles Beispiel:

```js
eventV2 = {
  schemaVersion: 1,
  mode: 'dry-run',
  openEvents: [
    {
      eventId: 'indoor_dry_rootball',
      instanceId: 'evt_v2_test_indoor_dry_rootball_001',
      eventVersion: 1,
      createdAt: 1760000000000,
      stage: 'vegetative',
      category: 'care',
      severity: 'warning',
      source: 'dev-roundtrip-fixture',
      options: ['inspect', 'stabilize', 'overreact'],
      status: 'preview',
      previewPayload: { fixture: true, noWrite: true }
    }
  ],
  history: [
    {
      eventId: 'indoor_dry_rootball',
      instanceId: 'evt_v2_test_indoor_dry_rootball_001',
      resolvedAt: 1760000060000,
      selectedOption: 'stabilize',
      result: 'preview',
      applyPreview: {
        expectedQuality: 'good',
        mutationTargets: ['status.stress', 'status.risk'],
        persisted: false
      },
      writeMode: 'no-write',
      schemaVersion: 1,
      source: 'dev-roundtrip-fixture'
    }
  ],
  meta: {
    lastGeneratedAt: 1760000000000,
    lastResolvedAt: 1760000060000,
    lastAuditAt: 1760000120000,
    lastError: null,
    counters: { generated: 1, resolved: 1, rejected: 0, expired: 0 }
  }
}
```

Hinweis:

- `status` ist `preview`, weil das aktuelle Save-Shape `open` nicht als gueltigen Status fuehrt.

## Erwartete spaetere Write-Readiness

Vor einem echten Write-Pfad sollten mindestens erreicht sein:

- dev-only Roundtrip fuer mehrere realistische Eventbeispiele
- Save/Load-Randfaelle mit fehlenden Feldern und Legacy-Saves
- V1/V2-Write-Gate festgelegt und getestet
- explizite Entscheidung fuer `mode: active` nur hinter sicherem Gate

## Restrisiken

- Der Harness prueft nur ein Fixture-Beispiel.
- JSON-Roundtrip beweist noch keine Runtime-Integration.
- Unbekannte Felder werden aktuell nicht als harter Fehler geblockt.
- Produktive Persistenz bleibt weiterhin ungetestet und absichtlich deaktiviert.

