#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: 'sharp_not_available', message: err.message }, null, 2));
  process.exit(2);
}

const ROOT = process.cwd();

const DEFAULTS = {
  draft: 'data/events/catalog/_planning/phase-122-safe-assetref-draft-normalized-v2.json',
  out: 'assets/events/v2/final',
  write: false,
  overwrite: false,
  include2x: false,
  stdoutOnly: false,
  jsonReport: 'data/events/catalog/_planning/phase-124-final-export-dry-run-report.json',
  mdReport: 'data/events/catalog/_planning/phase-124-final-export-dry-run-report.md',
  events: null,
  hero: { width: 1280, quality: 84 },
  fallback: { width: 960, quality: 78 },
  hero2x: { width: 2560, quality: 86, minSourceWidth: 2560 }
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--draft') args.draft = argv[++i];
    else if (t === '--out') args.out = argv[++i];
    else if (t === '--write') args.write = true;
    else if (t === '--overwrite') args.overwrite = true;
    else if (t === '--include-2x') args.include2x = true;
    else if (t === '--stdout-only') args.stdoutOnly = true;
    else if (t === '--events') args.events = argv[++i];
    else if (t === '--json-report') args.jsonReport = argv[++i];
    else if (t === '--md-report') args.mdReport = argv[++i];
  }
  return args;
}

