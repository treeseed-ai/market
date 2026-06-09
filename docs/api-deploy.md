# API Deploy Runbook

## Purpose

This runbook is the operator path for deploying the current Treeseed Market architecture across local, staging, and production.

The current deployment shape is:

- root Market repo: Cloudflare web UI, knowledge hub, auth/management/market UI, and `/v1/*` proxy/client only
- `packages/api`: Railway API plus Treeseed operations runner
- Railway PostgreSQL: Market control-plane database shared by API and runner
- `packages/treedx`: TreeDX implementation, bootstrapped only after the Market runner smoke check passes
- `packages/agent`: capacity-provider runtime, managed separately through `trsd capacity ...`

Do not reintroduce root-owned backend API source or root API build scripts. The root app should remain UI-only.

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
  owns Astro UI, knowledge hub, auth UI, management UI, Market UI, and /v1/* proxy
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

Provider credentials required by enabled operations:

- `GH_TOKEN` or `GITHUB_TOKEN`
- `RAILWAY_API_TOKEN`
- `TREESEED_RAILWAY_WORKSPACE`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
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

Checkpoint local work:

```bash
npx trsd status --json
npx trsd save --verify local --json "complete API package migration"
```

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

Execute staging with live hosted checks:

```bash
npx trsd stage --verify-deployed-resources --json "complete API package migration"
```

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
