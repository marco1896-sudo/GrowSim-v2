# Phase 43: Loading Candidate Review

## Gelesene Basis

- `docs/event-system-v2/70_codex-phase-42-browser-exposure-manual-smoke.md`
- `docs/event-system-v2/71_codex-phase-42-loading-readiness-review.md`
- `docs/event-system-v2/72_codex-phase-42-result.md`
- `docs/event-system-v2/66_codex-phase-40-script-loading-strategy.md`
- `docs/event-system-v2/47_codex-phase-29-shadow-bridge-guardrails.md`

## Aktueller Status

Der Candidate ist isoliert vorhanden:

- kein `index.html`-Eintrag
- kein `app.js`-Hook
- kein `sw.js`
- keine Service-Worker-/PWA-Cache-Aenderung
- keine Runtime-Anbindung
- keine Eventaktivierung
- kein Save
- keine UI-Ersetzung

## Ist ein spaeterer Script-Tag moeglich?

Bewertung: `go_for_loading_plan_only`

Ein spaeterer Script-Tag ist technisch denkbar, aber noch nicht freigegeben. Vorher braucht es Phase 44:

- exakter Script-List-Patch als Vorschlag
- Reihenfolge vor `app.js` pruefen
- Dependency-Uebergabe klaeren
- PWA-/Shell-Cache-Risiko final bewerten
- Rollback-Schritt konkretisieren

## Welche Datei waere Candidate?

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js`

Wichtig: Der Candidate setzt beim Laden nicht automatisch `window.ShadowBridgeGuardedEntry`. Eine spaetere Ladeschicht muss `registerShadowBridgeBrowserExposureCandidate(...)` bewusst aufrufen und Dependencies explizit uebergeben.

## Warum kein `index.html` geaendert wurde

Ein Eintrag in `coreScriptList` waere bereits ein produktiver Ladepfad. Da `index.html` die App-Shell darstellt und Scripts versioniert laedt, muss diese Aenderung separat geplant und freigegeben werden.

## Warum kein `app.js` geaendert wurde

Phase 43 klaert nur den Script-Candidate. Ein `app.js`-Hook waere Runtime-nahe und bleibt bis zu einer separaten Freigabe tabu.

## Spaetere Dependency-Uebergabe

Der Candidate akzeptiert nur explizite Dependencies:

- `runShadowBridgeGuardedEntry`
- optional `metadata`

Dadurch muss ein spaeterer Browserpfad klar definieren:

- wer den Runner bereitstellt
- wann die Registrierung passiert
- ob der Runner schon vor `app.js` verfuegbar ist
- wie No-Op und Legacy Authority nachweisbar bleiben

## PWA-/Cache-Risiken

Ein spaeterer produktiver Script-Tag kann folgende Risiken erzeugen:

- alte installierte PWA-Shells laden den neuen Scriptpfad nicht sofort.
- fehlender Scriptpfad erzeugt Boot-Error-Banner.
- Reihenfolgefehler fuehren zu fehlenden Dependencies.
- Build-ID-Versionierung muss korrekt greifen.
- Rollback muss die Script-Zeile wieder entfernen.

Keine Service-Worker-Aenderung wurde in Phase 43 vorgenommen.

## Go/No-Go fuer Phase 44

Go:

- `Browser Exposure Candidate Loading Plan`
- nur Plan
- kein produktiver Script-Tag
- kein `app.js`
- kein `sw.js`
- keine Runtime-Anbindung

No-Go:

- `index.html` wirklich aendern
- Script automatisch laden
- Runtime-Hook setzen
- Event aktivieren
- Save oder UI beruehren

## Empfehlung fuer Phase 44

Empfohlen:

`Phase 44: Browser Exposure Candidate Loading Plan`

Ziel: exakten Script-List-Patch planen, PWA-/Shell-Risiko final bewerten und weiterhin keinen produktiven Ladepfad setzen.

