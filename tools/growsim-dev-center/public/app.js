'use strict';

const state = {
  currentSection: 'overview',
  runningScript: null,
  prompt: ''
};

const sectionTitles = {
  overview: 'Overview',
  scripts: 'Scripts',
  assets: 'Assets',
  i18n: 'i18n',
  states: 'Test States',
  prompts: 'Codex Prompt Builder'
};

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function chipClass(status) {
  if (status === 'ok') return 'chip ok';
  if (status === 'warning') return 'chip warning';
  if (status === 'error') return 'chip error';
  return 'chip neutral';
}

function setSection(section) {
  state.currentSection = section;
  document.querySelectorAll('.section').forEach((node) => node.classList.toggle('active', node.id === section));
  document.querySelectorAll('.nav-button').forEach((node) => node.classList.toggle('active', node.dataset.section === section));
  $('#sectionTitle').textContent = sectionTitles[section] || section;
}

async function loadStatus() {
  const data = await fetchJson('/api/status');
  const healthChip = $('#healthChip');
  healthChip.textContent = data.health.status.toUpperCase();
  healthChip.className = chipClass(data.health.status);

  $('#projectDetails').innerHTML = `
    <dt>Project path</dt><dd>${escapeHtml(data.projectPath)}</dd>
    <dt>Package</dt><dd>${escapeHtml(data.packageName)}</dd>
    <dt>Node</dt><dd>${escapeHtml(data.nodeVersion)}</dd>
    <dt>Platform</dt><dd>${escapeHtml(data.platform)}</dd>
    <dt>Tool status</dt><dd>${escapeHtml(data.tool.status)} at ${escapeHtml(data.tool.url)}</dd>
    <dt>Scripts</dt><dd>${data.scripts.length}</dd>
    <dt>Scanned</dt><dd>${escapeHtml(data.scannedAt)}</dd>
  `;

  $('#structureCount').textContent = `${data.appStructure.filter((item) => item.present).length}/${data.appStructure.length}`;
  $('#structureList').innerHTML = data.appStructure.map((item) => `
    <div class="row">
      <div>
        <div class="row-title">${escapeHtml(item.label)}</div>
        <div class="row-subtitle">${escapeHtml(item.path)}</div>
      </div>
      <span class="${item.present ? 'chip ok' : 'chip warning'}">${item.present ? 'Found' : 'Missing'}</span>
    </div>
  `).join('');

  $('#checksCount').textContent = data.checks.length;
  $('#checksList').classList.toggle('empty', data.checks.length === 0);
  $('#checksList').innerHTML = data.checks.length
    ? data.checks.map((check) => `
      <div class="row">
        <div>
          <div class="row-title">${escapeHtml(check.command || check.script)}</div>
          <div class="row-subtitle">${escapeHtml(check.finishedAt || check.startedAt)} · ${check.durationMs || 0} ms</div>
        </div>
        <span class="${chipClass(check.status)}">${escapeHtml(check.status)}</span>
      </div>
    `).join('')
    : 'No checks executed yet.';
}

async function loadScripts() {
  const data = await fetchJson('/api/scripts');
  $('#scriptsList').innerHTML = data.scripts.map((script) => {
    const isRunning = data.running.some((item) => item.script === script.name) || state.runningScript === script.name;
    return `
      <div class="script-row">
        <div>
          <div class="row-title">npm ${script.name === 'test' ? 'test' : `run ${escapeHtml(script.name)}`}</div>
          <div class="row-subtitle">${escapeHtml(script.command)}</div>
        </div>
        <button class="script-button" data-script="${escapeHtml(script.name)}" ${isRunning ? 'disabled' : ''}>${isRunning ? 'Running' : 'Run'}</button>
      </div>
    `;
  }).join('');
}

