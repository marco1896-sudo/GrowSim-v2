#!/usr/bin/env node
/* eslint-env node */

/**
 * Draft-only AssetRef validator for Event System V2.
 *
 * This script is intentionally non-mutating for product files:
 * - it does not edit event JSON
 * - it does not create final assets
 * - it does not activate assetRefs
 *
 * The only default write is the planning report JSON under _planning.
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DEFAULT_DRAFT_INPUT = "data/events/catalog/_planning/phase-113-safe-assetref-draft.json";
const DEFAULT_SCHEMA_INPUT = "data/events/catalog/_planning/phase-115-assetref-schema-draft.json";
const DEFAULT_REPORT = "data/events/catalog/_planning/phase-117-assetref-validation-report.json";
const EVENT_DIR = "data/events/catalog/events";

const ALLOWED_STATUS = new Set(["trial_asset_set_v1"]);
const ALLOWED_REVISION_STATUS = new Set([
  "ready",
  "usable_with_watch",
  "temporary_usable_needs_revision",
]);
const FORBIDDEN_PRODUCT_PATH_PARTS = [
  "_trial_export",
  "maual-import",
  "_manual_import",
];

function parseArgs(argv) {
  const options = {
    mode: "draft",
    input: DEFAULT_DRAFT_INPUT,
    eventsDir: EVENT_DIR,
    report: DEFAULT_REPORT,
    stdoutOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--mode") {
      options.mode = argv[i + 1] || options.mode;
      i += 1;
    } else if (arg === "--active") {
      options.mode = "active";
    } else if (arg === "--input" || arg === "--draft") {
      options.input = argv[i + 1] || options.input;
      i += 1;
    } else if (arg === "--events") {
      options.eventsDir = argv[i + 1] || options.eventsDir;
      i += 1;
    } else if (arg === "--report") {
      options.report = argv[i + 1] || options.report;
      i += 1;
    } else if (arg === "--stdout-only") {
      options.stdoutOnly = true;
    } else if (arg === "--schema") {
      options.input = DEFAULT_SCHEMA_INPUT;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  if (!["draft", "active"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }

  return options;
}

function printHelp() {
  console.log(`Event V2 AssetRef Validation Draft

Usage:
  node dev/run-event-v2-assetref-validation.draft.js
  node dev/run-event-v2-assetref-validation.draft.js --mode draft --input <json>
  node dev/run-event-v2-assetref-validation.draft.js --draft <json>
  node dev/run-event-v2-assetref-validation.draft.js --mode active
  node dev/run-event-v2-assetref-validation.draft.js --active --events <dir>

Options:
  --mode draft|active    Validate planning draft or active event catalog.
  --active               Alias for --mode active.
  --input <path>         Draft input JSON path.
  --draft <path>         Alias for --input <path> in draft mode.
  --events <dir>         Event catalog directory for active mode (default: data/events/catalog/events).
  --schema               Validate phase-115 schema draft shape.
  --report <path>        Planning report output path.
  --stdout-only          Do not write report file.
`);
}

function resolveWorkspacePath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function readJson(relativePath) {
  const absolute = resolveWorkspacePath(relativePath);
  const raw = fs.readFileSync(absolute, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function fileExists(relativePath) {
  if (!relativePath || typeof relativePath !== "string") {
    return false;
  }
  return fs.existsSync(resolveWorkspacePath(relativePath));
}

function listEventFiles(dir) {
  const absolute = resolveWorkspacePath(dir);
  const result = [];
  if (!fs.existsSync(absolute)) {
    return result;
  }

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const full = path.join(absolute, entry.name);
    if (entry.isDirectory()) {
      const relative = path.relative(ROOT, full).replace(/\\/g, "/");
      result.push(...listEventFiles(relative));
    } else if (entry.isFile() && entry.name.endsWith(".event.json")) {
      result.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  }

  return result.sort();
}

function pushIssue(report, level, eventId, code, message, details = {}) {
  report[level].push({
    eventId: eventId || null,
    code,
    message,
    ...details,
  });
}

function validateString(report, level, eventId, value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    pushIssue(report, level, eventId, `invalid_${fieldName}`, `${fieldName} must be a non-empty string.`);
    return false;
  }
  return true;
}

function containsForbiddenPathPart(value) {
  return FORBIDDEN_PRODUCT_PATH_PARTS.find((part) => value.includes(part));
}

function validateProductPath(report, mode, eventId, refs, fieldName) {
  const value = refs[fieldName];
  if (!validateString(report, "errors", eventId, value, fieldName)) {
    return;
  }

  const forbidden = containsForbiddenPathPart(value);
  if (forbidden) {
    pushIssue(
      report,
      "errors",
      eventId,
      `forbidden_${fieldName}_path`,
      `${fieldName} must not reference ${forbidden}.`,
      { path: value }
    );
  }

  if (!value.startsWith("assets/events/v2/final/")) {
    pushIssue(
      report,
      mode === "active" ? "errors" : "warnings",
      eventId,
      `${fieldName}_not_final_path`,
      `${fieldName} should point to assets/events/v2/final/ before activation.`,
      { path: value }
    );
  }

  if (!fileExists(value)) {
    pushIssue(
      report,
      mode === "active" ? "errors" : "infos",
      eventId,
      mode === "active" ? `missing_${fieldName}` : "planned_not_exported_yet",
      mode === "active"
        ? `${fieldName} target is missing and cannot be active.`
        : `${fieldName} target is planned but not exported yet.`,
      { field: fieldName, path: value }
    );
  }
}

function normalizeRevisionStatus(report, eventId, refs) {
  if (typeof refs.revisionStatus === "string") {
    return refs.revisionStatus;
  }

  if (typeof refs.trialCategory === "string") {
    pushIssue(
      report,
      "warnings",
      eventId,
      "legacy_trialCategory_used",
      "Draft uses legacy trialCategory; validator normalizes it as revisionStatus for this phase.",
      { trialCategory: refs.trialCategory }
    );
    return refs.trialCategory;
  }

  return undefined;
}

function validateAssetRefs(report, mode, eventId, refs, trialSetEntry) {
  report.assetRefsChecked += 1;

  validateProductPath(report, mode, eventId, refs, "hero");
  validateProductPath(report, mode, eventId, refs, "fallback");

  if (typeof refs.hero2x !== "undefined") {
    if (validateString(report, "errors", eventId, refs.hero2x, "hero2x")) {
      const forbidden = containsForbiddenPathPart(refs.hero2x);
      if (forbidden) {
        pushIssue(report, "errors", eventId, "forbidden_hero2x_path", "hero2x must not reference forbidden staging/import paths.", {
          path: refs.hero2x,
        });
      }
    }
  }

  if (validateString(report, "errors", eventId, refs.sourceCandidate, "sourceCandidate")) {
    if (!refs.sourceCandidate.includes("assets/events/v2/_generated/")) {
      pushIssue(
        report,
        "warnings",
        eventId,
        "sourceCandidate_unexpected_base",
        "sourceCandidate should point to a generated review candidate.",
        { path: refs.sourceCandidate }
      );
    }

    if (containsForbiddenPathPart(refs.sourceCandidate)) {
      pushIssue(report, "errors", eventId, "forbidden_sourceCandidate_path", "sourceCandidate must not point to import or trial-export folders.", {
        path: refs.sourceCandidate,
      });
    }

    if (!fileExists(refs.sourceCandidate)) {
      pushIssue(
        report,
        mode === "active" ? "errors" : "warnings",
        eventId,
        "missing_sourceCandidate",
        "sourceCandidate file should exist before activation planning continues.",
        { path: refs.sourceCandidate }
      );
    }
  }

  if (!ALLOWED_STATUS.has(refs.status)) {
    pushIssue(report, "errors", eventId, "invalid_status", "status must be trial_asset_set_v1.", {
      status: refs.status,
    });
  }

  const revisionStatus = normalizeRevisionStatus(report, eventId, refs);
  if (!ALLOWED_REVISION_STATUS.has(revisionStatus)) {
    pushIssue(report, "errors", eventId, "invalid_revisionStatus", "revisionStatus must be an allowed trial category.", {
      revisionStatus,
    });
  } else {
    report.statusCounts[revisionStatus] += 1;
  }

  if (refs.sourcePhase && refs.sourcePhase !== "phase-112") {
    pushIssue(report, "warnings", eventId, "unexpected_sourcePhase", "sourcePhase should be phase-112 for this rollout.", {
      sourcePhase: refs.sourcePhase,
    });
  } else if (!refs.sourcePhase) {
    pushIssue(report, "warnings", eventId, "missing_sourcePhase", "sourcePhase is missing; phase-112 is expected for this rollout.");
  }

  if (typeof refs.notes !== "undefined" && !Array.isArray(refs.notes)) {
    pushIssue(report, "errors", eventId, "invalid_notes", "notes must be an array when present.");
  }

  if (trialSetEntry && trialSetEntry.status === "reject") {
    pushIssue(report, "errors", eventId, "reject_asset_referenced", "Reject assets must not receive AssetRefs.");
  }
}

function createBaseReport(mode) {
  return {
    ok: true,
    mode,
    eventsChecked: 0,
    assetRefsChecked: 0,
    errors: [],
    warnings: [],
    infos: [],
    statusCounts: {
      ready: 0,
      usable_with_watch: 0,
      temporary_usable_needs_revision: 0,
    },
    catalog: {
      eventFilesChecked: 0,
      activeAssetRefsFound: 0,
      coverSrcFound: 0,
      coverFallbackFound: 0,
      coverWarnings: [],
    },
  };
}

function loadTrialSetByEventId() {
  const trialPath = "data/events/catalog/_planning/phase-112-trial-asset-set-v1.json";
  if (!fileExists(trialPath)) {
    return new Map();
  }

  const trialEntries = readJson(trialPath);
  return new Map(trialEntries.map((entry) => [entry.eventId, entry]));
}

function validateCatalogReadOnly(report, eventsDir) {
  const files = listEventFiles(eventsDir || EVENT_DIR);
  report.catalog.eventFilesChecked = files.length;

  for (const file of files) {
    const event = readJson(file);
    const eventId = event.id || path.basename(file, ".event.json");
    report.eventsChecked += 1;

    if (event.assetRefs) {
      report.catalog.activeAssetRefsFound += 1;
    }

    if (event.assets && event.assets.cover && typeof event.assets.cover.src === "string") {
      report.catalog.coverSrcFound += 1;
    } else {
      report.catalog.coverWarnings.push({ eventId, code: "missing_assets_cover_src" });
      pushIssue(report, "warnings", eventId, "missing_assets_cover_src", "Active catalog event has no assets.cover.src.");
    }

    if (event.assets && event.assets.cover && typeof event.assets.cover.fallback === "string") {
      report.catalog.coverFallbackFound += 1;
    } else {
      report.catalog.coverWarnings.push({ eventId, code: "missing_assets_cover_fallback" });
      pushIssue(report, "warnings", eventId, "missing_assets_cover_fallback", "Active catalog event has no assets.cover.fallback.");
    }

    if (event.assetRefs) {
      validateAssetRefs(report, "active", eventId, event.assetRefs, null);
    }
  }
}

function validateSchemaDraft(report, schema) {
  const requiredFields = ["hero", "fallback", "sourceCandidate", "status", "revisionStatus", "sourcePhase"];
  for (const field of requiredFields) {
    if (!schema.fields || !schema.fields[field] || schema.fields[field].required !== true) {
      pushIssue(report, "errors", null, "schema_missing_required_field", `Schema draft must define required field ${field}.`);
    }
  }

  if (!schema.fields || !schema.fields.hero2x || schema.fields.hero2x.required !== false) {
    pushIssue(report, "warnings", null, "hero2x_optional_not_confirmed", "Schema should keep hero2x optional.");
  }
}

function validateDraftInput(report, inputPath) {
  const draft = readJson(inputPath);
  validateCatalogReadOnly(report, EVENT_DIR);

  if (draft.fields && draft.schemaVersion) {
    validateSchemaDraft(report, draft);
    pushIssue(report, "infos", null, "schema_draft_validated", "Validated phase-115 schema draft shape.");
    return;
  }

  if (!draft.events || typeof draft.events !== "object") {
    pushIssue(report, "errors", null, "draft_events_missing", "Draft input must contain an events object.");
    return;
  }

  const trialSetByEventId = loadTrialSetByEventId();
  const draftEvents = Object.entries(draft.events);
  report.eventsChecked = draftEvents.length;

  for (const [eventId, entry] of draftEvents) {
    if (!entry || typeof entry !== "object" || !entry.assetRefs) {
      pushIssue(report, "errors", eventId, "assetRefs_missing", "Draft event entry must contain assetRefs.");
      continue;
    }

    if (!trialSetByEventId.has(eventId)) {
      pushIssue(report, "warnings", eventId, "trial_set_entry_missing", "Event is missing from phase-112 trial asset set.");
    }

    validateAssetRefs(report, "draft", eventId, entry.assetRefs, trialSetByEventId.get(eventId));
  }
}

function validateActiveMode(report, eventsDir) {
  validateCatalogReadOnly(report, eventsDir || EVENT_DIR);
  if (report.assetRefsChecked === 0) {
    pushIssue(report, "infos", null, "no_active_assetRefs_found", "No active assetRefs are present in catalog event files yet.");
  }
}

function writeReport(options, report) {
  report.ok = report.errors.length === 0;
  const json = JSON.stringify(report, null, 2);
  console.log(json);

  if (!options.stdoutOnly) {
    const reportPath = resolveWorkspacePath(options.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${json}\n`, "utf8");
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = createBaseReport(options.mode);

  report.input = options.mode === "draft" ? options.input : options.eventsDir;
  report.reportPath = options.stdoutOnly ? null : options.report;
  report.draftOnly = true;
  report.mutatesProductFiles = false;

  if (options.mode === "draft") {
    validateDraftInput(report, options.input);
  } else {
    validateActiveMode(report, options.eventsDir);
  }

  writeReport(options, report);
  process.exit(report.errors.length === 0 ? 0 : 1);
}

try {
  main();
} catch (error) {
  const report = createBaseReport("unknown");
  pushIssue(report, "errors", null, "script_failed", error.message);
  writeReport({ stdoutOnly: true }, report);
  process.exit(1);
}
