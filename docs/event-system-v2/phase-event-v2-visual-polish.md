# Eventsystem V2 – Event Sheet Visual Polish + Eventbild-Slots

## Ziel

Die sichtbaren V2-Event-Sheets fuer die zwei Live-Pilot-Events sollen hochwertiger wirken: klarer Visual-Fokus, bessere Entscheidungskarten und ein staerkerer Resolve-Zustand.

## Screenshot-Befund

- Event-Visual wirkte generisch/technisch
- Platzhaltercharakter zu stark
- Decision-Buttons hatten zu wenig visuelle Hierarchie
- Resolved-Ansicht wirkte zu schwach

## Visual-Strategie

- Pro V2-Event wird ein **Visual-Slot** ueber die Presentation Map gepflegt.
- Wenn vorhanden, wird ein passendes Eventbild genutzt.
- Wenn kein Bild vorhanden ist, greift ein hochwertiger Fallback mit Badge-/Icon-Sprache statt Buchstaben-Platzhalter.
- Keine Legacy-/Cooldown-/V1-Bilder im V2-Pfad.

## Asset-Slots

Aktive Pilot-Slots:

- `indoor_dry_rootball` -> `assets/events/v2/final/indoor_dry_rootball/hero.webp`
- `shared_panic_watering_misread` -> `assets/events/v2/final/shared_panic_watering_misread/hero.webp`

## Fallback-Regeln

- Bei fehlendem Bild: `illustration-card`-Fallback mit Event-Badge und sauberer Caption
- Kein generischer Einzelbuchstabe als Hauptsignal
- Kein falsches Legacy-Bild

## Decision-Card-Polish

- Optionen tragen jetzt Presentation-Metadaten (`tone`, `badge`)
- sichtbare Labels wie `Empfohlen`, `Pruefen`, `Riskant`
- differenzierte Card-Tones ohne Logikaenderung

## Resolved-State-Polish

- eigener Outcome-Block (`Ausgewertet`)
- staerkere visuelle Trennung zum aktiven Zustand
- spielnahe Wirkungslinie statt technischer Debugsprache

## Was ausdruecklich nicht geaendert wurde

- keine neue Eventaktivierung
- keine Outcome-Policy-Aenderung
- keine Delta-Logik-Aenderung
- kein Storage-/Runtime-Umbau
- kein V1-Rueckbau
