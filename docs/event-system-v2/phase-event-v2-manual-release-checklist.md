# Eventsystem V2 – Manual Release Checklist

## Vorbereitung

- Dev-App starten
- Hard Reload durchführen
- optional Application Storage / Service Worker prüfen
- DevTools Console öffnen
- sicherstellen, dass Seed-Helper vorhanden sind:
  - `__resetEventV2Pilot`
  - `__seedEventV2PilotIndoorDryRootball`
  - `__seedEventV2PilotSharedPanicWateringMisread`
  - `__getEventV2PilotState`

## Browser-Check Desktop

### Event 1: Trockener Wurzelballen

1. `__resetEventV2Pilot({ clearHistory: true, resetStatus: true })`
2. `__seedEventV2PilotIndoorDryRootball()`
3. Event Center öffnen
4. Prüfen:
   - Titel: `Trockener Wurzelballen`
   - keine Legacy-/Cooldown-Texte
   - keine technischen Rohkeys
   - Optionen sichtbar
   - `Behutsam stabilisieren`
   - `Substrat zuerst prüfen`
   - `Sofort stark eingreifen`
5. `Behutsam stabilisieren` klicken
6. Prüfen:
   - Event ist resolved
   - History enthält Eintrag
   - Status ändert sich plausibel
7. Reload
8. Prüfen:
   - keine doppelte History
   - kein Double-Apply

### Event 2: Panikgießen vermeiden

1. `__resetEventV2Pilot({ clearHistory: true, resetStatus: true })`
2. `__seedEventV2PilotSharedPanicWateringMisread()`
3. Event Center öffnen
4. Prüfen:
   - deutscher Titel sichtbar
   - keine Legacy-/Cooldown-Texte
   - Optionen sichtbar
   - `Topfgewicht prüfen`
   - `Wurzelzone prüfen`
   - `Aus Panik gießen`
5. `Topfgewicht prüfen` klicken
6. Prüfen:
   - Event ist resolved
   - History enthält Eintrag
   - keine Statusänderung
7. Reload
8. Prüfen:
   - keine doppelte History
   - keine Statusänderung

## Mobile-Check

Auf echtem Gerät oder Mobile-Viewport prüfen:

- 360px Breite
- 390px Breite
- 430px Breite

Für beide Events prüfen:

- Sheet öffnet sauber
- kein horizontaler Overflow
- Buttons erreichbar
- Text lesbar
- keine alten Bilder/Legacy-Blöcke sichtbar
- Resolve funktioniert
- Reload bleibt sauber

## Go/No-Go

GO, wenn:

- beide Events sichtbar korrekt sind
- keine Legacy-/Cooldown-Texte im V2-Pfad sichtbar sind
- keine Rohkeys sichtbar sind
- Resolve funktioniert
- Reload idempotent bleibt
- keine kritischen Console Errors auftreten

NO-GO, wenn:

- V1-Look wieder sichtbar ist
- falsche alte Bilder auftauchen
- Event Center falschen Pfad öffnet
- History doppelt geschrieben wird
- Status mehrfach mutiert
- Mobile Layout bricht
- kritische Fehler in Console auftreten
