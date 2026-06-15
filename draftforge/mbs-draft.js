#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const { loadConfig } = require('./config');

const FORBIDDEN_ACTIONS = new Set(['publish', 'schedule', 'boost', 'delete', 'payment', 'permission', 'password']);
const ALLOWED_DRAFT_ACTIONS = ['open-composer', 'verify-account', 'upload-media', 'enter-caption', 'finish-later', 'collect-proof'];

function loadManifest(manifestPath) {
  if (!manifestPath) throw new Error('Missing --manifest path.');
  return JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8'));
}

function validateDraftManifest(manifest) {
  if (manifest.schemaVersion !== 'draftforge.manifest.v1') {
    throw new Error(`Unsupported manifest schema: ${manifest.schemaVersion}`);
  }
  if (!Array.isArray(manifest.cards) || manifest.cards.length === 0) {
    throw new Error('Manifest has no cards.');
  }
  if (manifest.safety?.publishAllowed !== false) {
    throw new Error('Refusing MBS draft: manifest does not explicitly forbid publish.');
  }
  if (manifest.safety?.scheduleAllowed !== false) {
    throw new Error('Refusing MBS draft: manifest does not explicitly forbid schedule.');
  }
  return true;
}

function validateMbsConfig(config, allowLiveMutation) {
  if (!allowLiveMutation) {
    return { valid: true, status: 'dry-run' };
  }
  const mbs = config?.metaBusinessSuite || {};
  const missing = ['businessId', 'assetId', 'expectedAccountLabel'].filter((field) => !String(mbs[field] || '').trim());
  if (missing.length > 0) {
    return {
      valid: false,
      status: 'missing-config',
      missingFields: missing,
    };
  }
  return { valid: true, status: 'ready-for-live-draft' };
}

function buildMbsDraftRunPlan(manifest, options = {}) {
  validateDraftManifest(manifest);
  const allowLiveMutation = Boolean(options.allowLiveMutation);
  const dryRun = Boolean(options.dryRun || !allowLiveMutation);
  return {
    status: dryRun ? 'dry-run' : 'ready-for-live-draft',
    allowLiveMutation,
    draftOnly: true,
    cardCount: manifest.cards.length,
    allowedActions: ALLOWED_DRAFT_ACTIONS,
    forbiddenActions: [...FORBIDDEN_ACTIONS],
    safety: {
      publishAllowed: false,
      scheduleAllowed: false,
      requiresManualReview: true,
    },
  };
}

function resolvePackDir(manifestPath) {
  return path.dirname(path.resolve(manifestPath || '.'));
}

function convertManifestToBundle(manifest, packDir, captionText) {
  const resolvedPackDir = resolvePackDir(packDir);
  const cards = manifest.cards;
  const caption = typeof captionText === 'string'
    ? captionText
    : (fs.existsSync(path.join(resolvedPackDir, manifest.outputs?.captionPath || 'caption.txt'))
        ? fs.readFileSync(path.join(resolvedPackDir, manifest.outputs?.captionPath || 'caption.txt'), 'utf8').trim()
        : '');

  return {
    source_album: manifest.source.type === 'photos' ? manifest.source.names.join(', ') : 'folder-source',
    source_album_uuid: null,
    selected_asset_ids: cards.map((card) => card.assetId),
    exported_file_paths: Object.fromEntries(
      cards.map((card) => [card.assetId, path.join(resolvedPackDir, card.outputPath)])
    ),
    asset_order: Object.fromEntries(cards.map((card, idx) => [card.assetId, idx + 1])),
    caption_draft: caption,
    hook_draft: manifest.audio?.mode || 'none',
    posting_notes: '',
    approval_status: 'pending',
    draft_status: 'prepared',
    ordered_media: {
      asset_metadata_by_id: Object.fromEntries(
        cards.map((card) => [card.assetId, {
          media_kind: card.outputMediaKind,
          source_folder: card.sourceName,
          staged_file_name: path.basename(card.outputPath),
        }])
      ),
    },
  };
}

function buildRunnerConfig({ bundlePath, outDir, assetId, businessId, expectedAccountLabel, skipBrowserPreflight }) {
  return {
    bundlePath: path.resolve(bundlePath),
    outRoot: outDir,
    host: '127.0.0.1',
    port: 18800,
    assetId,
    businessId,
    expectedAccountLabel,
    skipBrowserPreflight: !!skipBrowserPreflight,
    allowUpload: true,
    allowCaptionEntry: true,
    allowDraftSave: true,
    browserProvider: 'persistent-playwright',
  };
}

