# 07 — Quality Rules (QR-01 – QR-12)
*Grow Simulator V2 · Event System V2 · schemaVersion 3*

---

## 1. Zweck dieses Dokuments

Quality Rules sind **verbindliche Standards**, die jedes Event im Katalog erfüllen muss, bevor es in Produktion geht. Sie dienen als:

- **Codex-Checkliste** beim Implementieren neuer Events
- **Review-Kriterien** beim Testing
- **Design-Leitplanken** beim Erstellen zukünftiger Erweiterungen
- **Balancing-Referenz** für Game-Designer

Jede Regel enthält:
- Den Standard selbst (klar formuliert)
- Ein positives Beispiel (✅ Wie es aussehen soll)
- Ein Negativ-Beispiel (❌ Typischer Fehler)
- Testbarkeits-Hinweis (wie automatisch prüfbar)

---

## 2. Die 12 Quality Rules

---

### QR-01: Coach-First — Jedes Event lehrt

**Regel:** Jedes Event muss mindestens einen konkreten botanischen Lerninhalt vermitteln. Reine Bestrafung ohne Erklärung ist nicht erlaubt.

**Standard:**
> Ein Event gilt als „Coach-First", wenn der Spieler nach dem Event verstehen kann, **warum** das Problem entstanden ist und **wie** er es beim nächsten Mal vermeiden kann.

**✅ Gutes Beispiel:**
```
Event: W-I-01 „Überwatering"
Symptom: Hängende Blätter, nasses Substrat
Coach-Text: „Überwatering ist nicht Wasserüberschuss — es ist Sauerstoffmangel an den Wurzeln. 
            Zu nasses Substrat verdrängt die Luft, die Wurzeln zum Atmen brauchen."
Lösung: „Lift-Test nutzen. Warte bis Topf deutlich leichter ist, dann gieße wieder."
Nachwirkung: „Du wirst diesen Fehler nicht zweimal machen. Der Topf zeigt dir alles."
```

**❌ Schlechtes Beispiel:**
```
Event: „Pflanze hängt"
Coach-Text: „Deine Pflanze ist gestresst."
Lösung: „Gieß weniger."
```
*Fehler: Kein Warum, keine Botanik, keine Merkregel.*

**Testbarkeit:**
- [ ] `coachText` enthält mindestens 1 botanischen Fachbegriff
- [ ] `solutionSteps` enthält mindestens 2 konkrete Maßnahmen
- [ ] `aftermath.lesson` ist nicht leer

---

### QR-02: Botanische Korrektheit

**Regel:** Alle Ursache-Symptom-Beschreibungen müssen botanisch korrekt und mit aktueller Grow-Literatur vereinbar sein.

**Standard:**
> Fakten, Grenzwerte und Mechanismen müssen überprüfbar korrekt sein. Vereinfachungen sind erlaubt, Fehlinformationen nicht.

**✅ Gutes Beispiel:**
```
VPD-Referenzwert:
- Veg: 0.8–1.2 kPa (korrekt für gesunde Transpiration)
- Blüte: 1.0–1.5 kPa (korrekt für Harzentwicklung)
- Quelle: Royal Queen Seeds / Jorge Cervantes Grow Bible
```

**❌ Schlechtes Beispiel:**
```
VPD-Referenzwert:
- Immer 0.5–0.8 kPa (zu eng, falsch für Blüte)
- pH ideal immer 6.5 (richtig für Erde, falsch für Hydroponik)
```

**Kritische Werte die geprüft sein müssen:**
| Parameter | Richtig | Falsch |
|-----------|---------|--------|
| VPD Veg | 0.8–1.2 kPa | < 0.5 oder > 1.8 als „ideal" |
| VPD Blüte | 1.0–1.5 kPa | > 2.0 als normal |
| pH Erde | 6.0–7.0 | 5.5 als Erde-Ideal |
| pH Hydro | 5.5–6.5 | 7.0 als Hydro-Ideal |
| EC Wachstum | 1.2–2.0 mS/cm | > 3.0 als sicher |
| EC Blüte | 1.8–2.5 mS/cm | > 4.0 als unbedenklich |
| DLI Veg | 20–40 mol/m²/d | > 60 als normal |
| Blütetemperatur | 18–26°C | > 30°C als akzeptabel |

