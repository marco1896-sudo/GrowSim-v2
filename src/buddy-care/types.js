'use strict';

(function attachGrowSimBuddyCareTypes(globalScope) {
  const ENTITLEMENTS = Object.freeze({
    FREE: 'free',
    CARE_PLUS_MOCK: 'care_plus_mock'
  });

  const PLANT_PHASES = Object.freeze([
    'seedling',
    'early_veg',
    'veg',
    'stretch',
    'flower',
    'ripening',
    'harvest_window',
    'unknown',
    'vegetative',
    'flowering',
    'harvest'
  ]);

  const TASK_STATUSES = Object.freeze([
    'open',
    'done',
    'skipped'
  ]);

  const DAILY_CHECK_STATUSES = Object.freeze([
    'no_check_today',
    'checked_today',
    'needs_attention'
  ]);

  const DIARY_TAGS = Object.freeze([
    'observation',
    'watering',
    'height',
    'environment',
    'issue',
    'weekly_review',
    'other',
    'daily_check'
  ]);

  const RISK_LEVELS = Object.freeze([
    'low',
    'medium',
    'high'
  ]);

  /**
   * @typedef {'free'|'care_plus_mock'} BuddyCareEntitlement
   */

  /**
   * @typedef {Object} BuddyCareSettings
   * @property {boolean} notificationsEnabled
   * @property {string} preferredReminderTime
   */

  /**
   * @typedef {Object} CareUserProfile
   * @property {boolean} ageGateAccepted
   * @property {number|null} ageGateAcceptedAt
   * @property {BuddyCareEntitlement} entitlement
   */

  /**
   * @typedef {Object} PlantProfile
   * @property {string} id
   * @property {string} nickname
   * @property {string} plantType
   * @property {string} environment
   * @property {string} startDate
   * @property {string} phase
   * @property {number|null} createdAt
   * @property {boolean} archived
   */

  /**
   * @typedef {Object} DailyCareCheck
   * @property {string} id
   * @property {string} plantId
   * @property {string} dayKey
   * @property {string} createdAtIso
   * @property {number|null} createdAt
   * @property {'dry'|'moist'|'wet'|'unknown'} mediumMoisture
   * @property {'normal'|'hanging'|'curling'|'spots'|'yellowing'|'unknown'} leafState
   * @property {'normal'|'fast'|'slow'|'unknown'} growthState
   * @property {'normal'|'hot'|'humid'|'cold'|'windy'|'unknown'} environmentStress
   * @property {'no'|'unsure'|'yes'} pestsVisible
   * @property {number|null} heightCm
   * @property {string} note
   * @property {number|null} createdAt
   */

  /**
   * @typedef {Object} CareTask
   * @property {string} id
   * @property {string} plantId
   * @property {string} title
   * @property {string} status
   * @property {number|null} dueAt
   * @property {number|null} createdAt
   */

  /**
   * @typedef {Object} DiaryEntry
   * @property {string} id
   * @property {string} plantId
   * @property {'manual'|'daily_check'} entryType
   * @property {string} entryDate
   * @property {string} title
   * @property {string} note
   * @property {string[]} tags
   * @property {string|null} linkedCheckId
   * @property {number|null} heightCm
   * @property {string|null} buddyComment
   * @property {string[]} photoUrls
   * @property {string} createdAt
   * @property {string} updatedAt
   */

  /**
   * @typedef {Object} RiskSignal
   * @property {string} id
   * @property {string} plantId
   * @property {'low'|'medium'|'high'} level
   * @property {string} label
   * @property {string} source
   * @property {number|null} createdAt
   */

  /**
   * @typedef {Object} BuddyCareState
   * @property {number} version
   * @property {boolean} ageGateAccepted
   * @property {number|null} ageGateAcceptedAt
   * @property {BuddyCareEntitlement} entitlement
   * @property {PlantProfile[]} plants
   * @property {DailyCareCheck[]} dailyChecks
   * @property {DiaryEntry[]} diaryEntries
   * @property {CareTask[]} tasks
   * @property {RiskSignal[]} riskSignals
   * @property {BuddyCareSettings} settings
   */

  const api = Object.freeze({
    VERSION: 1,
    ENTITLEMENTS,
    PLANT_PHASES,
    TASK_STATUSES,
    DAILY_CHECK_STATUSES,
    DIARY_TAGS,
    RISK_LEVELS
  });

  globalScope.GrowSimBuddyCareTypes = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
