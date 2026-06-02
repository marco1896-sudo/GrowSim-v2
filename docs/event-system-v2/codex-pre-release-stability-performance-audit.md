# Codex Pre-Release Stability & Performance Audit

Datum: 2026-06-01

## Ziel der Pruefung

Vor dem Onlinegang von Eventsystem V2 wurde die App auf Runtime-Stabilitaet, Event-Resume-Verhalten, Save/Load-Robustheit, PWA-/Cache-Sicherheit, i18n, Mobile-/Browser-Smokes, unnoetige Debug-Ausgaben und Release-Risiken geprueft.

Ziel war kein Rewrite, sondern sichere Stabilisierung ohne Feature-Erweiterung.

## Gepruefte Bereiche

- App-Boot und zentrale Runtime in `app.js`
- Simulation/Resume-Reconciliation in `sim.js`
- Eventsystem V2, Event-Release-Gates und Event-Center-Smokes
- Save/Load und Remote-Fallbacks in `storage.js`
- i18n Runtime und i18n-Audit
- PWA / Service Worker / Cache-Shell in `sw.js`
- UI-Smokes, Event-Scheduler, Event-Resume, Shop- und Coin-Flows
- Suche nach sichtbaren Debug-/Console-/TODO-/Placeholder-Risiken
- Dev-Server-/Browser-Start und Mobile-/Reload-nahe Event-V2-Gates

## Gefundene Probleme

### P1 - i18n Boot-Risiko

`app.js` konnte `i18nT()` vor der Initialisierung von `i18nRuntimeInitialized` erreichen. In Browser-Runtime-Smokes trat dadurch ein TDZ-Fehler auf: `Cannot access 'i18nRuntimeInitialized' before initialization`.

### P1 - Event-Resume-Reconciliation

Ein gespeichertes Legacy-Event im Zustand `resolving` konnte beim Resume durch den V2-Bridge-Pilot blockiert werden. Ergebnis: abgelaufene Resolving-Events blieben in `resolving`, statt sicher in `resolved`/`cooldown` weiterzulaufen.

### P1 - Storage-/Boot-Log-Laerm

Mehrere normale Storage- und Boot-Info-Logs waren in produktionsnahen Runs zu laut. Das erschwert echte Konsolenfehler vor Release.

### P1 - Service Worker Shell-Precache

Der Service-Worker-Shell-Test war rot, weil die Shell-Precache-Liste keinen stabilen `APP_SHELL_FILES`-Anker mehr hatte und migrierte UI-Runtime-Dateien nicht explizit in der Shell-Liste standen.

### P1 - Runtime-Test-Sammellauf haengt

`npm run test:runtime` bleibt reproduzierbar ohne Assertion-Ausgabe bei `test/time-system-runtime.test.js` haengen. Die nachfolgenden Runtime-Tests wurden einzeln erfolgreich ausgefuehrt. Der Hang wurde nicht blind gefixt, weil er einen eigenen Time-System-/Test-Harness-Audit braucht.

### P1/P2 - UTF-8/Mojibake-Guard rot

`node test/encoding-utf8-regression.test.js` findet bestehende Mojibake-/Replacement-Marker in mehreren Dateien. Das ist release-relevant, aber eine pauschale Textkorrektur waere riskant, weil Inhalte, Locales und bestehende Daten betroffen sind.

Betroffene Dateien laut Test:

- `data/actions.json`
- `data/events/catalog/_planning/phase-169-resolve-flow-no-write-gate-report.json`
- `sim.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/es.json`
- `storage.js`
- `styles.css`
- `test/stability-top5-regression.test.js`

### P2 - i18n-Audit False Positives

Der i18n-Audit wertete dynamische Template-Fragmente als statische Keys und konnte dadurch faelschlich fehlschlagen.

### P2 - Onboarding-Testrobustheit

Mehrere Browser-Runtime-Tests erwarteten noch den alten direkten Start-Button und mussten an den mehrstufigen Run-Builder angepasst werden.

## Behobene Probleme

