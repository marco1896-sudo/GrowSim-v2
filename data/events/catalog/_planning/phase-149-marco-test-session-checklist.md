# Phase 149 - Marco Test Session Checklist

## 1. Vorbereitung
1. Lokale App starten.
2. Dev/Test-Guard aktivieren: `gs_event_v2_dev_preview=unlock`.
3. Settings/Diagnosis-Sheet öffnen.
4. `Event V2 Dev Preview` Entry suchen.

## 2. Sichtprüfung
1. Entry sichtbar?
2. Labels sichtbar: Dev Preview / Candidate Only / No Write / No Gameplay Activation?
3. Candidate Feed öffnet?
4. 3 Fixtures sichtbar?
5. 15 Cards sichtbar?
6. Bilder laden ohne Fehler?
7. Mobile Layout (360/390/430/768) sauber?

## 3. Inhaltliche Prüfung
1. Fixture `fixture_indoor_veg_vpd_mismatch`:
2. Ist `indoor_vpd_mismatch_veg` im Top-5-Cluster?
3. Wirkt `indoor_dry_rootball` auf Rang 1 plausibel oder störend?
4. Fixture `fixture_outdoor_heat_dry_wind`: ist `outdoor_heatwave_dry_wind` hoch gerankt/sichtbar?
5. Fixture `fixture_stable_healthy_baseline`: wirkt der Feed nicht über-alarmistisch?

## 4. Safety-Prüfung
1. Keine Resolve/Apply/Reward/Trigger-Buttons vorhanden?
2. Keine echten Events ausgelöst?
3. Keine Coins/XP/Rewards?
4. Keine Notifications?
5. Keine Missionsänderungen?
6. Kein Save-/Storage-Schreiben erkennbar?

## 5. Bewertung
1. Ist der Entry für den Alltagstest nützlich?
2. Wirkt das Feature app-nah und verständlich?
3. Welche Karten/Labels brauchen späteren Polish?
4. Empfehlung für Phase 150: Runtime Shadow Dev/Test Toggle (No Write) bestätigen?
