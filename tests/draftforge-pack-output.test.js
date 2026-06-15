const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { createHandoffZip } = require('../scripts/draftforge/handoff-zip');
const { prepareDraftPack } = require('../scripts/draftforge/prepare');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
}

function makeMedia(root) {
  const media = path.join(root, 'media-source');
  fs.mkdirSync(media, { recursive: true });
  const imagePath = path.join(media, 'card.png');
  run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x400', '-frames:v', '1', imagePath]);
  return media;
}

test('prepareDraftPack emits manifest, caption, review, preview, and media output', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-pack-'));
  try {
    const media = makeMedia(root);
    const out = path.join(root, 'pack');
    const result = await prepareDraftPack({
      source: 'folder',
      media,
      out,
      count: 1,
      audio: 'none',
      caption: 'Test caption from DraftForge.',
      imageDurationSeconds: 1,
    });

    for (const relPath of ['manifest.json', 'caption.txt', 'review.md', 'preview.html']) {
      assert.ok(fs.existsSync(path.join(out, relPath)), `${relPath} should exist`);
    }

    assert.equal(result.manifest.cards.length, 1);
    assert.equal(result.manifest.safety.publishAllowed, false);
    assert.equal(result.manifest.safety.scheduleAllowed, false);
    assert.equal(result.manifest.cards[0].outputPath.startsWith('media/'), true);
    assert.equal(path.isAbsolute(result.manifest.cards[0].outputPath), false);
    assert.ok(fs.existsSync(path.join(out, result.manifest.cards[0].outputPath)));

    const caption = fs.readFileSync(path.join(out, 'caption.txt'), 'utf8');
    assert.match(caption, /Test caption/);

    const review = fs.readFileSync(path.join(out, 'review.md'), 'utf8');
    assert.match(review, /DraftForge Review Packet/);
    assert.match(review, /Publish allowed: `false`/);

    const preview = fs.readFileSync(path.join(out, 'preview.html'), 'utf8');
    assert.match(preview, /<video controls/);
    assert.match(preview, /media\//);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('createHandoffZip creates a zip archive when zip is available', async (t) => {
  const which = spawnSync('which', ['zip'], { encoding: 'utf8' });
  if (which.status !== 0) {
    t.skip('zip command unavailable');
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-zip-'));
  try {
    const pack = path.join(root, 'pack');
    fs.mkdirSync(pack);
    fs.writeFileSync(path.join(pack, 'manifest.json'), '{}\n');
    const zipPath = createHandoffZip({ packDir: pack, outPath: path.join(root, 'pack.zip') });
    assert.ok(fs.existsSync(zipPath));
    assert.ok(fs.statSync(zipPath).size > 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('handoff CLI creates zip from a prepared pack', async (t) => {
  const which = spawnSync('which', ['zip'], { encoding: 'utf8' });
  if (which.status !== 0) {
    t.skip('zip command unavailable');
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-handoff-cli-'));
  try {
    const pack = path.join(root, 'pack');
    fs.mkdirSync(pack);
    fs.writeFileSync(path.join(pack, 'manifest.json'), '{}\n');
    fs.writeFileSync(path.join(pack, 'review.md'), '# Review\n');
    const zipPath = path.join(root, 'handoff.zip');

    const result = spawnSync('node', ['scripts/draftforge/handoff.js', '--pack', pack, '--out', zipPath], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.status, 'created');
    assert.equal(parsed.zipPath, zipPath);
    assert.ok(fs.existsSync(zipPath));
    assert.ok(fs.statSync(zipPath).size > 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('top-level DraftForge CLI dispatches handoff command', async (t) => {
  const which = spawnSync('which', ['zip'], { encoding: 'utf8' });
  if (which.status !== 0) {
    t.skip('zip command unavailable');
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-index-cli-'));
  try {
    const pack = path.join(root, 'pack');
    fs.mkdirSync(pack);
    fs.writeFileSync(path.join(pack, 'manifest.json'), '{}\n');
    fs.writeFileSync(path.join(pack, 'review.md'), '# Review\n');
    const zipPath = path.join(root, 'handoff.zip');

    const result = spawnSync('node', ['scripts/draftforge/index.js', 'handoff', '--pack', pack, '--out', zipPath], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.command, 'handoff');
    assert.equal(parsed.result.status, 'created');
    assert.ok(fs.existsSync(zipPath));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