function parseEventFilter(eventsArg) {
  if (!eventsArg) return null;
  return new Set(
    String(eventsArg)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function sha256(absPath) {
  const b = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(b).digest('hex');
}

function toPosix(relOrAbs) {
  return relOrAbs.split(path.sep).join('/');
}

function safeRel(absPath) {
  return toPosix(path.relative(ROOT, absPath));
}

async function imageMeta(absPath) {
  return sharp(absPath).metadata();
}

function wideHeroCompatible(width, height) {
  if (!width || !height) return false;
  const ratio = width / height;
  return ratio >= 1.6;
}

function computeTargetWidth(srcWidth, maxWidth) {
  return srcWidth >= maxWidth ? maxWidth : srcWidth;
}

function estimateBytes(sourceBytes, quality, outputWidth, sourceWidth) {
  if (!sourceBytes || !sourceWidth || !outputWidth) return null;
  const sizeScale = outputWidth / sourceWidth;
  const qualityScale = Math.max(0.45, quality / 100);
  return Math.round(sourceBytes * sizeScale * qualityScale * 0.55);
}

function ensureDir(absPath) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
}

async function writeWebp(sourceAbs, outAbs, width, quality) {
  ensureDir(outAbs);
  await sharp(sourceAbs)
    .resize({ width, withoutEnlargement: true, fit: 'inside' })
    .webp({ quality })
    .toFile(outAbs);
}

function buildOutputPaths(eventId, outBase) {
  const base = path.resolve(ROOT, outBase, eventId);
  return {
    hero: path.join(base, 'hero.webp'),
    fallback: path.join(base, 'fallback.webp'),
    hero2x: path.join(base, 'hero@2x.webp')
  };
}

function markdownReport(report) {
  const lines = [];
  lines.push('# Phase 124 Final Export Dry Run Report');
  lines.push('');
  lines.push(`- mode: ${report.mode}`);
  lines.push(`- draft: \`${report.draft}\``);
  lines.push(`- out: \`${report.out}\``);
  lines.push(`- eventsChecked: ${report.eventsChecked}`);
  lines.push(`- sourceCandidatesChecked: ${report.sourceCandidatesChecked}`);
  lines.push(`- plannedHero: ${report.counts.plannedHero}`);
  lines.push(`- plannedFallback: ${report.counts.plannedFallback}`);
  lines.push(`- plannedHero2x: ${report.counts.plannedHero2x}`);
  lines.push(`- skippedHero2x: ${report.counts.skippedHero2x}`);
  lines.push(`- writtenFiles: ${report.counts.writtenFiles}`);
  lines.push(`- conflicts: ${report.counts.conflicts}`);
  lines.push(`- missingSources: ${report.counts.missingSources}`);
  lines.push(`- invalidFormats: ${report.counts.invalidFormats}`);
  lines.push(`- errors: ${report.errors.length}`);
  lines.push(`- warnings: ${report.warnings.length}`);
  lines.push(`- sharpVersion: ${report.sharpVersion || 'unknown'}`);
  lines.push('');
  if (report.errors.length) {
    lines.push('## Errors');
    report.errors.forEach((e) => lines.push(`- ${e}`));
    lines.push('');
  }
  if (report.warnings.length) {
    lines.push('## Warnings');
    report.warnings.forEach((w) => lines.push(`- ${w}`));
    lines.push('');
  }
  lines.push('## Items');
  for (const item of report.items) {
    lines.push(`- ${item.eventId}: ${item.status} | ratio=${item.source?.ratio ?? 'n/a'} | planned=${item.plannedOutputs.length} | written=${item.writtenOutputs.length}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const draftAbs = path.resolve(ROOT, args.draft);

  if (!fs.existsSync(draftAbs)) {
    console.error(JSON.stringify({ ok: false, error: 'draft_not_found', draft: args.draft }, null, 2));
    process.exit(2);
  }

  const draft = JSON.parse(fs.readFileSync(draftAbs, 'utf8'));
  const allEvents = draft && draft.events ? Object.entries(draft.events) : [];
  const filterSet = parseEventFilter(args.events);
  const events = filterSet
    ? allEvents.filter(([eventId]) => filterSet.has(eventId))
    : allEvents;

  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: args.write ? 'write' : 'dry_run',
    wouldWrite: args.write,
    overwrite: args.overwrite,
    include2x: args.include2x,
    eventFilter: filterSet ? Array.from(filterSet) : null,
    draft: toPosix(args.draft),
    out: toPosix(args.out),
    sharpVersion: sharp.versions ? sharp.versions.sharp : null,
    eventsChecked: events.length,
    sourceCandidatesChecked: 0,
    counts: {
      plannedHero: 0,
      plannedFallback: 0,
      plannedHero2x: 0,
      skippedHero2x: 0,
      writtenFiles: 0,
      conflicts: 0,
      missingSources: 0,
      invalidFormats: 0
    },
    totalPlannedOutputBytesEstimate: 0,
    missingSources: [],
    invalidFormats: [],
    conflicts: [],
    errors: [],
    warnings: [],
    items: []
  };

  for (const [eventId, eventData] of events) {
    const assetRefs = eventData && eventData.assetRefs ? eventData.assetRefs : {};
    const sourceRel = assetRefs.sourceCandidate;
    const sourceAbs = path.resolve(ROOT, sourceRel || '');

    const item = {
      eventId,
      revisionStatus: assetRefs.revisionStatus || null,
      sourceCandidate: sourceRel || null,
      source: null,
      status: 'pending',
      plannedOutputs: [],
      skippedOutputs: [],
      writtenOutputs: [],
      conflicts: []
    };

    report.sourceCandidatesChecked += 1;

    if (!sourceRel || !fs.existsSync(sourceAbs)) {
      item.status = 'missing_source';
      report.counts.missingSources += 1;
      report.missingSources.push({ eventId, sourceCandidate: sourceRel || null });
      report.items.push(item);
      continue;
    }

    try {
      const stat = fs.statSync(sourceAbs);
      const meta = await imageMeta(sourceAbs);
      const width = meta.width || 0;
      const height = meta.height || 0;
      const ratio = height > 0 ? Number((width / height).toFixed(4)) : null;
      const wide = wideHeroCompatible(width, height);

      item.source = {
        exists: true,
        bytes: stat.size,
        sha256: sha256(sourceAbs),
        width,
        height,
        ratio,
        format: meta.format || null,
        wideHeroCompatible: wide
      };

      if (!wide) {
        item.status = 'invalid_format';
        report.counts.invalidFormats += 1;
        report.invalidFormats.push({ eventId, sourceCandidate: sourceRel, ratio });
        report.items.push(item);
        continue;
      }

      const targets = buildOutputPaths(eventId, args.out);
      const planned = [
        {
          key: 'hero',
          absPath: targets.hero,
          relPath: safeRel(targets.hero),
          quality: DEFAULTS.hero.quality,
          width: computeTargetWidth(width, DEFAULTS.hero.width)
        },
        {
          key: 'fallback',
          absPath: targets.fallback,
          relPath: safeRel(targets.fallback),
          quality: DEFAULTS.fallback.quality,
          width: computeTargetWidth(width, DEFAULTS.fallback.width)
        }
      ];

      if (args.include2x) {
        if (width >= DEFAULTS.hero2x.minSourceWidth) {
          planned.push({
            key: 'hero2x',
            absPath: targets.hero2x,
            relPath: safeRel(targets.hero2x),
            quality: DEFAULTS.hero2x.quality,
            width: computeTargetWidth(width, DEFAULTS.hero2x.width)
          });
        } else {
          item.skippedOutputs.push({
            key: 'hero2x',
            reason: 'source_too_small_without_upscale',
            requiredMinWidth: DEFAULTS.hero2x.minSourceWidth,
            sourceWidth: width
          });
          report.counts.skippedHero2x += 1;
        }
      }

      for (const p of planned) {
        const exists = fs.existsSync(p.absPath);
        const estimatedBytes = estimateBytes(stat.size, p.quality, p.width, width);
        const row = {
          key: p.key,
          path: toPosix(p.relPath),
          quality: p.quality,
          width: p.width,
          estimatedBytes,
          exists,
          action: 'planned'
        };

        if (p.key === 'hero') report.counts.plannedHero += 1;
        if (p.key === 'fallback') report.counts.plannedFallback += 1;
        if (p.key === 'hero2x') report.counts.plannedHero2x += 1;

        if (estimatedBytes) report.totalPlannedOutputBytesEstimate += estimatedBytes;

        if (exists && !args.overwrite) {
          row.action = 'conflict_skip_existing';
          item.conflicts.push({ key: p.key, path: row.path, reason: 'target_exists_no_overwrite' });
          report.counts.conflicts += 1;
          report.conflicts.push({ eventId, key: p.key, path: row.path, reason: 'target_exists_no_overwrite' });
        } else if (args.write) {
          await writeWebp(sourceAbs, p.absPath, p.width, p.quality);
          const outMeta = await imageMeta(p.absPath);
          const outStat = fs.statSync(p.absPath);
          const outHash = sha256(p.absPath);
          row.action = exists ? 'overwritten' : 'written';
          row.outputBytes = outStat.size;
          row.outputSha256 = outHash;
          row.outputWidth = outMeta.width || null;
          row.outputHeight = outMeta.height || null;
          item.writtenOutputs.push({ key: p.key, path: row.path });
          report.counts.writtenFiles += 1;
        }

        item.plannedOutputs.push(row);
      }

      item.status = item.conflicts.length ? 'planned_with_conflicts' : (args.write ? 'written_or_planned' : 'planned_dry_run');
    } catch (err) {
      item.status = 'error';
      report.errors.push(`${eventId}: ${err.message}`);
    }

    report.items.push(item);
  }

  if (!args.write) {
    report.warnings.push('dry_run_only_no_files_written');
  }

  const jsonOutAbs = path.resolve(ROOT, args.jsonReport);
  const mdOutAbs = path.resolve(ROOT, args.mdReport);

  if (!args.stdoutOnly) {
    ensureDir(jsonOutAbs);
    ensureDir(mdOutAbs);
    fs.writeFileSync(jsonOutAbs, JSON.stringify(report, null, 2));
    fs.writeFileSync(mdOutAbs, markdownReport(report));
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message, stack: err.stack }, null, 2));
  process.exit(1);
});
