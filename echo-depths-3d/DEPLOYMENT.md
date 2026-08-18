# ECHO DEPTHS Deployment Record

Snapshot: 2026-08-17, Asia/Seoul.

## Required identity

- GitHub repository: `https://github.com/jhy0285/game-codex-archive`
- Branch: `main`
- Project folder and Vercel Root Directory: `echo-depths-3d`
- Required new Vercel project name: `echo-depths-3d`
- Deployment type: Vite static production build

This game must receive its own Vercel project, deployment history, and production alias. It may not be linked to a sibling game.

## Current external state

| Record | State at snapshot |
| --- | --- |
| Repository remote | `origin` points to `https://github.com/jhy0285/game-codex-archive.git` |
| Branch | `main` |
| Intake base commit | `022f499` (`fix(echo-heist): improve mobile touch and fullscreen`) |
| Released runtime implementation | `0ea2318872b14876fcb4e15a974d48ea586709e5` (`fix(echo-depths-3d): harden puzzle runtime and release checks`) |
| Hosted-smoke hardening | `4e77423fe378ce5d5c95b48d29933386bd26f5b0` (`test(echo-depths-3d): harden hosted smoke checks`) |
| GitHub push containing ECHO DEPTHS | `main` pushed to `origin`; `git ls-remote origin refs/heads/main` was checked after the release push |
| New Vercel project | `echo-depths-3d`, ID `prj_s42Kw6wf1BRmonXJKpoyE29m1G9Z`, team `ai-build3` (`team_3yhqT43fxZp9JrgzpcUZCmpb`) |
| Confirmed project configuration | Root Directory `echo-depths-3d`; Vite; install `npm ci`; build `npm run build`; output `dist`; Node 24.x |
| Verified candidate deployment | `dpl_6PkCsMr1xN8nRTReziHgJP45LZDd` — `https://echo-depths-3d-d9o1c7o5e-ai-build3.vercel.app` |
| Production deployment | `dpl_9iieCJ7GovQ4yeHH8rDzT5SxCwYP` — `https://echo-depths-3d-9vroevrmi-ai-build3.vercel.app` |
| Production alias | `https://echo-depths-3d.vercel.app` |
| Candidate/production browser validation | Candidate 5/5 in 59.7 seconds; final production 5/5 in about 1.1 minutes |
| Vercel build/log review | Ready; `npm ci` found 0 vulnerabilities and the Vercel build completed successfully with 38 transformed modules; no application runtime errors were observed by the public browser collectors |
| Latest carry-anchor source | `b1d49811ba0361a8816f69e73f553d9fd022a696` (`fix(echo-depths-3d): anchor carried cargo beside hands`), pushed to `origin/main` with remote-head verification |
| Latest candidate / production | Candidate `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ` → production `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx`; alias remains `https://echo-depths-3d.vercel.app` |
| Late-chapter clearability source | `6046e009bdce64e90c109d1b117d774a957391d0` (`fix(echo-depths-3d): make late chapter routes clearable`); pushed with verification record `46602c2` |
| Latest candidate / production | Candidate `dpl_3AN2dPKpusX5waCJnAMoTv7i1Wc2` → production `dpl_DT6wvejwq8Txz1BtMTpfvRaiP17s`; alias remains `https://echo-depths-3d.vercel.app` |
| Pressure-scanner presentation source | `6b17461598bc2c6999265dcb0b9b57cef2dfdb5b` (`fix(echo-depths-3d): replace pressure buttons with scanners`); pushed to `origin/main` with remote-head verification |
| Latest candidate / production | Candidate `dpl_8uP6jsXu17BHB1WUo79ipXe3H7HR` → production `dpl_2EoEkQKZQmJmn91VJnFtFHcuwh9y`; alias remains `https://echo-depths-3d.vercel.app` |
| Industrial-device presentation source | `0c9b60e522d38c7dd880d19efd9f87dc2ef2addf` (`feat(echo-depths-3d): upgrade industrial puzzle devices`); pushed to `origin/main` with remote-head verification |
| Latest candidate / production | Candidate `dpl_24QfQ97NV5ZfJSnvNe7pJ97pc6vz` → production `dpl_GmnucrocKXFNKB5qqFarh4rdV8Df`; alias remains `https://echo-depths-3d.vercel.app` |
| PC movement/camera source | `a7e88b1bf031020b57b6ff744ff0b1882b5f2ce1` (`feat(echo-depths-3d): polish PC movement and camera`); pushed to `origin/main` with remote-head verification |
| Latest candidate / production | Candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` → production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC`; alias remains `https://echo-depths-3d.vercel.app` |
| Device-motion audio source | `6555825f68beab09bf289a7c83df2f194517da42` (`feat(echo-depths-3d): add device motion audio`); pushed to `origin/main` with remote-head verification |
| Device-motion audio and all-chapter deployment | Candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` passed smoke 6/6; promoted production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC` is Ready and public smoke passed 6/6 |

