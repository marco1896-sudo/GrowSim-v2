'use strict';

const { spawn } = require('child_process');
const { getPackageScripts } = require('./projectScanner');

const MAX_OUTPUT_CHARS = 250000;

function buildNpmArgs(scriptName) {
  return scriptName === 'test' ? ['test'] : ['run', scriptName];
}

function buildSpawnConfig(scriptName) {
  const args = buildNpmArgs(scriptName);
  const commandText = `npm ${args.join(' ')}`;
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', commandText],
      commandText
    };
  }
  return {
    command: 'npm',
    args,
    commandText
  };
}

function createScriptRunner(projectRoot) {
  const running = new Map();
  const history = [];

  function getKnownScripts() {
    return getPackageScripts(projectRoot);
  }

  function getHistory() {
    return history.slice(0, 20);
  }

  function addHistory(entry) {
    history.unshift(entry);
    history.splice(20);
  }

  function assertKnownScript(scriptName) {
    const safeName = String(scriptName || '').trim();
    if (!/^[a-zA-Z0-9:_-]+$/.test(safeName)) {
      const error = new Error('Script name contains unsupported characters.');
      error.code = 'UNSAFE_SCRIPT_NAME';
      throw error;
    }
    const known = getKnownScripts();
    const match = known.find((script) => script.name === safeName);
    if (!match) {
      const error = new Error('Unknown package.json script.');
      error.code = 'UNKNOWN_SCRIPT';
      throw error;
    }
    return match;
  }

  function runScript(scriptName) {
    const script = assertKnownScript(scriptName);
    if (running.has(script.name)) {
      const error = new Error('Script is already running.');
      error.code = 'SCRIPT_RUNNING';
      throw error;
    }

    const startedAt = Date.now();
    const spawnConfig = buildSpawnConfig(script.name);
    const child = spawn(spawnConfig.command, spawnConfig.args, {
      cwd: projectRoot,
      shell: false,
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    let stdout = '';
    let stderr = '';
    let truncated = false;

    function appendOutput(kind, chunk) {
      const value = chunk.toString();
      if (kind === 'stdout') stdout += value;
      if (kind === 'stderr') stderr += value;
      if (stdout.length + stderr.length > MAX_OUTPUT_CHARS) {
        truncated = true;
        stdout = stdout.slice(-Math.floor(MAX_OUTPUT_CHARS / 2));
        stderr = stderr.slice(-Math.floor(MAX_OUTPUT_CHARS / 2));
      }
    }

    const promise = new Promise((resolve) => {
      child.stdout.on('data', (chunk) => appendOutput('stdout', chunk));
      child.stderr.on('data', (chunk) => appendOutput('stderr', chunk));
      child.on('error', (error) => {
        const finishedAt = Date.now();
        const result = {
          script: script.name,
          command: spawnConfig.commandText,
          status: 'error',
          exitCode: null,
          stdout,
          stderr: `${stderr}\n${error.message}`.trim(),
          truncated,
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date(finishedAt).toISOString(),
          durationMs: finishedAt - startedAt
        };
        running.delete(script.name);
        addHistory(result);
        resolve(result);
      });
      child.on('close', (code) => {
        const finishedAt = Date.now();
        const result = {
          script: script.name,
          command: spawnConfig.commandText,
          status: code === 0 ? 'ok' : 'error',
          exitCode: code,
          stdout,
          stderr,
          truncated,
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date(finishedAt).toISOString(),
          durationMs: finishedAt - startedAt
        };
        running.delete(script.name);
        addHistory(result);
        resolve(result);
      });
    });

    running.set(script.name, { script: script.name, command: spawnConfig.commandText, startedAt });
    return promise;
  }

  return {
    getKnownScripts,
    getHistory,
    getRunning: () => Array.from(running.values()).map((item) => ({
      ...item,
      startedAt: new Date(item.startedAt).toISOString()
    })),
    runScript
  };
}

module.exports = {
  createScriptRunner
};
