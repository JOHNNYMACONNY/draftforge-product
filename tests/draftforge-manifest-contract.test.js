const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'draftforge', 'manifest-valid-local-audio.json');
const manifest = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const allowedAudioModes = new Set(['none', 'original', 'local', 'mix']);
const allowedSourceTypes = new Set(['photos', 'folder']);
const requiredCardFields = [
  'order',
  'sourceType',
  'sourceName',
  'assetId',
  'originalMediaKind',
  'outputMediaKind',
  'outputPath',
  'durationSeconds',
  'width',
  'height',
  'audioMode',
  'musicTrackPath',
  'musicOffsetSeconds',
  'verification',
];

test('DraftForge manifest fixture uses v1 schema', () => {
  assert.equal(manifest.schemaVersion, 'draftforge.manifest.v1');
});

test('DraftForge manifest fixture includes cards', () => {
  assert.ok(Array.isArray(manifest.cards));
  assert.ok(manifest.cards.length > 0);
});

test('DraftForge manifest cards expose required fields', () => {
  for (const card of manifest.cards) {
    for (const field of requiredCardFields) {
      assert.ok(Object.hasOwn(card, field), `missing card field: ${field}`);
    }
  }
});

test('DraftForge manifest safety forbids publish and schedule', () => {
  assert.equal(manifest.safety.publishAllowed, false);
  assert.equal(manifest.safety.scheduleAllowed, false);
  assert.equal(manifest.safety.requiresManualReview, true);
});

test('DraftForge manifest audio mode is supported', () => {
  assert.ok(allowedAudioModes.has(manifest.audio.mode));
  for (const card of manifest.cards) {
    assert.ok(allowedAudioModes.has(card.audioMode), `unsupported card audio mode: ${card.audioMode}`);
  }
});

test('DraftForge manifest source type is supported', () => {
  assert.ok(allowedSourceTypes.has(manifest.source.type));
  for (const card of manifest.cards) {
    assert.ok(allowedSourceTypes.has(card.sourceType), `unsupported card source type: ${card.sourceType}`);
  }
});
