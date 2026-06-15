#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { loadConfig } = require('./config');

function defaultCommandExists(command) {
  const result = spawnSync('which', [command], { encoding: 'utf8' });
  return result.status === 0;
}

function parseArgs(argv) {
  const args = { configPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--config') args.configPath = argv[++i];
    else if (token === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function overallStatus(checks) {
  if (checks.some((check) => check.status === 'fail')) return 'fail';
  if (checks.some((check) => check.status === 'warn')) return 'warn';
  return 'ok';
}

function checkNode(nodeVersion = process.version) {
  if (!nodeVersion) {
    return { name: 'node', status: 'fail', message: 'Node runtime version is unreadable.' };
  }
  return { name: 'node', status: 'ok', message: `Node ${nodeVersion}` };
}

function checkCommand(command, commandExists) {
  const found = commandExists(command);
  return {
    name: command,
    status: found ? 'ok' : 'fail',
    message: found ? `${command} found` : `${command} missing. Install it before rendering media.`,
  };
}

function loadDoctorConfig(configPath) {
  if (!configPath) {
    return {
      config: null,
      check: { name: 'config', status: 'warn', message: 'No config provided. Run draftforge init or pass --config.' },
    };
  }

  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    return {
      config: null,
      check: { name: 'config', status: 'warn', message: `Config not found: ${resolved}` },
    };
  }

  try {
    return {
      config: loadConfig(resolved),
      check: { name: 'config', status: 'ok', message: `Config loaded: ${resolved}` },
    };
  } catch (error) {
    return {
      config: null,
      check: { name: 'config', status: 'fail', message: `Config unreadable: ${error.message}` },
    };
  }
}

function checkSource(config) {
  if (!config) {
    return { name: 'source', status: 'warn', message: 'Source not checked because config is missing.' };
  }

  const source = config.source || {};
  const mode = source.defaultMode || 'folder';
  if (mode === 'folder') {
    const mediaDir = source.defaultMediaDir;
    if (!mediaDir) {
      return { name: 'source', status: 'fail', message: 'Folder source selected but source.defaultMediaDir is empty.' };
    }
    const resolved = path.resolve(mediaDir);
    return fs.existsSync(resolved)
      ? { name: 'source', status: 'ok', message: `Folder source configured: ${resolved}` }
      : { name: 'source', status: 'fail', message: `Folder source does not exist: ${resolved}` };
  }

  if (mode === 'photos') {
    const albums = Array.isArray(source.defaultAlbums) ? source.defaultAlbums : [];
    return albums.length > 0
      ? { name: 'source', status: 'ok', message: `Photos source configured with ${albums.length} album(s).` }
      : { name: 'source', status: 'fail', message: 'Photos source selected but source.defaultAlbums is empty.' };
  }

  return { name: 'source', status: 'fail', message: `Unsupported source.defaultMode: ${mode}` };
}

function checkAudio(config) {
  if (!config) {
    return { name: 'audio', status: 'warn', message: 'Audio not checked because config is missing.' };
  }

  const audio = config.audio || {};
  const mode = audio.defaultMode || 'none';
  if (mode === 'none' || mode === 'original') {
    return { name: 'audio', status: 'ok', message: `Audio mode ${mode} does not require a music folder.` };
  }

  if (mode === 'local' || mode === 'mix') {
    if (!audio.defaultMusicDir) {
      return { name: 'audio', status: 'warn', message: `Audio mode ${mode} needs audio.defaultMusicDir for music files.` };
    }
    const resolved = path.resolve(audio.defaultMusicDir);
    return fs.existsSync(resolved)
      ? { name: 'audio', status: 'ok', message: `Music folder configured: ${resolved}` }
      : { name: 'audio', status: 'fail', message: `Music folder does not exist: ${resolved}` };
  }

  return { name: 'audio', status: 'fail', message: `Unsupported audio.defaultMode: ${mode}` };
}

function checkMbs(config) {
  if (!config) {
    return { name: 'mbs', status: 'warn', message: 'MBS draft assist not checked because config is missing.' };
  }

  const mbs = config.metaBusinessSuite || {};
  const missing = ['businessId', 'assetId', 'expectedAccountLabel'].filter((field) => !String(mbs[field] || '').trim());
  if (missing.length === 0) {
    return { name: 'mbs', status: 'ok', message: 'MBS draft assist fields configured.' };
  }
  return {
    name: 'mbs',
    status: 'warn',
    message: `MBS draft assist incomplete (${missing.join(', ')} missing); prepare/handoff still works.`,
  };
}

function checkSafety(config) {
  if (!config) {
    return { name: 'safety', status: 'warn', message: 'Safety not checked because config is missing.' };
  }

  const safety = config.safety || {};
  if (safety.publishAllowed === false && safety.scheduleAllowed === false) {
    return { name: 'safety', status: 'ok', message: 'Publish and schedule disabled.' };
  }
  return {
    name: 'safety',
    status: 'fail',
    message: 'Refusing unsafe config: safety.publishAllowed and safety.scheduleAllowed must be false.',
  };
}

function runDoctor(options = {}) {
  const commandExists = options.commandExists || defaultCommandExists;
  const { config, check: configCheck } = loadDoctorConfig(options.configPath);
  const checks = [
    checkNode(options.nodeVersion),
    checkCommand('ffmpeg', commandExists),
    checkCommand('ffprobe', commandExists),
    configCheck,
    checkSource(config),
    checkAudio(config),
    checkMbs(config),
    checkSafety(config),
  ];

  return {
    status: overallStatus(checks),
    checks,
  };
}

function printHelp() {
  console.log('Usage: doctor.js [--config <draftforge.config.json>]');
  console.log('Checks DraftForge dependencies, config, source, audio, MBS readiness, and safety.');
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    console.log(JSON.stringify(runDoctor(args), null, 2));
  } catch (error) {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  }
}

module.exports = {
  defaultCommandExists,
  overallStatus,
  parseArgs,
  runDoctor,
};
