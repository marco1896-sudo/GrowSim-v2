#!/usr/bin/env node
'use strict';

const assert = require('assert');
const trendEngine = require('../src/buddy-care/trendEngine.js');

const NOW = Date.UTC(2026, 6, 10, 10, 30, 0);
const NOW_ISO = new Date(NOW).toISOString();
const ONE_DAY_AGO_ISO = new Date(NOW - (24 * 60 * 60 * 1000)).toISOString();
const TWO_DAYS_AGO_ISO = new Date(NOW - (2 * 24 * 60 * 60 * 1000)).toISOString();
const THREE_DAYS_AGO_ISO = new Date(NOW - (3 * 24 * 60 * 60 * 1000)).toISOString();
const EIGHT_DAYS_AGO_ISO = new Date(NOW - (8 * 24 * 60 * 60 * 1000)).toISOString();

function createPlant(id, nickname = 'Alpha') {
  return { id, nickname };
}

function createCheck(overrides = {}) {
  return {
    id: 'check-now',
    plantId: 'plant-1',
    createdAtIso: NOW_ISO,
    dayKey: '2026-07-10',
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no',
    heightCm: null,
    ...overrides
  };
}

function createDiaryEntry(overrides = {}) {
  return {
    id: 'entry-now',
    plantId: 'plant-1',
    entryDate: '2026-07-10',
    updatedAt: NOW_ISO,
    title: 'Diary note',
    tags: ['observation'],
    heightCm: null,
    ...overrides
  };
}

(function testNotEnoughDataWithLessThanTwoChecks() {
  const evaluation = trendEngine.evaluatePlantCareTrend(createPlant('plant-1'), {
    latestDailyCheck: createCheck(),
    recentDailyChecks: [createCheck()],
    now: NOW
  });
  assert.strictEqual(evaluation.trend, 'not_enough_data', 'single checks should not produce a trend yet');
})();

(function testStableWithTwoCalmChecks() {
  const evaluation = trendEngine.evaluatePlantCareTrend(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ id: 'check-2' }),
    previousDailyCheck: createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' }),
    recentDailyChecks: [
      createCheck({ id: 'check-2' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
    ],
    diaryEntries: [],
    now: NOW
  });
  assert.strictEqual(evaluation.trend, 'stable', 'two calm checks should stay stable');
})();

(function testImprovingAfterAttention() {
  const evaluation = trendEngine.evaluatePlantCareTrend(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ id: 'check-2' }),
    previousDailyCheck: createCheck({
      id: 'check-1',
      createdAtIso: ONE_DAY_AGO_ISO,
      dayKey: '2026-07-09',
      leafState: 'spots'
    }),
    recentDailyChecks: [
      createCheck({ id: 'check-2' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', leafState: 'spots' })
    ],
    latestRisk: { status: 'green' },
    previousRisk: { status: 'yellow' },
    now: NOW
  });
  assert.strictEqual(evaluation.trend, 'improving', 'calmer current check should register as improving');
})();

(function testWatchChangeForNewLeafIssue() {
  const evaluation = trendEngine.evaluatePlantCareTrend(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ id: 'check-2', leafState: 'yellowing' }),
    previousDailyCheck: createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' }),
    recentDailyChecks: [
      createCheck({ id: 'check-2', leafState: 'yellowing' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
    ],
    latestRisk: { status: 'yellow' },
    previousRisk: { status: 'green' },
    now: NOW
  });
  assert.strictEqual(evaluation.trend, 'watch_change', 'new leaf issues should be detected as a new change');
})();

(function testRepeatAttentionForConsecutiveChecks() {
  const evaluation = trendEngine.evaluatePlantCareTrend(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ id: 'check-2', leafState: 'spots' }),
    previousDailyCheck: createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', growthState: 'slow' }),
    recentDailyChecks: [
      createCheck({ id: 'check-2', leafState: 'spots' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', growthState: 'slow' })
    ],
    latestRisk: { status: 'yellow' },
    previousRisk: { status: 'yellow' },
    now: NOW
  });
  assert.strictEqual(evaluation.trend, 'repeat_attention', 'two attention checks in a row should repeat attention');
})();

