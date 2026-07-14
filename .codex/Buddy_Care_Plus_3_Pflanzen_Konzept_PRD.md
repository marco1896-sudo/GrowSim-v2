# Buddy Care+ für 3 Pflanzen  
## Professionelles Produktkonzept & Entwicklungsbriefing für Codex / Claude Code

**Projekt:** Grow Simulator  
**Feature / Produktlinie:** Buddy Care+  
**Version:** Konzept v1.0  
**Datum:** 2026-07-09  
**Ziel:** Aus Grow Simulator ein monetarisierbares, klares Premium-Produkt machen, ohne die Marke, den Buddy-Charakter oder die spielerische Ebene zu verlieren.

---

## 0. Kurzfassung

**Buddy Care+** ist der Premiumbereich von Grow Simulator für erwachsene Homegrower, die bis zu **3 Pflanzen** strukturiert begleiten wollen.

Die App soll nicht als „Grow-Maximierungs-Tool“ positioniert werden, sondern als:

> **Digitaler 3-Pflanzen-Coach für Übersicht, Pflege-Routine, Tagebuch, Erinnerungen und Fehlervermeidung.**

Der Kaufgrund ist nicht das Spiel.  
Der Kaufgrund ist:

> **„Ich möchte meine echten Pflanzen nicht durch Anfängerfehler, Chaos oder Vergessen ruinieren.“**

Die Spielwelt bleibt erhalten, aber Buddy Care+ verkauft **Struktur, Sicherheit, Dokumentation und Routine**.

---

## 1. Produktpositionierung

### 1.1 Hauptversprechen

> **Buddy Care+ begleitet deine 3 Pflanzen durch die Saison: mit Tagesaufgaben, Wochenplan, Pflege-Checks, Erinnerungen, Tagebuch, Risiko-Ampeln und PDF-Export.**

### 1.2 Nicht positionieren als

Nicht so formulieren:

- „Maximiere deinen Ertrag.“
- „Hol das Maximum aus deinen Pflanzen.“
- „Baue besseres Cannabis an.“
- „Perfekter Grow garantiert.“
- „Düngeplan für maximale Potenz.“
- „Cannabis-Anleitung Schritt für Schritt.“

### 1.3 Besser positionieren als

Besser formulieren:

- „Struktur für deinen legalen 3-Pflanzen-Grow.“
- „Tagesroutine statt Forum-Chaos.“
- „Dokumentiere, beobachte und erkenne Probleme früher.“
- „Buddy erinnert dich an sinnvolle Checks.“
- „Dein digitales Pflanzen-Tagebuch mit Wochenplan.“

### 1.4 Kernnutzen

Buddy Care+ soll drei Probleme lösen:

1. **Chaos reduzieren**  
   Nutzer wissen nicht, was wann wichtig ist.

2. **Überreaktion vermeiden**  
   Anfänger ändern oft zu viel, zu schnell, zu hektisch.

3. **Verlauf dokumentieren**  
   Ohne Fotos, Notizen und Daten erkennt man Muster zu spät.

---

## 2. Zielgruppe

### 2.1 Hauptzielgruppe

Erwachsene Nutzer in Deutschland, die privat 1–3 Pflanzen anbauen oder anbauen möchten und einen einfachen digitalen Begleiter suchen.

Typische Nutzer:

- Anfänger
- Wiedereinsteiger
- Outdoor-/Gewächshaus-Grower
- kleine Indoor-Setups
- Nutzer mit wenig Lust auf Foren-Chaos
- Nutzer, die keine komplizierte Profi-App wollen
- Nutzer, die gern mit Buddy interagieren

### 2.2 Nutzer-Persona A: Anfänger

**Name:** Tim  
**Situation:** Hat 3 Pflanzen gestartet, aber kaum Erfahrung.  
**Schmerz:** Weiß nicht, ob er zu viel gießt, zu wenig beobachtet oder zu spät reagiert.  
**Kaufgrund:** Will klare Tages- und Wochenaufgaben.

### 2.3 Nutzer-Persona B: Outdoor/Gewächshaus

**Name:** Lisa  
**Situation:** Baut draußen oder im Gewächshaus an.  
**Schmerz:** Wetter, Hitze, Regen, Luftfeuchte und Schimmelrisiko sind schwer einzuschätzen.  
**Kaufgrund:** Will einfache Warnhinweise und ein sauberes Tagebuch.

### 2.4 Nutzer-Persona C: Technik-/App-Nutzer

**Name:** Max  
**Situation:** Nutzt gern Apps, Tracker und Tools.  
**Schmerz:** Zettel, Handyfotos und Notizen sind verstreut.  
**Kaufgrund:** Will Pflanzenprofile, Fotoverlauf und PDF-Export.

---

## 3. Rechtlicher und plattformbezogener Rahmen

> **Hinweis:** Dieses Dokument ist keine Rechtsberatung. Die folgenden Punkte dienen als Produkt- und Risikorahmen für Entwicklung, UX, Payment und Marketing.

### 3.1 Deutschland: 3-Pflanzen-Rahmen

Das Produkt soll bewusst auf **maximal 3 Pflanzen** begrenzt sein, weil das als klarer, rechtlich und kommunikativ nachvollziehbarer Rahmen für Deutschland dient.

Produktregel:

- Free: 1 Pflanze
- Buddy Care+: maximal 3 Pflanzen
- Keine Funktion für Massenanbau
- Keine Marketplace-Funktion
- Keine Weitergabe-/Verkaufsfunktion
- Kein Seed-Shop
- Keine THC-/CBD-Produktvermittlung
- Keine Ertragsgarantien

### 3.2 Altersgrenze

Buddy Care+ muss als **18+ Produktbereich** behandelt werden.

Empfohlen:

- Age-Gate vor Grow-bezogenen Funktionen
- Hinweis: Nutzung nur für Erwachsene
- Hinweis: lokale Gesetze beachten
- Hinweis: Pflanzen und Ernte vor Kindern, Jugendlichen und Dritten schützen

### 3.3 Plattform- und Werberisiko

Cannabis-nahe Inhalte können bei Werbenetzwerken, App Stores und Zahlungsanbietern eingeschränkt sein.

Konsequenz für Produktentwicklung:

- PWA zuerst, nicht App Store zuerst
- Keine direkte Cannabis-Verkaufsfunktion
- Keine Seed-/THC-/CBD-Commerce-Funktionen
- Keine Werbemonetarisierung als Hauptmodell
- Payment-Provider-Freigabe als Release-Gate
- Rechtlich vorsichtige Kommunikation
- Keine Versprechen zu Ertrag, Potenz oder Konsumförderung

### 3.4 Payment-Risiko

Einige Zahlungsanbieter schließen cannabisbezogene Produkte, Grow-Anleitungen oder Cultivation-Informationen aus oder behandeln sie als erhöhtes Risiko.

**Release-Gate:**

Vor echter Paywall muss geprüft werden:

