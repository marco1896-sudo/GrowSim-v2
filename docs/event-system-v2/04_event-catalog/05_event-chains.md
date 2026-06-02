# 05 — Event Chains (EC-01 – EC-10)
*Grow Simulator V2 · Event System V2 · schemaVersion 3*

---

## 1. Philosophie: Was ist eine Event-Kette?

Eine Event-Kette ist eine **mehraktige Erzählung**, die sich über mehrere Tage oder Grow-Phasen erstreckt. Im Gegensatz zu Einzelevents erzählen Ketten eine vollständige Ursache-Eskalation-Lösung-Nachwirkung-Geschichte.

**Was Ketten leisten, was Einzelevents nicht können:**
- Realistische Kausalität (Fehler hat Konsequenzen, die sich aufschichten)
- Spannungsaufbau mit echtem Entscheidungsgewicht
- Lerneffekt durch Wiederholung desselben Themas in verschiedenen Ausprägungen
- Emotionalen Abschluss statt „Event gelöst → weiter"

**Ketten-Typen:**
| Typ | Beschreibung | Beispiel |
|-----|--------------|---------|
| **Eskalations-Kette** | Ignorierter Fehler wächst zu Krise | EC-01 Overwatering Spiral |
| **Entdeckungs-Kette** | Unbekanntes Problem schrittweise aufdecken | EC-04 Nährstoff-Puzzle |
| **Rettungs-Kette** | Dramatische Erholung nach Beinaheverlust | EC-07 Pythium-Rettung |
| **Saisonale Kette** | Outdoor-Ereignisse über Wochen | EC-09 Outdoor-Saison |
| **Meister-Kette** | Komplexes Zusammenspiel mehrerer Systeme | EC-10 Der perfekte Grow |

---

## 2. Ketten-Datenstruktur

Jede Event-Kette besteht aus 3–5 Akten. Jeder Akt ist ein normales Event aus dem Katalog, das durch den `chainId`-Tag verknüpft ist.

**Chain-JSON-Schema:**
```json
{
  "chainId": "EC-01",
  "title": "Die Überwatering-Spirale",
  "description": "Chronisches Überwässern → Wurzelschaden → Nährstoffsperre → Notfall",
  "setup": "both",
  "stages": ["S2", "S3", "S4"],
  "acts": [
    {
      "actNumber": 1,
      "eventId": "W-B-01",
      "title": "Panik-Gießen",
      "trigger": "chain_start",
      "escalationFactor": 1.0
    },
    {
      "actNumber": 2,
      "eventId": "W-I-01",
      "title": "Überwatering manifest",
      "trigger": "act_1_unresolved_48h",
      "escalationFactor": 1.3
    },
    {
      "actNumber": 3,
      "eventId": "R-I-03",
      "title": "Wurzelzone unter Stress",
      "trigger": "act_2_unresolved_72h",
      "escalationFactor": 1.6,
      "severity": 4
    },
    {
      "actNumber": 4,
      "eventId": "N-B-03",
      "title": "Nährstoffsperre durch Sauerstoffmangel",
      "trigger": "act_3_active",
      "escalationFactor": 2.0,
      "severity": 5
    }
  ],
  "breakPoints": ["act_1", "act_2"],
  "chainResolution": {
    "success": "chain_broken_early",
    "partial": "chain_survived_act3",
    "fail": "plant_loss"
  },
  "knowledgeProfileBonus": {
    "watering": 0.25,
    "observation": 0.15
  },
  "coachSummary": "Du hast gelernt: Überwatering ist kein einzelner Fehler — es ist eine Gewohnheit, die sich aufschichtet.",
  "schemaVersion": 3
}
```

**Break-Points:** Momente, wo der Spieler die Kette noch stoppen kann. Je früher → desto größer der KnowledgeProfile-Bonus.

---

## 3. Die 10 Event-Ketten

---

### EC-01: Die Überwatering-Spirale

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-01 |
| **Titel** | Die Überwatering-Spirale |
| **Setup** | both |
| **Stages** | S2–S4 (Veg bis frühe Blüte) |
| **Dauer** | 5–10 Spieltage |
| **Schwere-Maximum** | 5 (Akt 4) |
| **Anker-Events** | W-B-01 → W-I-01 → R-I-03 → N-B-03 |
| **Lernkategorie** | Watering + Root Health |
| **Häufigkeit** | Sehr häufig bei Anfängern (hohe Trigger-Wahrscheinlichkeit) |

