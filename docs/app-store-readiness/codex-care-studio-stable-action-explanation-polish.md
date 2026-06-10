# Care Studio Stable Action Explanation Polish

## Ausgangslage

- Die vorige Phase `Care Studio First Visit Polish` war abgeschlossen.
- Frische First-Run-Nutzer wurden bereits ruhig ins Care Studio geführt.
- Im Care Studio gab es schon eine kurze Coach-Zeile, klare DE/EN/ES-Texte und einen mobilen Safe-Area-Fix.
- Ziel dieser Mini-Phase war nur, die stabile Empfehlung im Care Studio verständlicher zu machen, wenn Warten oder Beobachten die beste Entscheidung ist.

## Ziel der Mini-Phase

- Eine kurze „Warum warten reicht“-Begründung direkt an der stabilen Care-Empfehlung anzeigen.
- Nicht zu Gießen oder Düngen drängen, wenn Werte stabil sind.
- Feuchte und Risiko bleiben die ersten Lesepunkte.
- Die neue Erklärung soll kompakt bleiben und auf Mobile nicht aufblähen.
- DE/EN/ES sollen sauber und ohne Key-Leaks bleiben.

## Geprüfte Care-Studio-Empfehlungen

- Wasser-Empfehlung mit `monitor`
- Feed-Empfehlung mit `stable`
- Entscheidungs-/Preview-Karte mit bestehender Verdict- und Reason-Darstellung
- First-Run-zu-Care-Flow als Schutz gegen Seiteneffekte

## Gefundene UX-/Textprobleme

- Die stabile Wasser-/Feed-Empfehlung war inhaltlich vorhanden, aber die Begründung war zu knapp und indirekt.
- Es fehlte eine kleine, direkt zugeordnete Zusatzzeile, die erklärt, warum Beobachten heute reicht.
- Für stabile Empfehlungen gab es noch keine eigene kurze Copy, die den ruhigen Weg explizit positiv rahmt.
- Die neue Erklärung musste so umgesetzt werden, dass sie keine zusätzliche große UI-Fläche erzeugt.

## Geänderte Dateien

- `app.js`
- `styles.css`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/care-studio-runtime.test.js`
- `test/guest-mode-startup.test.js`
- `docs/app-store-readiness/codex-care-studio-stable-action-explanation-polish.md`

## Neue oder verbesserte stabile Empfehlung

- Wasser zeigt bei stabilem Zustand jetzt eine kurze Zusatznotiz wie „Werte sind stabil. Erst beobachten verhindert unnötigen Stress.“
- Feed zeigt bei stabilem Zustand jetzt eine kurze Zusatznotiz wie „Nährstofflage ist stabil. Ein kurzer Check reicht heute.“
- Die Notiz sitzt direkt unter der bestehenden Empfehlung in der Wasser-/Feed-Infobox.
- Instabile Fälle bleiben unverändert und werden nicht künstlich weichgespült.

## i18n-Korrekturen

- Neue stabile Hinweistexte wurden in DE/EN/ES ergänzt.
- Die Texte sind kurz gehalten und ohne technische Begriffe formuliert.
- Es wurden keine neuen sichtbaren i18n-Key-Leaks eingeführt.
- Der bestehende Care-Textfluss bleibt lokalisiert und konsistent.

## Mobile-Verhalten

- Die Zusatzzeile bleibt klein und kompakt.
- Auf 390x844 wurde das Care-Studio weiterhin als lesbar und nicht überladen geprüft.
- Der frühere Safe-Area-/Header-Fix blieb unverändert stabil.

## Neue/geänderte Tests

- `test/care-studio-runtime.test.js`
  - prüft die stabile Wasser-Begründung
  - prüft die stabile Feed-Begründung
  - prüft weiter die Care-Preview- und Header-Synchronität
- `test/guest-mode-startup.test.js`
  - wurde robuster auf den Restore-Zustand nach einem alten Save abgestimmt
  - wartet jetzt auf das vollständige Wegklappen transienter Menüs
  - stabilisiert den gealterten Run-Zeitstempel im Live-State vor dem Reload

## Ausgeführte Tests

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
- `node test/care-studio-runtime.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `node test/gameover-flow-runtime.test.js`
- `node test/stability-top5-regression.test.js`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-visibility-health-report.js`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`
- `node test/encoding-utf8-regression.test.js`
- `npm run test:runtime`

## Testergebnisse

- `check:syntax` grün
- `check:i18n` grün
- `public-text-readiness` grün
- `care-studio-runtime` grün
- `guest-mode-startup` grün
- `ui-onboarding-settings-smoke` grün
- `gameover-flow-runtime` grün
- `stability-top5-regression` grün
- `test:smoke` grün
- `test:event-release` grün
- Event-V2 visibility health report: `ok: true`
- Event-V2 release gate snapshot: `ok: true`, `gate: "go"`
- `service-worker-shell-assets` grün
- `encoding-utf8-regression` grün
- `test:runtime` grün

## Offene Risiken

- Die stabile Hinweiszeile bleibt bewusst kurz und nur bei stabilen Wasser-/Feed-Zuständen sichtbar.
- Die eigentliche Care-Logik wurde nicht verändert, daher hängt die Begründung weiter am bestehenden Recommendation-Modell.
- In früheren parallelen Testläufen gab es Timing-Artefakte; die finalen Einzel- und Suite-Läufe sind jedoch grün.

## Finale Einschätzung

`go`

Die stabile Care-Empfehlung wirkt jetzt verständlicher, ohne Simulation, Gastmodus, Save/Load, Event-V2 oder Gameover zu beschädigen. Die neue Begründung ist kompakt, lokalisiert und auf Mobile unauffällig genug, um den ruhigen Flow zu verbessern statt zu überfrachten.
