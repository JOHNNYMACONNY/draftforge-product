# DraftForge Skill

Creates social carousel drafts from local media, with optional Meta Business Suite export.

## Setup

After cloning the repo, link or install:

```bash
# For Hermes agents
hermes skills import /path/to/draftforge

# Or add to PATH
export PATH=$PATH:/path/to/draftforge/assets
```

## Available Actions

### `init-config`
Create a new `draftforge.config.json`:
```bash
node draftforge/index.js init --out ./draftforge.config.json
```

### `validate-setup`
Check configuration before rendering:
```bash
node draftforge/index.js doctor --config ./draftforge.config.json
```

### `prepare-carousel`
Generate carousel package from config:
```bash
node draftforge/index.js prepare --config ./draftforge.config.json --count N --out ./pack
```

### `export-mbs`
Save draft to Meta Business Suite (requires login):
```bash
node draftforge/mbs-draft.js --manifest ./pack/manifest.json --allow-live-mutation
```

### `create-handoff`
Zip pack for manual upload:
```bash
node draftforge/handoff.js --pack ./pack --out ./handoff.zip
```

## Agent Integration Pattern

```js
// Example: Agent calls DraftForge programmatically
const { execSync } = require('child_process');
execSync('node /path/to/draftforge/index.js prepare --config config.json --out ./pack', { stdio: 'inherit' });
```

## Configuration Schema

```json
{
  "source": {
    "kind": "photos-album|folder",
    "query": "AlbumName|/path/to/folder"
  },
  "audio": {
    "mode": "none|original|local|mix",
    "localFolder": "/path/to/music"
  },
  "metaBusinessSuite": {
    "businessId": "YOUR_BUSINESS_ID",
    "assetId": "YOUR_INSTAGRAM_ASSET_ID",
    "expectedAccountLabel": "Account Name"
  }
}
```

## Safety Notes

- Requires `--allow-live-mutation` flag for Meta integration
- Browser opens in visible mode for user confirmation
- Drafts only, never publishes