**Akt-Übersicht:**

```
Akt 1 (Tag 1–2): W-B-01 „Panik-Gießen"
  ↓ [Break-Point: korrekte Gießpause einhalten]
Akt 2 (Tag 3–5): W-I-01 „Überwatering manifestiert sich"
  ↓ [Break-Point: Substrat austrocknen lassen, Luftung erhöhen]
Akt 3 (Tag 6–8): R-I-03 „Wurzelzone sauerstoffarm"
  ↓ [Kein Break-Point mehr — Eingriff nötig]
Akt 4 (Tag 9–10): N-B-03 „Nährstoffsperre durch Wurzelschaden" (Schwere 5)
  → Auflösung: Flush + Trocknungsphase + Recovery-Monitoring
```

**Coach-Narration (Akt-zu-Akt):**
- Akt 1: „Die Pflanze sieht ein bisschen hängend aus — nicht immer Durst. Fühl mal den Topf."
- Akt 2: „Das Substrat ist noch nass. Schon zu lange. Die Wurzeln brauchen Luft."
- Akt 3: „Jetzt sehen wir das Ergebnis. Gelbe Blätter — aber nicht wegen Nährstoffen. Wegen nassen Wurzeln."
- Akt 4: „Das ist die Spirale. Jetzt braucht es einen sauberen Schnitt: Flush, abwarten, neu starten."

**KnowledgeProfile-Bonus bei frühem Break:**
- Break Akt 1: `watering +0.20`, `observation +0.10`
- Break Akt 2: `watering +0.15`, `observation +0.08`
- Akt 3/4 überlebt: `watering +0.25`, `root_health +0.15` (höchster Bonus — schwerste Lektion)

---

### EC-02: VPD-Achterbahn

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-02 |
| **Titel** | VPD-Achterbahn |
| **Setup** | indoor |
| **Stages** | S3–S6 |
| **Dauer** | 7–14 Spieltage |
| **Schwere-Maximum** | 4 (Akt 3) |
| **Anker-Events** | K-I-01 → K-I-02 → P-I-03 → B-I-02 |
| **Lernkategorie** | Klima/VPD + Pilzkrankheiten |

**Akt-Übersicht:**
```
Akt 1: K-I-01 „VPD zu hoch" (zu warm / zu trocken)
  ↓ [Break-Point: Luftfeuchtigkeit erhöhen, Temperatur senken]
Akt 2: K-I-02 „Gegensteuern übertrieben → VPD zu niedrig / Schimmelgefahr"
  ↓ [Break-Point: VPD-Fenster kalibrieren, Ventilation anpassen]
Akt 3: P-I-03 „Echter Mehltau" (Schwere 4 — feuchte Bedingungen)
  ↓ [Break-Point: Behandlung + Ventilation]
Akt 4: B-I-02 „Blüteprobleme durch Klimastress"
```

**Lernprinzip:** Die Kette demonstriert, dass Übergegensteuern genauso gefährlich ist wie das ursprüngliche Problem. VPD-Regulation ist ein Gleichgewicht, kein Ein/Aus-Schalter.

**Coach-Narration:**
- Akt 1: „Zu trocken. Gib der Luft mehr Feuchtigkeit — aber kontrolliert."
- Akt 2: „Jetzt ist es zu feucht. Pilze mögen das. Wir müssen das Fenster finden."
- Akt 3: „Da ist er — der Mehltau. Das Ergebnis von zu viel Schwankung. Stabilität ist das Ziel."
- Akt 4: „Klimastress in der Blüte kostet Qualität. Nächstes Mal: kleiner korrigieren, häufiger messen."

---

### EC-03: Die Nährstoff-Falle

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-03 |
| **Titel** | Die Nährstoff-Falle |
| **Setup** | both |
| **Stages** | S2–S5 |
| **Dauer** | 6–12 Spieltage |
| **Schwere-Maximum** | 5 (Akt 4) |
| **Anker-Events** | N-I-01 → N-B-03 → W-B-03 → B-I-01 |
| **Lernkategorie** | Nährstoffe + Salzaufbau |

