'use strict';

(function initEventV2PresentationMap(globalScope) {
  const ActivationRegistryApi = (() => {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try {
        return require('../runtime/EventV2ActivationRegistry.js');
      } catch (_error) {
        return null;
      }
    }
    if (globalScope && globalScope.GrowSimEventV2ActivationRegistry) {
      return globalScope.GrowSimEventV2ActivationRegistry;
    }
    return null;
  })();
  const FALLBACK_PRESENTATION = Object.freeze({
    title: 'Unbekanntes Ereignis',
    subtitle: 'Event-System · Hinweis',
    description: 'Dieses Ereignis wird vom neuen Ereignissystem erkannt, hat aber noch keine finale Darstellung.',
    statusLabel: 'Aktives Ereignis',
    categoryLabel: 'Hinweis',
    severityLabel: 'Hinweis',
    insights: Object.freeze([
      Object.freeze({
        label: 'Situation',
        text: 'Die Ereignisdaten sind vorhanden, aber noch nicht als finale Spieleransicht hinterlegt.'
      }),
      Object.freeze({
        label: 'Tendenz',
        text: 'Du kannst das Ereignis nachvollziehen, waehrend die Darstellung weiter verfeinert wird.'
      }),
      Object.freeze({
        label: 'Einschaetzung',
        text: 'Nutze eine ruhige, kontrollierte Entscheidung und beobachte die Auswirkung.'
      })
    ]),
    options: Object.freeze({}),
    visual: Object.freeze({
      type: 'neutral-card',
      label: 'Ereignis',
      icon: 'event-neutral'
    })
  });

  const PRESENTATION_MAP = Object.freeze({
    indoor_dry_rootball: Object.freeze({
      title: 'Trockener Wurzelballen',
      subtitle: 'Pflege · Warnung',
      description: 'Der Wurzelballen trocknet ungleichmaessig aus. Reagiere behutsam, statt hektisch zu giessen.',
      statusLabel: 'Aktives Ereignis',
      categoryLabel: 'Pflege',
      severityLabel: 'Warnung',
      insights: Object.freeze([
        Object.freeze({
          label: 'Situation',
          text: 'Der Wurzelballen trocknet ungleichmaessig aus. Einzelne Bereiche koennen bereits zu trocken sein.'
        }),
        Object.freeze({
          label: 'Tendenz',
          text: 'Die Pflanze zeigt erste Stresssignale. Eine ruhige, kontrollierte Reaktion ist sinnvoll.'
        }),
        Object.freeze({
          label: 'Einschaetzung',
          text: 'Pruefe zuerst Substrat und Topfgewicht. Zu viel Wasser kann das Problem verschaerfen.'
        })
      ]),
      options: Object.freeze({
        stabilize: Object.freeze({
          label: 'Behutsam stabilisieren',
          description: 'Kleine, kontrollierte Wassergabe und Zustand beobachten.',
          tone: 'recommended',
          badge: 'Empfohlen'
        }),
        inspect: Object.freeze({
          label: 'Substrat zuerst pruefen',
          description: 'Topfgewicht und Feuchtigkeit pruefen, bevor du eingreifst.',
          tone: 'diagnostic',
          badge: 'Pruefen'
        }),
        overreact: Object.freeze({
          label: 'Sofort stark eingreifen',
          description: 'Riskante Panikreaktion. Kann Stress verschlimmern.',
          tone: 'risky',
          badge: 'Riskant'
        })
      }),
      visual: Object.freeze({
        type: 'image',
        imagePath: 'assets/events/v2/final/indoor_dry_rootball/hero.webp',
        fallbackImagePath: 'assets/events/v2/final/indoor_dry_rootball/fallback.webp',
        fallbackType: 'image',
        fallbackIcon: 'rootball',
        alt: 'Trockener Wurzelballen',
        tone: 'warning',
        label: 'Trockener Wurzelballen',
        icon: 'rootball'
      })
    }),
    shared_panic_watering_misread: Object.freeze({
      title: 'Panikgiessen vermeiden',
      subtitle: 'Pflege · Hinweis',
      description: 'Die Pflanze wirkt durstig, aber ein vorschneller Griff zur Giesskanne kann das Problem verschaerfen.',
      statusLabel: 'Bereit zur Pruefung',
      categoryLabel: 'Pflege',
      severityLabel: 'Hinweis',
      options: Object.freeze({
        check_weight_before_watering: Object.freeze({
          label: 'Topfgewicht pruefen',
          description: 'Erst Gewicht und Feuchte einschaetzen, bevor du giessest.',
          tone: 'diagnostic',
          badge: 'Pruefen'
        }),
        inspect_rootzone_then_wait: Object.freeze({
          label: 'Wurzelzone pruefen',
          description: 'Kurz pruefen und der Pflanze Zeit geben, bevor du eingreifst.',
          tone: 'diagnostic',
          badge: 'Pruefen'
        }),
        water_on_panic_signal: Object.freeze({
          label: 'Aus Panik giessen',
          description: 'Riskante Reaktion. Kann Staunaesse oder Stress verstaerken.',
          tone: 'risky',
          badge: 'Riskant'
        })
      }),
      visual: Object.freeze({
        type: 'image',
        imagePath: 'assets/events/v2/final/shared_panic_watering_misread/hero.webp',
        fallbackImagePath: 'assets/events/v2/final/shared_panic_watering_misread/fallback.webp',
        fallbackType: 'image',
        fallbackIcon: 'water-check',
        alt: 'Panikgiessen vermeiden',
        tone: 'warning',
        label: 'Panikgiessen vermeiden',
        icon: 'water-check'
      })
    })
  });

  const FALLBACK_RESOLVE_PRESENTATION = Object.freeze({
    title: 'Entscheidung ausgewertet',
    summary: 'Deine Entscheidung wurde verarbeitet und im Verlauf gespeichert.',
    badge: 'Verlauf',
    tone: 'neutral'
  });

  const RESOLVE_PRESENTATION_MAP = Object.freeze({
    indoor_dry_rootball: Object.freeze({
      stabilize: Object.freeze({
        title: 'Behutsam stabilisiert',
        summary: 'Du hast ruhig reagiert und den Wurzelballen kontrolliert stabilisiert. Die Pflanze bekommt etwas Entlastung, ohne dass hektisches Giessen neuen Stress ausloest.',
        badge: 'Gute Entscheidung',
        tone: 'positive'
      }),
      inspect: Object.freeze({
        title: 'Substrat geprueft',
        summary: 'Du hast zuerst Substrat und Topfgewicht geprueft. Das veraendert den Zustand nicht sofort, verhindert aber eine vorschnelle Reaktion.',
        badge: 'Diagnose',
        tone: 'neutral'
      }),
      overreact: Object.freeze({
        title: 'Riskante Reaktion erkannt',
        summary: 'Du wolltest sofort stark eingreifen. Das kann bei unklarem Substratzustand zusaetzlichen Stress verursachen. Besser ist erst pruefen, dann handeln.',
        badge: 'Warnhinweis',
        tone: 'warning'
      })
    }),
    shared_panic_watering_misread: Object.freeze({
      check_weight_before_watering: Object.freeze({
        title: 'Topfgewicht geprueft',
        summary: 'Du pruefst zuerst das Topfgewicht, bevor du giessest. So vermeidest du Panikgiessen und triffst eine sicherere Entscheidung.',
        badge: 'Diagnose',
        tone: 'neutral'
      }),
      inspect_rootzone_then_wait: Object.freeze({
        title: 'Wurzelzone geprueft',
        summary: 'Du schaust genauer hin und gibst der Pflanze etwas Zeit. Das ist sicherer als sofort hektisch einzugreifen.',
        badge: 'Diagnose',
        tone: 'neutral'
      }),
      water_on_panic_signal: Object.freeze({
        title: 'Panikreaktion erkannt',
        summary: 'Aus Panik zu giessen kann Staunaesse und Stress verschaerfen. Beim naechsten Mal hilft: erst pruefen, dann handeln.',
        badge: 'Warnhinweis',
        tone: 'warning'
      })
    })
  });

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeOptionArray(options) {
    if (!Array.isArray(options)) {
      return [];
    }
    return options.map((entry) => {
      if (isObject(entry)) {
        return {
          id: String(entry.id || ''),
          label: entry.label ? String(entry.label) : '',
          description: entry.description ? String(entry.description) : ''
        };
      }
      return { id: String(entry || ''), label: '', description: '' };
    }).filter((entry) => entry.id);
  }

  function getEventV2Presentation(eventId, options) {
    const safeEventId = String(eventId || '').trim();
    const safeOptions = isObject(options) ? options : {};
    const mapped = PRESENTATION_MAP[safeEventId] || buildRuntimeEnabledFallbackPresentation(safeEventId);
    const fallback = clone(FALLBACK_PRESENTATION);
    const merged = {
      ...fallback,
      ...clone(mapped),
      eventId: safeEventId || null,
      hasDedicatedMapping: Boolean(PRESENTATION_MAP[safeEventId]),
      source: safeEventId && PRESENTATION_MAP[safeEventId] ? 'map' : 'fallback'
    };
    if (safeOptions.rawEvent && isObject(safeOptions.rawEvent)) {
      const rawEvent = safeOptions.rawEvent;
      if (!merged.hasDedicatedMapping && rawEvent.title) merged.title = String(rawEvent.title);
      if (!merged.hasDedicatedMapping && rawEvent.description) merged.description = String(rawEvent.description);
    }
    return merged;
  }

  function buildRuntimeEnabledFallbackPresentation(eventId) {
    const safeEventId = String(eventId || '').trim();
    if (!safeEventId || !ActivationRegistryApi || typeof ActivationRegistryApi.getEventV2ActivationEntry !== 'function') {
      return null;
    }
    const entry = ActivationRegistryApi.getEventV2ActivationEntry(safeEventId);
    if (!entry || entry.runtimeEnabled !== true) return null;
    const options = {};
    (Array.isArray(entry.optionIds) ? entry.optionIds : []).forEach((optionId) => {
      const safeOptionId = String(optionId || '').trim();
      if (!safeOptionId) return;
      const label = safeOptionId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      options[safeOptionId] = {
        label,
        description: 'Waehle diese Reaktion, wenn sie zur aktuellen Situation passt.',
        tone: safeOptionId.includes('panic') || safeOptionId.includes('blindly') || safeOptionId.includes('extreme')
          ? 'risky'
          : 'diagnostic',
        badge: safeOptionId.includes('panic') || safeOptionId.includes('blindly') || safeOptionId.includes('extreme')
          ? 'Riskant'
          : 'Pruefen',
      };
    });
    return {
      title: entry.title || 'Ereignis erkannt',
      subtitle: `${toGermanCategory(entry.category)} · ${toGermanSeverity(entry.severity)}`,
      description: entry.description || 'Dieses Ereignis wurde erkannt. Pruefe die Situation und waehle eine passende Reaktion.',
      statusLabel: 'Aktives Ereignis',
      categoryLabel: toGermanCategory(entry.category),
      severityLabel: toGermanSeverity(entry.severity),
      insights: [
        {
          label: 'Situation',
          text: entry.description || 'Die Situation wurde erkannt und kann jetzt geordnet bearbeitet werden.',
        },
        {
          label: 'Tendenz',
          text: 'Eine ruhige und nachvollziehbare Entscheidung ist in diesem Schritt am sichersten.',
        },
        {
          label: 'Einschaetzung',
          text: 'Waehle zuerst die Option, die das Risiko klein haelt und dir klare Beobachtung erlaubt.',
        },
      ],
      options,
      visual: {
        type: 'image',
        imagePath: `assets/events/v2/final/${safeEventId}/hero.webp`,
        fallbackImagePath: `assets/events/v2/final/${safeEventId}/fallback.webp`,
        fallbackType: 'image',
        fallbackIcon: 'event-neutral',
        alt: entry.title || 'Ereignis',
        tone: entry.visualTone || 'warning',
        label: entry.title || 'Ereignis',
        icon: 'event-neutral',
      },
    };
  }

  function toGermanCategory(category) {
    const safe = String(category || '').trim().toLowerCase();
    if (safe === 'environment') return 'Umgebung';
    if (safe === 'water') return 'Wasser';
    if (safe === 'nutrition') return 'Naehrstoffe';
    if (safe === 'pest') return 'Schaedlinge';
    if (safe === 'positive') return 'Erholung';
    return 'Pflege';
  }

  function toGermanSeverity(severity) {
    const safe = String(severity || '').trim().toLowerCase();
    if (safe === 'critical') return 'Kritisch';
    if (safe === 'info') return 'Hinweis';
    return 'Warnung';
  }

  function getEventV2OptionPresentation(eventId, optionId, options) {
    const safeOptionId = String(optionId || '').trim();
    const presentation = getEventV2Presentation(eventId, options);
    const mappedOptions = isObject(presentation.options) ? presentation.options : {};
    const mappedOption = isObject(mappedOptions[safeOptionId]) ? mappedOptions[safeOptionId] : null;
    return {
      id: safeOptionId,
      label: mappedOption && mappedOption.label ? String(mappedOption.label) : safeOptionId,
      description: mappedOption && mappedOption.description ? String(mappedOption.description) : '',
      tone: mappedOption && mappedOption.tone ? String(mappedOption.tone) : '',
      badge: mappedOption && mappedOption.badge ? String(mappedOption.badge) : '',
      hasDedicatedMapping: Boolean(mappedOption)
    };
  }

  function getEventV2VisualPresentation(eventId, options) {
    const presentation = getEventV2Presentation(eventId, options);
    const visual = isObject(presentation.visual) ? presentation.visual : {};
    return {
      type: String(visual.type || 'neutral-card'),
      imagePath: visual.imagePath ? String(visual.imagePath) : '',
      fallbackImagePath: visual.fallbackImagePath ? String(visual.fallbackImagePath) : '',
      fallbackType: visual.fallbackType ? String(visual.fallbackType) : 'neutral-card',
      fallbackIcon: visual.fallbackIcon ? String(visual.fallbackIcon) : '',
      alt: visual.alt ? String(visual.alt) : '',
      tone: visual.tone ? String(visual.tone) : '',
      label: String(visual.label || presentation.title || FALLBACK_PRESENTATION.visual.label),
      icon: String(visual.icon || FALLBACK_PRESENTATION.visual.icon)
    };
  }

  function getEventV2ResolvePresentation(eventId, optionId, options) {
    const safeEventId = String(eventId || '').trim();
    const safeOptionId = String(optionId || '').trim();
    const eventMap = RESOLVE_PRESENTATION_MAP[safeEventId];
    const mapped = eventMap && isObject(eventMap[safeOptionId]) ? eventMap[safeOptionId] : null;
    const fallback = clone(FALLBACK_RESOLVE_PRESENTATION);
    if (!mapped) {
      return {
        ...fallback,
        eventId: safeEventId || null,
        optionId: safeOptionId || null,
        hasDedicatedMapping: false,
        source: 'fallback'
      };
    }
    const safeOptions = isObject(options) ? options : {};
    const optionPresentation = getEventV2OptionPresentation(safeEventId, safeOptionId, safeOptions);
    return {
      ...fallback,
      ...clone(mapped),
      optionLabel: optionPresentation.label || safeOptionId,
      eventId: safeEventId,
      optionId: safeOptionId,
      hasDedicatedMapping: true,
      source: 'map'
    };
  }

  function normalizeEventV2Presentation(eventId, rawEvent) {
    const safeRawEvent = isObject(rawEvent) ? rawEvent : {};
    const base = getEventV2Presentation(eventId, { rawEvent: safeRawEvent });
    const normalizedOptions = normalizeOptionArray(safeRawEvent.options);
    const options = normalizedOptions.map((entry) => {
      const mapped = getEventV2OptionPresentation(eventId, entry.id, { rawEvent: safeRawEvent });
      return {
        ...entry,
        label: mapped.label || entry.label || entry.id,
        description: mapped.description || entry.description || '',
        tone: mapped.tone || '',
        badge: mapped.badge || ''
      };
    });
    return {
      ...base,
      categoryLabel: base.categoryLabel || String(safeRawEvent.category || FALLBACK_PRESENTATION.categoryLabel),
      severityLabel: base.severityLabel || String(safeRawEvent.severity || FALLBACK_PRESENTATION.severityLabel),
      options,
      visual: getEventV2VisualPresentation(eventId, { rawEvent: safeRawEvent })
    };
  }

  const api = Object.freeze({
    FALLBACK_PRESENTATION,
    PRESENTATION_MAP,
    FALLBACK_RESOLVE_PRESENTATION,
    RESOLVE_PRESENTATION_MAP,
    getEventV2Presentation,
    getEventV2OptionPresentation,
    getEventV2VisualPresentation,
    getEventV2ResolvePresentation,
    normalizeEventV2Presentation
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  globalScope.GrowSimEventV2PresentationMap = api;
})(typeof window !== 'undefined' ? window : globalThis);
