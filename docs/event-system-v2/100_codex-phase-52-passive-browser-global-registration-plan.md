# Phase 52: Passive Browser Global Registration Plan

## Ziel

Phase 52 plant ausschliesslich, wie eine spaetere explizite Registrierung von `window.ShadowBridgeGuardedEntry` sicher aussehen duerfte.

Es wurde keine Registrierung ausgefuehrt und kein produktiver Hook gebaut.

## Ausgangslage

Aus Phase 51:

- Browser Shell Smoke: pass
- First Load: pass
- Reload: pass
- Hard Reload: pass
- Boot-Error-Banner: false
- Page Errors: 0
- Console Errors: 0
- Candidate wird versioniert geladen
- `window.ShadowBridgeGuardedEntry` wird nicht automatisch gesetzt
- kein `app.js`-Hook
- keine Runtime-Anbindung
- kein Save
- keine UI-Ersetzung
- keine Eventaktivierung

## Registration Boundary

Der Bundle Candidate stellt bereits eine explizite API bereit:

```js
registerShadowBridgeBrowserBridgeCandidate(targetWindow, options)
unregisterShadowBridgeBrowserBridgeCandidate(targetWindow)
```

Eine spaetere Registrierung darf nur an einer klar kontrollierten Boundary passieren:

1. Zunaechst nur in einem manuellen Browser-Smoke.
2. Spaeter optional in einem gesondert freigegebenen Registration-Step.
3. Noch nicht ueber `app.js`.
4. Niemals automatisch beim Script-Laden.

## Warum keine automatische Registrierung beim Laden

Automatische Registrierung beim Laden waere ein globaler Seiteneffekt der App-Shell.

Sie bleibt verboten, weil sie:

- beim reinen Script-Load bereits Runtime-Naehe erzeugt.
- Rollback erschwert, wenn installierte PWAs alte Shells halten.
- Debugging zwischen Laden und Aktivieren verwischt.
- nicht noetig ist, solange kein `app.js`-Hook existiert.
- die Phase-29-Guardrails unnoetig belastet.

## Erforderliche Optionen fuer spaetere Registrierung

Eine spaetere Registrierung darf nur explizit passieren mit:

```js
{
  enabled: true,
  allowGlobalRegistration: true
}
```

Default bleibt:

```js
{
  enabled: false,
  allowGlobalRegistration: false
}
```

Damit bleibt der Standard immer disabled/no-op.

## Fremde Globals schuetzen

Der Candidate darf `window.ShadowBridgeGuardedEntry` nicht ueberschreiben, wenn bereits ein fremder Global existiert.

Erlaubt ist Ueberschreiben nur mit:

```js
allowOverwrite: true
```

Dieser Fall darf erst nach einem eigenen Negativtest genutzt werden.

## Sichtbarer Global-Contract

Wenn spaeter explizit registriert wird, darf der sichtbare Global nur enthalten:

- `runShadowBridgeGuardedEntry`
- `metadata`
- `noop`
- `legacyAuthoritative`

Interne Ownership-Marker duerfen nicht enumerierbar sein.

## Unregister / Rollback

Rollback soll ueber:

```js
unregisterShadowBridgeBrowserBridgeCandidate(targetWindow)
```

passieren.

Der Unregister darf nur den eigenen Global entfernen. Fremde Globals duerfen nicht geloescht werden.

Falls spaeter ein Lade- oder Hook-Schritt hinzukommt, bleibt Rollback jeweils der kleinste einzelne Rueckbau:

- Registration-Smoke stoppen
- oder spaeter Script-/Hook-Zeile entfernen
- danach Safety-Tests erneut ausfuehren

## Empfohlene Strategie

Empfohlen fuer Phase 53:

```text
Manual Browser Global Registration Smoke
```

Grenzen:

- explizit registrieren
- sofort Global-Contract pruefen
- `runShadowBridgeGuardedEntry(null, { enabled: false })` pruefen
- unregister pruefen
- keine Runtime-Anbindung
- kein `app.js`
- kein Save
- keine UI
- keine Eventaktivierung
