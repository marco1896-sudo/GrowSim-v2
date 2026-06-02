# 04 · Premium Event Catalog — Übersicht & Philosophie

> **Codex-Zuweisung #005A** · Autor: AI Product Architect · Stand: 2026-05-07
> Dieses Dokument ist das Master-Inhaltsverzeichnis und die konzeptionelle Grundlage des Event-Katalogs.
> Keine bestehenden Dateien ändern · Keine Logik · Keine Locales · Keine Tests

---

## 1. Ziel des Event-Katalogs

Der Event-Katalog ist die **inhaltliche Wahrheit** des Event-Systems V2. Er definiert, welche Ereignisse existieren, warum sie existieren und was der Spieler dabei lernen soll.

Er dient drei Zwecken:

**Für Codex (Implementierung):** Jedes Event ist als vollständige Spec formuliert — Ursache, Symptom, Entscheidungsoptionen, Konsequenz, Asset-Tag. Codex kann direkt daraus eine JSON-Datei unter `data/events/catalog/` erstellen ohne konzeptionelle Entscheidungen treffen zu müssen.

**Für das Balancing:** Der Katalog definiert in welchen Stages, bei welchem Modus und unter welchen Bedingungen Events auftauchen. Das Pressure-Scoring-System (siehe `03_architecture.md`) arbeitet gegen diese Metadaten.

**Für den App-Store-Wert:** Jedes Event ist eine Lerneinheit. Der Katalog zeigt, dass Grow Simulator ein Bildungsprodukt ist — kein Zufalls-Punisher. Das ist Marketing-relevant und Review-relevant.

---

## 2. Indoor vs. Outdoor — Primärer Event-Filter

Indoor und Outdoor sind grundlegend verschiedene Wachstumsumgebungen. Events müssen das reflektieren.

| Symbol | Modus | Kern-Charakteristik |
|--------|-------|---------------------|
| 🏠 | Nur Indoor | Kontrolle, Technik, Konsistenz — der Spieler ist verantwortlich für alles |
| 🌿 | Nur Outdoor | Natur, Saison, Unkontrollierbarkeit — reagieren statt kontrollieren |
| 🌐 | Beide | Universelle Pflanzenbiologie, unabhängig vom Setup |

**Design-Prinzip Indoor:** Events handeln von Geräten, Einstellungen und Routinen. Der Spieler hat die Kontrolle — und damit auch die volle Verantwortung für Fehler.

**Design-Prinzip Outdoor:** Events kommen von außen. Spieler können nur reagieren, nicht verhindern. Das Spiel muss fair kommunizieren wann etwas kommt (Wetter-Vorhersage-System, Saison-Kalender).

**Design-Prinzip Both:** Pflanzenbiologie gilt überall. Phosphormangel sieht indoor wie outdoor gleich aus. Diese Events lehren fundamentale Botanik.

**Implementierungsregel:** Jede Event-JSON-Datei enthält ein Feld `"setupFilter": "indoor" | "outdoor" | "both"`. Der Engine-Layer filtert Events vor dem Scoring nach diesem Feld.

---

## 3. Stage-Matrix

Alle Events sind an eine oder mehrere Wachstumsphasen gebunden. Die Engine triggert ein Event nur wenn die aktuelle Pflanzenstage im erlaubten Fenster liegt.

| Stage-ID | Name | Typische Tage | Kennzeichen |
|----------|------|---------------|-------------|
| S0 | Seedling | 1–7 | Keimung, erste Keimblätter, sehr fragil |
| S1 | Early Veg | 8–18 | Erste echte Blätter, Wurzeln erkunden Topf |
| S2 | Veg | 19–35 | Starkes vegetatives Wachstum, Training-Fenster |
| S3 | Preflower | 36–42 | Erster Blütenansatz, Stretch beginnt |
| S4 | Early Flower | 43–49 | Buds bilden sich, hoher Energiebedarf |
| S5 | Mid Flower | 50–56 | Maximale Bud-Masse, Terpensynthese beginnt |
| S6 | Late Flower | 57–63 | Reifung, Trichome wechseln, Flush-Fenster |
| S7 | Harvest Window | 64–70 | Ernte, Trocknung, Nachbehandlung |

**Wichtig:** Stage-Grenzen sind approximiert. Die Simulation berechnet die aktuelle Stage aus Pflanzenparametern (Blütentage, Trichom-Entwicklung), nicht nur aus Kalendertagen.

**Events pro Stage — Dichte-Erwartung:**

