'use strict';

(function initShadowBridgeSnapshotSanitizer(globalScope) {
  const DEFAULT_DIAGNOSTIC_SOURCE = 'shadow_bridge_snapshot_sanitizer';

  function createDiagnostic(severity, code, message, path) {
    return {
      severity,
      code,
      message,
      path: path || null,
      source: DEFAULT_DIAGNOSTIC_SOURCE
    };
  }

  function isPlainObject(value) {
    if (!value || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function hasLiveReferenceIndicators(value) {
    if (!value || typeof value !== 'object') return false;
    if (typeof Node !== 'undefined' && value instanceof Node) return true;
    if (typeof Window !== 'undefined' && value instanceof Window) return true;
    if (value.window === value) return true;
    if (value.document && value.location) return true;
    if (typeof value.addEventListener === 'function' && typeof value.removeEventListener === 'function') return true;
    return false;
  }

  function readFiniteNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function readString(value, fallback) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  function copyNumberField(source, key, fallback) {
    if (!source || typeof source !== 'object') return fallback;
    return readFiniteNumber(source[key], fallback);
  }

  function copyStringField(source, key, fallback) {
    if (!source || typeof source !== 'object') return fallback;
    return readString(source[key], fallback);
  }

  function sanitizeMachineState(value) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return readString(value.state, readString(value.status, 'unknown'));
    }
    return 'unknown';
  }

  function sanitizeReadOnlyContext(rawInput, diagnostics) {
    const source = isPlainObject(rawInput && rawInput.context) ? rawInput.context : (rawInput || {});
    const simulation = isPlainObject(source.simulation) ? source.simulation : {};
    const plant = isPlainObject(source.plant) ? source.plant : {};
    const status = isPlainObject(source.status) ? source.status : {};
    const setup = isPlainObject(source.setup) ? source.setup : {};
    const events = isPlainObject(source.events) ? source.events : {};

    if (!isPlainObject(source)) {
      diagnostics.push(createDiagnostic('warning', 'snapshot_input_not_plain_object', 'Snapshot input was not a plain object.', 'input'));
    }

    return {
      simulation: {
        tickCount: copyNumberField(simulation, 'tickCount', 0),
        simTimeMs: copyNumberField(simulation, 'simTimeMs', 0)
      },
      plant: {
        stageIndex: copyNumberField(plant, 'stageIndex', 0),
        stageProgress: copyNumberField(plant, 'stageProgress', 0)
      },
      status: {
        water: copyNumberField(status, 'water', 0),
        nutrition: copyNumberField(status, 'nutrition', 0),
        stress: copyNumberField(status, 'stress', 0)
      },
      setup: {
        mode: readString(setup.mode, readString(source.setupMode, 'unknown')),
        type: readString(setup.type, readString(setup.setupType, 'unknown'))
      },
      events: {
        activeEventId: copyStringField(events, 'activeEventId', null),
        machineState: sanitizeMachineState(events.machineState),
        summary: {
          hasActiveEvent: Boolean(events.activeEventId),
          schedulerKnown: Boolean(events.scheduler)
        }
      }
    };
  }

  function copyDiagnosticNumbers(source) {
    const data = source && typeof source === 'object' ? source : {};
    return {
      blocker: readFiniteNumber(data.blocker, 0),
      error: readFiniteNumber(data.error, 0),
      warning: readFiniteNumber(data.warning, 0),
      info: readFiniteNumber(data.info, 0),
      bridgePass: readFiniteNumber(data.bridgePass, 0),
      bridgeWarning: readFiniteNumber(data.bridgeWarning, 0),
      bridgeBlocked: readFiniteNumber(data.bridgeBlocked, 0),
      eventsMapped: readFiniteNumber(data.eventsMapped, 0),
      infoDensity: readFiniteNumber(data.infoDensity, 0),
      budgetWarnings: readFiniteNumber(data.budgetWarnings, 0)
    };
  }

  function sanitizeV2Diagnostics(rawInput) {
    const direct = rawInput && rawInput.v2Diagnostics ? rawInput.v2Diagnostics : {};
    const dryRun = rawInput && rawInput.dryRunSummary ? rawInput.dryRunSummary : direct.dryRunSummary;
    const adapter = rawInput && rawInput.adapterSummary ? rawInput.adapterSummary : direct.adapterSummary;
    const merged = Object.assign({}, copyDiagnosticNumbers(dryRun), copyDiagnosticNumbers(adapter), copyDiagnosticNumbers(direct));

    return Object.assign({}, merged, {
      dryRunSummary: dryRun ? copyDiagnosticNumbers(dryRun) : null,
      adapterSummary: adapter ? copyDiagnosticNumbers(adapter) : null
    });
  }

  function scanForUnsafeInput(value, path, diagnostics, depth) {
    if (depth > 4) return;
    if (typeof value === 'function') {
      diagnostics.push(createDiagnostic('info', 'snapshot_function_omitted', 'Function value omitted from snapshot input.', path));
      return;
    }
    if (hasLiveReferenceIndicators(value)) {
      diagnostics.push(createDiagnostic('warning', 'snapshot_live_reference_omitted', 'Possible live Runtime/DOM reference omitted from snapshot input.', path));
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (!isPlainObject(value) && !Array.isArray(value)) {
      diagnostics.push(createDiagnostic('info', 'snapshot_non_plain_object_omitted', 'Non-plain object was not copied into the snapshot.', path));
      return;
    }
    Object.keys(value).forEach((key) => scanForUnsafeInput(value[key], path ? `${path}.${key}` : key, diagnostics, depth + 1));
  }

  function sanitizeSnapshotInput(input) {
    const diagnostics = [];
    scanForUnsafeInput(input, 'input', diagnostics, 0);
    return {
      readOnlyContext: sanitizeReadOnlyContext(input || {}, diagnostics),
      v2Diagnostics: sanitizeV2Diagnostics(input || {}),
      diagnostics
    };
  }

  const api = Object.freeze({
    sanitizeSnapshotInput,
    hasLiveReferenceIndicators
  });

  globalScope.ShadowBridgeSnapshotSanitizer = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

