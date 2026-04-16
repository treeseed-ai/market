# Market Deploy

## Bootstrap

1. Supply the required staging and production credentials through `treeseed config` or the matching GitHub secrets and variables.
2. Run `treeseed config --environment staging` and `treeseed config --environment prod`.
3. Confirm the reported readiness for each environment is `deployable`.

## Config Files

- `treeseed.site.yaml`: infrastructure, providers, managed services, Cloudflare resources, and Railway topology.
- `src/manifest.yaml`: tenant content inventory and site model behavior.
- `src/config.yaml`: presentation, menus, branding, and authoring-facing defaults.

## Staging

1. Push to `staging`.
2. The deploy workflow will verify the workspace, provision or confirm Cloudflare and Railway resources, apply D1 migrations, deploy code, publish content when required, and run the monitor health gate.
3. Treat staging as the required rehearsal for production.

## Production

1. Merge validated changes from `staging` to `main`.
2. Push a tag for code releases. Leave content-only promotions untagged.
3. The production workflow follows the same provision, migrate, deploy, publish, and monitor sequence as staging.

## Required Runtime Surfaces

- Cloudflare Pages
- Cloudflare Worker/API runtime
- Cloudflare D1
- Cloudflare R2
- Cloudflare Queue and DLQ
- Railway `api`
- Railway `manager`
- Railway `worker`
- Railway `agents`
- Railway `runner`
- Railway `workdayStart`
- Railway `workdayReport`