- Darf der konkrete Anbieter digitale Grow-Journal-/Care-Software abrechnen?
- Ist „Cannabis“, „Grow“, „Cultivation“ oder „Homegrow“ in der Anbieter-Policy problematisch?
- Muss das Produkt neutraler als Pflanzenpflege-/Tagebuch-/Simulationssoftware positioniert werden?
- Wird eine schriftliche Freigabe oder ein alternatives Zahlungsmodell benötigt?

**Entwicklungsentscheidung:**  
Bis zur Klärung Payment als Feature-Flag bauen:

```ts
FEATURE_CARE_PLUS_PAYWALL=false
FEATURE_CARE_PLUS_CHECKOUT=false
FEATURE_CARE_PLUS_SEASON_PASS=false
```

### 3.5 Compliance-Grenzen im Produkt

Buddy Care+ darf:

- Pflanzenprofile verwalten
- Pflege-Checks anbieten
- Tages- und Wochenaufgaben generieren
- Fotoverlauf speichern
- Tagebuch führen
- Risiko-Ampeln anzeigen
- allgemeine Hinweise zu Beobachtung, Routine, Sicherheit und Dokumentation geben

Buddy Care+ darf nicht:

- Verkauf oder Weitergabe ermöglichen
- Bezugsquellen vermitteln
- Seed-/Cannabis-Shops einbinden
- THC-/CBD-Produkte verkaufen
- gesetzliche Limits umgehen helfen
- Ertrag/Potenz als Ziel aggressiv optimieren
- Minderjährige ansprechen
- Konsum fördern
- illegale Nutzung unterstützen

---

## 4. Produktstruktur

### 4.1 Produktname

**Buddy Care+**

### 4.2 Untertitel

> **Der digitale 3-Pflanzen-Coach im Grow Simulator.**

### 4.3 Kurzbeschreibung

> Buddy Care+ begleitet deine 3 Pflanzen mit Tagesaufgaben, Wochenplan, Pflege-Checks, Erinnerungen, Tagebuch, Risiko-Ampeln und PDF-Export.

### 4.4 Hauptmodule

1. 3-Pflanzen-Dashboard
2. Setup-Assistent
3. Care Calendar
4. Heute-Ansicht
5. Tagescheck
6. Grow-Tagebuch
7. Risiko-Ampel
8. Erinnerungen
9. PDF-Export
10. Paywall / Saisonpass
11. Optional: physisches Buddy-Starterpack mit QR-Pflanzensteckern

---

## 5. Free vs. Premium

### 5.1 Free-Version

Ziel: Nutzer soll echten Nutzen spüren, aber die 3-Pflanzen-Begleitung als Premium verstehen.

Free enthält:

- 1 Pflanzen-Slot
- Basis-Dashboard
- einfacher Tagescheck
- einfache Buddy-Hinweise
- 7 Tage Tagebuchverlauf
- eingeschränkter Wochenplan
- keine PDF-Exports oder nur Wasserzeichen
- keine Erinnerungen
- keine erweiterten Risiko-Ampeln

### 5.2 Buddy Care+ Monatsabo

Preisidee:

> **4,99 € / Monat**

Enthält:

- bis zu 3 Pflanzen
- vollständiger Wochenplan
- Tagesaufgaben
- Tagebuch unbegrenzt
- Fotoverlauf
- Risiko-Ampeln
- Erinnerungen
- PDF-Export
- Saisonabschlussbericht
- Buddy-Kommentare

### 5.3 Buddy Care+ Saisonpass

Preisidee:

> **19,99 € einmalig pro Saison**

Enthält:

- bis zu 3 Pflanzen
- 1 Saison
- vollständiger Plan
- Tagebuch
- Erinnerungen
- Risiko-Ampeln
- PDF-Export
- Abschlussbericht

**Empfehlung:** Saisonpass zuerst testen.  
Viele Nutzer akzeptieren Einmalzahlung eher als Abo.

### 5.4 Bundle mit 3D-Druck

Optional später:

> **Buddy Care+ Starter Pack – 34,90 €**

Enthält:

- Buddy Care+ Saisonpass
- 3 Buddy-Pflanzenstecker
- 3 QR-Codes
- QR-Code öffnet direkt die jeweilige Pflanze im Grow Simulator

---

## 6. UX-Grundprinzipien

### 6.1 Simpel statt Profi-Tool

Der Nutzer soll nicht das Gefühl haben, eine Laborsoftware zu bedienen.

Regeln:

- maximal 1 primäre Aktion pro Screen
- klare Ampeln
- kurze Buddy-Texte
- keine überladenen Tabellen im Alltag
- Details optional einklappbar
- Anfänger-freundliche Sprache

### 6.2 Buddy als Coach, nicht als Besserwisser

Buddy klingt ruhig, hilfreich und beobachtend.

Buddy sagt nicht:

> „Du musst jetzt sofort X machen.“

Buddy sagt besser:

> „Gelb heißt nicht Panik. Schau heute genauer hin und dokumentiere die Veränderung.“

### 6.3 Beobachten vor Handeln

Zentrale Produktphilosophie:

> **Nicht jede Veränderung braucht sofort eine Aktion.**

Das ist besonders für Anfänger wichtig.

### 6.4 3 Pflanzen als Kernmechanik

Die App zeigt immer maximal 3 Slots.

Beispiel:

- Pflanze 1
- Pflanze 2
- Pflanze 3

Optional emotionaler:

- Buddy Slot A
- Buddy Slot B
- Buddy Slot C

Jeder Slot hat:

- Name
- Foto
- Phase
- Status
- nächste Aufgabe
- letzter Eintrag
- Risiko-Ampel

---

## 7. User Flow

### 7.1 Erststart

1. Landing Screen
2. Age-Gate
3. Kurzversprechen
4. Anzahl Pflanzen wählen: 1, 2 oder 3
5. Pflanzen anlegen
6. Buddy erstellt Plan
7. Nutzer sieht Vorschau
8. Paywall bei vollständigem Plan / 3-Pflanzen-Funktion

### 7.2 Setup-Assistent

Pro Pflanze erfassen:

- Pflanzenname
- Startdatum
- Pflanzentyp: Auto / Photoperiodisch / Unbekannt
- Umgebung: Indoor / Outdoor / Gewächshaus
- Medium: Erde / Living Soil / Kokos / Hydro / Unbekannt
- Behälter: Topf / Beet / DWC / Unbekannt
- Topfgröße optional
- aktueller Zustand: gesund / unsicher / Problem sichtbar
- Erfahrung des Nutzers: Anfänger / etwas Erfahrung / fortgeschritten

Optional später:

- Sorte
- Keimdatum
- Umtopfdatum
- Standort
- Sonnenstunden
- Lichtleistung
- Temperatur/Luftfeuchte manuell
- Foto beim Start

### 7.3 Dashboard

Screen: **Meine 3 Pflanzen**

Jede Karte zeigt:

- Bild
- Name
- Phase
- Tag seit Start
- Status-Ampel
- nächste Aufgabe
- letzter Eintrag
- Button: „Check starten“
- Button: „Tagebuch“

