# First 5 Minutes — Konzept

> Status: Konzept (visionär, nicht code-verankert) · Owner: Product/Claude · Datum: 2026-06-10
> Zweck: Den wichtigsten Abschnitt der gesamten App definieren — die ersten fünf Minuten eines neuen Spielers. Dieses Dokument beschreibt **was** passieren soll und **warum**. Die konkrete Umsetzung folgt als bounded Codex-Task (siehe Abschnitt 11).

---

## 1. Warum die ersten 5 Minuten alles entscheiden

Ein neuer Spieler trifft in den ersten Minuten genau eine Entscheidung: *bleiben oder gehen*. Er fragt nicht „Ist die Simulation realistisch?" — das merkt er erst nach mehreren Runs. Er fragt: **„Verstehe ich, was hier passiert? Gehört mir das hier? Will ich wissen, wie es weitergeht?"**

GrowSimulator hat ein starkes Produkt darunter (84-Tage-Simulation, Eventsystem V2, Buddy, Stress/Risk). Aber all das ist in Minute 1 unsichtbar. Die ersten 5 Minuten müssen die *Tiefe versprechen, ohne sie zu zeigen* — und gleichzeitig sofort ein lebendiges, eigenes Gefühl erzeugen. Das Ziel ist nicht, alles zu erklären. Das Ziel ist, einen einzigen ehrlichen „Aha"-Moment zu liefern und eine offene Frage im Kopf des Spielers zu hinterlassen.

**Der Erfolgssatz, den der Spieler nach 5 Minuten denken soll:**
> „Ich habe gerade eine echte Entscheidung getroffen, ich habe gesehen, dass sie etwas bewirkt — und ich will sehen, was morgen mit meiner Pflanze ist."

---

## 2. Leitprinzipien

**Spielen vor Erklären.** Kein Tutorial-Wall, keine Feature-Tour. Der Spieler lernt durch eine echte (aber gesicherte) Mini-Handlung, nicht durch Text. Buddy erklärt *im Moment der Handlung*, nicht davor.

**Eine Pflanze ab Sekunde 60.** Je schneller etwas Lebendiges auf dem Schirm ist, das dem Spieler „gehört", desto besser. Setup wird auf das absolute Minimum reduziert; alles Weitere kann später vertieft werden.

