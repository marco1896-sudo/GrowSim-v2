# Grow Simulator – Gameplay Activity Layer Concept

## Zweck

Der Gameplay Activity Layer soll Grow Simulator von einer technischen Grow-Simulation stärker in Richtung eines lebendigen Mobile-Games entwickeln.

Das Ziel ist nicht, bestehende Systeme zu ersetzen, sondern vorhandene Systeme wie Missionen, Buddy, Coins, Events V2, Pflanzenwerte, Zeitboost und Nacht überspringen sinnvoll miteinander zu verbinden.

Der Spieler soll beim Öffnen der App täglich das Gefühl haben:

> Heute ist etwas passiert. Ich habe Aufgaben. Buddy bewertet die Lage. Ich kann entscheiden, handeln, Coins einsetzen und Fortschritt machen.

---

## Produktziel

Grow Simulator soll einen klaren täglichen Spielkreislauf erhalten.

Der Gameplay Activity Layer soll:

- tägliche Abwechslung erzeugen
- Rückkehrmotivation erhöhen
- Buddy stärker als Begleiter etablieren
- Coins sinnvoller machen
- Entscheidungen mit Konsequenzen ermöglichen
- Wochenziele und Fortschritt schaffen
- Zeitboost und Nacht überspringen spielerisch einbinden
- Monetarisierung später natürlicher vorbereiten

---

## Core Loop

```text
App öffnen
↓
Buddy-Tagescheck lesen
↓
Tagesaufgaben ansehen
↓
Pflanzenzustand prüfen
↓
gegebenenfalls Entscheidung treffen
↓
Aktionen ausführen
↓
Belohnungen erhalten
↓
Wochenfortschritt erhöhen
↓
Coins einsetzen oder sparen
↓
nächster Spieltag
```

---

## Aktueller Kontext

Grow Simulator besitzt bereits:

- Pflanzen-Simulation
- Wachstumsphasen
- Wasser-, Nährstoff-, Stress- und Risiko-Werte
- Events V2
- Missionen
- Coins
- Buddy-Coach
- Zeitboost
- Nacht überspringen
- Gastmodus / Save-State
- PWA-Struktur
- i18n
- Tests

Der Gameplay Activity Layer soll auf diesen Systemen aufbauen.

---

## Problem, das gelöst werden soll

Aktuell gibt es viele starke Systeme, aber noch zu wenig täglichen Spielreiz.

Typische Schwächen:

- tägliche Aufgaben können sich wiederholen
- Coins haben noch zu wenig Bedeutung
- Buddy kommentiert noch nicht genug den Spieltag
- Zeitboost und Nacht überspringen sind noch nicht stark genug ins Gameplay eingebunden
- Events wirken eher als Einzelereignisse statt als Teil eines täglichen Loops
- Nutzer haben noch zu wenig Grund, täglich zurückzukommen

---

## Hauptmodule

## 1. Daily Tasks

Pro Spieltag sollen maximal 3 passende Tagesaufgaben aktiv sein.

Daily Tasks sollen abhängig sein von:

- Spieltag
- Wachstumsphase
- Wasserwert
- Nährstoffwert
- Stresswert
- Risikowert
- aktiven Events
- vorherigen Aufgaben

Beispiele:

- Wasserstand prüfen
- Nährstofflevel stabilisieren
- Stress unter 50 halten
- Risiko reduzieren
- Diagnose durchführen
- Klima stabil halten
- Blütephase beobachten
- Tag ohne kritischen Fehler abschließen

Regeln:

- maximal 3 aktive Tasks pro Spieltag
- Wiederholungen vermeiden
- Aufgaben müssen zum Spielzustand passen
- Rewards dürfen nicht doppelt vergeben werden
- Reload darf keine abgeschlossenen Aufgaben erneut auslösen
- bestehende Missionen dürfen nicht ersetzt oder beschädigt werden

---

## 2. Weekly Missions

