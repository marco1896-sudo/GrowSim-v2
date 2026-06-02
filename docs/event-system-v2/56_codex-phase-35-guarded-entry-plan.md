# 56 - Codex Phase 35 Guarded Entry Plan

## 1. Ziel
Ein spaeterer Guarded Entry soll nur beweisen, dass V2 einen read-only Diagnostic Snapshot erzeugen koennte, ohne die Runtime zu beeinflussen.

Phase 35 baut diesen Entry noch nicht in die Runtime ein.

## 2. Default Disabled / No-Op
Default:
- disabled.
- no-op.
- kein Tick-Hook.
- keine automatische Ausfuehrung.
- kein Feature-Flag-Switching.

Wenn der Entry nicht explizit erlaubt ist:
- sofort No-Op-Result zurueckgeben.
- Legacy unveraendert weiterlaufen lassen.

## 3. Legacy bleibt authoritative
Legacy bleibt verantwortlich fuer:
- Event-Tick.
- Event-Aktivierung.
- Event-Choices.
- Event-UI-Model.
- Save-/Persistence-Verhalten.

V2 darf nur diagnostizieren.

## 4. V2 Output
V2 darf hoechstens erzeugen:
- einen Guarded Read-only Snapshot.
- strukturierte Diagnostics.
- ein No-Op-Ergebnis.

V2 darf nicht erzeugen:
- aktive Events.
- UI-Anzeigen.
- Save-Payloads.
- Feature-Flag-Aenderungen.
- Routing-Entscheidungen fuer Live-Spiel.

## 5. Keine UI
Der spaetere Entry darf:
- keine DOM-API nutzen.
- keine Modal-/Navigation-Funktion aufrufen.
- keine bestehende Event-UI ersetzen.
- keine UI-Lab-Komponenten in die App bringen.

## 6. Kein Save
Der spaetere Entry darf:
- kein `localStorage` schreiben.
- keinen Save-Adapter aufrufen.
- keine Migration anstossen.
- keinen Shadow Runtime Payload persistieren.

## 7. Keine Eventaktivierung
Der spaetere Entry darf:
- `activateEvent` nicht aufrufen.
- `routeChoice` nicht beeinflussen.
- `state.events` nicht schreiben.
- keine aktive Event-ID setzen.
- keine Scheduler-Daten veraendern.

## 8. Kein Feature-Flag-Switching
Der spaetere Entry darf:
- keine Feature-Flags setzen.
- keine Modes umschalten.
- keinen versteckten Shadow-/New-Mode aktivieren.

## 9. Erwartetes Rueckgabeobjekt
Spaeteres Return-Objekt:

```js
{
  ok: true,
  safeToProceed: true,
  mode: 'guarded_read_only_noop',
  runtimeTouched: false,
  saveTouched: false,
  uiReplaced: false,
  featureFlagsTouched: false,
  legacyEventsTouched: false,
  eventActivated: false,
  legacyAuthoritative: true,
  noop: true,
  snapshot: null,
  diagnostics: [],
  abortReason: null
}
```

Wenn etwas verletzt wird:

```js
{
  ok: false,
  safeToProceed: false,
  mode: 'guarded_read_only_noop',
  runtimeTouched: false,
  saveTouched: false,
  uiReplaced: false,
  featureFlagsTouched: false,
  legacyEventsTouched: false,
  eventActivated: false,
  legacyAuthoritative: true,
  noop: true,
  snapshot: null,
  diagnostics: [],
  abortReason: 'guarded_entry_aborted'
}
```

## 10. Sicherheitsflags
Pflichtflags:
- `runtimeTouched`
- `saveTouched`
- `uiReplaced`
- `featureFlagsTouched`
- `legacyEventsTouched`
- `eventActivated`
- `legacyAuthoritative`
- `noop`
- `safeToProceed`

Alle Schutzflags muessen false bleiben.
`legacyAuthoritative` und `noop` muessen true bleiben.

## 11. Input-Regeln
Erlaubt:
- `nowMs`
- sanitizte Kontextkopie
- Guard-Optionen

Verboten:
- Live-State-Referenz behalten.
- Funktionen uebernehmen.
- DOM-Objekte uebernehmen.
- Storage-Objekte uebernehmen.
- Runtime-Callbacks uebernehmen.

## 12. Abort-Regeln
Abort bei:
- Combined Report nicht gruen.
- Snapshot nicht gruen.
- No-Op fehlt.
- Legacy Authority fehlt.
- Guardrail true.
- Diagnostic `blocker/error/warning > 0`.
- Exception.
- Importgrenze verletzt.

## 13. Phase-36 Mindestumfang
Wenn Phase 36 implementiert:
- genau ein minimaler No-Op Entry.
- keine UI.
- kein Save.
- keine Eventaktivierung.
- kein Feature-Flag.
- kein `src/events/*.js`.
- `app.js` nur mit ausdruecklicher Phase-36-Freigabe.
