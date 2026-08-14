# Vercel Deployments

Existing deployments remain live and are not replaced by this migration.

| Folder | Vercel project | Project ID | Public production alias |
| --- | --- | --- | --- |
| `404-not-found` | `404-not-found` | `prj_CWdrE9GtliLhWVm09n69WX7EgI2I` | https://404-not-found-phi-seven.vercel.app |
| `boss-forge` | `boss-forge` | `prj_CoS8bjZVnZoO5wlfGSCoYMzbbgTn` | https://boss-forge-seven.vercel.app |
| `echo-heist` | `echo-heist` | `prj_kTgdQNj3qb409QOLqYnik9nc2Zd5` | https://echo-heist-gamma.vercel.app |
| `patch-run` | `patch-run` | `prj_xApZsFO4g0qOqxddgmsYYnYPx4hz` | https://patch-run-weld.vercel.app |

The original Vercel team ID recorded locally was `team_3yhqT43fxZp9JrgzpcUZCmpb`.

## Reconnect on the new PC

From each project directory:

```powershell
npx vercel@latest login
npx vercel@latest link --project <project-name>
npx vercel@latest pull
```

Confirm the correct Vercel team during `link`. Do not commit `.vercel/` or copied authentication tokens. A production deployment should only be made after local build and automated tests pass.

