# DraftForge Install

## Requirements

- Node.js with `node:test`
- ffmpeg
- ffprobe
- macOS only for Apple Photos source mode

## macOS ffmpeg

```bash
brew install ffmpeg
```

Verify:

```bash
ffmpeg -version
ffprobe -version
```

## Folder-Only Mode

Folder mode does not need Apple Photos permissions or social login.

```bash
node scripts/draftforge/index.js init --out ./draftforge.config.json
node scripts/draftforge/index.js doctor --config ./draftforge.config.json
node scripts/draftforge/index.js prepare --config ./draftforge.config.json --out ./draftforge-pack
```

## Setup Doctor

Run diagnostics any time setup changes:

```bash
node scripts/draftforge/index.js doctor --config ./draftforge.config.json
```

`fail` means core rendering is blocked. `warn` means optional setup is incomplete but local prepare/handoff may still work.

## Apple Photos Mode

Photos mode uses AppleScript/Photos automation. macOS may ask for permission for the terminal or Node process to control Photos.

If blocked, open:

```text
System Settings → Privacy & Security → Automation
```

Then allow the relevant terminal/Node process to control Photos.

## Meta Business Suite Mode

MBS mode is optional and draft-only. It requires a prepared manifest and explicit live mutation approval.

```bash
node scripts/draftforge/index.js mbs-draft --manifest ./draftforge-pack/manifest.json --config ./draftforge.config.json --dry-run
```

Do not use live mode until the adapter is wired and reviewed.