**Testbarkeit:**
- [ ] Automatischer Werte-Check gegen `data/references/botanical-constants.json`
- [ ] Manuelle Review durch Grow-Experten vor Release

---

### QR-03: Schwere-Kalibrierung

**Regel:** Der `severity`-Wert eines Events muss der tatsächlichen Auswirkung auf Gesundheit, Ertrag und Spieler-Stress entsprechen.

**Schwere-Skala:**

| Schwere | Gesundheitsverlust/Tag | Ertragsverlust max. | Lernintensität | Beispiele |
|---------|----------------------|---------------------|----------------|-----------|
| 1 | < 2% | 0–5% | Sehr gering | SB-Beats, Near-Miss |
| 2 | 2–5% | 5–15% | Gering | Beobachtungs-Events |
| 3 | 5–10% | 15–30% | Mittel | Häufige Probleme (W-I-01) |
| 4 | 10–20% | 30–50% | Hoch | Ketten-Eskalation, Schädlinge |
| 5 | > 20% oder sofort | > 50% oder Ernte-Verlust | Maximal | Botrytis, Pythium, Hermaphrodit |

**✅ Richtige Einstufung:**
- P-B-02 „Botrytis in Blüte" → Schwere 5 ✅ (direkter Bud-Verlust, nicht mehr rückgängig)
- W-I-01 „Überwatering" → Schwere 3 ✅ (reversibel, Zeit löst es)
- K-B-01 „Lila Stiele" → Schwere 1 ✅ (Near-Miss, kein echter Schaden)

**❌ Falsche Einstufung:**
- VPD 0.1 kPa daneben → Schwere 4 ❌ (Übertreibung, Spieler frustriert)
- Hermaphrodit-Entwicklung → Schwere 2 ❌ (zu niedrig, crop failure)

**Testbarkeit:**
- [ ] `healthImpact` korreliert mit `severity` (automatischer Range-Check)
- [ ] `yieldImpact` liegt im Schwere-entsprechenden Bereich
- [ ] Schwere-5-Events haben `resolutionWindow` ≤ 48h (nicht ignorierbar)

---

### QR-04: Keine permanente Krisenfeeling

**Regel:** Der Schwere-Mix über alle Events muss ausgewogen sein. Maximal 25% der ausgelösten Events dürfen Schwere 4–5 sein.

**Standard:**
> Spieler dürfen sich nicht „ständig bedroht" fühlen. Positive, neutrale und lehrende Events müssen häufiger auftreten als Krisen.

**Ziel-Verteilung (pro Grow-Zyklus):**
| Schwere | Ziel-Anteil | Max-Anteil |
|---------|-------------|------------|
| 1 (Beats/Near-Miss) | 30% | — |
| 2 (Beobachtung) | 30% | — |
| 3 (Normalproblem) | 25% | 35% |
| 4 (Eskalation) | 10% | 15% |
| 5 (Krise) | 5% | 10% |

**Pressure-Governor (für Codex):**
```typescript
// Nach jedem Schwere-4/5-Event: 72h Cooldown für neue Schwere-4/5
interface PressureGovernor {
  lastHighSeverityEvent: timestamp;
  cooldownHours: 72;
  overridable: false; // Außer bei Chain-Eskalation
}
```

**Testbarkeit:**
- [ ] Simulation-Test: 1000 Grow-Durchläufe, Schwere-4/5-Anteil < 25%
- [ ] Pressure-Governor aktiv nach jedem Schwere-4/5-Event

---

