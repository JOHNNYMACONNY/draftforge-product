---
name: social-draft-operator
description: "Use when preparing local photos/videos into social carousel draft packs. DraftForge is the product name; this skill is the agent workflow. Supports Apple Photos, folders, optional music, and guarded MBS draft assist. Draft-only: never publishes or schedules."
version: 0.1.1
author: Feddy
license: MIT
metadata:
  hermes:
    tags: [social-media, drafts, instagram, carousel, local-first, ffmpeg]
    related_skills: [writing-plans, gsd-autonomous]
---

# Social Draft Operator

## Product Name: DraftForge

DraftForge is the stable product name for the tool, CLI, and pack format.

Use "Social Draft Operator" or "Instagram Operator" only when describing the workflow (i.e., "use the operator to run DraftForge"). Do not use these as alternative product names.

## When to Use

Use DraftForge to prepare review-ready social carousel draft packs from Apple Photos albums or regular folders. Audio is optional. Meta Business Suite draft assist is optional, guarded, and draft-only.

Use when the user asks to:

- make an Instagram/social carousel draft;
- use Apple Photos/iPhotos albums as source media;
- use a regular folder as source media;
- add or skip local background audio;
- prepare a draft pack for manual review;
- save a Meta Business Suite draft without publishing.

Do not use for:

- publishing;
- scheduling;
- boosting;
- account login/checkpoint handling;
- engagement automation.

## Workflow

1. Resolve source:
   - Apple Photos albums on macOS when configured or named.
   - Folder source when the user provides a path.
2. Resolve audio mode:
   - `none`, `original`, `local`, or `mix`.
3. Run prepare:
   ```bash
   node scripts/draftforge/prepare.js --source folder --media ./media --audio none --count 6 --out ./draftforge-pack
   ```
4. Verify outputs:
   - `manifest.json`
   - `caption.txt`
   - `review.md`
   - `preview.html`
   - rendered media in `media/`
5. If the user explicitly wants MBS draft assist, run dry-run first:
   ```bash
   node scripts/draftforge/mbs-draft.js --manifest ./draftforge-pack/manifest.json --dry-run
   ```
6. Only run live draft with explicit approval:
   ```bash
   node scripts/draftforge/mbs-draft.js --manifest ./draftforge-pack/manifest.json --allow-live-mutation
   ```

## Hard Safety Rules

- Never click Publish.
- Never click Schedule.
- Never click Boost.
- Never handle password or payment prompts.
- Stop on login, checkpoint, or permission dialogs.
- Report uncertainty honestly.

## Verification Checklist

- [ ] Source assets selected.
- [ ] Rendered MP4 cards exist.
- [ ] Manifest safety has `publishAllowed: false` and `scheduleAllowed: false`.
- [ ] Review packet exists.
- [ ] Preview exists.
- [ ] Live MBS action only used with explicit approval.
