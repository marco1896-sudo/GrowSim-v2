# Eventsystem V2 - Smoke Regression Fix

## Ziel

Den roten Smoke nach der Bulk-Aktivierung isolieren und mit minimalem Risiko stabilisieren, ohne neue Eventlogik zu aktivieren.

## Exakter Fail

Betroffen war:

- `test/ui-feedback-phase7.test.js`
- Assertion: `status changes should interpolate instead of hard jumping`
- Erwartet: `animatedWater.immediate.animating === "true"`
- Ist im roten Lauf: `undefined`

## Ursache

Im Produktcode wurde `data-animating` beim Ring-Update erst im ersten `requestAnimationFrame`-Tick gesetzt.  
Der Test liest den Zustand unmittelbar nach `renderHud()`. Je nach Timing konnte das Flag noch fehlen.

Das war ein Timing-/Race-Problem im UI-Feedback-Pfad, kein neuer Event-V2-Outcome-Fehler.

## Fix-Entscheidung

Minimaler Produktfix in `animateRingValue(...)`:

1. `ringNode.dataset.animating = "true"` sofort beim Start der Tween-Animation setzen.
2. Im Gleichheitsfall (`delta < 0.01`) explizit `ringNode.dataset.animating = "false"` setzen.

Damit ist das Verhalten deterministisch und passt sowohl zur UI-Intention als auch zur Testerwartung.

## Was nicht geaendert wurde

- keine neue Event-Aktivierung
- keine neuen Statusdeltas
- keine Bridge-/Storage-Erweiterung
- keine Test-Deaktivierung
- keine Lockerung der Assertion ohne Produktbezug

