# Buddy Asset Library

Zweck: zentrale Buddy-Bibliothek fuer transparente PNGs, ohne Runtime- oder UI-Anbindung.

## Struktur

- `transparent/poses/`: neutrale und gestische Ganzkoerper-Posen
- `transparent/emotions/`: emotionale Reaktionen
- `transparent/ui/`: Buddy-Assets mit klarer UI-Funktion
- `source/`: spaetere Prompt-, PSD-, Export- oder Review-Quellen

## Dateinamen

- Muster: `buddy_<id>_v###.png`
- Nur lowercase, snake_case, ASCII
- Nur transparente PNGs
- Neue Version nur bei echter visueller Aenderung
- Links/rechts immer explizit benennen: `pointing_left`, `pointing_right`

## Nutzungsregeln

- Nur Assets nutzen, die im `manifest.json` gelistet sind.
- `approved` ist produktionsreif.
- `generated` ist vorhanden, aber noch nicht final freigegeben.
- `missing` reserviert den Slot, erzeugt aber keine Datei.
- Keine abgelehnten Assets aus `_rejected` uebernehmen.
- Buddy muss konsistent, freundlich und klar lesbar bleiben.
- Keine Hintergruende, kein Text in der Bilddatei, keine harten Stilabweichungen.

## Aktueller Stand

- Vorhandene Referenzen wurden konservativ uebernommen.
- Unsichere oder nur aehnliche Motive wurden absichtlich nicht umbenannt oder automatisch gemappt.
- Priorisierte Slots fuer UI/Codex-Automation sind im `manifest.json` vorbereitet.
