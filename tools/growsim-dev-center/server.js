'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { scanProject } = require('./src/projectScanner');
const { createScriptRunner } = require('./src/scriptRunner');
const { scanAssets } = require('./src/assetScanner');
const { scanI18n } = require('./src/i18nScanner');
const { buildPrompt } = require('./src/promptBuilder');
const { generateAllPresets, generatePreset, listPresetDefinitions } = require('./src/statePresetBuilder');
const { getProjectRoot, normalizeProjectRelative } = require('./src/pathUtils');

const PORT = Number(process.env.GROWSIM_DEV_CENTER_PORT || 5179);
const projectRoot = getProjectRoot();
const app = express();
const scriptRunner = createScriptRunner(projectRoot);

app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

function sendError(res, error) {
  const status = error.code === 'PATH_OUTSIDE_PROJECT' ? 400 : 500;
  res.status(status).json({
    ok: false,
    error: error.message,
    code: error.code || 'DEV_CENTER_ERROR'
  });
}

app.get('/api/status', (_req, res) => {
  try {
    res.json(scanProject(projectRoot, scriptRunner.getHistory()));
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/scripts', (_req, res) => {
  try {
    res.json({
      scripts: scriptRunner.getKnownScripts(),
      running: scriptRunner.getRunning(),
      history: scriptRunner.getHistory()
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/scripts/run', async (req, res) => {
  try {
    const result = await scriptRunner.runScript(req.body && req.body.script);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/assets', (_req, res) => {
  try {
    res.json(scanAssets(projectRoot));
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/assets/preview', (req, res) => {
  try {
    const requestedPath = String(req.query.path || '');
    const normalized = normalizeProjectRelative(projectRoot, requestedPath);
    if (!normalized.relativePath.startsWith('assets/')) {
      res.status(400).send('Only project assets can be previewed.');
      return;
    }
    if (!fs.existsSync(normalized.absolutePath) || !fs.statSync(normalized.absolutePath).isFile()) {
      res.status(404).send('Asset not found.');
      return;
    }
    res.sendFile(normalized.absolutePath);
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/i18n', (_req, res) => {
  try {
    res.json(scanI18n(projectRoot));
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/test-states', (_req, res) => {
  try {
    res.json({ presets: listPresetDefinitions() });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/test-states/generate', (req, res) => {
  try {
    const presetId = req.body && req.body.presetId;
    const result = presetId === 'all'
      ? { generated: generateAllPresets(projectRoot) }
      : generatePreset(projectRoot, presetId);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/prompts/build', (req, res) => {
  try {
    res.json({ prompt: buildPrompt(req.body || {}) });
  } catch (error) {
    sendError(res, error);
  }
});

app.listen(PORT, () => {
  console.log(`[growsim-dev-center] running at http://localhost:${PORT}`);
  console.log(`[growsim-dev-center] project root: ${projectRoot}`);
});