### QR-05: Entscheidungsqualität

**Regel:** Jedes Event muss dem Spieler eine echte Wahl lassen. Mindestens 2 Entscheidungsoptionen, davon mindestens 1 falsche.

**Standard:**
> Events sind keine Tutorials mit einzig richtiger Antwort. Der Spieler soll abwägen, nicht einfach bestätigen.

**✅ Gutes Beispiel:**
```
Event: N-B-01 „Gelbe untere Blätter"
Option A: „Mehr düngen — die Pflanze hat Hunger" ❌ (Überreaktion)
Option B: „Abwarten — das ist normale Seneszenz" ✅ (korrekt)
Option C: „Blätter entfernen und beobachten" ⚠️ (neutral, nicht falsch)
```

**❌ Schlechtes Beispiel:**
```
Event: „Was tust du?"
Option A: „Gießen" ✅
Option B: „Nicht gießen" ❌ (falsch, aber offensichtlich)
```
*Fehler: Triviale Wahl, kein echtes Abwägen nötig.*

**Entscheidungs-Qualitätsgrade:**
| Grad | Beschreibung | KP-Bonus |
|------|--------------|---------|
| Optimal | Beste Maßnahme zum richtigen Zeitpunkt | +100% |
| Korrekt | Richtige Maßnahme, leichte Verzögerung | +70% |
| Suboptimal | Funktioniert, aber Nebenwirkungen | +30% |
| Falsch | Löst Problem nicht, verschlimmert ggf. | +10% (Lerneffekt) |

**Testbarkeit:**
- [ ] Jedes Event hat `decisionOptions` Array mit ≥ 2 Einträgen
- [ ] Mindestens 1 Option hat `isCorrect: false`
- [ ] Keine Option ist offensichtlich lächerlich falsch (vermeidet Raten)


---

### QR-06: Setup-Filter-Korrektheit

**Regel:** Setup-Filter (`"indoor"`, `"outdoor"`, `"both"`) müssen präzise sein. Kein Event darf in einem unpassenden Kontext erscheinen.

**Standard:**
> Ein Indoor-Event, das im Outdoor-Setup erscheint, zerstört die Immersion und liefert falsche Lerneffekte.

**Setup-Filter-Entscheidungsbaum:**
```
Hat das Event elektrische Geräte als Ursache? → indoor
Hat das Event Wetter als Ursache? → outdoor
Ist die Ursache biologisch und in beiden Kontexten möglich? → both
Ist die Ursache in beiden möglich, aber Häufigkeit sehr verschieden? → "both" mit setup_note
```

**✅ Richtige Klassifikation:**
```
T-I-03 „Timer-Fehler / Lichtleck" → indoor ✅ (Timer ist Indoor-Equipment)
K-O-01 „Hitzewelle" → outdoor ✅ (Outdoor-Wetterereignis)
W-B-01 „Panik-Gießen" → both ✅ (Verhaltens-Event, setup-unabhängig)
P-I-03 „Echter Mehltau Indoor" → indoor ✅ (Ursache: hohe RH ohne Wind)
P-O-04 „Mehltau Outdoor (Tauzyklen)" → outdoor ✅ (andere Ursache: Morgentau)
```

**❌ Falsche Klassifikation:**
```
T-I-01 „Lüfter-Ausfall" → both ❌ (kein Outdoor-Kontext für Innenraum-Lüfter)
K-O-05 „Herbstfrost" → both ❌ (Indoor hat keinen unkontrollierten Frost)
```

**Sonderfall `both` mit Context-Note:**
```json
{
  "setup": "both",
  "setupNote": "Indoor: primär durch Überwatering. Outdoor: primär nach Starkregen.",
  "eventId": "W-B-01"
}
```

**Testbarkeit:**
- [ ] Automatischer Check: Events mit `setup: "indoor"` enthalten keine Wetter-Referenzen
- [ ] Events mit `setup: "outdoor"` enthalten keine Equipment-Fehler als Primärursache
- [ ] `setupNote` verpflichtend wenn Ursache sich je nach Setup unterscheidet

