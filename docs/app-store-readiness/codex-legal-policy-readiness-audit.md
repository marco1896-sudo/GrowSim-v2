# Codex Legal / Policy Readiness Audit

## Ausgangslage

- Die Gastmodus-, Store-Text- und Mobile-UX-Abschlussrunden wurden bereits umgesetzt.
- Gastmodus ist Standard, lokales Spielen funktioniert ohne Pflicht-Login.
- Cloud Sync, Account, Leaderboard, verifizierte Ergebnisse und Erinnerungen sind als optionale Zusatzfunktionen angelegt.
- Die App enthaelt sichtbare Datenschutz- und Impressumsflaechen in `index.html`.

## Ziel des Audits

- Pruefen, ob Datenschutz-, Impressums-, Cloud-, Gastmodus- und Reminder-Texte zum aktuellen Produktverhalten passen.
- Oeffentliche Textflaechen auf Platzhalter, falsche Login-Pflicht-Sprache und ueberzogene Cloud-Versprechen pruefen.
- Kleine eindeutige Konsistenzprobleme beheben, ohne neue Features oder Architektur-Aenderungen einzufuehren.
- Offene juristische Restpunkte klar fuer eine externe oder manuelle Endpruefung dokumentieren.

## Gepruefte Datenschutzflaechen

- `index.html`
  - Datenschutz-Sheet mit Angaben zu lokalem Spielen ohne Konto
  - Hinweis auf lokale Speicherung via `LocalStorage` und/oder `IndexedDB`
  - Hinweis, dass lokale Spielstaende beim Loeschen von Browserdaten verloren gehen koennen
  - Hinweis, dass optionale Cloud-Funktionen ausgewaehlte Daten zusaetzlich auf Servern speichern koennen
  - Kontaktadresse fuer Datenschutzfragen vorhanden
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`

## Gepruefte Impressumsflaechen

- `index.html`
  - eigenes Impressums-Sheet vorhanden
  - Anbietername, Postanschrift und E-Mail sind sichtbar eingetragen
  - kein sichtbarer Platzhalter wie `TODO`, `TBD` oder `Weitere Infos folgen` gefunden
- Menue-Verlinkung zu Impressum und Datenschutz ist vorhanden

## Gepruefte Cloud-/Account-/Gastmodus-Texte

- `index.html`
  - Gastmodus wird nicht als Cloud-Sicherung dargestellt
  - lokales Spielen ohne Konto wird mehrfach klar kommuniziert
  - `Cloud Sync bleibt optional` ist im eingeloggten Zustand sauber formuliert
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `src/auth/auth.js`
  - Account-Endpunkte sind vorhanden
  - Account bleibt technisch Zusatzfunktion, kein Zwang fuer lokalen Start
- `storage.js`
  - lokaler Save bleibt der Fallback
  - Remote-Sync ist auth-abhaengig und faellt ohne Auth sauber zurueck

## Gepruefte Push-/Reminder-Texte

- `index.html`
  - Erinnerungen werden als optional beschrieben
  - Settings-Sheet erklaert den Status ohne Pflichtcharakter
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `src/push/pushManager.js`
  - Push ist browser- und berechtigungsabhaengig
  - Push-Subscription ist an authentifizierte Kontonutzung gekoppelt
  - technisch werden keine unendlichen oder garantierten Reminder-Versprechen gemacht

## Gefundene Widersprueche

- Kein harter Widerspruch gefunden, bei dem Login wieder wie Pflicht fuer lokales Spielen wirkt.
- Kein harter Widerspruch gefunden, bei dem Cloud Sync als Pflicht oder garantiertes Backup dargestellt wird.
- Kein harter Widerspruch gefunden, bei dem Datenschutztexte lokales Speichern verschweigen.
- Ein rechtlicher Vollstaendigkeitsrest bleibt offen:
  - die sichtbaren Texte erklaeren das Verhalten plausibel, aber nicht alle juristisch relevanten Detailfragen sind final ausformuliert.

## Behobene Textprobleme

- Kein neues sichtbares Legal-Textproblem in `index.html` musste inhaltlich umformuliert werden.
- Der oeffentliche Text-Readiness-Test wurde erweitert, damit kuenftig robuster geprueft wird:
  - lokaler Save-Risiko-Hinweis vorhanden
  - Cloud Sync als optional beschrieben
  - keine offensichtlichen Platzhalter in den sichtbaren Legal-Flaechen
- Der neue Guardrail wurde dabei auf die sichtbaren Legal-Flaechen begrenzt, damit rohe Locale-Keys keine False Positives ausloesen.

## Geaenderte Dateien

- `test/public-text-readiness.test.js`
- `docs/app-store-readiness/codex-legal-policy-readiness-audit.md`

## Tests

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/menu-ui-presentation.test.js`
- `node test/push-ui-presentation.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`
- `node test/encoding-utf8-regression.test.js`

