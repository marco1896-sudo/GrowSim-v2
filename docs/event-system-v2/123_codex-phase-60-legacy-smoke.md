# Phase 60: Legacy Smoke

## Ziel

Der Legacy-Smoke prueft, ob die App-Shell mit dem neuen No-Op-Hook weiter stabil laedt und keine sichtbaren oder persistierenden Seiteneffekte entstehen.

## Dev-Smoke

Erstellt:

```bash
dev/run-event-v2-hook-legacy-smoke.js
```

Der Smoke startet einen lokalen Server auf `http://127.0.0.1:5173/`, laedt die App im Browser und prueft:

- First Load
- Reload
- Hard Reload
- Boot-Error-Banner
- Page Errors
- Console Errors
- Candidate-Load
- Candidate-Versionierung
- Storage-Writes
- UI-Schutz
- Eventaktivierungs-Schutz

## Ergebnis

Ausgefuehrt:

```bash
node dev/run-event-v2-hook-legacy-smoke.js
```

Ergebnis:

```text
ok=true
candidateLoaded=true
candidateVersioned=true
pageErrors=0
consoleErrors=0
noStorageWrites=true
noSave=true
noUiReplacement=true
noEventActivation=true
```

## First Load

Ergebnis:

- App-Titel: `Grow-Simulator`
- Body hat Inhalt: ja
- Boot-Error-Banner: false
- Candidate API sichtbar: ja
- `window.ShadowBridgeGuardedEntry`: false
- `runEventStateMachine` sichtbar: ja
- Storage Writes: 0
- Runtime touched: false
- Save touched: false
- UI replaced: false
- Event activated: false

## Reload

Ergebnis:

- Boot-Error-Banner: false
- Candidate API sichtbar: ja
- `window.ShadowBridgeGuardedEntry`: false
- Storage Writes: 0
- Runtime touched: false
- Save touched: false
- UI replaced: false
- Event activated: false

## Hard Reload

Ergebnis:

- Boot-Error-Banner: false
- Candidate API sichtbar: ja
- `window.ShadowBridgeGuardedEntry`: false
- Storage Writes: 0
- Runtime touched: false
- Save touched: false
- UI replaced: false
- Event activated: false

## Event-State-Machine-Pfad

Der Event-State-Machine-Pfad wurde in Phase 60 nicht kuenstlich ausgeloest.

Grund:

- Ein direkter Aufruf von `runEventStateMachine(nowMs)` wuerde den bestehenden Legacy-Pfad mit `state` beruehren.
- Eine Monkeypatch-/Stub-Loesung waere fuer Phase 60 zu improvisiert und koennte die Aussage ueber Legacy-Stabilitaet verfaelschen.
- Die sichere naechste Stufe ist ein gezielter Phase-61-Smoke, der den Pfad kontrolliert und isoliert ausloest.

Beobachtung:

- `runEventStateMachine` ist im Browser sichtbar.
- Beim reinen Shell-Start wurde der Pfad nicht automatisch ausgeloest.
- Deshalb blieb `window.ShadowBridgeGuardedEntry` absent.
- Das bestaetigt, dass beim Shell-Start keine automatische Registrierung durch den Hook entsteht.

## Legacy-Bewertung

Legacy laedt normal weiter:

- App startet
- Reload stabil
- Hard Reload stabil
- keine Page Errors
- keine Console Errors
- kein Save
- keine UI-Ersetzung
- keine Eventaktivierung

## Testplan fuer Phase 61

Phase 61 sollte einen gezielten Event-State-Machine-Hook-Trigger-Smoke bauen.

Bedingungen:

- kein Save
- keine UI
- keine Eventaktivierung
- kein echter Live-State an V2
- Legacy darf nicht blockiert werden
- Hook darf nur `runShadowBridgeGuardedEntry(null, { enabled:false })` erreichen
- Return-Wert bleibt ungenutzt
