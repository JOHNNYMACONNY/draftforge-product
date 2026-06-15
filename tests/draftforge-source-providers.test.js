const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { listSourceAssets, inferMediaKind } = require('../scripts/draftforge/source-providers');
const { listFolderAssets } = require('../scripts/draftforge/provider-folder');
const {
  buildPhotosInventoryScript,
  listPhotosAlbumAssets,
  parsePhotosInventoryOutput,
} = require('../scripts/draftforge/provider-photos');

test('inferMediaKind classifies image and video file names', () => {
  assert.equal(inferMediaKind('photo.JPG'), 'image');
  assert.equal(inferMediaKind('clip.MOV'), 'video');
  assert.equal(inferMediaKind('notes.txt'), null);
});

test('folder provider returns normalized media assets in deterministic order', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-folder-'));
  try {
    fs.writeFileSync(path.join(root, 'b-video.mov'), 'fake-video');
    fs.writeFileSync(path.join(root, 'a-image.jpg'), 'fake-image');
    fs.writeFileSync(path.join(root, 'ignore.txt'), 'ignore');

    const assets = listFolderAssets({ media: root, sourceName: 'FixtureFolder', recursive: false });

    assert.equal(assets.length, 2);
    assert.deepEqual(assets.map((asset) => asset.metadata.fileName), ['a-image.jpg', 'b-video.mov']);
    assert.deepEqual(assets.map((asset) => asset.mediaKind), ['image', 'video']);
    assert.ok(assets.every((asset) => asset.sourceType === 'folder'));
    assert.ok(assets.every((asset) => asset.sourceName === 'FixtureFolder'));
    assert.ok(assets.every((asset) => asset.path.startsWith(root)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('photos inventory parser returns normalized photo album assets', () => {
  const output = [
    'ALBUM\talbum-123\tGram_Studio',
    'ITEM\tasset-image\tIMG_0001.HEIC\tSunday, June 14, 2026 at 1:00:00 AM',
    'ITEM\tasset-video\tIMG_0002.MOV\tSunday, June 14, 2026 at 1:01:00 AM',
    'ITEM\tasset-sidecar\tIMG_0002.AAE\tSunday, June 14, 2026 at 1:02:00 AM',
  ].join('\n');

  const assets = parsePhotosInventoryOutput(output, 'Fallback');
  assert.equal(assets.length, 2);
  assert.deepEqual(assets.map((asset) => asset.mediaKind), ['image', 'video']);
  assert.ok(assets.every((asset) => asset.sourceType === 'photos'));
  assert.ok(assets.every((asset) => asset.sourceName === 'Gram_Studio'));
  assert.ok(assets.every((asset) => asset.path === null));
  assert.ok(assets.every((asset) => asset.metadata.albumId === 'album-123'));
});

test('photos provider uses injectable AppleScript runner', () => {
  const assets = listPhotosAlbumAssets({
    albums: ['Gram_Lab'],
    runAppleScript: (script, context) => {
      assert.match(script, /tell application "Photos"/);
      assert.equal(context.albumName, 'Gram_Lab');
      return 'ALBUM\talbum-lab\tGram_Lab\nITEM\tasset-1\tLAB_001.JPG\tdate text';
    },
  });

  assert.equal(assets.length, 1);
  assert.equal(assets[0].sourceType, 'photos');
  assert.equal(assets[0].sourceName, 'Gram_Lab');
  assert.equal(assets[0].mediaKind, 'image');
});

test('photos inventory script escapes album names', () => {
  const script = buildPhotosInventoryScript('Client "Quoted" Album');
  assert.match(script, /Client \\"Quoted\\" Album/);
});

test('source dispatcher routes folder provider and rejects unknown source', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-dispatch-'));
  try {
    fs.writeFileSync(path.join(root, 'card.png'), 'fake-image');
    const assets = await listSourceAssets({ source: 'folder', media: root });
    assert.equal(assets.length, 1);
    assert.equal(assets[0].sourceType, 'folder');

    await assert.rejects(() => listSourceAssets({ source: 'unknown' }), /Unsupported source/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