async function runMbsDraft(options = {}) {
  const config = loadConfig(options.configPath);
  const mbsConfig = config?.metaBusinessSuite || {};
  const manifest = loadManifest(options.manifestPath);
  const plan = buildMbsDraftRunPlan(manifest, options);
  if (!options.allowLiveMutation) {
    return {
      ...plan,
      manifestVerified: true,
      manifestPath: options.manifestPath,
      configLoaded: Boolean(config),
      message: 'Live MBS execution disabled. Use --allow-live-mutation to proceed.',
    };
  }

  // Preflight validation for MBS config in live mode
  const configValidation = validateMbsConfig(config, true);
  if (!configValidation.valid) {
    return {
      ...plan,
      status: 'missing-config',
      manifestVerified: true,
      manifestPath: options.manifestPath,
      configLoaded: Boolean(config),
      missingFields: configValidation.missingFields,
      message: `MBS config incomplete (missing: ${configValidation.missingFields.join(', ')}). Set these in your config file.`,
    };
  }

  const packDir = resolvePackDir(options.manifestPath);
  const outDir = path.join(packDir, 'mbs-run-' + Date.now().toString(36));
  const runnerConfig = buildRunnerConfig({
    bundlePath: options.manifestPath,
    outDir,
    assetId: options.assetId || process.env.MBS_ASSET_ID || mbsConfig.assetId,
    businessId: options.businessId || process.env.MBS_BUSINESS_ID || mbsConfig.businessId,
    expectedAccountLabel: options.expectedAccountLabel || process.env.MBS_ACCOUNT_LABEL || mbsConfig.expectedAccountLabel,
    skipBrowserPreflight: options.skipBrowserPreflight ?? mbsConfig.skipBrowserPreflight,
  });

  // The existing runner expects a bundle file. Write one.
  const bundlePath = path.join(outDir, 'bundle.json');
  fs.mkdirSync(outDir, { recursive: true });
  const bundle = convertManifestToBundle(manifest, packDir);
  fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));

  // Use the existing runner entry point
  const runnerArgs = [
    '--bundle-path', bundlePath,
    '--asset-id', runnerConfig.assetId,
    '--business-id', runnerConfig.businessId,
    '--expected-account-label', runnerConfig.expectedAccountLabel,
    '--out-root', runnerConfig.outRoot,
    '--skip-browser-preflight',
  ];

  // Execute via spawn
  const { spawnSync } = require('node:child_process');
  const runnerResult = spawnSync('node', [path.join(path.dirname(require.main?.filename || '.'), '..', 'scripts', 'instagram', 'meta-business-suite-runner.js'), ...runnerArgs], {
    encoding: 'utf8',
    timeout: 300000,
  });

  return {
    ...plan,
    status: runnerResult.status === 0 ? 'executed' : 'runner-failed',
    outDir,
    bundlePath,
    runnerExitCode: runnerResult.status,
    stdout: runnerResult.stdout?.slice(0, 2000) || null,
    stderr: runnerResult.stderr?.slice(0, 2000) || null,
    uncertainty: runnerResult.status !== 0 ? 'Runner exited with non-zero status.' : null,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--manifest') args.manifestPath = argv[++i];
    else if (token === '--allow-live-mutation') args.allowLiveMutation = true;
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--asset-id') args.assetId = argv[++i];
    else if (token === '--business-id') args.businessId = argv[++i];
    else if (token === '--expected-account-label') args.expectedAccountLabel = argv[++i];
    else if (token === '--config') args.configPath = argv[++i];
    else if (token === '--browser-provider') args.browserProvider = argv[++i];
    else if (token === '--skip-browser-preflight') args.skipBrowserPreflight = true;
    else if (token === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: mbs-draft.js --manifest <path> [--allow-live-mutation] [--dry-run]');
    console.log('  --asset-id, --business-id, --expected-account-label: override defaults');
    console.log('  --config <path>: load onboarding config values');
    process.exit(0);
  }
  runMbsDraft(args)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.stack || error.message || String(error));
      process.exit(1);
    });
}

module.exports = {
  ALLOWED_DRAFT_ACTIONS,
  FORBIDDEN_ACTIONS,
  buildMbsDraftRunPlan,
  convertManifestToBundle,
  loadManifest,
  parseArgs,
  runMbsDraft,
  validateDraftManifest,
  validateMbsConfig,
};
