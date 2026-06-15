const assert = require('node:assert/strict');
const test = require('node:test');

const { buildAudioPlan, normalizeAudioMode } = require('../scripts/draftforge/audio-plan');
const { buildFfmpegArgs } = require('../scripts/draftforge/render-cards');

test('normalizeAudioMode accepts supported modes and rejects unknown modes', () => {
  for (const mode of ['none', 'original', 'local', 'mix']) {
    assert.equal(normalizeAudioMode(mode), mode);
  }
  assert.throws(() => normalizeAudioMode('publish-banger'), /Unsupported audio mode/);
});

test('local and mix audio plans require music files', () => {
  assert.throws(() => buildAudioPlan([{ assetId: 'a' }], { mode: 'local' }), /requires at least one local music file/);
  assert.throws(() => buildAudioPlan([{ assetId: 'a' }], { mode: 'mix' }), /requires at least one local music file/);
});

test('none audio mode builds ffmpeg args with muted output', () => {
  const { args } = buildFfmpegArgs(
    { assetId: 'image-1', mediaKind: 'image', path: '/tmp/image.png' },
    '/tmp/out.mp4',
    { audioMode: 'none' },
    { imageDurationSeconds: 1 },
  );
  assert.ok(args.includes('-an'));
  assert.equal(args.at(-1), '/tmp/out.mp4');
});

test('mix audio mode builds an amix ffmpeg command path', () => {
  const { args } = buildFfmpegArgs(
    { assetId: 'video-1', mediaKind: 'video', path: '/tmp/video.mp4', durationSeconds: 8 },
    '/tmp/out.mp4',
    {
      audioMode: 'mix',
      musicPath: '/tmp/music.mp3',
      musicOffsetSeconds: 12,
      originalVolume: 0.28,
      musicVolume: 0.7,
    },
    { videoDurationSeconds: 8 },
  );

  const command = args.join(' ');
  assert.match(command, /amix=inputs=2/);
  assert.match(command, /\[aout\]/);
  assert.ok(args.includes('/tmp/music.mp3'));
});