The project directory was untracked at documentation intake. It is now independently committed, pushed on `main`, and deployed from its own Vercel project. The pre-existing modification to `echo-heist/package-lock.json` remains outside this game's staging scope.

## PC repair release

| Record | Verified fact |
| --- | --- |
| Source commit | `0c4630afc9bf35f7874ab321f4050050128962fd` (`fix(echo-depths-3d): repair PC interactions and level dressing`), pushed to `origin/main` with remote head verification |
| Local evidence | Strict Vite build PASS (38 modules), Vitest 75/75, Playwright 8/8, and local production smoke 5/5 |
| Candidate | `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW` — `https://echo-depths-3d-7c96p2th9-ai-build3.vercel.app`, Ready; protected candidate smoke PASS 5/5 in 1.3 minutes including desktop `E` |
| Production | `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT` — `https://echo-depths-3d-31zcpamui-ai-build3.vercel.app`, Ready; public alias `https://echo-depths-3d.vercel.app` smoke PASS 5/5 in 1.1 minutes |
| Build/log note | The local Vercel static builder hit a Windows `spawn cmd.exe ENOENT` runner issue after `npm ci`; `vercel deploy --prebuilt --dry` accepted 57 files from the separately passing Vite build. Vercel returned no runtime logs for the static production deployment. |

## First-descent sensor/gate release

| Record | Verified fact |
| --- | --- |
| Source commit | `31884e12f602ff9c1773881d6766d1768ce6a742` (`fix(echo-depths-3d): unblock first echo gate`), pushed to `origin/main` with remote head verification |
| Local evidence | Strict Vite build PASS (38 modules), Vitest 77/77, Playwright 9/9, and local production smoke 6/6 in 1.4 minutes |
| Candidate | `dpl_F6rWbcdYon6Q9mVUUzaEPvVGeRAT` — `https://echo-depths-3d-lf5tp01cw-ai-build3.vercel.app`, Ready; protected candidate smoke PASS 6/6 in 2.3 minutes, including the full PC Chapter 1 route |
| Production | `dpl_76sKrPvgfYcSJCoLUqXAxD8UdbQJ` — `https://echo-depths-3d-qmod9hnws-ai-build3.vercel.app`, Ready; public alias `https://echo-depths-3d.vercel.app` smoke PASS 6/6 in 2.1 minutes |
| Build/log note | Vercel retrieved 58 files, used prebuilt `.vercel/output` artifacts, deployed successfully, and reported Ready. The public browser suite collected no page, console, or first-party request failures. |

## First-two-stage completion release

| Record | Verified fact |
| --- | --- |
| Source commit | `3612837e6ff74eacc9d8457ae9d61b75f1b23445` (`fix(echo-depths-3d): complete first two stages`), pushed to `origin/main` with remote head verification |
| Local evidence | Strict Vite build PASS (38 modules), Vitest 81/81, Playwright 11/11 in 2.6 minutes, and local production smoke 6/6 in 40.6 seconds |
| Candidate | `dpl_B41ZFUiE1u4TKGg3PgVm1v8H4GtE` — `https://echo-depths-3d-8833u0nev-ai-build3.vercel.app`, Ready; protected candidate smoke PASS 6/6 in 1.0 minute |
| Production | `dpl_GFqr3mn3kSzE4qb9i3JSPDrSE6L2` — `https://echo-depths-3d-r4kieaoa7-ai-build3.vercel.app`, Ready; public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and smoke PASS 6/6 in 52.7 seconds |
| Build/log note | Vite built 38 modules into prebuilt Vercel static output; production has no runtime logs for the static deployment. The public browser run collected no page, console, or first-party request failures. |

## PC orientation, carry, and render-cost release

