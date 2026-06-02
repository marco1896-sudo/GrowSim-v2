# Eventsystem V2 - Versioned Save Shape Mini-Phase

## Ziel dieser Mini-Phase

Diese Mini-Phase definiert ein zukuenftiges, versioniertes Save-Shape fuer V2 Open Events und V2 History.

Der Fokus liegt ausschliesslich auf Dry-Run/No-Write:

- keine produktive Speicherung
- keine Save-Migration
- kein Cutover
- keine Aenderung an V1
- keine UI-Anpassung

Das Ergebnis soll klar machen, **was V2 spaeter speichern darf**, wie diese Daten versioniert werden und wie fehlerhafte Shapes vor echten Writes defensiv erkannt werden.

## Warum Save-Shape der naechste Blocker ist

Der V2-Abschluss steht bei dev-only, preview-stabil und no-write. Der Resolve Apply Contract fuer `indoor_dry_rootball` kann bereits nachvollziehbare Apply Preview Results erzeugen.

Der naechste Blocker ist Persistenz:

- offene V2 Events brauchen eine stabile Queue-Struktur
- geloeste V2 Events brauchen eine versionierte History-Struktur
- alte Saves duerfen nicht brechen
- unbekannte Versionen muessen kontrolliert abgelehnt werden
- V1 und V2 duerfen nicht gegeneinander schreiben

Ohne klares Save-Shape waere jeder spaetere Write-Pfad zu riskant.

## Geplante Struktur von `state.eventV2`

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

`schemaVersion` startet bei `1`. Hoehere oder unbekannte Versionen werden in dieser Phase defensiv als nicht schreibbereit markiert.

## Struktur von `openEvents`

Ein Eintrag in `eventV2.openEvents[]` darf mindestens enthalten:

- `eventId`
- `instanceId`
- `eventVersion` oder `catalogVersion`
- `createdAt`
- `stage`
- `category`
- `severity`
- `source`
- `options`
- `selectedOption` optional
- `status`
- `previewPayload` optional
- `expiresAt` optional
- `chainId` optional
- `followUpOf` optional

Erlaubte Statuswerte fuer dieses Shape:

- `preview`
- `queued`
- `active`
- `resolving`
- `expired`
- `cancelled`

In dieser Mini-Phase wird kein Open Event gespeichert. Die Struktur wird nur validiert und als Dry-Run-Shape vorgeschlagen.

## Struktur von `history`

Ein Eintrag in `eventV2.history[]` darf mindestens enthalten:

- `eventId`
- `instanceId`
- `resolvedAt`
- `selectedOption`
- `result`
- `applyPreview`
- `writeMode`
- `schemaVersion`
- `source`

`writeMode` bleibt in dieser Phase `no-write` oder `dry-run`. `active` darf dokumentiert sein, ist aber noch nicht schreibbereit.

## Modi

Erlaubte Modi:

- `no-write`
- `dry-run`
- `active`

Default fuer diese Phase:

- `mode: 'no-write'`

Bedeutung:

- `no-write`: V2 erzeugt keine produktiven Save-Daten.
- `dry-run`: V2 darf ein Save-Shape berechnen und validieren, aber nicht schreiben.
- `active`: spaeterer produktiver Modus, in dieser Phase nicht aktiviert.

## Erlaubte Felder

Erlaubt sind nur Felder, die fuer Event-Identitaet, Anzeige, Resolve-Nachvollziehbarkeit, Versionierung und spaetere Migration benoetigt werden:

- Event-IDs und Instanz-IDs
- Event-/Catalog-Version
- Zeitpunkte als String, Zahl oder kontrollierter Sim-Time-Wert
- Stage, Category, Severity
- Source und Status
- Options-Liste ohne produktive Aktionen
- Resolve-Auswahl
- Apply Preview, nicht Apply Write
- Meta-Diagnostics und Zaehler

## Verbotene Felder

In dieser Phase verboten:

- echte Save Writes
- automatische Migration
- Coins
- XP
- Daily Rewards
- Retention
- Push
- Monetarisierung
- direkte V1-Eventersetzung
- produktive Runtime-Queues ausserhalb von `eventV2`
- irreversible State-Aenderungen
- beliebige Funktionsreferenzen oder UI-Objekte im Save-Shape

## Umgang mit unbekannten Versionen

Regel:

- `schemaVersion: 1` ist unterstuetzt.
- fehlende Versionen werden im Dry-Run als Normalisierungsvorschlag behandelt.
- nicht numerische Versionen werden abgelehnt.
- Versionen groesser als die unterstuetzte Version werden defensiv abgelehnt.
- unbekannte Versionen fuehren zu `ok: false`, aber nicht zu einem Crash.

Ein spaeterer Migrationspfad darf unbekannte Versionen nicht blind ueberschreiben.

## Migrationserwartung

Diese Mini-Phase implementiert keine Migration.

Spaeter muss gelten:

- alte Saves ohne `eventV2` erhalten defensive Defaults.
- bestehende V1-Strukturen bleiben unveraendert.
- V2-Initialisierung muss idempotent sein.
- V2 darf erst schreiben, wenn ein explizites Write-Gate aktiv ist.
- jede Schema-Erhoehung braucht einen eigenen Migrationstest.

## Risiken

- Ein zu frueher `active` Modus koennte V1/V2 parallel schreiben lassen.
- Eine unklare History-Struktur wuerde Resolve-Ergebnisse schwer migrierbar machen.
- Zu breite `previewPayload` Daten koennten spaeter Savegames aufblaehen.
- Unbekannte Versionen duerfen nicht automatisch downgraded werden.
- Dry-Run-Ergebnisse duerfen nicht als echte Persistenz missverstanden werden.

## Spaetere Write-Readiness-Kriterien

Ein echter V2 Save Write darf erst geplant werden, wenn:

- `state.eventV2` in Save/Load Smokes stabil initialisiert wird.
- `openEvents` und `history` mit realistischen Beispielen roundtrip-faehig sind.
- unbekannte Versionen kontrolliert blocken.
- V1/V2-Write-Gate genau eine schreibende Autoritaet garantiert.
- Resolve Apply Contract und Save-Shape gemeinsam getestet sind.
- alte Saves ohne `eventV2` weiterhin laden.
- produktive UI-Flows keine rohen V2-Daten erzwingen.