**Akt-Übersicht:**
```
Akt 1: N-I-01 „Stickstoff-Toxizität (Clawing)" — zu viel gedüngt
  ↓ [Break-Point: Düngung sofort reduzieren, EC-Wert senken]
Akt 2: N-B-03 „Nährstoffsperre durch pH-Drift" — Überreaktion mit pH-Korrektur
  ↓ [Break-Point: pH stabilisieren ohne Extremkorrektur]
Akt 3: W-B-03 „Salzaufbau kritisch" — Substrat versalzen
  ↓ [Break-Point: Flush durchführen]
Akt 4: B-I-01 „Verfrühter Flush" — Panik-Flush zu früh in Blüte (Schwere 5)
```

**Lernprinzip:** Overfeeding → Lockout → Overcorrection → Flush-Fehler. Die Kette zeigt, wie jede Überreaktion das nächste Problem auslöst.

**Coach-Narration:**
- Akt 1: „Die Blätter klauen — klassisches Zeichen von zu viel Stickstoff. Weniger ist hier mehr."
- Akt 2: „Jetzt kommen die Nährstoffe nicht mehr an. Der pH ist der Schlüssel, nicht mehr Dünger."
- Akt 3: „Salze haben sich aufgebaut. Flush — aber behutsam und zum richtigen Zeitpunkt."
- Akt 4: „Ein Flush jetzt? In Woche 5 der Blüte? Das kostet Ertrag. Timing ist alles."

---

### EC-04: Das Schädlings-Puzzle

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-04 |
| **Titel** | Das Schädlings-Puzzle |
| **Setup** | both |
| **Stages** | S3–S6 |
| **Dauer** | 8–14 Spieltage |
| **Schwere-Maximum** | 4 (Akt 3) |
| **Anker-Events** | P-B-03 → P-I-01 → P-B-02 → P-I-03 |
| **Lernkategorie** | Schädlinge + Diagnose |

**Akt-Übersicht:**
```
Akt 1: P-B-03 „Trichome vs. Mehltau — Fehldiagnose" (Near-Miss)
  ↓ [Break-Point: korrekte Diagnose treffen ohne Panikbehandlung]
Akt 2: P-I-01 „Echter Spinnmilben-Befall" — jetzt tatsächlicher Schädling
  ↓ [Break-Point: frühe Behandlung mit Neem/Pyrethrum]
Akt 3: P-B-02 „Botrytis-Beginn" — schwache Pflanze durch Schädlinge anfälliger
  ↓ [Break-Point: befallene Teile entfernen, Luftung maximieren]
Akt 4: P-I-03 „Mehltau-Ausbruch" — Immunsystem der Pflanze geschwächt
```

**Lernprinzip:** Kette demonstriert, wie nicht behandelte Schädlinge Sekundärprobleme auslösen. Außerdem: Fehldiagnose zu Beginn ist teurer als keine Diagnose.

**Coach-Narration:**
- Akt 1: „Warte kurz. Das sind Trichome, keine Sporen. Diagnose vor Behandlung — immer."
- Akt 2: „Jetzt ist es echt. Spinnmilben. Unterseite der Blätter — siehst du die Punkte?"
- Akt 3: „Die Pflanze ist geschwächt. Botrytis nutzt das. Befallene Stellen sofort entfernen."
- Akt 4: „Drei Probleme gleichzeitig — weil das erste zu spät behandelt wurde. Früherkennung rettet Grows."


---

### EC-05: Licht-Stress-Zyklus

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-05 |
| **Titel** | Licht-Stress-Zyklus |
| **Setup** | indoor |
| **Stages** | S1–S5 |
| **Dauer** | 5–10 Spieltage |
| **Schwere-Maximum** | 4 (Akt 3) |
| **Anker-Events** | L-I-04 → L-I-01 → L-I-06 → L-I-02 |
| **Lernkategorie** | Licht/PPFD + DLI |

**Akt-Übersicht:**
```
Akt 1: L-I-04 „Keimling DLI-Überlastung" — zu viel Licht zu früh
  ↓ [Break-Point: Lampe höher hängen, Intensität reduzieren]
Akt 2: L-I-01 „Light Burn obere Canopy" — Lampe zu nah in Veg/Blüte
  ↓ [Break-Point: PPFD messen, Abstand korrigieren]
Akt 3: L-I-06 „Canopy-Hotspot" — ungleichmäßige Lichtverteilung
  ↓ [Break-Point: Training + Lichtpositionierung anpassen]
Akt 4: L-I-02 „Lichtmangel in der Blüte" — zu weit hochgezogen nach Burn-Angst
```

