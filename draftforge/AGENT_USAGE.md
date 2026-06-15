# DraftForge Agent Usage

## Trigger

Use this workflow when a user asks an agent to create a social carousel draft from local photos/videos, Apple Photos albums, or regular folders, with optional audio.

## Default Source Routing

1. If the user names Apple Photos/iPhotos albums, use `--source photos`.
2. If the user provides a filesystem path, use `--source folder`.
3. If unclear on macOS, prefer configured Apple Photos albums.
4. If unclear off macOS, ask for a folder path.

## Safe Workflow

1. Run `prepare` first.
2. Verify generated media and manifest.
3. Show/report `review.md` and `preview.html` path.
4. Only run MBS draft assist if the user explicitly asks for a live draft.
5. For live draft, require `--allow-live-mutation`.
6. Never publish.
7. Never schedule.

## Example: Folder, No Audio

```bash
node scripts/draftforge/prepare.js \
  --source folder \
  --media ./media \
  --audio none \
  --count 6 \
  --out ./draftforge-pack
```

## Example: Folder, Local Audio

```bash
node scripts/draftforge/prepare.js \
  --source folder \
  --media ./media \
  --music ./music \
  --audio local \
  --count 6 \
  --out ./draftforge-pack
```

## Example: Manual Handoff Zip

```bash
node scripts/draftforge/index.js handoff \
  --pack ./draftforge-pack \
  --out ./draftforge-handoff.zip
```

Use this when the user wants a review/share/upload packet but has not asked for live Meta Business Suite draft assist.

## Example: Guarded MBS Draft Check

Dry run:

```bash
node scripts/draftforge/mbs-draft.js --manifest ./draftforge-pack/manifest.json --dry-run
```

Live mutation gate:

```bash
node scripts/draftforge/mbs-draft.js \
  --manifest ./draftforge-pack/manifest.json \
  --allow-live-mutation
```

## Reporting Rules

Report:

- pack path;
- card count;
- source mode;
- audio mode;
- verification result;
- whether MBS was dry-run, blocked, uncertain, or saved as draft.

Do not report a saved draft unless the adapter has proof. If proof is partial, say partial.
