# Phase 47: Browser Bridge Bundle Candidate

## Ziel

Phase 47 erstellt einen zusammengefuehrten browser-kompatiblen Bridge Candidate, der Guarded Entry Runner und Exposure Registration in einer isolierten Datei kapselt.

Es wurde kein produktiver Ladepfad geaendert.

## Neue Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidateTests.js`
- `dev/run-event-v2-browser-bridge-candidate-tests.js`
- `dev/run-event-v2-browser-bridge-candidate-comparison-smoke.js`

## Warum der Bundle Candidate erstellt wurde

Phase 46 hat gezeigt:

- Zwei Scripts funktionieren isoliert.
- Zwei Scripts erhoehen aber die Dependency- und Lade-Reihenfolge-Komplexitaet.
- Ein drittes Registration-Script waere wahrscheinlich noetig.

Der Bundle Candidate loest das in einer Datei:

- Guarded Entry Runner
- Exposure Registration
- Ownership/Unregister
- No-Op Defaults
- sichtbarer Global-Contract

## Keine automatische Registrierung

Der Candidate setzt beim Laden nicht automatisch:

- kein `window.ShadowBridgeGuardedEntry`
- kein anderer Runtime-Global
- kein DOM
- kein Save
- keine UI
- keine Eventaktivierung

Registrierung passiert nur ueber:

```js
registerShadowBridgeBrowserBridgeCandidate(targetWindow, options)
```

## API

```js
createShadowBridgeBrowserBridgeCandidate(options)
registerShadowBridgeBrowserBridgeCandidate(targetWindow, options)
unregisterShadowBridgeBrowserBridgeCandidate(targetWindow)
getAllowedGlobalKeys()
```

## Registrierter Global

Wenn explizit registriert wird, enthaelt der sichtbare Global nur:

- `runShadowBridgeGuardedEntry`
- `metadata`
- `noop`
- `legacyAuthoritative`

Der Ownership-Marker bleibt intern und nicht enumerierbar.

## Runner-Verhalten

Default:

- ok: true
- safeToProceed: true
- mode: `guarded_read_only_noop`
- snapshot: null
- noop: true
- legacyAuthoritative: true
- alle Schutzflags false

`enabled=true` ohne `allowSnapshot=true` blockt mit:

- `guarded_entry_snapshot_not_allowed`

`enabled=true` + `allowSnapshot=true` ohne Snapshot-Factory blockt mit:

- `browser_snapshot_dependency_missing`

Eine Snapshot-Factory darf nur explizit ueber Candidate- oder Run-Optionen uebergeben werden.

## Warum `index.html` nicht geaendert wurde

Phase 47 erstellt nur den Candidate. Ein `index.html`-Eintrag waere ein produktiver Ladepfad und bleibt einer spaeteren Plan-/Freigabephase vorbehalten.

## Warum `app.js` nicht geaendert wurde

Es gibt weiterhin keinen Runtime-Hook. Der Candidate wird nicht von der App verwendet.

## Warum `sw.js` nicht geaendert wurde

Es wurde kein produktiver Script-Tag gesetzt. Deshalb ist keine Service-Worker-/PWA-Cache-Aenderung erforderlich.

