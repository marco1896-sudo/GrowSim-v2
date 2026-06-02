# Eventsystem V2 - Event Center Mobile QA Pass

## Ziel der QA

Diese Phase validiert den ersten echten V2-Live-Pfad im mobilen Browser, ohne den Scope zu erweitern:

- Event: `indoor_dry_rootball`
- Option: `stabilize`

Fokus ist Stabilitaet, Verstaendlichkeit und Reload-Sicherheit im Event Center.

## Getestetes Event

- `indoor_dry_rootball`

## Getestete Option

- `stabilize` (mit echtem minimalem ApplyDelta-In-Memory-Pilot)

Nicht freigegeben fuer produktive Mutation in dieser Phase:

- `inspect`
- `overreact`

## Getestete Viewports

- `360 x 740`
- `390 x 844`
- `430 x 932`

## Beobachtetes UI-Verhalten

- Event Center oeffnet stabil.
- Pilot-Event wird korrekt angezeigt.
- Titel und Beschreibung sind lesbar.
- Optionen sind sichtbar und klickbar.
- Keine rohen i18n-Keys im Pilotpfad sichtbar.
- Keine kaputten Buttons im getesteten Flow.

## Resolve-Verhalten

Bei `stabilize`:

- Resolve laeuft ueber den V2-Bridge-Pfad.
- `eventV2.openEvents` wird geleert.
- `eventV2.history` bekommt genau einen geloesten Eintrag.
- `applyPreview` bleibt erhalten.
- `appliedDelta` wird mit Delta-Metadaten geschrieben.
- V1 schreibt nicht parallel.

## Reload-Verhalten

Nach Reload:

- `eventV2.openEvents` bleibt leer.
- `eventV2.history` bleibt erhalten.
- Kein doppelter History-Eintrag.
- Kein doppeltes Apply des Deltas.

Hinweis: Zwischen Resolve und Reload kann es durch normale Tick-Drift zu minimalen Float-Abweichungen in Statuswerten kommen; diese sind kein Double-Apply.

## Statusdelta-Verhalten

Im Pilotpfad ist der Effekt kontrolliert und klein:

- erwartete Richtung: `stress` sinkt, `risk` sinkt
- Werte bleiben im erlaubten Bereich
- keine Nebenwirkung auf Coins/XP/Retention/Daily/Missions

## Gefundene Probleme

- In Headless-Mobile-Smokes wurden Console-Errors aus dem Service-Worker-Registerpfad gesehen, wenn Service Worker im Test absichtlich geblockt sind:
  - `[sw-update] register failed ... reading 'update'`

## Behobene Probleme

- Mobile-QA-Smoke seedet den Test-State jetzt nur initial, nicht erneut beim Reload.
- Reload-Pruefung wurde robust gegen minimale Tick-Drift gemacht.
- Console-Error-Auswertung trennt bekannte SW-Test-Noise von kritischen Pilotpfad-Fehlern.

## Bewusst nicht getestete Bereiche

- Kein weiterer V2-Eventpfad
- Keine weitere Option mit produktiver Mutation
- Kein Event-Center-Redesign
- Keine Daily-/Retention-/Mission-/Push-/Monetarisierungslogik
- Kein V1-Delete

## Empfehlung fuer naechste Phase

Eine kleine, ebenso eng begrenzte QA/Telemetry-Mini-Phase fuer denselben Pilotpfad im echten In-App-Manual-Run mit kurzer Checkliste (inkl. one-tap resolve und Reload auf realem Device).