---

### QR-07: Stage-Relevanz

**Regel:** Jedes Event muss in der angegebenen Stage (`stageRange`) botanisch sinnvoll und relevant sein. Falsches Timing macht Events irrelevant oder verwirrend.

**Stage-Matrix (Reminder):**

| Stage | Name | Typische Dauer | Typische Events |
|-------|------|----------------|-----------------|
| S0 | Keimung/Setzling | 1–2 Wochen | L-I-04, SB-01–03 |
| S1 | Früh-Veg | 2–3 Wochen | W-I-02, SB-03–06 |
| S2 | Veg | 3–6 Wochen | N-I-01, R-I-01, TR-I-02 |
| S3 | Spät-Veg | 1–2 Wochen | K-I-01, TR-I-01 |
| S4 | Stretch (Früh-Blüte) | 2–3 Wochen | L-I-01, P-I-01 |
| S5 | Mid-Blüte | 3–4 Wochen | N-B-03, P-B-02 |
| S6 | Spät-Blüte / Reife | 2–3 Wochen | B-B-01, SB-18 |
| S7 | Harvest Window | 1–2 Wochen | SB-20, K-O-05 |

**✅ Richtige Stage-Zuweisung:**
```
B-I-02 „Hermaphrodit-Entwicklung" → S4–S5 ✅ (Stretch/Mid-Blüte, biologisch korrekt)
L-I-04 „Keimling DLI-Überlastung" → S0 ✅ (nur relevant in Keimphase)
SB-18 „Trichom-Beobachtung" → S6 ✅ (sinnlos vor Spät-Blüte)
```

**❌ Falsche Stage-Zuweisung:**
```
B-I-01 „Verfrühter Flush" → S0–S2 ❌ (Flush ist Blüte-Konzept, nicht Veg)
SB-20 „Ruhige Ernteentscheidung" → S3 ❌ (kein Harvest in Veg-Phase)
```

**Testbarkeit:**
- [ ] `stageRange` validiert gegen botanisch-sinnvolle Stage-Kombinationen
- [ ] Events mit `category: "bloom"` haben `stageRange` ausschließlich S4–S7
- [ ] Harvest-Events: nur S7

---

### QR-08: Nachwirkungs-Vollständigkeit

**Regel:** Jedes Event mit Schwere ≥ 2 muss eine Nachwirkungsphase (`aftermath`) haben, die über den Event-Abschluss hinausgeht.

**Standard:**
> Das Spiel darf nach Event-Lösung nicht sofort zur Normalität zurückkehren. Realistische Erholung und Lernverankerung erfordern Nachwirkungen.

**Nachwirkungs-Typen:**

| Typ | Beschreibung | Dauer | Beispiel |
|-----|--------------|-------|---------|
| `recovery_monitoring` | Pflanze unter Beobachtung | 24–72h | Nach Overwatering |
| `residual_damage` | Sichtbare Narben, leicht reduzierter Wert | Dauerhaft sichtbar | Nach Light Burn |
| `knowledge_consolidation` | KP-Boost nach erfolgreicher Lösung | Sofort | Nach allen Events |
| `coach_followup` | Coach-Message 24h später | 24h delay | Nach Schwere-5 |
| `journal_prompt` | Spieler wird zur Reflexion eingeladen | Nächste Session | Nach emotionalen Events |

**✅ Gutes Beispiel:**
```json
"aftermath": {
  "type": ["recovery_monitoring", "knowledge_consolidation", "coach_followup"],
  "recoveryMonitoringHours": 48,
  "residualDamagePercent": 5,
  "coachFollowupDelay": 24,
  "coachFollowupText": "Schau nochmal nach den Wurzeln. Neue weiße Spitzen sind ein gutes Zeichen.",
  "lesson": "Lift-Test vor jedem Gießen verhindert diese Situation dauerhaft."
}
```