(function testRepeatAttentionWithinFortyEightHours() {
  const evaluation = trendEngine.evaluatePlantCareTrend(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ id: 'check-3', leafState: 'spots' }),
    previousDailyCheck: createCheck({ id: 'check-2', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' }),
    recentDailyChecks: [
      createCheck({ id: 'check-3', leafState: 'spots' }),
      createCheck({ id: 'check-2', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' }),
      createCheck({ id: 'check-1', createdAtIso: TWO_DAYS_AGO_ISO, dayKey: '2026-07-08', growthState: 'slow' })
    ],
    latestRisk: { status: 'yellow' },
    previousRisk: { status: 'green' },
    now: NOW
  });
  assert.strictEqual(evaluation.trend, 'repeat_attention', 'multiple attention checks inside 48 hours should repeat attention');
})();

(function testHeightDeltaIsCalculated() {
  const evaluation = trendEngine.evaluatePlantCareTrend(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ id: 'check-2', heightCm: 18 }),
    previousDailyCheck: createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', heightCm: 14 }),
    recentDailyChecks: [
      createCheck({ id: 'check-2', heightCm: 18 }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', heightCm: 14 })
    ],
    now: NOW
  });
  assert.strictEqual(evaluation.heightComparison.deltaCm, 4, 'height delta should be calculated from the last height value');
})();

(function testFirstHeightStateIsExposed() {
  const evaluation = trendEngine.evaluatePlantCareTrend(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ id: 'check-1', heightCm: 12 }),
    recentDailyChecks: [createCheck({ id: 'check-1', heightCm: 12 })],
    diaryEntries: [],
    now: NOW
  });
  assert.ok(evaluation.heightComparison, 'a first height reading should still be exposed');
  assert.strictEqual(evaluation.heightComparison.isFirstHeight, true, 'single height readings should be treated as the first height value');
})();