| Stage | Erwartete Events pro Durchlauf | Priorität |
|-------|-------------------------------|-----------|
| S0 | 1–2 | niedrig (Tutorial) |
| S1 | 2–3 | mittel |
| S2 | 3–4 | hoch |
| S3 | 2–3 | mittel |
| S4 | 3–4 | hoch |
| S5 | 3–4 | hoch |
| S6 | 2–3 | mittel |
| S7 | 1–2 | niedrig |

---

## 4. Kategorie-System

Der Katalog ist in 10 Kategorien unterteilt. Jede Kategorie hat eine eigene Pressure-Variable im Simulationsmodell.

| Cat-ID | Kategorie | Beschreibung | Primäre Trigger-Quelle |
|--------|-----------|--------------|------------------------|
| CAT-1 | Wasser / Gießen | Über-, Unterwässerung, pH, EC | `soil.moisture`, `ec`, `ph` |
| CAT-2 | Nährstoffe | Mangel, Überschuss, Lockout, Timing | `nutrientBalance`, `ph`, `ec` |
| CAT-3 | Klima / VPD | VPD, Temperatur, Luftfeuchtigkeit | `vpd`, `temp`, `humidity` |
| CAT-4 | Licht / PPFD | Lichtintensität, Spektrum, DLI | `ppfd`, `dli`, `photoperiod` |
| CAT-5 | Wurzelzone / Medium | Substrat, Topfgröße, Wurzelgesundheit | `rootHealth`, `soilDensity` |
| CAT-6 | Schädlinge / Krankheiten | Insekten, Pilze, Bakterien | `pestPressure`, `humidity` |
| CAT-7 | Technik / Setup | Geräteausfälle, Kalibrierung, Fehler | `equipment.*` |
| CAT-8 | Training / Pflanzenstruktur | LST, Topping, Defol, Stress | `trainingStress`, `canopyBalance` |
| CAT-9 | Blüte / Erntequalität | Trichome, Hermies, Trocknungsfehler | `trichomeRipeness`, `budDensity` |
| CAT-10 | Story / Lern-Beats | Narrative Meilensteine, Aha-Momente | `milestone.*`, `firstTime.*` |

**Kategorie-Isolation:** Ein Event gehört immer genau einer Kategorie. Die Pressure-Variable, die ein Event triggert, bestimmt seine Kategorie — nicht sein Symptombild.

---

## 5. Event-Dichte-Philosophie

Ein vollständiger 70-tägiger Grow-Run soll **12–18 Events** auslösen. Das ist die Premium-Dichte.

**Warum nicht mehr?**
- Mehr als 18 Events fühlen sich wie Bestrafung an
- Der Spieler soll jeden Event als bedeutsam erleben
- Narrative Event-Ketten brauchen Atemraum zwischen den Akten

**Warum nicht weniger?**
- Unter 10 Events wirkt das Spiel leblos
- Lerneffekte brauchen Wiederholung über die Session
- Retention-Mechanik lebt von regelmäßigem Engagement

**Verteilung über den Run:**
- 30% der Events: erste 25 Tage (Veg-Phase → Orientierung, Grundlagen)
- 50% der Events: Tage 25–55 (Blüte → kritischste Phase, höchster Lernwert)
- 20% der Events: letzte 15 Tage (Reife, Ernte → Abschluss, Reflexion)

**Event-Typen und ihr Anteil am Run:**

| Typ | Anteil | Beschreibung |
|-----|--------|--------------|
| Coach Events (Warnung + Entscheidung) | 50% | Der Kern: Symptom sehen, handeln, Ergebnis sehen |
| Story Beats (narrativ) | 20% | Meilensteine, Aha-Momente, kein negativer Druck |
| Crisis Events (Hochdruck) | 20% | Schädlinge, Ausfall, starker Zeitdruck |
| Learning Cards (passiv) | 10% | Nur Information, keine Entscheidung nötig |

---

## 6. Lern-Philosophie — Coach-First

Jedes Event ist zuerst eine Lehreinheit, dann eine Herausforderung.

**Das Coach-First-Prinzip in 4 Schritten:**

1. **Beobachten:** Der Spieler sieht ein visuelles Signal an seiner Pflanze (hängende Blätter, Flecken, Verfärbung)
2. **Verstehen:** Der Coach erklärt kurz und klar was passiert und warum
3. **Entscheiden:** Der Spieler wählt eine Gegenmaßnahme aus 2–3 Optionen
4. **Lernen:** Das Ergebnis zeigt die Konsequenz — richtig oder falsch — mit einer Erklärung warum

**Anti-Pattern (verboten):**
- Events die ohne Vorwarnung Pflanzenpunkte abziehen
- Events die der Spieler nicht hätte erkennen können
- Events deren Lösung nicht logisch aus dem Lerninhalt folgt
- Zwei identische Events in derselben Grow-Session

