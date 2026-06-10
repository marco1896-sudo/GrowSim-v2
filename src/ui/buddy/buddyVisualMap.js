'use strict';

(function attachGrowSimBuddyVisualMap(globalScope) {
  const FALLBACK_ASSET_ID = 'buddy_emotion_neutral_standing_v001';

  const CARE_HINT_ASSET_IDS = Object.freeze({
    'careStudio.buddy.waterGoodTiming': [
      'buddy_gameplay_watering_can_ready_v001',
      'buddy_gameplay_thumbs_up_approval_v001'
    ],
    'careStudio.buddy.waterTooSoon': [
      'buddy_emotion_surprised_hands_out_v001',
      'buddy_emotion_worried_hand_to_chin_v001',
      'buddy_gameplay_thumbs_down_disapproval_v001'
    ],
    'careStudio.buddy.monitorRoots': [
      'buddy_gameplay_magnifier_leaf_inspection_v001',
      'buddy_emotion_confused_head_scratch_v001',
      'buddy_gameplay_clipboard_concerned_checkin_v001'
    ],
    'careStudio.buddy.feedReady': [
      'buddy_gameplay_nutrients_bottle_v001',
      'buddy_gameplay_thumbs_up_approval_v001'
    ],
    'careStudio.buddy.feedTooRisky': [
      'buddy_emotion_worried_hand_to_chin_v001',
      'buddy_gameplay_thumbs_down_disapproval_v001',
      'buddy_emotion_surprised_hands_out_v001'
    ],
    'careStudio.buddy.feedLight': [
      'buddy_gameplay_nutrients_bottle_v001',
      'buddy_gameplay_clipboard_presenting_blank_v001'
    ],
    'careStudio.buddy.routineStable': [
      'buddy_emotion_proud_confident_stance_v001',
      'buddy_emotion_happy_big_smile_v001'
    ],
    'careStudio.buddy.stabilizeFirst': [
      'buddy_emotion_worried_hand_to_chin_v001',
      'buddy_gameplay_clipboard_concerned_checkin_v001',
      'buddy_emotion_concerned_downcast_v001'
    ],
    'careStudio.buddy.routineCareful': [
      'buddy_gameplay_clipboard_presenting_blank_v001',
      'buddy_emotion_confused_head_scratch_v001',
      'buddy_emotion_worried_hand_to_chin_v001'
    ]
  });

  const DAILY_CATEGORY_ASSET_IDS = Object.freeze({
    risk_focus: [
      'buddy_emotion_surprised_hands_out_v001',
      'buddy_emotion_worried_hand_to_chin_v001'
    ],
    stress_focus: [
      'buddy_emotion_worried_hand_to_chin_v001',
      'buddy_emotion_confused_head_scratch_v001'
    ],
    water_focus: [
      'buddy_gameplay_watering_can_ready_v001',
      'buddy_gameplay_watering_can_motivated_v001'
    ],
    nutrient_focus: [
      'buddy_gameplay_nutrients_bottle_v001',
      'buddy_gameplay_clipboard_presenting_blank_v001'
    ],
    bloom_focus: [
      'buddy_emotion_proud_hands_on_hips_v001',
      'buddy_emotion_happy_big_smile_v001'
    ],
    seedling_veg_focus: [
      'buddy_emotion_happy_open_arms_v001',
      'buddy_gameplay_clipboard_wave_v001'
    ],
    timeboost_safe: [
      'buddy_emotion_happy_cheering_fists_v001',
      'buddy_emotion_happy_raised_hands_v001'
    ],
    timeboost_unsafe: [
      'buddy_emotion_surprised_hands_out_v001',
      'buddy_emotion_worried_hand_to_chin_v001'
    ],
    daily_task_hint: [
      'buddy_gameplay_clipboard_presenting_blank_v001',
      'buddy_gameplay_clipboard_wave_v001'
    ],
    stable_day: [
      'buddy_emotion_proud_confident_stance_v001',
      'buddy_emotion_happy_big_smile_v001'
    ],
    routine_focus: [
      'buddy_emotion_proud_hands_on_hips_v001',
      'buddy_gameplay_clipboard_presenting_blank_v001'
    ],
    mission_focus: [
      'buddy_gameplay_clipboard_wave_v001',
      'buddy_gameplay_pointing_up_instruction_v001'
    ],
    mission_open: [
      'buddy_gameplay_clipboard_wave_v001',
      'buddy_emotion_happy_open_arms_v001'
    ],
    mission_progress: [
      'buddy_gameplay_pointing_up_instruction_v001',
      'buddy_gameplay_clipboard_presenting_blank_v001'
    ],
    mission_claimable: [
      'buddy_emotion_happy_cheering_fists_v001',
      'buddy_reward_coins_celebrating_v001'
    ],
    mission_completed: [
      'buddy_emotion_proud_confident_stance_v001',
      'buddy_emotion_happy_big_smile_v001'
    ],
    reward_focus: [
      'buddy_emotion_happy_cheering_fists_v001',
      'buddy_emotion_proud_confident_stance_v001',
      'buddy_reward_coins_celebrating_v001'
    ],
    reward_claimable: [
      'buddy_reward_coins_celebrating_v001',
      'buddy_emotion_happy_raised_hands_v001'
    ],
    reward_claimed: [
      'buddy_emotion_proud_confident_stance_v001',
      'buddy_emotion_happy_big_smile_v001'
    ],
    reward_coins: [
      'buddy_reward_coins_celebrating_v001',
      'buddy_emotion_happy_cheering_fists_v001'
    ],
    coin_action_tip: [
      'buddy_gameplay_clipboard_presenting_blank_v001',
      'buddy_gameplay_pointing_up_instruction_v001',
      'buddy_gameplay_thumbs_up_approval_v001'
    ],
    coin_action_warning: [
      'buddy_emotion_worried_hand_to_chin_v001',
      'buddy_emotion_surprised_hands_out_v001'
    ],
    coin_action_timeboost: [
      'buddy_emotion_happy_cheering_fists_v001',
      'buddy_gameplay_thumbs_up_approval_v001'
    ],
    coin_action_reward: [
      'buddy_reward_coins_celebrating_v001',
      'buddy_emotion_proud_confident_stance_v001'
    ],
    coin_action_default: [
      FALLBACK_ASSET_ID,
      'buddy_emotion_happy_big_smile_v001'
    ],
    coin_tip: [
      'buddy_gameplay_clipboard_presenting_blank_v001',
      'buddy_emotion_confused_head_scratch_v001'
    ],
    default: [
      FALLBACK_ASSET_ID,
      'buddy_emotion_happy_big_smile_v001'
    ],
    fallback: [
      FALLBACK_ASSET_ID,
      'buddy_emotion_happy_open_arms_v001'
    ]
  });

  const COIN_TIP_CATEGORY_ASSET_IDS = Object.freeze({
    risk: DAILY_CATEGORY_ASSET_IDS.risk_focus,
    stress: DAILY_CATEGORY_ASSET_IDS.stress_focus,
    water: DAILY_CATEGORY_ASSET_IDS.water_focus,
    nutrition: DAILY_CATEGORY_ASSET_IDS.nutrient_focus,
    weekly: [
      'buddy_gameplay_clipboard_wave_v001',
      'buddy_emotion_happy_big_smile_v001'
    ],
    focus: [
      'buddy_gameplay_clipboard_presenting_blank_v001',
      'buddy_emotion_proud_hands_on_hips_v001'
    ],
    coin_tip: DAILY_CATEGORY_ASSET_IDS.coin_tip,
    fallback: DAILY_CATEGORY_ASSET_IDS.fallback
  });

  function toArray(value) {
    return Array.isArray(value) ? value : (value ? [value] : []);
  }

  function pushUnique(target, items) {
    toArray(items).forEach((item) => {
      const safeItem = String(item || '').trim();
      if (safeItem && !target.includes(safeItem)) {
        target.push(safeItem);
      }
    });
    return target;
  }

  function addRiskFallbacks(candidateIds, riskLevel, overallLevel) {
    const safeRiskLevel = String(riskLevel || '').trim().toLowerCase();
    const safeOverallLevel = String(overallLevel || '').trim().toLowerCase();

    if (safeRiskLevel === 'high' || safeOverallLevel === 'warning' || safeOverallLevel === 'bad') {
      pushUnique(candidateIds, [
        'buddy_emotion_surprised_hands_out_v001',
        'buddy_emotion_worried_hand_to_chin_v001'
      ]);
      return;
    }

    if (safeRiskLevel === 'medium' || safeRiskLevel === 'elevated' || safeOverallLevel === 'caution') {
      pushUnique(candidateIds, [
        'buddy_emotion_confused_head_scratch_v001',
        'buddy_gameplay_clipboard_concerned_checkin_v001'
      ]);
      return;
    }

    if (safeRiskLevel === 'low' && (safeOverallLevel === 'positive' || safeOverallLevel === 'good' || safeOverallLevel === 'ready')) {
      pushUnique(candidateIds, [
        'buddy_emotion_proud_confident_stance_v001',
        'buddy_emotion_happy_big_smile_v001'
      ]);
      return;
    }

    pushUnique(candidateIds, DAILY_CATEGORY_ASSET_IDS.fallback);
  }

  function resolveBuddyMotionClass(context = {}) {
    const safeContext = context && typeof context === 'object' ? context : {};
    const riskLevel = String(safeContext.riskLevel || '').trim().toLowerCase();
    const overallLevel = String(safeContext.overallLevel || '').trim().toLowerCase();
    const dailyCategory = String(safeContext.dailyCategory || '').trim().toLowerCase();
    const stateKey = String(safeContext.stateKey || '').trim().toLowerCase();
    const tipCategory = String(safeContext.tipCategory || '').trim().toLowerCase();
    const mode = String(safeContext.mode || '').trim().toLowerCase();
    const surface = String(safeContext.surface || '').trim().toLowerCase();

    if (
      riskLevel === 'high'
      || overallLevel === 'warning'
      || overallLevel === 'bad'
      || overallLevel === 'caution'
      || dailyCategory === 'coin_action_warning'
      || dailyCategory === 'risk_focus'
      || dailyCategory === 'stress_focus'
      || dailyCategory === 'timeboost_unsafe'
      || tipCategory === 'risk'
      || tipCategory === 'stress'
    ) {
      return 'buddy-motion-warning-pulse';
    }

    if (
      stateKey === 'claimable'
      || dailyCategory === 'reward_focus'
      || dailyCategory === 'reward_claimable'
      || dailyCategory === 'reward_coins'
      || dailyCategory === 'coin_action_reward'
      || mode === 'starter'
    ) {
      return 'buddy-motion-reward-pop';
    }

    if (
      dailyCategory === 'stable_day'
      || dailyCategory === 'bloom_focus'
      || dailyCategory === 'mission_completed'
      || dailyCategory === 'reward_claimed'
      || dailyCategory === 'coin_action_timeboost'
      || overallLevel === 'positive'
      || overallLevel === 'good'
      || overallLevel === 'ready'
    ) {
      return 'buddy-motion-happy-bounce';
    }

    if (
      dailyCategory === 'coin_action_tip'
      || dailyCategory === 'mission_progress'
      || dailyCategory === 'mission_open'
      || dailyCategory === 'coin_action_default'
      || dailyCategory === 'default'
      || surface === 'care_studio'
      || surface === 'home_retention'
      || surface === 'home_starter'
      || surface === 'missions_header'
      || surface === 'missions_weekly'
      || surface === 'missions_coin_action'
    ) {
      return 'buddy-motion-idle-breathing';
    }

    return '';
  }

  function resolveBuddyVisualCandidates(context = {}) {
    const safeContext = context && typeof context === 'object' ? context : {};
    const candidateIds = [];

    if (safeContext.assetId) {
      pushUnique(candidateIds, safeContext.assetId);
    }

    if (safeContext.buddyHintKey && CARE_HINT_ASSET_IDS[safeContext.buddyHintKey]) {
      pushUnique(candidateIds, CARE_HINT_ASSET_IDS[safeContext.buddyHintKey]);
    }

    if (safeContext.dailyCategory && DAILY_CATEGORY_ASSET_IDS[safeContext.dailyCategory]) {
      pushUnique(candidateIds, DAILY_CATEGORY_ASSET_IDS[safeContext.dailyCategory]);
    }

    if (safeContext.tipCategory && COIN_TIP_CATEGORY_ASSET_IDS[safeContext.tipCategory]) {
      pushUnique(candidateIds, COIN_TIP_CATEGORY_ASSET_IDS[safeContext.tipCategory]);
    }

    addRiskFallbacks(candidateIds, safeContext.riskLevel, safeContext.overallLevel);
    pushUnique(candidateIds, DAILY_CATEGORY_ASSET_IDS.fallback);

    return Object.freeze({
      fallbackAssetId: FALLBACK_ASSET_ID,
      candidateIds: Object.freeze(candidateIds.slice())
    });
  }

  const api = Object.freeze({
    FALLBACK_ASSET_ID,
    CARE_HINT_ASSET_IDS,
    DAILY_CATEGORY_ASSET_IDS,
    COIN_TIP_CATEGORY_ASSET_IDS,
    resolveBuddyMotionClass,
    resolveBuddyVisualCandidates
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.GrowSimBuddyVisualMap = api;
})((typeof window !== 'undefined') ? window : globalThis);
