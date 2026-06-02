#!/usr/bin/env node
'use strict';

/**
 * Non-mutating draft exporter for Event-V2 trial assets.
 *
 * IMPORTANT:
 * - dry-run by default
 * - no final writes unless --write --target final --allow-final-write
 * - this draft does NOT perform real WebP conversion yet
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = {
    input: 'data/events/catalog/_planning/phase-112-trial-asset-set-v1.json',
    write: false,
    target: 'trial',
    allowFinalWrite: false,
    overwrite: false,
    report: 'data/events/catalog/_planning/phase-116-export-draft-report.json'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--input') args.input = argv[++i];
    else if (t === '--write') args.write = true;
    else if (t === '--target') args.target = argv[++i];
    else if (t === '--allow-final-write') args.allowFinalWrite = true;
    else if (t === '--overwrite') args.overwrite = true;
    else if (t === '--report') args.report = argv[++i];
  }

  return args;
}

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function fileHash(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function pngDimensions(absPath) {
  const buf = fs.readFileSync(absPath);
  if (buf.length < 24) return { width: null, height: null };
  const sig = buf.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') return { width: null, height: null };
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20)
  };
}

function normalizeRows(inputObj) {
  if (Array.isArray(inputObj)) {
    return inputObj.map((e) => ({ eventId: e.eventId, sourceCandidate: e.bestCandidatePath }));
  }
  if (inputObj && inputObj.events) {
    return Object.keys(inputObj.events).map((eventId) => ({
      eventId,
      sourceCandidate: inputObj.events[eventId].assetRefs.sourceCandidate
    }));
  }
  return [];
}

function buildTargets(eventId, target) {
  const base = target === 'final'
    ? `assets/events/v2/final/${eventId}`
    : `assets/events/v2/_trial_export/draft/${eventId}`;

  return {
    hero: `${base}/hero.webp`,
    fallback: `${base}/fallback.webp`,
    hero2x: `${base}/hero@2x.webp`
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputAbs = path.resolve(ROOT, args.input);
  const reportAbs = path.resolve(ROOT, args.report);

  if (!fs.existsSync(inputAbs)) {
    console.error('Input missing:', inputAbs);
    process.exit(2);
  }

  if (args.target === 'final' && (!args.write || !args.allowFinalWrite)) {
    console.error('Safety gate: final target requires --write and --allow-final-write');
    process.exit(3);
  }

  const input = readJson(inputAbs);
  const rows = normalizeRows(input);
  const out = [];

  for (const row of rows) {
    const srcRel = row.sourceCandidate;
    const srcAbs = path.resolve(ROOT, srcRel || '');
    const exists = !!srcRel && fs.existsSync(srcAbs);

    if (!exists) {
      out.push({ eventId: row.eventId, status: 'missing_source', sourceCandidate: srcRel });
      continue;
    }

    const stat = fs.statSync(srcAbs);
    const dim = pngDimensions(srcAbs);
    const ratio = dim.width && dim.height ? +(dim.width / dim.height).toFixed(3) : null;
    const wideHero = ratio !== null ? ratio > 1.4 : false;
    const targets = buildTargets(row.eventId, args.target);

    const plan = {
      eventId: row.eventId,
      sourceCandidate: srcRel,
      sourceHash: fileHash(srcAbs),
      sourceBytes: stat.size,
      sourceWidth: dim.width,
      sourceHeight: dim.height,
      sourceRatio: ratio,
      wideHeroCompatible: wideHero,
      target,
      conversions: [
        { output: targets.hero, quality: 86, maxWidth: 1280, upscale: false },
        { output: targets.fallback, quality: 78, maxWidth: 960, upscale: false },
        { output: targets.hero2x, quality: 88, optional: true, minSourceWidth: 2560, upscale: false }
      ],
      dryRun: !args.write,
      note: 'Draft only: no real webp conversion implemented in phase-116 draft.'
    };

    // Non-mutating default: no writes.
    if (args.write) {
      // Deliberately no binary conversion implementation in draft phase.
      plan.writeStatus = 'write_requested_but_conversion_not_implemented_in_draft';
    }

    out.push(plan);
  }

  fs.mkdirSync(path.dirname(reportAbs), { recursive: true });
  fs.writeFileSync(reportAbs, JSON.stringify({
    draft: true,
    input: args.input,
    target: args.target,
    write: args.write,
    allowFinalWrite: args.allowFinalWrite,
    generatedAt: new Date().toISOString(),
    items: out
  }, null, 2));

  console.log(JSON.stringify({ ok: true, draft: true, count: out.length, report: args.report }, null, 2));
}

main();
