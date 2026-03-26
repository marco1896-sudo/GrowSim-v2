# GrowSim v2 Post-Update Audit — 2026-03-21

## Scope

Audit-Fokus in dieser Reihenfolge:

1. UI / Figma-Migration
2. Login / Auth / Save-Load Backend
3. Simulation / Environment Core
4. Event-System / Balancing
5. Service Worker / Cache / Offline
6. Screen- / Dialog- / Overlay-State

## Ergebnisübersicht

- **Kein globaler Build- oder Testbruch gefunden.**
- Bestehende Regressionstests für Simulation, Offline-Catch-up und Event-Resolver liefen stabil.
- Zwei konkrete Post-Update-Probleme wurden als sichere Sofort-Fixes umgesetzt:
  1. `statDetail` war nicht als gültiger UI-Sheet-State kanonisiert und konnte durch State-Sync implizit geschlossen werden.
  2. Der Service Worker referenzierte mehrere nicht existierende Shell-Assets und cachte zentrale Figma-Migrationsdateien nicht vor.

## Priorisierte Findings

### P1 — Direkt behoben

1. **UI-State-Inkonsistenz bei Stat-Detail-Sheet**
   - Risiko: Detail-Overlay kann nach Canonical-State-Sync verschwinden.
   - Ursache: `statDetail` fehlte in der Whitelist gültiger `openSheet`-Werte.

2. **Offline-Shell enthielt ungültige/missing Cache-Einträge**
   - Risiko: `cache.addAll()` kann beim Install scheitern oder die Offline-Boot-Zuverlässigkeit verschlechtern.
   - Ursache: veraltete/mismatched Pfade in `sw.js` plus fehlende Dateien der UI-Migration.

### P2 — Noch offen / fragil

1. **Hybrid-Runtime bleibt technische Schuld**
   - `app.js` enthält weiterhin große Teile der Runtime, während parallel migrierte UI-Dateien separat geladen werden.
   - Das ist aktuell funktionsfähig, aber drift-anfällig.

2. **Backend hat praktisch keine automatisierten API-Integrationstests**
   - Auth- und Save-Routen sind syntaktisch okay, aber Response-Verhalten, Fehlerfälle und Persistenzpfade sind nicht testabgedeckt.

3. **Service-Worker-Assetliste bleibt manuell**
   - Die aktuellen Fixes machen den Stand korrekt, aber die Liste kann bei weiteren Asset-/Migrationsänderungen erneut driften.

## Testlücken

- Keine automatisierten Tests für:
  - Auth-Register/Login/`/me`
  - Save-Load-Roundtrip gegen Express/Mongoose
  - UI-Screen-/Dialog-Zustände im DOM
  - echten Service-Worker-Install/Offline-Reload als Integrationstest

## Umgesetzte kleine sichere Fixes

1. `statDetail` als gültigen `openSheet`-Status aufgenommen.
2. Service-Worker-Shellcache auf reale Assetpfade korrigiert.
3. Service-Worker-Shellcache um zentrale Dateien der UI/Figma-Migration ergänzt.
4. Zwei Regressionstests ergänzt:
   - Shellcache enthält nur existierende Dateien und deckt zentrale UI-Migrationsdateien ab.
   - `statDetail` bleibt als gültiger kanonischer UI-Zustand erhalten.

## Empfohlene nächste 3 Schritte

1. **Backend-API-Integrationstests** für Register/Login/Me/Save ergänzen.
2. **Echten Offline-Smoke-Test** für Service Worker + Reload nach Erstinstallation automatisieren.
3. **UI-State-Regressionen** für Menu/Dialog/Sheet-Wechsel gezielt mit DOM-nahen Tests absichern.
