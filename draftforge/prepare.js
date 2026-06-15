#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const { listSourceAssets } = require('./source-providers');
const { renderCards } = require('./render-cards');
const { writePreviewHtml } = require('./preview-html');
const { loadConfig } = require('./config');

function collectMusicFiles(musicRoot) {
  if (!musicRoot) return [];
  const root = path.resolve(musicRoot);
  if (!fs.existsSync(root)) throw new Error(`Music path does not exist: ${root}`);
  const exts = new Set(['.mp3', '.m4a', '.aac', '.wav']);
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && exts.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(root, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function redactMusicPath(filePath) {
  return filePath ? path.basename(filePath) : null;
}

function makeRelativeCard(packDir, card) {
  return {
    ...card,
    outputPath: path.relative(packDir, card.outputPath),
    musicTrackPath: redactMusicPath(card.musicTrackPath),
    verification: {
      ...card.verification,
      path: path.relative(packDir, card.verification.path),
    },
  };
}

function buildReviewMarkdown(manifest) {
  const lines = [
    '# DraftForge Review Packet',
    '',
    `- Preset: \`${manifest.preset}\``,
    `- Source: \`${manifest.source.type}\` / ${manifest.source.names.map((name) => `\`${name}\``).join(', ')}`,
    `- Audio: \`${manifest.audio.mode}\``,
    `- Publish allowed: \`${manifest.safety.publishAllowed}\``,
    `- Schedule allowed: \`${manifest.safety.scheduleAllowed}\``,
    `- Requires manual review: \`${manifest.safety.requiresManualReview}\``,
    '',
    '## Cards',
    '',
    '| # | Asset | Media | Duration | Audio | Output |',
    '|---:|---|---|---:|---|---|',
  ];

  for (const card of manifest.cards) {
    const audio = card.musicTrackPath ? `${card.audioMode} @ ${card.musicOffsetSeconds}s (${card.musicTrackPath})` : card.audioMode;
    lines.push(`| ${card.order} | \`${card.assetId}\` | ${card.originalMediaKind} → ${card.outputMediaKind} | ${card.durationSeconds}s | ${audio} | \`${card.outputPath}\` |`);
  }

  lines.push('', '## Operator Boundary', '', 'DraftForge v1 is draft-only. Review manually before posting.');
  return `${lines.join('\n')}\n`;
}

function buildCaption(options = {}) {
  return options.caption || 'DraftForge prepared carousel draft. Review before posting.';
}

function applyConfigDefaults(options = {}) {
  const config = loadConfig(options.configPath);
  if (!config) return { ...options };
  const sourceConfig = config.source || {};
  const audioConfig = config.audio || {};
  const resolved = {
    ...options,
    source: options.source || sourceConfig.defaultMode || 'folder',
    media: options.media || sourceConfig.defaultMediaDir,
    albums: options.albums || sourceConfig.defaultAlbums,
    audio: options.audioMode || options.audio || audioConfig.defaultMode || 'none',
    music: options.music || audioConfig.defaultMusicDir,
  };
  if (resolved.source === 'photos' && !Array.isArray(resolved.albums) && typeof resolved.albums === 'string') {
    resolved.albums = resolved.albums.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return resolved;
}

async function prepareDraftPack(options = {}) {
  const resolvedOptions = applyConfigDefaults(options);
  const outDir = path.resolve(resolvedOptions.out || resolvedOptions.outDir || path.join(process.cwd(), 'draftforge-pack'));
  const mediaDir = path.join(outDir, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });

  const count = Number(resolvedOptions.count || 6);
  const sourceAssets = await listSourceAssets(resolvedOptions);
  const selectedAssets = sourceAssets.slice(0, count);
  if (selectedAssets.length === 0) throw new Error('No eligible source assets found.');

  const audioMode = resolvedOptions.audioMode || resolvedOptions.audio || 'none';
  const musicFiles = resolvedOptions.musicFiles || (audioMode === 'local' || audioMode === 'mix' ? collectMusicFiles(resolvedOptions.music) : []);
  const renderedCards = renderCards(selectedAssets, {
    outDir: mediaDir,
    audioMode,
    musicFiles,
    imageDurationSeconds: resolvedOptions.imageDurationSeconds,
    videoDurationSeconds: resolvedOptions.videoDurationSeconds,
    hardClipCapSeconds: resolvedOptions.hardClipCapSeconds,
  });

  const sourceNames = [...new Set(selectedAssets.map((asset) => asset.sourceName))];
  const manifest = {
    schemaVersion: 'draftforge.manifest.v1',
    createdAt: new Date().toISOString(),
    preset: resolvedOptions.preset || 'instagram-carousel-4x5',
    mode: 'prepare',
    source: {
      type: resolvedOptions.source,
      names: sourceNames,
    },
    audio: {
      mode: audioMode,
      strategy: audioMode === 'local' ? 'per-card' : 'none',
    },
    cards: renderedCards.map((card) => makeRelativeCard(outDir, card)),
    outputs: {
      mediaDir: 'media',
      captionPath: 'caption.txt',
      reviewPath: 'review.md',
      previewPath: 'preview.html',
    },
    safety: {
      publishAllowed: false,
      scheduleAllowed: false,
      requiresManualReview: true,
    },
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'caption.txt'), `${buildCaption(resolvedOptions)}\n`);
  fs.writeFileSync(path.join(outDir, 'review.md'), buildReviewMarkdown(manifest));
  writePreviewHtml(manifest, path.join(outDir, 'preview.html'));

  return { outDir, manifest };
}

function parseArgs(argv) {
  const args = { source: 'folder', audio: 'none', count: 6 };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--source') args.source = argv[++i];
    else if (token === '--media') args.media = argv[++i];
    else if (token === '--album') args.album = argv[++i];
    else if (token === '--albums') args.albums = argv[++i].split(',').map((item) => item.trim()).filter(Boolean);
    else if (token === '--music') args.music = argv[++i];
    else if (token === '--audio') args.audio = argv[++i];
    else if (token === '--count') args.count = Number(argv[++i]);
    else if (token === '--out') args.out = argv[++i];
    else if (token === '--caption') args.caption = argv[++i];
    else if (token === '--config') args.configPath = argv[++i];
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

if (require.main === module) {
  prepareDraftPack(parseArgs(process.argv.slice(2)))
    .then((result) => console.log(JSON.stringify({ outDir: result.outDir, cards: result.manifest.cards.length }, null, 2)))
    .catch((error) => {
      console.error(error.stack || error.message || String(error));
      process.exit(1);
    });
}

module.exports = {
  buildCaption,
  buildReviewMarkdown,
  collectMusicFiles,
  parseArgs,
  prepareDraftPack,
};
