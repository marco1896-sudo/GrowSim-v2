# Phase 116 - WebP Export Tooling Decision

## Ist-Zustand (read-only)
- `package.json` enthält aktuell keine Bild-Export-Dependency wie `sharp`.
- Lokale Shell-Tools `magick` und `cwebp` sind nicht verfügbar.
- Event-Katalog nutzt zur Laufzeit weiter `assets.cover.src` + `assets.cover.fallback`.
- Im Repo existieren Python/Pillow-basierte Asset-Skripte (hauptsächlich für andere Asset-Pipelines), aber ohne abgesicherte Event-V2-WebP-Standardisierung.

## Bewertete Optionen
1. `sharp` (Node)
- Windows: gut
- Reproduzierbarkeit: hoch
- CI: hoch
- Wartbarkeit: hoch
- Risiko `package.json`: mittel (Dependency-Entscheidung nötig)

2. `cwebp` (extern)
- Windows: mittel
- Reproduzierbarkeit: mittel
- CI: mittel bis niedrig (Tool-Install nötig)
- Wartbarkeit: mittel
- Risiko `package.json`: niedrig

3. ImageMagick (`magick`)
- Windows: mittel
- Reproduzierbarkeit: mittel
- CI: mittel (Systemabhängigkeit)
- Wartbarkeit: mittel
- Risiko `package.json`: niedrig

4. Manuelle Konvertierung außerhalb Repo
- Windows: hoch
- Reproduzierbarkeit: niedrig
- CI: niedrig
- Wartbarkeit: niedrig
- Risiko `package.json`: niedrig

5. Python/Pillow im Repo
- Windows: mittel
- Reproduzierbarkeit: mittel (abhängig von Python-Setup)
- CI: mittel
- Wartbarkeit: mittel
- Risiko `package.json`: niedrig

## Entscheidung
Langfristig bevorzugte Option: **`sharp` als Node-basierter Exporter**.

Begründung:
- Beste Balance aus CI-Fähigkeit, Windows-Kompatibilität und reproduzierbarer Pipeline.
- Sauber integrierbar in spätere Validator-/AssetRef-Aktivierungsphasen.

Wichtig: In Phase 116 keine Installation und keine `package.json`-Änderung.
