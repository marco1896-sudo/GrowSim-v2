# Phase 46: Bundle Candidate Decision

## Entscheidung

Empfohlen wird ein zusammengefuehrter Browser Bridge Candidate:

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js`

Status:

- noch nicht erstellt in Phase 46
- empfohlen fuer Phase 47

## Warum ein Bundle-Candidate sicherer ist

Ein einzelner Candidate kann in einer isolierten Datei kapseln:

- Guarded Entry Runner
- Exposure Registration Contract
- No-Op Defaults
- Ownership/Unregister-Regeln
- explizite Registrierung ueber `targetWindow`

Damit entfallen:

- Cross-Script-Dependency-Handoff
- drittes Registration-Script
- fragile Reihenfolge zwischen Guarded Entry und Exposure Candidate
- mehrere Rollback-Zeilen in `coreScriptList`

## Bewertung Ein-Script-/Bundle-Variante

Vorteile:

- weniger Lade-Reihenfolge-Risiko
- weniger Dependency-Komplexitaet
- nur eine spaetere Script-Zeile
- leichterer Rollback
- gute Testbarkeit als einzelnes isoliertes Modul
- bessere Passung fuer spaeteren defensiven `app.js`-Lookup

Nachteile:

- groessere Einzeldatei
- Logik aus zwei Candidates muss sauber zusammengefuehrt werden
- Tests muessen sicherstellen, dass keine automatische Registrierung passiert

## Muss weiterhin gelten

Der Bundle-Candidate darf auch spaeter nicht:

- automatisch registrieren
- Live-State lesen
- Save beruehren
- UI beruehren
- Events aktivieren
- Feature-Flags veraendern
- DOM nutzen

Default bleibt:

- disabled
- no-op
- legacy authoritative

## Spaeterer Script-List-Patch nur als Vorschlag

Nicht anwenden:

```diff
       { src: 'src/monetization/googleAdPlacementRewardProvider.js' },
       { src: 'src/monetization/coinPackCatalog.js' },
       { src: 'src/monetization/purchaseServiceAdapter.js' },
+      { src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js' },
       { src: 'app.js' }
```

Position:

- direkt vor `app.js`

Grund:

- Ein spaeterer `app.js`-Hook duerfte nur defensiv auf `window.ShadowBridgeGuardedEntry` pruefen.
- Der Bridge Candidate muesste deshalb vor `app.js` geladen sein, wenn spaeter ueberhaupt geladen wird.

## PWA-/Shell-Risiko

Risiko: `medium`

Gruende:

- `index.html` ist Shell-relevant.
- lokale Scripts werden durch `?v=<buildId>` versioniert.
- fehlender Scriptpfad fuehrt zum bestehenden Boot-Error-Banner.
- installierte PWAs koennen alte Shell-Versionen halten.
- Rollback braucht erneute Shell-Aktualisierung.

`sw.js` muss fuer diese Planungsentscheidung nicht geaendert werden.

## Phase-47 Empfehlung

Empfohlen:

`Phase 47: Browser Bridge Bundle Candidate`

Weiterhin ohne:

- `index.html`
- `app.js`
- `sw.js`
- Runtime-Anbindung
- Eventaktivierung
- Save
- UI-Ersetzung