| Record | Verified fact |
| --- | --- |
| Source commit | `3a9b0f9add8570c7271e2f41546e379e8a5f84b3` (`feat(echo-depths-3d): add PC orientation and carry polish`), pushed to `origin/main` with remote-head verification |
| Local evidence | `npm ci` found 0 vulnerabilities; strict TypeScript and Vite build PASS (38 modules); Vitest 83/83; Playwright 13/13 in 3.3 minutes; local production smoke 6/6 in 44.9 seconds |
| Candidate | `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S` — `https://echo-depths-3d-gmyhyvoil-ai-build3.vercel.app`, Ready; candidate smoke PASS 6/6 in 53.7 seconds |
| Production | `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi` — `https://echo-depths-3d-j4bfnkrlk-ai-build3.vercel.app`, Ready; public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and public smoke PASS 6/6 in 1.1 minutes |
| Build/log note | Vercel accepted prebuilt static output, downloaded 61 deployment files, and reported Ready. The candidate and public browser runs collected no page, console, or first-party request failures. |

## Carry visual anchoring release

| Record | Verified fact |
| --- | --- |
| Source commit | `b1d49811ba0361a8816f69e73f553d9fd022a696` (`fix(echo-depths-3d): anchor carried cargo beside hands`), pushed to `origin/main` with remote-head verification |
| Local evidence | `npm ci` found 0 vulnerabilities; strict TypeScript and Vite build PASS (38 modules); Vitest 84/84; Playwright 13/13 in 3.0 minutes; local production smoke 6/6 in 50.4 seconds |
| Candidate | `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ` — `https://echo-depths-3d-2nfru1hyn-ai-build3.vercel.app`, Ready; candidate smoke PASS 6/6 in 1.2 minutes |
| Production | `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx` — `https://echo-depths-3d-7ui65p294-ai-build3.vercel.app`, Ready; public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and public smoke PASS 6/6 in 1.3 minutes |
| Build/log note | Vercel accepted prebuilt static output and reported Ready. The local hand-clearance screenshot was visually inspected; candidate and public browser runs collected no page, console, or first-party request failures. |

## Late-chapter clearability release

| Record | Verified fact |
| --- | --- |
| Source commit | `6046e009bdce64e90c109d1b117d774a957391d0` (`fix(echo-depths-3d): make late chapter routes clearable`), pushed to `origin/main` with verification record `46602c2` |
| Local evidence | Strict Vite build PASS (38 modules), Vitest 88/88, Playwright 13/13 in 3.1 minutes, targeted Chapter 2 browser completion in 54.2 seconds, local production smoke 6/6 in 38.0 seconds, and Chapter 3–5 visual review |
| Candidate | `dpl_3AN2dPKpusX5waCJnAMoTv7i1Wc2` — `https://echo-depths-3d-f88l5omh7-ai-build3.vercel.app`, Ready; candidate smoke PASS 6/6 in 56.5 seconds |
| Production | `dpl_DT6wvejwq8Txz1BtMTpfvRaiP17s` — `https://echo-depths-3d-1il7sg54s-ai-build3.vercel.app`, Ready; public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and smoke PASS 6/6 in 56.7 seconds |
| Build/log note | Vercel accepted 61 prebuilt static files and reports a Ready static build with no application runtime logs. Candidate and public browser runs collected no page, console, or first-party request failures. |

## Pressure-scanner presentation release

| Record | Verified fact |
| --- | --- |
| Source commit | `6b17461598bc2c6999265dcb0b9b57cef2dfdb5b` (`fix(echo-depths-3d): replace pressure buttons with scanners`), pushed to `origin/main` with remote-head verification |
| Local evidence | `npm ci` found 0 vulnerabilities; strict Vite build PASS (38 modules), Vitest 89/89, Playwright 13/13 in 3.0 minutes, local production smoke 6/6 in 44.4 seconds, and a 1440×900 Chapter 1 scanner capture review |
| Candidate | `dpl_8uP6jsXu17BHB1WUo79ipXe3H7HR` — `https://echo-depths-3d-8ghnf1fzn-ai-build3.vercel.app`, Ready; candidate smoke PASS 6/6 in 1.1 minutes |
| Production | `dpl_2EoEkQKZQmJmn91VJnFtFHcuwh9y` — `https://echo-depths-3d-1b9y3li8h-ai-build3.vercel.app`, Ready; public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and smoke PASS 6/6 in 54.4 seconds |
| Build/log note | Vercel retrieved 64 files, used prebuilt `.vercel/output` artifacts, and reported Ready with no application runtime logs. Candidate and public browser runs collected no page, console, or first-party request failures. |