Weekly Missions sollen mittelfristige Ziele schaffen.

Beispiel:

```text
Woche 1: Stabile Startphase
- Wasser an 5 Tagen im Zielbereich halten
- Stress unter 50 halten
- 3 Tagesaufgaben abschließen
Belohnung: Coins + Buddy-Lob + kleiner Stabilitätsbonus
```

Beispiel:

```text
Woche 4: Stretch kontrollieren
- Lichtstress vermeiden
- 5 Tagesaufgaben abschließen
- 2 Risiken reduzieren
Belohnung: Coins + Zeitboost-Vorteil
```

Regeln:

- Wochenmissionen laufen über mehrere Spieltage
- Fortschritt muss reload-sicher gespeichert werden
- keine doppelte Belohnung
- bestehende Missionen nicht ersetzen
- Wochenmissionen sollen den täglichen Loop unterstützen

---

## 3. Buddy Daily Check

Buddy soll pro Spieltag einen passenden Kommentar geben.

Buddy bewertet:

- Nachtverlauf
- Pflanzenzustand
- kritische Werte
- aktive Tagesaufgaben
- Risiken
- mögliche Zeitboost-Sicherheit

Beispiele:

```text
Die Nacht war stabil. Wasser sieht gut aus, aber die Luftfeuchtigkeit war kurz erhöht.
```

```text
Heute lieber keine große Düngung. Die Pflanze wirkt leicht gestresst.
```

```text
Guter Lauf. Drei Tage ohne kritisches Risiko. Genau so weiter.
```

Regeln:

- maximal ein Daily Check pro Spieltag
- nach Reload nicht erneut störend öffnen
- Kommentar muss zum Zustand passen
- bestehende Buddy-Dialoge nicht ersetzen
- Buddy soll vom reinen Erklärer stärker zum täglichen Begleiter werden

---

## 4. Decision Cards

Decision Cards sind kleine situationsbasierte Entscheidungen.

Beispiel:

```text
Die Luftfeuchtigkeit war über Nacht erhöht.
Was möchtest du tun?

A) Umluft erhöhen
B) Erstmal beobachten
C) Leicht auslichten
```

Mögliche Effekte:

```text
A) Schimmelrisiko sinkt, Stress steigt leicht
B) Risiko bleibt erhöht
C) Risiko sinkt stärker, Stress steigt etwas mehr
```

Regeln:

- maximal eine Decision Card pro Spieltag
- nur bei passenden Bedingungen
- Effekte klein und nachvollziehbar
- Events V2 nicht ersetzen
- reload-sicher speichern
- keine schweren negativen Effekte im MVP
- Decision Cards sollen Lernen durch Entscheidung ermöglichen

---

## 5. Coin Actions

Coins sollen sinnvoller einsetzbar werden.

Mögliche Coin Actions:

- Buddy-Tipp kaufen
- Schnell-Diagnose starten
- Zusatzmission freischalten
- kleiner Recovery-Bonus
- Zeitboost absichern
- Tagesbelohnung leicht verbessern

Regeln:

- kein Pay-to-win
- keine harten Paywalls
- Coins geben Komfort und Zusatzoptionen
- Käufe müssen reload-sicher sein
- Coins dürfen nicht doppelt abgezogen oder vergeben werden
- Rewarded Ads können später daran andocken, werden aber im MVP nicht direkt eingebaut

---

## 6. Zeitboost und Nacht überspringen

Zeitboost und Nacht überspringen sollen durch den Gameplay Activity Layer bewertet werden.

Beispielbedingungen für sicheren Zeitboost:

```text
Wasser > 50
Stress < 60
kein kritisches Event aktiv
Risiko nicht hoch
Pflanze nicht in kritischer Phase
```

Buddy kann dann sagen:

```text
Sieht stabil aus. Du kannst die nächsten Stunden sicher beschleunigen.
```

Oder:

