# Phase 163 - Resolve Flow Target Experience (No Write Planning)

## Zielbild (späterer Nutzerfluss)
1. Event erscheint (echte Runtime) oder Candidate wird im Dev/Test-Kontext ausgewählt.
2. Event-Detail öffnet mit Bild, Titel, Diagnose, Ursache und Kontext.
3. Nutzer sieht mögliche Reaktionen (2-3 klare Optionen).
4. Nutzer wählt eine Option.
5. App zeigt Feedback (gut/neutral/schlecht) inkl. Begründung und Lernhinweis.
6. Später (außerhalb Phase 163) werden Konsequenzen angewendet.
7. Event wird danach sauber geschlossen und in History/Telemetry geführt.

## Detail-Inhalte im Zielbild
- Hero-Bild / Eventbild
- Titel + kurzer Symptomtext
- Diagnose-Bereich
- "Warum dieser Hinweis erscheint"
- Optionen mit klaren Labels
- Feedback-Kachel nach Auswahl
- Lernhinweis / Coaching-Text

## Wichtige Grenzen in Phase 163
- Planungsphase, keine Aktivierung.
- Keine echte Auswahl-Implementierung.
- Keine Save-/Runtime-Mutation.
- Keine Rewards/Missions/Notifications.