**❌ Schlechtes Beispiel:**
```json
"aftermath": {
  "lesson": "Nicht mehr überwässern."
}
```
*Fehler: Kein Monitoring, kein Coach-Follow-up, zu generische Lektion.*

**Testbarkeit:**
- [ ] Events mit `severity >= 2` haben `aftermath.type` Array mit ≥ 1 Eintrag
- [ ] Events mit `severity >= 4` haben `aftermath.coachFollowupText`
- [ ] `aftermath.lesson` enthält keine generischen Phrasen (Blocklist: „Mach das nicht", „Pas auf")

---

### QR-09: Anfänger-Zugänglichkeit

**Regel:** Jedes Event muss für einen Spieler verständlich sein, der das erste Mal gärtnerisch aktiv ist. Fachbegriffe müssen erklärt oder umgangen werden.

**Standard:**
> Der Spieler soll verstehen, was er tun soll, auch wenn er den Fachbegriff nicht kennt. Erklärungen kommen vor Terminologie.

**Sprachliche Anforderungen:**
- Fachbegriffe in Anführungszeichen oder Klammern erklärt beim ersten Auftreten
- Maßnahmen als konkrete Handlungsschritte formuliert
- Keine unexplained Abkürzungen (EC, VPD, DLI müssen mindestens einmal erklärt sein)

**Lesbarkeits-Levels:**
| Level | Zielpublikum | Beispiel |
|-------|--------------|---------|
| L1 (Anfänger) | Erstes Mal gärtnern | Alle S0–S2-Events |
| L2 (Fortgeschritten) | 1–2 vorherige Grows | S3–S5-Events |
| L3 (Erfahren) | 3+ Grows, Fachbegriffe vertraut | S6–S7-Events, EC-10 |

**✅ Gutes Beispiel (L1):**
```
Coach: „VPD — das ist der Unterschied zwischen der Feuchtigkeit, die die Luft 
        'tragen möchte', und der, die wirklich drin ist. 
        Zu wenig: Schimmelgefahr. Zu viel: Pflanze verdurstet trotz Gießens."
```

**❌ Schlechtes Beispiel:**
```
Coach: „Der VPD-Wert ist zu hoch. Erhöhe die RH um 10% und senke die Temp auf 22°C."
```
*Fehler: Kein Warum, keine Erklärung was VPD bedeutet, Spieler versteht Zusammenhang nicht.*

**Testbarkeit:**
- [ ] S0–S2-Events: keine unerklärten Abkürzungen im ersten Auftreten
- [ ] Mindestens 1 Analogie oder Alltagsvergleich in S0–S1-Events
- [ ] Lesbarkeits-Level im Event-JSON dokumentiert (`readabilityLevel: 1 | 2 | 3`)


---

### QR-10: Event-Eindeutigkeit

**Regel:** Kein Event darf mit einem anderen Event in Symptom UND Ursache vollständig überlappen. Ähnliche Events müssen klar unterscheidbare Diagnosemerkmale haben.

**Standard:**
> Der Spieler soll durch Beobachtung lernen, Events auseinanderzuhalten. Wenn zwei Events identisch aussehen, lernt er nichts.

**✅ Korrekte Differenzierung:**
```
N-B-01 vs. N-B-02 (gelbe Blätter in beiden):
  N-B-01: Untere/ältere Blätter, gleichmäßig, während Blüte → Seneszenz
  N-B-02: Jüngere UND ältere Blätter, interveinal, in Veg → echter Mangel
  Unterschied: Muster + Zeitpunkt + Alter des betroffenen Gewebes ✅
```

