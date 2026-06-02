'use strict';

(function initEventV2UiLabData(globalScope) {
  const scenarios = [
    {
      id: 'indoor_overwatering_early',
      setup: 'indoor',
      category: 'water',
      stage: 'S2-S6',
      severity: 'warning',
      image: 'assets/events/event-overwatering.png',
      title: 'Fruehes Ueberwaessern',
      symptom: 'Blaetter haengen trotz nasser Erde. Die Pflanze wirkt durstig, aber die Wurzelzone ist eher ueberlastet.',
      coach: {
        summary: 'Jetzt nicht nachgiessen. Erst Sauerstoff in der Wurzelzone zurueckbringen und dann den Verlauf ruhig lesen.',
        why: 'Ueberwaesserung ist oft ein Luftproblem im Substrat, kein Wassermangel. Wenn die Zone zu lange nass bleibt, sinkt die Aufnahme trotz voller Erde.',
        actions: ['Giessen 24h pausieren.', 'Luftbewegung leicht erhoehen.']
      },
      decisions: [
        { id: 'pause_watering_24h', label: 'Giessen 24h pausieren', detail: 'Entlastet die Wurzeln und stabilisiert die Zone.', quality: 'recommended' },
        { id: 'improve_airflow_canopy', label: 'Luftstrom leicht erhoehen', detail: 'Hilft beim gleichmaessigen Abtrocknen.', quality: 'situational' },
        { id: 'water_again_immediately', label: 'Sofort erneut giessen', detail: 'Erhoeht das Risiko fuer Wurzelstress.', quality: 'risky' }
      ],
      learningCard: {
        title: 'Giessen richtig lesen',
        subtitle: 'Signal vor Reflex',
        bullets: ['Topfgewicht vor Aktion pruefen.', 'Nass + haengend ist oft Ueberwaesserung.', 'Kleine Korrekturen schlagen Hektik.']
      },
      aftermath: 'Mit Pause und ruhiger Korrektur sinkt der Stress meist schnell und der Grow bleibt planbar.'
    },
    {
      id: 'indoor_dry_rootball',
      setup: 'indoor',
      category: 'water',
      stage: 'S2-S7',
      severity: 'warning',
      image: 'assets/events/dry_pocket.png',
      title: 'Trockener Rootball',
      symptom: 'Die Oberflaeche wirkt trocken, die Pflanze verliert Spannung. Wasser verteilt sich gerade ungleichmaessig.',
      coach: {
        summary: 'Langsam rehydrieren statt fluten. Das Ziel ist ein wieder gleichmaessig aufnahmefaehiger Wurzelballen.',
        why: 'Wenn der Kern austrocknet, laeuft Wasser oft nur seitlich weg. In zwei ruhigen Schritten bekommt der Ballen wieder Kontakt und Stabilitaet.',
        actions: ['In zwei kleinen Schritten giessen.', 'Vor der naechsten Gabe Gewicht pruefen.']
      },
      decisions: [
        { id: 'slow_rehydrate_split', label: 'Langsam rehydrieren', detail: 'Baut Feuchte kontrolliert wieder auf.', quality: 'recommended' },
        { id: 'check_pot_weight_then_wait', label: 'Gewicht pruefen und warten', detail: 'Sichert den Rhythmus ohne Ueberreaktion.', quality: 'situational' },
        { id: 'flood_pot_fast', label: 'Topf schnell fluten', detail: 'Kann Kanalbildung und Stress verstaerken.', quality: 'risky' }
      ],
      learningCard: {
        title: 'Wurzelzone lesen',
        subtitle: 'Langsam ist oft schneller',
        bullets: ['Trockenkerne brauchen gestufte Rehydrierung.', 'Gewicht hilft beim Timing.', 'Nicht mit Volumen, sondern mit Rhythmus loesen.']
      },
      aftermath: 'Eine saubere Rehydrierung bringt Stabilitaet ohne den Rootball erneut zu ueberlasten.'
    },
    {
      id: 'indoor_soil_ph_out_of_range',
      setup: 'indoor',
      category: 'nutrition',
      stage: 'S3-S9',
      severity: 'warning',
      image: 'assets/events/ph_drift_high.png',
      title: 'pH ausserhalb Zielbereich',
      symptom: 'Trotz Duengung zeigen Blaetter Mangelmuster. Der pH liegt neben dem Zielbereich, dadurch bleibt ein Teil der Naehrstoffe fuer die Pflanze schlechter erreichbar.',
      coach: {
        summary: 'Erst pH stabilisieren, dann Feed fein anpassen. So loest du die Ursache statt nur das sichtbare Blattbild.',
        why: 'Viele Mangelbilder sind Aufnahmethemen. Bei pH-Drift sind Naehrstoffe oft vorhanden, kommen aber im Wurzelraum schlechter an.',
        actions: ['pH messen und schrittweise korrigieren.', '24h Trend beobachten.']
      },
      decisions: [
        { id: 'adjust_ph_gradual', label: 'pH schrittweise korrigieren', detail: 'Verbessert die Aufnahme ohne harte Spruenge.', quality: 'recommended' },
        { id: 'verify_runoff_then_adjust', label: 'Drain pruefen, dann anpassen', detail: 'Sichert erst die Ursache, dann die Korrektur.', quality: 'situational' },
        { id: 'add_more_nutrients_now', label: 'Jetzt staerker nachduengen', detail: 'Erhoeht Druck, loest aber oft nicht die Ursache.', quality: 'risky' }
      ],
      learningCard: {
        title: 'pH und Aufnahme',
        subtitle: 'Nicht nur was drin ist, sondern was ankommt',
        bullets: ['pH steuert Verfuegbarkeit.', 'Mehr Duenger ist nicht automatisch besser.', 'Trend > Einzelwert.']
      },
      aftermath: 'Mit stabilerem pH greifen Korrekturen besser, die neuen Blaetter wirken ruhiger und der Verlauf bleibt fuer dich klarer lesbar.'
    },
    {
      id: 'indoor_heat_stress_air',
      setup: 'indoor',
      category: 'environment',
      stage: 'S3-S10',
      severity: 'warning',
      image: 'assets/events/event-heat-wave.png',
      title: 'Hitzestress in der Luft',
      symptom: 'Blaetter rollen an den Raendern, die Pflanze wirkt angespannt. Verdunstungsdruck liegt zu hoch.',
      coach: {
        summary: 'Klima beruhigen statt hektisch handeln. Erst Last senken, dann fein nachjustieren.',
        why: 'Hitze und Luftfluss verschieben den Wasserhaushalt schnell. Schon kleine Klima-Korrekturen koennen deutlich mehr bringen als starke Einzelaktionen.',
        actions: ['Canopy-Temperatur senken.', 'Luftaustausch verbessern.']
      },
      decisions: [
        { id: 'lower_canopy_temp', label: 'Canopy-Temperatur senken', detail: 'Reduziert akuten Verdunstungsdruck.', quality: 'recommended' },
        { id: 'increase_air_exchange', label: 'Luftaustausch verbessern', detail: 'Stabilisiert den Verlauf ueber Zeit.', quality: 'situational' },
        { id: 'raise_light_intensity', label: 'Lichtleistung erhoehen', detail: 'Kann den Stress in dieser Lage verstaerken.', quality: 'risky' }
      ],
      learningCard: {
        title: 'Klima und VPD kompakt',
        subtitle: 'Stabilitaet vor Push',
        bullets: ['Hitze treibt Verdunstung.', 'Kleine Korrekturen reichen oft.', 'Erst beruhigen, dann optimieren.']
      },
      aftermath: 'Wenn die Klimaspitze sauber gebrochen ist, reagiert die Pflanze meist schnell ruhiger.'
    },
    {
      id: 'outdoor_heavy_rain_waterlogging_risk',
      setup: 'outdoor',
      category: 'water',
      stage: 'S3-S10',
      severity: 'warning',
      image: 'assets/events/too_wet_soil.png',
      title: 'Starkregen und Staunaesse-Risiko',
      symptom: 'Topf bleibt nach Regen schwer, Blaetter haengen nach. Die Wurzelzone ist zu lange gesaettigt.',
      coach: {
        summary: 'Jetzt Drainage priorisieren und nicht nachgiessen. Sauerstoff ist gerade wichtiger als Volumen.',
        why: 'Bei Dauernaesse sinkt die Luft im Substrat. Mehr Wasser loest das Problem nicht, sondern verlaengert den Druck auf die Wurzeln.',
        actions: ['Abfluss verbessern.', 'Trockenfenster abwarten.']
      },
      decisions: [
        { id: 'improve_drainage_surface', label: 'Drainage verbessern', detail: 'Unterstuetzt schnelleren Luftaustausch in der Zone.', quality: 'recommended' },
        { id: 'pause_watering_monitor', label: 'Wasser pausieren und beobachten', detail: 'Haelt den Druck stabil bis zur Erholung.', quality: 'situational' },
        { id: 'water_extra_after_rain', label: 'Nach Regen extra giessen', detail: 'Verlaengert die Staunaesse und das Risiko.', quality: 'risky' }
      ],
      learningCard: {
        title: 'Regen richtig einordnen',
        subtitle: 'Nach nass kommt nicht mehr nass',
        bullets: ['Regenzyklen brauchen Luftfenster.', 'Gewicht zeigt Restfeuchte.', 'Drainage entscheidet ueber Stabilitaet.']
      },
      aftermath: 'Mit sauberer Drainage sinkt das Folgeproblem-Risiko deutlich in den naechsten Zyklen.'
    },
    {
      id: 'shared_light_distance_error',
      setup: 'shared',
      category: 'environment',
      stage: 'S2-S10',
      severity: 'warning',
      image: 'assets/events/event-light-burn.png',
      title: 'Lichtdistanz-Fehler',
      symptom: 'Blaetter zeigen Stresszeichen durch zu nahes oder zu fernes Licht. Das Wachstum wird ineffizient.',
      coach: {
        summary: 'Distanz in kleinen Schritten korrigieren. Erst stabilisieren, dann fein abstimmen.',
        why: 'Grosse Spruenge im Licht verursachen oft neue Stressspitzen. Kontrollierte Korrektur macht Reaktionen besser lesbar.',
        actions: ['Abstand moderat anpassen.', '24h Reaktion beobachten.']
      },
      decisions: [
        { id: 'adjust_light_distance_stepwise', label: 'Distanz schrittweise anpassen', detail: 'Verbessert Lichtbalance ohne harte Lastwechsel.', quality: 'recommended' },
        { id: 'measure_then_wait_24h', label: 'Messen und 24h warten', detail: 'Gibt dir einen sauberen Vorher-Nachher-Vergleich.', quality: 'situational' },
        { id: 'move_light_extreme', label: 'Licht extrem versetzen', detail: 'Kann neue Stressmuster ausloesen.', quality: 'risky' }
      ],
      learningCard: {
        title: 'Licht mit System',
        subtitle: 'Praezision vor Tempo',
        bullets: ['Abstand ist Laststeuerung.', 'Kleine Schritte sind lesbarer.', 'Reaktion immer in Ruhe prüfen.']
      },
      aftermath: 'Saubere Distanzkorrektur stabilisiert Leistung und reduziert Folgefehler bei Klima und Wasser.'
    },
    {
      id: 'shared_early_pest_signs_mild',
      setup: 'shared',
      category: 'pest',
      stage: 'S3-S10',
      severity: 'warning',
      image: 'assets/events/thrips_early.png',
      title: 'Fruehe Schaedlingszeichen (mild)',
      symptom: 'Erste feine Spuren sind sichtbar. Noch kein Alarm, aber ein gutes Zeitfenster fuer gezielte Kontrolle, bevor sich der Befall breiter im Bestand verteilt.',
      coach: {
        summary: 'Frueh und praezise reagieren. Ziel ist Kontrolle mit wenig Eingriff statt spaeterer, groesserer Last.',
        why: 'Milde Fruehzeichen lassen sich oft schnell einfangen. Ungezielte Rundumschritte erzeugen Aufwand, ohne den Befall wirklich klar zu treffen.',
        actions: ['Hotspots markieren.', 'Milde Zielmassnahme einsetzen.']
      },
      decisions: [
        { id: 'targeted_inspection_isolation', label: 'Gezielt pruefen und isolieren', detail: 'Trifft fruehen Befall meist sehr sicher.', quality: 'recommended' },
        { id: 'increase_monitoring_frequency', label: 'Kontrollen erhoehen', detail: 'Sichert den Verlauf fuer die naechste Wahl.', quality: 'situational' },
        { id: 'spray_everything_blindly', label: 'Alles blind bespruehen', detail: 'Erhoeht Last, ohne die Ursache sauber zu treffen.', quality: 'risky' }
      ],
      learningCard: {
        title: 'Fruehe Diagnose',
        subtitle: 'Kleine Signale ernst nehmen',
        bullets: ['Fruehzeichen sind ein Vorteil.', 'Gezielte Schritte sparen Folgeaufwand.', 'Dokumentation macht Entscheidungen besser.']
      },
      aftermath: 'Praezise Fruehreaktion reduziert Folgekosten, haelt den Druck klein und stabilisiert den Grow ohne unnoetigen Nebenstress.'
    }
  ];

  const textBudgets = Object.freeze({
    eventTitle: '36-48 Zeichen',
    situationSymptom: '120-180 Zeichen',
    coachSummary: '120-180 Zeichen',
    whyLearningShort: '180-260 Zeichen',
    decisionLabel: '18-32 Zeichen',
    decisionDetail: '70-120 Zeichen',
    aftermath: '100-160 Zeichen'
  });

  const viewportModes = Object.freeze([
    { id: 'android-small', label: 'Android Small', width: 360 },
    { id: 'iphone-typical', label: 'iPhone Typical', width: 390 },
    { id: 'phone-large', label: 'Large Phone', width: 430 },
    { id: 'tablet-narrow', label: 'Tablet Narrow', width: 768 }
  ]);

  const api = Object.freeze({
    getScenarios() {
      return scenarios.map((item) => Object.freeze(item));
    },
    getTextBudgets() {
      return textBudgets;
    },
    getViewportModes() {
      return viewportModes;
    }
  });

  globalScope.EventV2UiLabData = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
