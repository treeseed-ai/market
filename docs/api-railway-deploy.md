# Railway Market Backend Deployment

This runbook documents the Railway services used by the API backend after the API package split. It is an inventory and reconciliation runbook, not a direct Railway mutation procedure.

Capacity-provider deployment is separate and owned by `@treeseed/agent`; see the capacity commands at the end of this document for that path.

Current package ownership:

- root market hosts the web/admin tenant and `/v1/*` proxy/client surfaces.
- `@treeseed/admin` owns admin UI/routes/view-models and reaches backend behavior through API facades.
- `@treeseed/api` owns backend control-plane state, PostgreSQL access, route descriptors, and operations runner implementation.
- TreeDX federation/public nodes are hosted through API app reconciliation.
- `@treeseed/ui` owns reusable visual primitives.

See [Package Ownership](./package-ownership.md) for the full system map.

## Market Railway Services

`packages/api/treeseed.site.yaml` should reconcile these services in place. Do not create replacement services with new names. The root Market `treeseed.site.yaml` owns the Cloudflare web/admin tenant and `/v1/*` proxy/client surfaces; the API package manifest owns the independently released Railway backend runtime.

```text
api
  Railway service name: treeseed-api
  rootDir: packages/api
  buildCommand: npm run build
  startCommand: npm run start:api
  healthcheckPath: /healthz
  runtimeMode: serverless

operationsRunner
  Railway service name: treeseed-api-operations-runner-01
  rootDir: packages/api
  buildCommand: npm run build
  startCommand: npm run start:runner
  healthcheckPath: /healthz
  runtimeMode: service
  volumeMountPath: /data

apiDatabase
  Railway PostgreSQL service
  serviceTargets: api, operationsRunner
```

The root Market app is not a Railway backend. It deploys the Cloudflare web UI and proxies `/v1/*` to the hosted API.

Provider CLIs and API calls are diagnostic-only in this workflow. Mutating repairs must go through `trsd hosting apply`, `trsd reconcile apply`, or release-gate reconciliation so live observation and postcondition verification run before success is reported.

## Required Service Variables

API and runner:

- `TREESEED_DATABASE_URL`
- `TREESEED_PLATFORM_RUNNER_SECRET`
- `TREESEED_CREDENTIAL_SESSION_SECRET`
- API auth/service trust secrets configured by the environment

Runner only:

- `TREESEED_PLATFORM_RUNNER_ID`
- `TREESEED_PLATFORM_RUNNER_DATA_DIR`
- `TREESEED_PLATFORM_RUNNER_ENVIRONMENT`
- `TREESEED_MANAGER_ID`

Provider credentials used by enabled operations must also be present on the service that needs them. Reports may show whether a secret is present, but must never print raw values.

## Planning And Repair

Plan before making provider changes:

```sh
npx trsd hosting plan --environment staging --service api --json
npx trsd hosting plan --environment staging --service operationsRunner --json
```

Apply a targeted repair only after the plan is correct:

```sh
npx trsd hosting apply --environment staging --service api --execute --json
npx trsd hosting apply --environment staging --service operationsRunner --execute --json
```

Verify live provider and HTTP state:

```sh
npx trsd hosting verify --environment staging --service api --live --json
npx trsd hosting verify --environment staging --service operationsRunner --live --json
npx trsd audit hosting --environment staging --live --json
```

Production uses the same commands with `--environment prod`.

## Runner Smoke

Before TreeDX bootstrap or long provisioning waits, prove the runner can claim work:

```sh
npx trsd operations smoke --environment staging --service operationsRunner --json
```

The smoke creates a diagnostic platform operation, polls it to completion, and requires runner events. A failed smoke should block TreeDX bootstrap and staging/release promotion until the runner, database, or service credentials are repaired.

## Package Verification

Validate the backend package independently:

```sh
npm -w packages/api run build
npm -w packages/api run test:unit
npm -w packages/api run verify:local
```

Validate acceptance against a hosted API:

```sh
TREESEED_MARKET_ACCEPTANCE_BASE_URL=<api-base-url> npm -w packages/api run test:acceptance
```

## Capacity Provider Runtime

Market Railway API/runner deployment is not the capacity-provider runtime. For local and self-hosted provider lifecycle, use:

```sh
npx trsd config
npx trsd capacity build
npx trsd capacity up --market local --provider local
npx trsd capacity status --market local --provider local
npx trsd capacity logs --market local --provider local
npx trsd capacity down --market local --provider local
```

For package-level provider validation:

```sh
npm -w packages/agent run build:dist
npm -w packages/agent run test:capacity-provider-runtime
npm -w packages/agent run capacity-provider:test-local
```

Provider API keys and Codex credentials must stay in encrypted Treeseed machine config or deployment-provider secret stores. Do not write plaintext `.env` files or render secrets into Compose configuration.

After changes to API hosting, Railway adapters, volume policy, or release gates, run live cleanup and acceptance before calling the repair complete:

```sh
npx trsd reconcile test-live --mode cleanup --provider railway --environment staging --yes --json
npx trsd reconcile test-live --mode acceptance --provider railway --environment staging --yes --json
npx trsd reconcile test-live --mode cleanup --provider railway --environment staging --yes --json
```
