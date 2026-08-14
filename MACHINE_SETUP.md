# New PC Setup

Recorded source-machine versions on 2026-08-14:

- Windows
- Node.js `v22.22.1`
- npm `10.9.4`
- Git `2.45.1.windows.1`
- GitHub CLI `2.97.0`

## Restore

```powershell
git clone https://github.com/jhy0285/game-codex-archive.git game
Set-Location game
git status
```

Restore secrets separately. Do not extract secret files into a folder that will be committed without checking `git status`.

## Install and verify

Run the following in each of `404-not-found`, `boss-forge`, `echo-heist`, and `patch-run`:

```powershell
npm ci
npx playwright install chromium
npm run build
```

Then run the project-specific tests listed in the root `AGENTS.md`.

## Codex continuation

Open the cloned `game` folder as the workspace root in the Codex app. Start a new chat and use the first-prompt template in `MIGRATION_HANDOFF.md`. The root `AGENTS.md` supplies persistent repository instructions automatically.

## Vercel

Use `npx vercel@latest` if the CLI is not installed globally. Log in again on the new PC and reconnect each folder using `DEPLOYMENTS.md`. Prefer fresh authentication over migrating an old OIDC token.