**❌ Problematische Überlappung:**
```
Hypothetisches Event A: „Pflanze hängt wegen Hitze"
Hypothetisches Event B: „Pflanze hängt wegen Trockenheit"
Beide: Blätter hängen, keine weiteren Unterschiede sichtbar → ununterscheidbar ❌
```
*Lösung: Substrat-Check als Diagnoseschritt hinzufügen (nass vs. trocken).*

**Differenzierungs-Matrix (für Codex-Check):**
Bevor ein neues Event angelegt wird, muss gegen bestehende Events geprüft werden:
```
Überschneidungscheck:
1. Gleiche Kategorie (CAT-X)?
2. Gleiche Stage (SX)?
3. Gleiche Primärsymptome?

Wenn alle 3 "Ja" → neues Event braucht mindestens 2 klar unterscheidbare Diagnosemerkmale
```

**Testbarkeit:**
- [ ] Automatischer Duplikat-Check: Events mit identischem `symptoms` Array müssen verschiedene `stage` oder `cause` haben
- [ ] Manuelle Review: Neue Events gegen Überschneidungsmatrix prüfen

---

### QR-11: Telemetrie-Vollständigkeit

**Regel:** Jedes Event muss Telemetrie-Tags haben, die Analyse von Spielverhalten, Schwierigkeitsbalancing und Learning-Outcomes ermöglichen.

**Standard:**
> Ohne Telemetrie können wir nicht wissen, ob Events zu schwer, zu einfach, zu häufig oder zu selten sind.

**Pflicht-Telemetrie-Felder pro Event:**
```json
"telemetry": {
  "trackingId": "evt_w_i_01",         // Eindeutige Tracking-ID
  "category": "watering",              // Für Kategorien-Auswertung
  "expectedTriggerRate": 0.35,         // Erwartete Trigger-Rate pro Grow (35%)
  "targetSolveRate": 0.70,             // Ziel: 70% der Spieler lösen korrekt
  "avgDecisionTimeSeconds": 45,        // Erwartete Durchschnitts-Entscheidungszeit
  "hintUsageThreshold": 0.40,          // Alert wenn >40% Hints nutzen → Event zu schwer
  "skipRateThreshold": 0.15,           // Alert wenn >15% skippen → Event uninteressant
  "funnel": ["triggered", "seen", "decided", "resolved", "aftermath_seen"]
}
```

**Analyse-Events die geloggt werden:**
| Event-Name | Trigger | Bedeutung |
|------------|---------|-----------|
| `event_triggered` | Event startet | Häufigkeits-Analyse |
| `event_hint_used` | Spieler nutzt Hint | Schwierigkeits-Indikator |
| `event_option_selected` | Entscheidung getroffen | Entscheidungs-Analyse |
| `event_resolved` | Event abgeschlossen | Löse-Rate |
| `event_chain_escalated` | Ketten-Akt eskaliert | Chain-Balancing |
| `beat_triggered` | Story-Beat erscheint | Beat-Trigger-Analyse |
| `beat_dismissed` | Beat zu schnell weggeklickt | Beat-Engagement |

**Alert-Schwellwerte (Telemetrie-Dashboard):**
| Metrik | Alert-Schwelle | Maßnahme |
|--------|---------------|---------|
| Solve-Rate | < 40% | Event zu schwer, Hints verbessern |
| Hint-Rate | > 50% | Coach-Text unklar, überarbeiten |
| Skip-Rate | > 20% | Event uninteressant, Relevanz prüfen |
| Chain-Abbruch | > 60% in Akt 1 | Break-Point-Window verlängern |

**Testbarkeit:**
- [ ] Alle Events haben `telemetry` Block mit allen Pflichtfeldern
- [ ] `trackingId` ist eindeutig (kebab-case, keine Duplikate)
- [ ] Dashboard-Alerts konfiguriert vor Release

---

### QR-12: Konsistente Tonalität

**Regel:** Die emotionale Tonalität des Coach-Textes muss zur Event-Schwere und zum Event-Typ passen. Keine Bestrafungssprache bei Near-Miss-Events, keine Verniedlichung bei Schwere-5-Events.

