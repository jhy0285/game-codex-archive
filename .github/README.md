# GitHub Actions

This directory holds the CI/CD workflows for the game-codex-archive repo.

## Workflows

### `test.yml` — pull requests
- Triggers: every PR to `main`, or manual dispatch
- Jobs: Vitest (96 tests) + TypeScript strict compile + production build
- Does **not** deploy — PRs can be reviewed without burning Vercel builds

### `deploy.yml` — push to `main`
- Triggers: every push to `main`, or manual dispatch
- Jobs: install → test → build → create .vercel/project.json → `vercel deploy --prebuilt --prod`
- Deploys the new commit to the existing `echo-depths-3d` Vercel project (id `prj_s42Kw6wf1BRmonXJKpoyE29m1G9Z`)
- Updates the canonical alias `https://echo-depths-3d.vercel.app`

## Required GitHub Secret

| Name | Source |
|------|--------|
| `VERCEL_TOKEN` | Vercel account token with deploy scope |

### How to create the token
1. Go to <https://vercel.com/account/tokens>
2. Click "Create Token", name it `game-codex-archive`, scope: Full Account (or limited to the `ai-build3/echo-depths-3d` project if you prefer)
3. Copy the token immediately (it is only shown once)
4. In this repo: Settings → Secrets and variables → Actions → "New repository secret"
5. Name: `VERCEL_TOKEN`, Value: paste the token, Save

## Why this is better than `vercel redeploy` from a local terminal
- The Vercel token never appears in terminal history, git diffs, or process listings on the local machine
- Every push to `main` automatically updates production without a manual `vercel` invocation
- Pull requests run the full test suite (96 Vitest + strict tsc + production build) before any merge, so a broken build is caught at PR time
- PRs do not deploy, so a broken feature branch cannot accidentally overwrite production

## Windows note
The local `vercel build` previously failed on this Windows host because the CLI tries to spawn `cmd.exe` to run `npm ci`, which Node's child_process could not resolve. GitHub Actions runs on Linux where `vercel build` (and `npm ci`) work natively, so the pipeline is unaffected by the local Windows quirk.
