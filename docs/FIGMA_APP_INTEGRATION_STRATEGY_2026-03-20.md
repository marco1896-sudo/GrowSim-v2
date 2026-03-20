# Grow Simulator – App ↔ Figma Integrationsstrategie (2026-03-20)

## 1) Skill-Analyse

### Verfügbare, relevante Skills geprüft
- `web-testing` (Playwright/Tests, eher für E2E als Figma-Systemanalyse)
- `playwright-best-practices` (Test-Patterns, nicht primär für Architektur-Mapping)
- `find-skills` (Skill-Suche/Discovery)

### Genutzte Skills/Tools
- **Kein zusätzlicher Skill zwingend erforderlich** für diese Aufgabe.
- Genutzt wurden stattdessen bestehende Tools:
  - Codebase-Read/Exec (Analyse)
  - Browser (Figma-URL via MCP)

### Installierte/entfernte Skills
- **Keine** neuen Skills installiert.
- Grund: Kein klarer Mehrwert gegenüber vorhandenen Analyse-Tools, unnötigen Overhead vermieden.

---

## 2) App-Analyse (Ist-Stand)

### Technischer Kern
- Monolithischer Frontend-Kern in `app.js` mit zentralem `state`.
- Persistenz aktuell lokal (`localStorage` Key: `grow-sim-state-v2`) über `storage.js`-API.
- Event-System stark ausgebaut (Resolver, Cooldowns, Trigger, Foundation Memory).
- Simulationskern vorhanden inkl. Statusdrift und Lifecycle.

### Bereits vorhandene Simulationsbereiche
- Kernwerte: Wasser, Nährstoffe, Wachstum, Risiko, Stress, Health.
- Environment/Root-Zone bereits dokumentiert/implementiert:
  - Temperatur, Luftfeuchte, Airflow, VPD
  - pH, EC, O2 Root Zone, Root Health
  - stagebasierte Zielbereiche und abgeleitete Stressfaktoren
- Aktionen/Katalog vorhanden (`data/actions.json`, Action-Cooldowns, Effects)
- Eventlog/History vorhanden

### Save-System
- Lokal robust (inkl. Migration Legacy → Canonical).
- Neues Backend (`/backend`) unterstützt nun Auth + Cloud Save/Load (JWT + JSON State).

---

## 3) Figma-Analyse (Systemsicht)

Analysierte Screens (`figma_screens/*.html` + MCP-Zugriff auf Figma-Link):
- `app_start_onboarding`
- `app_analysis_stats`
- `app_care_actions`
- `app_event_popup`
- `app_menu`
- `app_settings`
- `app_components`

### Implizite Systeme in den Screens
1. **Analyse/Stats-System**
   - Wasser, Nährstoffe, Wachstum, Risiko, Stress
   - Root-Zone Panel: pH, EC, Wurzelgesundheit, Sauerstoff
   - Trend/Report/Filter/Export

2. **Care/Actions-System**
   - Pflegeaktionen (Gießen, Düngen, pH-Korrektur, Airflow, Umtopfen)
   - Zeitaktionen (-30m Eventzeit, Nacht überspringen, Pause)

3. **Event-Response-System**
   - Positive/Negative Eventkarten
   - Handlungsauswahl mit unterschiedlichen Auswirkungen

4. **Onboarding/Setup-System**
   - Topfgröße, Pflanzentyp, Setup-Modus

5. **Meta/Progression-Layer**
   - Player Card (Name/Rolle/XP Slot)
   - Menüeinträge (Profil, Inventar, Missionen)

6. **Settings/Operations-Layer**
   - Simtempo, Eventrate, Tutorial-Hinweise, Autosave
   - Audio/Grafik
   - Cloud Sync Status

---

## 4) Mapping (Figma → App)