**Tonalitäts-Matrix:**

| Event-Typ | Schwere | Coach-Tonalität | Verbotene Phrasen |
|-----------|---------|-----------------|-------------------|
| 🔴 Krise | 4–5 | Ernst, direkt, unterstützend | „Kein Problem!", „Das wird schon!" |
| 🔵 Beobachtung | 1–2 | Neugierig, einladend | „Du hast es vermaselt", „Fehler!" |
| 🟢 Recovery | 1–3 | Warm, bestätigend | „Nächstes Mal besser", „Nicht schlecht" |
| 🟡 Lernmoment | 1–2 | Erklärend, ruhig | Übertriebene Dramatik |
| 🟠 Near-Miss | 1 | Leicht, humorvoll, entlastend | Beschämung, Überkritik |

**Verbotene Phrasen (Blocklist):**
```
- "Du hast versagt"
- "Das war falsch"  
- "Nächstes Mal besser"
- "Nicht gut genug"
- "Das hätte nicht passieren dürfen"
- "Kein Problem" (bei Schwere 4+)
- "Easy!" (bei Schwere 4+)
```

**✅ Richtige Tonalität — Near-Miss-Event (🟠):**
```
K-B-01 „Lila Stiele — Fehldiagnose vermieden"
Coach: „Lila Stiele machen Anfängern immer Sorgen. Und das ist gut — 
        zeigt, dass du hinschaust. Aber hier ist kein Grund zur Panik: 
        Das ist Phosphor-Mobilisierung in der Blüte, vollkommen normal."
```

**❌ Falsche Tonalität — Near-Miss-Event (🟠) mit Krisensprache:**
```
Coach: „Achtung! Deine Pflanze zeigt kritische Symptome! 
        Sofort handeln — das könnte ernst sein!"
```
*Fehler: Erzeugt unnötigen Stress bei harmlosem Event, zerstört das Near-Miss-Lernprinzip.*

**✅ Richtige Tonalität — Schwere-5-Event (🔴):**
```
R-I-03 „Wurzelfäule (Pythium)"
Coach: „Das ist ernst. Pythium ist eine Pilzkrankheit, die Wurzeln angreift. 
        Wir müssen jetzt schnell handeln — aber mit Bedacht, nicht in Panik."
```

**❌ Falsche Tonalität — Schwere-5-Event (🔴) verniedlicht:**
```
Coach: „Oops! Die Wurzeln sind ein bisschen braun. Kein Stress, passiert!"
```
*Fehler: Trivial für tatsächlich ernstes Problem, Spieler unterschätzt Dringlichkeit.*

**Testbarkeit:**
- [ ] Automatischer Blocklist-Check auf `coachText` und `solutionSteps`
- [ ] Tonalitäts-Tag im Event-JSON: `tone: "crisis" | "observation" | "recovery" | "learning" | "near_miss"`
- [ ] Cross-Check: `tone` muss mit `eventType`-Icon übereinstimmen

---

## 3. Quality-Check-Checkliste (Codex Master-Checklist)

Vor jedem Event-Release oder Batch-Import muss diese Checkliste abgearbeitet sein:

### Automatisch prüfbar (CI/CD):
- [ ] **QR-01:** `coachText` enthält ≥ 1 botanischen Begriff, `solutionSteps.length >= 2`
- [ ] **QR-02:** Alle numerischen Werte gegen `botanical-constants.json` validiert
- [ ] **QR-03:** `healthImpact` liegt im `severity`-entsprechenden Range
- [ ] **QR-04:** `severity` Distribution über Simulation-Run ≤ 25% für 4+5
- [ ] **QR-05:** `decisionOptions.length >= 2`, mindestens 1 `isCorrect: false`
- [ ] **QR-06:** Setup-Filter-Konsistenz (keine Wetter-Refs in Indoor, keine Equipment-Refs in Outdoor)
- [ ] **QR-07:** `stageRange` valide gegen botanisch-sinnvolle Kombinationen
- [ ] **QR-08:** Events mit `severity >= 2` haben `aftermath.type` nicht leer
- [ ] **QR-10:** Duplikat-Symptom-Check gegen bestehende Events
- [ ] **QR-11:** `telemetry` Block vollständig, `trackingId` eindeutig
- [ ] **QR-12:** Blocklist-Scan auf `coachText`