### 7.4 Heute-Ansicht

Screen: **Heute wichtig**

Beispiel:

```md
Heute wichtig

Pflanze 1 – Grün
Aufgabe: Bodenfeuchte prüfen
Buddy: "Heute reicht Kontrolle. Keine unnötigen Änderungen."

Pflanze 2 – Gelb
Aufgabe: Blattspitzen erneut anschauen
Buddy: "Noch kein Grund zur Panik. Vergleiche mit dem Foto von gestern."

Pflanze 3 – Grün
Aufgabe: Foto machen
Buddy: "Guter Tag für eine Verlaufskontrolle."
```

### 7.5 Tagescheck

Der Nutzer beantwortet pro Pflanze kurze Fragen:

- Boden/Medium: trocken / feucht / nass / unbekannt
- Blätter: normal / hängen / rollen / Flecken / gelb
- Wachstum: normal / schnell / langsam / unbekannt
- Wetter/Umgebung: normal / heiß / sehr feucht / kalt / windig
- Schädlinge sichtbar: nein / unsicher / ja
- Foto hinzufügen: optional
- Notiz: optional

Nach Abschluss:

- Status-Ampel aktualisieren
- nächste Aufgabe erzeugen
- Tagebucheintrag speichern
- Buddy-Kommentar anzeigen

### 7.6 Wochenplan

Screen: **Diese Woche**

Pro Pflanze:

- Phase
- Hauptfokus
- 3–5 Aufgaben
- typische Risiken
- was vermeiden?
- Buddy-Hinweis

Beispiel:

```md
Woche 5 – Vegetative Phase

Fokus:
- Wachstum beobachten
- gleichmäßige Routine halten
- keine hektischen Änderungen

Aufgaben:
- 2–3x Bodenfeuchte prüfen
- 1x Höhe dokumentieren
- 1x Foto machen
- Blattfarbe beobachten

Vermeiden:
- täglich neue Maßnahmen
- Gießen ohne Feuchteprüfung
- mehrere Änderungen gleichzeitig
```

### 7.7 Tagebuch

Pro Pflanze:

- Datum
- Foto
- Höhe
- Pflegeaktion
- Check-Ergebnis
- Notiz
- Buddy-Kommentar
- Status-Ampel
- Tags

Tags:

- Gießen
- Foto
- Höhe
- Wetter
- Umtopfen
- Schnitt/Training
- Schädlinge
- Blüte
- Ernte
- Problem
- Beobachtung

### 7.8 PDF-Export

Export enthält:

- Titel
- Nutzer-/Grow-Name optional
- Pflanzenübersicht
- Timeline
- wichtigste Fotos
- Phasenverlauf
- Pflegeeinträge
- Warnungen
- Learnings
- Abschlussnotiz
- rechtlicher Hinweis / Disclaimer

Dateiname:

```txt
buddy-care-plus-grow-report-YYYY-MM-DD.pdf
```

---

## 8. Feature-Spezifikation

### 8.1 3-Pflanzen-Dashboard

**Ziel:** Nutzer sieht sofort, was mit seinen Pflanzen los ist.

Anforderungen:

- genau 1 bis 3 Pflanzen sichtbar
- bei Free nur 1 Slot aktiv
- bei Care+ bis 3 Slots aktiv
- Status: Grün / Gelb / Rot / Grau
- Phase anzeigen
- nächster Task anzeigen
- letzter Tagebucheintrag anzeigen
- CTA „Heute checken“

Akzeptanzkriterien:

- Nutzer kann eine Pflanze anlegen
- Nutzer kann maximal 3 Pflanzen anlegen
- Free-Nutzer sieht Upgrade-Hinweis beim zweiten Slot
- Care+-Nutzer kann 3 Pflanzen vollständig verwalten
- Dashboard lädt unter 1 Sekunde bei lokal gespeicherten Daten

---

### 8.2 Care Calendar

**Ziel:** Wochenweise Orientierung.

Anforderungen:

- Phase aus Startdatum und Pflanzentyp ableiten
- Aufgaben je Phase generieren
- Umgebung berücksichtigen: Indoor / Outdoor / Gewächshaus
- Nutzererfahrung berücksichtigen
- Wochenplan pro Pflanze erzeugen
- Heute-Ansicht aus Wochenplan ableiten

Akzeptanzkriterien:

- Für jede Pflanze wird eine Phase berechnet
- Für jede Phase gibt es mindestens 3 passende Aufgaben
- Aufgaben wiederholen sich nicht unnötig täglich
- Buddy-Texte sind kurz und verständlich

---

### 8.3 Tagescheck

**Ziel:** Niedrigschwellige tägliche Routine.

Anforderungen:

- Check dauert unter 60 Sekunden pro Pflanze
- Multiple-Choice statt Freitext
- Foto optional
- Notiz optional
- Ergebnis erzeugt Ampel
- Eintrag wird im Tagebuch gespeichert

Akzeptanzkriterien:

- Tagescheck erzeugt DiaryEntry
- Tagescheck aktualisiert PlantCareStatus
- Ampel ändert sich bei Risikosignalen
- Buddy-Kommentar wird angezeigt

---

### 8.4 Risiko-Ampel

**Ziel:** Früher auf mögliche Probleme hinweisen, ohne Panik zu erzeugen.

Status:

- Grün: alles unauffällig
- Gelb: beobachten
- Rot: genauer prüfen / mehrere Warnsignale
- Grau: zu wenig Daten

Regelprinzip:

- Ein einzelnes Signal = meistens Gelb
- Mehrere Signale zusammen = Rot möglich
- Keine harten Diagnosen
- Immer Beobachtung und Dokumentation betonen

Beispiele:

```txt
Hängende Blätter + Medium nass + häufiges Gießen = Überwässerungsrisiko
Blütephase + Gewächshaus + sehr feucht = Schimmelrisiko
Outdoor + heiß + Medium trocken = Hitzestress-/Trockenstressrisiko
Flecken + Schädlinge unsicher = Beobachtung/Fotovergleich
```

---

### 8.5 Erinnerungen

**Ziel:** Nutzer vergisst wichtige Routine nicht.

MVP:

- lokale Browser Notifications optional
- Reminder-Zeit wählbar
- Standard: 18:00 Uhr
- Reminder nur, wenn Nutzer zustimmt

Reminder-Typen:

- Tagescheck
- Foto machen
- Höhe eintragen
- Wochenreview
- Erntefenster beobachten
- PDF/Abschlussbericht erstellen

---

### 8.6 Paywall

**Ziel:** Monetarisierung ohne aggressive Blockade.

Empfohlener Flow:

1. Nutzer legt bis zu 3 Pflanzen an
2. Buddy erzeugt Planvorschau
3. Nutzer sieht:
   - erste 7 Tage
   - Dashboard-Vorschau
   - Beispiel-PDF-Vorschau
4. Vollständiger Plan wird gesperrt
5. CTA:
   - „Saisonpass freischalten“
   - „Monatlich starten“

Paywall-Copy:

```md
Dein 3-Pflanzen-Plan ist bereit.

Mit Buddy Care+ bekommst du:
- alle 3 Pflanzen-Slots
- vollständige Wochenpläne
- Tageschecks
- Risiko-Ampeln
- Erinnerungen
- Grow-Tagebuch
- PDF-Export

Saisonpass freischalten – 19,99 €
oder monatlich – 4,99 €
```

---

## 9. Datenmodell

Dieses Modell ist bewusst allgemein gehalten und kann an bestehende Architektur angepasst werden.

### 9.1 TypeScript-Interfaces

```ts
export type PlantType = "auto" | "photoperiod" | "unknown";

export type GrowEnvironment =
  | "indoor"
  | "outdoor"
  | "greenhouse";

export type GrowMedium =
  | "soil"
  | "living_soil"
  | "coco"
  | "hydro"
  | "unknown";

export type ContainerType =
  | "pot"
  | "bed"
  | "dwc"
  | "unknown";

export type CareStatus =
  | "green"
  | "yellow"
  | "red"
  | "gray";

export type GrowPhase =
  | "seedling"
  | "early_veg"
  | "veg"
  | "stretch"
  | "flower"
  | "ripening"
  | "harvest_window"
  | "drying"
  | "completed"
  | "unknown";

export interface CareUserProfile {
  id: string;
  userId: string;
  ageGateAccepted: boolean;
  ageGateAcceptedAt?: string;
  experienceLevel: "beginner" | "some_experience" | "advanced";
  preferredReminderTime?: string;
  notificationsEnabled: boolean;
  subscriptionTier: "free" | "care_plus_monthly" | "care_plus_season" | "admin";
  seasonPassValidUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlantProfile {
  id: string;
  userId: string;
  slotNumber: 1 | 2 | 3;
  name: string;
  strainName?: string;
  plantType: PlantType;
  environment: GrowEnvironment;
  medium: GrowMedium;
  containerType: ContainerType;
  potSizeLiters?: number;
  startDate: string;
  currentPhase: GrowPhase;
  careStatus: CareStatus;
  lastCheckAt?: string;
  lastWateredAt?: string;
  lastPhotoUrl?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCareCheck {
  id: string;
  plantId: string;
  userId: string;
  checkedAt: string;
  mediumMoisture: "dry" | "moist" | "wet" | "unknown";
  leafState: "normal" | "hanging" | "curling" | "spots" | "yellowing" | "unknown";
  growthState: "normal" | "fast" | "slow" | "unknown";
  environmentStress: "normal" | "hot" | "humid" | "cold" | "windy" | "unknown";
  pestsVisible: "no" | "unsure" | "yes";
  heightCm?: number;
  note?: string;
  photoUrls: string[];
  generatedStatus: CareStatus;
  generatedBuddyMessage: string;
  createdAt: string;
}

export interface CareTask {
  id: string;
  plantId: string;
  userId: string;
  title: string;
  description?: string;
  category:
    | "observe"
    | "document"
    | "water_check"
    | "environment"
    | "photo"
    | "weekly_review"
    | "safety"
    | "harvest"
    | "other";
  priority: "low" | "medium" | "high";
  dueDate: string;
  completedAt?: string;
  source: "system" | "buddy" | "manual";
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  plantId: string;
  userId: string;
  entryDate: string;
  title?: string;
  note?: string;
  tags: string[];
  photoUrls: string[];
  heightCm?: number;
  linkedCheckId?: string;
  linkedTaskIds?: string[];
  buddyComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskSignal {
  id: string;
  plantId: string;
  userId: string;
  detectedAt: string;
  riskType:
    | "overwatering"
    | "heat_stress"
    | "humidity_mold"
    | "pest_watch"
    | "under_observed"
    | "general";
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  recommendedActionType: "observe" | "document" | "check" | "review";
  resolvedAt?: string;
  createdAt: string;
}
```

---

## 10. Phasenlogik MVP

### 10.1 Automatische Pflanzen

Vereinfachtes MVP-Modell:

```ts
function getAutoPhase(daySinceStart: number): GrowPhase {
  if (daySinceStart <= 14) return "seedling";
  if (daySinceStart <= 28) return "early_veg";
  if (daySinceStart <= 42) return "veg";
  if (daySinceStart <= 70) return "flower";
  if (daySinceStart <= 84) return "ripening";
  return "harvest_window";
}
```

### 10.2 Photoperiodische Pflanzen

Vereinfachtes MVP-Modell:

```ts
function getPhotoPhase(daySinceStart: number, environment: GrowEnvironment): GrowPhase {
  if (daySinceStart <= 14) return "seedling";
  if (daySinceStart <= 42) return "early_veg";
  if (daySinceStart <= 70) return "veg";

  if (environment === "outdoor" || environment === "greenhouse") {
    // MVP: outdoor photoperiodisch ohne Standort-/Tageslängen-API nur grob schätzen.
    if (daySinceStart <= 95) return "stretch";
    if (daySinceStart <= 140) return "flower";
    if (daySinceStart <= 165) return "ripening";
    return "harvest_window";
  }

  return "veg";
}
```

### 10.3 Hinweis zur Genauigkeit

Phasen sind im MVP bewusst Schätzungen.

UI-Copy:

> „Buddy schätzt die Phase anhand deiner Angaben. Passe sie jederzeit manuell an, wenn deine Pflanze weiter oder langsamer ist.“

---

## 11. Task-Generator MVP

### 11.1 Grundprinzip

Der Task-Generator erzeugt pro Pflanze wenige, sinnvolle Aufgaben.

Nicht täglich 10 Aufgaben erzeugen.

Regel:

- Grün: 1–2 leichte Aufgaben
- Gelb: 2–3 Beobachtungs-/Dokumentationsaufgaben
- Rot: 2–3 Prüfaufgaben + Foto/Notiz
- Grau: Setup vervollständigen / ersten Check machen

### 11.2 Beispiel-Tasks nach Phase

#### Seedling

- Zustand kurz prüfen
- Foto für Verlauf machen
- Medium nicht dauerhaft nass halten
- keine hektischen Maßnahmen

#### Early Veg

- Bodenfeuchte prüfen
- Blattfarbe beobachten
- Höhe 1x pro Woche eintragen
- Foto machen

#### Veg

- Wachstum dokumentieren
- Blattbild beobachten
- Routine stabil halten
- bei Outdoor: Wetterstress beobachten

#### Stretch

- Höhe dokumentieren
- Platzbedarf beobachten
- Fotovergleich durchführen
- Stabilität prüfen

#### Flower

- Luftfeuchte/Umgebung beobachten
- Blütenbereich visuell prüfen
- Fotoverlauf dokumentieren
- keine unnötigen Stressaktionen

#### Ripening

- Reifezeichen beobachten
- Schimmelrisiko im Blick behalten
- Abschlussnotizen vorbereiten
- Erntefenster dokumentieren

---

## 12. Risiko-Engine MVP

### 12.1 Beispiel-Pseudocode

