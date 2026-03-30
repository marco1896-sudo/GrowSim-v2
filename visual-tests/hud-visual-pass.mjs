import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const PORT = 4173;
const SCREENSHOT_DIR = path.join(ROOT, 'visual-tests', 'screenshots');

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
  };
  return map[ext] || 'application/octet-stream';
}

function startStaticServer(rootDir, port) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const sanitized = urlPath === '/' ? '/index.html' : urlPath;
    const requested = path.join(rootDir, sanitized);
    const fullPath = path.normalize(requested);
    if (!fullPath.startsWith(rootDir)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    res.setHeader('Content-Type', contentType(fullPath));
    fs.createReadStream(fullPath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve(server));
  });
}

async function applyHudVisualState(page, state) {
  await page.evaluate((payload) => {
    const hideOverlay = (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.setAttribute('aria-hidden', 'true');
      }
    };
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    const setVar = (id, variable, value) => {
      const el = document.getElementById(id);
      if (el) el.style.setProperty(variable, String(value));
    };

    hideOverlay('landing');
    hideOverlay('deathOverlay');

    setText('nextEventValue', payload.nextEvent);
    setText('growthImpulseValue', payload.growthImpulse);
    setText('simTimeValue', payload.dayTime);
    setText('phaseCardTitle', payload.phase);
    setText('phaseCardAge', payload.phaseAge);
    setText('phaseCardSubtitle', payload.phaseSubtitle);

    setVar('waterRing', '--value', payload.water);
    setVar('nutritionRing', '--value', payload.nutrition);
    setVar('growthRing', '--value', payload.growth);
    setVar('riskRing', '--value', payload.risk);

    setText('waterValue', `${payload.water}%`);
    setText('nutritionValue', `${payload.nutrition}%`);
    setText('growthValue', `${payload.growth}%`);
    setText('riskValue', `${payload.risk}%`);

    setText('rootPhValue', payload.ph);
    setText('rootEcValue', payload.ec);
    setText('rootHealthValue', payload.rootHealth);
    setText('rootOxygenValue', payload.oxygen);
    setText('envLightValue', payload.ppfd);
    setText('envTempValue', payload.temperature);
    setText('envHumidityValue', payload.humidity);
    setText('envAirflowValue', payload.airflow);
  }, state);
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const server = await startStaticServer(ROOT, PORT);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 540, height: 1080 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  const states = [
    {
      name: '01-default-live',
      nextEvent: '29:18',
      growthImpulse: '1.75',
      dayTime: 'Tag 24 · 14:32',
      phase: 'Blüte',
      phaseAge: 'Tag 24',
      phaseSubtitle: '68% -> Reife',
      water: 70,
      nutrition: 65,
      growth: 75,
      risk: 20,
      ph: '5.9',
      ec: '1.3',
      rootHealth: '78%',
      oxygen: '78%',
      ppfd: '720 PPFD',
      temperature: '25.3°C',
      humidity: '61%',
      airflow: 'Gut',
    },
    {
      name: '02-high-risk-stress',
      nextEvent: '04:50',
      growthImpulse: '0.82',
      dayTime: 'Tag 31 · 22:40',
      phase: 'Späte Blüte',
      phaseAge: 'Tag 31',
      phaseSubtitle: '89% -> Ernte',
      water: 34,
      nutrition: 41,
      growth: 48,
      risk: 82,
      ph: '6.7',
      ec: '2.0',
      rootHealth: '55%',
      oxygen: '49%',
      ppfd: '540 PPFD',
      temperature: '29.4°C',
      humidity: '72%',
      airflow: 'Schwach',
    },
    {
      name: '03-healthy-peak',
      nextEvent: '43:09',
      growthImpulse: '2.06',
      dayTime: 'Tag 40 · 10:16',
      phase: 'Premium-Blüte',
      phaseAge: 'Tag 40',
      phaseSubtitle: '94% -> Finale',
      water: 86,
      nutrition: 84,
      growth: 92,
      risk: 8,
      ph: '5.8',
      ec: '1.2',
      rootHealth: '94%',
      oxygen: '91%',
      ppfd: '890 PPFD',
      temperature: '24.1°C',
      humidity: '56%',
      airflow: 'Stark',
    },
  ];

  try {
    await page.goto(`http://0.0.0.0:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    for (const state of states) {
      await applyHudVisualState(page, state);
      await page.waitForTimeout(220);
      const file = path.join(SCREENSHOT_DIR, `${state.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      // eslint-disable-next-line no-console
      console.log(`Saved ${file}`);
    }
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});

