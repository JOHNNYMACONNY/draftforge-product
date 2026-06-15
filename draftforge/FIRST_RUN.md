# DraftForge First Run

For new users: end-to-end setup and first draft.

## Prerequisites

- Node.js 20+ (with `node:test`)
- ffmpeg and ffprobe
- macOS for Apple Photos mode (optional)

## Step 1: Install ffmpeg

```bash
# macOS
brew install ffmpeg
```

Verify:

```bash
ffmpeg -version
ffprobe -version
```

## Step 2: Create Onboarding Config

```bash
node scripts/draftforge/index.js init --out ./draftforge.config.json
```

Edit `draftforge.config.json` to set your source and audio preferences.

## Step 3: Verify Your Setup

```bash
node scripts/draftforge/index.js doctor --config ./draftforge.config.json
```

Look for `status: "ok"`. Any `fail` means core rendering is blocked. `warn` is optional.

## Step 4: Prepare Your First Draft Pack

For folder source:

```bash
node scripts/draftforge/index.js prepare \
  --config ./draftforge.config.json \
  --count 6 \
  --out ./draftforge-pack
```

For Apple Photos albums:

```bash
node scripts/draftforge/index.js prepare \
  --source photos \
  --albums "Gram Lab","Gram Aura","Gram Studio" \
  --count 6 \
  --out ./draftforge-pack
```

## Step 5: Review the Output

```bash
open ./draftforge-pack/preview.html
cat ./draftforge-pack/review.md
```

Verify 6 MP4 cards exist in `./draftforge-pack/media/`.

## Step 6: (Optional) Install Hermes Skill

```bash
node scripts/draftforge/index.js install-skill \
  --home ~/.hermes
```

## Step 7: (Optional) MBS Draft Dry-Run

```bash
node scripts/draftforge/index.js mbs-draft \
  --manifest ./draftforge-pack/manifest.json \
  --config ./draftforge.config.json \
  --dry-run
```

## Safety Rules

- DraftForge never publishes.
- DraftForge never schedules.
- Manual review is required before posting.
- MBS live draft requires `--allow-live-mutation`.