**Kein Account-Wall.** Guest-Mode ist der Default-Einstieg. Registrierung wird *nach* dem ersten Erfolgserlebnis angeboten („Sichere deinen Grow"), nie davor.

**Eine Entscheidung mit sichtbarer Folge.** Der Kern der ersten 5 Minuten ist *ein* echter Decision-Moment mit nachvollziehbarer Konsequenz. Nicht zufällig, nicht bestrafend — verständlich.

**Cliffhanger statt Abschluss.** Minute 5 endet nicht mit „Fertig!", sondern mit einer offenen Spannung: ein nahendes Ereignis, eine wachsende Pflanze, eine Frage von Buddy.

**Buddy ist Begleiter, nicht Lehrer.** Buddy reagiert, freut sich, warnt sanft — er hält keine Vorträge. Maximal 1–2 kurze Sätze pro Auftritt.

---

## 3. Der emotionale Bogen

Die fünf Minuten folgen bewusst einer Dramaturgie statt einer Feature-Liste:

1. **Hook (0:00–0:30)** — Atmosphäre, Identität, Versprechen. „Das ist kein Rechner."
2. **Ownership (0:30–1:30)** — Minimal-Setup → die Pflanze existiert und gehört mir.
3. **Agency (1:30–3:00)** — Ich treffe meine erste echte Pflege-Entscheidung.
4. **Consequence (3:00–4:00)** — Ich sehe eine nachvollziehbare Folge; Buddy ordnet sie ein.
5. **Cliffhanger (4:00–5:00)** — Eine Spannung baut sich auf; ich will weitermachen.

Jede Phase hat genau *ein* emotionales Ziel. Alles, was nicht auf dieses Ziel einzahlt, gehört nicht in die ersten 5 Minuten.

---

## 4. Minute-für-Minute Flow

### 0:00 – 0:30 · Der Hook
Kein Splash-Logo, das nur lädt. Der erste Screen zeigt Atmosphäre: dunkel-grüne, ruhige Welt, ein weicher Lichtkegel, ein Boden-Container — und Buddy, der hereinkommt. **Ein** Satz, kein Menü-Dump.

- Buddy: *„Hey. Ich bin Buddy. Lass uns deine erste Pflanze großziehen — ich bin die ganze Zeit dabei."*
- Genau **ein** primärer Button: **„Los geht's"**. Klein und unaufdringlich darunter: „Schon dabei? Anmelden".

Ziel: In 5 Sekunden ist klar, dass dies ein begleitetes, lebendiges Erlebnis ist — kein Dashboard.

### 0:30 – 1:30 · Ownership (Minimal-Setup)
Kein 6-stufiger Setup-Wizard für den ersten Run. Der Erst-Spieler trifft **maximal eine** sichtbare Auswahl, der Rest ist sinnvoll vorbelegt (kuratiertes Starter-Setup: einsteigerfreundliche Genetik, Container, Substrat, Licht — indoor, einfache Schwierigkeit).

- **Eine** spürbare Wahl, die Identität stiftet, ohne zu überfordern — z. B. den Namen der Pflanze oder die Wahl zwischen 2–3 vorkuratierten „Vibes"/Genetiken mit je einem Halbsatz Charakter („robust & verzeihend" vs. „etwas anspruchsvoller, aber lohnend").
- Sobald gewählt: kurze, befriedigende Pflanz-Animation. Der Samen kommt in die Erde. **Die Pflanze existiert jetzt.**
- Buddy: *„Sag Hallo zu [Name]. Ab jetzt entscheidest du, wie es ihr geht."*

Ziel: Besitzgefühl. Das ist *meine* Pflanze, ich habe sie benannt/gewählt.

> Hinweis: Das volle Setup (Container, Substrat, Genetik, Licht, Environment, Difficulty) bleibt für erfahrene Spieler und spätere Runs vollständig erhalten — es wird im *ersten* Run nur nicht vorgeschaltet.

### 1:30 – 3:00 · Agency (Die erste echte Entscheidung)
Jetzt zeigt sich der Homescreen in seiner ruhigen Form: Player-Card, ein **einziger** klarer Status, ein **einziger** klarer nächster Schritt. Keine volle Stats-Bar, keine zehn Karten gleichzeitig — progressive Offenlegung.

Buddy stellt eine echte, kleine Care-Entscheidung — die erste Bewässerung als kanonisches Beispiel:

- Buddy: *„[Name] ist durstig. Wie viel Wasser?"* → 3 Optionen: **wenig / passend / viel**.
- Das ist bewusst *die* klassische Lern-Lektion (Überwässern schadet) — aber im ersten Run **abgefedert**: keine Option „tötet" die Pflanze, jede Option ist erlebbar und erklärbar.

Ziel: Der Spieler handelt selbst. Es fühlt sich wie *seine* Entscheidung an, nicht wie ein Button-Klick im Tutorial.

### 3:00 – 4:00 · Consequence (Sichtbare, verständliche Folge)
Die Entscheidung hat eine sofort lesbare Wirkung — visuell an der Pflanze und in einem kurzen Buddy-Feedback. Wichtig: **nie zufällig, immer erklärbar.**

- Bei „passend": *„Genau richtig. Sieht man, oder? Die Blätter stehen.* 🌱*"* — leichter Stress-Rückgang, positive Mikro-Animation.
- Bei „viel": *„Ein bisschen viel — die Wurzeln mögen auch Luft. Kein Drama, das kriegen wir hin."* — kleiner, **reversibler** Stress-Anstieg, sichtbar aber nicht bedrohlich.
- Bei „wenig": *„Etwas knapp. Morgen ruhig etwas großzügiger."*

Hier wird das Kern-Versprechen der App eingelöst: **Entscheidung → nachvollziehbare Konsequenz → ich verstehe, warum.** Das ist der „Aha"-Moment.

### 4:00 – 5:00 · Cliffhanger (Spannung statt Abschluss)
Statt eines „Tutorial abgeschlossen"-Bildschirms baut sich eine sanfte Spannung auf — ein leichter Vorläufer aus der Logik des Eventsystems (z. B. eine angekündigte Wetter-/Klima-Veränderung über Nacht, oder einfach „der erste echte Wachstumsschritt steht bevor"). Buddy kündigt an, ohne Druck:

