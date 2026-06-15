# DraftForge Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-06-14

### Added

- Onboarding config template command: `draftforge init`
- `draftforge.config.json` schema for source, audio, and optional MBS draft settings
- `--config` support for `mbs-draft` dry-run/live config loading
- `--config` support for `prepare` so onboarding config drives source/audio defaults
- `doctor` command for setup diagnostics
- Tests confirming onboarding config has no account IDs/secrets by default

### Changed

- Docs now start with onboarding config before prepare/handoff/MBS flows

## [0.2.0] - 2026-06-14

### Added

- Top-level CLI dispatcher (`scripts/draftforge/index.js`)
- `handoff` command for manual zip export
- `node` scripts/draftforge/index.js `handoff` CLI command
- `node` scripts/draftforge/index.js `prepare` CLI command
- `node` scripts/draftforge/index.js `mbs-draft` CLI command

### Changed

- `prepare.js` and `mbs-draft.js` export `parseArgs` for reuse
- Updated docs to prefer index.js entry point
- Clarified product naming: DraftForge is the product; social-draft-operator is the skill

### Fixed

- Removed duplicate "When to Use" section in skill doc

## [0.1.0] - 2026-06-14

### Added

- DraftForge v0.1 product slice
- Source providers: folder and Apple Photos album support
- Audio modes: none, original, local, mix
- Manifest v1 contract with safety boundaries
- MP4 carousel card renderer (1080x1350)
- Captions, review.md, preview.html outputs
- Guarded Meta Business Suite draft workflow
- Full test suite (29 tests)

### Guarantees

- No publish mode
- No schedule mode
- Manual review required before posting