**Lernprinzip:** Angst vor Light Burn führt zur Gegenteil-Reaktion: zu weit weg hängen. Die Kette zeigt das richtige Gleichgewicht (PPFD-Messungen als Lösung).

**Coach-Narration:**
- Akt 1: „Keimlinge brauchen sanftes Licht. Noch nicht die volle Power."
- Akt 2: „Jetzt verbrennen die Spitzen. Nicht mehr Licht — die richtige Distanz."
- Akt 3: „Die Mitte bekommt zu viel, die Ränder zu wenig. Ein PPFD-Messgerät zeigt dir die Wahrheit."
- Akt 4: „Jetzt hängt die Lampe zu hoch. Aus Angst. Messen statt raten."

---

### EC-06: Der Technik-Dominoeffekt (Indoor)

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-06 |
| **Titel** | Der Technik-Dominoeffekt |
| **Setup** | indoor |
| **Stages** | S3–S6 |
| **Dauer** | 4–8 Spieltage |
| **Schwere-Maximum** | 5 (Akt 4) |
| **Anker-Events** | T-I-01 → K-I-03 → K-I-04 → B-I-02 |
| **Lernkategorie** | Technik + Klima-Kaskadeneffekte |

**Akt-Übersicht:**
```
Akt 1: T-I-01 „Lüfter-Ausfall" — Ventilation weg
  ↓ [Break-Point: Backup-Ventilation + sofortige Kontrolle]
Akt 2: K-I-03 „Hitzestress" — ohne Lüfter steigt Temperatur
  ↓ [Break-Point: Tür öffnen, Notventilation, Lampe dimmen]
Akt 3: K-I-04 „CO₂-Defizit" — Stagnationsluft enthält kein frisches CO₂
  ↓ [Break-Point: Frischluftzufuhr wiederherstellen]
Akt 4: B-I-02 „Blüteprobleme" — Hitzestress + CO₂-Mangel in der Blüte (Schwere 5)
```

**Lernprinzip:** Ein einzelner Technik-Ausfall kann eine Kaskade auslösen. Checklisten und Monitoring sind keine Paranoia — sie sind Prävention.

**Coach-Narration:**
- Akt 1: „Lüfter aus. Das klingt klein. Aber in einem geschlossenen Raum wird es schnell ein Problem."
- Akt 2: „Temperatur steigt. Ohne Luftzirkulation hat die Pflanze keine Chance, sich zu regulieren."
- Akt 3: „Keine frische Luft, kein CO₂. Die Pflanze hungert — obwohl du alles andere richtig machst."
- Akt 4: „So endet ein technisches Problem, das nicht schnell genug gelöst wurde. Monitoring rettet Grows."

---

### EC-07: Pythium-Rettung (Dramatische Krise)

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-07 |
| **Titel** | Pythium-Rettung |
| **Setup** | indoor |
| **Stages** | S2–S5 |
| **Dauer** | 7–14 Spieltage |
| **Schwere-Maximum** | 5 (Akt 2–3) |
| **Anker-Events** | R-I-03 → W-I-01 → N-B-03 → R-B-02 |
| **Lernkategorie** | Wurzelgesundheit + Recovery |
| **Rettungs-Kette** | Ja — emotionaler Peak möglich |

**Akt-Übersicht:**
```
Akt 1: R-I-03 „Wurzelfäule (Pythium)" — Schwere 5, dramatischer Einstieg
  ↓ [Kein einfacher Break-Point — sofortige Maßnahmen nötig]
Akt 2: W-I-01 „Überwatering-Diagnose" — Ursache verstehen
  ↓ [Break-Point: Bedingungen korrigieren, Pythizide anwenden]
Akt 3: N-B-03 „Nährstoffaufnahme blockiert" — Wurzeln können nicht aufnehmen
  ↓ [Break-Point: Hydrogenperoxid-Behandlung + pH-Stabilisierung]
Akt 4: R-B-02 „Weiße Wurzeln sichtbar" — Recovery-Zeichen (🟢 positiver Akt!)
```