```ts
export function evaluateCareStatus(check: DailyCareCheck, plant: PlantProfile): {
  status: CareStatus;
  signals: Omit<RiskSignal, "id" | "createdAt">[];
  buddyMessage: string;
} {
  const signals = [];

  if (
    check.mediumMoisture === "wet" &&
    check.leafState === "hanging"
  ) {
    signals.push({
      plantId: plant.id,
      userId: plant.userId,
      detectedAt: new Date().toISOString(),
      riskType: "overwatering",
      severity: "medium",
      title: "Mögliches Überwässerungsrisiko",
      message: "Medium nass und hängende Blätter zusammen sind ein Signal zum Beobachten.",
      recommendedActionType: "check"
    });
  }

  if (
    (plant.environment === "outdoor" || plant.environment === "greenhouse") &&
    check.environmentStress === "hot" &&
    check.mediumMoisture === "dry"
  ) {
    signals.push({
      plantId: plant.id,
      userId: plant.userId,
      detectedAt: new Date().toISOString(),
      riskType: "heat_stress",
      severity: "medium",
      title: "Hitze-/Trockenstress beobachten",
      message: "Hitze und trockenes Medium können die Pflanze sichtbar stressen.",
      recommendedActionType: "observe"
    });
  }

  if (
    plant.currentPhase === "flower" &&
    plant.environment === "greenhouse" &&
    check.environmentStress === "humid"
  ) {
    signals.push({
      plantId: plant.id,
      userId: plant.userId,
      detectedAt: new Date().toISOString(),
      riskType: "humidity_mold",
      severity: "medium",
      title: "Feuchte in der Blüte im Blick behalten",
      message: "In der Blütephase ist hohe Feuchte ein Grund für genauere Beobachtung.",
      recommendedActionType: "document"
    });
  }

  if (check.pestsVisible === "yes") {
    signals.push({
      plantId: plant.id,
      userId: plant.userId,
      detectedAt: new Date().toISOString(),
      riskType: "pest_watch",
      severity: "high",
      title: "Schädlinge sichtbar",
      message: "Dokumentiere die Stelle mit einem Foto und beobachte die Veränderung.",
      recommendedActionType: "document"
    });
  }

  const high = signals.some(s => s.severity === "high");
  const mediumCount = signals.filter(s => s.severity === "medium").length;

  const status: CareStatus =
    high ? "red" :
    mediumCount >= 2 ? "red" :
    mediumCount === 1 ? "yellow" :
    "green";

  const buddyMessage =
    status === "green"
      ? "Alles wirkt unauffällig. Heute reicht eine ruhige Kontrolle."
      : status === "yellow"
      ? "Gelb heißt nicht Panik. Beobachte genauer und vergleiche mit deinem letzten Eintrag."
      : "Mehrere Signale fallen auf. Dokumentiere sauber und prüfe die Pflanze genauer.";

  return { status, signals, buddyMessage };
}
```

---

## 13. Technische Architektur

### 13.1 Annahme

Die bestehende App ist eine PWA oder Web-App. Falls der Stack abweicht, soll Codex/Claude die Struktur anpassen.

Empfohlener Stack:

- Frontend: React / Next.js / TypeScript
- State: vorhandener Store oder Zustand
- Backend: Supabase / Postgres / Prisma oder bestehendes Backend
- Auth: vorhandene Lösung
- Storage: Supabase Storage / S3-kompatibel für Fotos
- PDF: serverseitig mit Playwright/Puppeteer oder clientseitig mit pdf-lib
- Notifications: Web Push später; im MVP lokale Reminder oder In-App-Reminder

### 13.2 Feature Flags

```ts
export const FEATURE_BUDDY_CARE_PLUS = true;
export const FEATURE_CARE_AGE_GATE = true;
export const FEATURE_CARE_DASHBOARD = true;
export const FEATURE_CARE_DAILY_CHECK = true;
export const FEATURE_CARE_DIARY = true;
export const FEATURE_CARE_RISK_ENGINE = true;
export const FEATURE_CARE_PDF_EXPORT = true;

// Erst nach Payment-Freigabe aktivieren
export const FEATURE_CARE_PLUS_PAYWALL = false;
export const FEATURE_CARE_PLUS_CHECKOUT = false;
export const FEATURE_CARE_PLUS_SEASON_PASS = false;
```

### 13.3 Empfohlene Ordnerstruktur

```txt
src/
  features/
    buddy-care/
      components/
        AgeGate.tsx
        CareDashboard.tsx
        PlantCard.tsx
        PlantSetupWizard.tsx
        TodayView.tsx
        DailyCheckForm.tsx
        WeeklyPlan.tsx
        DiaryTimeline.tsx
        RiskBadge.tsx
        CarePaywall.tsx
      lib/
        phaseEngine.ts
        taskGenerator.ts
        riskEngine.ts
        buddyCareCopy.ts
        carePermissions.ts
        pdfExport.ts
      hooks/
        useCarePlants.ts
        useDailyChecks.ts
        useCareTasks.ts
      types/
        buddyCareTypes.ts
      pages-or-routes/
        care.tsx
        care-plant-detail.tsx
      tests/
        phaseEngine.test.ts
        taskGenerator.test.ts
        riskEngine.test.ts
```

---

## 14. API / Backend-Konzept

Falls API-Routes genutzt werden:

```txt
GET    /api/care/profile
POST   /api/care/profile
GET    /api/care/plants
POST   /api/care/plants
PATCH  /api/care/plants/:plantId
DELETE /api/care/plants/:plantId

POST   /api/care/checks
GET    /api/care/checks?plantId=:plantId

GET    /api/care/tasks/today
POST   /api/care/tasks/:taskId/complete

GET    /api/care/diary?plantId=:plantId
POST   /api/care/diary

POST   /api/care/export/pdf

GET    /api/care/subscription
POST   /api/care/checkout
```

MVP ohne Backend möglich:

- lokal speichern
- später Sync
- Paywall nur vorbereitet

Aber für echtes Premium wird Account + Backend empfohlen.

---

## 15. UI-Screens

### 15.1 Landing / Entry

Headline:

> **Buddy Care+**

Subheadline:

> Dein digitaler 3-Pflanzen-Coach mit Tagesaufgaben, Wochenplan und Tagebuch.

CTA:

> **3-Pflanzen-Plan erstellen**

Secondary:

> Erst kostenlos testen

---

### 15.2 Age Gate

Text:

```md
Buddy Care+ ist nur für Erwachsene bestimmt.

Bitte bestätige, dass du mindestens 18 Jahre alt bist und die geltenden Regeln an deinem Wohnort beachtest.
```

Buttons:

- Ich bin mindestens 18
- Zurück

---

### 15.3 Setup: Anzahl Pflanzen

Headline:

> **Wie viele Pflanzen möchtest du begleiten?**

Optionen:

- 1 Pflanze
- 2 Pflanzen
- 3 Pflanzen

Hinweis:

> Buddy Care+ ist bewusst auf maximal 3 Pflanzen ausgelegt.

---

### 15.4 Setup: Pflanzenprofil

