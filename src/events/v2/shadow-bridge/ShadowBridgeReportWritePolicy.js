'use strict';

(function initShadowBridgeReportWritePolicy(globalScope) {
  const fs = typeof require !== 'undefined' ? require('fs') : null;
  const path = typeof require !== 'undefined' ? require('path') : null;

  function createTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  function getGeneratedDir(projectRoot) {
    return path.join(projectRoot, 'docs', 'event-system-v2', 'generated');
  }

  function assertWritableTarget(projectRoot, filePath, allowOverwrite) {
    const generatedDir = getGeneratedDir(projectRoot);
    const resolvedGenerated = path.resolve(generatedDir);
    const resolvedTarget = path.resolve(filePath);
    if (!resolvedTarget.startsWith(resolvedGenerated + path.sep)) {
      return { ok: false, reason: 'target_outside_generated_dir' };
    }
    if (path.basename(resolvedTarget).indexOf('shadow-bridge-report') !== 0) {
      return { ok: false, reason: 'invalid_report_filename' };
    }
    if (!allowOverwrite && fs.existsSync(resolvedTarget)) {
      return { ok: false, reason: 'target_exists_without_overwrite' };
    }
    return { ok: true, reason: null };
  }

  function writeReportsIfAllowed(projectRoot, reports, options) {
    const opts = options || {};
    if (!opts.writeReports) {
      return { wrote: false, reason: 'write_not_requested', files: [] };
    }

    const generatedDir = getGeneratedDir(projectRoot);
    fs.mkdirSync(generatedDir, { recursive: true });

    const stamp = opts.timestamp || createTimestamp();
    const files = [];
    const allowOverwrite = Boolean(opts.allowOverwrite);

    if (reports.markdown) {
      const mdPath = path.join(generatedDir, 'shadow-bridge-report-' + stamp + '.md');
      const check = assertWritableTarget(projectRoot, mdPath, allowOverwrite);
      if (!check.ok) return { wrote: false, reason: check.reason, files };
      fs.writeFileSync(mdPath, reports.markdown, 'utf8');
      files.push(mdPath);
    }

    if (reports.jsonString) {
      const jsonPath = path.join(generatedDir, 'shadow-bridge-report-' + stamp + '.json');
      const check = assertWritableTarget(projectRoot, jsonPath, allowOverwrite);
      if (!check.ok) return { wrote: false, reason: check.reason, files };
      fs.writeFileSync(jsonPath, reports.jsonString, 'utf8');
      files.push(jsonPath);
    }

    return { wrote: files.length > 0, reason: files.length > 0 ? null : 'no_report_formats', files };
  }

  const api = Object.freeze({
    writeReportsIfAllowed,
    getGeneratedDir,
    assertWritableTarget
  });

  globalScope.ShadowBridgeReportWritePolicy = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

