#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const { createHandoffZip } = require('./handoff-zip');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--pack') args.packDir = argv[++i];
    else if (token === '--out') args.outPath = argv[++i];
    else if (token === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: handoff.js --pack <draftforge-pack-dir> [--out <zip-path>]');
  console.log('Creates a local zip handoff archive for manual review/upload.');
}

function createHandoff(options = {}) {
  if (!options.packDir) throw new Error('Missing --pack path.');
  const packDir = path.resolve(options.packDir);
  const required = ['manifest.json', 'review.md'];
  for (const rel of required) {
    const filePath = path.join(packDir, rel);
    if (!fs.existsSync(filePath)) throw new Error(`Pack is missing required file: ${rel}`);
  }
  const zipPath = createHandoffZip({ packDir, outPath: options.outPath });
  return {
    status: 'created',
    packDir,
    zipPath,
    draftOnly: true,
    manualReviewRequired: true,
  };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    console.log(JSON.stringify(createHandoff(args), null, 2));
  } catch (error) {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  }
}

module.exports = { createHandoff, parseArgs };