Felder:

- Name
- Auto / Photoperiodisch / Weiß ich nicht
- Indoor / Outdoor / Gewächshaus
- Startdatum
- Medium
- Topf/Beet
- Erfahrung
- Foto optional

CTA:

> Pflanze speichern

---

### 15.5 Planvorschau

Headline:

> **Buddy hat deinen Plan erstellt**

Cards:

- Woche 1–2: Anwachsen
- Woche 3–6: Wachstum
- Woche 7–9: Übergang / Stretch
- Woche 10+: Blüte / Reife, abhängig vom Typ

CTA:

> Vollständigen Plan öffnen

Paywall bei Premium-Funktion.

---

### 15.6 Care Dashboard

Headline:

> **Meine Pflanzen**

Pro Card:

```md
Pflanze 1
Phase: Vegi
Status: Grün
Heute: Bodenfeuchte prüfen
Letzter Check: gestern
```

CTA:

- Heute checken
- Tagebuch
- Details

---

### 15.7 Heute

Headline:

> **Heute wichtig**

Bereiche:

- Offene Aufgaben
- Buddy-Hinweis
- Pflanzen mit Gelb/Rot zuerst
- Wochenfortschritt

---

### 15.8 Tagebuch

Timeline:

- Foto
- Datum
- Status
- Tags
- Notiz
- Buddy-Kommentar

CTA:

- Eintrag hinzufügen
- PDF exportieren

---

## 16. Buddy-Copy

### 16.1 Grundton

Buddy ist:

- ruhig
- praktisch
- freundlich
- nicht alarmistisch
- nicht übertrieben locker
- nicht belehrend

### 16.2 Beispieltexte

Grün:

> „Alles wirkt unauffällig. Heute reicht eine ruhige Kontrolle.“

Gelb:

> „Gelb heißt nicht Panik. Schau genauer hin und vergleiche mit deinem letzten Foto.“

Rot:

> „Mehrere Signale fallen auf. Dokumentiere sauber und prüfe die Pflanze genauer.“

Bei fehlenden Daten:

> „Ich brauche noch ein paar Einträge, bevor ich Muster erkennen kann.“

Bei Anfängerfehlern:

> „Nicht jede Veränderung braucht sofort eine Aktion. Erst beobachten, dann entscheiden.“

Bei Tagebuch:

> „Ein Foto heute kann dir später viel erklären.“

Bei Wochenreview:

> „Diese Woche geht es um Routine. Wenige gute Checks sind besser als hektische Änderungen.“

---

## 17. Monetarisierungslogik

### 17.1 Erste Einnahmehypothese

Nutzer zahlen eher für:

- konkrete 3-Pflanzen-Struktur
- Saisonplan
- Erinnerungen
- Tagebuch
- PDF-Export
- Fehlervermeidung

Nutzer zahlen weniger wahrscheinlich für:

- reines Spiel
- generische Tipps
- Ads entfernen
- abstraktes Premium

### 17.2 Empfohlene erste Verkaufsform

**Saisonpass statt Abo zuerst testen.**

Warum:

- einmaliger Kauf ist niedrigere Hürde
- passt zur Grow-Saison
- klarer Nutzenzeitraum
- leichter über Social Media zu erklären

### 17.3 Paywall-Trigger

Gute Trigger:

- zweite oder dritte Pflanze anlegen
- vollständigen Wochenplan öffnen
- PDF exportieren
- Erinnerungen aktivieren
- mehr als 7 Tage Tagebuchverlauf anzeigen

Nicht direkt blocken:

- ersten Setup-Prozess
- erste Planvorschau
- ersten Tagescheck
- erstes Erfolgserlebnis

---

## 18. MVP-Scope

### 18.1 MVP 0.1 – Validierung ohne Payment

Ziel: Prüfen, ob Nutzer das Produkt verstehen und benutzen.

Bauen:

- Age Gate
- 1–3 Pflanzen Setup
- Dashboard
- Phasenberechnung
- Heute-Ansicht
- Tagescheck
- Tagebuch
- einfache Risiko-Ampel
- Planvorschau
- Paywall-Mock ohne echtes Payment

Nicht bauen:

- Checkout
- echte Subscription
- Wetter-API
- KI-Bilderkennung
- Community
- Sensoren
- App Store

### 18.2 MVP 0.2 – Verkaufstest

Voraussetzung:

- Payment-Provider geprüft
- rechtliche Texte geprüft
- Terms/Disclaimer vorhanden

Bauen:

- Saisonpass Checkout
- Care+ Status
- PDF-Export
- Erinnerungen
- Upgrade-Seite

### 18.3 MVP 1.0 – Release

Bauen:

- stabile User Accounts
- Bildspeicher
- PDF-Export
- Reminder
- Care+ Freischaltung
- Basic Analytics
- Fehlerlogging
- Support-Link
- Datenschutz/Impressum/AGB geprüft

---

## 19. Roadmap

### Phase 1: Produktkern

- 3 Pflanzen-Slots
- Setup
- Dashboard
- Tagescheck
- Tagebuch
- Risiko-Ampel

### Phase 2: Premium-Wert

- Wochenplan
- PDF-Export
- Erinnerungen
- Saisonpass

### Phase 3: Viralität

- schöne Share-Cards
- Vorher/Nachher Timeline
- Buddy Wochenbericht
- „Meine 3 Pflanzen“-Share-Grafik

### Phase 4: Physisches Bundle

- QR-Pflanzenstecker
- Buddy Starter Pack
- QR-Link direkt zur Pflanze
- Shop-Anbindung separat prüfen

### Phase 5: Fortgeschrittene Funktionen

- Wetter-Integration
- Sensoren / Home Assistant optional
- Fotovergleich
- KI-gestützte Notiz-Zusammenfassung
- Saisonvergleich
- Community nur sehr vorsichtig und moderiert

---

## 20. Analytics

### 20.1 Wichtige Events

```txt
care_age_gate_accepted
care_setup_started
care_plant_created
care_three_plants_created
care_plan_preview_viewed
care_daily_check_started
care_daily_check_completed
care_diary_entry_created
care_risk_yellow_shown
care_risk_red_shown
care_paywall_viewed
care_checkout_started
care_purchase_completed
care_pdf_export_clicked
care_pdf_export_completed
```

### 20.2 Kernmetriken

- Setup Completion Rate
- Pflanzen pro Nutzer
- Tagescheck Completion
- Day-1 Retention
- Day-7 Retention
- Paywall View → Purchase
- PDF Export Rate
- Anteil Nutzer mit 3 Pflanzen
- Anteil Nutzer mit mindestens 3 Tagebucheinträgen

### 20.3 Validierungsziele

Vor Checkout:

- mindestens 30 % Setup Completion
- mindestens 20 % Nutzer starten Tagescheck
- mindestens 10 % kehren innerhalb 7 Tagen zurück
- mindestens 5 % klicken Paywall-Mock

Nach Checkout:

- 2–5 % Conversion von Paywall zu Kauf wäre erstes positives Signal
- erste 10 zahlende Nutzer wichtiger als perfekte App