**Das Ursache-Symptom-Entscheidung-Lösung-Nachwirkung-Modell:**

```
Ursache: Was in der Simulation geändert hat
  ↓
Symptom: Was der Spieler sieht (visuell + textuell)
  ↓
Entscheidung: 2–3 Optionen mit unterschiedlichem Lernwert
  ↓
Lösung: Korrekte Gegenmaßnahme + Erklärung
  ↓
Nachwirkung: Wie die Pflanze auf die Entscheidung reagiert
```

---

## 7. Qualitätsregeln

Jedes Event im Katalog muss diese Regeln bestehen bevor Codex es implementiert:

**QR-01 — Realitätsbezug:** Die Ursache muss botanisch oder agronomisch korrekt sein. Keine erfundenen Pflanzenreaktionen.

**QR-02 — Anfängerfreundlichkeit:** Das Event muss auch ohne Vorwissen lösbar sein. Die Coach-Erklärung darf kein Expertenwissen voraussetzen.

**QR-03 — Lösbarkeit:** Jede der angebotenen Entscheidungsoptionen muss eine logische Konsequenz haben. Keine Sackgassen.

**QR-04 — Visueller Anker:** Jedes Event hat genau einen Asset-Tag. Das UI muss das Symptom illustrieren — kein Text ohne Bild.

**QR-05 — Stage-Kohärenz:** Das Event darf nur in Stages auftreten wo es biologisch plausibel ist. Kein Blütenqualitäts-Event in der Seedling-Phase.

**QR-06 — Cooldown-Respekt:** Jedes Event hat eine Mindest-Cooldown-Zeit definiert. Dasselbe Event kann in einem Run höchstens 2× auftreten.

**QR-07 — Kein Doppelstress:** Das Engine-Layer darf maximal 2 Events gleichzeitig aktiv haben. Der Katalog markiert welche Events sich gegenseitig ausschließen.

**QR-08 — Lerninhalt ist konkret:** „Pflanze dem Stress ausgesetzt" ist kein Lerninhalt. „VPD über 1.8 kPa trocknet Stomata aus und stoppt Transpiration" ist einer.

---

## 8. Asset-Strategie

Der Katalog definiert **20 Asset-Gruppen** — wiederverwendbare Bild-Tags die über mehrere Events geteilt werden. Das reduziert Art-Aufwand und schafft visuellen Wiedererkennungswert.

**Namenskonvention:** `img:kebab-case-beschreibung`

**Verwendung in Event-Specs:** Jedes Event trägt genau einen `Asset-Tag`. Der UI-Layer mappt diesen Tag zur entsprechenden Illustration.

**Vollständige Asset-Gruppen-Liste:** Siehe `06_asset-groups.md`

**Priorität für Art-Produktion:**
- Tier 1 (kritisch, häufig): 8 Assets — decken >50% aller Events ab
- Tier 2 (wichtig): 8 Assets — decken weitere 35% ab
- Tier 3 (optional): 4 Assets — Spezialfälle

---

## 9. Geplante Eventanzahl pro Kategorie