- Buddy: *„Über Nacht passiert eine Menge. Morgen sehen wir den ersten echten Schritt — und vielleicht die erste kleine Herausforderung. Schaust du wieder rein?"*
- Erst **jetzt** der sanfte Account-Prompt: **„Grow sichern"** (optional, schließbar) — *„Damit [Name] auf dich wartet, auch wenn du die App schließt."*
- Ein klares Zeichen der laufenden Zeit (Tag/Nacht-Wechsel beginnt) macht spürbar: die Welt läuft weiter.

Ziel: Offene Schleife im Kopf. Der Spieler geht mit einer Frage, nicht mit einem Häkchen.

---

## 5. Screens & Komponenten (Mapping auf bestehende UI-Areale)

Die ersten 5 Minuten erfinden keine neuen Welten — sie inszenieren bestehende Areale in einer reduzierten, geführten Reihenfolge:

- **Intro/Hook** → neuer, sehr schlanker Welcome-Zustand (Atmosphäre + Buddy + 1 Button).
- **Minimal-Setup** → reduzierter Onboarding-Pfad; nutzt das bestehende Setup-Modell, blendet aber nur 1 Auswahl ein und nimmt kuratierte Defaults.
- **Homescreen / Player-Card / Progress-Card** → in „First Run"-Variante mit progressiver Offenlegung (zunächst nur 1 Status + 1 Aktion).
- **Care Studio / Daily-Care** → liefert die erste Bewässerungs-Entscheidung in vereinfachter Form.
- **Buddy Short-Check** → trägt alle Buddy-Auftritte; jeweils 1–2 Sätze.
- **Event Center** → liefert nur den *Vorläufer*/Cliffhanger, kein vollständiges Event im ersten Run.

Prinzip: **First-Run-Modus als Zustand, nicht als Parallel-App.** Wir bauen keine zweite UI — wir reduzieren und sequenzieren die vorhandene.

---

## 6. Buddy-Tonalität in den ersten 5 Minuten

