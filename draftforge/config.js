const fs = require('node:fs');
const path = require('node:path');

function defaultConfig() {
  return {
    schemaVersion: 'draftforge.config.v1',
    source: {
      defaultMode: 'folder',
      defaultMediaDir: './media',
      defaultAlbums: [],
    },
    audio: {
      defaultMode: 'none',
      defaultMusicDir: './music',
    },
    metaBusinessSuite: {
      businessId: '',
      assetId: '',
      expectedAccountLabel: '',
      skipBrowserPreflight: false,
    },
    safety: {
      publishAllowed: false,
      scheduleAllowed: false,
      requiresManualReview: true,
    },
  };
}

function parseArgs(argv) {
  const args = { outPath: 'draftforge.config.json' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--out') args.outPath = argv[++i];
    else if (token === '--force') args.force = true;
    else if (token === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function initConfig(options = {}) {
  const outPath = path.resolve(options.outPath || 'draftforge.config.json');
  if (fs.existsSync(outPath) && !options.force) {
    throw new Error(`Config already exists: ${outPath}. Use --force to overwrite.`);
  }
  const config = defaultConfig();
  fs.writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`);
  return {
    status: 'created',
    configPath: outPath,
    nextSteps: [
      'Set source.defaultMediaDir or source.defaultAlbums.',
      'Set audio.defaultMusicDir if using local/mix audio.',
      'Set metaBusinessSuite fields only if using guarded MBS draft assist.',
    ],
  };
}

function loadConfig(configPath) {
  if (!configPath) return null;
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) throw new Error(`Config does not exist: ${resolved}`);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function printHelp() {
  console.log('Usage: config.js --out <draftforge.config.json> [--force]');
  console.log('Creates a safe onboarding config template with no credentials or account defaults.');
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    console.log(JSON.stringify(initConfig(args), null, 2));
  } catch (error) {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  }
}

module.exports = {
  defaultConfig,
  initConfig,
  loadConfig,
  parseArgs,
};