```text
Ich würde die Nacht nicht überspringen. Das Risiko ist gerade zu hoch.
```

Regeln:

- Zeitboost bleibt möglich
- Gameplay Layer gibt Empfehlung oder Warnung
- später können Coin Actions oder Belohnungen daran anknüpfen
- keine riskante Änderung am bestehenden Zeit-System ohne Analyse

---

## Vorgeschlagene technische Struktur

Empfohlene Modulstruktur:

```text
js/gameplay/
  gameplay-engine.js
  gameplay-state.js
  gameplay-selectors.js
  daily-tasks.js
  weekly-missions.js
  decision-cards.js
  coin-actions.js
  buddy-gameplay-lines.js
  gameplay-rewards.js
```

Falls die bestehende Projektstruktur anders ist, soll die risikoärmste passende Struktur gewählt und dokumentiert werden.

---

## Verantwortlichkeiten der Module

## gameplay-engine.js

Zentrale Steuerung des neuen Layers.

Aufgaben:

- neuen Spieltag erkennen
- Daily Tasks erzeugen
- Buddy Daily Check auswählen
- Decision Cards prüfen
- Wochenfortschritt aktualisieren
- Coin Actions bewerten
- Zeitboost-Sicherheit bewerten

---

## gameplay-state.js

Verwaltet den State des Gameplay Activity Layers.

Beispiel:

```js
{
  currentGameplayDay: 24,
  activeDailyTasks: [],
  completedDailyTasks: [],
  activeWeeklyMission: null,
  completedWeeklyMissions: [],
  shownDecisionCards: [],
  answeredDecisionCards: [],
  lastBuddyDailyCheck: null,
  coinActionHistory: []
}
```

---

## gameplay-selectors.js

Liest bestehende Spielwerte risikoarm aus.

Aufgaben:

- Pflanzenphase bestimmen
- Wasserstatus lesen
- Nährstoffstatus lesen
- Stressstatus lesen
- Risikostatus lesen
- aktive Events erkennen
- sichere Zeitboost-Bewertung vorbereiten

Dieses Modul soll möglichst keine Werte verändern, sondern nur lesen und normalisieren.

---

## daily-tasks.js

Katalog und Auswahlregeln für Tagesaufgaben.

Beispielstruktur:

```js
{
  id: "daily_water_check",
  titleKey: "gameplay.daily.water_check.title",
  descriptionKey: "gameplay.daily.water_check.description",
  phases: ["seedling", "veg", "flower"],
  conditions: {
    minDay: 1,
    maxDay: 84
  },
  successCheck: {
    stat: "water",
    operator: ">=",
    value: 50
  },
  reward: {
    coins: 20,
    stability: 1
  }
}
```

---

## weekly-missions.js

Katalog und Fortschrittslogik für Wochenmissionen.

Aufgaben:

- Wochenziele definieren
- Fortschritt aus Daily Tasks und Spielwerten ableiten
- Belohnungen vorbereiten
- abgeschlossene Wochenmissionen speichern

---

## decision-cards.js

Katalog für Entscheidungssituationen.

Beispielstruktur:

```js
{
  id: "high_humidity_response",
  titleKey: "gameplay.decisions.high_humidity.title",
  descriptionKey: "gameplay.decisions.high_humidity.description",
  trigger: {
    phase: ["flower", "ripening"],
    humidityRisk: "high"
  },
  options: [
    {
      id: "increase_airflow",
      labelKey: "gameplay.decisions.options.increase_airflow",
      effects: {
        moldRisk: -8,
        stress: 2
      }
    },
    {
      id: "wait",
      labelKey: "gameplay.decisions.options.wait",
      effects: {
        moldRisk: 5
      }
    }
  ]
}
```

---

## coin-actions.js

Definiert optionale Coin-Ausgaben.

Beispielstruktur:

