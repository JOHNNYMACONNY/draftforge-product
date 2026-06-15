const { spawnSync } = require('node:child_process');
const path = require('node:path');

const {
  inferMediaKind,
  normalizeProviderAsset,
  stableAssetId,
} = require('./source-providers');

function escapeAppleScriptString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildPhotosInventoryScript(albumName) {
  const safeAlbum = escapeAppleScriptString(albumName);
  return `
tell application "Photos"
  set albumRef to album "${safeAlbum}"
  set albumId to (id of albumRef) as text
  set outLines to {"ALBUM" & tab & albumId & tab & "${safeAlbum}"}
  repeat with itemRef in media items of albumRef
    set fieldValues to {"ITEM", ((id of itemRef) as text), ((filename of itemRef) as text), ((date of itemRef) as text)}
    set AppleScript's text item delimiters to tab
    set end of outLines to (fieldValues as text)
  end repeat
  set AppleScript's text item delimiters to linefeed
  return outLines as text
end tell
  `.trim();
}

function runAppleScript(script) {
  const result = spawnSync('osascript', ['-'], {
    input: script,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'AppleScript failed.').trim());
  }

  return result.stdout.trim();
}

function parsePhotosInventoryOutput(output, fallbackAlbumName) {
  const lines = String(output || '').split(/\r?\n/).filter(Boolean);
  let albumId = null;
  let albumName = fallbackAlbumName;
  const assets = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts[0] === 'ALBUM') {
      albumId = parts[1] || null;
      albumName = parts[2] || fallbackAlbumName;
      continue;
    }

    if (parts[0] !== 'ITEM') continue;
    const [, photosId, filename, createdAtRaw] = parts;
    const mediaKind = inferMediaKind(filename);
    if (!mediaKind) continue;

    assets.push(normalizeProviderAsset({
      assetId: stableAssetId(['photos', albumName, photosId || filename]),
      sourceType: 'photos',
      sourceName: albumName,
      mediaKind,
      path: null,
      createdAt: createdAtRaw || null,
      metadata: {
        photosId: photosId || null,
        albumId,
        filename: filename || null,
      },
    }));
  }

  return assets;
}

function listPhotosAlbumAssets(options = {}) {
  const albumNames = options.albums || options.albumNames || (options.album ? [options.album] : []);
  if (!Array.isArray(albumNames) || albumNames.length === 0) {
    throw new Error('Photos provider requires at least one album name.');
  }

  const runner = options.runAppleScript || runAppleScript;
  return albumNames.flatMap((albumName) => {
    const output = runner(buildPhotosInventoryScript(albumName), { albumName });
    return parsePhotosInventoryOutput(output, albumName);
  }).sort((a, b) => {
    const nameA = path.join(a.sourceName, a.metadata.filename || a.assetId);
    const nameB = path.join(b.sourceName, b.metadata.filename || b.assetId);
    return nameA.localeCompare(nameB);
  });
}

module.exports = {
  buildPhotosInventoryScript,
  escapeAppleScriptString,
  listPhotosAlbumAssets,
  parsePhotosInventoryOutput,
  runAppleScript,
};
