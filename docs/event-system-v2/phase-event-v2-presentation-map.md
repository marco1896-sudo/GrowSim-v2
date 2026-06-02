# Eventsystem V2 – wiederverwendbares UI-Copy/Visual-Mapping

## Ziel
Die sichtbare V2-Darstellung wird aus `app.js` entkoppelt und in eine kleine, wiederverwendbare Presentation-Map verschoben.

## Warum die Presentation Map nötig ist
- Verhindert wachsende Sonderlogik direkt im Renderpfad.
- Hält Copy, Optionslabels und Visual-Entscheidungen pro Event an einem Ort.
- Macht weitere Pilot-Events spaeter kontrolliert anschlussfaehig, ohne Runtime-/Save-Logik zu mischen.

## Enthaltene Events
- Aktiv genutzt:
  - `indoor_dry_rootball`
- Vorbereitet, aber nicht aktiviert:
  - `shared_panic_watering_misread`

## Mapping-Inhalte
Pro Event:
- Titel
- Subtitle
- Beschreibung
- Statuslabel
- Kategorie-/Schweregradlabel
- Insight-Bloecke
- Option-Labels + Option-Beschreibungen
- Visual-Strategie

## Aktives Event
`indoor_dry_rootball` liest seine sichtbare Copy und Optionstexte jetzt ueber die Presentation-Map.

## Vorbereitetes, aber nicht aktives Event
`shared_panic_watering_misread` ist nur im Mapping vorbereitet.  
Es wird in dieser Phase nicht produktiv im Event Center aktiviert.

## Fallback-Regeln
Wenn ein V2-Event kein Mapping besitzt:
- neutraler Titel/Description statt Rohkeys
- keine technische Debug-Copy
- kein Legacy-Bildzwang

## Was ausdrücklich nicht geändert wurde
- Keine neue Event-Aktivierung.
- Keine neue ApplyDelta-Aktivierung.
- Keine Runtime-/Save-/Storage-Logikänderung fuer neue Events.
- Kein V1-Delete.
