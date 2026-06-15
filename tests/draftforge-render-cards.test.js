const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { buildAudioPlan } = require('../scripts/draftforge/audio-plan');
const { renderCards } = require('../scripts/draftforge/render-cards');
const { verifyMedia } = require('../scripts/draftforge/ffprobe-verify');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }
}

function makeFixtures(root) {
  const imagePath = path.join(root, 'image.png');
  const videoPath = path.join(root, 'video.mp4');
  const musicPath = path.join(root, 'music.m4a');

  run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=red:s=320x400', '-frames:v', '1', imagePath]);
  run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x400:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', videoPath]);
  run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=4', '-c:a', 'aac', musicPath]);

  return { imagePath, videoPath, musicPath };
}

test('renderCards converts an image asset to muted 1080x1350 MP4', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-render-image-'));
  try {
    const { imagePath } = makeFixtures(root);
    const outDir = path.join(root, 'out');
    const cards = renderCards([
      {
        assetId: 'image-1',
        sourceType: 'folder',
        sourceName: 'fixture',
        mediaKind: 'image',
        path: imagePath,
      },
    ], {
      outDir,
      audioMode: 'none',
      imageDurationSeconds: 1,
    });

    assert.equal(cards.length, 1);
    assert.equal(cards[0].originalMediaKind, 'image');
    assert.equal(cards[0].audioMode, 'none');
    assert.equal(cards[0].verification.hasVideo, true);
    assert.equal(cards[0].verification.hasAudio, false);
    assert.equal(cards[0].verification.width, 1080);
    assert.equal(cards[0].verification.height, 1350);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('renderCards adds local audio to image-derived MP4', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-render-local-'));
  try {
    const { imagePath, musicPath } = makeFixtures(root);
    const outDir = path.join(root, 'out');
    const cards = renderCards([
      {
        assetId: 'image-music-1',
        sourceType: 'folder',
        sourceName: 'fixture',
        mediaKind: 'image',
        path: imagePath,
      },
    ], {
      outDir,
      audioMode: 'local',
      musicFiles: [musicPath],
      imageDurationSeconds: 1.25,
      offsetStepSeconds: 3,
    });

    assert.equal(cards[0].audioMode, 'local');
    assert.equal(cards[0].musicTrackPath, path.basename(musicPath));
    assert.equal(cards[0].verification.hasAudio, true);
    verifyMedia(cards[0].outputPath, { hasVideo: true, hasAudio: true, width: 1080, height: 1350 });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('renderCards preserves original audio for video assets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-render-video-'));
  try {
    const { videoPath } = makeFixtures(root);
    const outDir = path.join(root, 'out');
    const cards = renderCards([
      {
        assetId: 'video-1',
        sourceType: 'folder',
        sourceName: 'fixture',
        mediaKind: 'video',
        path: videoPath,
        durationSeconds: 1.5,
      },
    ], {
      outDir,
      audioMode: 'original',
      videoDurationSeconds: 1.5,
    });

    assert.equal(cards[0].originalMediaKind, 'video');
    assert.equal(cards[0].audioMode, 'original');
    assert.equal(cards[0].verification.hasAudio, true);
    assert.equal(cards[0].verification.width, 1080);
    assert.equal(cards[0].verification.height, 1350);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('buildAudioPlan assigns per-card local track offsets', () => {
  const plan = buildAudioPlan([
    { assetId: 'a' },
    { assetId: 'b' },
    { assetId: 'c' },
  ], {
    mode: 'local',
    musicFiles: ['/tmp/one.mp3', '/tmp/two.mp3'],
    offsetStepSeconds: 15,
  });

  assert.deepEqual(plan.map((item) => item.musicTrackPath), ['one.mp3', 'two.mp3', 'one.mp3']);
  assert.deepEqual(plan.map((item) => item.musicOffsetSeconds), [0, 15, 30]);
});
