# Phase 44: Script-List Patch Proposal

## Status

Dieser Patch ist nur ein Vorschlag. Er wurde nicht angewendet.

## Zielbereich

Datei:

- `index.html`

Bereich:

- `coreScriptList`
- direkt vor `{ src: 'app.js' }`

Aktueller Ausschnitt:

```js
      { src: 'src/monetization/googleAdPlacementRewardProvider.js' },
      { src: 'src/monetization/coinPackCatalog.js' },
      { src: 'src/monetization/purchaseServiceAdapter.js' },
      { src: 'app.js' }
```

## Spaeterer Patch-Vorschlag

Noch nicht anwenden:

```diff
       { src: 'src/monetization/googleAdPlacementRewardProvider.js' },
       { src: 'src/monetization/coinPackCatalog.js' },
       { src: 'src/monetization/purchaseServiceAdapter.js' },
+      { src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js' },
       { src: 'app.js' }
```

## Warum diese Position?

Der Candidate muesste vor `app.js` geladen werden, weil ein spaeterer `app.js`-Hook nur einen defensiven `window.ShadowBridgeGuardedEntry`-Lookup machen duerfte.

Nach `app.js` waere zu spaet fuer einen App-Start-nahen No-Op-Hook.

## Warum noch nicht anwenden?

Der Candidate allein reicht nicht. Er ist nur die Registration-Layer-Datei und erwartet explizit:

```js
{
  runShadowBridgeGuardedEntry,
  metadata
}
```

Es fehlt noch eine browser-kompatible Quelle fuer `runShadowBridgeGuardedEntry`.

## Braucht es zusaetzlich ein Browser-Runner-Script?

Ja, sehr wahrscheinlich.

Empfohlen fuer Phase 45:

- `ShadowBridgeBrowserGuardedEntryCandidate.js`

Diese Datei sollte:

- browser-kompatibel sein
- kein `require` nutzen
- keinen ESM-Import nutzen
- default-off/no-op bleiben
- keine Runtime lesen
- keine Runtime schreiben
- keine Events aktivieren
- keine UI ersetzen

## Rollback

Wenn ein spaeterer Script-Tag gesetzt und wieder entfernt werden muss:

1. Script-Zeile aus `coreScriptList` entfernen.
2. Shell/Build-ID aktualisieren.
3. Browser Exposure Candidate Tests laufen lassen.
4. Combined Report laufen lassen.
5. PWA Reload/Update manuell pruefen.

## Phase-44 Entscheidung

Script-List-Patch:

- `no_go_for_implementation_now`
- `go_for_phase_45_dependency_candidate`

