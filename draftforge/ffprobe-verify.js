const { spawnSync } = require('node:child_process');

function ffprobeJson(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_streams',
    '-show_format',
    filePath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `ffprobe failed for ${filePath}`).trim());
  }

  return JSON.parse(result.stdout);
}

function verifyMedia(filePath, expectations = {}) {
  const probe = ffprobeJson(filePath);
  const video = probe.streams.find((stream) => stream.codec_type === 'video') || null;
  const audio = probe.streams.find((stream) => stream.codec_type === 'audio') || null;
  const verification = {
    path: filePath,
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    width: video ? Number(video.width) : null,
    height: video ? Number(video.height) : null,
    codecVideo: video?.codec_name || null,
    codecAudio: audio?.codec_name || null,
    durationSeconds: Number(probe.format?.duration || video?.duration || 0),
  };

  if (expectations.hasVideo !== undefined && verification.hasVideo !== expectations.hasVideo) {
    throw new Error(`Video expectation failed for ${filePath}`);
  }
  if (expectations.hasAudio !== undefined && verification.hasAudio !== expectations.hasAudio) {
    throw new Error(`Audio expectation failed for ${filePath}`);
  }
  if (expectations.width !== undefined && verification.width !== expectations.width) {
    throw new Error(`Width expectation failed for ${filePath}: ${verification.width}`);
  }
  if (expectations.height !== undefined && verification.height !== expectations.height) {
    throw new Error(`Height expectation failed for ${filePath}: ${verification.height}`);
  }

  return verification;
}

module.exports = {
  ffprobeJson,
  verifyMedia,
};
