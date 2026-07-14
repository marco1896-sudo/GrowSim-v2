'use strict';

(function attachGrowSimBuddyCareTrendEngine(globalScope) {
  const stateApi = globalScope.GrowSimBuddyCareState
    || (typeof require === 'function' ? require('./state.js') : null);
  const riskApi = globalScope.GrowSimBuddyCareRiskEngine
    || (typeof require === 'function' ? require('./riskEngine.js') : null);

  const TREND_LABEL_KEYS = Object.freeze({
    not_enough_data: 'buddyCare.trend.status.not_enough_data',
    stable: 'buddyCare.trend.status.stable',
    improving: 'buddyCare.trend.status.improving',
    watch_change: 'buddyCare.trend.status.watch_change',
    repeat_attention: 'buddyCare.trend.status.repeat_attention'
  });

  const TREND_MESSAGE_KEYS = Object.freeze({
    not_enough_data: 'buddyCare.trend.message.not_enough_data',
    stable: 'buddyCare.trend.message.stable',
    improving: 'buddyCare.trend.message.improving',
    watch_change: 'buddyCare.trend.message.watch_change',
    repeat_attention: 'buddyCare.trend.message.repeat_attention'
  });

  const TREND_TODAY_KEYS = Object.freeze({
    not_enough_data: 'buddyCare.trend.today.not_enough_data',
    stable: 'buddyCare.trend.today.stable',
    improving: 'buddyCare.trend.today.improving',
    watch_change: 'buddyCare.trend.today.watch_change',
    repeat_attention: 'buddyCare.trend.today.repeat_attention'
  });

  const HEIGHT_MESSAGE_KEYS = Object.freeze({
    delta: 'buddyCare.trend.height.delta',
    first: 'buddyCare.trend.height.first'
  });

  const HISTORY_SUMMARY_KEYS = Object.freeze({
    low_data: 'buddyCare.history.summary.low_data',
    stable: 'buddyCare.history.summary.stable',
    improving: 'buddyCare.history.summary.improving',
    watch_change: 'buddyCare.history.summary.watch_change',
    repeat_attention: 'buddyCare.history.summary.repeat_attention'
  });

  const HISTORY_UI_KEYS = Object.freeze({
    title: 'buddyCare.history.title',
    last_checks: 'buddyCare.history.last_checks',
    last_entries: 'buddyCare.history.last_entries',
    low_data: 'buddyCare.history.low_data',
    checks_available: 'buddyCare.history.checks_available',
    today: 'buddyCare.history.day.today',
    yesterday: 'buddyCare.history.day.yesterday',
    two_days_ago: 'buddyCare.history.day.two_days_ago',
    days_ago: 'buddyCare.history.day.days_ago'
  });

  const WEEKLY_LABEL_KEYS = Object.freeze({
    not_enough_data: 'buddyCare.weeklyReview.label.not_enough_data',
    calm_week: 'buddyCare.weeklyReview.label.calm_week',
    mixed_week: 'buddyCare.weeklyReview.label.mixed_week',
    attention_week: 'buddyCare.weeklyReview.label.attention_week'
  });

  const WEEKLY_SUMMARY_KEYS = Object.freeze({
    not_enough_data: 'buddyCare.weeklyReview.summary.not_enough_data',
    calm_week: 'buddyCare.weeklyReview.summary.calm_week',
    mixed_week: 'buddyCare.weeklyReview.summary.mixed_week',
    attention_week: 'buddyCare.weeklyReview.summary.attention_week'
  });

  const WEEKLY_HIGHLIGHT_KEYS = Object.freeze({
    checks_completed: 'buddyCare.weeklyReview.checks_completed',
    diary_entries_added: 'buddyCare.weeklyReview.diary_entries_added',
    low_data: 'buddyCare.weeklyReview.highlight.low_data',
    calm: 'buddyCare.weeklyReview.highlight.calm',
    mixed: 'buddyCare.weeklyReview.highlight.mixed',
    attention_repeat: 'buddyCare.weeklyReview.highlight.attention_repeat',
    today_check: 'buddyCare.weeklyReview.highlight.today_check',
    new_change: 'buddyCare.weeklyReview.highlight.new_change',
    height: 'buddyCare.weeklyReview.highlight.height'
  });

  const WEEKLY_FOCUS_KEYS = Object.freeze({
    check_two_three_days: 'buddyCare.weeklyReview.focus.check_two_three_days',
    first_diary_entry: 'buddyCare.weeklyReview.focus.first_diary_entry',
    build_routine: 'buddyCare.weeklyReview.focus.build_routine',
    keep_routine: 'buddyCare.weeklyReview.focus.keep_routine',
    height_once_week: 'buddyCare.weeklyReview.focus.height_once_week',
    note_changes: 'buddyCare.weeklyReview.focus.note_changes',
    compare_spot: 'buddyCare.weeklyReview.focus.compare_spot',
    no_many_changes: 'buddyCare.weeklyReview.focus.no_many_changes',
    add_short_note: 'buddyCare.weeklyReview.focus.add_short_note',
    check_today_calmly: 'buddyCare.weeklyReview.focus.check_today_calmly',
    document_trend: 'buddyCare.weeklyReview.focus.document_trend',
    compare_tomorrow: 'buddyCare.weeklyReview.focus.compare_tomorrow'
  });

  const WEEKLY_UI_KEYS = Object.freeze({
    title: 'buddyCare.weeklyReview.title',
    this_week: 'buddyCare.weeklyReview.this_week',
    card_value: 'buddyCare.weeklyReview.card_value',
    next_focus: 'buddyCare.weeklyReview.next_focus',
    focus_line: 'buddyCare.weeklyReview.focus_line'
  });

  const WEEKLY_FOCUS_BY_STATUS = Object.freeze({
    not_enough_data: Object.freeze([
      WEEKLY_FOCUS_KEYS.check_two_three_days,
      WEEKLY_FOCUS_KEYS.first_diary_entry,
      WEEKLY_FOCUS_KEYS.build_routine
    ]),
    calm_week: Object.freeze([
      WEEKLY_FOCUS_KEYS.keep_routine,
      WEEKLY_FOCUS_KEYS.height_once_week,
      WEEKLY_FOCUS_KEYS.note_changes
    ]),
    mixed_week: Object.freeze([
      WEEKLY_FOCUS_KEYS.compare_spot,
      WEEKLY_FOCUS_KEYS.no_many_changes,
      WEEKLY_FOCUS_KEYS.add_short_note
    ]),
    attention_week: Object.freeze([
      WEEKLY_FOCUS_KEYS.check_today_calmly,
      WEEKLY_FOCUS_KEYS.document_trend,
      WEEKLY_FOCUS_KEYS.compare_tomorrow
    ])
  });

  const COPY = Object.freeze({
    de: Object.freeze({
      [TREND_LABEL_KEYS.not_enough_data]: 'Noch nicht genug Daten',
      [TREND_LABEL_KEYS.stable]: 'Verlauf ruhig',
      [TREND_LABEL_KEYS.improving]: 'Besser als letzter Check',
      [TREND_LABEL_KEYS.watch_change]: 'Neue Veraenderung erkannt',
      [TREND_LABEL_KEYS.repeat_attention]: 'Wiederholt auffaellig',
      [TREND_MESSAGE_KEYS.not_enough_data]: 'Ich brauche noch mindestens zwei Checks, um Veraenderungen sinnvoll vergleichen zu koennen.',
      [TREND_MESSAGE_KEYS.stable]: 'Der Verlauf wirkt ruhig. Behalte deine Routine bei.',
      [TREND_MESSAGE_KEYS.improving]: 'Der heutige Check wirkt ruhiger als der letzte. Beobachte weiter und aendere nicht zu viel auf einmal.',
      [TREND_MESSAGE_KEYS.watch_change]: 'Eine Veraenderung ist neu dazugekommen. Dokumentiere sie kurz und vergleiche morgen erneut.',
      [TREND_MESSAGE_KEYS.repeat_attention]: 'Die Auffaelligkeit wiederholt sich. Pruefe die Pflanze heute in Ruhe und halte den Verlauf fest.',
      [TREND_TODAY_KEYS.not_enough_data]: 'Noch nicht genug Vergleichsdaten',
      [TREND_TODAY_KEYS.stable]: 'Verlauf ruhig seit dem letzten Check',
      [TREND_TODAY_KEYS.improving]: 'Ruhiger als der letzte Check',
      [TREND_TODAY_KEYS.watch_change]: 'Neue Veraenderung seit dem letzten Check',
      [TREND_TODAY_KEYS.repeat_attention]: 'Auffaelligkeit wiederholt sich',
      [HEIGHT_MESSAGE_KEYS.delta]: 'Seit dem letzten Hoehenwert: {delta} cm',
      [HEIGHT_MESSAGE_KEYS.first]: 'Erster Hoehenwert gespeichert',
      [HISTORY_SUMMARY_KEYS.low_data]: 'Noch wenig Verlauf vorhanden. Zwei bis drei Checks helfen Buddy beim Vergleichen.',
      [HISTORY_SUMMARY_KEYS.stable]: 'Der Verlauf wirkt ruhig. Behalte deine Routine bei.',
      [HISTORY_SUMMARY_KEYS.improving]: 'Der Verlauf wirkt heute ruhiger. Beobachte weiter und aendere nicht zu viel auf einmal.',
      [HISTORY_SUMMARY_KEYS.watch_change]: 'Eine Veraenderung ist neu dazugekommen. Vergleiche morgen erneut und dokumentiere kurz.',
      [HISTORY_SUMMARY_KEYS.repeat_attention]: 'Die Auffaelligkeit wiederholt sich. Pruefe die Pflanze heute in Ruhe und dokumentiere den Verlauf.',
      [HISTORY_UI_KEYS.title]: 'Verlauf',
      [HISTORY_UI_KEYS.last_checks]: 'Letzte Checks',
      [HISTORY_UI_KEYS.last_entries]: 'Letzte Eintraege',
      [HISTORY_UI_KEYS.low_data]: 'Noch wenig Daten.',
      [HISTORY_UI_KEYS.checks_available]: 'Verlauf: {count} Checks',
      [HISTORY_UI_KEYS.today]: 'Heute',
      [HISTORY_UI_KEYS.yesterday]: 'Gestern',
      [HISTORY_UI_KEYS.two_days_ago]: 'Vor 2 Tagen',
      [HISTORY_UI_KEYS.days_ago]: 'Vor {count} Tagen',
      [WEEKLY_UI_KEYS.title]: 'Wochenrueckblick',
      [WEEKLY_UI_KEYS.this_week]: 'Diese Woche',
      [WEEKLY_UI_KEYS.card_value]: 'Woche: {status}',
      [WEEKLY_UI_KEYS.next_focus]: 'Naechster Fokus',
      [WEEKLY_UI_KEYS.focus_line]: 'Wochenfokus: {focus}',
      [WEEKLY_LABEL_KEYS.not_enough_data]: 'noch wenig Verlauf',
      [WEEKLY_LABEL_KEYS.calm_week]: 'ruhig',
      [WEEKLY_LABEL_KEYS.mixed_week]: 'gemischt',
      [WEEKLY_LABEL_KEYS.attention_week]: 'genauer beobachten',
      [WEEKLY_SUMMARY_KEYS.not_enough_data]: 'Noch wenig Verlauf vorhanden. Zwei bis drei weitere Checks helfen Buddy beim Einordnen.',
      [WEEKLY_SUMMARY_KEYS.calm_week]: 'Der Wochenverlauf wirkt ruhig. Behalte deine Routine bei und dokumentiere weiter kurz.',
      [WEEKLY_SUMMARY_KEYS.mixed_week]: 'Die Woche war gemischt. Beobachte die auffaelligen Punkte weiter ruhig und vergleiche sie mit deinen letzten Eintraegen.',
      [WEEKLY_SUMMARY_KEYS.attention_week]: 'Diese Pflanze sollte in den naechsten Tagen genauer beobachtet werden. Pruefe sie in Ruhe und dokumentiere den Verlauf.',
      [WEEKLY_HIGHLIGHT_KEYS.checks_completed]: '{count} Checks durchgefuehrt',
      [WEEKLY_HIGHLIGHT_KEYS.diary_entries_added]: '{count} Tagebucheintraege ergaenzt',
      [WEEKLY_HIGHLIGHT_KEYS.low_data]: 'Noch wenig Verlauf vorhanden',
      [WEEKLY_HIGHLIGHT_KEYS.calm]: 'Verlauf wirkt ruhig',
      [WEEKLY_HIGHLIGHT_KEYS.mixed]: 'Woche war gemischt',
      [WEEKLY_HIGHLIGHT_KEYS.attention_repeat]: '{count}x genauer beobachten',
      [WEEKLY_HIGHLIGHT_KEYS.today_check]: '{count}x heute pruefen',
      [WEEKLY_HIGHLIGHT_KEYS.new_change]: 'Neue Veraenderung erkannt',
      [WEEKLY_HIGHLIGHT_KEYS.height]: 'Hoehenwerte dokumentiert',
      [WEEKLY_FOCUS_KEYS.check_two_three_days]: 'Tagescheck an 2-3 Tagen durchfuehren',
      [WEEKLY_FOCUS_KEYS.first_diary_entry]: 'ersten kurzen Tagebuch-Eintrag ergaenzen',
      [WEEKLY_FOCUS_KEYS.build_routine]: 'Routine aufbauen',
      [WEEKLY_FOCUS_KEYS.keep_routine]: 'Routine beibehalten',
      [WEEKLY_FOCUS_KEYS.height_once_week]: '1x pro Woche Hoehe dokumentieren',
      [WEEKLY_FOCUS_KEYS.note_changes]: 'bei Veraenderungen kurzen Eintrag ergaenzen',
      [WEEKLY_FOCUS_KEYS.compare_spot]: 'auffaellige Stelle erneut vergleichen',
      [WEEKLY_FOCUS_KEYS.no_many_changes]: 'nicht mehrere Dinge gleichzeitig aendern',
      [WEEKLY_FOCUS_KEYS.add_short_note]: 'kurze Notiz ergaenzen',
      [WEEKLY_FOCUS_KEYS.check_today_calmly]: 'Pflanze heute in Ruhe pruefen',
      [WEEKLY_FOCUS_KEYS.document_trend]: 'Verlauf dokumentieren',
      [WEEKLY_FOCUS_KEYS.compare_tomorrow]: 'morgen erneut vergleichen'
    }),
    en: Object.freeze({
      [TREND_LABEL_KEYS.not_enough_data]: 'Not enough data yet',
      [TREND_LABEL_KEYS.stable]: 'Trend looks calm',
      [TREND_LABEL_KEYS.improving]: 'Calmer than the last check',
      [TREND_LABEL_KEYS.watch_change]: 'New change noticed',
      [TREND_LABEL_KEYS.repeat_attention]: 'Repeated attention',
      [TREND_MESSAGE_KEYS.not_enough_data]: 'I still need at least two checks to compare changes in a useful way.',
      [TREND_MESSAGE_KEYS.stable]: 'The trend feels calm. Keep your routine.',
      [TREND_MESSAGE_KEYS.improving]: 'Today feels calmer than the last check. Keep observing and do not change too much at once.',
      [TREND_MESSAGE_KEYS.watch_change]: 'A change is new since the last check. Document it briefly and compare again tomorrow.',
      [TREND_MESSAGE_KEYS.repeat_attention]: 'The noticeable pattern is repeating. Check the plant calmly today and keep the trend documented.',
      [TREND_TODAY_KEYS.not_enough_data]: 'Not enough comparison data yet',
      [TREND_TODAY_KEYS.stable]: 'Trend calm since the last check',
      [TREND_TODAY_KEYS.improving]: 'Calmer than the last check',
      [TREND_TODAY_KEYS.watch_change]: 'New change since the last check',
      [TREND_TODAY_KEYS.repeat_attention]: 'Pattern repeats',
      [HEIGHT_MESSAGE_KEYS.delta]: 'Since the last height entry: {delta} cm',
      [HEIGHT_MESSAGE_KEYS.first]: 'First height entry saved',
      [HISTORY_SUMMARY_KEYS.low_data]: 'There is not much history yet. Two to three checks help Buddy compare changes better.',
      [HISTORY_SUMMARY_KEYS.stable]: 'The trend feels calm. Keep your routine.',
      [HISTORY_SUMMARY_KEYS.improving]: 'The trend feels calmer today. Keep observing and do not change too much at once.',
      [HISTORY_SUMMARY_KEYS.watch_change]: 'A change is new. Compare again tomorrow and document it briefly.',
      [HISTORY_SUMMARY_KEYS.repeat_attention]: 'The noticeable pattern repeats. Check the plant calmly today and document the history.',
      [HISTORY_UI_KEYS.title]: 'History',
      [HISTORY_UI_KEYS.last_checks]: 'Latest checks',
      [HISTORY_UI_KEYS.last_entries]: 'Latest entries',
      [HISTORY_UI_KEYS.low_data]: 'Not much data yet.',
      [HISTORY_UI_KEYS.checks_available]: 'History: {count} checks',
      [HISTORY_UI_KEYS.today]: 'Today',
      [HISTORY_UI_KEYS.yesterday]: 'Yesterday',
      [HISTORY_UI_KEYS.two_days_ago]: '2 days ago',
      [HISTORY_UI_KEYS.days_ago]: '{count} days ago',
      [WEEKLY_UI_KEYS.title]: 'Weekly review',
      [WEEKLY_UI_KEYS.this_week]: 'This week',
      [WEEKLY_UI_KEYS.card_value]: 'Week: {status}',
      [WEEKLY_UI_KEYS.next_focus]: 'Next focus',
      [WEEKLY_UI_KEYS.focus_line]: 'Weekly focus: {focus}',
      [WEEKLY_LABEL_KEYS.not_enough_data]: 'low history',
      [WEEKLY_LABEL_KEYS.calm_week]: 'calm',
      [WEEKLY_LABEL_KEYS.mixed_week]: 'mixed',
      [WEEKLY_LABEL_KEYS.attention_week]: 'watch more closely',
      [WEEKLY_SUMMARY_KEYS.not_enough_data]: 'There is not much history yet. Two to three more checks help Buddy place the pattern better.',
      [WEEKLY_SUMMARY_KEYS.calm_week]: 'The weekly pattern feels calm. Keep your routine and keep documenting briefly.',
      [WEEKLY_SUMMARY_KEYS.mixed_week]: 'The week was mixed. Keep watching the noticeable points calmly and compare them with your latest notes.',
      [WEEKLY_SUMMARY_KEYS.attention_week]: 'This plant deserves a closer look over the next few days. Check it calmly and document the pattern.',
      [WEEKLY_HIGHLIGHT_KEYS.checks_completed]: '{count} checks completed',
      [WEEKLY_HIGHLIGHT_KEYS.diary_entries_added]: '{count} diary entries added',
      [WEEKLY_HIGHLIGHT_KEYS.low_data]: 'Not much history yet',
      [WEEKLY_HIGHLIGHT_KEYS.calm]: 'Pattern looks calm',
      [WEEKLY_HIGHLIGHT_KEYS.mixed]: 'Week felt mixed',
      [WEEKLY_HIGHLIGHT_KEYS.attention_repeat]: '{count}x watch more closely',
      [WEEKLY_HIGHLIGHT_KEYS.today_check]: '{count}x check today',
      [WEEKLY_HIGHLIGHT_KEYS.new_change]: 'New change noticed',
      [WEEKLY_HIGHLIGHT_KEYS.height]: 'Height values documented',
      [WEEKLY_FOCUS_KEYS.check_two_three_days]: 'do a daily check on 2-3 days',
      [WEEKLY_FOCUS_KEYS.first_diary_entry]: 'add a first short diary note',
      [WEEKLY_FOCUS_KEYS.build_routine]: 'build a routine',
      [WEEKLY_FOCUS_KEYS.keep_routine]: 'keep your routine',
      [WEEKLY_FOCUS_KEYS.height_once_week]: 'document height once per week',
      [WEEKLY_FOCUS_KEYS.note_changes]: 'add a short note when something changes',
      [WEEKLY_FOCUS_KEYS.compare_spot]: 'compare the noticeable spot again',
      [WEEKLY_FOCUS_KEYS.no_many_changes]: 'do not change several things at once',
      [WEEKLY_FOCUS_KEYS.add_short_note]: 'add a short note',
      [WEEKLY_FOCUS_KEYS.check_today_calmly]: 'check the plant calmly today',
      [WEEKLY_FOCUS_KEYS.document_trend]: 'document the pattern',
      [WEEKLY_FOCUS_KEYS.compare_tomorrow]: 'compare again tomorrow'
    }),
    es: Object.freeze({
      [TREND_LABEL_KEYS.not_enough_data]: 'Aun no hay suficientes datos',
      [TREND_LABEL_KEYS.stable]: 'Tendencia tranquila',
      [TREND_LABEL_KEYS.improving]: 'Mas tranquilo que el ultimo chequeo',
      [TREND_LABEL_KEYS.watch_change]: 'Nuevo cambio detectado',
      [TREND_LABEL_KEYS.repeat_attention]: 'Se repite la atencion',
      [TREND_MESSAGE_KEYS.not_enough_data]: 'Todavia necesito al menos dos chequeos para comparar los cambios de forma util.',
      [TREND_MESSAGE_KEYS.stable]: 'La tendencia parece tranquila. Manten tu rutina.',
      [TREND_MESSAGE_KEYS.improving]: 'El chequeo de hoy parece mas tranquilo que el anterior. Sigue observando y no cambies demasiadas cosas a la vez.',
      [TREND_MESSAGE_KEYS.watch_change]: 'Hay un cambio nuevo desde el ultimo chequeo. Documentalo brevemente y compara otra vez manana.',
      [TREND_MESSAGE_KEYS.repeat_attention]: 'La senal llamativa se repite. Revisa la planta con calma hoy y deja registrado el seguimiento.',
      [TREND_TODAY_KEYS.not_enough_data]: 'Aun faltan datos para comparar',
      [TREND_TODAY_KEYS.stable]: 'Tendencia tranquila desde el ultimo chequeo',
      [TREND_TODAY_KEYS.improving]: 'Mas tranquilo que el ultimo chequeo',
      [TREND_TODAY_KEYS.watch_change]: 'Nuevo cambio desde el ultimo chequeo',
      [TREND_TODAY_KEYS.repeat_attention]: 'La senal se repite',
      [HEIGHT_MESSAGE_KEYS.delta]: 'Desde el ultimo valor de altura: {delta} cm',
      [HEIGHT_MESSAGE_KEYS.first]: 'Primer valor de altura guardado',
      [HISTORY_SUMMARY_KEYS.low_data]: 'Todavia hay poco historial. Dos o tres chequeos ayudan a Buddy a comparar mejor.',
      [HISTORY_SUMMARY_KEYS.stable]: 'La tendencia parece tranquila. Manten tu rutina.',
      [HISTORY_SUMMARY_KEYS.improving]: 'La tendencia hoy parece mas tranquila. Sigue observando y no cambies demasiadas cosas a la vez.',
      [HISTORY_SUMMARY_KEYS.watch_change]: 'Hay un cambio nuevo. Compara otra vez manana y documentalo brevemente.',
      [HISTORY_SUMMARY_KEYS.repeat_attention]: 'La senal llamativa se repite. Revisa la planta con calma hoy y documenta el historial.',
      [HISTORY_UI_KEYS.title]: 'Historial',
      [HISTORY_UI_KEYS.last_checks]: 'Ultimos chequeos',
      [HISTORY_UI_KEYS.last_entries]: 'Ultimas entradas',
      [HISTORY_UI_KEYS.low_data]: 'Aun hay pocos datos.',
      [HISTORY_UI_KEYS.checks_available]: 'Historial: {count} chequeos',
      [HISTORY_UI_KEYS.today]: 'Hoy',
      [HISTORY_UI_KEYS.yesterday]: 'Ayer',
      [HISTORY_UI_KEYS.two_days_ago]: 'Hace 2 dias',
      [HISTORY_UI_KEYS.days_ago]: 'Hace {count} dias',
      [WEEKLY_UI_KEYS.title]: 'Revision semanal',
      [WEEKLY_UI_KEYS.this_week]: 'Esta semana',
      [WEEKLY_UI_KEYS.card_value]: 'Semana: {status}',
      [WEEKLY_UI_KEYS.next_focus]: 'Siguiente foco',
      [WEEKLY_UI_KEYS.focus_line]: 'Foco semanal: {focus}',
      [WEEKLY_LABEL_KEYS.not_enough_data]: 'poco historial',
      [WEEKLY_LABEL_KEYS.calm_week]: 'tranquila',
      [WEEKLY_LABEL_KEYS.mixed_week]: 'mezclada',
      [WEEKLY_LABEL_KEYS.attention_week]: 'observar mejor',
      [WEEKLY_SUMMARY_KEYS.not_enough_data]: 'Todavia hay poco historial. Dos o tres chequeos mas ayudan a Buddy a ubicar mejor el seguimiento.',
      [WEEKLY_SUMMARY_KEYS.calm_week]: 'El recorrido de la semana parece tranquilo. Manten tu rutina y sigue documentando brevemente.',
      [WEEKLY_SUMMARY_KEYS.mixed_week]: 'La semana fue mixta. Sigue observando con calma los puntos llamativos y comparalos con tus ultimas notas.',
      [WEEKLY_SUMMARY_KEYS.attention_week]: 'Esta planta merece una observacion mas cercana en los proximos dias. Revisala con calma y documenta el seguimiento.',
      [WEEKLY_HIGHLIGHT_KEYS.checks_completed]: '{count} chequeos completados',
      [WEEKLY_HIGHLIGHT_KEYS.diary_entries_added]: '{count} entradas de diario anadidas',
      [WEEKLY_HIGHLIGHT_KEYS.low_data]: 'Todavia hay poco historial',
      [WEEKLY_HIGHLIGHT_KEYS.calm]: 'El seguimiento parece tranquilo',
      [WEEKLY_HIGHLIGHT_KEYS.mixed]: 'La semana fue mixta',
      [WEEKLY_HIGHLIGHT_KEYS.attention_repeat]: '{count}x observar con mas atencion',
      [WEEKLY_HIGHLIGHT_KEYS.today_check]: '{count}x revisar hoy',
      [WEEKLY_HIGHLIGHT_KEYS.new_change]: 'Se detecto un cambio nuevo',
      [WEEKLY_HIGHLIGHT_KEYS.height]: 'Valores de altura documentados',
      [WEEKLY_FOCUS_KEYS.check_two_three_days]: 'hacer un daily check en 2-3 dias',
      [WEEKLY_FOCUS_KEYS.first_diary_entry]: 'anadir una primera nota breve al diario',
      [WEEKLY_FOCUS_KEYS.build_routine]: 'crear una rutina',
      [WEEKLY_FOCUS_KEYS.keep_routine]: 'mantener la rutina',
      [WEEKLY_FOCUS_KEYS.height_once_week]: 'registrar la altura una vez por semana',
      [WEEKLY_FOCUS_KEYS.note_changes]: 'anadir una nota breve cuando algo cambie',
      [WEEKLY_FOCUS_KEYS.compare_spot]: 'comparar otra vez la zona llamativa',
      [WEEKLY_FOCUS_KEYS.no_many_changes]: 'no cambiar varias cosas a la vez',
      [WEEKLY_FOCUS_KEYS.add_short_note]: 'anadir una nota breve',
      [WEEKLY_FOCUS_KEYS.check_today_calmly]: 'revisar la planta con calma hoy',
      [WEEKLY_FOCUS_KEYS.document_trend]: 'documentar el seguimiento',
      [WEEKLY_FOCUS_KEYS.compare_tomorrow]: 'comparar otra vez manana'
    })
  });

  function normalizeLocale(locale) {
    const safeLocale = String(locale || '').trim().toLowerCase();
    if (safeLocale === 'de' || safeLocale.startsWith('de-')) {
      return 'de';
    }
    if (safeLocale === 'es' || safeLocale.startsWith('es-')) {
      return 'es';
    }
    return 'en';
  }

  function interpolate(template, vars = {}) {
    return String(template || '').replace(/\{(\w+)\}/g, (_match, key) => {
      const value = vars[key];
      return value == null ? '' : String(value);
    });
  }

  function getCopyValue(key, locale, vars = null) {
    const safeLocale = normalizeLocale(locale);
    const languagePack = COPY[safeLocale] || COPY.en;
    const template = languagePack[key] || COPY.en[key] || String(key || '');
    return vars ? interpolate(template, vars) : template;
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeTimestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const safeValue = String(value || '').trim();
    if (!safeValue) {
      return null;
    }
    const parsed = Date.parse(safeValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeNow(now) {
    return normalizeTimestamp(now) || Date.now();
  }

  function getCheckTimestamp(check) {
    const safeCheck = check && typeof check === 'object' ? check : {};
    return normalizeTimestamp(safeCheck.createdAtIso)
      || normalizeTimestamp(safeCheck.createdAt)
      || normalizeTimestamp(safeCheck.dayKey);
  }

  function getDiaryTimestamp(entry) {
    const safeEntry = entry && typeof entry === 'object' ? entry : {};
    return normalizeTimestamp(safeEntry.updatedAt)
      || normalizeTimestamp(safeEntry.createdAt)
      || normalizeTimestamp(safeEntry.entryDate);
  }

  function normalizeHeight(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.round(numericValue * 10) / 10 : null;
  }

  function getRiskQuality(status) {
    switch (String(status || '').trim().toLowerCase()) {
      case 'green':
        return 3;
      case 'gray':
        return 2;
      case 'yellow':
        return 1;
      case 'red':
        return 0;
      default:
        return -1;
    }
  }

  function isCheckAttentionWorthy(check) {
    const safeCheck = check && typeof check === 'object' ? check : {};
    return (safeCheck.leafState !== 'normal' && safeCheck.leafState !== 'unknown')
      || safeCheck.pestsVisible === 'yes'
      || safeCheck.pestsVisible === 'unsure'
      || (safeCheck.environmentStress !== 'normal' && safeCheck.environmentStress !== 'unknown')
      || safeCheck.growthState === 'slow'
      || (safeCheck.mediumMoisture === 'wet' && safeCheck.leafState === 'hanging');
  }

  function normalizeChecks(sourceList) {
    return toArray(sourceList)
      .filter((entry) => entry && typeof entry === 'object')
      .slice()
      .sort((left, right) => (getCheckTimestamp(right) || 0) - (getCheckTimestamp(left) || 0));
  }

  function normalizeDiaryEntries(sourceList) {
    return toArray(sourceList)
      .filter((entry) => entry && typeof entry === 'object')
      .slice()
      .sort((left, right) => (getDiaryTimestamp(right) || 0) - (getDiaryTimestamp(left) || 0));
  }

  function getRecentDailyChecksForPlant(stateOrContext, plantId, limit = 5) {
    const safePlantId = String(plantId || '').trim();
    const safeLimit = Math.max(1, Math.trunc(Number(limit) || 0) || 5);
    if (!safePlantId) {
      return [];
    }
    if (stateOrContext && stateOrContext.recentDailyChecksByPlantId && Array.isArray(stateOrContext.recentDailyChecksByPlantId[safePlantId])) {
      return normalizeChecks(stateOrContext.recentDailyChecksByPlantId[safePlantId]).slice(0, safeLimit);
    }
    if (stateOrContext && stateOrContext.dailyChecksByPlantId && Array.isArray(stateOrContext.dailyChecksByPlantId[safePlantId])) {
      return normalizeChecks(stateOrContext.dailyChecksByPlantId[safePlantId]).slice(0, safeLimit);
    }
    if (Array.isArray(stateOrContext && stateOrContext.recentDailyChecks)) {
      return normalizeChecks(stateOrContext.recentDailyChecks)
        .filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
        .slice(0, safeLimit);
    }
    if (Array.isArray(stateOrContext && stateOrContext.dailyChecks)) {
      return normalizeChecks(stateOrContext.dailyChecks)
        .filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
        .slice(0, safeLimit);
    }
    if (stateApi && typeof stateApi.getDailyChecksForPlant === 'function') {
      return normalizeChecks(stateApi.getDailyChecksForPlant(stateOrContext, safePlantId)).slice(0, safeLimit);
    }
    return [];
  }

  function getPlantCheckHistory(stateOrContext, plantId, limit = 3) {
    return getRecentDailyChecksForPlant(stateOrContext, plantId, limit);
  }

  function getPlantDiaryHistory(stateOrContext, plantId, limit = 3) {
    const safePlantId = String(plantId || '').trim();
    const safeLimit = Math.max(1, Math.trunc(Number(limit) || 0) || 3);
    if (!safePlantId) {
      return [];
    }
    if (stateOrContext && stateOrContext.diaryEntriesByPlantId && Array.isArray(stateOrContext.diaryEntriesByPlantId[safePlantId])) {
      return normalizeDiaryEntries(stateOrContext.diaryEntriesByPlantId[safePlantId]).slice(0, safeLimit);
    }
    if (Array.isArray(stateOrContext && stateOrContext.diaryEntries)) {
      return normalizeDiaryEntries(stateOrContext.diaryEntries)
        .filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
        .slice(0, safeLimit);
    }
    if (stateApi && typeof stateApi.getDiaryEntriesForPlant === 'function') {
      return normalizeDiaryEntries(stateApi.getDiaryEntriesForPlant(stateOrContext, safePlantId)).slice(0, safeLimit);
    }
    return [];
  }

  function getPlantWeeklyWindow(now = null) {
    const safeNow = normalizeNow(now);
    const dayStartMs = Date.parse(`${new Date(safeNow).toISOString().slice(0, 10)}T00:00:00.000Z`);
    const dayMs = 24 * 60 * 60 * 1000;
    const startMs = dayStartMs - (6 * dayMs);
    const endMs = dayStartMs + dayMs - 1;
    return Object.freeze({
      startMs,
      endMs,
      periodStart: new Date(startMs).toISOString().slice(0, 10),
      periodEnd: new Date(endMs).toISOString().slice(0, 10)
    });
  }

  function isTimestampWithinWindow(timestamp, weeklyWindow) {
    const safeTimestamp = normalizeTimestamp(timestamp);
    if (!Number.isFinite(safeTimestamp) || !weeklyWindow) {
      return false;
    }
    return safeTimestamp >= weeklyWindow.startMs && safeTimestamp <= weeklyWindow.endMs;
  }

  function getWeeklyChecksForPlant(stateOrContext, plantId, now = null) {
    const weeklyWindow = getPlantWeeklyWindow(now);
    return getRecentDailyChecksForPlant(stateOrContext, plantId, 180)
      .filter((check) => isTimestampWithinWindow(getCheckTimestamp(check), weeklyWindow));
  }

  function getWeeklyDiaryEntriesForPlant(stateOrContext, plantId, now = null) {
    const weeklyWindow = getPlantWeeklyWindow(now);
    return getPlantDiaryHistory(stateOrContext, plantId, 180)
      .filter((entry) => isTimestampWithinWindow(getDiaryTimestamp(entry), weeklyWindow));
  }

  function getPreviousDailyCheckForPlant(stateOrContext, plantId, currentCheckId = '') {
    const safeCurrentCheckId = String(currentCheckId || '').trim();
    const checks = getRecentDailyChecksForPlant(stateOrContext, plantId, 6);
    if (!checks.length) {
      return null;
    }
    if (safeCurrentCheckId) {
      return checks.find((entry) => String(entry && entry.id || '').trim() !== safeCurrentCheckId) || null;
    }
    return checks[1] || null;
  }

  function hasIssueTagToday(entries, nowMs) {
    const todayKey = new Date(normalizeNow(nowMs)).toISOString().slice(0, 10);
    return toArray(entries).some((entry) => (
      entry
      && String(entry.entryDate || '').trim() === todayKey
      && Array.isArray(entry.tags)
      && entry.tags.some((tag) => String(tag || '').trim().toLowerCase() === 'issue')
    ));
  }

  function countAttentionChecksWithinWindow(checks, nowMs, withinMs) {
    return normalizeChecks(checks).filter((check) => {
      if (!isCheckAttentionWorthy(check)) {
        return false;
      }
      const timestamp = getCheckTimestamp(check);
      return Number.isFinite(timestamp) && nowMs - timestamp <= withinMs;
    }).length;
  }

  function hasNewWatchChange(currentCheck, previousCheck) {
    const current = currentCheck && typeof currentCheck === 'object' ? currentCheck : {};
    const previous = previousCheck && typeof previousCheck === 'object' ? previousCheck : {};
    return (
      (previous.leafState === 'normal' && current.leafState && current.leafState !== 'normal' && current.leafState !== 'unknown')
      || (previous.environmentStress === 'normal' && current.environmentStress && current.environmentStress !== 'normal' && current.environmentStress !== 'unknown')
      || ((previous.growthState === 'normal' || previous.growthState === 'fast') && current.growthState === 'slow')
      || (previous.pestsVisible === 'no' && (current.pestsVisible === 'unsure' || current.pestsVisible === 'yes'))
    );
  }

  function buildHeightComparison(recentDailyChecks, diaryEntries) {
    const checks = normalizeChecks(recentDailyChecks);
    const skipLinkedIds = new Set(checks.map((entry) => String(entry && entry.id || '').trim()).filter(Boolean));
    const readings = [];

    checks.forEach((check) => {
      const heightCm = normalizeHeight(check && check.heightCm);
      if (heightCm == null) {
        return;
      }
      readings.push({
        sourceId: `check:${String(check && check.id || '').trim()}`,
        timestamp: getCheckTimestamp(check) || 0,
        heightCm
      });
    });

    toArray(diaryEntries).forEach((entry) => {
      const linkedCheckId = String(entry && entry.linkedCheckId || '').trim();
      if (linkedCheckId && skipLinkedIds.has(linkedCheckId)) {
        return;
      }
      const heightCm = normalizeHeight(entry && entry.heightCm);
      if (heightCm == null) {
        return;
      }
      readings.push({
        sourceId: `diary:${String(entry && entry.id || '').trim()}`,
        timestamp: getDiaryTimestamp(entry) || 0,
        heightCm
      });
    });

    readings.sort((left, right) => right.timestamp - left.timestamp);
    if (!readings.length) {
      return null;
    }

    const current = readings[0];
    const previous = readings[1] || null;
    if (!previous) {
      return Object.freeze({
        previousHeightCm: null,
        currentHeightCm: current.heightCm,
        deltaCm: null,
        isFirstHeight: true,
        messageKey: HEIGHT_MESSAGE_KEYS.first
      });
    }

    return Object.freeze({
      previousHeightCm: previous.heightCm,
      currentHeightCm: current.heightCm,
      deltaCm: Math.round((current.heightCm - previous.heightCm) * 10) / 10,
      isFirstHeight: false,
      messageKey: HEIGHT_MESSAGE_KEYS.delta
    });
  }

  function getHistoryRelativeDayLabel(value, locale = 'en', now = null) {
    const safeTimestamp = normalizeTimestamp(value);
    if (!Number.isFinite(safeTimestamp)) {
      return String(value || '');
    }
    const safeNow = normalizeNow(now);
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date(safeNow).toISOString().slice(0, 10);
    const compareStart = new Date(safeTimestamp).toISOString().slice(0, 10);
    const diffDays = Math.round((Date.parse(`${todayStart}T00:00:00.000Z`) - Date.parse(`${compareStart}T00:00:00.000Z`)) / dayMs);

    if (diffDays === 0) {
      return getCopyValue(HISTORY_UI_KEYS.today, locale);
    }
    if (diffDays === 1) {
      return getCopyValue(HISTORY_UI_KEYS.yesterday, locale);
    }
    if (diffDays === 2) {
      return getCopyValue(HISTORY_UI_KEYS.two_days_ago, locale);
    }
    if (diffDays > 2 && diffDays < 365) {
      return getCopyValue(HISTORY_UI_KEYS.days_ago, locale, { count: diffDays });
    }
    return new Date(safeTimestamp).toISOString().slice(0, 10);
  }

  function getHistorySummaryKeyFromTrend(trend) {
    switch (String(trend || '').trim().toLowerCase()) {
      case 'stable':
        return HISTORY_SUMMARY_KEYS.stable;
      case 'improving':
        return HISTORY_SUMMARY_KEYS.improving;
      case 'watch_change':
        return HISTORY_SUMMARY_KEYS.watch_change;
      case 'repeat_attention':
        return HISTORY_SUMMARY_KEYS.repeat_attention;
      default:
        return HISTORY_SUMMARY_KEYS.low_data;
    }
  }

  function buildCheckHistoryItems(plant, checkHistory, context = {}) {
    const safePlant = plant && typeof plant === 'object' ? plant : {};
    const safeLocale = normalizeLocale(context && context.locale);
    return normalizeChecks(checkHistory).slice(0, 3).map((check, index, checks) => {
      const sameOrOlderChecks = checks.slice(index);
      const statusEvaluation = riskApi && typeof riskApi.evaluatePlantCareRisk === 'function'
        ? riskApi.evaluatePlantCareRisk(safePlant, {
          latestDailyCheck: check,
          dailyChecks: sameOrOlderChecks,
          diaryEntries: [],
          todayDiaryEntries: [],
          dailyCheckStatus: isCheckAttentionWorthy(check) ? 'needs_attention' : 'checked_today',
          now: context && context.now
        })
        : null;
      const status = String(statusEvaluation && statusEvaluation.status || (isCheckAttentionWorthy(check) ? 'yellow' : 'green')).trim().toLowerCase();
      const statusLabel = riskApi && typeof riskApi.getRiskLabel === 'function'
        ? riskApi.getRiskLabel(status, safeLocale)
        : status;
      const summary = riskApi && typeof riskApi.getRiskBuddyMessage === 'function'
        ? riskApi.getRiskBuddyMessage(status, statusEvaluation && statusEvaluation.signals, safeLocale)
        : '';
      return Object.freeze({
        id: String(check && check.id || '').trim(),
        date: String(check && (check.dayKey || check.createdAtIso || '') || '').trim(),
        dateLabel: getHistoryRelativeDayLabel(check && (check.dayKey || check.createdAtIso || ''), safeLocale, context && context.now),
        status,
        statusLabel,
        summary,
        heightCm: normalizeHeight(check && check.heightCm)
      });
    });
  }

  function buildDiaryHistoryItems(diaryHistory, context = {}) {
    const safeLocale = normalizeLocale(context && context.locale);
    return toArray(diaryHistory).slice(0, 3).map((entry) => Object.freeze({
      id: String(entry && entry.id || '').trim(),
      date: String(entry && (entry.entryDate || entry.updatedAt || entry.createdAt || '') || '').trim(),
      dateLabel: getHistoryRelativeDayLabel(entry && (entry.entryDate || entry.updatedAt || entry.createdAt || ''), safeLocale, context && context.now),
      title: String(entry && entry.title || '').trim(),
      tags: Array.isArray(entry && entry.tags) ? entry.tags.slice() : []
    }));
  }

  function resolvePlantContext(plantId, context = {}) {
    const safePlantId = String(plantId || '').trim();
    return {
      latestDailyCheck: context.latestDailyCheckByPlantId && context.latestDailyCheckByPlantId[safePlantId]
        ? context.latestDailyCheckByPlantId[safePlantId]
        : context.latestDailyCheck,
      previousDailyCheck: context.previousDailyCheckByPlantId && context.previousDailyCheckByPlantId[safePlantId]
        ? context.previousDailyCheckByPlantId[safePlantId]
        : context.previousDailyCheck,
      recentDailyChecks: context.recentDailyChecksByPlantId && Array.isArray(context.recentDailyChecksByPlantId[safePlantId])
        ? context.recentDailyChecksByPlantId[safePlantId]
        : (context.dailyChecksByPlantId && Array.isArray(context.dailyChecksByPlantId[safePlantId])
          ? context.dailyChecksByPlantId[safePlantId]
          : context.recentDailyChecks),
      latestRisk: context.latestRiskByPlantId && context.latestRiskByPlantId[safePlantId]
        ? context.latestRiskByPlantId[safePlantId]
        : context.latestRisk,
      previousRisk: context.previousRiskByPlantId && context.previousRiskByPlantId[safePlantId]
        ? context.previousRiskByPlantId[safePlantId]
        : context.previousRisk,
      diaryEntries: context.diaryEntriesByPlantId && Array.isArray(context.diaryEntriesByPlantId[safePlantId])
        ? context.diaryEntriesByPlantId[safePlantId]
        : (Array.isArray(context.diaryEntries)
          ? context.diaryEntries.filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
          : []),
      todayDiaryEntries: context.todayDiaryEntriesByPlantId && Array.isArray(context.todayDiaryEntriesByPlantId[safePlantId])
        ? context.todayDiaryEntriesByPlantId[safePlantId]
        : (Array.isArray(context.todayDiaryEntries)
          ? context.todayDiaryEntries.filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
          : []),
      trendEvaluation: context.trendEvaluationByPlantId && context.trendEvaluationByPlantId[safePlantId]
        ? context.trendEvaluationByPlantId[safePlantId]
        : context.trendEvaluation,
      locale: context.locale,
      now: context.now
    };
  }

  function evaluatePlantCareTrend(plant, context = {}) {
    const safePlant = plant && typeof plant === 'object' ? plant : null;
    const safePlantId = String(safePlant && safePlant.id || '').trim();
    const nowMs = normalizeNow(context && context.now);
    const recentDailyChecks = normalizeChecks(context && context.recentDailyChecks).length
      ? normalizeChecks(context && context.recentDailyChecks)
      : getRecentDailyChecksForPlant(context, safePlantId, 5);
    const latestDailyCheck = context && context.latestDailyCheck && typeof context.latestDailyCheck === 'object'
      ? context.latestDailyCheck
      : (recentDailyChecks[0] || null);
    const previousDailyCheck = context && context.previousDailyCheck && typeof context.previousDailyCheck === 'object'
      ? context.previousDailyCheck
      : getPreviousDailyCheckForPlant({
        recentDailyChecks
      }, safePlantId, latestDailyCheck && latestDailyCheck.id);
    const latestRisk = context && context.latestRisk && typeof context.latestRisk === 'object'
      ? context.latestRisk
      : null;
    const previousRisk = context && context.previousRisk && typeof context.previousRisk === 'object'
      ? context.previousRisk
      : null;
    const diaryEntries = toArray(context && context.diaryEntries);
    const todayDiaryEntries = toArray(context && context.todayDiaryEntries);
    const issueTaggedToday = hasIssueTagToday(todayDiaryEntries.length ? todayDiaryEntries : diaryEntries, nowMs);
    const heightComparison = buildHeightComparison(recentDailyChecks, diaryEntries);

    if (!safePlant || !safePlantId || !latestDailyCheck || !previousDailyCheck || recentDailyChecks.length < 2) {
      return Object.freeze({
        plantId: safePlantId,
        trend: 'not_enough_data',
        labelKey: TREND_LABEL_KEYS.not_enough_data,
        buddyMessageKey: TREND_MESSAGE_KEYS.not_enough_data,
        todayLineKey: TREND_TODAY_KEYS.not_enough_data,
        heightComparison
      });
    }

    const currentAttention = isCheckAttentionWorthy(latestDailyCheck);
    const previousAttention = isCheckAttentionWorthy(previousDailyCheck);
    const latestRiskQuality = getRiskQuality(latestRisk && latestRisk.status);
    const previousRiskQuality = getRiskQuality(previousRisk && previousRisk.status);
    const repeatedAttention = (currentAttention && previousAttention)
      || countAttentionChecksWithinWindow(recentDailyChecks.slice(0, 3), nowMs, 48 * 60 * 60 * 1000) >= 2
      || (latestRiskQuality >= 0 && previousRiskQuality >= 0 && latestRiskQuality <= 1 && previousRiskQuality <= 1);
    const riskImproved = latestRiskQuality > previousRiskQuality;
    const newWatchChange = hasNewWatchChange(latestDailyCheck, previousDailyCheck);

    let trend = 'stable';
    if (repeatedAttention) {
      trend = 'repeat_attention';
    } else if (previousAttention && !currentAttention && riskImproved) {
      trend = 'improving';
    } else if (newWatchChange) {
      trend = 'watch_change';
    } else if (!currentAttention && !previousAttention && !issueTaggedToday) {
      trend = 'stable';
    } else if (currentAttention || previousAttention || issueTaggedToday) {
      trend = 'watch_change';
    }

    return Object.freeze({
      plantId: safePlantId,
      trend,
      labelKey: TREND_LABEL_KEYS[trend] || TREND_LABEL_KEYS.not_enough_data,
      buddyMessageKey: TREND_MESSAGE_KEYS[trend] || TREND_MESSAGE_KEYS.not_enough_data,
      todayLineKey: TREND_TODAY_KEYS[trend] || TREND_TODAY_KEYS.not_enough_data,
      heightComparison
    });
  }

  function evaluateAllPlantCareTrends(plants, context = {}) {
    return toArray(plants).map((plant) => {
      const safePlant = plant && typeof plant === 'object' ? plant : {};
      return evaluatePlantCareTrend(safePlant, resolvePlantContext(safePlant.id, context));
    });
  }

  function buildPlantMiniHistory(plant, context = {}) {
    const safePlant = plant && typeof plant === 'object' ? plant : null;
    const safePlantId = String(safePlant && safePlant.id || '').trim();
    const safeLocale = normalizeLocale(context && context.locale);
    const recentDailyChecks = getPlantCheckHistory(context, safePlantId, 3);
    const diaryHistory = getPlantDiaryHistory(context, safePlantId, 3);
    const trendEvaluation = context && context.trendEvaluation && typeof context.trendEvaluation === 'object'
      ? context.trendEvaluation
      : evaluatePlantCareTrend(safePlant, {
        latestDailyCheck: context.latestDailyCheck,
        previousDailyCheck: context.previousDailyCheck,
        recentDailyChecks,
        latestRisk: context.latestRisk,
        previousRisk: context.previousRisk,
        diaryEntries: context.diaryEntries,
        todayDiaryEntries: context.todayDiaryEntries,
        now: context.now
      });
    const checkItems = buildCheckHistoryItems(safePlant, recentDailyChecks, { now: context.now, locale: safeLocale });
    const diaryItems = buildDiaryHistoryItems(diaryHistory, { now: context.now, locale: safeLocale });
    const heightDelta = buildHeightComparison(recentDailyChecks, diaryHistory);
    const buddySummaryKey = getHistorySummaryKeyFromTrend(checkItems.length < 2 ? 'not_enough_data' : trendEvaluation && trendEvaluation.trend);
    return Object.freeze({
      plantId: safePlantId,
      checkItems,
      diaryItems,
      heightDelta,
      historyStatus: checkItems.length < 2 ? 'not_enough_data' : String(trendEvaluation && trendEvaluation.trend || 'not_enough_data'),
      buddySummaryKey,
      buddySummary: getCopyValue(buddySummaryKey, safeLocale),
      checkCount: checkItems.length,
      diaryCount: diaryItems.length
    });
  }

  function buildAllPlantMiniHistories(plants, context = {}) {
    return toArray(plants).map((plant) => {
      const safePlant = plant && typeof plant === 'object' ? plant : {};
      return buildPlantMiniHistory(safePlant, resolvePlantContext(safePlant.id, context));
    });
  }

  function isManualDiaryEntry(entry) {
    const safeEntry = entry && typeof entry === 'object' ? entry : {};
    const entryType = String(safeEntry.entryType || '').trim().toLowerCase();
    const linkedCheckId = String(safeEntry.linkedCheckId || '').trim();
    return entryType !== 'daily_check' && !linkedCheckId;
  }

  function getRiskStatusForWeeklyCheck(plant, check, weeklyChecks, weeklyDiaryEntries, index, nowMs) {
    const safePlant = plant && typeof plant === 'object' ? plant : {};
    const sameOrOlderChecks = weeklyChecks.slice(index);
    const safeDayKey = String(check && check.dayKey || '').trim();
    const sameDayEntries = weeklyDiaryEntries.filter((entry) => String(entry && entry.entryDate || '').trim() === safeDayKey);
    const evaluation = riskApi && typeof riskApi.evaluatePlantCareRisk === 'function'
      ? riskApi.evaluatePlantCareRisk(safePlant, {
        latestDailyCheck: check,
        dailyChecks: sameOrOlderChecks,
        diaryEntries: weeklyDiaryEntries,
        todayDiaryEntries: sameDayEntries,
        dailyCheckStatus: isCheckAttentionWorthy(check) ? 'needs_attention' : 'checked_today',
        now: nowMs
      })
      : null;
    return String(evaluation && evaluation.status || (isCheckAttentionWorthy(check) ? 'yellow' : 'green')).trim().toLowerCase();
  }

  function getWeeklyReviewStatus(counts) {
    const checkCount = Math.max(0, Math.trunc(Number(counts && counts.checkCount) || 0));
    const greenCount = Math.max(0, Math.trunc(Number(counts && counts.greenCount) || 0));
    const yellowCount = Math.max(0, Math.trunc(Number(counts && counts.yellowCount) || 0));
    const redCount = Math.max(0, Math.trunc(Number(counts && counts.redCount) || 0));
    const attentionCount = Math.max(0, Math.trunc(Number(counts && counts.attentionCount) || 0));

    if (checkCount < 2) {
      return 'not_enough_data';
    }
    if (redCount >= 1 || yellowCount >= 2 || attentionCount >= 2) {
      return 'attention_week';
    }
    if (redCount === 0 && yellowCount <= 1 && greenCount >= 2 && greenCount > yellowCount) {
      return 'calm_week';
    }
    return 'mixed_week';
  }

  function pushUniqueLimited(target, value, limit) {
    const safeValue = String(value || '').trim();
    if (!safeValue || target.includes(safeValue) || target.length >= limit) {
      return;
    }
    target.push(safeValue);
  }

  function buildWeeklyHighlights(counts, locale, trendEvaluation) {
    const highlights = [];
    const checkCount = Math.max(0, Math.trunc(Number(counts && counts.checkCount) || 0));
    const diaryEntryCount = Math.max(0, Math.trunc(Number(counts && counts.diaryEntryCount) || 0));
    const yellowCount = Math.max(0, Math.trunc(Number(counts && counts.yellowCount) || 0));
    const redCount = Math.max(0, Math.trunc(Number(counts && counts.redCount) || 0));
    const attentionCount = Math.max(0, Math.trunc(Number(counts && counts.attentionCount) || 0));
    const heightEntryCount = Math.max(0, Math.trunc(Number(counts && counts.heightEntryCount) || 0));
    const status = String(counts && counts.status || 'not_enough_data').trim().toLowerCase();
    const latestTrend = String(trendEvaluation && trendEvaluation.trend || '').trim().toLowerCase();

    if (checkCount > 0) {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.checks_completed, locale, { count: checkCount }), 4);
    }
    if (diaryEntryCount > 0) {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.diary_entries_added, locale, { count: diaryEntryCount }), 4);
    }

    if (status === 'not_enough_data') {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.low_data, locale), 4);
    } else if (redCount > 0) {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.today_check, locale, { count: redCount }), 4);
    } else if (yellowCount > 1 || attentionCount > 1) {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.attention_repeat, locale, { count: Math.max(yellowCount, attentionCount) }), 4);
    } else if (latestTrend === 'watch_change' || yellowCount === 1 || attentionCount === 1) {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.new_change, locale), 4);
    }

    if (status === 'calm_week') {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.calm, locale), 4);
    } else if (status === 'mixed_week') {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.mixed, locale), 4);
    }

    if (heightEntryCount > 0) {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.height, locale), 4);
    }

    if (!highlights.length) {
      pushUniqueLimited(highlights, getCopyValue(WEEKLY_HIGHLIGHT_KEYS.low_data, locale), 4);
    }

    return Object.freeze(highlights.slice(0, 4));
  }

  function buildWeeklyFocusItems(status, locale) {
    const safeStatus = String(status || 'not_enough_data').trim().toLowerCase();
    const focusKeys = WEEKLY_FOCUS_BY_STATUS[safeStatus] || WEEKLY_FOCUS_BY_STATUS.not_enough_data;
    return Object.freeze(focusKeys.map((key) => getCopyValue(key, locale)).slice(0, 3));
  }

  function buildPlantWeeklyReview(plant, context = {}) {
    const safePlant = plant && typeof plant === 'object' ? plant : null;
    const safePlantId = String(safePlant && safePlant.id || '').trim();
    const safeLocale = normalizeLocale(context && context.locale);
    const nowMs = normalizeNow(context && context.now);
    const weeklyWindow = getPlantWeeklyWindow(nowMs);
    const trendEvaluation = context && context.trendEvaluation && typeof context.trendEvaluation === 'object'
      ? context.trendEvaluation
      : evaluatePlantCareTrend(safePlant, resolvePlantContext(safePlantId, context));
    const weeklyChecks = getWeeklyChecksForPlant(context, safePlantId, nowMs);
    const weeklyDiaryEntries = getWeeklyDiaryEntriesForPlant(context, safePlantId, nowMs);
    const manualDiaryEntries = weeklyDiaryEntries.filter((entry) => isManualDiaryEntry(entry));
    const weeklyStatuses = weeklyChecks.map((check, index) => getRiskStatusForWeeklyCheck(safePlant, check, weeklyChecks, weeklyDiaryEntries, index, getCheckTimestamp(check) || nowMs));
    const greenCount = weeklyStatuses.filter((status) => status === 'green').length;
    const yellowCount = weeklyStatuses.filter((status) => status === 'yellow').length;
    const redCount = weeklyStatuses.filter((status) => status === 'red').length;
    const grayCount = weeklyStatuses.filter((status) => status === 'gray').length;
    const attentionCount = weeklyChecks.filter((check) => isCheckAttentionWorthy(check)).length;
    const heightEntryCount = weeklyChecks.filter((check) => normalizeHeight(check && check.heightCm) != null).length
      + manualDiaryEntries.filter((entry) => normalizeHeight(entry && entry.heightCm) != null).length;
    const status = getWeeklyReviewStatus({
      checkCount: weeklyChecks.length,
      greenCount,
      yellowCount,
      redCount,
      grayCount,
      attentionCount
    });
    const labelKey = WEEKLY_LABEL_KEYS[status] || WEEKLY_LABEL_KEYS.not_enough_data;
    const buddySummaryKey = WEEKLY_SUMMARY_KEYS[status] || WEEKLY_SUMMARY_KEYS.not_enough_data;
    const nextFocus = buildWeeklyFocusItems(status, safeLocale);
    const highlights = buildWeeklyHighlights({
      checkCount: weeklyChecks.length,
      diaryEntryCount: manualDiaryEntries.length,
      greenCount,
      yellowCount,
      redCount,
      grayCount,
      attentionCount,
      heightEntryCount,
      status
    }, safeLocale, trendEvaluation);

    return Object.freeze({
      plantId: safePlantId,
      periodStart: weeklyWindow.periodStart,
      periodEnd: weeklyWindow.periodEnd,
      checkCount: weeklyChecks.length,
      diaryEntryCount: manualDiaryEntries.length,
      greenCount,
      yellowCount,
      redCount,
      grayCount,
      attentionCount,
      status,
      labelKey,
      buddySummaryKey,
      label: getCopyValue(labelKey, safeLocale),
      highlights,
      buddySummary: getCopyValue(buddySummaryKey, safeLocale),
      nextFocus,
      focusLine: nextFocus[0] || '',
      heightEntryCount
    });
  }

  function buildAllPlantWeeklyReviews(plants, context = {}) {
    return toArray(plants).map((plant) => {
      const safePlant = plant && typeof plant === 'object' ? plant : {};
      return buildPlantWeeklyReview(safePlant, resolvePlantContext(safePlant.id, context));
    });
  }

  function getMiniHistoryBuddySummary(history, locale = 'en') {
    const safeHistory = history && typeof history === 'object' ? history : {};
    return getCopyValue(
      String(safeHistory.buddySummaryKey || HISTORY_SUMMARY_KEYS.low_data),
      locale
    );
  }

  function getTrendLabel(trend, locale = 'en') {
    const safeTrend = String(trend || '').trim().toLowerCase();
    return getCopyValue(TREND_LABEL_KEYS[safeTrend] || TREND_LABEL_KEYS.not_enough_data, locale);
  }

  function getTrendBuddyMessage(trend, locale = 'en') {
    const safeTrend = String(trend || '').trim().toLowerCase();
    return getCopyValue(TREND_MESSAGE_KEYS[safeTrend] || TREND_MESSAGE_KEYS.not_enough_data, locale);
  }

  function getWeeklyReviewLabel(review, locale = 'en') {
    const safeReview = review && typeof review === 'object' ? review : {};
    return getCopyValue(String(safeReview.labelKey || WEEKLY_LABEL_KEYS.not_enough_data), locale);
  }

  function getWeeklyReviewBuddySummary(review, locale = 'en') {
    const safeReview = review && typeof review === 'object' ? review : {};
    return getCopyValue(String(safeReview.buddySummaryKey || WEEKLY_SUMMARY_KEYS.not_enough_data), locale);
  }

  const api = Object.freeze({
    TREND_LABEL_KEYS,
    TREND_MESSAGE_KEYS,
    TREND_TODAY_KEYS,
    HEIGHT_MESSAGE_KEYS,
    HISTORY_SUMMARY_KEYS,
    HISTORY_UI_KEYS,
    WEEKLY_LABEL_KEYS,
    WEEKLY_SUMMARY_KEYS,
    WEEKLY_HIGHLIGHT_KEYS,
    WEEKLY_FOCUS_KEYS,
    WEEKLY_UI_KEYS,
    getPreviousDailyCheckForPlant,
    getRecentDailyChecksForPlant,
    getPlantCheckHistory,
    getPlantDiaryHistory,
    getPlantWeeklyWindow,
    getWeeklyChecksForPlant,
    getWeeklyDiaryEntriesForPlant,
    evaluatePlantCareTrend,
    evaluateAllPlantCareTrends,
    buildPlantMiniHistory,
    buildAllPlantMiniHistories,
    buildPlantWeeklyReview,
    buildAllPlantWeeklyReviews,
    getTrendLabel,
    getTrendBuddyMessage,
    getMiniHistoryBuddySummary,
    getWeeklyReviewLabel,
    getWeeklyReviewBuddySummary,
    getHistoryRelativeDayLabel,
    getHeightComparisonMessage(comparison, locale = 'en') {
      const safeComparison = comparison && typeof comparison === 'object' ? comparison : null;
      if (!safeComparison) {
        return '';
      }
      if (safeComparison.isFirstHeight) {
        return getCopyValue(HEIGHT_MESSAGE_KEYS.first, locale);
      }
      const delta = Number(safeComparison.deltaCm);
      const deltaLabel = Number.isFinite(delta)
        ? `${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10}`
        : '';
      return getCopyValue(HEIGHT_MESSAGE_KEYS.delta, locale, { delta: deltaLabel });
    }
  });

  globalScope.GrowSimBuddyCareTrendEngine = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
