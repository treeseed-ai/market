# Market Deploy

## Purpose

This runbook covers the first real bring-up of the Treeseed Market tenant.

The intended sequence is:

1. Make the repo codebase and tenant config structurally ready.
2. Run `treeseed config` to write and validate environment values.
3. Confirm the resulting state is `config_complete` or `provisioned`.
4. Run the provisioning workflow to create or reconcile foundational infrastructure.
5. Deploy code and publish content only after provisioning is healthy.

`treeseed config` is a preparation step. It should not be treated as the command that fully deploys the platform.

## Source Of Truth

- `treeseed.site.yaml`: infrastructure topology, managed services, hosting mode, providers
- `treeseed.site.yaml` must not carry operator connectivity values that already have config/env keys
- `src/manifest.yaml`: tenant content inventory and runtime feature modules
- `src/config.yaml`: site branding, menus, forms, and presentation defaults
- `.treeseed/config/machine.yaml`: machine-local resolved values and encrypted secrets
- `.treeseed/state/environments/*/deploy.json`: environment state, readiness, and deployment history

## Required Values Before `treeseed config`

These must exist before staging or prod can be considered fully configured:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `RAILWAY_API_TOKEN`
- `GH_TOKEN`
- `TREESEED_SMTP_HOST`
- `TREESEED_SMTP_PORT`
- `TREESEED_SMTP_USERNAME`
- `TREESEED_SMTP_PASSWORD`
- `TREESEED_SMTP_FROM`
- `TREESEED_SMTP_REPLY_TO`
- `TREESEED_PUBLIC_TURNSTILE_SITE_KEY`
- `TREESEED_TURNSTILE_SECRET_KEY`

These are expected operator inputs and are not synthesized by the repo.

Config-owned connectivity overrides that should stay out of `treeseed.site.yaml`:

- `TREESEED_MARKET_API_BASE_URL`
- `TREESEED_HOSTING_TEAM_ID`
- `TREESEED_PROJECT_ID`
- `TREESEED_CLOUDFLARE_PAGES_PROJECT_NAME`
- `TREESEED_CLOUDFLARE_PAGES_PREVIEW_PROJECT_NAME`
- `TREESEED_CONTENT_BUCKET_NAME`
- `TREESEED_CONTENT_BUCKET_BINDING`
- `TREESEED_CONTENT_PUBLIC_BASE_URL`

If these are unset, Treeseed falls back to structural defaults derived from the slug, site URL, and project-domain hints.

| Removed from `treeseed.site.yaml` | Config/env key | Needed by |
| --- | --- | --- |
| `cloudflare.accountId` | `CLOUDFLARE_ACCOUNT_ID` | `config`, `provision`, `deploy` |
| `hosting.marketBaseUrl`, `runtime.marketBaseUrl` | `TREESEED_MARKET_API_BASE_URL` | `config` when market registration applies; `deploy` for hosted control-plane flows |
| `hosting.teamId`, `runtime.teamId` | `TREESEED_HOSTING_TEAM_ID` | `config` when market registration applies |
| `hosting.projectId`, `runtime.projectId` | `TREESEED_PROJECT_ID` | `config` when market registration applies |
| `cloudflare.pages.projectName` | `TREESEED_CLOUDFLARE_PAGES_PROJECT_NAME` | `provision`, `deploy` |
| `cloudflare.pages.previewProjectName` | `TREESEED_CLOUDFLARE_PAGES_PREVIEW_PROJECT_NAME` | `provision`, `deploy` |
| `cloudflare.r2.bucketName` | `TREESEED_CONTENT_BUCKET_NAME` | `provision`, `publish_content` |
| `cloudflare.r2.binding` | `TREESEED_CONTENT_BUCKET_BINDING` | `provision`, `deploy` |
| `cloudflare.r2.publicBaseUrl` | `TREESEED_CONTENT_PUBLIC_BASE_URL` | `deploy verification`, `monitor` |

## Values That Can Remain Unset In Phase 1

These can remain unset while you are only preparing the repo for foundational bring-up:

- optional OAuth provider credentials
- remote Knowledge Coop pairing values
- final custom domain wiring beyond the committed tenant URLs
- any provider-side IDs that are created during real provisioning and later written back into local state

## Expected Readiness States

`treeseed status` and `treeseed config --json` now use the same environment phases:

- `pending`: no meaningful local state yet
- `config_incomplete`: required environment values are still missing or invalid
- `code_ready`: local environment is valid for development
- `config_complete`: environment values are valid but foundational infrastructure is not yet fully provisioned
- `provisioned`: foundational infrastructure exists and code deployment can proceed

Managed services are reported separately from environment state:

- `not deployed`: service topology exists in config, but no deployment has been recorded yet
- `deployed`: the service has a recorded deployment timestamp

## First Bring-Up Flow

### 1. Verify the repo baseline

Run:

```bash
npm run verify:local
npx treeseed status
```

Success criteria:

- `verify:local` passes
- local state is at least `code_ready`
- staging and prod do not report misleading deployed service state before real deployment

### 2. Configure local, staging, and prod

Run:

```bash
npx treeseed config --json
```

If values are missing, the command should fail with grouped per-environment blockers. Fix those values, then rerun:

```bash
npx treeseed config --environment staging --environment prod --json
```

Success criteria after real values are present:

- local reports `code_ready`
- staging reports `config_complete` or `provisioned`
- prod reports `config_complete` or `provisioned`
- `.treeseed/state/environments/staging/deploy.json` exists
- `.treeseed/state/environments/prod/deploy.json` exists

`config_complete` is an acceptable success state before the first real provisioning pass.

### 3. Provision foundational infrastructure

Provisioning is the step that should create or reconcile:

- Cloudflare Pages
- Cloudflare Worker
- Cloudflare D1
- Cloudflare Queue and DLQ
- Cloudflare R2
- Railway `api`
- Railway `manager`
- Railway `worker`
- Railway `workdayStart`
- Railway `workdayReport`

Use the staged workflow path after config succeeds.

Success criteria:

- staging or prod state advances to `provisioned`
- Cloudflare Pages URL and queue identifiers are no longer null in deploy state
- Railway service records no longer rely only on static config defaults

### 4. Deploy code and publish content

After provisioning:

1. deploy code
2. publish content if required
3. run monitor checks

Treat staging as the mandatory rehearsal for production.

## Operational Checks

Before provisioning:

```bash
npx treeseed status
npx treeseed config --json
```

Before deployment:

```bash
npm run verify:local
npx treeseed status
```

After deployment:

- confirm environment state remains `provisioned`
- confirm managed services report `deployed` where expected
- confirm monitor endpoints pass for pages, API, D1, queue, and R2

## Production Promotion

1. validate staging
2. merge `staging` to `main`
3. push the production promotion or release tag
4. let the deploy workflow run provision, deploy, publish, and monitor in production

## Notes

- If a value already has a Treeseed config/env key, do not commit it to `treeseed.site.yaml`.
- A missing operator value should surface as `config_incomplete`, not as a fake initialized or deployed state.
- If `treeseed status` disagrees with `treeseed config --json`, treat that as a bug and fix the readiness model before continuing with live rollout.
