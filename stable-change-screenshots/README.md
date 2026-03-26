# Stable Change Screenshots

In diesem Ordner liegen immer die **letzten 3 stabilen Änderungs-Screenshots**.

## Aktualisieren

```powershell
powershell -ExecutionPolicy Bypass -File scripts/save-stable-screenshot.ps1 \
  -SourceImage "<pfad-zum-screenshot>.png" \
  -Label "<commit-oder-kurzer-name>"
```

Das Script:
- kopiert den Screenshot in diesen Ordner,
- vergibt einen Zeitstempel-Dateinamen,
- behält automatisch nur die neuesten 3 Dateien.
