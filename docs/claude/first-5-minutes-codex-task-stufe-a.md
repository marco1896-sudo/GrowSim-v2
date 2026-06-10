# Codex-Task — First 5 Minutes, Stufe A (First-Run-Sequenz als Gerüst)

> Abgeleitet aus `docs/claude/first-5-minutes-konzept.md`, Stufe A.
> Bewusst klein und bounded. Nur UI-/Flow-Zustand, **keine** Simulations-, Event- oder Savegame-Logik-Änderung.

## Goal
Einen reduzierten **First-Run-Einstieg** als Zustand der bestehenden App hinzufügen: (1) ein schlanker Hook-/Welcome-Screen mit Buddy und genau einem Primär-Button, (2) ein Minimal-Setup mit **einer** sichtbaren Auswahl (Pflanzenname oder eine von 2–3 vorkuratierten Starter-Genetiken) und kuratierten Defaults für den Rest, (3) Übergang in den bestehenden Homescreen. Es entsteht **kein** neuer Boot-Pfad und **keine** zweite UI — der First-Run ist ein vorgeschalteter Zustand vor dem normalen Setup.

## Context
GrowSimulator ist eine mobile-first PWA. Neue Spieler sollen in <90s eine benannte/gewählte Pflanze haben, ohne Account-Wall und ohne vollen 6-Schritt-Setup-Wizard. Das volle Setup (Container, Substrat, Genetik, Licht, Environment, Difficulty) bleibt für spätere Runs/erfahrene Spieler unverändert erhalten. Diese Stufe baut nur das Gerüst; die erste Care-Entscheidung (Stufe B) und der Cliffhanger (Stufe C) sind **nicht** Teil dieser Aufgabe.

## Files to Inspect (zuerst lesen, nicht raten)
- `app.js`, `ui.js` — App-Startpfad, Guest-Mode-Einstieg, bestehender Onboarding-Aufruf.
- Bestehender Onboarding-/Setup-Code (über `test/ui-onboarding-settings-smoke.test.js` auffindbar) — wie wird Setup heute aufgerufen und welche Werte schreibt es in den Save?
- `src/gameplay/dailyCareSelection.js` und `src/ui/state/menuUiPresentation.js` — nur zum Verständnis des Homescreen-Übergangs, **nicht** ändern.
- i18n-Quellen/Keys (über `scripts/i18n-audit.js` auffindbar) — bestehende Key-Struktur, um additiv `onboarding.first5.*` zu ergänzen.
- Buddy-Short-Check-Komponente — für die 1–2 Buddy-Sätze.

## Allowed Changes
- Neuer First-Run-Welcome-/Hook-Zustand (schlank: Atmosphäre-Container + Buddy-Auftritt + 1 Primär-Button „Los geht's" + kleiner sekundärer „Anmelden"-Link, der nur den **bestehenden** Login öffnet).
- Reduzierter First-Run-Setup-Schritt mit **einer** Auswahl; alle übrigen Setup-Werte werden mit kuratierten, **gültigen, normalen** Defaults belegt und über den **bestehenden** Setup-/Save-Pfad geschrieben.
- Additive i18n-Keys unter neuem Namespace `onboarding.first5.*` in **allen** vorhandenen Sprachen (DE/EN/ES), mit Buddy-Texten gemäß Konzept.
- Verdrahtung: First-Run-Zustand wird nur dann gezeigt, wenn noch kein Run/Save existiert (Erst-Spieler); danach normaler Pfad.

## No-Go Areas
- **Kein** Rewrite oder Eingriff in Eventsystem V2.
- **Keine** Änderung der Savegame-Struktur oder Migrationen — der First-Run schreibt in dieselbe Save-Form wie ein normaler Run.
- **Kein** neuer App-Startpfad / Boot-Pfad; Guest-Mode-Verhalten bleibt unverändert.
- **Keine** Änderung an Service Worker / PWA-Cache-Strategie.
- **Keine** neuen Dependencies.
- **Keine** Integration unfertiger generierter Plant-Assets — nur bereits freigegebene Visuals.
- **Keine** Änderung an Coin-/Reward-/Progression-/Monetization-Balancing.
- **Keine** Umstrukturierung bestehender i18n-Keys (nur additiv).
- **Keine** Tests entfernen oder abschwächen.

## Required Steps
1. Startpfad und bestehenden Onboarding-/Setup-Aufruf in `app.js`/`ui.js` lesen und dokumentieren, welche Werte das normale Setup in den Save schreibt.
2. Bedingung „Erst-Spieler / kein vorhandener Save" identifizieren und als Gate für den First-Run-Zustand nutzen.
3. Hook-/Welcome-Zustand hinzufügen (1 Button + sekundärer Login-Link auf bestehenden Login).
4. Reduzierten Setup-Schritt mit **einer** Auswahl bauen; kuratierte Defaults definieren und über den bestehenden Setup-/Save-Pfad anwenden.
5. Additive i18n-Keys `onboarding.first5.*` in DE/EN/ES ergänzen.
6. Übergang in den bestehenden Homescreen nach Abschluss sicherstellen.

## Verification
- `npm run check:syntax`
- `npm run check:i18n` (alle neuen Keys in allen Sprachen vorhanden, Audit grün)
- `npm run test:smoke` (insb. `ui-onboarding-settings-smoke` muss grün bleiben)
- Manuell/Smoke: frischer Guest-Start → Hook → 1 Auswahl → Homescreen mit gültigem Save; vorhandener Save → normaler Pfad unverändert.

## Completion Report Format
- **Completed:** kurze Zusammenfassung
- **Changed Files:** Liste geänderter Dateien
- **Verification:** ausgeführte Kommandos und Ergebnisse
- **Risks / Notes:** Unsicherheiten / mögliche Seiteneffekte (insb. Startpfad, Save, i18n)
- **Suggested Next Step:** ein nächster Task (erwartet: Stufe B — First Decision)
