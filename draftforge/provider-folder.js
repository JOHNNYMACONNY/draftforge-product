const fs = require('node:fs');
const path = require('node:path');

const {
  inferMediaKind,
  normalizeProviderAsset,
  stableAssetId,
} = require('./source-providers');

function listFilesRecursive(rootDir, recursive = true) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) files.push(...listFilesRecursive(fullPath, recursive));
      continue;
    }
    if (entry.isFile()) files.push(fullPath);
  }

  return files;
}

function listFolderAssets(options = {}) {
  const mediaRoot = options.media || options.mediaRoot || options.path;
  if (!mediaRoot) throw new Error('Folder provider requires --media/mediaRoot/path.');

  const rootPath = path.resolve(mediaRoot);
  if (!fs.existsSync(rootPath)) throw new Error(`Media folder does not exist: ${rootPath}`);
  if (!fs.statSync(rootPath).isDirectory()) throw new Error(`Media path is not a folder: ${rootPath}`);

  const sourceName = options.sourceName || path.basename(rootPath);
  const recursive = options.recursive !== false;

  return listFilesRecursive(rootPath, recursive)
    .map((filePath) => {
      const mediaKind = inferMediaKind(filePath);
      if (!mediaKind) return null;
      const stats = fs.statSync(filePath);
      return normalizeProviderAsset({
        assetId: stableAssetId(['folder', sourceName, path.relative(rootPath, filePath)]),
        sourceType: 'folder',
        sourceName,
        mediaKind,
        path: filePath,
        createdAt: stats.birthtime?.toISOString?.() || stats.mtime.toISOString(),
        metadata: {
          fileName: path.basename(filePath),
          relativePath: path.relative(rootPath, filePath),
          bytes: stats.size,
        },
      });
    })
    .filter(Boolean)
    .sort((a, b) => {
      const relA = a.metadata.relativePath || a.path;
      const relB = b.metadata.relativePath || b.path;
      return relA.localeCompare(relB);
    });
}

module.exports = {
  listFilesRecursive,
  listFolderAssets,
};
