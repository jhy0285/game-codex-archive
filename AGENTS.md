# Codex Repository Instructions

This repository is the portable source-of-truth for the browser games under this folder.

## Required reading

Before changing files:

1. Read `MIGRATION_HANDOFF.md`, `PROJECT_INDEX.md`, `MACHINE_SETUP.md`, and `DEPLOYMENTS.md`.
2. Read the target game's `AGENTS.md`, `progress.md`, `TASKS.md`, `TEST.md`, and `ASSET_CREDITS.md` when present.
3. Inspect `git status` and preserve unrelated user changes.

## Working agreements

- Treat the checked-in source, lockfiles, and handoff documents as authoritative. Do not rely on an old Codex chat being available.
- Do not change established gameplay mechanics, coordinates, timings, controls, or deployment aliases unless the user explicitly requests it.
- Do not copy Hollow Knight franchise code, characters, audio, or proprietary artwork. Preserve the existing original dark-fantasy direction and documented asset provenance.
- Never commit `.env*`, access tokens, credentials, `.vercel/`, dependency folders, build outputs, or transient browser-test artifacts.
- Use `npm ci` for reproducible installs. Run the target project's documented build and automated tests after changes.
- Keep `progress.md`, `TEST.md`, `TASKS.md`, `CODEX_LOG.md`, and `ASSET_CREDITS.md` synchronized when work materially changes a game.
- Preserve the production URLs recorded in `DEPLOYMENTS.md`; deploy to the existing Vercel project unless the user asks for a new project.

## Project-specific verification

- `404-not-found`: `npm run build`, then `npm run test:e2e`.
- `boss-forge`: `npm test`, `npm run build`, then `npm run test:e2e`.
- `echo-heist`: `npm test`, `npm run build`, then `npm run test:e2e`.
- `patch-run`: `npm test`, `npm run build`, then `npm run test:e2e`.

