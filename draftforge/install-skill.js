#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE_SKILL_PATH = path.join(__dirname, 'skills', 'social-media', 'social-draft-operator', 'SKILL.md');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--home') args.hermesHome = argv[++i];
    else if (token === '--force') args.force = true;
    else if (token === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function installSkillToHermes(options = {}) {
  const hermesHome = options.hermesHome || process.env.HERMES_HOME || path.join(process.env.HOME, '.hermes');
  const targetDir = path.join(hermesHome, 'skills', 'social-media', 'social-draft-operator');
  const targetPath = path.join(targetDir, 'SKILL.md');

  if (!fs.existsSync(SOURCE_SKILL_PATH)) {
    throw new Error(`Source skill not found: ${SOURCE_SKILL_PATH}`);
  }

  // Check for overwrite
  if (fs.existsSync(targetPath) && !options.force) {
    return {
      status: 'skipped',
      targetPath,
      message: `Skill already installed at ${targetPath}. Use --force to overwrite.`,
    };
  }

  // Create directory structure
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy skill file
  const skillContent = fs.readFileSync(SOURCE_SKILL_PATH, 'utf8');
  fs.writeFileSync(targetPath, skillContent);

  return {
    status: 'installed',
    targetPath,
    sourcePath: SOURCE_SKILL_PATH,
    message: `Skill installed to ${targetPath}`,
  };
}

function printHelp() {
  console.log('Usage: install-skill.js [--home <hermes-home>] [--force]');
  console.log('Installs DraftForge skill to Hermes skills directory.');
  console.log('');
  console.log('Options:');
  console.log('  --home <path>   Hermes home directory (default: ~/.hermes)');
  console.log('  --force         Overwrite existing skill');
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    const result = installSkillToHermes(args);
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'skipped' && process.env.VERBOSE) {
      process.exit(0);
    }
  } catch (error) {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  }
}

module.exports = {
  installSkillToHermes,
  parseArgs,
  SOURCE_SKILL_PATH,
};