# UI Animation Marker Audit

## Ziel

Timing-Race-Risiken in animierten UI-Pfaden identifizieren und nur dort stabilisieren, wo Smokes/Tests reale Flakes zeigen koennen.

## Gefundene animierte UI-Pfade

### 1) Ring-Wert-Interpolation (`app.js`, `animateRingValue`)
- Marker: `ringNode.dataset.animating`
- Startmarker: direkt vor Start des RAF-Tweens (`'true'`)
- Endmarker: bei Tween-Ende + im No-Delta-Pfad (`'false'`)
- No-Delta-Verhalten: explizit gesetzt
- Testbezug: `test/ui-feedback-phase7.test.js` liest Marker direkt nach `renderHud()`
- Race-Risiko: **hoch** (bereits beobachteter Fail)
- Fix nötig: **ja** (bereits umgesetzt in Vorphase, im Audit verifiziert)

### 2) Ring-Highlight nach Wertwechsel (`app.js`, `triggerStatUpdateFeedback`)
- Marker: CSS-Klassen `stat-ring--updated` / `stat-value--updated`
- Startzeitpunkt: synchron im Funktionsaufruf
- Endzeitpunkt: `setTimeout(..., 340ms)` entfernt Klassen
- No-Delta-Verhalten: Funktion wird nur bei Wertwechsel aufgerufen
- Testbezug: aktuell kein direkter Smoke, der exakte Zwischenzeit liest
- Race-Risiko: **niedrig**
- Fix nötig: **nein**

### 3) Care-Action-Feedback (`app.js`, `triggerTransientClass`, `triggerCareActionVisualFeedback`)
- Marker: CSS-Klassen `care-execute-btn--impact-*`, `care-feedback--fresh`
- Startzeitpunkt: synchron (remove/reflow/add)
- Endzeitpunkt: `setTimeout(...)` entfernt Klassen
- No-Animation-Verhalten: bei fehlendem Node früher Return
- Testbezug: `test/ui-feedback-phase7.test.js` prüft Klassenpräsenz
- Race-Risiko: **niedrig** (Start ist synchron, kein RAF-Gap)
- Fix nötig: **nein**

### 4) Legacy-UI-Ring-Update (`ui.js`, `setRing` + `triggerStatUpdateFeedback`)
- Marker: kein `dataset.animating`, nur CSS-Update-Klassen
- Start/Ende: synchron + timeoutbasiertes Entfernen
- Testbezug: aktuelle Smokes laufen primär über Runtime-Pfad in `app.js`
- Race-Risiko: **niedrig**
- Fix nötig: **nein** (kein aktueller Flake-Bezug)

## Fazit

Der einzige testkritische Hochrisiko-Pfad war die RAF-basierte Ring-Interpolation in `app.js`.  
Weitere Pfade sind markerseitig ausreichend stabil oder nicht testkritisch im aktuellen Smoke-Set.

