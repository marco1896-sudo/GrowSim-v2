# Phase 51: Browser Shell Smoke

## Ziel

Nach dem ersten passiven Bundle-Candidate-Script-Tag wurde die App-Shell ueber einen lokalen Dev-Server geprueft.

Getestet wurde ueber:

```text
http://127.0.0.1:5173/
```

## Server

Der lokale Dev-Server wurde manuell fuer die Pruefung gestartet:

```bash
node scripts/dev-server.js
```

Der Server lieferte `index.html` mit dem Candidate-Eintrag aus.

## Browser-Smoke-Ergebnis

Geprueft mit einem lokalen Browser-Smoke ueber Playwright:

- First Load: pass
- Reload: pass
- Hard Reload mit deaktiviertem Cache: pass
- Seitentitel: `Grow-Simulator`
- URL: `http://127.0.0.1:5173/`
- Boot-Error-Banner sichtbar: false
- App-Body sichtbar: true
- Page Errors: 0
- Console Errors: 0

## Candidate-Load

Der Candidate wurde im Browser geladen.

Versionierte Requests:

```text
http://127.0.0.1:5173/src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js?v=20260426-115352
```

Der Request trat bei First Load, Reload und Hard Reload mit deaktiviertem Cache auf.

## Passive Global-Pruefung

Geprueft:

```js
Boolean(window.ShadowBridgeGuardedEntry)
```

Ergebnis:

- First Load: false
- Reload: false
- erneute Voll-Ladung: false

Damit registriert der Candidate beim Laden weiterhin keinen Global automatisch.

## UI-/Hook-Pruefung

Geprueft:

- kein sichtbarer Shadow-Bridge-/Event-V2-UI-Einstieg
- kein Event-V2-Hook-Hinweis
- kein Boot-Error-Banner
- keine Page Errors
- keine Console Errors

Ergebnis:

```text
pass
```

## Save-/Storage-Pruefung

Mit Test-Instrumentierung wurden Storage-Schreiboperationen waehrend des First Loads gezaehlt.

Ergebnis:

- storageWriteCount: 0
- `window.ShadowBridgeGuardedEntry`: false

Damit wurde im Smoke kein Save-/Storage-Schreiben beobachtet.

## Hinweis zu Warnungen

Der Browserlauf zeigte vorhandene i18n-Warnungen im normalen App-Startpfad. Diese sind nicht neu durch den Bundle-Candidate verursacht und waren keine Console Errors.

## Ergebnis

Browser Shell Smoke Status:

```text
pass
```

Der erste passive Script-Tag ist browserseitig ladefaehig und bleibt ohne automatische Registrierung wirkungslos.
