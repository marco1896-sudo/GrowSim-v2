# 01 — Premium Vision: Event-System als Hauptmerkmal

**Status:** Konzept-Entwurf, keine Codeänderung.
**Zweck:** Das Event-System zum App-Store-tauglichen Premium-Feature von Grow Simulator definieren — produkt-, design- und lernseitig.
**Datum:** 2026-05-06
**Vorgänger:** `00_current-system-audit.md`
**Nachfolger (geplant):** `02_data-model.md`, `03_architecture.md`

---

## 0. Arbeitsannahmen (statt offener Rückfragen)

Aus Anhang B des Audits werden hier produktstarke Defaults gesetzt. Sie können später widerlegt werden, sind aber bewusst auf „Premium-App-Store-Erlebnis" optimiert.

| Frage | Arbeitsannahme | Begründung |
|---|---|---|
| Soft-Cutover-Modus weiterführen? | **Ablösen.** Der Modus wird aktiv durch die V2-Engine ersetzt. `legacy` bleibt nur als Fallback bis V2 vollständig live ist; danach Entfernung. | Vier parallele Modi sind Premium-Risiko Nr. 1. Nutzer dürfen nie verschiedene Verhalten je Build sehen. |
| Ziel-Eventdichte pro Run? | **12–18 narrativ getragene Events pro 56-Sim-Tage-Run** statt aktuell ~47. Davon ~50–60 % „Krise/Eingriff", ~25 % „Lern-Beat", ~15–25 % „Belohnung/Stable-Window-Erkennung". | Premium-Mobile-Games (Pocket City, Plague Inc, Reigns, Stardew Valley Mobile) leben von kuratierten Beats, nicht Eventflut. |
| Cloud-Save / Multi-Device? | **Phase 1: lokaler Save mit Migrations-Stabilität, Phase 2: anonyme Cloud-Sync via UUID, Phase 3: Account-basiert.** | Vermeidet harten Login-Zwang am Anfang, lässt aber Tür offen. |
| Lernanteil? | **Jedes 3.–4. Event hat einen expliziten „Lern-Layer". Zusätzlich existieren reine Lern-Beats, die nicht durch Krise getriggert werden, sondern als Mikro-Lektion bei Stage-Übergängen.** | Bildung ist Kernversprechen der App; muss sich aber wie Spielmechanik anfühlen, nicht wie Schule. |
| Monetarisierung im Event-Layer? | **Kein Pay-to-Win, kein Pay-to-Skip. Erlaubt sind:** (a) optionale Premium-Diagnose („Coach-Hinweis"), (b) kosmetische Pflanzen-Genetiken, (c) Saisonale Story-Packs (z. B. „Outdoor Mediterranean Summer"). Werbung optional rewarded-only („Kostenlosen Coach-Hinweis ansehen"). | Erhält Lernintegrität; folgt Apples-/Googles Premium-Richtlinien. |

> Diese Annahmen werden in den Dokumenten 02–10 konkretisiert oder begründet revidiert.

---

## 1. Rolle des Event-Systems als Hauptmerkmal

**Kernsatz:** *Das Event-System ist nicht „eine Mechanik" in Grow Simulator — es ist das Spiel.*

Andere Subsysteme (Care, Climate, Wirtschaft) liefern Zustände; das Event-System verwandelt sie in **Geschichten mit Konsequenz**. Ohne Events wäre Grow Simulator ein Idle-Tracker mit Pflanzen-Fortschrittsbalken; **mit** Events wird es zu einem narrativ-lehrenden Lebens­simulator über das Wachstum einer Pflanze.

### 1.1 Drei Versprechen an den Spieler

1. **„Du verstehst, was passiert."** Jedes Event erklärt Ursache und Folge in nachvollziehbarer Sprache, mit echtem Grow-Wissen im Hintergrund.
2. **„Deine Entscheidungen zählen."** Choices sind nicht kosmetisch — sie modulieren Pflanze, Run-Score, Folge-Events.
3. **„Du wirst besser."** Das System erkennt Lernfortschritt; späte Events werden anspruchsvoller, präziser, persönlicher.

### 1.2 Marketingfähige Schlagzeilen

Diese Sätze sollten sich am Ende der Implementierung wahrhaftig auf einer Store-Page schreiben lassen:

- „Über 120 sorgfältig gestaltete Events mit echtem Grow-Wissen."
- „Event-Ketten, die sich über mehrere Sim-Tage entfalten."
- „Ein Coach-System, das aus deinen Entscheidungen lernt."
- „Sichtbare Symptome, fundierte Diagnosen, echte Konsequenzen."
- „Drei Spielmodi: Anfängermodus, Geführter Modus, Profi-Modus."

### 1.3 Was es **nicht** sein soll

- **Kein Random-Roulette:** Keine pure Chance ohne Trigger-Logik.
- **Kein Trivia:** Lernkarten sind kein Quiz, sondern Mikro-Lektionen mit Kontext.
- **Kein Notification-Spam:** Premium-Mobile bedeutet Ruhe zwischen den Beats.
- **Kein Fail-Spam:** Negative Events haben Erholungswege, keine reinen Bestrafungen.
- **Kein Tutorial-Wall:** Lernen passiert beim Spielen, nicht davor.

---

## 2. Vom Zufallsproblem zum lernenden Grow-Coach-System

Heutiges System: Ein Druck-Score und Trigger entscheiden, was kommt; der Spieler reagiert; Ende.
Zielsystem: Drei verzahnte Schichten, die zusammen ein adaptives Coach-Erlebnis ergeben.

### 2.1 Schicht A — Zustands-Engine (vorhanden, bleibt)

`Pressure × Trigger × Eligibility × Cooldown` produziert Kandidaten. Diese Schicht ist deterministisch und replay-fähig — das bleibt erhalten und wird stabilisiert.

### 2.2 Schicht B — Story-Curator (neu)

Über der reinen Auswahl steht ein **Curator**, der über einen Run-Bogen wacht:

- jeder Run hat ein **Story-Budget** (z. B. „bis Tag 14 mind. 1 Wasser-Lernevent, mind. 1 Klima-Belohnung, mind. 1 erste echte Krise"),
- der Curator garantiert **Pacing** (kein Dauerstress, keine 3 Krisen hintereinander ohne Erholung),
- er priorisiert **noch nicht gesehene Lerninhalte**, abhängig vom Spielerprofil.

**Inspiration:** „Director" aus Left 4 Dead, Pacing-Logik aus Slay the Spire / Hades.

### 2.3 Schicht C — Coach (neu, der „premium feel"-Treiber)

Der Coach ist die Spielerschnittstelle des Systems:

- nach jedem Event eine **kurze Reflexion**: „Du hast schnell entschieden — das war hier richtig."
- bei wiederholten Fehlern eine **sanfte Coachvariante**: „Schon dreimal wurde der Topf trocken. Wollen wir uns anschauen, woran das liegt?"
- bei Erfolg eine **konkrete Lernverankerung**: „Stress um 18 Punkte gefallen, weil du langsam in zwei Intervallen gegossen hast — das ist der Standard-Best-Practice."

Der Coach ist **nicht** allwissend; er weiß genau das, was die Telemetrie über den Spieler weiß. Dadurch fühlt er sich glaubwürdig an und sein Schweigen ist genauso ein Statement wie sein Eingreifen.

### 2.4 Adaptives Lernprofil

`player.knowledgeProfile` hält für jede Lerndimension einen Wert von 0..1:
- `water_basics`, `humidity_vpd`, `nutrient_lockout`, `pest_recognition`, `flower_humidity_risk`, …

Das Profil bewegt sich durch:
- *gesehene Lernkarten* (kleiner Anstieg),
- *erfolgreich gelöste Events derselben Lerndimension* (mittlerer Anstieg),
- *wiederholte Fehler in derselben Lerndimension* (Anstieg eines „Coaching-Bedarfs"-Werts statt der Kompetenz).

Der Curator und der Coach lesen dieses Profil, um Inhalte zu wählen.

### 2.5 Modus-Stufen

Ein expliziter In-Game-Schalter mit drei Stufen:

| Modus | Wer | Verhalten |
|---|---|---|
| **Anfängermodus** | Komplette Neulinge | Mehr Symptome werden vorab angekündigt, Lernkarten erscheinen automatisch, Diagnose-Hilfe sichtbar, weniger gleichzeitige Stressoren. |
| **Geführter Modus** *(Default)* | Mehrheit | Coach kommentiert ausgewählte Beats, Diagnose ist optional, Eventdichte normal. |
| **Profi-Modus** | Erfahrene Grower / Hardcore | Diagnose nur über aktive Tools, keine Coach-Texte, höhere Symptom-Ambivalenz, gelegentliche „Doppel-Krisen". |

Wichtig: Auch im Profi-Modus bleibt das Lernsystem im Hintergrund, nur die Sichtbarkeit ändert sich.

---

## 3. Spielerfahrung pro Erfahrungsstufe

### 3.1 Anfänger („Erstes Mal Grow Simulator")

Erwartete Sitzungslänge: 5–10 Minuten, mehrmals täglich.

- **Erste 30 Minuten:** kein einziges negatives Event. Nur „Beobachtungs-Beats": Setup-Erfolg, erste Wurzel, Lichtanpassung.
- **Erstes negatives Event** ist **immer** ein Wasser-Topf-trocken-Event mit voller Symptom-Sichtbarkeit, vorgelagerter Lernkarte, drei klar gekennzeichneten Optionen.
- **Coach** taucht zum ersten Mal nach diesem ersten gelösten Event auf, namentlich vorgestellt („Hi, ich bin dein Grow-Coach.").
- **Wiederholtes Versagen** bei demselben Event reduziert Schwierigkeit nach 3 Versuchen automatisch (sanftere Effekte, klarere Hinweise).
- **Sicherheitsnetz:** Die Pflanze stirbt im Anfängermodus nicht in den ersten 7 Sim-Tagen. Drohende Death-States werden in „kritisch, aber rettbar" umgeleitet.

### 3.2 Fortgeschrittene („zweite, dritte Pflanze")

Erwartete Sitzungslänge: 8–20 Minuten, gezielte Sessions.

- **Mehrdeutige Symptome:** Ein gelbliches Blatt kann pH, Nährstoff oder Licht sein. Der Spieler muss zwischen drei plausiblen Diagnosen wählen.
- **Event-Ketten:** Eine ignorierte Anfrage löst nach 8–12 Sim-Stunden Folgeereignis aus.
- **Belohnungs-Beats:** Stabile 24-h-Phasen werden mit echten Rewards versehen (Score, kosmetisches Wachstums-VFX, Coach-Lob).
- **Coach** wird zurückhaltender und nur noch bei wirklich neuen Lernfeldern aktiv.

### 3.3 Erfahrene Grower / Profi-Modus

Erwartete Sitzungslänge: 15–45 Minuten, optimieren / experimentieren.

- **Realismus-Schicht:** echte Grow-Begriffe (VPD, EC, NPK, Lockout, Bud-Rot-Risiko) ohne Übersetzung.
- **Doppel-Krisen** und **Klimakaskaden**: zwei laufende Events können sich gegenseitig verstärken.
- **Score-Systeme** mit Best-Yield-Listen, Run-Modifikatoren, optionalen Hardcore-Seeds.
- **Sandbox-Optionen** zum Testen von Hypothesen („Was passiert, wenn ich 6 Stunden nicht eingreife?").
- **Coach** schweigt. Nur Endrun-Auswertung mit Datendichte.

---

## 4. Spielerische Darstellung von Ursache → Symptom → Entscheidung → Lösung → Nachwirkung

Dieses fünfgliedrige Schema ist der Kern jeder Event-Geschichte. Jedes Event wird mit allen fünf Phasen designt, auch wenn manche Phasen je Event nur sehr kurz sind.

### 4.1 Phase 1 — Ursache *(meist unsichtbar oder retrospektiv)*

- Wird in der **Pflanzen-Akte** und in der **Outcome-Erklärung** sichtbar gemacht.
- Beispiel: „Ursache war 16 h zu hohe Luftfeuchte in Stage 9 (Blüte)."
- Spielerisch: Im Anfängermodus wird die Ursache nach Lösung explizit benannt; im Profi-Modus muss sie selbst hergeleitet werden.

### 4.2 Phase 2 — Symptom *(sichtbar)*

- **Pflanzen-Sprite** zeigt eine Symptomvariante (hängende Blätter, gelbliche Spitzen, weißer Belag, Trichome-Glitzern, …).
- **Status-Karte** zeigt Indikatoren (Stress ↑, Wasser ↓).
- **Toast/Banner** kündigt das Event mit emotional plausiblem Sprachton an („Etwas stimmt mit deinem Substrat nicht.").
- **Audio:** dezenter, nicht-alarmistischer Hinweis-Sound. **Haptik:** kurzes Pulsen.

### 4.3 Phase 3 — Entscheidung

- Modal mit klarer Hierarchie: Bild → Symptom-Kurzbeschreibung → Diagnose-Ebene (optional) → 2–4 Optionen.
- Optionen tragen **Risk/Reward-Visualisierung**: kleine Pfeil-Chips „Wasser +14, Stress −3, Risiko −1".
- Im Anfängermodus: eine Option ist mit „Empfohlen" gekennzeichnet.
- Eine Option ist immer **„Erst beobachten / Diagnose"** (nicht nur „Wait").
- Spieler kann Modal nicht ungewollt wegklicken.

### 4.4 Phase 4 — Lösung *(in Echtzeit, mit Lag)*

- Effekt entfaltet sich über **Minuten Realzeit** / Sim-Stunden, nicht instant.
- Der Status-Balken bewegt sich langsam, mit kleinem visuellem Momentum.
- Während der Wirkung kann der Spieler Care-Aktionen ausführen — die Pflanze ist „lebendig", nicht eingefroren.
- Mid-Course-Korrektur: Innerhalb von 30 Sek nach der Wahl kann der Spieler eine Soft-Korrektur vornehmen (Premium-Komfort).

### 4.5 Phase 5 — Nachwirkung *(narrativ wichtig)*

- **Outcome-Karte** zeigt: Was war richtig, was nicht, was lernen wir, was kommt.
- **Lerneintrag** in der Pflanzen-Akte (Liste aller Erkenntnisse pro Run).
- **Folge-Event-Hint:** Wenn eine Kette getriggert wurde, sieht der Spieler einen kleinen Indikator in der Hauptansicht („Diese Pflanze braucht in den nächsten 12 h besondere Aufmerksamkeit.").
- **Score-/Coach-Feedback** in dezenter Sprache.

---

## 5. Event-Kategorien

Sieben Hauptkategorien plus Tag-System für feinere Auswertung.

### 5.1 Hauptkategorien

| Kategorie | Beschreibung | Beispiele | Anteil-Ziel pro Run |
|---|---|---|---|
| **water** | Substratfeuchte, Topfphysik, Bewässerungsfehler | Topf trocken, Staunässe-Verdacht, Wurzelballen ungleich feucht | ~22 % |
| **nutrition** | Aufnahme, Lockout, Mängel, Überversorgung | N-Lockout, Mg-Mangel, EC-Drift | ~16 % |
| **environment** | Klima, VPD, Licht, Luftbewegung | Hitzewelle, kalte Nacht, Lichtbrand-Risiko, Outdoor-Wetterumschwung | ~20 % |
| **pest** | Schädlinge, früh erkennbare Hinweise | Trauermückenwelle, Spinnmilben-Hotspot, Blattläuse außen | ~10 % |
| **disease** | Schimmel, Wurzelfäule, Bud-Rot | Botrytis-Risiko, Wurzelfäule, Mehltau | ~8 % |
| **positive** | Stabilität, Lernfenster, Erfolgs-Beats | Ideale-Klimaphase, Wachstumsschub, gelungene Reproduktion | ~16 % |
| **special** | Selten, narrativ stark, oft Outdoor / saisonal | Kalte Sommernacht, Pollen-Risiko, Erntereife-Indikator | ~8 % |

### 5.2 Sekundäre Tags (orthogonal zu Kategorien)

Mehrere Tags pro Event möglich:

- `learning_beat` — Event mit explizitem Lerninhalt
- `chain_starter` — kann Folge-Event triggern
- `chain_resolver` — schließt eine offene Kette ab
- `outdoor_only`, `indoor_only`, `greenhouse_only`, `any_setup`
- `urgent` — narrativ als dringend kommuniziert
- `ambiguous` — mehrere plausible Diagnosen
- `premium_diagnosis_eligible` — bietet optional einen Coach-Hint
- `seasonal_summer`, `seasonal_winter`, `seasonal_autumn`, `seasonal_spring`
- `cosmetic_reward_eligible` — kann visuelles Belohnungs-VFX auslösen

### 5.3 Drei spezielle Eventklassen

Jenseits der Kategorien:

1. **Story-Beats** — vom Curator garantiert eingebrachte Events, einmal pro Run, narrativ wichtig (z. B. „Die erste Trichom-Bildung").
2. **Tutorial-Beats** — nur im Anfängermodus, einmal pro Lernkonzept im Spielerleben (over saves).
3. **Sandbox-Beats** *(Profi)* — vom Spieler manuell anstoßbare Test-Events.

---

## 6. Premium-Feeling durch Ketten, Eskalationen, Nachwirkungen

Drei Mechaniken, die zusammen das „App-Store-tauglich"-Gefühl tragen.

### 6.1 Event-Ketten als zentrale Erzähleinheit

Eine Kette ist eine **explizit gestaltete Mehrschritt-Geschichte** über mehrere Sim-Stunden bis -Tage:

```
[Auftakt-Event]  Topf trocken
        │
        ├─ schnell richtig gelöst →   [Erholungs-Event]  Wachstumsschub
        ├─ falsch gelöst →            [Folge-Event]      Stress-Welle
        │                                       │
        │                                       └─ ignoriert →  [Eskalation]  Welkebeginn
        │
        └─ zu lange ignoriert →       [Eskalation]       Welkebeginn
                                              │
                                              └─ gerettet → [Nachwirkung]  Schwächere Stage 6
```

Wichtige Eigenschaften:

- Ketten sind **datengetrieben** in `data/events/chains/*.json`.
- Spieler sieht ein **Kettenbanner** in der Hauptansicht (z. B. „Erholung läuft — 4 h Beobachtung").
- Erfolgreich abgeschlossene Ketten gehen in die **Run-Chronik** und in das **Lernprofil**.
- Eine Kette kann eine andere Kette **gating-en** (z. B. „Erst nach erstem Lockout möglich").

### 6.2 Sichtbare Eskalation

Aktuell ist Eskalation Engine-intern. V2 macht sie sichtbar:

- **Status-Bar-Anker** in der Hauptansicht: „Wasser-Stress steigt seit 4 h."
- **Pflanzen-Sprite** zeigt graduelle Verschlechterung (3 Stufen).
- **Audio-Layer** verändert sich subtil (mehr Schwere im Ambient Sound).
- **Coach** sagt einmal etwas, dann nie wieder zu derselben Eskalation.
- **Eskalationsstufen** mit klaren Namen: `latent → warning → escalating → critical`.

Premium-Effekt: Spieler spürt, dass die Pflanze leidet, ohne dass die Engine ständig blockierende Modale wirft.

### 6.3 Nachwirkungen mit Echtheit

Eine Lösung „löscht" das Problem nicht; sie hinterlässt eine **Nachwirkungs-Spur**:

- **Permanente Run-Marker:** „Stage 6 mit Stress-Erinnerung" (kleiner Indikator in der Akte, kein Spielmechanik-Schaden).
- **Statistische Folgen:** späterer Run-Score reflektiert Stressniveau im Lebenslauf der Pflanze.
- **Ästhetische Folgen:** auf der Pflanze sichtbares „verheiltes Blatt" (kleiner narrativer Stolz).

Diese Nachwirkungen sind nicht negativ, sondern **erinnern**. Sie geben Runs einen Charakter („Diese Pflanze hat ein bewegtes Leben hinter sich.").

### 6.4 Ruhephasen sind Premium

Bewusstes Pacing: Nach jeder Krise garantiert der Curator mindestens 2–4 Sim-Stunden ohne neues Event. In dieser Phase bekommt der Spieler:

- visuelles Wachstums-Feedback,
- Möglichkeit, kosmetische Pflege auszuführen,
- gelegentlich einen Lernkarten-Trigger ohne Krise.

---

## 7. Lernkarten, Diagnosehinweise, Fehleranalyse

Drei eigenständige Inhalts-Module, die in den Event-Flow eingebettet werden.

### 7.1 Lernkarten („Coach-Cards")

Mikro-Lektionen, jeweils 30–90 Sekunden Lesezeit.

**Format:**
- Titel (max 6 Wörter, klar wie eine Schlagzeile).
- 1 Schlüsselbild (eigenes Asset).
- 3–5 Stichpunkte mit echtem Grow-Wissen.
- 1 „Realer Bezug"-Kasten („So entsteht das in echten Grows").
- Optionaler „Mehr erfahren"-Link in eine ausführlichere In-Game-Bibliothek.

**Trigger:**
- Vor erstem Auftreten einer neuen Eventklasse (Anfänger / Geführt).
- Nach Auflösung eines Events bei `learning_beat`-Tag.
- Vom Spieler aktiv aus der Pflanzen-Akte aus aufrufbar.

**Persistenz:** „Gesehen-Status" über Saves hinweg — eine Lernkarte erscheint automatisch nur einmal.

### 7.2 Diagnosehinweise

Spielerisches Pendant zu „im Spiel messen statt raten".

- Im Anfänger- und Geführten Modus stehen **2–3 Diagnose-Aktionen** zur Wahl, bevor die Optionen erscheinen: „Substrat fühlen", „Blattunterseite prüfen", „pH-Stick einsetzen".
- Jede Diagnose liefert **eine konkrete Information** (z. B. „pH 5.2, leicht zu sauer").
- Diagnosen sind **gratis und endlos** im Anfängermodus, **rationiert** (z. B. 3 pro Sim-Tag) im Geführten, **nur via Tools** im Profi-Modus.
- Premium-Hinweis-Slot: Optional kostet ein **Coach-Spezial-Hint** ein Premium-Coin oder einmal pro Tag „rewarded ad" — er offenbart **die wahrscheinlichste Diagnose mit Begründung**.

### 7.3 Fehleranalyse

Nach jedem nicht-optimalen Outcome (Quality < `partial_mitigation`) erscheint eine **freiwillige** Fehleranalyse:

- Was geschah?
- Welche Signale gab es vorher?
- Welche Optionen wären besser gewesen?
- Welcher Lerninhalt hilft beim nächsten Mal?

Die Fehleranalyse ist **niemals verpflichtend** und niemals beschämend. Sprachton: ein guter Trainer.

### 7.4 Run-Chronik

Persistenter Eintrag pro Run:

- Liste aller Events, sortiert nach Sim-Tag.
- Lernkarten in der Reihenfolge, in der sie auftraten.
- Bemerkenswerte Momente (erste Trichome, gelöste Krise, Belohnung).
- Am Ende des Runs: ein Zwei-Absatz-Zusammenfassungstext, automatisch generiert aus Datenpunkten.

### 7.5 Pflanzen-Bibliothek

Sammlung aller je gesehenen Lernkarten und Eventtypen, zugänglich über das Hauptmenü, durchsuchbar, mit Filtern (Kategorie, Stage, Schwierigkeit). Wird Teil des Premium-Versprechens „Du baust dein eigenes Wissen auf".

---

## 8. Notwendige UI-Flows

Übersicht der Bildschirme und Übergänge. Detaillierter Wireframe-Stand folgt in `06_ui-flow.md`.

### 8.1 Hauptansicht (Plant Screen)

Permanent sichtbare Anker:

- **Pflanzen-Sprite** mit Symptom-Layern.
- **Status-Pillen** (Wasser, Nährstoff, Stress, Risiko, Wachstum) mit Trend-Pfeil über die letzten 6 Sim-Stunden.
- **Eskalations-Banner** (taucht nur auf, wenn aktiv).
- **Ketten-Banner** (taucht nur auf, wenn aktiv).
- **Event-Bell** mit Badge bei aktivem Event.
- **Coach-Stub** unten (klein, eine Zeile, dezent).

### 8.2 Event-Modal („Big Beat")

Bildschirmfüllendes Modal mit klarer Phasen-Choreografie:

```
1. Cover-Frame    Bild + Titel (1 Sek Auto-Reveal)
2. Symptom        Kurzbeschreibung + Sprite-Zoom
3. Diagnose-Slot  optional, bis zu 3 Aktionen
4. Optionen       2–4 Cards mit Risk/Reward-Chips
5. Wirkungs-Phase Halb-transparente Overlay-Animation
6. Outcome-Karte  Lernpunkt + Coach-Zeile
```

Schließen erst nach Outcome-Karte möglich.

### 8.3 Lernkarten-Reader

- Eigenes leichtgewichtiges Modal, vertikal scrollbar.
- „Verstanden"-Knopf bestätigt das Lesen, „Später"-Knopf legt den Beat in die Akte.
- Durchgängig animiertes Schlüsselbild im Header.

### 8.4 Run-Chronik

Eigene Top-Level-Seite:

- Zeitleiste der Sim-Tage.
- Filter: alle / Krisen / Lernkarten / Belohnungen.
- Tap auf Eintrag öffnet die zugehörige Outcome-Karte erneut.

### 8.5 Pflanzen-Bibliothek

Tab-View mit Kategorien-Reitern, Suche, Sortierung. Jede Karte: Titel, Cover, „Schon gesehen"-Status.

### 8.6 Settings → Spielmodus

Drei Modi-Karten als Auswahl, je mit kurzer Erklärung, jederzeit umschaltbar (außer mitten in einem Event).

### 8.7 Mikro-Interaktionen

- Trinkgieß-Animation an die jeweilige Option gekoppelt (langsam vs. schnell).
- Subtile Haptik bei Optionen-Hover (iOS) und Auswahl.
- Sound-Layer reagiert auf Stress-Niveau der Pflanze (zusätzlicher Bass).
- Empfehlungs-Pfeil im Anfängermodus animiert dezent (max 2 Sek).

### 8.8 Barrierefreiheit (App-Store-Pflicht)

- Mindestens WCAG 2.1 AA Kontrast in allen Event-UIs.
- Mindest-Tap-Target 44 × 44 pt iOS, 48 × 48 dp Android.
- Alle Events haben Alt-Texte für ihr Bild.
- Diagnose-Texte sind gut lesbar bei dynamischen Schriftgrößen (iOS Dynamic Type).
- Sound darf niemals einzige Informationsquelle sein.

---

## 9. Telemetrie und Balancing-Daten (V2-Ziel)

Zwei Datenströme, klar getrennt: **Internal-Only QA** (bleibt) und **Player-relevant Telemetry** (neu).

### 9.1 Player-relevant Telemetry (anonym)

Pro Event-Impression:

- `event_id`, `category`, `tags`, `severity`
- `mode` (anfänger/geführt/profi), `stage_index`, `setup_mode`
- `time_to_decision_ms`
- `chosen_option_id`, `option_intent`
- `outcome_quality` (`strong_recovery|partial_mitigation|poor_outcome|no_action`)
- `was_diagnostic_used`, `diagnoses_used`
- `chain_id` (falls in einer Kette), `chain_step`
- `escalated_at_decision` (war das Event schon eskaliert?)
- `coach_hint_used` (auch Premium-Hint?)

Pro Run-Abschluss:

- Verteilung der Ergebnisse.
- Run-Score, Pflanzen-Endzustand.
- Anzahl Lernkarten gesehen.
- Anzahl gelöster Ketten.

### 9.2 Balancing-KPIs

| KPI | Zielband |
|---|---|
| Events pro 56-Sim-Tage-Run | 12–18 |
| Anteil Optimalentscheidungen | 35–55 % (zu hoch = zu leicht, zu niedrig = frustig) |
| Anteil Lernkarten gelesen | ≥ 60 % im Anfängermodus, ≥ 35 % im Geführten |
| Drop-Off im Event-Modal | < 6 % |
| Time-to-Decision Median | 8–25 Sek im Anfängermodus, 4–15 im Geführten |
| Anteil eskalierter Events bei Anfängern | < 25 % |
| Anteil Runs mit Pflanzentod | Anfänger < 5 %, Geführt 10–18 %, Profi 25–40 % |

### 9.3 Reine QA-Tools (intern)

- Replay-Harness mit deterministischem Seed (vorhanden, bleibt).
- 50-Run-Comparator (geplant) mit Heatmaps pro Stage.
- Chain-Graph-Export als DOT/Graphviz für visuelle Storyboards.

### 9.4 Datenschutz / App-Store-Hygiene

- Alle Telemetrie anonym, ohne PII.
- Opt-Out im Settings, jederzeit.
- Lokale Telemetrie bleibt auch ohne Cloud verfügbar (für Run-Chronik).
- Cloud-Telemetrie (sobald aktiviert) trägt nur eine generierte UUID, keine Account-Daten.

---

## 10. Konkreter nächster Codex-Auftrag

Codex implementiert weiterhin **noch keinen** Engine-Code. Der nächste Schritt schreibt das Datenmodell-Dokument und legt Schema-/Beispiel-Strukturen an.

**Codex-Auftrag #002 — „Datenmodell vorbereiten (V3-Schema)"**

Strikte Vorgaben:

1. **Erstellen** (nicht ändern):
   - `docs/event-system-v2/02_data-model.md` mit Inhalts-Stub:
     - 02.1 Event-Schema v3 (Pflichtfelder, optionale Felder, Beispiel-Event).
     - 02.2 Chain-Schema (Pflichtfelder, Beispiel-Kette mit 3 Schritten).
     - 02.3 Player-Profile-Schema (KnowledgeProfile, KompetenceMap, PreferenceFlags).
     - 02.4 Run-State-Schema (Story-Budget, Story-Beats, Eskalationsverlauf).
     - 02.5 Lernkarten-Schema.
     - 02.6 Migrationsregeln v1/v2 → v3.
     - 02.7 Validierungsregeln (welche Constraints prüft das Schema).
   - `data/events/schemas/event.schema.json` als JSON-Schema-Stub mit `$id`, `$schema: "http://json-schema.org/draft-07/schema#"`, `type: "object"`, `required: []` und Platzhalter-Properties — **noch nicht final, nur Gerüst**.
   - `data/events/schemas/chain.schema.json` analog.
   - `data/events/schemas/learning-card.schema.json` analog.
   - `data/events/schemas/player-profile.schema.json` analog.
   - `data/events/catalog/_examples/` mit drei Beispielevents (eines pro Komplexitätsstufe), die das v3-Schema demonstrieren — als reines Vorschau-Material, nicht in den Live-Katalog eingebunden.

2. **Verboten:**
   - Keine Änderung an `app.js`, `src/events/`, `data/events.v2.json`, `data/events.json`.
   - Kein Lade-Code für die neuen Schemas.
   - Keine Tests gegen die neuen Schemas (kommt in `09_testing-plan.md` und Auftrag #004).
   - Keine Lokalisierungs-JSONs befüllen (kommt mit `i18nBridge.js` in Auftrag #006).

3. **Akzeptanzkriterien:**
   - Bestehende Tests laufen unverändert.
   - `node --check` auf `app.js`, `src/events/eventEngine.js`, `src/events/eventShared.js` ✅.
   - Neue Dateien existieren wie spezifiziert.
   - JSON-Schemas sind valides JSON-Schema Draft-07.
   - Beispielevents sind valides JSON.
   - `git status` zeigt nur Neu-Dateien, keine Modifikationen.

Direkt im Anschluss kommt das Architektur-Dokument `03_architecture.md`, das definiert, wie Curator, Coach und V2-Engine ineinandergreifen.

---

## 11. Erfolgskriterien für die V2-Vision

Damit am Ende klar messbar ist, ob die Vision aus diesem Dokument geliefert wurde:

1. **Externe Tester** können in unter 2 Minuten beschreiben, „was Grow Simulator anders macht" — und nennen das Event-System spontan.
2. **App-Store-Reviews** enthalten häufiger als 1 in 10 Reviews Begriffe wie „lernen", „echt", „bedeutsame Entscheidungen".
3. **Retention D7** liegt mindestens 25 % über dem Stand vor V2.
4. **Zeit pro Event-Modal** liegt im Mittel über 12 Sekunden (Spieler liest, statt zu klicken).
5. **Lernkarten-Lese-Quote** im Anfängermodus ≥ 60 %.
6. **Crash-/Save-Inkonsistenzen** im Event-Pfad: 0 in Soak-Tests über 50 Runs.
7. **Coach** wird in Reviews als „angenehm, nicht nervig" beschrieben (qualitative Erhebung).

---

## Anhang A — Designprinzipien für jedes Event

Beim Anlegen jedes neuen Events gilt:

1. **Echte Grow-Realität als Pate** — kein Fantasie-Schädling.
2. **Symptom vor Diagnose** — der Spieler sieht zuerst etwas an der Pflanze, dann liest er Worte.
3. **Mehrere Lösungswege** — mindestens zwei Optionen, die spielmechanisch sinnvoll sind, plus eine bewusste „Falsche".
4. **Zeit ist Spielmaterial** — eine Lösung wirkt nicht instant, eine Krise wartet.
5. **Sprachton ist Trainer, nicht Lehrer** — partnerschaftlich, nie belehrend.
6. **Niemals Bestrafung ohne Lernpotenzial** — selbst der Tod liefert eine konkrete Erkenntnis.
7. **Premium-Atmosphäre** — Bild, Sound, Haptik, Sprache zusammen, nicht in Silos gestaltet.
8. **Inklusiv im Realismus** — Indoor, Outdoor, Greenhouse haben eigene Geschichten, kein Setup ist zweitklassig.

---

## Anhang B — Wer macht was (Verantwortlichkeiten)

| Rolle | Zuständigkeit |
|---|---|
| Product Architect (Claude) | Vision, Datenmodell-Entwürfe, Architektur, Codex-Briefings |
| Game Design Co-Director (Claude) | Event-Inhalte, Lernkarten, Sprachton, Pacing-Profile |
| Codex | Implementierung gemäß Briefings, niemals ohne Briefing |
| Marco | Endgültige Designentscheidungen, Priorisierung, Veto bei Annahmen |
| QA / Soak | Replay-Runs, Balance-KPI-Berichte |

---

*Ende Premium-Vision-Entwurf 01.*