**Besonderheit:** Akt 4 ist ein **positives Event** — der Grower sieht die ersten Zeichen der Erholung. Das ist der emotionale Wendepunkt und löst ggf. Beat SB-17 aus.

**Coach-Narration:**
- Akt 1: „Pythium. Das ist ernst. Die Wurzeln verrotten — zu feuchte Bedingungen über zu lange Zeit."
- Akt 2: „Jetzt verstehen wir die Ursache. Trockner, besser belüftet, schnell handeln."
- Akt 3: „Die Pflanze kann keine Nährstoffe aufnehmen. Nicht wegen Mangel — wegen Wurzelschaden."
- Akt 4: „Schau — da sind neue weiße Wurzeln. Sie kämpft zurück. Du hast ihr geholfen."

---

### EC-08: Das Trainings-Dilemma (Topping-Kette)

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-08 |
| **Titel** | Das Trainings-Dilemma |
| **Setup** | both |
| **Stages** | S2–S4 |
| **Dauer** | 6–12 Spieltage |
| **Schwere-Maximum** | 3 (Akt 3) |
| **Anker-Events** | TR-I-02 → TR-B-01 → TR-I-01 → TR-I-03 |
| **Lernkategorie** | Training + Timing |

**Akt-Übersicht:**
```
Akt 1: TR-I-02 „Topping zur falschen Zeit" — zu früh oder zu spät
  ↓ [Break-Point: Recovery abwarten, nicht weiter trainieren]
Akt 2: TR-B-01 „Übertraining" — zu viele Eingriffe in kurzer Zeit
  ↓ [Break-Point: 2-Wochen-Pause, Stress-Recovery-Protokoll]
Akt 3: TR-I-01 „LST-Stress" — mechanischer Schaden durch zu hartes Biegen
  ↓ [Break-Point: Fixer + Splint anlegen]
Akt 4: TR-I-03 „Lollipopping zu spät" — falsche Phase für Unterholz-Entfernung
```

**Lernprinzip:** Training ist kein „mehr ist besser" — es ist ein Dialog mit der Pflanze. Timing und Erholung sind genauso wichtig wie die Technik selbst.

**Coach-Narration:**
- Akt 1: „Topping ist gut. Aber jetzt? Die Pflanze hatte keine Zeit, sich zu erholen."
- Akt 2: „Du hast schon dreimal eingegriffen diese Woche. Die Pflanze braucht Pause, keine weitere Chirurgie."
- Akt 3: „Der Ast ist nicht geschmeidig genug — er bricht fast. LST braucht Geduld."
- Akt 4: „Lollipopping in Woche 6 der Blüte? Zu spät — das kostet mehr als es bringt."

---

### EC-09: Die Outdoor-Saison (Saisonale Kette)

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-09 |
| **Titel** | Die Outdoor-Saison |
| **Setup** | outdoor |
| **Stages** | S0–S7 (gesamte Saison) |
| **Dauer** | 120–180 Spieltage (Mai bis Oktober) |
| **Schwere-Maximum** | 5 (Akt 5 — Herbstfrost) |
| **Anker-Events** | S-O-01 → K-O-01 → P-O-03 → K-O-05 → S-O-02 |
| **Lernkategorie** | Outdoor-Awareness + Saisonales Denken |
| **Besonderheit** | Langkette — erstreckt sich über gesamten Grow |

**Akt-Übersicht:**
```
Akt 1 (Mai): S-O-01 „Outdoor-Saisonstart" (🟡 Lernmoment + Beat SB-25)
  ↓ [Sommer: Wachstumsphase]
Akt 2 (Juli/August): K-O-01 „Hitzewelle" — Extremhitze-Management
  ↓ [Break-Point: Beschattung, Mulchen, Bewässerung anpassen]
Akt 3 (September): P-O-03 „Botrytis bei Herbstregen" — Schwere 5
  ↓ [Break-Point: frühe Ernte erwägen, Behandlung, Ventilation]
Akt 4 (Oktober): K-O-05 „Herbstfrost-Warnung" — Ernteentscheidung unter Zeitdruck
  ↓ [Entscheidungsmoment: jetzt ernten oder riskieren]
Akt 5 (Oktober/Ende): S-O-02 „Erste Outdoor-Ernte" (🟢 positives Finale)
```

