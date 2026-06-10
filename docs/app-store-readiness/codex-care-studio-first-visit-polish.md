# Care Studio First Visit Polish

## Ausgangslage

- Die vorherige Mini-Phase `First-Run Core Loop / erste 5 Minuten` war bereits umgesetzt.
- Neue Nutzer wurden auf dem Home-Screen schon ruhig per Starterkarte ins Care Studio geführt.
- Ziel dieser Phase war nur die Fortsetzung dieser ruhigen Erstführung direkt im geöffneten Care Studio.
- Simulation, Savegame-Struktur, Event-V2, Gastmodus, Cloud/Auth und Gameover durften nicht umgebaut werden.

## Ziel der Mini-Phase

- Den ersten Care-Studio-Moment für frische neue Runs verständlicher machen.
- Feuchte und Risiko als ersten Blick priorisieren.
- Beobachten/Warten als legitime Haltung sichtbar machen, wenn Werte stabil sind.
- Sichtbaren Sprachmix im Care Studio in DE/EN/ES beseitigen.
- Header-/Top-Abstände auf 390x844 bzw. notch-naher Breite minimal absichern.

## Geprüfter First-Run-zu-Care-Studio-Flow

1. Frischer Run-Start aus dem Onboarding.
2. Starterkarte im Home-Teaser-Slot erscheint.
3. Starterkarte öffnet das Care Studio.
4. Oberer Care-Studio-Bereich wurde auf Erstverständlichkeit, Sprachkonsistenz und Mobile-Spacings geprüft.
5. Sprachwechsel DE -> EN -> ES wurde mit geöffnetem Care-Kontext geprüft.
6. Reload-/Restore-Verhalten wurde über bestehende Guest-/Smoke-Tests mitgeprüft.

## Gefundene UX-/i18n-/Mobile-Probleme

- Im Care Studio war der Close-Button im Markup hart auf Deutsch gesetzt und konnte so in EN/ES sichtbar gemischt erscheinen.
- Das Standard-Feedback im Care Studio war ebenfalls hart auf Deutsch gesetzt.
- Beim Sprachwechsel blieben Care-Tabs und Care-Action-Listen wegen ihrer Render-Signaturen in der alten Sprache hängen.
- Im Erstbesuch fehlte im oberen Care-Studio-Bereich noch eine kurze ruhige Einordnung für „erst lesen, nicht sofort handeln“.
- In Care-Preview-Verben fehlte ein sichtbarer Locale-Eintrag für `careStudio.preview.verdict.avoid`, wodurch ein i18n-Key leaken konnte.
- Der Care-Header hatte noch keinen expliziten Safe-Area-Top-Puffer.

## Geänderte Dateien

- `app.js`
- `index.html`
- `styles.css`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/guest-mode-startup.test.js`
- `test/ui-onboarding-settings-smoke.test.js`

## Care-Studio-Erstbesuch-Verbesserung

- Im bestehenden Hero-Bereich des Care Studios wurde eine kleine zusätzliche Coach-Zeile ergänzt.
- Diese Zeile wird nur im frischen echten First-Run-Kontext priorisiert.
- Die Copy lenkt auf Feuchte und Risiko und betont bei stabilen Werten ausdrücklich, dass Beobachten reichen kann.
- Es gibt keinen blockierenden Dialog, keine neue Komponente und keine Änderung der Simulationslogik.

## i18n-Korrekturen

- Der sichtbare Care-Close-Button nutzt jetzt die bestehende `common.close`-Lokalisierung inklusive `aria-label`.
- Das Default-Feedback im Care Studio ist jetzt lokalisiert.
- Neue Care-First-Visit-Texte wurden in DE/EN/ES ergänzt.
- Ein fehlender sichtbarer Preview-Verdict-Eintrag (`avoid`) wurde in DE/EN/ES ergänzt, damit kein Key-Leak bleibt.
- Care-Tabs und Care-Action-Listen berücksichtigen jetzt die aktive Sprache in ihrer Render-Signatur und werden beim Sprachwechsel neu aufgebaut.

## Mobile-/Notch-Verhalten

- Der Care-Header reserviert jetzt Safe-Area-Top-Abstand.
- Der Close-Button bleibt mit `white-space: nowrap` und `flex-shrink: 0` besser erreichbar.
- Ein 390x844-Check ergab:
  - Header oberhalb des ersten Inhalts sauber sichtbar
  - Titel nicht abgeschnitten
  - Close-Button erreichbar
  - erster Inhaltsblock nicht unter den Header gedrückt

## Neue/geänderte Tests

- `test/guest-mode-startup.test.js`
  - prüft Starterkarte -> Care Studio
  - prüft First-Visit-Coach-Zeile
  - prüft lokalen Close-Text
  - prüft keinen sichtbaren `careStudio.*`-Leak
- `test/ui-onboarding-settings-smoke.test.js`
  - prüft Starterkarte -> Care Studio im Signed-in-Flow
  - prüft First-Visit-Coach-Zeile
  - prüft Care-Close-Text in DE/EN/ES
  - prüft Care-Tabs in EN/ES
  - prüft keine sichtbaren `careStudio.*`-Leaks im Care Sheet

## Ausgeführte Tests

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `node test/gameover-flow-runtime.test.js`
- `node test/stability-top5-regression.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-visibility-health-report.js`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`
- `node test/encoding-utf8-regression.test.js`

## Testergebnisse

- Alle oben geforderten Checks liefen grün durch.
- `npm run test:runtime` war langlaufend, aber erfolgreich.
- Event-V2-Health-Report: `ok: true`
- Event-V2-Release-Gate-Snapshot: `ok: true`, `gate: "go"`

## Offene Risiken

- Die neue Coach-Zeile sitzt bewusst weiter in der bestehenden Care-Hero-Struktur und ist kein eigener modularer Coach-Baustein.
- Einige Care-Aktionstexte stammen weiterhin aus bestehenden Runtime-/Katalogpfaden; in dieser Mini-Phase wurde nur der sichtbare Misch-/Leak-Pfad gezielt bereinigt.
- Es wurden keine zusätzlichen manuellen Checks auf echtem iPhone-Gerät durchgeführt, nur Browser-/Playwright-basierte Mobile-Checks.

## Finale Einschätzung

`go`

Der erste Care-Studio-Besuch wirkt jetzt ruhiger und verständlicher, ohne Simulation, Gastmodus, Save/Load, Event-V2 oder Gameover zu beschädigen. Sichtbarer Sprachmix und der gefundene Key-Leak im Care Studio wurden bereinigt, und die relevanten Gates blieben grün.
