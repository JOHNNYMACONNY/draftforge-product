# DraftForge Safety Model

## Core Rule

DraftForge is a draft-preparation system, not a publishing bot.

## Mode Safety

| Mode | Safe default | Notes |
|---|---:|---|
| `prepare` | Yes | Local-only; no social login. |
| `preview` | Yes | Local-only review surface. |
| `handoff` | Yes | Local zip/export for manual upload. |
| `mbs-draft` | Guarded | Live browser action; explicit approval required. |

## Live Mutation Gate

Meta Business Suite draft mode requires explicit `--allow-live-mutation`.

Without that flag, an adapter must refuse to upload, click, type, save, or otherwise mutate a live social surface.

## Allowed MBS Adapter Actions

When explicitly approved, the adapter may:

- open the configured Meta Business Suite composer;
- verify the target account label;
- upload prepared media from a verified DraftForge manifest;
- enter the prepared caption;
- click the draft/save/Finish later control;
- collect proof screenshots/logs;
- report whether recovery proof was exact, partial, or uncertain.

## Forbidden MBS Adapter Actions

The adapter must never click Publish.

The adapter must never click Schedule.

The adapter must never click Boost.

The adapter must never click Delete.

The adapter must never interact with payment UI.

The adapter must never accept permissions, checkpoints, login prompts, account recovery prompts, or password prompts.

The adapter must never type secrets.

## Stop Conditions

Stop and report if any of these appear:

- login wall;
- account checkpoint;
- permission dialog;
- password prompt;
- payment prompt;
- unexpected account label;
- missing or invalid manifest verification;
- media upload mismatch;
- publish/schedule surface becomes the only visible forward action.

## Agent Responsibilities

Agents using DraftForge must:

1. run local preparation before live draft attempts;
2. verify rendered media with ffprobe or equivalent;
3. require explicit user approval before `mbs-draft` live mutation;
4. preserve draft-only boundaries;
5. report proof honestly;
6. label uncertainty as uncertainty.

Draft recovery uncertainty must be reported as uncertainty, not success.

## Music Rights

Users are responsible for rights and permissions for any music they include. DraftForge can use local files, but local availability does not imply publishing rights.

## Security Boundary

DraftForge manifests and review packets must not include credentials, cookies, browser profile secrets, tokens, or private keys.