async function runScript(scriptName) {
  state.runningScript = scriptName;
  $('#scriptStatus').textContent = 'Running';
  $('#scriptStatus').className = 'chip warning';
  $('#scriptOutput').textContent = `Running ${scriptName}...\n`;
  await loadScripts();
  try {
    const result = await fetchJson('/api/scripts/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: scriptName })
    });
    $('#scriptStatus').textContent = result.status.toUpperCase();
    $('#scriptStatus').className = chipClass(result.status);
    $('#scriptOutput').textContent = [
      `$ ${result.command}`,
      `Exit code: ${result.exitCode}`,
      `Duration: ${result.durationMs} ms`,
      result.truncated ? 'Output was truncated by the Dev Center.' : '',
      '--- stdout ---',
      result.stdout || '(empty)',
      '--- stderr ---',
      result.stderr || '(empty)'
    ].filter(Boolean).join('\n');
  } catch (error) {
    $('#scriptStatus').textContent = 'ERROR';
    $('#scriptStatus').className = 'chip error';
    $('#scriptOutput').textContent = error.message;
  } finally {
    state.runningScript = null;
    await loadScripts();
    await loadStatus();
  }
}

async function loadAssets() {
  const data = await fetchJson('/api/assets');
  $('#assetSummary').innerHTML = `
    <div class="summary-item"><strong>${data.totals.files}</strong><span>files</span></div>
    <div class="summary-item"><strong>${data.totals.images}</strong><span>images</span></div>
    <div class="summary-item"><strong>${formatBytes(data.totals.bytes)}</strong><span>total size</span></div>
    <div class="summary-item"><strong>${data.totals.warnings}</strong><span>warnings</span></div>
  `;
  $('#assetDirectories').innerHTML = data.directories.map((dir) => `
    <div class="folder-row">
      <div>
        <div class="row-title">${escapeHtml(dir.relativePath)}</div>
        <div class="row-subtitle">${dir.expected ? 'Expected by V1 checker' : 'Detected asset folder'}</div>
      </div>
      <span class="${dir.exists ? 'chip ok' : 'chip warning'}">${dir.exists ? 'Found' : 'Missing'}</span>
    </div>
  `).join('');

  const previewable = data.files.filter((file) => file.isImage).slice(0, 160);
  $('#assetCount').textContent = `${previewable.length}/${data.files.length}`;
  $('#assetGrid').innerHTML = previewable.map((file) => {
    const meta = file.metadata || {};
    const dimensions = meta.width && meta.height ? `${meta.width} x ${meta.height}` : 'unknown dimensions';
    const transparency = meta.hasTransparency === null || typeof meta.hasTransparency === 'undefined'
      ? 'transparency unknown'
      : (meta.hasTransparency ? 'transparent capable' : 'opaque');
    return `
      <article class="asset-card">
        <div class="asset-preview"><img src="${file.previewUrl}" alt=""></div>
        <div class="asset-body">
          <div class="asset-name">${escapeHtml(file.name)}</div>
          <div class="asset-meta">${escapeHtml(file.relativePath)}</div>
          <div class="asset-meta">${formatBytes(file.sizeBytes)} · ${escapeHtml(dimensions)} · ${escapeHtml(transparency)}</div>
          ${file.warnings.length ? `<div class="asset-meta warning-text">${escapeHtml(file.warnings.join(' '))}</div>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

async function loadI18n() {
  const data = await fetchJson('/api/i18n');
  $('#i18nSummary').innerHTML = `
    <div class="summary-item"><strong>${data.totals.languages}</strong><span>languages</span></div>
    <div class="summary-item"><strong>${data.totals.unionKeys}</strong><span>unique keys</span></div>
    <div class="summary-item"><strong>${escapeHtml(data.baseLanguage || '-')}</strong><span>base</span></div>
    <div class="summary-item"><strong>${data.totals.warnings}</strong><span>warnings</span></div>
  `;
  $('#i18nLanguages').innerHTML = data.languages.map((language) => `
    <div class="language-row">
      <div>
        <div class="row-title">${escapeHtml(language.language)}</div>
        <div class="row-subtitle">${escapeHtml(language.file)}</div>
      </div>
      <span class="${language.emptyKeys.length ? 'chip warning' : 'chip ok'}">${language.keys} keys</span>
    </div>
  `).join('');

  $('#i18nHealth').textContent = data.totals.warnings ? 'Warnings' : 'OK';
  $('#i18nHealth').className = data.totals.warnings ? 'chip warning' : 'chip ok';
  const issueRows = [];
  for (const [language, comparison] of Object.entries(data.comparisons || {})) {
    if (comparison.missingVsBase.length) issueRows.push([language, 'Missing vs base', comparison.missingVsBase]);
    if (comparison.extraVsBase.length) issueRows.push([language, 'Extra vs base', comparison.extraVsBase]);
    if (comparison.emptyKeys.length) issueRows.push([language, 'Empty values', comparison.emptyKeys]);
  }
  for (const issue of data.issues || []) {
    issueRows.push([issue.type, issue.file || 'i18n', [issue.message]]);
  }
  $('#i18nIssues').innerHTML = issueRows.length
    ? issueRows.map(([language, title, keys]) => `
      <div class="issue-row">
        <div>
          <div class="row-title">${escapeHtml(language)} · ${escapeHtml(title)}</div>
          <div class="row-subtitle">${escapeHtml(keys.slice(0, 40).join(', '))}${keys.length > 40 ? ' ...' : ''}</div>
        </div>
        <span class="chip warning">${keys.length}</span>
      </div>
    `).join('')
    : '<div class="empty">No key mismatches detected.</div>';
}

async function loadPresets() {
  const data = await fetchJson('/api/test-states');
  $('#presetList').innerHTML = data.presets.map((preset) => `
    <div class="preset-row">
      <div>
        <div class="row-title">${escapeHtml(preset.label)}</div>
        <div class="row-subtitle">${escapeHtml(preset.description)}</div>
      </div>
      <button class="small-button" data-preset="${escapeHtml(preset.id)}">Generate</button>
    </div>
  `).join('');
}

async function generatePreset(presetId) {
  $('#presetStatus').textContent = 'Writing';
  $('#presetStatus').className = 'chip warning';
  try {
    const data = await fetchJson('/api/test-states/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId })
    });
    $('#presetStatus').textContent = 'OK';
    $('#presetStatus').className = 'chip ok';
    $('#presetOutput').textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    $('#presetStatus').textContent = 'ERROR';
    $('#presetStatus').className = 'chip error';
    $('#presetOutput').textContent = error.message;
  }
}

async function buildPrompt() {
  const payload = {
    area: $('#promptArea').value,
    taskType: $('#promptTaskType').value,
    riskLevel: $('#promptRisk').value,
    description: $('#promptDescription').value
  };
  const data = await fetchJson('/api/prompts/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  state.prompt = data.prompt;
  $('#promptOutput').textContent = data.prompt;
}

async function refreshAll() {
  await Promise.all([
    loadStatus(),
    loadScripts(),
    loadAssets(),
    loadI18n(),
    loadPresets(),
    buildPrompt()
  ]);
}

function bindEvents() {
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.addEventListener('click', () => setSection(button.dataset.section));
  });
  $('#refreshAllButton').addEventListener('click', refreshAll);
  $('#reloadScriptsButton').addEventListener('click', loadScripts);
  $('#reloadAssetsButton').addEventListener('click', loadAssets);
  $('#reloadI18nButton').addEventListener('click', loadI18n);
  $('#generateAllStatesButton').addEventListener('click', () => generatePreset('all'));
  $('#scriptsList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-script]');
    if (button) runScript(button.dataset.script);
  });
  $('#presetList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (button) generatePreset(button.dataset.preset);
  });
  ['promptArea', 'promptTaskType', 'promptRisk', 'promptDescription'].forEach((id) => {
    $(`#${id}`).addEventListener('input', buildPrompt);
  });
  $('#copyPromptButton').addEventListener('click', async () => {
    await navigator.clipboard.writeText(state.prompt || $('#promptOutput').textContent);
    $('#copyStatus').textContent = 'Copied';
    setTimeout(() => { $('#copyStatus').textContent = 'Ready'; }, 1600);
  });
}

bindEvents();
refreshAll().catch((error) => {
  $('#sectionTitle').textContent = 'Load error';
  $('#projectDetails').innerHTML = `<dt>Error</dt><dd>${escapeHtml(error.message)}</dd>`;
});