```js
{
  id: "buy_buddy_tip",
  cost: 25,
  availableWhen: {
    hasActiveDailyTasks: true
  },
  effect: {
    revealHint: true
  }
}
```

---

## buddy-gameplay-lines.js

Katalog für Buddy-Kommentare.

Kategorien:

```text
morning_stable
morning_warning
stress_high
water_low
nutrients_low
flower_focus
risk_high
boost_safe
boost_unsafe
mission_completed
weekly_completed
```

---

## gameplay-rewards.js

Zentrale Stelle für Rewards.

Aufgaben:

- Coin-Rewards berechnen
- doppelte Rewards verhindern
- kleine Stabilitäts- oder Fortschrittsboni vorbereiten
- bestehendes Coin-System nur kontrolliert nutzen

---

## Save-State-Anforderungen

Der Gameplay Activity Layer benötigt eigenen State.

Wichtig:

- alte Saves dürfen nicht brechen
- fehlender Gameplay-State muss automatisch initialisiert werden
- Reload darf keine Rewards doppeln
- Guest-Mode muss stabil bleiben
- Cloud-Sync-Shape beachten
- abgeschlossene Tasks und ausgezahlte Rewards müssen eindeutig gespeichert werden
- Decision Cards dürfen nach Reload nicht erneut ausgeführt werden

---

## i18n-Anforderungen

Neue Texte sollen nicht hart im Code stehen.

Benötigt werden i18n-Keys für:

- Daily Task Titel
- Daily Task Beschreibungen
- Weekly Mission Titel
- Weekly Mission Beschreibungen
- Buddy Daily Checks
- Decision Card Titel
- Decision Card Beschreibungen
- Decision Card Optionen
- Decision Card Ergebnisse
- Coin Actions
- UI-Labels

---

## UI-MVP

Die erste sichtbare Version soll minimal sein.

### Homescreen-Karte

```text
Heute im Growroom

Buddy:
„Die Nacht war stabil, aber die Luftfeuchtigkeit war kurz erhöht.“

Tagesaufgaben:
[ ] Wasserstand prüfen
[ ] Stress unter 50 halten
[ ] Risiko reduzieren
```

### Missionen-Bereich

Optional später:

```text
Täglich | Wöchentlich | Bonus | Abgeschlossen
```

### Decision Card

```text
Situation: Hohe Luftfeuchtigkeit

Was möchtest du tun?

[Umluft erhöhen]
[Abwarten]
[Leicht auslichten]
```

---

## Bewertungslogik für Tagesauswahl

Die Auswahl der Tagesaufgaben soll nicht rein zufällig sein.

Empfohlene Logik:

```text
1. Phase bestimmen
2. kritische Werte prüfen
3. passende Pflichtaufgabe wählen
4. eine allgemeine Pflegeaufgabe wählen
5. eine Bonus-/Lernaufgabe wählen
6. Wiederholungen der letzten Tage vermeiden
```

Beispiel:

```text
Wenn Wasser niedrig:
- daily_water_check priorisieren

Wenn Stress hoch:
- daily_stress_control priorisieren

Wenn Blüte + Feuchterisiko:
- daily_flower_humidity_control priorisieren

Wenn alles stabil:
- Bonusaufgabe oder Wochenfortschritt wählen
```

---

## Erste Daily Task Kandidaten

### Allgemeine Aufgaben

```text
daily_water_check
daily_nutrient_check
daily_stress_control
daily_risk_control
daily_diagnosis
daily_stable_day
daily_phase_observation
daily_buddy_tip_read
```

### Keimling / frühe Phase

```text
daily_seedling_no_overwater
daily_seedling_stable_climate
daily_seedling_low_stress
```

### Wachstum

```text
daily_veg_growth_focus
daily_veg_nutrients_balanced
daily_veg_light_check
daily_veg_training_recovery
```

### Blüte

```text
daily_flower_humidity_control
daily_flower_mold_risk_reduce
daily_flower_nutrient_balance
daily_flower_stress_avoidance
```

