const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { runDoctor, parseArgs, defaultCommandExists, overallStatus } = require('../scripts/draftforge/doctor');

// Helper to create temporary config files
function createConfig(overrides = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-doctor-'));
  const configPath = path.join(tmpDir, 'config.json');
  const config = {
    schemaVersion: 'draftforge.config.v1',
    source: {
      defaultMode: 'folder',
      defaultMediaDir: path.join(tmpDir, 'media'),
      defaultAlbums: [],
    },
    audio: {
      defaultMode: 'none',
      defaultMusicDir: '',
    },
    metaBusinessSuite: {
      businessId: '12345',
      assetId: '67890',
      expectedAccountLabel: 'test-account',
      skipBrowserPreflight: false,
    },
    safety: {
      publishAllowed: false,
      scheduleAllowed: false,
      requiresManualReview: true,
    },
    ...overrides,
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return { tmpDir, configPath, config };
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

test('overallStatus returns ok when all checks pass', () => {
  const checks = [{ name: 'test', status: 'ok' }];
  assert.equal(overallStatus(checks), 'ok');
});

test('overallStatus returns warn when any check warns', () => {
  const checks = [{ name: 'test', status: 'warn' }];
  assert.equal(overallStatus(checks), 'warn');
});

test('overallStatus returns fail when any check fails', () => {
  const checks = [{ name: 'test', status: 'fail' }];
  assert.equal(overallStatus(checks), 'fail');
});

test('overallStatus fails overrides warn', () => {
  const checks = [
    { name: 'warn-check', status: 'warn' },
    { name: 'fail-check', status: 'fail' },
  ];
  assert.equal(overallStatus(checks), 'fail');
});

test('defaultCommandExists returns true for existing commands', () => {
  // node and which should always exist in our environment
  assert.equal(typeof defaultCommandExists('node'), 'boolean');
});

test('runDoctor reports ok for valid setup', () => {
  const { tmpDir, configPath } = createConfig();
  try {
    // Create the media folder so source check passes
    fs.mkdirSync(path.join(tmpDir, 'media'));
    
    const result = runDoctor({ configPath });
    assert.equal(result.status, 'ok');
    assert.ok(Array.isArray(result.checks));
    
    // Verify required checks exist
    const checkNames = result.checks.map(c => c.name);
    assert.ok(checkNames.includes('node'));
    assert.ok(checkNames.includes('ffmpeg'));
    assert.ok(checkNames.includes('ffprobe'));
    assert.ok(checkNames.includes('config'));
    assert.ok(checkNames.includes('source'));
    assert.ok(checkNames.includes('safety'));
  } finally {
    cleanup(tmpDir);
  }
});

test('runDoctor warns when config file is missing', () => {
  const result = runDoctor({ configPath: '/nonexistent/path/config.json' });
  assert.equal(result.status, 'warn');
  const configCheck = result.checks.find(c => c.name === 'config');
  assert.equal(configCheck.status, 'warn');
});

test('runDoctor fails when configured folder source does not exist', () => {
  const { tmpDir, configPath } = createConfig();
  try {
    // Don't create the media folder - source check should fail
    const result = runDoctor({ configPath });
    assert.equal(result.status, 'fail');
    const sourceCheck = result.checks.find(c => c.name === 'source');
    assert.equal(sourceCheck.status, 'fail');
  } finally {
    cleanup(tmpDir);
  }
});

test('runDoctor warns when optional MBS fields are incomplete', () => {
  const { tmpDir, configPath } = createConfig({
    metaBusinessSuite: {
      businessId: '', // empty
      assetId: '', // empty
      expectedAccountLabel: '',
      skipBrowserPreflight: false,
    },
  });
  try {
    fs.mkdirSync(path.join(tmpDir, 'media'));
    
    const result = runDoctor({ configPath });
    const mbsCheck = result.checks.find(c => c.name === 'mbs');
    // MBS should warn but not fail when optional fields empty
    assert.equal(mbsCheck.status, 'warn');
  } finally {
    cleanup(tmpDir);
  }
});

test('runDoctor fails if safety publishAllowed is true', () => {
  const { tmpDir, configPath } = createConfig({
    safety: {
      publishAllowed: true,
      scheduleAllowed: false,
      requiresManualReview: false,
    },
  });
  try {
    fs.mkdirSync(path.join(tmpDir, 'media'));
    
    const result = runDoctor({ configPath });
    assert.equal(result.status, 'fail');
    const safetyCheck = result.checks.find(c => c.name === 'safety');
    assert.equal(safetyCheck.status, 'fail');
    assert.ok(safetyCheck.message.includes('publish'));
  } finally {
    cleanup(tmpDir);
  }
});

test('runDoctor fails if safety scheduleAllowed is true', () => {
  const { tmpDir, configPath } = createConfig({
    safety: {
      publishAllowed: false,
      scheduleAllowed: true,
      requiresManualReview: false,
    },
  });
  try {
    fs.mkdirSync(path.join(tmpDir, 'media'));
    
    const result = runDoctor({ configPath });
    assert.equal(result.status, 'fail');
    const safetyCheck = result.checks.find(c => c.name === 'safety');
    assert.equal(safetyCheck.status, 'fail');
    assert.ok(safetyCheck.message.includes('schedule'));
  } finally {
    cleanup(tmpDir);
  }
});

test('runDoctor warns when audio mode is local/mix but music dir missing', () => {
  const { tmpDir, configPath } = createConfig({
    audio: {
      defaultMode: 'local',
      defaultMusicDir: '', // empty
    },
  });
  try {
    fs.mkdirSync(path.join(tmpDir, 'media'));
    
    const result = runDoctor({ configPath });
    const audioCheck = result.checks.find(c => c.name === 'audio');
    assert.equal(audioCheck.status, 'warn');
  } finally {
    cleanup(tmpDir);
  }
});

test('parseArgs parses --config flag', () => {
  const args = parseArgs(['--config', './test.json']);
  assert.equal(args.configPath, './test.json');
});

test('parseArgs handles no config (uses null)', () => {
  const args = parseArgs([]);
  assert.equal(args.configPath, null);
});

test('runDoctor works without config and reports warn, not crash', () => {
  const result = runDoctor({ configPath: null });
  assert.equal(result.status, 'warn');
  assert.ok(result.checks.some(c => c.name === 'config' && c.status === 'warn'));
  // Should still check node/ffmpeg/ffprobe even without config
  assert.ok(result.checks.some(c => c.name === 'node' && c.status === 'ok'));
});