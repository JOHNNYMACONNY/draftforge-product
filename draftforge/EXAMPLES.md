# DraftForge Examples

## Onboarding Config

```bash
node scripts/draftforge/index.js init --out ./draftforge.config.json
node scripts/draftforge/index.js doctor --config ./draftforge.config.json
```

## Folder Source, No Audio

After editing `draftforge.config.json`:

```bash
node scripts/draftforge/index.js prepare \
  --config ./draftforge.config.json \
  --count 6 \
  --out ./draftforge-pack
```

You can still override config values from the CLI:

```bash
node scripts/draftforge/index.js prepare \
  --source folder \
  --media ./media \
  --audio none \
  --count 6 \
  --out ./draftforge-pack
```

## Folder Source, Local Audio

```bash
node scripts/draftforge/index.js prepare \
  --source folder \
  --media ./media \
  --music ./music \
  --audio local \
  --count 6 \
  --out ./draftforge-pack
```

## Apple Photos Albums

```bash
node scripts/draftforge/index.js prepare \
  --source photos \
  --albums Gram_Lab,Gram_Aura,Gram_Studio \
  --audio none \
  --count 6 \
  --out ./draftforge-pack
```

## Preview Outputs

```bash
open ./draftforge-pack/preview.html
cat ./draftforge-pack/review.md
```

## MBS Draft Safety Dry Run

```bash
node scripts/draftforge/index.js mbs-draft \
  --manifest ./draftforge-pack/manifest.json \
  --config ./draftforge.config.json \
  --dry-run
```

## Test Suite

```bash
npm run test:draftforge
```