| Element | Bedeutung | App-Status | Kategorie | Notiz |
|---|---|---|---|---|
| Wasser/Nährstoffe/Wachstum/Risiko/Stress | Core Plant Status | vorhanden | fertig | Bereits im State + UI-Renderpfade |
| pH/EC/O2/Wurzelgesundheit | Root-Zone-Livewerte | vorhanden (Core), UI teils | teilweise | Core existiert, konsistentes Panel-Mapping finalisieren |
| Temperatur/Luftfeuchte/Airflow/VPD | Umweltmodell | vorhanden | teilweise | Sim-seitig da, Figma-Metrikdarstellung gezielt anbinden |
| Trend 48h | Zeitverlauf/Analytics | begrenzt | teilweise | History existiert; Aggregation + Charting fehlen |
| Report/Filter/Export | Analyse-Operations | kaum | UI-only | API/Exportformat + Filterlogik nötig |
| Pflegeaktionen (Gießen/Düngen) | Direkte Eingriffe | vorhanden | fertig/teilweise | Kernaktionen da, UX-Mapping vereinheitlichen |
| pH korrigieren | Root-Zone-Korrektur | teilweise | teilweise | Aktion/Delta sauber stageabhängig modellieren |
| Luftstrom erhöhen | Klimaeingriff | teilweise | teilweise | Airflow-Effekt auf envStress/rootStress explizit |
| Umtopfen | Struktur-/Root-Reset | teilweise | teilweise | Abhängigkeit zu Topfgröße/Root pressure schärfen |
| Zeitaktionen (-30m, Nacht skip) | Time Control | teilweise | teilweise | Guardrails (nur nachts etc.) konsequent |
| Event Popup Optionen | Event choice consequences | vorhanden | teilweise | Outcome-Feedback + Lernhinweis im UI finalisieren |
| Topfgröße Onboarding | Startparameter | rudimentär | teilweise | Persistenter Setup-Impact auf Simulation vertiefen |
| Pflanzentyp (Hybrid/Indica/Sativa) | Strain profile | kaum | fehlt | echte Parameterprofile fehlen |
| Setup-Modus (Auto/Foto) | Initialisierungsfluss | rudimentär | teilweise | Foto-Mode aktuell primär UI |
| Player Card (Name/Rolle/XP) | Meta-Progression | gering | fehlt | XP/Level/Profile fehlen als echtes System |
| Menü: Inventar/Missionen | Meta-Features | nicht vorhanden | UI-only | als kommende Module planen |
| Einstellungen: Simtempo/Eventrate | Runtime-Tuning | teils vorhanden | teilweise | Parameter im State bereits teils da |
| Auto Save | Persistenzintervall | vorhanden lokal | teilweise | Cloud-Autosave-Rhythmus ergänzen |
| Cloud Sync verbunden | Backend-Persistenzstatus | backend vorhanden | teilweise | Frontend-Auth + Sync-Statusanzeige anbinden |

---

## 5) Fehlende Systeme (priorisiert)

1. **Progression System**
- XP, Level, Profilwerte, einfache Rewards.

2. **Strain-/Genetik-Profile**
- Hybrid/Indica/Sativa als echte Modifikatoren (Wachstum, Stress, Klima-Toleranz).

3. **Onboarding → Sim Parameter Pipeline**
- Topfgröße/Pflanzentyp/Setup als harte Startparameter in `state.setup` + Ableitungen.

4. **Analytics Layer (leichtgewichtig)**
- 24h/48h Trendaggregation aus History (kein schweres BI-System).

5. **Cloud Sync Frontend Integration**
- Auth + Save/Load + Sync-Status in Settings.

---

## 6) Architektur-Vorschlag

### A) Domänen sauber trennen
- `simulation.core` (bestehend)
- `environment.rootzone` (bestehend, weiter konsolidieren)
- `actions` (bestehend)
- `events` (bestehend)
- **neu:** `progression`
- **neu:** `setupProfiles`
- **neu:** `analytics`
- `persistence.local + persistence.cloud`

### B) State-Vertrag
- Canonical State beibehalten.
- Ergänzen um:
  - `profile: { xp, level, title }`
  - `setup: { potSize, strainType, mode }` (teils vorhanden, finalisieren)
  - `analytics: { windows, cachedSummaries }`

### C) UI-Bindung
- Jede Figma-Kachel bekommt Mapping-Funktion gegen Canonical State.
- Keine UI-only Werte ohne Datenquelle.

---

## 7) Bau-Reihenfolge

1. **Cloud Sync Frontend-Anbindung** (niedriges Risiko, hoher Nutzen)
2. Onboarding-Parameter verbindlich in Sim übernehmen
3. Root/Env Metrik-Panel vollständig anbinden
4. Analytics-Trends (48h)
5. Progression (XP/Level)
6. Strain-Profile
7. Menü-Module (Inventar/Missionen) als spätere Erweiterung

---

## 8) Sofort mögliche Verbindungen

1. `Settings > Cloud Sync` an echtes Backend koppeln (Token + Status)
2. `Analysis/Stats` direkt an bestehende state/env/root-Werte hängen
3. `Care Actions` mit bestehendem Action-System (inkl. cooldown feedback) verbinden
4. Event Popup bereits vorhandenes Event-System visuell sauber mappen

---

## 9) Nächster Schritt (GENAU EIN Block)

**Block: Frontend Cloud-Sync Basisintegration**

Umfang (klein, risikoarm):
- `apiClient` + Auth Token Storage
- `load cloud save on boot` (optional mit Fallback local)
- `save to cloud` Trigger in bestehendem Persist-Flow (throttled)
- Settings-Indicator: `Cloud Sync: verbunden/getrennt`

Warum dieser Block zuerst:
- Direkt nutzbarer Mehrwert
- Verändert Kernsimulation nicht
- Bereitet alle weiteren Systeme auf saubere Persistenz vor