Kurz, warm, nie belehrend. Buddy feiert kleine Erfolge, benennt Fehler ohne Härte („kein Drama"), und stellt Fragen statt Anweisungen. Pro Auftritt 1–2 Sätze, nie ein Textblock. Buddys Sprache ist über alle drei Sprachen (DE/EN/ES) konsistent zu halten — alle Texte als **i18n-Keys**, keine Hardcodes. Die bestehende i18n-Key-Struktur wird nicht umgebaut, sondern um einen klar benannten Namespace (z. B. `onboarding.first5.*`) ergänzt.

---

## 7. Der „First Decision"-Moment im Detail (das Herzstück)

Wenn nur **eine** Sache aus diesem Konzept perfekt umgesetzt wird, dann diese:

- **Eine** Entscheidung, **drei** Optionen, **keine** Falle.
- Jede Option hat eine sichtbare, sofort lesbare Folge an der Pflanze.
- Buddy ordnet die Folge in *einem* Satz ein und macht die zugrunde liegende Logik spürbar (Über-/Unterwässern), ohne sie als Lektion zu predigen.
- Die Konsequenz ist im ersten Run **reversibel** — sie lehrt, ohne zu bestrafen. Die echte Schärfe (irreversible Fehler, harte Stress-/Risk-Folgen) kommt in späteren Runs und höheren Schwierigkeiten.

Dieser Moment ist der Beweis des gesamten Produktversprechens in 30 Sekunden: *verständliche Simulation, die mich klüger macht.*

---

## 8. Anti-Patterns — was wir bewusst NICHT tun

- Kein Tutorial-Wall, keine Feature-Tour, keine Coachmark-Overlays über die halbe UI.
- Kein Account-/Login-Wall vor dem ersten Erfolgserlebnis.
- Kein voller 6-Schritt-Setup-Wizard im allerersten Run.
- Keine vollständige Stats-Bar mit 8 Werten in Minute 1 (Reizüberflutung).
- Keine zufällig wirkenden Folgen ohne Erklärung.
- Kein „Tutorial abgeschlossen!"-Abschluss-Screen ohne Cliffhanger.
- Keine Buddy-Textwände; kein kindlicher oder generischer KI-Filler-Ton.
- Keine echten, harten Bestrafungen im allerersten Run.

---

## 9. Erfolgskriterien (messbare Signale)

Qualitativ ist das Konzept erfüllt, wenn der Spieler nach 5 Minuten den Erfolgssatz aus Abschnitt 1 denken würde. Quantitativ sind das die Signale, die ein späteres Telemetrie-/QA-Setup prüfen sollte:

- **Time-to-Plant** < 90 Sekunden (Pflanze existiert und ist benannt/gewählt).
- **Time-to-First-Decision** < 3 Minuten.
- **First-Decision-Completion-Rate** hoch (Spieler treffen die erste Care-Entscheidung tatsächlich).
- **5-Minute-Continuation**: Spieler tippt nach dem Cliffhanger weiter / kehrt zurück.
- **Kein erzwungener Account**: Anteil, der im Guest-Mode startet, ohne abzubrechen.

(Telemetrie nutzt das vorhandene Audit/Telemetry-System; keine neuen Tracking-Abhängigkeiten ohne Freigabe.)

---

## 10. Risiken & Guardrails

Dieses Konzept berührt mehrere High-Risk-Areale aus CLAUDE.md. Disziplin:

- **Guest-Mode & App-Startpfad** sind High-Risk → der First-Run-Einstieg darf den bestehenden Startpfad nicht brechen; First-Run ist ein *Zustand*, kein neuer Boot-Pfad.
- **Savegame-Struktur** → der vereinfachte Erst-Run muss in dieselbe Save-Struktur schreiben wie ein normaler Run (kuratierte Defaults = normal gesetzte Werte), damit kein Migrationsbruch entsteht.
- **Eventsystem V2** → der Cliffhanger nutzt nur einen *bestehenden, leichten* Vorläufer-Mechanismus; **kein** Rewrite, keine neue Event-Logik.
- **i18n-Key-Struktur** → nur additiver Namespace, kein Umbau.
- **Assets** → die Pflanz-/Wachstums-Visuals nutzen nur **bereits freigegebene** Assets; keine Integration unfertiger generierter Plant-Assets.
- **Monetization** → der Account-/„Grow sichern"-Prompt ändert kein Coin-/Reward-/Progression-Balancing.

Grundregel: erst inspizieren, kleinster sicherer Schritt, verifizieren.

---

## 11. Umsetzung in Stufen (Empfehlung)

Nicht alles auf einmal. Empfohlene Reihenfolge, jeweils als eigener bounded Codex-Task:

1. **Stufe A — First-Run-Sequenz als Gerüst**: Hook-Screen + Minimal-Setup (1 Auswahl + kuratierte Defaults) + Übergang zum reduzierten Homescreen. Reiner UI-/Flow-Zustand, keine Sim-Logik-Änderung. *(Startpunkt — siehe abgeleiteter Codex-Task.)*
2. **Stufe B — First Decision**: vereinfachte, abgefederte erste Bewässerungs-Entscheidung mit sichtbarer, reversibler Folge + Buddy-Feedback.
3. **Stufe C — Cliffhanger**: leichter Event-Vorläufer + Tag/Nacht-Signal + optionaler Account-Prompt.

Jede Stufe wird einzeln verifiziert (Onboarding-/Guest-Smoke-Tests grün, i18n-Audit grün) bevor die nächste beginnt.