**Lernprinzip:** Die Outdoor-Saison ist kein Event — sie ist eine Geschichte. Jeder Akt zeigt eine andere Lektion über das Gärtnern im Einklang mit der Natur, nicht gegen sie.

**Coach-Narration:**
- Akt 1: „Die Saison beginnt. Du übergibst das Kommando an die Sonne."
- Akt 2: „Hitze. Kein Thermostat. Aber du kannst schattieren, mulchen, früh gießen."
- Akt 3: „Botrytis liebt den Herbstregen. Das ist der kritischste Moment der Outdoor-Saison."
- Akt 4: „Der erste Frost kommt. Die Entscheidung liegt bei dir: jetzt oder nie."
- Akt 5: „Du hast sie durch die ganze Saison gebracht. Das ist nicht selbstverständlich."

---

### EC-10: Der perfekte Grow (Meister-Kette)

| Feld | Inhalt |
|------|--------|
| **Chain-ID** | EC-10 |
| **Titel** | Der perfekte Grow |
| **Setup** | both |
| **Stages** | S0–S7 (gesamter Grow) |
| **Dauer** | Gesamter Grow-Zyklus |
| **Schwere-Maximum** | 2 (Near-Miss-Events, keine echten Krisen) |
| **Anker-Events** | SB-01 → SB-07 → SB-18 → SB-20 → SB-24 |
| **Lernkategorie** | Alle Bereiche |
| **Besonderheit** | Nur auslösbar nach 2+ vollständigen Grows, alle KP-Bereiche ≥ 0.50 |

**Akt-Übersicht:**
```
Akt 1 (S0): Keimling mit Ruhe beobachtet — kein Panik-Eingriff
  ↓ [Meilenstein: SB-01 + SB-02 in Folge]
Akt 2 (S2–S4): VPD-Fenster gefunden und gehalten — kein Klima-Event
  ↓ [Meilenstein: SB-07 + 14 Tage ohne Klima-Event]
Akt 3 (S5–S6): Trichom-Beobachtung + optimales Ernte-Fenster identifiziert
  ↓ [Meilenstein: SB-18 + korrekter Harvest-Zeitpunkt]
Akt 4 (S7): Ernte ohne aktive Events — ruhige Entscheidung
  ↓ [Meilenstein: SB-20 ausgelöst]
Akt 5 (Post-Harvest): Trocknungs-Zyklus korrekt abgeschlossen
  → Abschluss: SB-24 + Achievement „Makelloser Grow"
```

**Lernprinzip:** Die Meisterkette belohnt nicht Perfektion — sie belohnt Ruhe, Geduld und das Vertrauen in Wissen statt Reaktion. Sie kann nicht erzwungen werden, sie entsteht aus der Summe aller gelernten Lektionen.

**Coach-Narration:**
- Akt 1: „Du bist ruhiger als beim ersten Mal. Das sieht man."
- Akt 2: „Das Klima läuft. Du hast es eingestellt und dann — gelassen."
- Akt 3: „Die Trichome zeigen es dir. Du brauchst keinen Countdown mehr."
- Akt 4: „Kein Alarm. Keine Panik. Du weißt, dass es Zeit ist."
- Akt 5: „Das war ein guter Grow. Nicht wegen Glück. Wegen Wissen."

**Achievement:** „Makelloser Grow" — kompletter Grow-Zyklus ohne Schwere-4/5-Event abgeschlossen (zweiter oder späterer Grow).


---

## 4. Übersichtstabelle: Alle 10 Event-Ketten

| Chain-ID | Titel | Setup | Stages | Max-Schwere | Akte | Lernfokus |
|----------|-------|-------|--------|-------------|------|-----------|
| EC-01 | Überwatering-Spirale | both | S2–S4 | 5 | 4 | Watering + Roots |
| EC-02 | VPD-Achterbahn | indoor | S3–S6 | 4 | 4 | Klima/VPD |
| EC-03 | Nährstoff-Falle | both | S2–S5 | 5 | 4 | Nährstoffe + Salzaufbau |
| EC-04 | Schädlings-Puzzle | both | S3–S6 | 4 | 4 | Schädlinge + Diagnose |
| EC-05 | Licht-Stress-Zyklus | indoor | S1–S5 | 4 | 4 | Licht/PPFD/DLI |
| EC-06 | Technik-Dominoeffekt | indoor | S3–S6 | 5 | 4 | Technik + Klima |
| EC-07 | Pythium-Rettung | indoor | S2–S5 | 5 | 4 | Wurzel + Recovery |
| EC-08 | Trainings-Dilemma | both | S2–S4 | 3 | 4 | Training + Timing |
| EC-09 | Outdoor-Saison | outdoor | S0–S7 | 5 | 5 | Outdoor-Awareness |
| EC-10 | Der perfekte Grow | both | S0–S7 | 2 | 5 | Mastery (alle Bereiche) |

