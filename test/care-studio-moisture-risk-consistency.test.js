'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { installAuthHarness, waitForBoot } = require('./support/browserRuntime');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function main() {
  const { server, port } = await startStaticServer(ROOT, HOST);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    await installAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'care-consistency-user',
      email: 'care-consistency@test.local',
      displayName: 'Care Consistency Test'
    });
    await page.goto(`http://${HOST}:${port}/`, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 30000);
    await page.evaluate(() => window.onStartRun());
    await page.waitForFunction(() => window.__gsState && window.__gsState.run && window.__gsState.run.status === 'active');

    async function collectCase(input) {
      return page.evaluate(async (nextInput) => {
        const clamp = (value) => Math.max(0, Math.min(100, Number(value || 0)));
        const parsePercent = (value) => Number(String(value || '').replace('%', '').trim());
        const parseRingValue = (id) => parsePercent(document.getElementById(id)?.textContent || '');
        const waitForHomeRings = () => new Promise((resolve) => {
          let attempts = 0;
          const tick = () => {
            const waterRing = document.getElementById('waterRing');
            const riskRing = document.getElementById('riskRing');
            const waterDone = !waterRing || waterRing.dataset.animating === 'false';
            const riskDone = !riskRing || riskRing.dataset.animating === 'false';
            if ((waterDone && riskDone) || attempts >= 20) {
              resolve();
              return;
            }
            attempts += 1;
            requestAnimationFrame(tick);
          };
          tick();
        });
        const readStatusChips = () => {
          const chips = Array.from(document.querySelectorAll('#careStudioStatusChips .care-studio-chip'));
          const map = {};
          for (const chip of chips) {
            const label = String(chip.querySelector('.care-studio-chip__label')?.textContent || '').trim();
            map[label] = {
              value: String(chip.querySelector('.care-studio-chip__value')?.textContent || '').trim(),
              detail: String(chip.querySelector('.care-studio-chip__detail')?.textContent || '').trim()
            };
          }
          return map;
        };
        const state = window.__gsState;
        state.status.water = clamp(nextInput.statusWater);
        state.status.risk = clamp(nextInput.statusRisk);
        state.status.stress = clamp(nextInput.statusStress || 10);
        state.status.nutrition = clamp(nextInput.statusNutrition || 58);
        state.care = state.care || {};
        state.care.water = {
          ...(state.care.water || {}),
          substrateMoisture: clamp(nextInput.substrate),
          surfaceMoisture: clamp(nextInput.surface),
          rootZoneMoisture: clamp(nextInput.rootZone),
          drybackRatePerHour: Number(nextInput.drybackRatePerHour || 1.2),
          overwateringPressure: clamp(nextInput.overwateringPressure),
          dryStressPressure: clamp(nextInput.dryStressPressure)
        };
        state.care.nutrients = {
          ...(state.care.nutrients || {}),
          saltLoad: clamp(nextInput.saltLoad || 20)
        };
        state.ui.openSheet = 'care';
        state.ui.care = state.ui.care || {};
        state.ui.care.selectedStudioTab = 'water';
        state.ui.care.selectedCategory = 'watering';
        state.ui.care.selectedActionId = null;
        window.renderHud();
        window.renderCareSheet(true);
        await waitForHomeRings();

        const careApi = window.GrowSimCareModel;
        const summary = careApi.deriveCareSummary(state.care, state);
        const chips = readStatusChips();
        const effectsText = String(document.getElementById('careEffectsList')?.textContent || '');
        const timingText = String(document.getElementById('careStudioTimingBadge')?.textContent || '').trim();
        const subtitle = String(document.getElementById('careSheetSubtitle')?.textContent || '').trim();
        const recommendationText = String(document.querySelector('.care-studio-meta-row--stacked strong')?.textContent || '').trim();
        const miniStats = Array.from(document.querySelectorAll('.care-studio-mini-stat')).map((node) => ({
          label: String(node.querySelector('small')?.textContent || '').trim(),
          value: String(node.querySelector('strong')?.textContent || '').trim()
        }));
        const rootRisk = miniStats.find((entry) => /Wurzel|Root|Over|Über|Ueber/i.test(entry.label)) || null;
        const homeRings = {
          water: parseRingValue('waterValue'),
          nutrition: parseRingValue('nutritionValue'),
          stress: parseRingValue('stressValue'),
          risk: parseRingValue('riskValue')
        };
        return {
          summary,
          chips,
          effectsText,
          timingText,
          subtitle,
          recommendationText,
          rootRiskValue: rootRisk ? parsePercent(rootRisk.value) : null,
          moistureValue: parsePercent(chips.Feuchte && chips.Feuchte.value),
          riskValue: parsePercent(chips.Risiko && chips.Risiko.value),
          riskDetail: chips.Risiko && chips.Risiko.detail,
          homeRings
        };
      }, input);
    }

    const wetWet = await collectCase({
      statusWater: 8,
      statusRisk: 3,
      substrate: 78,
      surface: 77,
      rootZone: 84,
      overwateringPressure: 0,
      dryStressPressure: 0,
      drybackRatePerHour: 0.5
    });
    assert.ok(Math.abs(Number(wetWet.summary.displayMoisture) - 81) <= 1, `expected derived display moisture around 81, got ${wetWet.summary.displayMoisture}`);
    assert.ok(Math.abs(Number(wetWet.summary.riskScore) - 46) <= 1, `expected derived risk score around 46, got ${wetWet.summary.riskScore}`);
    assert.strictEqual(wetWet.homeRings.water, Math.round(wetWet.summary.displayMoisture), 'homescreen water ring should use the same derived display moisture as Care Studio');
    assert.strictEqual(wetWet.homeRings.nutrition, 58, 'homescreen nutrition ring should stay aligned with the visible supply status');
    assert.strictEqual(wetWet.homeRings.stress, 10, 'homescreen stress ring should stay aligned with the visible stress status');
    assert.strictEqual(wetWet.homeRings.risk, Math.round(wetWet.summary.riskScore), 'homescreen risk ring should use the same derived risk score as Care Studio');
    assert.strictEqual(wetWet.homeRings.water, wetWet.moistureValue, 'homescreen water ring and care studio moisture chip should match');
    assert.strictEqual(wetWet.homeRings.risk, wetWet.riskValue, 'homescreen risk ring and care studio risk chip should match');
    assert(wetWet.moistureValue >= 76, 'wet/wet header moisture should follow the care moisture profile, not stale global water');
    assert(wetWet.riskValue >= 42, 'wet root zone should raise the care risk chip above low');
    assert(wetWet.rootRiskValue >= 42, 'wet root zone should raise root-zone risk');
    assert.notStrictEqual(wetWet.riskDetail, 'Niedrig', 'wet root zone should not show low risk detail');
    assert(/Wurzelzone|Root|root/i.test(wetWet.effectsText), 'wet root zone should render a root-zone warning');
    assert(
      /warte|warten|wait|dryback|trocken|abtrocknen|beobachten|monitor/i.test(wetWet.recommendationText),
      `wet root zone should keep watering recommendation on wait/dryback, got: ${JSON.stringify(wetWet)}`
    );

    const drySurfaceWetRoot = await collectCase({
      statusWater: 18,
      statusRisk: 3,
      substrate: 48,
      surface: 24,
      rootZone: 72,
      overwateringPressure: 0,
      dryStressPressure: 12,
      drybackRatePerHour: 1.1
    });
    assert(drySurfaceWetRoot.moistureValue >= 42, 'dry surface with wet root zone should not render as completely dry');
    assert(/warten|vorsichtig|wait|small|klein|beobachten/i.test(drySurfaceWetRoot.recommendationText), 'dry surface with wet root zone should recommend waiting or cautious action');
    assert(!/zu feucht|too wet/i.test(drySurfaceWetRoot.effectsText), 'moderate wet-root case should not overstate a root-zone wet warning');

    const dryDry = await collectCase({
      statusWater: 12,
      statusRisk: 3,
      substrate: 25,
      surface: 18,
      rootZone: 30,
      overwateringPressure: 0,
      dryStressPressure: 66,
      drybackRatePerHour: 2.4
    });
    assert(dryDry.moistureValue <= 35, 'dry/dry header moisture should render dry');
    assert(/gie|water|bald|now|nötig|noetig|Fenster/i.test(dryDry.recommendationText), 'dry/dry case should open or approach the watering window');
    assert(!/zu feucht|too wet/i.test(dryDry.effectsText), 'dry/dry case must not show a too-wet root-zone warning');

    const eventSourceAudit = await page.evaluate(() => ({
      pressureUsesStatusWater: typeof window.GrowSimEvents !== 'undefined',
      statusWater: Number(window.__gsState.status.water || 0),
      careDisplayMoisture: Number(window.GrowSimCareModel.deriveCareSummary(window.__gsState.care, window.__gsState).displayMoisture)
    }));
    assert.strictEqual(eventSourceAudit.pressureUsesStatusWater, true, 'event runtime should remain available after care mapping smoke');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main()
  .then(() => {
    console.log('care-studio-moisture-risk-consistency: all scenarios passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
