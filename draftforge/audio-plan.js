const path = require('node:path');

const AUDIO_MODES = new Set(['none', 'original', 'local', 'mix']);

function normalizeAudioMode(mode = 'none') {
  if (!AUDIO_MODES.has(mode)) {
    throw new Error(`Unsupported audio mode: ${mode}`);
  }
  return mode;
}

function buildAudioPlan(cards = [], options = {}) {
  const mode = normalizeAudioMode(options.mode || options.audioMode || 'none');
  const musicFiles = Array.isArray(options.musicFiles) ? options.musicFiles.filter(Boolean) : [];
  const offsetStepSeconds = Number.isFinite(Number(options.offsetStepSeconds))
    ? Number(options.offsetStepSeconds)
    : 12;

  if ((mode === 'local' || mode === 'mix') && musicFiles.length === 0) {
    throw new Error(`${mode} audio mode requires at least one local music file.`);
  }

  return cards.map((card, index) => {
    const musicPath = mode === 'local' || mode === 'mix'
      ? musicFiles[index % musicFiles.length]
      : null;
    return {
      cardIndex: index,
      assetId: card.assetId || null,
      audioMode: mode,
      musicPath,
      musicTrackPath: musicPath ? path.basename(musicPath) : null,
      musicOffsetSeconds: musicPath ? index * offsetStepSeconds : null,
      originalVolume: mode === 'mix' ? (options.originalVolume ?? 0.28) : 1,
      musicVolume: mode === 'local' || mode === 'mix' ? (options.musicVolume ?? 0.7) : 0,
      fadeInSeconds: options.fadeInSeconds ?? 0.25,
      fadeOutSeconds: options.fadeOutSeconds ?? 0.35,
    };
  });
}

module.exports = {
  AUDIO_MODES,
  buildAudioPlan,
  normalizeAudioMode,
};
