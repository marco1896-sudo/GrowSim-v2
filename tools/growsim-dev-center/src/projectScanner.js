'use strict';

const fs = require('fs');
const path = require('path');
const { toPosixPath } = require('./pathUtils');

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function exists(projectRoot, relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

function detectAppStructure(projectRoot) {
  const probes = [
    { key: 'rootPackage', label: 'Root package.json', path: 'package.json', type: 'config' },
    { key: 'appEntry', label: 'Main app runtime', path: 'app.js', type: 'runtime' },
    { key: 'uiRuntime', label: 'UI runtime', path: 'ui.js', type: 'ui' },
    { key: 'simulation', label: 'Simulation runtime', path: 'sim.js', type: 'simulation' },
    { key: 'storage', label: 'Storage runtime', path: 'storage.js', type: 'storage' },
    { key: 'events', label: 'Event runtime', path: 'events.js', type: 'events' },
    { key: 'i18n', label: 'i18n locales', path: 'src/i18n/locales', type: 'i18n' },
    { key: 'assets', label: 'Assets', path: 'assets', type: 'assets' },
    { key: 'tests', label: 'Tests', path: 'test', type: 'qa' },
    { key: 'serviceWorker', label: 'Service worker', path: 'sw.js', type: 'pwa' }
  ];

  return probes.map((probe) => ({
    ...probe,
    present: exists(projectRoot, probe.path)
  }));
}

function getPackageScripts(projectRoot) {
  const packageJson = readJsonIfExists(path.join(projectRoot, 'package.json')) || {};
  const scripts = packageJson.scripts && typeof packageJson.scripts === 'object'
    ? packageJson.scripts
    : {};
  return Object.entries(scripts).map(([name, command]) => ({ name, command: String(command || '') }));
}

function scanProject(projectRoot, checkHistory = []) {
  const packageJson = readJsonIfExists(path.join(projectRoot, 'package.json')) || {};
  const appStructure = detectAppStructure(projectRoot);
  const missingRequired = appStructure
    .filter((item) => ['rootPackage', 'appEntry', 'storage', 'assets'].includes(item.key) && !item.present)
    .map((item) => item.label);
  const warnings = [];
  if (!exists(projectRoot, 'src/i18n/locales')) {
    warnings.push('No src/i18n/locales directory detected.');
  }
  if (!exists(projectRoot, 'test')) {
    warnings.push('No test directory detected.');
  }

  const status = missingRequired.length ? 'error' : (warnings.length ? 'warning' : 'ok');

  return {
    name: 'GrowSim Dev Control Center',
    projectPath: projectRoot,
    projectFolder: path.basename(projectRoot),
    nodeVersion: process.version,
    platform: process.platform,
    packageName: packageJson.name || '(unnamed root package)',
    scripts: getPackageScripts(projectRoot),
    appStructure,
    tool: {
      status: 'running',
      url: 'http://localhost:5179',
      cwd: toPosixPath(path.relative(projectRoot, process.cwd()) || '.')
    },
    checks: checkHistory.slice(0, 12),
    health: {
      status,
      warnings,
      errors: missingRequired
    },
    scannedAt: new Date().toISOString()
  };
}

module.exports = {
  getPackageScripts,
  scanProject
};