(function testGetPreviousDailyCheckDoesNotMutateState() {
  const context = {
    dailyChecks: [
      createCheck({ id: 'check-2' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
    ]
  };
  const snapshot = JSON.stringify(context);
  const previousCheck = trendEngine.getPreviousDailyCheckForPlant(context, 'plant-1', 'check-2');
  assert.strictEqual(previousCheck.id, 'check-1', 'previous check should skip the current check');
  assert.strictEqual(JSON.stringify(context), snapshot, 'previous check lookup should not mutate the input context');
})();

(function testEvaluateAllReturnsEvaluationsPerPlant() {
  const plants = [createPlant('plant-1'), createPlant('plant-2')];
  const evaluations = trendEngine.evaluateAllPlantCareTrends(plants, {
    recentDailyChecksByPlantId: {
      'plant-1': [
        createCheck({ id: 'p1-2', plantId: 'plant-1' }),
        createCheck({ id: 'p1-1', plantId: 'plant-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
      ],
      'plant-2': [
        createCheck({ id: 'p2-2', plantId: 'plant-2', leafState: 'spots' }),
        createCheck({ id: 'p2-1', plantId: 'plant-2', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', growthState: 'slow' })
      ]
    },
    latestRiskByPlantId: {
      'plant-1': { status: 'green' },
      'plant-2': { status: 'yellow' }
    },
    previousRiskByPlantId: {
      'plant-1': { status: 'green' },
      'plant-2': { status: 'yellow' }
    },
    now: NOW
  });

  assert.deepStrictEqual(
    evaluations.map((entry) => ({ plantId: entry.plantId, trend: entry.trend })),
    [
      { plantId: 'plant-1', trend: 'stable' },
      { plantId: 'plant-2', trend: 'repeat_attention' }
    ],
    'evaluateAllPlantCareTrends should produce one evaluation per plant'
  );
})();

(function testMiniHistoryWithoutChecksUsesLowDataSummary() {
  const history = trendEngine.buildPlantMiniHistory(createPlant('plant-1'), {
    diaryEntries: [],
    now: NOW,
    locale: 'en'
  });
  assert.deepStrictEqual(history.checkItems, [], 'mini history without checks should expose an empty check list');
  assert.strictEqual(history.buddySummaryKey, 'buddyCare.history.summary.low_data', 'missing checks should use the low-data summary');
})();

(function testMiniHistoryWithOneCheckKeepsOneEntry() {
  const history = trendEngine.buildPlantMiniHistory(createPlant('plant-1'), {
    recentDailyChecks: [createCheck({ id: 'check-1' })],
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(history.checkItems.length, 1, 'mini history should keep a single check entry');
  assert.strictEqual(history.buddySummaryKey, 'buddyCare.history.summary.low_data', 'one check should still be treated as low data');
})();

(function testMiniHistoryKeepsAtMostThreeChecksNewestFirst() {
  const history = trendEngine.buildPlantMiniHistory(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-1', createdAtIso: TWO_DAYS_AGO_ISO, dayKey: '2026-07-08' }),
      createCheck({ id: 'check-4', createdAtIso: NOW_ISO, dayKey: '2026-07-10' }),
      createCheck({ id: 'check-2', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' }),
      createCheck({ id: 'check-3', createdAtIso: new Date(NOW - (12 * 60 * 60 * 1000)).toISOString(), dayKey: '2026-07-10', growthState: 'slow' })
    ],
    diaryEntries: [],
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(history.checkItems.length, 3, 'mini history should cap check items at three');
  assert.deepStrictEqual(
    history.checkItems.map((item) => item.id),
    ['check-4', 'check-3', 'check-2'],
    'mini history should keep the newest checks first'
  );
})();

(function testDiaryHistoryShowsMaxThreeEntriesPerPlant() {
  const entries = [
    createDiaryEntry({ id: 'entry-4', updatedAt: NOW_ISO, title: 'Latest note' }),
    createDiaryEntry({ id: 'entry-3', updatedAt: new Date(NOW - (6 * 60 * 60 * 1000)).toISOString(), title: 'Later note' }),
    createDiaryEntry({ id: 'entry-2', updatedAt: ONE_DAY_AGO_ISO, entryDate: '2026-07-09', title: 'Yesterday note' }),
    createDiaryEntry({ id: 'entry-1', updatedAt: TWO_DAYS_AGO_ISO, entryDate: '2026-07-08', title: 'Old note' }),
    createDiaryEntry({ id: 'entry-other', plantId: 'plant-2', updatedAt: NOW_ISO, title: 'Other plant note' })
  ];
  const history = trendEngine.buildPlantMiniHistory(createPlant('plant-1'), {
    recentDailyChecks: [createCheck({ id: 'check-2' }), createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })],
    diaryEntries: entries,
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(history.diaryItems.length, 3, 'diary history should be capped at three entries');
  assert.deepStrictEqual(
    history.diaryItems.map((item) => item.id),
    ['entry-4', 'entry-3', 'entry-2'],
    'diary history should be plant-specific and newest first'
  );
})();

(function testMiniHistoryHeightDeltaIsCarriedOver() {
  const history = trendEngine.buildPlantMiniHistory(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-2', heightCm: 20 }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', heightCm: 16 })
    ],
    diaryEntries: [],
    now: NOW,
    locale: 'en'
  });
  assert.ok(history.heightDelta, 'mini history should expose the shared height delta');
  assert.strictEqual(history.heightDelta.deltaCm, 4, 'mini history should keep the height delta');
})();

(function testMiniHistorySummaryStable() {
  const history = trendEngine.buildPlantMiniHistory(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-2' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
    ],
    diaryEntries: [],
    trendEvaluation: { trend: 'stable' },
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(history.buddySummaryKey, 'buddyCare.history.summary.stable', 'stable trends should use the calm history summary');
})();

(function testMiniHistorySummaryWatchChange() {
  const history = trendEngine.buildPlantMiniHistory(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-2', leafState: 'yellowing' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
    ],
    diaryEntries: [],
    trendEvaluation: { trend: 'watch_change' },
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(history.buddySummaryKey, 'buddyCare.history.summary.watch_change', 'new changes should use the watch-change summary');
})();

(function testMiniHistorySummaryRepeatAttention() {
  const history = trendEngine.buildPlantMiniHistory(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-2', leafState: 'spots' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', growthState: 'slow' })
    ],
    diaryEntries: [],
    trendEvaluation: { trend: 'repeat_attention' },
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(history.buddySummaryKey, 'buddyCare.history.summary.repeat_attention', 'repeated attention should use the repeated-attention summary');
})();

(function testWeeklyReviewUsesNotEnoughDataBelowTwoChecks() {
  const review = trendEngine.buildPlantWeeklyReview(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-1' })
    ],
    diaryEntries: [],
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(review.status, 'not_enough_data', 'fewer than two weekly checks should keep the review in low-data mode');
})();

(function testWeeklyReviewDetectsCalmWeek() {
  const review = trendEngine.buildPlantWeeklyReview(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-3', createdAtIso: NOW_ISO, dayKey: '2026-07-10', heightCm: 18 }),
      createCheck({ id: 'check-2', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', heightCm: 17.4 }),
      createCheck({ id: 'check-1', createdAtIso: TWO_DAYS_AGO_ISO, dayKey: '2026-07-08', heightCm: 16.8 })
    ],
    diaryEntries: [
      createDiaryEntry({ id: 'entry-1', title: 'Measured height', tags: ['height'] })
    ],
    trendEvaluation: { trend: 'stable' },
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(review.status, 'calm_week', 'mostly green weekly checks should resolve to a calm week');
  assert.ok(review.highlights.includes('Pattern looks calm'), 'calm weeks should mention a calm pattern highlight');
})();

(function testWeeklyReviewDetectsMixedWeekWithoutRed() {
  const review = trendEngine.buildPlantWeeklyReview(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-2', createdAtIso: NOW_ISO, dayKey: '2026-07-10', leafState: 'yellowing' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
    ],
    diaryEntries: [],
    trendEvaluation: { trend: 'watch_change' },
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(review.status, 'mixed_week', 'a single yellow signal without red should stay mixed');
})();

(function testWeeklyReviewDetectsAttentionWeekWithRedStatus() {
  const review = trendEngine.buildPlantWeeklyReview(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-3', createdAtIso: NOW_ISO, dayKey: '2026-07-10', pestsVisible: 'yes' }),
      createCheck({ id: 'check-2', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' }),
      createCheck({ id: 'check-1', createdAtIso: TWO_DAYS_AGO_ISO, dayKey: '2026-07-08' })
    ],
    diaryEntries: [],
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(review.status, 'attention_week', 'a weekly review should escalate when one check evaluates to red');
  assert.ok(review.redCount >= 1, 'red weekly checks should be counted');
})();

(function testWeeklyReviewDetectsAttentionWeekWithMultipleYellowStatuses() {
  const review = trendEngine.buildPlantWeeklyReview(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-3', createdAtIso: NOW_ISO, dayKey: '2026-07-10', leafState: 'spots' }),
      createCheck({ id: 'check-2', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', growthState: 'slow' }),
      createCheck({ id: 'check-1', createdAtIso: TWO_DAYS_AGO_ISO, dayKey: '2026-07-08' })
    ],
    diaryEntries: [],
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(review.status, 'attention_week', 'multiple yellow signals in the weekly window should escalate the review');
})();

(function testWeeklyReviewCountsDiaryEntriesInsideWeeklyWindowOnly() {
  const review = trendEngine.buildPlantWeeklyReview(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-2', createdAtIso: NOW_ISO, dayKey: '2026-07-10' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
    ],
    diaryEntries: [
      createDiaryEntry({ id: 'entry-2', title: 'Latest note', updatedAt: NOW_ISO }),
      createDiaryEntry({ id: 'entry-1', title: 'Old note', updatedAt: EIGHT_DAYS_AGO_ISO, entryDate: '2026-07-02' })
    ],
    now: NOW,
    locale: 'en'
  });
  assert.strictEqual(review.diaryEntryCount, 1, 'only weekly manual diary entries should be counted');
})();

(function testWeeklyReviewIgnoresChecksOutsideWeeklyWindow() {
  const checks = trendEngine.getWeeklyChecksForPlant({
    dailyChecks: [
      createCheck({ id: 'check-2', createdAtIso: NOW_ISO, dayKey: '2026-07-10' }),
      createCheck({ id: 'check-1', createdAtIso: EIGHT_DAYS_AGO_ISO, dayKey: '2026-07-02' })
    ]
  }, 'plant-1', NOW);
  assert.deepStrictEqual(
    checks.map((check) => check.id),
    ['check-2'],
    'weekly check collection should exclude checks older than the last seven days'
  );
})();

(function testWeeklyReviewHighlightsAreLimitedToFourItems() {
  const review = trendEngine.buildPlantWeeklyReview(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-4', createdAtIso: NOW_ISO, dayKey: '2026-07-10', pestsVisible: 'yes', heightCm: 20 }),
      createCheck({ id: 'check-3', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', leafState: 'spots', heightCm: 19 }),
      createCheck({ id: 'check-2', createdAtIso: TWO_DAYS_AGO_ISO, dayKey: '2026-07-08', growthState: 'slow', heightCm: 18 }),
      createCheck({ id: 'check-1', createdAtIso: THREE_DAYS_AGO_ISO, dayKey: '2026-07-07', heightCm: 17 })
    ],
    diaryEntries: [
      createDiaryEntry({ id: 'entry-2', title: 'Changed leaves', updatedAt: NOW_ISO }),
      createDiaryEntry({ id: 'entry-1', title: 'Another note', updatedAt: ONE_DAY_AGO_ISO, entryDate: '2026-07-09' })
    ],
    now: NOW,
    locale: 'en'
  });
  assert.ok(review.highlights.length <= 4, 'weekly highlights should stay capped at four items');
})();

(function testWeeklyReviewFocusItemsAreLimitedToThree() {
  const review = trendEngine.buildPlantWeeklyReview(createPlant('plant-1'), {
    recentDailyChecks: [
      createCheck({ id: 'check-2', createdAtIso: NOW_ISO, dayKey: '2026-07-10', leafState: 'spots' }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', growthState: 'slow' })
    ],
    diaryEntries: [],
    now: NOW,
    locale: 'en'
  });
  assert.ok(review.nextFocus.length <= 3, 'weekly focus items should stay capped at three entries');
})();

(function testBuildAllPlantWeeklyReviewsReturnsOneReviewPerPlant() {
  const reviews = trendEngine.buildAllPlantWeeklyReviews(
    [createPlant('plant-1'), createPlant('plant-2')],
    {
      dailyChecksByPlantId: {
        'plant-1': [
          createCheck({ id: 'p1-2', plantId: 'plant-1', createdAtIso: NOW_ISO, dayKey: '2026-07-10' }),
          createCheck({ id: 'p1-1', plantId: 'plant-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09' })
        ],
        'plant-2': [
          createCheck({ id: 'p2-2', plantId: 'plant-2', createdAtIso: NOW_ISO, dayKey: '2026-07-10', leafState: 'spots' }),
          createCheck({ id: 'p2-1', plantId: 'plant-2', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', growthState: 'slow' })
        ]
      },
      diaryEntriesByPlantId: {
        'plant-1': [createDiaryEntry({ id: 'entry-p1', plantId: 'plant-1', title: 'P1 note' })],
        'plant-2': [createDiaryEntry({ id: 'entry-p2', plantId: 'plant-2', title: 'P2 note' })]
      },
      now: NOW,
      locale: 'en'
    }
  );
  assert.deepStrictEqual(
    reviews.map((review) => review.plantId),
    ['plant-1', 'plant-2'],
    'buildAllPlantWeeklyReviews should keep one review result per plant'
  );
})();

(function testMiniHistoryFunctionsDoNotMutateInputState() {
  const plant = createPlant('plant-1');
  const context = {
    recentDailyChecks: [
      createCheck({ id: 'check-2', heightCm: 19 }),
      createCheck({ id: 'check-1', createdAtIso: ONE_DAY_AGO_ISO, dayKey: '2026-07-09', heightCm: 15 })
    ],
    diaryEntries: [
      createDiaryEntry({ id: 'entry-2', heightCm: 19 }),
      createDiaryEntry({ id: 'entry-1', updatedAt: ONE_DAY_AGO_ISO, entryDate: '2026-07-09', heightCm: 15 })
    ],
    now: NOW,
    locale: 'en'
  };
  const plantSnapshot = JSON.stringify(plant);
  const contextSnapshot = JSON.stringify(context);

  trendEngine.buildPlantMiniHistory(plant, context);
  trendEngine.buildAllPlantMiniHistories([plant], {
    recentDailyChecksByPlantId: { 'plant-1': context.recentDailyChecks },
    diaryEntriesByPlantId: { 'plant-1': context.diaryEntries },
    now: NOW,
    locale: 'en'
  });
  trendEngine.buildPlantWeeklyReview(plant, context);
  trendEngine.buildAllPlantWeeklyReviews([plant], {
    dailyChecksByPlantId: { 'plant-1': context.recentDailyChecks },
    diaryEntriesByPlantId: { 'plant-1': context.diaryEntries },
    now: NOW,
    locale: 'en'
  });

  assert.strictEqual(JSON.stringify(plant), plantSnapshot, 'mini history should not mutate the plant input');
  assert.strictEqual(JSON.stringify(context), contextSnapshot, 'buddy care trend and weekly review helpers should not mutate the context input');
})();

console.log('buddy-care-trend-engine.test.js passed');