- `app.js`: i18n TDZ-Risiko behoben und Runtime-Info-Logs hinter Debug-Logging gelegt.
- `src/i18n/index.js`: Missing-Translation-Warnungen waehrend frueher Fallback-Ladephase entschärft.
- `scripts/i18n-audit.js`: Nur statische i18n-Keys werden als verwendete Keys bewertet.
- `storage.js`: Normale Remote-/Restore-/Persist-Info-Logs hinter Debug-Logging gelegt; explizite Fetch-unavailable-Fallbacks bleiben sichtbar, weil Release-Readiness-Tests sie erwarten.
- `sim.js`: Resume-Reconciliation laesst gespeicherte Legacy-Event-Zustaende wieder vollstaendig fertiglaufen; der V2-Bridge-Pilot blockiert diese Reparatur nicht mehr.
- `sw.js`: Shell-Precache-Liste als `APP_SHELL_FILES` stabilisiert und wichtige UI-Runtime-Dateien in die Shell-Liste aufgenommen.
- `test/support/browserRuntime.js` und betroffene Runtime-Tests: kleiner Helper fuer den aktuellen Onboarding-/Run-Builder-Flow.

## Nicht behobene / bewusst zurueckgestellte Punkte

- UTF-8/Mojibake-Funde wurden dokumentiert, aber nicht massenhaft korrigiert. Empfehlung: eigener Encoding-Cleanup mit visueller Text-QA.
- `test/time-system-runtime.test.js` haengt im Sammellauf. Empfehlung: separater Time-System-Test-Harness-Audit.
- In-App-Browser-Logs waren bei der Pruefung teilweise stale/gemischt. Verlaessliche Aussagen wurden deshalb aus Playwright-/Node-Smokes und direkten Release-Gates abgeleitet.
- Bestehende Console-Warnungen/Errors wurden nicht global entfernt, weil viele davon echte Failure-Pfade, Dev-Skripte oder bewusst gatebare Debug-Ausgaben sind.
- Keine Eventdaten, Asset-IDs, Monetization-Logik oder Save-Shape-Strukturen wurden umgebaut.

## Geaenderte Dateien

- `app.js`
- `sim.js`
- `storage.js`
- `sw.js`
- `scripts/i18n-audit.js`
- `src/i18n/index.js`
- `test/support/browserRuntime.js`
- `test/daily-tasks-ui-state.test.js`
- `test/daily-tasks-runtime.test.js`
- `test/event-scheduler-runtime.test.js`
- `test/event-resume-reconciliation-runtime.test.js`
- `test/event-shop-transaction-runtime.test.js`
- `docs/event-system-v2/codex-pre-release-stability-performance-audit.md`

## Ausgefuehrte Tests

- `npm run check:syntax` - bestanden
- `npm run check:i18n` - bestanden, nur bekannte unused-key-Heuristik
- `npm run check:ui-architecture` - bestanden
- `npm run test:smoke` - bestanden
- `npm run test:event-release` - bestanden
- `node test/event-resume-reconciliation-runtime.test.js` - bestanden
- `node test/event-scheduler-runtime.test.js` - bestanden
- `node test/event-shop-transaction-runtime.test.js` - bestanden
- `node test/climate-runtime-sync.test.js` - bestanden
- `node test/coin-shop-runtime-fix.test.js` - bestanden
- `node test/insufficient-coins-flow-runtime.test.js` - bestanden
- `node test/coin-economy-source-regression.test.js` - bestanden
- `node test/coin-pack-catalog-adapter.test.js` - bestanden
- `node test/reward-runtime-modes.test.js` - bestanden
- `node test/storage-profile-run-migration.test.js` - bestanden
- `node test/service-worker-shell-assets.test.js` - bestanden
- `node dev/run-event-v2-release-gate-snapshot.js` - bestanden, Gate: `go`
- `node dev/run-event-v2-final-assets-audit.js` - bestanden
- `node dev/run-ui-animation-marker-audit-smoke.js` - bestanden

## Testergebnisse

Die Kern-Release-Gates fuer Event V2, Smoke-Flows, i18n, UI-Architektur, Service Worker Shell und Resume-Reconciliation sind gruen.

Der Event-V2-Release-Gate-Snapshot meldet:

- `gate: go`
- Browser/Mobile/Reload Coverage: true
- keine Blocker
- keine Warnings
- bekannte nicht-kritische Noise: `service-worker-register-log`, `dev-404-resource-log`

Nicht gruen:

- `npm run test:runtime` - haengt bei `test/time-system-runtime.test.js`; Sammellauf wurde beendet.
- `node test/encoding-utf8-regression.test.js` - fehlgeschlagen wegen bestehenden Mojibake-/Replacement-Markern.

## Finale Release-Einschaetzung

`caution`

Die App ist nach den Fixes stabiler und die Event-V2-Release-Gates sind gruen. Fuer einen kontrollierten Pre-Release/Testflight ist der Stand vertretbar. Fuer einen breiten Onlinegang sollten vorher mindestens der Encoding-Guard und der haengende Time-System-Runtime-Test separat geklaert werden.