### Manuell prüfbar (Pre-Release Review):
- [ ] **QR-02:** Botanische Fakten durch Experten verifiziert
- [ ] **QR-05:** Entscheidungs-Optionen nicht trivial oder offensichtlich
- [ ] **QR-09:** Lesbarkeit für Anfänger durch Usability-Test bestätigt
- [ ] **QR-10:** Neue Events gegen Überschneidungsmatrix überprüft
- [ ] **QR-12:** Tonalität durch Redaktion gegengelesen

---

## 4. Codex-Auftrag #005G — Quality-Gate implementieren

**Scope:** Automatisiertes QA-System für Event-Catalog

**Neue Dateien:**
```
src/systems/events/validation/
  EventValidator.ts        # Haupt-Validator mit allen QR-Checks
  BotanicalConstants.ts    # Referenzwerte aus QR-02
  ToneBlocklist.ts         # Verbotene Phrasen aus QR-12
  QualityReport.ts         # Report-Generator für CI/CD

scripts/
  validate-events.ts       # CLI-Script: npx validate-events
  simulate-pressure.ts     # Simulation für QR-04 (1000 Grow-Runs)

data/references/
  botanical-constants.json # Botanische Referenzwerte
  tone-blocklist.json      # Verbotene Phrasen-Liste
```

**CI/CD-Integration:**
```yaml
# .github/workflows/event-quality.yml
name: Event Quality Gate
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: npx validate-events --all
      - run: npx simulate-pressure --runs 1000 --fail-threshold 0.25
```

**Validator-Output-Beispiel:**
```
Event Validation Report
=======================
Total Events: 98
Passed: 94 (95.9%)
Warnings: 3
Errors: 4 (blocking)

ERRORS:
  [QR-02] N-O-02: pH-Wert 5.5 außerhalb Erde-Bereich (6.0–7.0)
  [QR-05] TR-O-03: decisionOptions.length = 1 (min 2 required)
  [QR-08] K-O-04: severity=3 aber aftermath.type ist leer
  [QR-12] W-I-02: coachText enthält "Das war falsch" (Blocklist)

WARNINGS:
  [QR-09] L-I-07: readabilityLevel nicht gesetzt (default: 2)
  ...
```

**Quality-Check für Codex:**
- [ ] Validator läuft in < 30 Sekunden für alle 98 Events
- [ ] CI-Pipeline schlägt fehl bei ≥ 1 BLOCKING-Fehler
- [ ] Report wird als Artifact gespeichert (Review durch Game Designer)
- [ ] Simulation-Test ist deterministisch (Seed gesetzt)

---

## 5. Quality-Evolution — Roadmap

| Version | Neue QR-Checks | Ziel |
|---------|---------------|------|
| V1.0 (Launch) | QR-01 bis QR-07 | Basis-Qualität sichergestellt |
| V1.1 | QR-08 bis QR-10 | Aftermath + Eindeutigkeit |
| V1.2 | QR-11 | Telemetrie live und ausgewertet |
| V2.0 | QR-12 + erweiterte Tonalitäts-KI-Prüfung | Premium-Qualität, App-Store-Rating |

---

*Datei: `docs/event-system-v2/04_event-catalog/07_quality-rules.md`*
*Stand: Vollständig — 12 Quality Rules, Master-Checkliste, Codex-Auftrag #005G*
*Erstellt als Teil von Event System V2 Spec — schemaVersion 3*
