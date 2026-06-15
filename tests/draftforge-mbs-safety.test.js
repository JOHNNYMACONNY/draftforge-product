const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildMbsDraftRunPlan,
  FORBIDDEN_ACTIONS,
  runMbsDraft,
  validateDraftManifest,
  validateMbsConfig,
  convertManifestToBundle,
} = require('../scripts/draftforge/mbs-draft');

function validManifest() {
  return {
    schemaVersion: 'draftforge.manifest.v1',
    source: { type: 'folder', names: ['fixture'] },
    audio: { mode: 'none' },
    outputs: { captionPath: 'caption.txt' },
    cards: [{
      order: 1,
      assetId: 'test-asset-1',
      sourceType: 'folder',
      sourceName: 'fixture',
      originalMediaKind: 'image',
      outputMediaKind: 'video',
      outputPath: 'media/01.mp4',
    }],
    safety: {
      publishAllowed: false,
      scheduleAllowed: false,
      requiresManualReview: true,
    },
  };
}

test('validateDraftManifest accepts draft-only manifests', () => {
  assert.equal(validateDraftManifest(validManifest()), true);
});

test('validateDraftManifest rejects publish or schedule allowed manifests', () => {
  assert.throws(() => validateDraftManifest({
    ...validManifest(),
    safety: { publishAllowed: true, scheduleAllowed: false },
  }), /forbid publish/);

  assert.throws(() => validateDraftManifest({
    ...validManifest(),
    safety: { publishAllowed: false, scheduleAllowed: true },
  }), /forbid schedule/);
});

test('MBS run plan is dry-run without live mutation approval', () => {
  const plan = buildMbsDraftRunPlan(validManifest(), {});
  assert.equal(plan.status, 'dry-run');
  assert.equal(plan.allowLiveMutation, false);
  assert.equal(plan.draftOnly, true);
  assert.ok(plan.forbiddenActions.includes('publish'));
  assert.ok(plan.allowedActions.includes('finish-later'));
});

test('MBS run plan is ready only with live mutation approval', () => {
  const plan = buildMbsDraftRunPlan(validManifest(), { allowLiveMutation: true });
  assert.equal(plan.status, 'ready-for-live-draft');
  assert.equal(plan.allowLiveMutation, true);
});

test('forbidden actions include publish, schedule, boost, payment, permission, and password', () => {
  for (const action of ['publish', 'schedule', 'boost', 'payment', 'permission', 'password']) {
    assert.ok(FORBIDDEN_ACTIONS.has(action));
  }
});

test('runMbsDraft dry-run returns plan without live execution', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-mbs-'));
  try {
    const manifestPath = path.join(root, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(validManifest(), null, 2));
    const result = await runMbsDraft({ manifestPath, allowLiveMutation: false });
    assert.equal(result.status, 'dry-run');
    assert.equal(result.manifestVerified, true);
    assert.equal(result.message, 'Live MBS execution disabled. Use --allow-live-mutation to proceed.');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('convertManifestToBundle creates a runner-compatible bundle', () => {
  const bundle = convertManifestToBundle(validManifest(), '/tmp/pack', 'DraftForge prepared carousel');
  assert.equal(bundle.source_album, 'folder-source');
  assert.ok(Object.prototype.hasOwnProperty.call(bundle, 'selected_asset_ids'));
  assert.ok(Object.prototype.hasOwnProperty.call(bundle, 'exported_file_paths'));
  assert.ok(Object.prototype.hasOwnProperty.call(bundle, 'caption_draft'));
  assert.ok(Object.prototype.hasOwnProperty.call(bundle, 'ordered_media'));
});

test('validateMbsConfig allows dry-run without MBS fields', () => {
  const result = validateMbsConfig(null, false);
  assert.equal(result.valid, true);
  assert.equal(result.status, 'dry-run');
});

test('validateMbsConfig fails when MBS fields missing in live mode', () => {
  const result = validateMbsConfig(null, true);
  assert.equal(result.valid, false);
  assert.equal(result.status, 'missing-config');
  assert.deepEqual(result.missingFields, ['businessId', 'assetId', 'expectedAccountLabel']);
});

test('validateMbsConfig passes when all MBS fields present', () => {
  const config = {
    metaBusinessSuite: {
      businessId: '123',
      assetId: '456',
      expectedAccountLabel: 'test',
    },
  };
  const result = validateMbsConfig(config, true);
  assert.equal(result.valid, true);
  assert.equal(result.status, 'ready-for-live-draft');
});

test('runMbsDraft live mode returns missing-config when MBS fields incomplete', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'draftforge-mbs-'));
  try {
    const manifestPath = path.join(root, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(validManifest(), null, 2));
    const result = await runMbsDraft({ manifestPath, allowLiveMutation: true });
    assert.equal(result.status, 'missing-config');
    assert.equal(result.manifestVerified, true);
    assert.ok(Array.isArray(result.missingFields));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
