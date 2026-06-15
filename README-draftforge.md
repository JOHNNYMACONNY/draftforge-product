# DraftForge

DraftForge prepares local photos, videos, and optional music into review-ready social carousel drafts, with optional guarded Meta Business Suite draft assist.

It is **not** an Instagram bot. It does not publish. It does not schedule. The core workflow is local-first and works without a social login.

## Status: v0.3.0

The product is usable. Config-driven onboarding works. Audio modes work. CLI is stable. Meta Business Suite draft assist requires explicit approval and remains intentionally guarded.

## Installation

```bash
# From this repo:
npm install

# Or clone and link:
git clone https://github.com/jrobertsinthelobby/draftforge
cd draftforge
node scripts/draftforge/index.js --help
```

## Onboarding

Create a local config file with placeholders for your media, music, and Meta Business Suite draft settings:

```bash
node scripts/draftforge/index.js init --out ./draftforge.config.json
```

The generated config contains no account IDs, tokens, cookies, or passwords. Fill in only what you need. Meta Business Suite settings are optional unless you use guarded draft assist.

Check your setup before rendering:

```bash
node scripts/draftforge/index.js doctor --config ./draftforge.config.json
```

## What It Does

- Reads source media from:
  - Apple Photos albums on macOS
  - regular folders anywhere
- Renders social-ready MP4 carousel cards (1080x1350)
- Supports audio modes:
  - `none`
  - `original`
  - `local`
  - `mix`
- Emits:
  - `media/`
  - `manifest.json`
  - `caption.txt`
  - `review.md`
  - `preview.html`
- Provides a guarded MBS draft safety shell

## Quick Start: Folder Source, No Audio

```bash
node scripts/draftforge/index.js init --out ./draftforge.config.json
node scripts/draftforge/index.js doctor --config ./draftforge.config.json
node scripts/draftforge/index.js prepare \
  --config ./draftforge.config.json \
  --count 6 \
  --out ./draftforge-pack
```

Open:

```text
./draftforge-pack/preview.html
./draftforge-pack/review.md
```

## Draft-Only MBS Safety Check

```bash
node scripts/draftforge/index.js mbs-draft \
  --manifest ./draftforge-pack/manifest.json \
  --config ./draftforge.config.json \
  --dry-run
```

## Manual Handoff Zip

```bash
node scripts/draftforge/index.js handoff \
  --pack ./draftforge-pack \
  --out ./draftforge-handoff.zip
```

Live mutation requires explicit approval:

```bash
node scripts/draftforge/index.js mbs-draft \
  --manifest ./draftforge-pack/manifest.json \
  --allow-live-mutation
```

Current v0.2 status: live browser execution is intentionally blocked until the adapter is deliberately wired.

## Tests

```bash
npm run test:draftforge
```

## Safety Boundary

- No publish mode.
- No schedule mode.
- No boost/payment/account recovery handling.
- Manual review required before posting.

## License

MIT