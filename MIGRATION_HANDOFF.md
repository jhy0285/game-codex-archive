# Codex Migration Handoff

Snapshot date: 2026-08-14 (Asia/Seoul)

## Purpose

This folder is being transferred from the original Windows PC to another PC and another Codex app installation. The repository, not the previous chat session, is the canonical continuation point.

## What has been completed

### 404-not-found

- Expanded the original interactive 404 signal hunt into a three-act game.
- Act I is traversal and signal collection; Act II is the Redacted Choir wave encounter; Act III is the Blind Archivist boss fight.
- Added movement animation states, jump, dash, strike, enemies, projectiles, boss patterns, recovery-only vulnerability, touch controls, reduced-motion behavior, deterministic test hooks, and `render_game_to_text` coverage.
- Integrated original generated Lost Archive, Silent Stacks, Index Throne, and Blind Archivist art. Prompts and processing are documented in `ASSET_CREDITS.md`.
- Latest recorded verification: production build passed, Playwright expansion suite passed 5/5, official game-client passes completed, and production was verified.

### boss-forge

- Completed the Gate 1 boss recipe prototype while preserving its selection and combat contract.
- Re-art-directed the game into an original gothic insect-fable arena: an ivory forge pilgrim versus the Rootbound Bell-Smith.
- Added deterministic eight-direction player rig motion, idle/run/fire/dodge poses, and boss limb/hammer/core choreography mapped to radial, aimed, and beam attack stages.
- Latest recorded verification: Vitest 5/5, production build passed, Playwright 5/5, production game-client verification passed.

### echo-heist

- Completed the two-sector deterministic echo-recording puzzle.
- Re-art-directed it as the Woven Under-Temple and added a 48-frame, four-direction pilgrim atlas with walk, idle, turn, and echo-hold states.
- Echo replay uses deterministic frames and afterimages without changing puzzle coordinates, timing, collision, or solution logic.
- Latest recorded verification: Vitest 6/6, production build passed, Playwright 6/6, local and production game-client verification passed.

### patch-run

- Completed the Gate 1 survival/patch prototype with `/`, `/pixel`, and `/overdrive` routes.
- Current canonical presentation is the Drowned Scriptorium gothic build; comparison builds remain available.
- Added articulated player states (`idle`, `walk`, `fire`, dash phases, `hit`, `dead`) and enemy states (`emerge`, `skitter`, `anticipate`, `hit`, `death`) while retaining the mechanics contract.
- Latest recorded verification: Vitest 5/5, production build passed, Playwright 3/3, local and production game-client verification passed.

### hollow knight

- The folder is empty in this snapshot. It does not contain the referenced third-party repository.
- The other games only adopted general browser-game techniques such as sprite animation, layered environments, particles, camera feedback, fullscreen, and fast restart. Reference code and franchise assets were not copied.

## Important current-state notes

- `boss-forge`, `echo-heist`, and `patch-run` were separate local Git repositories with large uncommitted working trees and no configured remotes at migration time.
- The portable GitHub repository is therefore a clean aggregate snapshot of the current files. Original nested `.git` histories are retained only in the encrypted migration archive.
- `echo-heist/.env.local` contains `VERCEL_OIDC_TOKEN` and must never be committed. Re-authenticate with Vercel on the new PC instead of reusing the token when possible.
- Existing Vercel production sites must remain online. Their aliases and project IDs are in `DEPLOYMENTS.md`.
- Human feel testing remains useful for touch controls, combat difficulty, timing, and readability even where automated verification passes.

## Recommended first task on the new PC

1. Confirm all files in `PROJECT_INDEX.md` are present.
2. Follow `MACHINE_SETUP.md` and install dependencies with `npm ci`.
3. Run every project's verification commands from `AGENTS.md`.
4. Compare deployed URLs with `DEPLOYMENTS.md`.
5. Read the selected game's local progress and task documents before implementing new work.

## Suggested first Codex prompt

```text
Read the root AGENTS.md, MIGRATION_HANDOFF.md, PROJECT_INDEX.md,
MACHINE_SETUP.md, and DEPLOYMENTS.md first. Then read the target game's
AGENTS.md, progress.md, TASKS.md, TEST.md, CODEX_LOG.md, and
ASSET_CREDITS.md. Summarize the current state and verify git status before
editing. Preserve existing gameplay contracts and Vercel aliases.
```

