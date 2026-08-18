# ECHO DEPTHS Agent Instructions

These instructions apply to every file under `echo-depths-3d/`.

## Read before changing the game

1. Read the repository-root `AGENTS.md`, `MIGRATION_HANDOFF.md`, `PROJECT_INDEX.md`, `MACHINE_SETUP.md`, and `DEPLOYMENTS.md`.
2. Read this file plus `PLAN.md`, `GAME.md`, `TASKS.md`, `TEST.md`, `ASSET_CREDITS.md`, `DEPLOYMENT.md`, `CODEX_LOG.md`, and `progress.md`.
3. Inspect `git status --short --branch`, the current branch, recent commits, and remotes.
4. Preserve any unrelated change already present in the worktree.

## Scope and protected projects

Work for this game stays inside `echo-depths-3d/`. Do not modify, delete, rename, stage, or deploy these sibling projects:

- `404-not-found`
- `boss-forge`
- `echo-heist`
- `patch-run`
- `hollow knight`

Do not reuse any sibling's Vercel identity or alias. The `echo-heist` project and `https://echo-heist-gamma.vercel.app` are specifically protected. ECHO DEPTHS uses a separate Vercel project named `echo-depths-3d` with `echo-depths-3d` as its Root Directory.

## Product invariants

- Keep the game an independent 3D quarter-view echo puzzle-action title, not a coordinate conversion of Echo Heist.
- Preserve five chapters and the ending described in `GAME.md`.
- Keep multiple heights, stairs, jumping, falls, an elevator, a moving platform, a rotating bridge, cross-height throwing, cover, deterministic enemy attention, height-aware attacks, and simultaneous present/echo devices.
- Keep React out of the project. Three.js owns the canvas and HTML/CSS owns the semantic UI.
- Keep English and Korean complete for loading, title, controls, chapters, HUD, pause, failures, completion, ending, errors, fullscreen state, and orientation guidance.
- Preserve full campaign and chapter reset behavior. A rebuild must release runtime physics, animation, render, input, audio, and transient-effect state owned by the old run. Keep the rebuild generation guard so a stale asynchronous physics initialization cannot overwrite a newer runtime.
- Do not import franchise code or assets from Hollow Knight or any other protected game.

## Deterministic simulation contract

- Gameplay runs at 60 fixed ticks per second through `FixedStepAccumulator`.
- Echo frames contain quantized movement, facing, held interaction, and discrete action bits; they do not contain a sequence of actor coordinates.
- Present and echo use the same `CharacterMotor` and `DungeonWorld` action paths.
- Starting a tape captures `MotorSnapshot` and `DungeonWorldSnapshot`: actor movement state; device/dynamic transforms and motion; carry/body ownership; receiver and enemy state; device holds; facts; and the countdown. Finishing it rebuilds the chapter, restores the record-start snapshot, remaps past player ownership to the echo, and begins replay. A new tape replaces the previous echo.
- At tape end, movement and discrete presses stop. Only the allowed held-interaction bit may remain active.
- Player and echo must not collide with one another.
- Keep deterministic update ordering stable: input and motor intent, support/device pre-step updates, actions, Rapier step, actor synchronization, device/enemy/objective post-step updates, presentation.
- Enemy routes and attention rules must stay learnable and free of random solution changes.
- Removing an actor must clear device ownership and any enemy target that still names that actor.
- Guardian distance checks must use the unnormalized target distance. Chapter 5 completion must require the echo currently occupying the lower seal and the player currently holding the upper lever, not only historical facts.

Changes to fixed rate, input quantization, echo capacity, level coordinates, device thresholds, movement values, timers, objective facts, and scoring require corresponding unit and browser coverage plus synchronized documentation.

## Physics and rendering contract