## Industrial device presentation release

| Record | Verified fact |
| --- | --- |
| Source commit | `0c9b60e522d38c7dd880d19efd9f87dc2ef2addf` (`feat(echo-depths-3d): upgrade industrial puzzle devices`), pushed to `origin/main` with remote-head verification |
| Local evidence | Strict Vite build PASS (38 modules), Vitest 90/90, Playwright 13/13 in 3.9 minutes, PC render-budget check, and Chapter 1/3/5 visual device review |
| Candidate | `dpl_24QfQ97NV5ZfJSnvNe7pJ97pc6vz` — `https://echo-depths-3d-kn26k7qm1-ai-build3.vercel.app`, Ready; candidate smoke PASS 6/6 in 2.0 minutes |
| Production | `dpl_GmnucrocKXFNKB5qqFarh4rdV8Df` — `https://echo-depths-3d-bevvcpvaq-ai-build3.vercel.app`, Ready; public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and smoke PASS 6/6 in 1.8 minutes |
| Build/log note | Vercel retrieved 65 files, used prebuilt `.vercel/output` artifacts, and reported Ready with no application runtime logs. Candidate and public browser runs collected no page, console, or first-party request failures. |

## Protected Vercel projects and aliases

The repository root records these existing identities. They must remain unchanged:

| Folder | Project ID | Production alias |
| --- | --- | --- |
| `404-not-found` | `prj_CWdrE9GtliLhWVm09n69WX7EgI2I` | `https://404-not-found-phi-seven.vercel.app` |
| `boss-forge` | `prj_CoS8bjZVnZoO5wlfGSCoYMzbbgTn` | `https://boss-forge-seven.vercel.app` |
| `echo-heist` | `prj_kTgdQNj3qb409QOLqYnik9nc2Zd5` | `https://echo-heist-gamma.vercel.app` |
| `patch-run` | `prj_xApZsFO4g0qOqxddgmsYYnYPx4hz` | `https://patch-run-weld.vercel.app` |
| `hollow knight` | `prj_tiIhZ6ROCSZk2GTW8ZlejUQ8uk9s` | `https://hollow-knight-three.vercel.app` |

The confirmed Vercel team is `AI_Build`, slug `ai-build3`, ID `team_3yhqT43fxZp9JrgzpcUZCmpb`. The protected projects and aliases above were not changed.

## Local release gate

Run from `echo-depths-3d/`:

```powershell
npm ci
npm test -- --run
npm run build
npm run test:e2e
```

The current source passes strict TypeScript, Vitest 84/84 across 16 files, the final production build, Playwright 13/13, local production-bundle smoke 6/6, candidate smoke 6/6, and final public production smoke 6/6.

Before staging, inspect from the repository root:

```powershell
git status --short --branch
git diff -- echo-depths-3d
git diff --cached --name-only
```

Only `echo-depths-3d/` paths belong in this release. Dependency folders, `dist/`, `.vercel/`, test artifacts, environment files, credentials, and the unrelated sibling lockfile change stay out of the commit.

## Isolated Vercel procedure

After the local browser gate passes and an intentional Git commit exists:

```powershell
npx vercel@latest login
npx vercel@latest link --project echo-depths-3d
npx vercel@latest pull
npx vercel@latest deploy
```

During link/setup, confirm:

- the project is newly created as `echo-depths-3d`;
- Root Directory is `echo-depths-3d` when configured from the repository, or the current project directory is used directly;
- build command is `npm run build`;
- output directory is `dist`;
- framework detection is Vite;
- no protected project ID or alias appears in `.vercel/project.json`;
- `.vercel/` remains uncommitted.

The first deployment is the candidate. Verify that exact URL before production promotion:

- first-party asset responses succeed;
- `render_game_to_text()` reports the expected initial state and `assetStatus: "kaykit"`;
- start, one real input path, echo creation, all five solution paths, ending, and restart pass;
- the four viewport layouts are readable and bounded;
- page errors, console errors, and failed requests remain empty;
- visual captures show the animated player, translucent echo, devices, and readable HUD.

