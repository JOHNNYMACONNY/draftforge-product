# DraftForge Manifest Spec

## Purpose

`manifest.json` is the shared contract between source providers, renderers, review surfaces, handoff exports, agent skills, and optional Meta Business Suite draft adapters.

The manifest should be useful without exposing private machine paths by default.

## Schema Version

Current schema:

```json
"draftforge.manifest.v1"
```

## Top-Level Shape

```json
{
  "schemaVersion": "draftforge.manifest.v1",
  "createdAt": "2026-06-14T00:00:00.000Z",
  "preset": "instagram-carousel-4x5",
  "mode": "prepare",
  "source": {
    "type": "photos",
    "names": ["Gram_Lab", "Gram_Aura", "Gram_Studio"]
  },
  "audio": {
    "mode": "local",
    "strategy": "per-card"
  },
  "cards": [],
  "outputs": {},
  "safety": {
    "publishAllowed": false,
    "scheduleAllowed": false,
    "requiresManualReview": true
  }
}
```

## Top-Level Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `schemaVersion` | string | yes | Must be `draftforge.manifest.v1`. |
| `createdAt` | ISO string | yes | Manifest creation timestamp. |
| `preset` | string | yes | Example: `instagram-carousel-4x5`. |
| `mode` | string | yes | `prepare`, `preview`, `handoff`, or `mbs-draft`. |
| `source` | object | yes | Source provider summary. |
| `audio` | object | yes | Audio mode and strategy. |
| `cards` | array | yes | Ordered rendered cards. |
| `outputs` | object | yes | Relative output artifact paths. |
| `safety` | object | yes | Safety gates and live-action permissions. |

## Source Object

```json
{
  "type": "photos",
  "names": ["Gram_Studio"]
}
```

Allowed `source.type` values:

- `photos`
- `folder`

## Audio Object

```json
{
  "mode": "local",
  "strategy": "per-card"
}
```

Allowed `audio.mode` values:

- `none`
- `original`
- `local`
- `mix`

## Card Object

Each card must include:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `order` | number | yes | 1-based card order. |
| `sourceType` | string | yes | `photos` or `folder`. |
| `sourceName` | string | yes | Album name or folder label. |
| `assetId` | string | yes | Stable local/source identifier when available. |
| `originalMediaKind` | string | yes | `image` or `video`. |
| `outputMediaKind` | string | yes | Usually `video` for DraftForge v1. |
| `outputPath` | string | yes | Relative path to rendered card. |
| `durationSeconds` | number | yes | Output duration. |
| `width` | number | yes | Output width. |
| `height` | number | yes | Output height. |
| `audioMode` | string | yes | Effective audio mode for this card. |
| `musicTrackPath` | string/null | yes | Redacted or relative track label; avoid absolute paths by default. |
| `musicOffsetSeconds` | number/null | yes | Offset used for local music. |
| `verification` | object | yes | ffprobe/render verification summary. |

Example:

```json
{
  "order": 1,
  "sourceType": "photos",
  "sourceName": "Gram_Studio",
  "assetId": "photos:local:ABC123",
  "originalMediaKind": "image",
  "outputMediaKind": "video",
  "outputPath": "media/01_card.mp4",
  "durationSeconds": 6.5,
  "width": 1080,
  "height": 1350,
  "audioMode": "local",
  "musicTrackPath": "music/redacted-track-01.mp3",
  "musicOffsetSeconds": 12,
  "verification": {
    "hasVideo": true,
    "hasAudio": true,
    "codecVideo": "h264",
    "codecAudio": "aac"
  }
}
```

## Outputs Object

Recommended shape:

```json
{
  "mediaDir": "media",
  "captionPath": "caption.txt",
  "reviewPath": "review.md",
  "previewPath": "preview.html"
}
```

## Safety Object

Minimum required shape:

```json
{
  "publishAllowed": false,
  "scheduleAllowed": false,
  "requiresManualReview": true
}
```

`publishAllowed` and `scheduleAllowed` must be `false` in v1 manifests.

## Privacy Rules

Default manifests:

- use relative output paths;
- avoid Johnny-specific or user-specific absolute source paths;
- may redact source music paths into stable labels;
- should not include credentials, cookies, profile paths, or tokens.

Debug manifests may include absolute paths only when explicitly requested with a future `--debug-manifest` style option.
