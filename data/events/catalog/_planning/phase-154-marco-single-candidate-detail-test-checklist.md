# Phase 154 - Marco Single Candidate Detail Test Checklist

## 1. Vorbereitung
- Lokale App starten.
- Dev/Test Guard aktivieren (`gs_event_v2_dev_preview=unlock`).
- Event V2 Dev Preview oeffnen.
- Event-Center Candidate Context oeffnen.
- Einen Candidate anklicken, um die Detailansicht zu oeffnen.

## 2. Sichtpruefung
- Laedt das Detailbild sofort und ohne Platzhalterfehler?
- Sind Titel und Event-ID klar lesbar?
- Ist der Fixture-Kontext sichtbar?
- Sind Score und Reason verstaendlich dargestellt?
- Sind Diagnose/Why-it-matters/Observation-Hint sichtbar?
- Sind Safety Labels sichtbar?
  - Dev/Test
  - Candidate Only
  - No Write
  - No Resolve
  - No Gameplay Activation
- Ist das Layout auf 360/390/430/768 sauber lesbar?

## 3. Bedienung
- Candidate antippen -> Detail oeffnet.
- "Zurueck" funktioniert.
- "Schliessen" funktioniert.
- Zur Liste zurueckkehren und einen anderen Candidate oeffnen.
- Keine Resolve-/Apply-/Trigger-/Reward-Buttons sichtbar.

## 4. Inhaltliche Pruefung
- Fuehlt sich die Karte wie ein spaeteres Event-Detail an?
- Ist klar erkennbar, dass es nur Preview ist?
- Ist der Lern-/Diagnosewert hilfreich?
- Wirkt der Score technisch nuetzlich oder zu technisch fuer Tester?
- Wirkt das Eventbild passend zum Inhalt?

## 5. Safety-Pruefung
- Kein Resolve.
- Kein Apply.
- Kein Reward.
- Keine Coins/XP-Reaktion.
- Keine Missionsaenderung.
- Keine Notification.
- Kein sichtbarer Save-Effekt.
- Kein echter Event wird ausgeloest.

## 6. Abschlussentscheidung
- Reicht die Detailansicht fuer den naechsten Flow-Schritt (List -> Detail)?
- Welche UI-Polish-Punkte sind offen?
- Ist der VPD-Watch stoerend oder nur Beobachtung?
- Freigabe fuer Phase 155: Candidate List -> Detail Flow (No Resolve)?