| Datei | Kategorie | Geplante Events | 🏠 Indoor | 🌿 Outdoor | 🌐 Beide |
|-------|-----------|----------------|-----------|------------|---------|
| `01_indoor-events.md` | CAT-7 Technik/Setup | 8 | 8 | — | — |
| `01_indoor-events.md` | CAT-4 Licht/PPFD (Indoor-Teil) | 6 | 6 | — | — |
| `01_indoor-events.md` | CAT-3 Klima/VPD (Indoor-Teil) | 5 | 5 | — | — |
| `01_indoor-events.md` | CAT-1 Wasser (Indoor-Teil) | 4 | 4 | — | — |
| `01_indoor-events.md` | CAT-2 Nährstoffe (Indoor-Teil) | 2 | 2 | — | — |
| `01_indoor-events.md` | CAT-5 Wurzel (Indoor-Teil) | 3 | 3 | — | — |
| `01_indoor-events.md` | CAT-6 Schädlinge (Indoor-Teil) | 3 | 3 | — | — |
| `01_indoor-events.md` | CAT-8 Training (Indoor-Teil) | 3 | 3 | — | — |
| `01_indoor-events.md` | CAT-9 Blüte (Indoor-Teil) | 3 | 3 | — | — |
| **Σ Indoor** | | **37** | **37** | | |
| `02_outdoor-events.md` | CAT-3 Klima/VPD (Outdoor-Teil) | 5 | — | 5 | — |
| `02_outdoor-events.md` | CAT-6 Schädlinge (Outdoor-Teil) | 6 | — | 6 | — |
| `02_outdoor-events.md` | CAT-1 Wasser (Outdoor-Teil) | 3 | — | 3 | — |
| `02_outdoor-events.md` | CAT-2 Nährstoffe (Outdoor-Teil) | 3 | — | 3 | — |
| `02_outdoor-events.md` | CAT-5 Wurzel (Outdoor-Teil) | 3 | — | 3 | — |
| `02_outdoor-events.md` | CAT-8 Training (Outdoor-Teil) | 3 | — | 3 | — |
| `02_outdoor-events.md` | CAT-9 Blüte (Outdoor-Teil) | 4 | — | 4 | — |
| `02_outdoor-events.md` | CAT-4 Licht/PPFD (Outdoor-Teil) | 1 | — | 1 | — |
| `02_outdoor-events.md` | CAT-10 Story (Outdoor-Teil) | 2 | — | 2 | — |
| **Σ Outdoor** | | **30** | | **30** | |
| `03_shared-events.md` | CAT-1 Wasser (Both) | 5 | — | — | 5 |
| `03_shared-events.md` | CAT-2 Nährstoffe (Both) | 5 | — | — | 5 |
| `03_shared-events.md` | CAT-3 Klima/VPD (Both) | 2 | — | — | 2 |
| `03_shared-events.md` | CAT-4 Licht/PPFD (Both) | 1 | — | — | 1 |
| `03_shared-events.md` | CAT-5 Wurzel (Both) | 2 | — | — | 2 |
| `03_shared-events.md` | CAT-6 Schädlinge (Both) | 5 | — | — | 5 |
| `03_shared-events.md` | CAT-8 Training (Both) | 2 | — | — | 2 |
| `03_shared-events.md` | CAT-9 Blüte (Both) | 1 | — | — | 1 |
| `03_shared-events.md` | CAT-10 Story (Both) | 8 | — | — | 8 |
| **Σ Shared** | | **31** | | | **31** |
| `04_learning-story-beats.md` | CAT-10 (alle) | 10 | — | 2 | 8 |
| **Gesamtbestand** | | **98** | **37** | **30** | **31** |

> Hinweis: CAT-10 Story/Lern-Beats erscheinen in `04_learning-story-beats.md` als eigenem Dokument mit erweitertem Format. Die 10 Events werden dort vollständig spezifiziert.

---

## 10. Überblick über Event-Ketten

Event-Ketten sind sequentielle Narrative: ein Auslöser-Event führt nach 2–4 Tagen zu einem Folge-Event, das auf dem ersten aufbaut. Vollständige Specs in `05_event-chains.md`.

| Chain-ID | Name | Akt 1 | Akt 2 | Akt 3 | Modus |
|----------|------|-------|-------|-------|-------|
| EC-01 | Die Wurzelfäule-Spirale | Staunässe erkannt | Fäule setzt ein | Rettung oder Verlust | 🌐 |
| EC-02 | Schimmel-Invasion | Hohe Luftfeuchtigkeit | Botrytis-Ansatz | Ausbreitung / Eindämmung | 🌐 |
| EC-03 | Der pH-Kollaps | pH-Drift ignoriert | Lockout-Symptome | Flush und Neustart | 🌐 |
| EC-04 | Licht-Überexposition | Lampe zu nah | Hitzeschäden | Bleaching / Erholung | 🏠 |
| EC-05 | Spinnmilben-Ausbruch | Erste Spinnmilben | Kolonie wächst | Behandlung oder Ernte-Notfall | 🏠 |
| EC-06 | Die Hitzewelle | Temperatur steigt | Trockenstress | Doppelbelastung / Erholung | 🌐 |
| EC-07 | Frühfrost-Notfall | Kältewarnung | Frostschaden | Ernte-Entscheidung | 🌿 |
| EC-08 | Übertraining | LST + Topping zu aggressiv | Wachstumsstopp | Erholung oder Reveg | 🌐 |
| EC-09 | Der Nährstoff-Burn | EC zu hoch | Wurzelspitzentod | Flush und Rehabilitation | 🌐 |
| EC-10 | Technikausfall Kette | Lüfter fällt aus | Temperatur steigt | VPD kippt, Schimmel droht | 🏠 |

**Chain-Mechanik:** Ketten sind im JSON als `chainId` und `chainStep` markiert. Schritt 1 setzt ein `chainFlag` in den Spielzustand. Schritt 2 prüft dieses Flag als Trigger-Bedingung zusätzlich zum normalen Pressure-Score.

---

