# DraftForge Product Contract

## Product Sentence

DraftForge prepares local photos, videos, and optional music into review-ready social carousel drafts, with an optional guarded Meta Business Suite draft assist.

## What DraftForge Is

DraftForge is a local-first draft preparation tool for creators, studios, and social operators. It turns media sources into a verified draft pack that a human can review before posting.

The product has two layers:

1. **Core local pack builder** — no social login required.
2. **Optional Meta Business Suite draft adapter** — user-approved, draft-only, and never allowed to publish or schedule.

## What DraftForge Is Not

- Not an Instagram bot.
- Not a public posting bot.
- Not a scheduler.
- Not a growth-hacking or engagement automation tool.
- Not a cloud media library.

## Command Modes

| Mode | Purpose | Social login required | External side effect |
|---|---|---:|---:|
| `prepare` | Build local draft pack from sources | No | No |
| `preview` | Generate or open local review preview | No | No |
| `handoff` | Zip/export pack for manual upload | No | No |
| `mbs-draft` | Upload to Meta Business Suite and save draft | Yes | Yes, draft-only |

## Source Modes

### `photos`

Default on macOS. Reads/export assets from Apple Photos albums by configured album names.

Example:

```bash
draftforge prepare \
  --source photos \
  --albums Gram_Lab,Gram_Aura,Gram_Studio \
  --count 6
```

### `folder`

Portable fallback for users who do not use Apple Photos or want direct filesystem control.

Example:

```bash
draftforge prepare \
  --source folder \
  --media ./media \
  --count 6
```

## Audio Modes

| Mode | Behavior |
|---|---|
| `none` | Output is muted. |
| `original` | Preserve original video audio; image-derived video cards are silent. |
| `local` | Add local music beds to cards. |
| `mix` | Preserve original clip audio at reduced level and add local music bed. |

Future strategies may include `single-track` and `per-card`, but v1 expresses strategy inside the manifest instead of widening top-level command modes.

## Default Preset: Instagram Carousel

| Setting | Default |
|---|---:|
| Format | MP4 cards |
| Width | `1080` |
| Height | `1350` |
| Aspect | `4:5` |
| Count | `6` |
| Image card duration | `6.5s` |
| Clip target | `8–15s` |
| Hard clip cap | `30s` |

## Product Safety Contract

No publish mode exists in DraftForge v1.

No schedule mode exists in DraftForge v1.

The only supported live Meta action is saving a draft through the guarded `mbs-draft` adapter after local verification and explicit user approval.

## Required Outputs

A prepared pack should emit:

```text
media/
manifest.json
caption.txt
review.md
preview.html
```

Optional handoff mode may emit:

```text
draftforge-handoff.zip
```

## Operator Completion Boundary

DraftForge succeeds when it creates either:

1. a verified local draft pack, or
2. a verified/suspected Meta Business Suite saved draft with proof artifacts.

It does not succeed by publishing content.
