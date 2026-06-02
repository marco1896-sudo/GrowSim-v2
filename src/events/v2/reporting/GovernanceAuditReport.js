'use strict';

function toData(audit) {
  const a = audit || { findings: [] };
  const findings = Array.isArray(a.findings) ? a.findings : [];
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  return Object.freeze({ ok: Boolean(a.ok), profile: a.profile || null, errors, warnings, findings: Object.freeze(findings) });
}

function toMarkdown(audit) {
  const d = toData(audit);
  const lines = [
    '# Governance Audit Report',
    '',
    '- ok: ' + String(d.ok),
    '- profile: ' + String((d.profile && d.profile.profileId) || 'n/a'),
    '- errors: ' + String(d.errors),
    '- warnings: ' + String(d.warnings),
    '',
    '## Findings'
  ];
  d.findings.forEach((f) => lines.push('- [' + String(f.severity) + '] ' + String(f.scenarioId) + ': ' + String(f.message)));
  return lines.join('\n');
}

module.exports = Object.freeze({ toData, toMarkdown });
