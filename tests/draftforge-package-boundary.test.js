const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const FORBIDDEN_PATTERNS = [
  '.gsd/',
  '.planning/',
  'sandbox/',
  'state/',
  'memory/',
  'node_modules/',
  'skills/',
  'proposals/',
  '.DS_Store',
  'DraftForge/',
  'instagram-',
  'gta/',
  'proposals/',
];

const REQUIRED_FILES = [
  'scripts/draftforge/',
  'docs/draftforge/',
  'README-draftforge.md',
  'CHANGELOG-draftforge.md',
  'package.json',
];

function getPackagedFiles() {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`npm pack failed: ${result.stderr}`);
  }
  const parsed = JSON.parse(result.stdout);
  // npm pack returns array of package objects, each with files array containing {path, ...}
  const files = [];
  for (const pkg of parsed) {
    if (Array.isArray(pkg.files)) {
      for (const file of pkg.files) {
        if (typeof file === 'object' && file.path) {
          files.push(file.path);
        }
      }
    }
  }
  return files;
}

test('npm pack should include required DraftForge product files', () => {
  const files = getPackagedFiles();
  const hasRequiredField = (pattern) => files.some((f) => f.startsWith(pattern));
  for (const pattern of REQUIRED_FILES) {
    assert.ok(hasRequiredField(pattern), `Missing required file: ${pattern}`);
  }
});

test('npm pack should exclude workspace-private directories', () => {
  const files = getPackagedFiles();
  const hasForbiddenFile = (forbidden) =>
    files.filter((f) => f.includes(forbidden)).length > 0;
  for (const forbidden of FORBIDDEN_PATTERNS) {
    assert.ok(!hasForbiddenFile(forbidden), `Found forbidden path: ${forbidden}`);
  }
});

test('npm pack file count should be reasonable for a small tool', () => {
  const files = getPackagedFiles();
  // Allow up to 50 files for a clean package
  assert.ok(files.length < 50, `Too many files in package: ${files.length}. Check .npmignore or files field.`);
});