## Testergebnisse

- Alle oben genannten Checks waren in diesem Audit-Durchlauf gruen.
- `node dev/run-event-v2-release-gate-snapshot.js` lieferte `gate: go`.
- Keine neue i18n-Regressionsspur fuer die geprueften Gastmodus-, Cloud- und Reminder-Texte gefunden.
- Keine sichtbaren Legal-Placeholder in den geprueften Privacy-/Impressum-Flaechen gefunden.

## Offene rechtliche TODOs fuer Marco

- Vollstaendige juristische Endpruefung von Impressum und Datenschutztext extern oder manuell durchfuehren.
- Pruefen, ob die sichtbaren Anbieterangaben fuer das konkrete Release-Land, Vertriebsmodell und die tatsaechliche Betreiberrolle vollstaendig und korrekt sind.
- Hosting-/Serverstandort und beteiligte technische Dienstleister klar dokumentieren, falls fuer Datenschutzangaben noetig.
- Konkretisieren, welche Account-, Cloud-, Leaderboard- und verifizierten Ergebnisdaten serverseitig verarbeitet, gespeichert oder uebertragen werden.
- Ein Loesch- und Auskunftskonzept fuer Account-/Cloud-Daten definieren.
- Pruefen, wie Push-/Reminder-bezogene Daten, Tokens oder Subscriptions datenschutzseitig beschrieben werden muessen.
- Supportkontakt und Datenschutzkontakt fuer das reale Release-Setup final gegenpruefen.
- Pruefen, ob ein zusaetzlicher Hinweis zur thematischen Einordnung der Simulation oder Alters-/Inhaltsklassifizierung fuer Stores sinnvoll oder noetig ist.

## App-Store-nahe TODOs

- Apple-/Google-Privacy-Formulare manuell mit den tatsaechlich erhobenen Datenkategorien ausfuellen.
- Store-Metadaten gegen Pflicht-Login-, Backup- und Sync-Versprechen pruefen, damit keine staerkeren Zusagen als in der App gemacht werden.
- Pruefen, ob DE-only-Rechtstexte fuer die anvisierten Stores und Zielmaerkte ausreichen oder ob zusaetzliche lokalisierte Rechtstexte noetig sind.
- Falls Cloud-/Push-Infrastruktur vor Release noch geaendert wird, Datenschutz- und Store-Texte danach erneut spiegeln.

## Finale Einschaetzung

`caution`

Technisch ist der aktuelle Stand fuer den Release-Kanal weitgehend bereit:

- lokales Spielen ohne Konto wird konsistent kommuniziert
- Cloud Sync bleibt optional
- der lokale Speicherverlust bei geloeschten Browserdaten wird erklaert
- Reminder/Push werden als optionale, browserabhaengige Zusatzfunktion dargestellt
- die technische Regression-Strecke bleibt gruen

Juristische Endfreigabe bleibt jedoch offen:

- dieses Audit ist keine Rechtsberatung
- sichtbare Texte wirken konsistent, aber nicht als abschliessend extern geprueft
- App-Store-Datenschutzangaben und rechtliche Vollstaendigkeit muessen vor dem finalen Store-Release noch manuell oder extern abgesichert werden

Kurzform:

`technisch bereit, juristische Endfreigabe offen`
