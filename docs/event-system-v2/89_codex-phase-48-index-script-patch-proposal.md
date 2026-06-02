# Phase 48: Index Script Patch Proposal

## Status

Dieser Patch ist nur ein Vorschlag. Er wurde nicht angewendet.

## Zielbereich

Datei:

- `index.html`

Bereich:

- `coreScriptList`
- direkt vor `{ src: 'app.js' }`

## Aktueller Ausschnitt

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
+      { src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js' },
       { src: 'app.js' }
```

## Warum direkt vor `app.js`

Der Bundle Candidate muss vor `app.js` verfuegbar sein, falls spaeter ein defensiver App-Hook nur auf `window.ShadowBridgeGuardedEntry` prueft.

Wichtig:

- Das Script selbst registriert weiterhin nichts automatisch.
- Selbst mit Script-Tag entsteht noch keine Eventaktivierung.
- Ohne spaeteren expliziten Hook bleibt die App unveraendert.

## PWA-/Shell-Risiko

Risiko: `medium`

Gruende:

- `index.html` ist App-Shell-relevant.
- lokale Scripts werden mit `?v=<buildId>` versioniert.
- ein fehlendes Script wuerde den Boot-Error-Banner ausloesen.
- installierte PWAs koennen alte Shells halten.
- ein Rollback braucht Entfernen der Script-Zeile und Shell-Aktualisierung.

## Braucht `sw.js` eine Aenderung?

Nein fuer diesen geplanten Eintrag.

Der Service Worker cached die Shell und nutzt Runtime-Cache fuer weitere GET-Requests. Ein neuer versionierter Scriptpfad kann ueber den bestehenden Runtime-Cache laufen. Trotzdem muss vor Umsetzung manuell geprueft werden:

- first load
- reload
- PWA/Shell-Update
- fehlender Scriptpfad/Boot-Error-Verhalten

## Rollback

Falls ein spaeterer Script-Tag Probleme macht:

1. Script-Zeile entfernen.
2. Build-ID/Shell aktualisieren.
3. Bundle Candidate Tests laufen lassen.
4. Comparison Smoke laufen lassen.
5. Combined Report laufen lassen.
6. Guarded Entry Contract Tests laufen lassen.
7. PWA Reload/Update manuell pruefen.

## Entscheidung Phase 48

- `no_go_for_index_html_change_now`
- `go_for_phase_49_readiness_review`