- Use `@dimforge/rapier3d-compat` for collision bodies, colliders, sensors, gravity, and the kinematic capsule character.
- Fixed gameplay sensors must enable collision types that report kinematic actors and enemies. Preserve the real Rapier overlap regression when changing collider groups or sensor construction.
- Keep render objects separate from Rapier records and synchronize them explicitly.
- Preserve autostep, slope handling, snap-to-ground, coyote time, jump buffering, gravity, landing, dash, and actor filtering in `CharacterMotor`.
- Load packaged models through `GLTFLoader` and clone skinned characters with `SkeletonUtils`.
- Drive actual clips with `AnimationMixer`. Required states are Idle, Walk, Run, Jump, Fall, Land, Carry, Throw, Interact, Attack, Dash, Hit, and Defeat.
- Preserve crossfades and locomotion time scaling so movement and foot cadence remain connected.
- Keep the graceful code-built animated rig available when the packaged model or full clip set cannot load. Runtime asset status must reveal which path is active.
- Keep cloned actor geometry/material ownership isolated so disposing an old player or echo cannot invalidate the surviving actor or cached source model.
- Cap device pixel ratio, keep the mobile shadow preset, and dispose per-run GPU resources.

## Asset rules

- Treat `public/assets/kaykit/provenance.json` as the machine-readable source record.
- Only use files from the four official KayKit downloads recorded there.
- Keep the copied license texts with the shipped selection.
- Keep source archives outside `public/` and outside Git.
- When an asset is added, removed, renamed, resized, transcoded, or otherwise changed, update the manifest, provenance file, and `ASSET_CREDITS.md` together, then verify file hashes and HTTP loading.
- Do not describe a source asset as original project artwork. Credit Kay Lousberg even though CC0 does not require attribution.

## Input and accessibility rules

- Preserve desktop keyboard and pointer controls plus multi-touch movement, camera, and action input.
- Keep the nearest-interactable outline and localized HUD prompt synchronized with the same proximity query used for interaction.
- Keep every interactive touch target at least 48 px in each dimension.
- Use pointer capture and release input on pointer end, pointer cancellation, blur, hidden visibility, orientation change, pause, and reset.
- Fullscreen rejection and orientation-lock rejection must remain nonfatal.
- Portrait orientation must display localized landscape guidance and pause the simulation.
- Do not hide keyboard focus, overflow failures, or unreadable bilingual copy behind canvas-only presentation.

## Verification

Use lockfile installation and run the checks from the project directory:

```powershell
npm ci
npm test -- --run
npm run build
npm run test:e2e
```

The recovered source has a strict TypeScript pass, Vitest 72/72 across 16 files, a final production build pass, Playwright 8/8, local production-bundle smoke 5/5, candidate smoke 5/5, and public production smoke 5/5.

Browser verification must exercise the language gate, title, real keyboard input, jump, interaction, echo creation, all five authored solution paths, ending, complete restart, fullscreen rejection, first-party asset responses, runtime error collection, portrait guidance, landscape touch input, and viewports `390x844`, `844x390`, `1024x768`, and `1440x900`. Inspect chapter and mobile captures for black frames, missing geometry, animation failures, clipped UI, unreadable text, and incorrect asset fallback.

`window.render_game_to_text()` and `window.advanceTime(milliseconds)` are stable test-facing interfaces. `window.echoDepthsDebug` is restricted to development builds.

## Human-review boundary

Automation may establish state transitions, deterministic rules, layout bounds, responses, and runtime error absence. It does not establish physical-keyboard feel, real-device finger comfort, motion comfort, subjective difficulty, puzzle discovery quality, bilingual nuance, animation polish, audio balance, or overall fun. Record those as human observations only after a person performs them.

## Release discipline

- Do not stage unrelated root or sibling changes.
- Do not commit dependency folders, build output, `.vercel/`, browser artifacts, credentials, tokens, or environment files.
- Do not record a Git commit, push, candidate URL, deployment ID, production alias, public verification, or Vercel log result until the exact evidence exists.
- Verify a candidate deployment before promotion, then rerun the browser checks against the final production URL and inspect Vercel logs.
- Keep `README.md`, `TASKS.md`, `TEST.md`, `ASSET_CREDITS.md`, `DEPLOYMENT.md`, `CODEX_LOG.md`, and `progress.md` synchronized with material implementation or release changes.

At the 2026-08-15 release snapshot, the implementation and hosted-smoke commits are on `main`, the isolated Vercel project is production-ready, and `https://echo-depths-3d.vercel.app` is the verified public alias. Preserve the exact identifiers in `DEPLOYMENT.md` when making future releases.