### Reifephase

```text
daily_ripening_harvest_window_check
daily_ripening_low_stress
daily_ripening_final_observation
```

---

## Erste Decision Card Kandidaten

## 1. Hohe Luftfeuchtigkeit

Trigger:

```text
- Phase flower oder ripening
- Risiko für Feuchte/Schimmel erhöht
```

Optionen:

```text
A) Umluft erhöhen
B) Abwarten
C) Leicht auslichten
```

Effekte:

```text
A) Risiko runter, kleiner Energie-/Stress-Nachteil
B) Risiko bleibt oder steigt leicht
C) Risiko stärker runter, Stress leicht hoch
```

---

## 2. Niedriger Wasserstand

Trigger:

```text
- Wasser niedrig
```

Optionen:

```text
A) Normal gießen
B) Stark gießen
C) Noch warten
```

Effekte:

```text
A) Wasser steigt moderat
B) Wasser steigt stark, Überwässerungsrisiko leicht hoch
C) Stress steigt
```

---

## 3. Leichte Überdüngung

Trigger:

```text
- Nährstoffe hoch
- Stress leicht erhöht
```

Optionen:

```text
A) Nur Wasser geben
B) Weiter düngen
C) Spülen
```

Effekte:

```text
A) Nährstoffdruck sinkt leicht
B) Risiko steigt
C) Nährstoffe sinken deutlich, Stress kurzfristig leicht hoch
```

---

## 4. Lichtstress

Trigger:

```text
- Lichtstress oder hoher Stress bei starker Lichtphase
```

Optionen:

```text
A) Lampe dimmen
B) Abstand erhöhen
C) Ignorieren
```

Effekte:

```text
A) Stress runter, Wachstum minimal langsamer
B) Stress runter
C) Stress/Risiko hoch
```

---

## 5. Stretch außer Kontrolle

Trigger:

```text
- Stretchphase
- Höhen-/Wachstumsrisiko erhöht
```

Optionen:

```text
A) sanft trainieren
B) wachsen lassen
C) stark eingreifen
```

Effekte:

```text
A) Kontrolle besser, Stress leicht hoch
B) kein Stress, Platzrisiko steigt
C) Platzrisiko runter, Stress deutlich hoch
```

---

## Risiken

Besonders empfindliche Bereiche:

- Events V2
- app.js
- bestehendes Mission-System
- Coin-Rewards
- Save-State
- Guest-Mode-Reload
- Cloud-Sync
- Zeitboost
- Nacht überspringen
- i18n-Audit
- mobile UI

Diese Bereiche dürfen nicht ohne vorherige Analyse großflächig verändert werden.

---

## Guardrails

Für alle Claude-Code-Phasen gelten:

```text
- Events V2 nicht refactoren.
- app.js nur minimal und gezielt anfassen.
- Bestehende Missionen nicht entfernen.
- Coin-Vergabe nicht doppeln.
- Save-State nicht brechen.
- Guest-Mode-Reload nicht beschädigen.
- Cloud-Sync-Shape beachten.
- Neue Texte über i18n vorbereiten.
- Tests ergänzen.
- Jede Phase mit Ergebnisbericht abschließen.
- Bei Unsicherheit dokumentieren, nicht raten.
```

---

## MVP-Phasenplan

## Phase 0: Konzeptdatei

Diese Datei ins Repository legen:

```text
docs/gameplay-activity-layer-concept.md
```

Noch keine Produktivänderungen.

---

## Phase 1: Analyse

Ziel:

Bestehende Systeme analysieren und Integrationsplan erstellen.

Zu prüfen:

- Missionen
- Daily Tasks
- Coins
- Buddy
- Events V2
- Zeitboost
- Nacht überspringen
- Save-State
- Guest-Mode
- Cloud-Sync
- Tests
- i18n

Ergebnis:

```text
docs/gameplay-activity-layer-analysis.md
```

