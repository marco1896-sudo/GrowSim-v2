'use strict';

const { scoreEventCandidate } = require('../scoring/EventCandidateScorer');

function buildShadowScoringData(context, catalogIndex) {
  const candidates = catalogIndex && catalogIndex.byKind && Array.isArray(catalogIndex.byKind.event)
    ? catalogIndex.byKind.event
    : [];

  const items = candidates.map((candidate) => {
    const result = scoreEventCandidate(context, candidate);
    return Object.freeze({
      candidateId: candidate.fileName || null,
      totalScore: result.total,
      reason: result.reason,
      deterministic: result.deterministicScore || null
    });
  });

  const sortedByScoreDesc = items.slice().sort((a, b) => Number(b.totalScore) - Number(a.totalScore));
  const lowestScoreFirst = items.slice().sort((a, b) => Number(a.totalScore) - Number(b.totalScore));
  const sum = items.reduce((acc, item) => acc + Number(item.totalScore || 0), 0);
  const avg = items.length > 0 ? Number((sum / items.length).toFixed(2)) : 0;

  return Object.freeze({
    evaluatedCandidates: items.length,
    averageScore: avg,
    items: Object.freeze(items),
    ranked: Object.freeze(sortedByScoreDesc),
    topRisks: Object.freeze(lowestScoreFirst.slice(0, 5))
  });
}

function toMarkdown(scoringData) {
  const data = scoringData || { evaluatedCandidates: 0, items: [] };
  const lines = ['# V2 Shadow Scoring Report', ''];
  lines.push('- evaluatedCandidates: ' + String(data.evaluatedCandidates || 0));
  lines.push('- averageScore: ' + String(data.averageScore || 0));
  lines.push('');
  (data.items || []).forEach((item) => {
    lines.push('- ' + String(item.candidateId) + ': totalScore=' + String(item.totalScore));
  });
  lines.push('');
  lines.push('## Top Risks (Lowest Scores)');
  (data.topRisks || []).forEach((item) => {
    lines.push('- ' + String(item.candidateId) + ': totalScore=' + String(item.totalScore));
  });
  if (Array.isArray(data.topIssues) && data.topIssues.length > 0) {
    lines.push('');
    lines.push('## Top Issues');
    data.topIssues.forEach((issue) => {
      lines.push('- [' + String(issue.severity || 'warning') + '] ' + String(issue.ruleId || 'unknown_rule') + ': ' + String(issue.message || ''));
    });
  }
  return lines.join('\n');
}

module.exports = Object.freeze({
  buildShadowScoringData,
  toMarkdown
});
