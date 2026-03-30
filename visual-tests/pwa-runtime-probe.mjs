import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const PORT = 4173;
const OUT_DIR = path.join(ROOT, 'visual-tests', 'screenshots');
const OUT_JSON = path.join(OUT_DIR, 'pwa-runtime-report.json');

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
    '.webmanifest': 'application/manifest+json'
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
    if (path.basename(fullPath) === 'sw.js') {
      res.setHeader('Cache-Control', 'no-cache');
    }
    fs.createReadStream(fullPath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve(server));
  });
}

async function collectPageState(page) {
  return page.evaluate(async () => {
    const withTimeout = (promise, timeoutMs, fallback) => {
      const timeoutPromise = new Promise((resolve) => window.setTimeout(() => resolve(fallback), timeoutMs));
      return Promise.race([promise, timeoutPromise]);
    };

    const hint = document.getElementById('swHintBanner');
    const hud = document.getElementById('dataVizHud');

    const sw = {
      supported: 'serviceWorker' in navigator,
      controller: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
      ready: { ok: false, hasActive: false, source: 'none' },
      registration: null
    };

    if (sw.supported) {
      const readyState = await withTimeout(
        navigator.serviceWorker.ready
          .then((registration) => ({
            ok: Boolean(registration && registration.active),
            hasActive: Boolean(registration && registration.active),
            source: 'ready'
          }))
          .catch((error) => ({ ok: false, hasActive: false, source: `ready_error:${String(error && error.message ? error.message : error)}` })),
        4500,
        { ok: false, hasActive: false, source: 'ready_timeout' }
      );

      sw.ready = readyState;
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      sw.registration = reg ? {
        installing: Boolean(reg.installing),
        waiting: Boolean(reg.waiting),
        active: Boolean(reg.active)
      } : null;
    }

    return {
      bootOk: Boolean(window.__gsBootOk),
      bootMetrics: window.__gsBootMetrics || null,
      swHintVisible: Boolean(hint && !hint.classList.contains('hidden')),
      hasHud: Boolean(hud),
      sw
    };
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startStaticServer(ROOT, PORT);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36'
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const response404 = [];
  const requestFailed = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(String(err && err.message ? err.message : err));
  });
  page.on('response', (response) => {
    if (response.status() === 404) {
      response404.push(response.url());
    }
  });
  page.on('requestfailed', (req) => {
    requestFailed.push(`${req.url()} :: ${req.failure() ? req.failure().errorText : 'failed'}`);
  });

  const url = `http://0.0.0.0:${PORT}/`;
  const report = {
    url,
    startedAt: new Date().toISOString(),
    initial: null,
    afterReload: null,
    offlineReload: null,
    consoleErrors,
    pageErrors,
    response404,
    requestFailed
  };

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 15000 });
    await page.waitForTimeout(1200);

    report.initial = await collectPageState(page);
    await page.screenshot({ path: path.join(OUT_DIR, 'pwa-probe-initial.png'), fullPage: true });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 15000 });
    await page.waitForTimeout(900);
    report.afterReload = await collectPageState(page);
    await page.screenshot({ path: path.join(OUT_DIR, 'pwa-probe-reload.png'), fullPage: true });

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
    report.offlineReload = await collectPageState(page);
    await page.screenshot({ path: path.join(OUT_DIR, 'pwa-probe-offline.png'), fullPage: true });
    await context.setOffline(false);

    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