Only after candidate verification should a production deployment be requested. This release used promotion of the verified candidate:

```powershell
npx vercel@latest promote dpl_6PkCsMr1xN8nRTReziHgJP45LZDd --scope ai-build3 --yes
```

The production alias was then checked for HTTP 200, the production smoke was rerun, and the Vercel build record was inspected. Vercel Git auto-deployment is not connected because the installed Vercel GitHub integration lacks access to the private repository; this release was deployed directly with the authenticated CLI from the committed repository tree.

## Release record format

The current factual state is recorded above. Future releases should preserve it in `CODEX_LOG.md` and add a dated entry containing:

- source commit hash and pushed branch;
- Vercel project ID and confirmed Root Directory;
- candidate deployment ID/URL and its verification result;
- production deployment ID/URL and its verification result;
- final alias;
- automated browser totals;
- console/page/request result;
- Vercel log result;
- remaining human-only review observations.

The 2026-08-15 external release entry is present in `CODEX_LOG.md`.

## PC movement and camera release

| Record | Verified fact |
| --- | --- |
| Source commit | `a7e88b1bf031020b57b6ff744ff0b1882b5f2ce1` (`feat(echo-depths-3d): polish PC movement and camera`), pushed to `origin/main`; `git ls-remote` matched the local head |
| Local evidence | `npm ci` found 0 vulnerabilities; strict Vite build PASS (38 modules), Vitest 93/93, targeted real PC mouse/keyboard route PASS, full Playwright 14/14 in 3.2 minutes, and PC tutorial/carry capture review |
| Candidate | `dpl_2mR1KvPWjb2tFffvbtsmyyvxEDEA` — `https://echo-depths-3d-b6amhisx3-ai-build3.vercel.app`, Ready; candidate production smoke PASS 6/6 in 1.1 minutes |
| Production | `dpl_6xtAgui3NMukXpfwJzCe3B3Rz4bV` — `https://echo-depths-3d-kadjb9d7n-ai-build3.vercel.app`, Ready; public alias returned HTTP 200 and public smoke PASS 6/6 in 54.5 seconds |
| Build/log review | Vercel retrieved 66 files, used `.vercel/output` prebuilt static artifacts, and reported Ready without application runtime logs |

## Device motion audio deployment status

| Record | Verified fact |
| --- | --- |
| Source commit | `6555825f68beab09bf289a7c83df2f194517da42` (`feat(echo-depths-3d): add device motion audio`), pushed to `origin/main`; `git ls-remote` matched the local head |
| Local evidence | `npm ci` found 0 vulnerabilities; strict Vite build PASS (38 modules), Vitest 96/96, Playwright 14/14 in 3.3 minutes, and local production smoke PASS 6/6 in 1.1 minutes |
| Candidate / production | Candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` — `https://echo-depths-3d-dsx4v836g-ai-build3.vercel.app`, Ready; candidate production smoke PASS 6/6 in 1.1 minutes. Promoted production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC` — `https://echo-depths-3d-kvrfv1856-ai-build3.vercel.app`, Ready |
| Public alias | `https://echo-depths-3d.vercel.app` returned HTTP 200 and final public smoke PASS 6/6 in 1.2 minutes |

## Temporary all-chapter access deployment status

| Record | Verified fact |
| --- | --- |
| Source commit | `b2e687a5220b48c02cb1a42eba15d25e14b437a0` (`feat(echo-depths-3d): unlock all campaign chapters`), pushed to `origin/main`; `git ls-remote` matched the local head |
| Local evidence | strict Vite build PASS (38 modules), Vitest 96/96, targeted fresh Chapter Select assertion PASS, and full Playwright 15/15 in 3.6 minutes |
| Candidate / production | Included in candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` and promoted production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC`; both Ready and candidate smoke PASS 6/6 |
| Public alias | `https://echo-depths-3d.vercel.app` returned HTTP 200 and public smoke PASS 6/6; Chapters 1–5 are now open before any clear |

## Windows certificate note

This Windows host initially reported `SELF_SIGNED_CERT_IN_CHAIN` from Node while a Windows TLS diagnostic reached Vercel when using the trusted system certificate store. Keeping TLS validation enabled, `NODE_OPTIONS=--use-system-ca` allowed `vercel whoami`, deploy, promotion, inspection, and Playwright HTTP checks to complete. Do not replace this with disabled TLS verification.
