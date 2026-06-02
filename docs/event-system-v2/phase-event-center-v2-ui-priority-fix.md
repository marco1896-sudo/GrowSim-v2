# Eventsystem V2 - Event Center UI Priority Fix

## Screenshot-Befund

Im echten Browser zeigte das Event Center trotz V2-Pilotfortschritt noch Legacy/Cooldown-Anmutung:

- Header-Hinweis: `Autoritativ bleibt Legacy, die Darstellung ist exklusiv modern.`
- Legacy-/Cooldown-Text konnte sichtbar bleiben.
- Ein unpassendes nasses Overwatering-Visual konnte fuer den V2-Pilotpfad erscheinen.
- Der sichtbare Pfad wirkte wie modernisiertes V1 statt echter V2-Pilot.

## Ursache

Die fachliche Prioritaet im ViewModel war bereits teilweise vorhanden: ein offenes `eventV2.openEvents` fuer `indoor_dry_rootball` konnte vor Legacy gelesen werden.

Die sichtbare UI hatte aber drei Luecken:

- Der moderne Event-Sheet-Header zeigte immer den Legacy-Autoritaetshinweis.
- Die Media-Auswahl nutzte weiterhin `state.events.activeImagePath`, selbst im V2-Pilotpfad.
- Die Browser-Smokes prueften Titel/Optionen/Resolve, aber nicht den sichtbaren Legacy-Hinweis, Cooldown-Fallback oder falsche Legacy-Visuals.

Zusaetzlich war im echten Dev-Browser noch die alte Build-ID aktiv (`20260426-115352`), wodurch die normale App alte versionierte Script-URLs laden konnte.

## Betroffene Dateien/Funktionen

- `app.js`
  - `getModernEventSheetContentState(...)`
  - `renderModernEventSheetContent(...)`
- `index.html`
  - Build-ID fuer versionierte Dev-Assets
- `dev/run-event-center-v2-browser-reload-smoke.js`
- `dev/run-event-center-v2-mobile-qa-smoke.js`

## Warum die Smokes vorher nicht gereicht haben

Die bestehenden Browser-Smokes haben erfolgreich geprueft:

- V2-Titel
- V2-Optionen
- Resolve
- History
- Reload

Sie prueften aber nicht:

- ob der sichtbare Header noch `Autoritativ bleibt Legacy` enthaelt
- ob ein Legacy-Cooldown-Fallback im V2-Pfad sichtbar ist
- ob ein falsches Legacy-Visual im V2-Pfad genutzt wird
- ob das DOM intern `data-event-system="v2"` markiert

Dadurch konnte ein fachlich funktionierender V2-Flow visuell wie Legacy wirken.

## Fix

Wenn der moderne Event-Sheet-Pfad ein V2-Pilot-Event rendert:

- `data-event-system="v2"`
- `data-event-id="indoor_dry_rootball"`
- `data-event-authority="v2"`
- Header-Subtitle: `V2 Pilot aktiv, Bridge-Pfad autoritativ.`
- kein Legacy-Autoritaetshinweis
- kein Legacy-Cooldown-Fallback
- kein Durchreichen von `state.events.activeImagePath`

Wenn kein V2-Pilot-Event vorhanden ist, bleibt der bestehende Legacy-/Modern-Fallback erlaubt.

## Neue Smoke-Assertions

Die Browser-Smokes seedeten gezielt einen gefaehrlichen Legacy-Unterzustand:

- `state.events.machineState = "cooldown"`
- `state.events.activeImagePath = "assets/events/event-overwatering.png"`
- gleichzeitig ein offenes `eventV2.openEvents[0]` fuer `indoor_dry_rootball`

Geprueft wird nun:

- V2-DOM-Marker vorhanden
- kein Text `Autoritativ bleibt Legacy`
- kein Text `Abklingzeit aktiv`
- kein Text `Das Ereignissystem befindet sich in der Abklingzeit`
- kein `event-overwatering` Visual im V2-Pfad
- keine `legacy_active_image`-Origin im V2-Pfad
- `stabilize` bleibt klickbar und resolvebar

## Visual-Entscheidung

Fuer `indoor_dry_rootball` wird im V2-Pilotpfad kein Legacy-Overwatering-Bild verwendet.

Wenn kein passendes explizites V2-Visual verfuegbar ist, ist ein neutraler Placeholder besser als ein fachlich falsches Bild.

## Verbleibende Restrisiken

- Ohne vorhandenes `eventV2.openEvents` zeigt die echte App weiterhin Legacy/History/Cooldown, was erwartetes Fallback-Verhalten ist.
- Der V2-Pilot bleibt auf `indoor_dry_rootball` begrenzt.
- Service-Worker-/Build-Cache-Effekte koennen alte Versionen sichtbar halten, bis eine neue Build-ID oder ein harter Reload greift.
