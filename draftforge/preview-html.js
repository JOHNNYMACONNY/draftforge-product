const fs = require('node:fs');
const path = require('node:path');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPreviewHtml(manifest) {
  const cards = manifest.cards.map((card) => `
    <article class="card">
      <h2>${card.order}. ${escapeHtml(card.assetId)}</h2>
      <video controls src="${escapeHtml(card.outputPath)}"></video>
      <dl>
        <dt>Source</dt><dd>${escapeHtml(card.sourceType)} / ${escapeHtml(card.sourceName)}</dd>
        <dt>Media</dt><dd>${escapeHtml(card.originalMediaKind)} → ${escapeHtml(card.outputMediaKind)}</dd>
        <dt>Duration</dt><dd>${escapeHtml(card.durationSeconds)}s</dd>
        <dt>Audio</dt><dd>${escapeHtml(card.audioMode)}${card.musicTrackPath ? ` @ ${escapeHtml(card.musicOffsetSeconds)}s (${escapeHtml(card.musicTrackPath)})` : ''}</dd>
      </dl>
    </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DraftForge Preview</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0b0b0f; color: #f4f4f5; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
    .card { background: #171720; border: 1px solid #2a2a36; border-radius: 16px; padding: 16px; }
    video { width: 100%; aspect-ratio: 4 / 5; background: #000; border-radius: 12px; }
    dt { color: #a1a1aa; font-size: 12px; text-transform: uppercase; margin-top: 10px; }
    dd { margin: 2px 0 0; }
  </style>
</head>
<body>
  <main>
    <h1>DraftForge Preview</h1>
    <p>Preset: ${escapeHtml(manifest.preset)} · Audio: ${escapeHtml(manifest.audio.mode)} · Publish allowed: ${manifest.safety.publishAllowed}</p>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>`;
}

function writePreviewHtml(manifest, outPath) {
  fs.writeFileSync(outPath, buildPreviewHtml(manifest));
  return outPath;
}

module.exports = {
  buildPreviewHtml,
  escapeHtml,
  writePreviewHtml,
};
