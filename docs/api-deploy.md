# API Deploy Runbook

## Purpose

This runbook is the operator path for deploying the current Treeseed Market architecture across local, staging, and production.

The current deployment shape is:

- root Market repo: Cloudflare web UI, knowledge hub, public content, Treeseed messaging, page overrides, buyer marketplace/Commons pages, and `/v1/*` proxy/client only
- `packages/admin`: admin routes, middleware, auth/session UI, API client facades, and admin view models layered into the root web app
- `packages/ui`: reusable components and styles consumed by Market/Admin/Core
- `packages/api`: Railway API plus Treeseed operations runner
- Railway PostgreSQL: Market control-plane database shared by API and runner
- `packages/treedx`: TreeDX implementation, bootstrapped only after the Market runner smoke check passes
- `packages/agent`: capacity-provider runtime, managed separately through `trsd capacity ...`

Do not reintroduce root-owned backend API source or root API build scripts. The root app should remain web/admin host plus proxy/client surfaces. Admin reaches backend behavior through API client/proxy surfaces; API owns backend control-plane state and operations runner implementation.

See [Package Ownership](./package-ownership.md) for the current package map.

## Source Of Truth

- `treeseed.site.yaml`: hosting topology, managed services, providers, service roots, build commands, start commands, health checks, and service targets
- `packages/api/package.json`: API and runner build/start/migration/acceptance scripts
- `packages/sdk`: hosting graph, deployment readiness, live hosted-service checks, provider reconciliation, and runner smoke helpers
- `.treeseed/config/machine.yaml`: machine-local resolved values and encrypted secrets
- `.treeseed/state/environments/*/deploy.json`: environment state, readiness, deployment history, and provider observations

The effective hosting graph must be validated, not just the raw YAML. `trsd ready`, `trsd hosting plan`, `trsd stage --plan`, and `trsd release --plan` catch mismatches such as `services.api.rootDir: packages/api` but `services.api.railway.rootDir: .`.

## Hosted Service Shape

Expected Railway services:

```text
api
  provider: railway
  serviceName: treeseed-api
  rootDir: packages/api
  buildCommand: npm run build
  startCommand: npm run start:api
  healthcheckPath: /healthz
  runtimeMode: serverless

operationsRunner
  provider: railway
  serviceName: treeseed-api-operations-runner-01
  rootDir: packages/api
  buildCommand: npm run build
  startCommand: npm run start:runner
  healthcheckPath: /healthz
  runtimeMode: service
  volumeMountPath: /data

apiDatabase
  provider: railway
  serviceTargets:
    - api
    - operationsRunner
```

Expected web surface:

```text
web
  provider: cloudflare
  rootDir: .
  hosts public content, knowledge hub, admin/auth UI contributed by @treeseed/admin, reusable UI from @treeseed/ui, and /v1/* proxy
```

Do not rename existing Railway services during repair. Reconfigure them in place.

## Required Configuration

Use Treeseed config/provider stores, not plaintext env files:

```bash
npx trsd config --environment staging --bootstrap --preflight --json
npx trsd config --environment prod --bootstrap --preflight --json
```

Required for API and runner:

- `TREESEED_DATABASE_URL`
- `TREESEED_PLATFORM_RUNNER_SECRET`
- `TREESEED_CREDENTIAL_SESSION_SECRET`
- API auth/service signing secrets configured by the environment

Required for runner:

- `TREESEED_PLATFORM_RUNNER_ID`
- `TREESEED_PLATFORM_RUNNER_DATA_DIR`
- `TREESEED_PLATFORM_RUNNER_ENVIRONMENT`
- `TREESEED_MANAGER_ID`

Required for web/API trust:

- `TREESEED_WEB_SERVICE_ID`
- `TREESEED_WEB_SERVICE_SECRET`
- `TREESEED_WEB_ASSERTION_SECRET`
- `TREESEED_API_BASE_URL`
- `TREESEED_SITE_URL`
- `BETTER_AUTH_URL`