---

## 21. Datenschutz

### 21.1 Sensible Daten vermeiden

MVP soll keine unnötigen persönlichen Daten erfassen.

Vermeiden:

- exakte Adresse
- GPS-Standort
- Klarnamenpflicht
- unnötige Gesundheits-/Konsumdaten
- Social Graph

### 21.2 Fotos

Fotos können Rückschlüsse auf Nutzerumgebung zulassen.

Empfohlen:

- Hinweis vor Upload
- lokale Speicherung optional
- Upload nur mit Account
- Fotos löschen können
- keine öffentliche Galerie im MVP

### 21.3 Export und Löschung

Nutzer muss können:

- Pflanzen archivieren
- Tagebucheinträge löschen
- Fotos löschen
- Accountdaten exportieren/löschen

---

## 22. Content- und Safety-Regeln für Buddy

### 22.1 Erlaubte Buddy-Themen

- Beobachtung
- Dokumentation
- Routine
- Warnsignale
- allgemeine Pflanzenpflege
- Sicherheit
- gesetzlicher Rahmen allgemein
- Vermeidung von Anfängerchaos

### 22.2 Nicht erlaubte Buddy-Themen

- Beschaffung
- Verkauf
- Weitergabe
- Umgehung gesetzlicher Limits
- Anbau in illegalem Umfang
- Konsumförderung
- Minderjährige
- konkrete rechtliche Beratung
- aggressive Ertrags-/Potenzoptimierung

### 22.3 Disclaimer-Text

```md
Buddy Care+ ersetzt keine rechtliche, medizinische oder professionelle Beratung. Die Hinweise dienen der Strukturierung, Dokumentation und allgemeinen Pflanzenbeobachtung. Beachte immer die Gesetze an deinem Wohnort und nutze Buddy Care+ nur als erwachsene Person.
```

---

## 23. Akzeptanzkriterien Gesamtprodukt

Buddy Care+ MVP gilt als fertig, wenn:

- Nutzer kann Age-Gate bestätigen
- Nutzer kann 1 Pflanze kostenlos anlegen
- Nutzer kann als Care+ bis zu 3 Pflanzen anlegen
- Nutzer kann Tagescheck durchführen
- Tagescheck erzeugt Tagebucheintrag
- Risiko-Ampel reagiert auf Checkdaten
- Heute-Ansicht zeigt sinnvolle Aufgaben
- Wochenplan wird pro Pflanze generiert
- PDF-Export kann einen Bericht erzeugen
- Paywall ist als Feature vorbereitet
- Checkout ist per Feature Flag deaktivierbar
- keine Commerce-Funktion für Cannabis/Seeds/THC existiert
- keine App-Store-spezifische Abhängigkeit besteht
- Datenschutztexte und Löschfunktionen sind vorgesehen

---

## 24. Konkrete Aufgaben für Codex / Claude Code

### Aufgabe 1: Buddy Care+ Domain anlegen

```md
Implementiere das Feature-Modul `buddy-care` mit TypeScript-Typen, Feature Flags und Grundstruktur.

Nutze die im Konzept definierten Interfaces:
- CareUserProfile
- PlantProfile
- DailyCareCheck
- CareTask
- DiaryEntry
- RiskSignal

Erstelle zusätzlich Unit Tests für reine Logikfunktionen.
```

### Aufgabe 2: Phase Engine

```md
Implementiere `phaseEngine.ts`.

Funktionen:
- getDaySinceStart(startDate: string): number
- getAutoPhase(daySinceStart: number): GrowPhase
- getPhotoPhase(daySinceStart: number, environment: GrowEnvironment): GrowPhase
- getPlantPhase(plant: PlantProfile): GrowPhase

Akzeptanz:
- korrekt für Auto
- korrekt für Photo grob geschätzt
- unbekannte Werte geben "unknown" zurück
- Tests für Grenztage
```

### Aufgabe 3: Task Generator

```md
Implementiere `taskGenerator.ts`.

Input:
- PlantProfile
- aktueller CareStatus
- GrowPhase
- letzter Check optional

Output:
- 1–5 CareTasks für Heute und Diese Woche

Regeln:
- Grün: wenige Routine-Aufgaben
- Gelb: Beobachtung und Dokumentation
- Rot: genauere Prüfung und Foto/Notiz
- Grau: ersten Check oder Setup vervollständigen
```

### Aufgabe 4: Risk Engine

```md
Implementiere `riskEngine.ts`.

Input:
- DailyCareCheck
- PlantProfile

Output:
- CareStatus
- RiskSignals
- BuddyMessage

Regeln:
- keine harten Diagnosen
- Beobachtung und Dokumentation betonen
- mehrere mittlere Signale können Rot ergeben
- einzelnes mittleres Signal wird Gelb
```

### Aufgabe 5: UI Dashboard

```md
Baue `CareDashboard.tsx`.

Anforderungen:
- zeigt 1–3 Pflanzenkarten
- zeigt Phase, Status, nächste Aufgabe, letzten Check
- Free-Nutzer sieht Slot 2 und 3 gesperrt
- CTA "Heute checken"
- CTA "Tagebuch"
```

### Aufgabe 6: Plant Setup Wizard

```md
Baue `PlantSetupWizard.tsx`.

Schritte:
1. Anzahl Pflanzen
2. Daten pro Pflanze
3. Planvorschau
4. Dashboard öffnen

Validierung:
- maximal 3 Pflanzen
- Free maximal 1 aktive Pflanze
- Startdatum Pflicht
- Name Pflicht
- Auto/Photo/Unbekannt Pflicht
- Umgebung Pflicht
```

### Aufgabe 7: Daily Check

```md
Baue `DailyCheckForm.tsx`.

Felder:
- mediumMoisture
- leafState
- growthState
- environmentStress
- pestsVisible
- heightCm optional
- note optional
- photo optional

Nach Absenden:
- Risk Engine aufrufen
- DailyCareCheck speichern
- DiaryEntry erzeugen
- Plant CareStatus aktualisieren
- BuddyMessage anzeigen
```

### Aufgabe 8: Diary Timeline

```md
Baue `DiaryTimeline.tsx`.

Anforderungen:
- chronologische Einträge
- Foto anzeigen
- Tags anzeigen
- Status anzeigen
- Notiz anzeigen
- Löschen/Bearbeiten vorbereiten
```

### Aufgabe 9: PDF Export

```md
Implementiere `pdfExport.ts`.

MVP:
- HTML-Template erzeugen
- Pflanzenübersicht
- Timeline
- Fotos optional
- Buddy-Kommentare
- Disclaimer

Export als PDF:
- serverseitig bevorzugt
- Dateiname: buddy-care-plus-grow-report-YYYY-MM-DD.pdf
```

### Aufgabe 10: Paywall-Mock

