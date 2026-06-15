const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { defaultConfig, initConfig, loadConfig } = require('../scripts/draftforge/config');
const { runMbsDraft } = require('../scripts/draftforge/mbs-draft');
const { prepareDraftPack } = require('../scripts/draftforge/prepare');

function makeManifest(packDir) {
  const manifest = {
    schemaVersion: 'draftforge.manifest.v1',
    source: { type: 'folder', names: ['media'] },
    audio: { mode: 'none' },
    cards: [
      {
        order: 1,
        assetId: 'asset-1',
        outputPath: 'media/card-01.mp4',
        outputMediaKind: 'video',
        sourceName: 'media',
      },
    ],
    outputs: { captionPath: 'caption.txt' },
    safety: { publishAllowed: false, scheduleAllowed: false, requiresManualReview: true },
  };
  fs.mkdirSync(path.join(packDir, 'media'), { recursive: true });
  fs.writeFileSync(path.join(packDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(packDir, 'caption.txt'), 'Caption\n');
  return path.join(packDir, 'manifest.json');
}

function makeImage(mediaDir) {
  fs.mkdirSync(mediaDir, { recursive: true });
  const imagePath = path.join(mediaDir, 'card.png');
  const result = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=purple:s=320x400', '-frames:v', '1', imagePath], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'ffmpeg failed');
  return imagePath;
}

test('default DraftForge config template has no account identifiers', () => {
  const config = defaultConfig();
  assert.equal(config.schemaVersion, 'draftforge.config.v1');
  assert.equal(config.metaBusinessSuite.businessId, '');
  assert.equal(config.metaBusinessSuite.assetId, '');
  assert.equal(config.metaBusinessSuite.expectedAccountLabel, '');
  assert.equal(config.safety.publishAllowed, false);
  assert.equal(config.safety.scheduleAllowed, false);
});

test('initConfig writes onboarding config without secrets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-config-'));
  try {
    const outPath = path.join(root, 'draftforge.config.json');
    const result = initConfig({ outPath });
    assert.equal(result.status, 'created');
    const loaded = loadConfig(outPath);
    assert.equal(loaded.metaBusinessSuite.businessId, '');
    assert.equal(loaded.metaBusinessSuite.assetId, '');
    assert.equal(loaded.metaBusinessSuite.expectedAccountLabel, '');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('top-level DraftForge init command creates onboarding config', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-init-cli-'));
  try {
    const outPath = path.join(root, 'draftforge.config.json');
    const result = spawnSync('node', ['scripts/draftforge/index.js', 'init', '--out', outPath], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.command, 'init');
    assert.equal(parsed.result.status, 'created');
    assert.ok(fs.existsSync(outPath));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('mbs-draft dry run loads onboarding config when provided', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-mbs-config-'));
  try {
    const packDir = path.join(root, 'pack');
    fs.mkdirSync(packDir, { recursive: true });
    const manifestPath = makeManifest(packDir);
    const configPath = path.join(root, 'draftforge.config.json');
    initConfig({ outPath: configPath });

    const result = await runMbsDraft({ manifestPath, configPath, dryRun: true });
    assert.equal(result.status, 'dry-run');
    assert.equal(result.configLoaded, true);
    assert.equal(result.manifestVerified, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('prepareDraftPack uses onboarding config defaults when provided', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-prepare-config-'));
  try {
    const mediaDir = path.join(root, 'media');
    makeImage(mediaDir);
    const configPath = path.join(root, 'draftforge.config.json');
    initConfig({ outPath: configPath });
    const config = loadConfig(configPath);
    config.source.defaultMode = 'folder';
    config.source.defaultMediaDir = mediaDir;
    config.audio.defaultMode = 'none';
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    const out = path.join(root, 'pack');
    const result = await prepareDraftPack({ configPath, out, count: 1, imageDurationSeconds: 1 });

    assert.equal(result.manifest.source.type, 'folder');
    assert.equal(result.manifest.audio.mode, 'none');
    assert.equal(result.manifest.cards.length, 1);
    assert.ok(fs.existsSync(path.join(out, result.manifest.cards[0].outputPath)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