---

## Phase 2: Daily Task Layer

Ziel:

Isolierter Daily Task Layer.

Umfang:

- 15–20 Daily Tasks
- maximal 3 Tasks pro Spieltag
- Wiederholschutz
- Save-State
- einfache Rewards
- Tests
- minimale UI-Anbindung

Ergebnis:

```text
docs/gameplay-activity-layer-phase-2-daily-tasks-report.md
```

---

## Phase 3: Buddy Daily Check

Ziel:

Buddy gibt pro Spieltag einen passenden Tageskommentar.

Umfang:

- 25–40 Buddy-Zeilen
- Zustandserkennung
- Save-State
- i18n
- minimale UI-Anbindung
- Tests

Ergebnis:

```text
docs/gameplay-activity-layer-phase-3-buddy-report.md
```

---

## Phase 4: Decision Cards

Ziel:

Kleine situationsbasierte Entscheidungen.

Umfang:

- 5–10 Decision Cards
- Triggerlogik
- kleine Effekte
- Save-State
- Ergebnisanzeige
- Tests

Ergebnis:

```text
docs/gameplay-activity-layer-phase-4-decision-cards-report.md
```

---

## Phase 5: Weekly Missions und Coin Actions

Ziel:

Mittelfristige Ziele und sinnvollere Coin-Nutzung.

Umfang:

- 3–5 Weekly Missions
- Fortschritt über mehrere Tage
- 3–5 Coin Actions
- Zeitboost-Bewertung vorbereiten
- Tests

Ergebnis:

```text
docs/gameplay-activity-layer-phase-5-weekly-coin-report.md
```

---

## Erfolgskriterien

Das Modul gilt als erfolgreich, wenn:

```text
- pro Spieltag passende Tagesaufgaben entstehen
- maximal 3 Daily Tasks aktiv sind
- Aufgaben nicht ständig identisch sind
- Buddy passend zum Zustand kommentiert
- Decision Cards nur situationsbasiert erscheinen
- Coins sinnvoller eingesetzt werden können
- Zeitboost und Nacht überspringen besser bewertet werden
- Rewards nicht doppelt vergeben werden
- Reload stabil bleibt
- Guest-Mode stabil bleibt
- Events V2 unbeschädigt bleibt
- bestehende Missionen weiter funktionieren
- Tests erfolgreich laufen
```

---

## Langfristiger Produktwert

Der Gameplay Activity Layer soll Grow Simulator produktseitig aufwerten.

Vorher:

```text
fortgeschrittene Grow-Simulation mit Spielansätzen
```

Nachher:

```text
spielbare Grow-Lern-App mit Daily Loop, Buddy-Begleitung, Entscheidungen, Fortschritt und Monetarisierungspotenzial
```

Erwartete Wirkung:

- höhere Rückkehrrate
- längere Sessions
- stärkerer Buddy-Markenwert
- bessere Präsentierbarkeit
- bessere Partner-/Investorwirkung
- bessere Grundlage für Rewarded Ads und Pro-Features
- mehr Content-Potenzial für Instagram
- klarerer Produktstatus als Early-Access-App

---

## Erster Claude-Cowork-Auftrag

```text
Lege die Konzeptdatei `docs/gameplay-activity-layer-concept.md` mit diesem Inhalt an.
Ändere keine Produktivdateien.
Führe keine Implementierung durch.
Erstelle danach nur einen kurzen Report, dass die Datei angelegt wurde.
```

---

## Zweiter Claude-Cowork-Auftrag

```text
Nutze `docs/gameplay-activity-layer-concept.md` als verbindliche Grundlage.

Analysiere danach das bestehende Missionen-, Coins-, Buddy-, Events-V2-, Zeitboost-, Nacht-überspringen- und Save-State-System.

Erstelle die Analyse in:

docs/gameplay-activity-layer-analysis.md

Noch keine Produktivänderungen.
```