```md
Baue `CarePaywall.tsx`.

Noch kein echtes Payment im MVP 0.1.

Anzeigen bei:
- zweiter/dritter Pflanze in Free
- PDF Export
- vollständigem Wochenplan
- Erinnerungen

CTA:
- Saisonpass 19,99 €
- Monatlich 4,99 €

Checkout Buttons nur aktivieren, wenn FEATURE_CARE_PLUS_CHECKOUT=true.
```

---

## 25. Landingpage-Copy

### 25.1 Hero

```md
# Dein digitaler Buddy für deine 3 Pflanzen

Buddy Care+ begleitet deine Pflanzen mit Tagesaufgaben, Wochenplan, Pflege-Checks, Erinnerungen und Tagebuch.

[3-Pflanzen-Plan erstellen]
```

### 25.2 Nutzenblöcke

```md
## Kein Forum-Chaos mehr
Buddy zeigt dir, was heute wirklich wichtig ist.

## 3 Pflanzen sauber im Blick
Jede Pflanze bekommt eigenes Profil, Status, Aufgaben und Tagebuch.

## Erst beobachten, dann handeln
Buddy hilft dir, Veränderungen einzuordnen, ohne unnötige Panik.

## Dein Grow als PDF
Fotos, Notizen und Verlauf am Ende sauber exportieren.
```

### 25.3 Paywall-Copy

```md
# Dein vollständiger 3-Pflanzen-Plan ist bereit

Mit Buddy Care+ bekommst du:
- alle 3 Pflanzen-Slots
- vollständige Wochenpläne
- Tageschecks
- Risiko-Ampeln
- Erinnerungen
- Tagebuch
- PDF-Export

Saisonpass freischalten – 19,99 €
Monatlich starten – 4,99 €
```

---

## 26. Social-Media-Hooks

```md
Du hast 3 Pflanzen, aber keinen Plan? Buddy baut dir deinen Wochenplan.

Der größte Anfängerfehler: Jeden Tag irgendwas ändern.

3 Pflanzen. 3 Profile. Ein Buddy.

Aus Zettelwirtschaft wird ein sauberer Grow-Kalender.

Buddy sagt dir nicht, dass du mehr machen sollst. Buddy sagt dir, wann Ruhe besser ist.

Ich baue einen digitalen 3-Pflanzen-Coach für legale Homegrower.

Heute wichtig: nicht raten, dokumentieren.

So könnte ein Grow-Tagebuch aussehen, das man wirklich benutzt.
```

---

## 27. Risiken

### 27.1 Produkt-Risiken

| Risiko | Bewertung | Gegenmaßnahme |
|---|---:|---|
| Nutzer verstehen den Kaufgrund nicht | Hoch | Landingpage stark auf 3-Pflanzen-Plan fokussieren |
| Nutzer wollen kein Abo | Hoch | Saisonpass zuerst anbieten |
| App wird zu kompliziert | Mittel | MVP strikt begrenzen |
| Buddy wirkt unseriös | Mittel | ruhiger Coach-Ton |
| Nutzer erwarten KI-Diagnose | Mittel | klar sagen: Beobachtung und Risiko-Ampel, keine Diagnose |
| Payment-Anbieter lehnt ab | Hoch | Payment-Gate vor Launch |
| App Store lehnt ab | Mittel | PWA-first |
| Werbung funktioniert nicht | Hoch | nicht auf Ads bauen |

### 27.2 Rechtliche / Plattform-Risiken

| Risiko | Bewertung | Gegenmaßnahme |
|---|---:|---|
| Cannabis-Nähe erschwert Payment | Hoch | Payment-Provider prüfen |
| App Store Cannabis-Policy | Mittel | PWA zuerst |
| Werbenetzwerk eingeschränkt | Hoch | Abo/Saisonpass statt Ads |
| Minderjährige Nutzer | Hoch | Age Gate und Kommunikation |
| Nutzer nutzt mehr als 3 Pflanzen | Mittel | technisch auf 3 begrenzen |
| Inhalte wirken wie Konsumförderung | Mittel | Copy auf Struktur/Dokumentation ausrichten |

---

## 28. Offene Entscheidungen

Vor Umsetzung klären:

1. Bestehender Tech Stack?
2. Gibt es bereits User Accounts?
3. Gibt es bereits Zahlungsintegration?
4. Wo werden Bilder gespeichert?
5. Soll MVP lokal oder serverbasiert speichern?
6. Soll PDF-Export sofort eingebaut werden?
7. Welcher Zahlungsanbieter ist realistisch?
8. Soll Buddy Care+ erstmal nur als Mock getestet werden?
9. Welche Sprache zuerst: Deutsch-only oder DE/EN?
10. Soll der Saisonpass 19,99 € oder 14,99 € kosten?

Empfehlung:

- Deutsch zuerst
- PWA zuerst
- Saisonpass zuerst
- Payment später nach Policy-Prüfung
- MVP 0.1 erst mit Paywall-Mock

---

## 29. Umsetzungsempfehlung

Direkter nächster Schritt:

> **MVP 0.1 als internes/öffentliches Preview bauen, noch ohne echte Zahlung.**

Priorität:

1. Age Gate
2. 3-Pflanzen-Setup
3. Dashboard
4. Tagescheck
5. Risiko-Ampel
6. Tagebuch
7. Wochenplan
8. Paywall-Mock
9. PDF-Export
10. Payment-Gate prüfen

Nicht mit Payment starten, bevor Plattform-/Payment-Risiko sauber geklärt ist.

---

## 30. Quellen und Policy-Hinweise

Diese Quellen wurden zur Einordnung des rechtlichen und plattformbezogenen Rahmens genutzt:

- Bundesministerium für Gesundheit – Fragen und Antworten zum Cannabisgesetz  
  https://www.bundesgesundheitsministerium.de/themen/cannabis/faq-cannabisgesetz

- Google Publisher Restrictions – Recreational drugs  
  https://support.google.com/adsense/answer/10437795?hl=en

- Google Play Developer Policy – Marijuana  
  https://support.google.com/googleplay/android-developer/answer/9878810?hl=en

- Google Play Developer Program Policy – Marijuana  
  https://support.google.com/googleplay/android-developer/answer/17105854?hl=en

- Apple App Store Review Guidelines  
  https://developer.apple.com/app-store/review/guidelines/

- Stripe Restricted Businesses / Marijuana  
  https://stripe.com/legal/restricted-businesses

- Stripe Prohibited and Restricted Businesses FAQ  
  https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs

---

## 31. Finaler Produktkern

Wenn nur ein Satz übrig bleibt:

> **Buddy Care+ ist kein Grow-Spiel-Premium, sondern ein digitaler 3-Pflanzen-Begleiter, der legalen Homegrowern Struktur, Routine, Fehlerfrüherkennung und ein sauberes Tagebuch gibt.**

Erstes verkaufbares Feature:

> **3-Pflanzen-Plan + Tagescheck + Tagebuch + PDF-Export**

Erstes Monetarisierungsmodell:

> **Saisonpass 19,99 € statt Abo zuerst**

Erster Entwicklungsmodus:

> **PWA-MVP mit Paywall-Mock, Payment erst nach Provider-Prüfung aktivieren.**