## 11. Überblick über Lern- und Story-Beats

Story-Beats sind keine Problemereignisse — sie sind Meilensteine und Aha-Momente. Sie haben keine negativen Konsequenzen. Vollständige Specs in `04_learning-story-beats.md`.

| Beat-ID | Name | Auslöser | Typ | Modus |
|---------|------|---------|-----|-------|
| SB-01 | Erster Keimling | Pflanze keimt erfolgreich | Milestone | 🌐 |
| SB-02 | Das erste Topping | Spieler toppt zum ersten Mal | Skill Unlock | 🌐 |
| SB-03 | VPD entdecken | VPD-Meter zum ersten Mal kalibriert | Learning Card | 🌐 |
| SB-04 | Erste Blütenanzeichen | Erste Pistillen sichtbar | Milestone | 🌐 |
| SB-05 | Der Trichom-Moment | Spieler nutzt Mikroskop-Funktion | Discovery | 🌐 |
| SB-06 | Ersten Grow abschließen | Ernte erfolgreich | Achievement | 🌐 |
| SB-07 | Schädling überstanden | Pest-Event erfolgreich gelöst | Resilience Beat | 🌐 |
| SB-08 | Outdoor-Saisonstart | Pflanze geht nach draußen | Seasonal | 🌿 |
| SB-09 | Erster Outdoor-Erntemonat | Outdoor-Ernte im Oktober | Seasonal | 🌿 |
| SB-10 | Coach-Level-Up | Spieler hat 5 Events korrekt gelöst | Progression | 🌐 |

**Wichtig:** Story-Beats haben `"type": "story_beat"` im JSON und werden vom Story Curator Layer gesteuert, nicht vom normalen Event-Pressure-System.

---

## 12. Codex-Auftrag #005A — Modularer Katalog

### Auftrag

Erstelle die vollständige Verzeichnisstruktur `docs/event-system-v2/04_event-catalog/` und befülle jede Datei gemäß den Specs in diesem Ordner.

### Reihenfolge

1. `00_overview.md` ✅ (dieses Dokument — bereits vorhanden)
2. `01_indoor-events.md` — 37 Indoor-Events in Format-Spec
3. `02_outdoor-events.md` — 30 Outdoor-Events in Format-Spec
4. `03_shared-events.md` — 31 Shared-Events in Format-Spec
5. `04_learning-story-beats.md` — 10 Story/Lern-Beats in erweitertem Format
6. `05_event-chains.md` — 10 Event-Ketten mit Akt-Struktur
7. `06_asset-groups.md` — 20 Asset-Gruppen mit Tier, Beschreibung, Verwendung
8. `07_quality-rules.md` — Vollständige Qualitätsregeln mit Beispielen und Gegenbspielen

### Event-Format (für Dateien 01–04)

```markdown
#### [ID] · [Event-Name]
[Symbol] [Modus] | Stage: [S0–S7 Auswahl] | Cat: [CAT-X]

**Ursache:** [Was passiert in der Simulation]
**Symptom:** [Was der Spieler sieht]
**Anfängerfalle:** [Häufigster Fehler]
**Gegenmaßnahme:** [Was der Spieler tun soll]
**Folge bei Fehler:** [Was passiert bei Fehlentscheidung]
**Lerninhalt:** [Coach-Kernbotschaft, konkret und botanisch korrekt]
**Asset-Tag:** `img:tag-name`
**Cooldown:** [Mindestabstand zum nächsten Auftreten in Tagen]
**Ausschluss:** [Event-IDs die gleichzeitig nicht aktiv sein dürfen]
```

### Verbote

- Keine bestehenden Dateien unter `src/`, `data/`, `locales/` oder `tests/` verändern
- Kein Code schreiben — nur Markdown-Spec-Dokumente
- Kein Event erfinden das botanisch nicht korrekt ist
- Kein Event ohne Asset-Tag

### Ziel-Qualitätsstufe

Nach Fertigstellung des Katalogs soll ein Spieler, der alle Events einmal erlebt hat, verstehen:
- Wie VPD, pH, EC und Wasserzyklen zusammenhängen
- Warum Indoor-Kontrolle präventiv wichtiger ist als reaktives Handeln
- Dass Outdoor-Grows Saison-Kompetenz brauchen
- Wie man Trichome zur Ernteentscheidung nutzt
- Dass Training Risiko und Belohnung gleichzeitig ist

Dieser Lernpfad macht Grow Simulator zu einem legitimen Bildungsprodukt — und das ist sein App-Store-Alleinstellungsmerkmal.

---

*Nächste Datei: `01_indoor-events.md` — 37 Indoor-spezifische Events*
