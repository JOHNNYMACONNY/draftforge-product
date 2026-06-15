const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { installSkillToHermes, parseArgs, SOURCE_SKILL_PATH } = require('../scripts/draftforge/install-skill');

test('SOURCE_SKILL_PATH points to existing skill file', () => {
  assert.ok(fs.existsSync(SOURCE_SKILL_PATH), `Skill file should exist at ${SOURCE_SKILL_PATH}`);
});

test('installSkillToHermes copies skill to target directory', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-skill-test-'));
  try {
    const result = installSkillToHermes({ hermesHome: tmpHome });
    assert.equal(result.status, 'installed');
    assert.ok(fs.existsSync(result.targetPath), 'Skill file should be copied to target');
    const targetContent = fs.readFileSync(result.targetPath, 'utf8');
    const sourceContent = fs.readFileSync(SOURCE_SKILL_PATH, 'utf8');
    assert.equal(targetContent, sourceContent, 'Content should match source');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('installSkillToHermes skips existing skill without --force', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-skill-test-'));
  try {
    const first = installSkillToHermes({ hermesHome: tmpHome });
    assert.equal(first.status, 'installed');
    const second = installSkillToHermes({ hermesHome: tmpHome });
    assert.equal(second.status, 'skipped');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('installSkillToHermes overwrites with --force', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-skill-test-'));
  try {
    const first = installSkillToHermes({ hermesHome: tmpHome });
    assert.equal(first.status, 'installed');
    const second = installSkillToHermes({ hermesHome: tmpHome, force: true });
    assert.equal(second.status, 'installed');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('parseArgs parses --home flag', () => {
  const args = parseArgs(['--home', '/custom/hermes']);
  assert.equal(args.hermesHome, '/custom/hermes');
});

test('parseArgs parses --force flag', () => {
  const args = parseArgs(['--force']);
  assert.equal(args.force, true);
});