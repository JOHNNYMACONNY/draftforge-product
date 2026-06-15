const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function createHandoffZip({ packDir, outPath } = {}) {
  if (!packDir) throw new Error('createHandoffZip requires packDir.');
  const resolvedPackDir = path.resolve(packDir);
  if (!fs.existsSync(resolvedPackDir)) throw new Error(`Pack directory does not exist: ${resolvedPackDir}`);

  const zipPath = path.resolve(outPath || path.join(path.dirname(resolvedPackDir), `${path.basename(resolvedPackDir)}.zip`));
  const result = spawnSync('zip', ['-qr', zipPath, '.'], {
    cwd: resolvedPackDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'zip failed').trim());
  }
  return zipPath;
}

module.exports = { createHandoffZip };
