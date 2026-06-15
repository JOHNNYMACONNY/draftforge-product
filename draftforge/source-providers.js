const path = require('node:path');

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'heic', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mov', 'mp4', 'm4v']);
const SUPPORTED_SOURCE_TYPES = new Set(['photos', 'folder']);

function normalizeExtension(fileName) {
  if (typeof fileName !== 'string') return 'unknown';
  const trimmed = fileName.trim().toLowerCase();
  if (!trimmed) return 'unknown';
  const ext = path.extname(trimmed).replace(/^\./, '');
  return ext || 'unknown';
}

function inferMediaKind(fileName) {
  const extension = normalizeExtension(fileName);
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  return null;
}

function stableAssetId(parts) {
  return parts
    .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
    .map((part) => String(part).trim().replace(/\s+/g, '-'))
    .join(':');
}

function normalizeProviderAsset(asset) {
  const sourceType = asset?.sourceType;
  if (!SUPPORTED_SOURCE_TYPES.has(sourceType)) {
    throw new Error(`Unsupported sourceType: ${sourceType || 'missing'}`);
  }

  const sourceName = String(asset?.sourceName || '').trim();
  if (!sourceName) throw new Error('Provider asset missing sourceName.');

  const mediaKind = asset?.mediaKind || inferMediaKind(asset?.path || asset?.filename || '');
  if (mediaKind !== 'image' && mediaKind !== 'video') {
    throw new Error(`Unsupported or unknown media kind for asset: ${asset?.path || asset?.filename || 'unknown'}`);
  }

  const assetId = String(asset?.assetId || stableAssetId([sourceType, sourceName, asset?.path || asset?.filename])).trim();
  if (!assetId) throw new Error('Provider asset missing assetId.');

  return {
    assetId,
    sourceType,
    sourceName,
    mediaKind,
    path: typeof asset?.path === 'string' ? asset.path : null,
    createdAt: asset?.createdAt || null,
    metadata: asset?.metadata && typeof asset.metadata === 'object' ? asset.metadata : {},
  };
}

async function listSourceAssets(options = {}) {
  if (options.source === 'folder') {
    const { listFolderAssets } = require('./provider-folder');
    return listFolderAssets(options);
  }
  if (options.source === 'photos') {
    const { listPhotosAlbumAssets } = require('./provider-photos');
    return listPhotosAlbumAssets(options);
  }
  throw new Error(`Unsupported source: ${options.source || 'missing'}`);
}

module.exports = {
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  SUPPORTED_SOURCE_TYPES,
  inferMediaKind,
  listSourceAssets,
  normalizeExtension,
  normalizeProviderAsset,
  stableAssetId,
};
