# Phase 49: Index Patch Preflight Checklist

## Ziel

Diese Checkliste beschreibt, was nach einem spaeteren Phase-50-`index.html`-Patch geprueft werden muss.

## Geplanter Patch

Nur in Phase 50 anwenden, falls freigegeben:

```diff
       { src: 'src/monetization/googleAdPlacementRewardProvider.js' },
       { src: 'src/monetization/coinPackCatalog.js' },
       { src: 'src/monetization/purchaseServiceAdapter.js' },
+      { src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js' },
       { src: 'app.js' }
```

## Preflight vor Patch

- Bundle Candidate Tests gruen
- Comparison Smoke gruen
- Combined Report gruen
- Guarded Entry Contract Tests gruen
- Syntaxcheck gruen
- `index.html`-Patch ist exakt eine Zeile
- kein `app.js`
- kein `sw.js`
- kein `package.json`
- Rollback bekannt

## Post-Patch Browser Checks

Nach einem spaeteren `index.html`-Patch:

- First Load im Browser
- Reload
- Hard Reload
- PWA / installierte App, falls testbar
- Boot-Error-Banner bleibt aus
- Candidate-Datei wird mit `?v=<buildId>` geladen
- App startet weiterhin
- Combined Report bleibt gruen
- Bundle Candidate Tests bleiben gruen
- kein `window.ShadowBridgeGuardedEntry`, falls Candidate nicht explizit registriert
- kein Event-V2-Hook aktiv
- kein Save
- keine UI
- Legacy laeuft normal

## PWA-/Shell-Check

Zu beachten:

- `index.html` ist Shell-relevant.
- installierte PWAs koennen alte Shells halten.
- Scriptpfade sind build-id-versioniert.
- fehlender Scriptpfad triggert Boot-Error-Banner.
- `sw.js` muss fuer diesen Script-Tag nicht geaendert werden.

## Rollback

Falls der Script-Tag Probleme macht:

1. Script-Zeile entfernen.
2. Build-ID/Shell aktualisieren.
3. Bundle Candidate Tests erneut ausfuehren.
4. Comparison Smoke erneut ausfuehren.
5. Combined Report erneut ausfuehren.
6. Guarded Entry Contract Tests erneut ausfuehren.
7. Browser First Load/Reload erneut pruefen.

