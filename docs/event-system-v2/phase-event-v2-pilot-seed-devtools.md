# Eventsystem V2 – Dev-only Seed/Reset-Hilfe

## Ziel
Der bestehende V2-Pilotpfad für `indoor_dry_rootball` soll im lokalen Browser schneller und reproduzierbar testbar sein, ohne manuelles State-Basteln.

## Warum die Hilfe nötig ist
- Manuelles Vorbereiten von `eventV2.openEvents` war fehleranfällig.
- Mobile-/Reload-QA dauerte unnötig lange.
- Der Pilotpfad braucht eine wiederholbare Dev-Only-Einstiegshilfe.

## Dev-only Sicherheitsbedingung
Die Helfer werden nur registriert, wenn mindestens eine Bedingung erfüllt ist:
- `hostname === "localhost"` oder `hostname === "127.0.0.1"`
- Dev-Query ist aktiv (`devEventV2` oder `gs_event_v2_dev_preview`)
- expliziter Dev-Mode wurde gesetzt

Außerhalb dieser Bedingungen werden keine globalen Helfer registriert.

## Verfügbare Console-Funktionen
- `window.__seedEventV2PilotIndoorDryRootball(options)`
- `window.__resetEventV2Pilot(options)`
- `window.__getEventV2PilotState()`

## Seed-Verhalten
- Initialisiert `state.eventV2` defensiv, falls fehlend.
- Erstellt genau ein Open Event für `indoor_dry_rootball`.
- Nutzt die Pilot-Optionen `stabilize`, `inspect`, `overreact`.
- Setzt minimale Status-Floors für den Pilot (`stress`, `risk`), ohne Economy/Retention/Daily zu berühren.
- Löscht keine V1-Legacy-Felder.

## Reset-Verhalten
- Leert `eventV2.openEvents`.
- Kann optional `eventV2.history` leeren.
- Kann optional Pilot-Statuswerte zurücksetzen.
- V1-Legacy-Daten bleiben erhalten.

## Was ausdrücklich nicht gemacht wird
- Keine neue Gameplay-Aktivierung.
- Keine neuen produktiven Events/Optionen.
- Kein V1-Delete.
- Kein Storage-Umbau und keine harte Migration.

## Manuelle QA-Anleitung
1. App lokal mit Dev-Parametern öffnen.
2. In der Console `__seedEventV2PilotIndoorDryRootball()` aufrufen.
3. Event Center öffnen und `indoor_dry_rootball` prüfen.
4. `stabilize` auflösen und Reload testen.
5. Mit `__resetEventV2Pilot({ clearHistory: true })` Testzustand zurücksetzen.