Required for ecommerce Stripe behavior when marketplace checkout, Connect onboarding, Product/Price sync, webhooks, or refunds are enabled:

- `TREESEED_STRIPE_SECRET_KEY`
- `TREESEED_STRIPE_PUBLISHABLE_KEY`
- `TREESEED_STRIPE_WEBHOOK_SECRET`
- `TREESEED_STRIPE_MODE`
- `TREESEED_STRIPE_CONNECT_ACCOUNT_TYPE`

The Stripe webhook endpoint is `/v1/commerce/webhooks/stripe`. Required events are `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, and `invoice.payment_failed`. Vendors never provide raw Stripe secret keys; TreeSeed manages connected-account onboarding through the API.

Provider credentials required by enabled operations:

- `TREESEED_GITHUB_TOKEN`
- `TREESEED_RAILWAY_API_TOKEN`
- `TREESEED_RAILWAY_WORKSPACE`
- `TREESEED_CLOUDFLARE_API_TOKEN`
- `TREESEED_CLOUDFLARE_ACCOUNT_ID`
- SMTP/email provider credentials when email is enabled

The Cloudflare token should use the dashboard permission names. Account-wide permissions for Treeseed web/live reconciliation are Pages Write, Workers Scripts Write, Workers KV Storage Write, Workers R2 Storage Write, D1 Write, Queues Write, Turnstile Sites Write, Account Rulesets Write, and Account Rule Lists Write. The target zone needs Zone Read, DNS Write, Cache Settings Write, and SSL and Certificates Write. Cloudflare API docs may call Cache Settings the Cache Rules permission, and Account Rule Lists the Account Filter Lists permission.

After preflight is clean, sync provider configuration through Treeseed commands:

```bash
npx trsd config --environment staging --bootstrap --sync all --json
npx trsd config --environment prod --bootstrap --sync all --json
```

## Fast Local Validation

Run the fastest non-hosted checks before touching shared hosted environments:

```bash
npm run verify:local
npm -w packages/api run verify:local
npm -w packages/sdk run verify:local
npm -w packages/cli run verify:local
npx trsd ready local --json
```

Validate the local dev plan without leaving a process running:

```bash
npx trsd dev start --web-runtime local --plan --json
```

Expected local plan:

```text
web cwd: .
api cwd: packages/api
operations-runner cwd: packages/api
```

For a bounded local smoke:

```bash
npx trsd dev start --web-runtime local --json
curl -fsS http://127.0.0.1:3000/healthz
curl -fsS http://127.0.0.1:3000/healthz/deep
curl -fsS http://127.0.0.1:4321/v1/healthz
npx trsd dev stop --json
```

## Hosted Readiness And Targeted Repair

Before staging or production promotion, run readiness and targeted plans:

```bash
npx trsd ready staging --json
npx trsd hosting plan --environment staging --service api --json
npx trsd hosting plan --environment staging --service operationsRunner --json
```

Use live verification to inspect provider state and HTTP health:

```bash
npx trsd hosting verify --environment staging --service api --live --json
npx trsd hosting verify --environment staging --service operationsRunner --live --json
npx trsd audit hosting --environment staging --live --json
npx trsd doctor --live --hosted-services --json
```

If a single service is drifted, plan first, then repair only that service:

```bash
npx trsd hosting plan --environment staging --service api --json
npx trsd hosting apply --environment staging --service api --execute --json
```

Live reports must redact secrets. They may report `present: true|false` for variables but must not print token, database URL, or password values.

## Runner Smoke And TreeDX Bootstrap

Run runner smoke before TreeDX bootstrap or when a platform operation remains queued:

```bash
npx trsd operations smoke --environment staging --service operationsRunner --json
```

The smoke flow checks API health, deep health, diagnostic operation creation, runner claim/checkpoint/completion, and event visibility. If it fails, fix the runner or service credentials before launching TreeDX bootstrap.

The deploy workflow runs `runner-smoke` before `bootstrap-public-treedx`. TreeDX bootstrap fails fast if a provisioning operation remains queued past the configured grace window, with remediation commands pointing back to `operations smoke` and `hosting verify`.

## Save And Stage

Checkpoint local work from the current task branch or managed task worktree:

```bash
npx trsd status --json
npx trsd save --verify local --json "complete API package migration"
```

`save` records package commits first, updates root pointers, and preserves the current task branch history. It should not mutate staging.

Plan staging before mutating:

```bash
npx trsd stage --plan --json "complete API package migration"
```

The plan must show:

- `packages/api` included when API package code changed
- root submodule pointers included when package heads changed
- API service still named `treeseed-api`
- runner service still named `treeseed-api-operations-runner-01`
- API and runner both using `rootDir: packages/api`
- API start command `npm run start:api`
- runner start command `npm run start:runner`
- API database targets `api` and `operationsRunner`
- readiness blockers before deploy work begins

If the task is running in a managed worktree, the worktree path should match the branch slug under `.treeseed/worktrees/<branch-slug>`. A successful `stage` first merges `staging` down into the task branch, runs local proof, promotes exact verified root/package refs to `staging`, verifies the remote staging refs, and removes the staged branch/worktree only after those postconditions pass. If a package or root merge conflicts, the workflow must capture the conflict report and stop before staging is mutated.

Promote refs to staging:

```bash
npx trsd stage --json "complete API package migration"
```

Stage does not run live hosted checks by default. After promotion, run the staging release/repair workflow or explicit hosted verification commands such as `npx trsd ready staging --json`, `npx trsd hosting verify --environment staging --service api --live --json`, and `npx trsd hosting verify --environment staging --service operationsRunner --live --json`.

Staging acceptance:

- Railway API builds from `packages/api`
- Railway runner builds from `packages/api`
- existing Railway service names are reused
- API `/healthz`, `/healthz/deep`, and `/v1/markets/current` pass
- web proxy `/v1/healthz` and `/v1/markets/current` pass
- runner smoke passes
- hosted-service check report has no failed required checks

API package acceptance can run directly against the hosted API:

```bash
TREESEED_MARKET_ACCEPTANCE_BASE_URL=<staging-api-url> npm -w packages/api run test:acceptance
```

## Production Release

Release only after staging is green.

Plan production:

```bash
npx trsd release --patch --verify-deployed-resources --plan --json
```

Execute production:

```bash
npx trsd release --patch --verify-deployed-resources --json
```

When a release intentionally needs a minor version, run `--minor` once:

```bash
npx trsd release --minor --verify-deployed-resources --json
```

If a `--minor` attempt has already created version bumps or tags and then fails, do not run a second `--minor`. Resume the recorded run:

```bash
npx trsd resume <run-id> --json
```

If a fresh command is required after repairs, use `--patch`.

Production acceptance:

```bash
curl -fsS https://api.treeseed.ai/healthz
curl -fsS https://api.treeseed.ai/healthz/deep
curl -fsS https://treeseed.ai/v1/healthz
curl -fsS https://treeseed.ai/v1/markets/current
TREESEED_MARKET_ACCEPTANCE_BASE_URL=https://api.treeseed.ai npm -w packages/api run test:acceptance
npx trsd audit hosting --environment prod --live --json
```

## Failure Handling

- If readiness fails, do not stage or release. Fix the effective hosting graph or configuration first.
- If live Railway checks fail, use targeted `hosting plan/apply/verify` for the affected service.
- If API health passes but deep health fails, check database connectivity and `TREESEED_DATABASE_URL` targeting.
- If TreeDX provisioning stays queued, run runner smoke and verify the runner service before retrying bootstrap.
- If `stage` or `release` is interrupted, use `npx trsd recover --json` and `npx trsd resume <run-id> --json` instead of retrying blindly.
- Treat secret output as a bug. Reports should show presence and source only.