**Schwere-Verteilung in Ketten:**
- Ketten mit Max-Schwere 5: EC-01, EC-03, EC-06, EC-07, EC-09 (5 von 10)
- Ketten mit Max-Schwere 3–4: EC-02, EC-04, EC-05, EC-08 (4 von 10)
- Positive/Mastery-Kette: EC-10 (1 von 10)

---

## 5. Chain-Engine — Implementierungshinweise für Codex

**Codex-Auftrag #005E — Event-Chain-Engine**

**Neue Dateien:**
```
src/systems/events/chains/
  ChainEngine.ts           # Orchestriert Akt-Übergänge
  ChainStore.ts            # Zustand: aktive Ketten, Akt-Fortschritt, Break-Points
  chainCatalog.ts          # 10 Chain-Definitionen (typisiert)

data/event-chains/
  ec-01.json … ec-10.json  # Chain-JSON-Instanzen
```

**Chain-State-Lifecycle:**
```typescript
enum ChainState {
  INACTIVE    = "inactive",
  ACT_1       = "act_1",
  ACT_2       = "act_2",
  ACT_3       = "act_3",
  ACT_4       = "act_4",
  ACT_5       = "act_5",
  RESOLVED    = "resolved",   // Spieler hat Break-Point genutzt
  FAILED      = "failed",     // Pflanzenverlust / maximale Eskalation
  COMPLETED   = "completed"   // Alle Akte durchlebt (inkl. positives Finale)
}
```

**Akt-Übergangs-Logik:**
```typescript
// Pseudo-Code ChainEngine
function evaluateChainProgress(chain: EventChain, gameState: GameState) {
  const currentAct = chainStore.getCurrentAct(chain.chainId);
  const activeEvent = eventStore.getActive(currentAct.eventId);
  
  if (activeEvent.isResolved && activeEvent.resolvedCorrectly) {
    // Break-Point genutzt → Kette aufgelöst
    chainStore.resolve(chain.chainId, "break_point");
    knowledgeProfile.award(chain.knowledgeProfileBonus, multiplier: 1.2);
  } else if (activeEvent.timeElapsed > currentAct.escalationTriggerHours) {
    // Break-Point verpasst → nächster Akt
    chainStore.advance(chain.chainId);
    eventStore.trigger(chain.acts[currentAct.actNumber].eventId, {
      escalationFactor: currentAct.escalationFactor
    });
  }
}
```

**Wichtige Regeln:**
- Maximal 1 aktive Kette gleichzeitig pro Setup (indoor/outdoor)
- Ketten können durch Story-Beats unterbrochen werden (Kette pausiert, Beat zeigt sich, dann weiter)
- Break-Point-Erkennung: nur wenn Spieler die spezifische Korrektmaßnahme trifft (nicht generisch „Event gelöst")
- Chain-Summary wird in Journal eingetragen nach Abschluss
- EC-10 ist nur aktivierbar, wenn `chainStore.getCompletedChains().length >= 2`

**Quality-Check für Codex:**
- [ ] Alle `eventId`-Referenzen in Chain-JSONs existieren im Event-Katalog
- [ ] `escalationFactor` wird korrekt auf `severity` und `pressureScore` angewendet
- [ ] Keine Kette triggert während S7-Harvest-Window (zu kurz vor Ende)
- [ ] EC-09 (Langkette) hat korrektes Saison-Datum-Tracking
- [ ] Break-Point-Erkennung unit-getestet für alle 10 Ketten

---

*Datei: `docs/event-system-v2/04_event-catalog/05_event-chains.md`*
*Stand: Vollständig — 10 Ketten (EC-01 bis EC-10), Chain-Engine-Spec*
*Erstellt als Teil von Event System V2 Spec — schemaVersion 3*
