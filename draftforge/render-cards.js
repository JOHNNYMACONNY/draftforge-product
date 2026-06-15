const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { buildAudioPlan, normalizeAudioMode } = require('./audio-plan');
const { verifyMedia } = require('./ffprobe-verify');

const DEFAULT_RENDER_OPTIONS = {
  width: 1080,
  height: 1350,
  imageDurationSeconds: 6.5,
  videoDurationSeconds: 12,
  hardClipCapSeconds: 30,
  fps: 30,
};

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'ffmpeg failed').trim());
  }
}

function outputNameForCard(asset, index) {
  const order = String(index + 1).padStart(2, '0');
  const safeId = String(asset.assetId || `card-${order}`).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 48);
  return `${order}_${safeId}.mp4`;
}

function durationForAsset(asset, options) {
  if (asset.mediaKind === 'image') return Number(options.imageDurationSeconds);
  const requested = Number(asset.durationSeconds || options.videoDurationSeconds);
  return Math.min(Math.max(requested || options.videoDurationSeconds, 3), Number(options.hardClipCapSeconds));
}

function videoInputArgs(asset, duration) {
  if (asset.mediaKind === 'image') {
    return ['-loop', '1', '-t', String(duration), '-i', asset.path];
  }
  return ['-t', String(duration), '-i', asset.path];
}

function videoOutputArgs(options) {
  const vf = `scale=${options.width}:${options.height}:force_original_aspect_ratio=increase,crop=${options.width}:${options.height},format=yuv420p`;
  return ['-vf', vf, '-r', String(options.fps)];
}

function buildFfmpegArgs(asset, outputPath, audio, renderOptions = {}) {
  const options = { ...DEFAULT_RENDER_OPTIONS, ...renderOptions };
  const audioMode = normalizeAudioMode(audio.audioMode || 'none');
  const duration = durationForAsset(asset, options);
  const args = ['-y', ...videoInputArgs(asset, duration)];

  if (audioMode === 'none' || (audioMode === 'original' && asset.mediaKind === 'image')) {
    args.push(...videoOutputArgs(options), '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath);
    return { args, duration };
  }

  if (audioMode === 'original') {
    args.push(...videoOutputArgs(options), '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath);
    return { args, duration };
  }

  args.push('-stream_loop', '-1', '-ss', String(audio.musicOffsetSeconds || 0), '-t', String(duration), '-i', audio.musicPath);

  if (audioMode === 'local' || asset.mediaKind === 'image') {
    const fadeOutStart = Math.max(0, duration - Number(audio.fadeOutSeconds || 0.35));
    args.push(
      ...videoOutputArgs(options),
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-af', `volume=${audio.musicVolume ?? 0.7},afade=t=in:st=0:d=${audio.fadeInSeconds ?? 0.25},afade=t=out:st=${fadeOutStart}:d=${audio.fadeOutSeconds ?? 0.35}`,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      '-movflags', '+faststart',
      outputPath,
    );
    return { args, duration };
  }

  const fadeOutStart = Math.max(0, duration - Number(audio.fadeOutSeconds || 0.35));
  args.push(
    ...videoOutputArgs(options),
    '-filter_complex', `[0:a]volume=${audio.originalVolume ?? 0.28}[orig];[1:a]volume=${audio.musicVolume ?? 0.7},afade=t=in:st=0:d=${audio.fadeInSeconds ?? 0.25},afade=t=out:st=${fadeOutStart}:d=${audio.fadeOutSeconds ?? 0.35}[music];[orig][music]amix=inputs=2:duration=first[aout]`,
    '-map', '0:v:0',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    '-movflags', '+faststart',
    outputPath,
  );
  return { args, duration };
}

function renderCards(assets = [], options = {}) {
  const outDir = options.outDir || options.outputDir;
  if (!outDir) throw new Error('renderCards requires outDir/outputDir.');
  fs.mkdirSync(outDir, { recursive: true });

  const renderOptions = { ...DEFAULT_RENDER_OPTIONS, ...options };
  const audioPlan = options.audioPlan || buildAudioPlan(assets, {
    mode: options.audioMode || 'none',
    musicFiles: options.musicFiles || [],
    offsetStepSeconds: options.offsetStepSeconds,
    originalVolume: options.originalVolume,
    musicVolume: options.musicVolume,
  });

  return assets.map((asset, index) => {
    if (!asset.path) throw new Error(`Asset missing path: ${asset.assetId || index}`);
    const outputPath = path.join(outDir, outputNameForCard(asset, index));
    const audio = audioPlan[index] || { audioMode: 'none' };
    const { args, duration } = buildFfmpegArgs(asset, outputPath, audio, renderOptions);
    runFfmpeg(args);
    const expectsAudio = audio.audioMode === 'local' || audio.audioMode === 'mix' || (audio.audioMode === 'original' && asset.mediaKind === 'video');
    const verification = verifyMedia(outputPath, {
      hasVideo: true,
      hasAudio: expectsAudio,
      width: renderOptions.width,
      height: renderOptions.height,
    });
    return {
      order: index + 1,
      sourceType: asset.sourceType,
      sourceName: asset.sourceName,
      assetId: asset.assetId,
      originalMediaKind: asset.mediaKind,
      outputMediaKind: 'video',
      outputPath,
      durationSeconds: duration,
      width: renderOptions.width,
      height: renderOptions.height,
      audioMode: audio.audioMode,
      musicTrackPath: audio.musicTrackPath,
      musicOffsetSeconds: audio.musicOffsetSeconds,
      verification,
    };
  });
}

module.exports = {
  DEFAULT_RENDER_OPTIONS,
  buildFfmpegArgs,
  durationForAsset,
  outputNameForCard,
  renderCards,
  runFfmpeg,
};
