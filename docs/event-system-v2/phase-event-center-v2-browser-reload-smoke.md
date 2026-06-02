# Eventsystem V2 - Event Center Browser Reload Smoke

## Ziel der Phase

Diese Phase ergaenzt einen dauerhaften Browser-/Reload-Smoke fuer den ersten echten Event-Center-V2-Resolve-Pfad.

Der Smoke beweist reproduzierbar:

- ein Save mit `eventV2.openEvents` kann vorbereitet werden
- die Browser-App laedt diesen Zustand
- das Event Center erkennt das V2-Pilotevent
- `stabilize` resolved ueber den V2-Bridge-Pfad
- `eventV2.openEvents` ist danach leer
- `eventV2.history` enthaelt den geloesten Eintrag
- nach Reload bleibt die History erhalten
- Reload erzeugt keine doppelte History
- V1 schreibt nicht parallel

## Warum Reload-Smoke wichtig ist

Der vorherige Pilot hat gezeigt, dass ein V2-Pilotevent im Event Center angezeigt und geloest werden kann. Der naechste kritische Punkt ist Persistenz ueber einen echten Browser-Reload:

- offene V2-Events muessen aus einem Save geladen werden
- geloeste V2-Events muessen nach Reload in `eventV2.history` bleiben
- der Reload darf das geloeste Event nicht erneut als offen herstellen
- alte V1-Daten duerfen nicht crashen oder parallel schreiben

## Getesteter Ablauf

Das Script `dev/run-event-center-v2-browser-reload-smoke.js`:

1. startet einen lokalen Static-Testserver auf einem freien Port
2. startet Chromium mit blockierten Service Workern
3. seeded `localStorage["grow-sim-state-v2"]` mit einem Save, der ein V2-OpenEvent enthaelt
4. startet die App im Devmode
5. oeffnet das Event Center
6. prueft Titel und Optionen
7. klickt `stabilize`
8. wartet, bis LocalStorage den geloesten V2-State enthaelt
9. laedt die Seite neu
10. prueft, dass History erhalten bleibt und keine Duplikate entstehen

## Pilotevent

Getestet wird ausschliesslich:

- `indoor_dry_rootball`

Unterstuetzte Optionen im Smoke:

- `inspect`
- `stabilize`
- `overreact`

Resolved wird:

- `stabilize`

## Save-/Restore-Erwartung

Vor Resolve:

- `eventV2.openEvents.length === 1`
- `eventV2.history.length === 0`

Nach Resolve:

- `eventV2.openEvents.length === 0`
- `eventV2.history.length === 1`
- History enthaelt `eventId: "indoor_dry_rootball"`
- History enthaelt `selectedOption: "stabilize"`
- `applyPreview` ist vorhanden

Nach Reload:

- `eventV2.openEvents.length === 0`
- `eventV2.history.length === 1`
- keine doppelte History fuer dieselbe `instanceId`
- V1-History ist unveraendert

## Was ausdruecklich nicht getestet wird

- keine weiteren V2-Events
- kein `shared_panic_watering_misread`
- keine echte ApplyDelta-Mutation auf `state.status`
- keine Daily-/Retention-/Push-/Mission-Verknuepfungen
- keine Service-Worker-Update-Pfade
- keine Monetarisierung

## Bekannte Grenzen

- Der Smoke blockiert Service Worker, damit keine alte Scriptversion den Test verfaelscht.
- Remote API Calls werden ueber das bestehende Auth/Test-Harness abgefangen.
- Der Smoke prueft den Dev-Browserpfad, nicht eine Produktionsdeployment-Umgebung.

## Restrisiken

- ApplyDelta bleibt weiterhin Preview/History und ist noch keine echte In-Memory-Sim-Mutation.
- Nur ein V2-Pilotevent ist abgesichert.
- Weitere Events brauchen eigene Branch-/Reload-Abdeckung, bevor sie ueber das Event Center aktiviert werden.
