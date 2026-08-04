# Treeseed Operations Runner

## Current Status

The Treeseed operations runner now lives in `packages/api` and deploys separately from the root Market web app.

In database-transport mode, the runner also executes the API-owned capacity-workday maintenance sweep on a bounded interval. The sweep terminalizes elapsed workday verification runs, settles unfinished reservations exactly once, closes unfinished mode runs and assignments, and expires run-scoped grants. This is control-plane record maintenance only: the operations runner does not execute agent handlers, claim provider assignments, or act as a team capacity provider. `TREESEED_CAPACITY_WORKDAY_MAINTENANCE_INTERVAL_MS` controls the interval and defaults to 30 seconds.

Current ownership:

- `packages/api/src/api/**`: API routes, operation lifecycle, runner health surfaces, route descriptors, and Treeseed PostgreSQL adapter
- `packages/api/src/operations-runner/**`: runner entrypoint, executor registry, operation claim/checkpoint/complete loop, project web deployment executor, and diagnostics
- `@treeseed/sdk`: operation/reconciliation contracts, workflow helpers, and smoke-check primitives
- `@treeseed/admin`: admin operation controls, status routes, and view-model integration
- `@treeseed/ui`: reusable operation display primitives
- root Market app: hosted web/admin tenant plus `/v1/*` proxy/client only; it does not own runner implementation

See [Package Ownership](./package-ownership.md) for the current package map.

Project architecture inputs are logical. Operations should consume repository identity plus `rootPath`, `sitePath`, `contentPath`, `contentRuntimeSource`, and `localContentMaterialization` from SDK/API contracts instead of assuming a parent workspace or submodule layout. Repository-bound operations may use a persistent checkout cache, but content access for CI/CD, hosted deploy, and capacity-provider work should default to API, TreeDX, or R2 sources rather than cloning large content repositories. This keeps imported live repositories and template-created projects usable without restructuring.

Software deployment and content publishing are separate operation shapes. A `deploy_web` operation deploys the site shell/runtime to its host. A `publish_content` operation publishes TreeDX or local-content snapshot output to the configured R2 manifest/object target and records safe runtime metadata such as `contentRuntimeSource`, `effectiveContentSource`, `manifestKey`, `revision`, and `snapshotId`. TreeDX-backed content publish remains operations-runner/API driven and is reported as skipped for GitHub Actions workflow checks; it must not be modeled as a software deploy workflow dispatch.

Repository save and hosted verification honor the same boundary. A change is content-only only when every changed path is inside the project's declared publishable `contentPath`. Content-only saves commit and push without package versioning or code verification, and repository `verify.yml` workflows ignore content-only pushes and pull requests. Mixed changes retain the complete code verification and release path. Content publication still requires the canonical reviewed knowledge-publication operation; a Git push never uploads directly to R2 or bypasses content governance.

Linked repository initialization is also a platform operation. API routes such as `POST /v1/projects/:projectId/repositories/:role/initialize` create `repository:initialize_linked_repository` jobs and return operation handles; they do not clone, scaffold, commit, or push from the API process. The operations runner claims those jobs and calls the SDK repository operation implementation from its workspace. Imported repositories are adopted and validated without restructuring by default. Template-created repositories may write only explicit template scaffold files, and operation output must report safe changed paths without exposing runner workspace paths or credential values.

The final project architecture completion gate depends on this runner boundary: the exact-nine TreeSeed seed must populate the catalog, project creation from templates must remain easy, and linked repositories must initialize through API-created operations runner jobs rather than one-off API, CLI, GitHub CLI, or direct filesystem mutation.

Current Railway deployment:

```text
api
  rootDir: packages/api
  buildCommand: npm run build
  startCommand: npm run start:api
  healthcheckPath: /healthz

operationsRunner
  rootDir: packages/api
  buildCommand: npm run build
  startCommand: npm run start:runner
  healthcheckPath: /healthz
  runtimeMode: service
  volumeMountPath: /data
```

Operational commands:

```bash
npm -w packages/api run dev:runner -- --market local --watch --operation project:web_deployment
npx trsd operations smoke --environment local --service operationsRunner --json
npx trsd operations smoke --environment staging --service operationsRunner --json
npx trsd hosting verify --environment staging --service operationsRunner --live --json
```

`operations smoke` is the first diagnostic to run when a platform operation stays queued. With `--environment local`, it targets the managed local API and operations runner started by `trsd dev start --web-runtime local`. With hosted environments, it targets the reconciled API and Railway operations runner. In both cases it verifies API health, deep DB health, diagnostic operation creation, runner claim/checkpoint/completion, and event visibility. TreeDX bootstrap should not start until runner smoke passes.

The design notes below describe the architecture intent that led to the current implementation.

# Treeseed Operations Runner Plan

## Purpose

Create a TreeSeed-owned `operations-runner` so the API can expose complete Market operations without writing local repository files, embedding agent worker runners, or depending on team capacity providers for platform maintenance.

This plan keeps the capacity-provider agent architecture reserved for team-owned project work. Capacity providers continue to belong to teams and process team/project portfolios. The Market control plane gets its own deterministic operations executor for TreeSeed platform work.

## Decision Summary

TreeSeed should introduce a separate **Treeseed operations runner**:

```text
API
  validates intent, permissions, approvals, and state
  creates deterministic operation jobs
  stores progress, events, outputs, errors, and audit records
  never writes local repo files
  never runs agent handlers
  never embeds the capacity-provider manager/runner

SDK operations
  owns reusable operation contracts and implementations
  provides git/repository workflow primitives
  provides deploy/provision/reconcile primitives
  provides job claiming, leasing, event, and idempotency helpers
  provides typed clients used by API, CLI, and runners

operations-runner
  TreeSeed-owned execution process
  claims platform jobs
  invokes SDK operations
  owns platform credentials
  may maintain a persistent /data checkout cache
  reports progress/results back to API or DB

team capacity providers
  team-owned or team-attached execution capacity
  process project/portfolio work
  clone project repositories
  run agent handlers, workdays, and task execution
  are not required for Market control-plane repair or deployment
```

## Non-Goals

Do not reintroduce any of the following into the API process:

* agent manager loop
* agent worker runner
* capacity-provider runtime
* Codex/agent handler execution
* workday manager implementation
* local filesystem content writes
* direct Git branch/commit/push from request handlers
* customer/team capacity-provider execution paths

Do not make Market deployment, Treeseed database migration, or Market repository repair depend on a team capacity provider. That creates a circular dependency: the control plane would depend on team execution capacity to fix itself.

## Architecture Roles

### API

The API owns browser/API-facing control-plane behavior:

* auth and account/session flows
* teams, members, roles, invites, permissions
* projects and portfolio records
* repository/web/host records
* provider registry and capacity-provider key rotation
* platform operation job creation
* deployment intent records
* approval records and decisions
* operation progress/events/results projection
* catalog, templates, knowledge packs
* usage, reports, audits, and operational status

The API should expose complete Market operations by creating operation records and returning job/status handles, not by executing repository or infrastructure mutation inline.

### SDK operations

The SDK becomes the complete shared implementation layer for Market operations. It should include both non-repository and repository-bound operations.

Non-repository SDK operations:

* team/project CRUD clients
* team service connection and capability-binding clients
* encrypted envelope and single-use operation-lease clients
* capacity-provider registry clients
* provider key rotation clients
* deployment intent clients
* catalog/template/knowledge-pack clients
* seed planning/apply contracts
* Drizzle migration helpers for Treeseed PostgreSQL and the static-hub D1 form storage
* Cloudflare resource reconciliation
* Railway service/deployment reconciliation
* GitHub workflow dispatch and monitoring
* environment/config resolution
* operation event/status clients

Repository-bound SDK operations:

* clone/fetch/checkout helpers
* worktree creation and cleanup
* branch naming and branch policy
* path policy enforcement
* content read/write helpers
* frontmatter serialization/parsing helpers
* relation update helpers for content records
* package/reference rewrite helpers
* staged file detection
* verification command execution
* commit message generation
* commit creation
* push and PR/workflow dispatch
* conflict detection and reporting
* rollback/partial failure semantics
* release/save/stage orchestration

The SDK should be complete enough that `trsd`, GitHub Actions, the Treeseed operations runner, and future platform automation can call the same implementation without duplicating Git or deployment logic.

### Treeseed operations runner

The `operations-runner` is a TreeSeed platform service, not a team capacity provider.

It should:

* authenticate as a platform service principal
* claim deterministic platform jobs
* lease jobs safely
* run one job at a time or a bounded pool of jobs
* call SDK operations
* stream progress events
* write outputs/errors
* heartbeat runner health
* use platform credentials from secure environment/secrets
* maintain a persistent `/data` workspace for repository clones when useful
* support one-shot and daemon modes

It should not:

* register as a team capacity provider
* advertise runtime capabilities to teams
* run agent specs or agent handlers
* process team portfolios
* expose team-configurable budgets or lanes
* depend on capacity-provider API keys

## Naming

Use a name that avoids collision with agent worker runners.

Preferred:

```text
operations-runner
```

Acceptable alternatives:

```text
platform-job-runner
control-plane-operations-worker
```

Avoid:

```text
worker-runner
agent-runner
capacity-runner
processing-runner
```

## Job Model

### Recommended table strategy

Reuse the existing `remote_jobs` / `remote_job_events` shape where possible, but introduce platform-specific naming or classification so these jobs do not look like team capacity-provider tasks.

Option A: extend `remote_jobs` with platform operation conventions.

```text
namespace = platform | market | deploy | repository | seed | infrastructure
operation = deploy_api | deploy_web | publish_content | migrate_database | save_market_repo | release_market | provision_environment | dispatch_workflow
selected_target = market_operations_runner | github_actions | cli | railway_job
```

Option B: add explicit platform tables.

```sql
CREATE TABLE platform_operations (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  target TEXT NOT NULL,
  idempotency_key TEXT,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  error_json TEXT,
  requested_by_type TEXT NOT NULL,
  requested_by_id TEXT,
  assigned_runner_id TEXT,
  lease_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  cancelled_at TEXT
);

CREATE UNIQUE INDEX idx_platform_operations_idempotency
  ON platform_operations(namespace, operation, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_platform_operations_runnable
  ON platform_operations(status, created_at ASC);
```

```sql
CREATE TABLE platform_operation_events (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (operation_id) REFERENCES platform_operations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_platform_operation_events_seq
  ON platform_operation_events(operation_id, seq);
```

If keeping `remote_jobs`, add a clear classification layer in SDK types so API code never needs to hand-roll ad hoc JSON conventions.

### Runner registration

Add platform-runner records if operational visibility requires them.

```sql
CREATE TABLE market_operation_runners (
  id TEXT PRIMARY KEY,
  runner_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'online',
  version TEXT,
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  active_job_count INTEGER NOT NULL DEFAULT 0,
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
  heartbeat_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

This is platform-owned identity, not team-owned capacity-provider identity.

### Repository claims

Reuse the repository-claim pattern, but make it platform-specific or generic.

```sql
CREATE TABLE platform_repository_claims (
  id TEXT PRIMARY KEY,
  repository_key TEXT NOT NULL,
  runner_id TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  branch TEXT,
  commit_sha TEXT,
  claim_state TEXT NOT NULL DEFAULT 'active',
  lease_expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_platform_repository_claims_active
  ON platform_repository_claims(repository_key, runner_id)
  WHERE claim_state = 'active';
```

## SDK Package Changes

### New SDK modules

Add or consolidate these modules under `packages/sdk/src/operations`:

```text
packages/sdk/src/operations/platform-jobs.ts
packages/sdk/src/operations/platform-runner.ts
packages/sdk/src/operations/operation-dispatch.ts
packages/sdk/src/operations/operation-events.ts
packages/sdk/src/operations/repository-workspaces.ts
packages/sdk/src/operations/repository-claims.ts
packages/sdk/src/operations/market-repository.ts
packages/sdk/src/operations/market-deploy.ts
packages/sdk/src/operations/market-database.ts
packages/sdk/src/operations/platform-runner-client.ts
```

### SDK contracts

Define typed contracts for platform operations.

```ts
type PlatformOperationNamespace =
  | "market"
  | "repository"
  | "deploy"
  | "database"
  | "seed"
  | "infrastructure"
  | "catalog";

type PlatformOperationStatus =
  | "queued"
  | "leased"
  | "running"
  | "waiting_for_approval"
  | "succeeded"
  | "failed"
  | "cancelled";

type PlatformOperationTarget =
  | "market_operations_runner"
  | "github_actions"
  | "cli"
  | "railway_job";
```

Repository operation examples:

```ts
type MarketRepositoryOperation =
  | "read_content_record"
  | "write_content_record"
  | "create_related_content"
  | "create_decision_from_proposals"
  | "save_market_repo"
  | "stage_market_changes"
  | "release_market"
  | "publish_market_content";
```

`stage_market_changes` dispatches the SDK-owned `trsd stage` branch/ref promotion workflow. It must not directly reconcile Railway, Cloudflare, GitHub Actions, or other hosted providers. The stage workflow merges `staging` down into the feature branch first, performs local proof by default, promotes verified refs to staging, and leaves hosted CI/CD repair to a separate staging release workflow.

Infrastructure operation examples:

```ts
type MarketInfrastructureOperation =
  | "provision_environment"
  | "reconcile_cloudflare"
  | "reconcile_railway"
  | "deploy_market_api"
  | "deploy_market_web"
  | "monitor_environment";
```

Database operation examples:

```ts
type MarketDatabaseOperation =
  | "plan_migration"
  | "apply_migration"
  | "backup_database"
  | "restore_database"
  | "verify_schema";
```

### SDK runner core

Extract generic runner mechanics from the old worker-runner architecture:

* claim next job
* renew lease
* append ordered events
* mark running/succeeded/failed/cancelled
* idempotency handling
* retry handling
* cancellation checks
* heartbeat
* queue depth reporting
* bounded concurrency
* graceful shutdown

Suggested API:

```ts
export interface PlatformOperationExecutorContext {
  operationId: string;
  workspaceRoot: string;
  environment: "local" | "staging" | "prod";
  emit(event: PlatformOperationEventInput): Promise<void>;
  checkpoint(output: unknown): Promise<void>;
  throwIfCancelled(): Promise<void>;
}

export interface PlatformOperationExecutor<TInput = unknown, TOutput = unknown> {
  namespace: PlatformOperationNamespace;
  operation: string;
  run(input: TInput, context: PlatformOperationExecutorContext): Promise<TOutput>;
}
```

### SDK operation registry

Create an operation registry for platform jobs.

```ts
export function createMarketPlatformOperationRegistry() {
  return createOperationRegistry([
    createDeployApiOperation(),
    createDeployMarketWebOperation(),
    createPublishMarketContentOperation(),
    createProvisionEnvironmentOperation(),
    createApplyDatabaseMigrationOperation(),
    createSaveMarketRepositoryOperation(),
    createStageMarketChangesOperation(),
    createReleaseMarketOperation(),
    createCreateRelatedContentOperation(),
    createCreateDecisionFromProposalsOperation(),
  ]);
}
```

### SDK repository workflow requirements

The SDK must be able to perform repository-bound operations without relying on the API filesystem.

Minimum requirements:

* accept an explicit repository descriptor
* clone or update the repository into a runner workspace
* create a bounded branch/worktree
* enforce path policy before writing
* write content records safely
* update related records atomically where possible
* run verification commands when configured
* produce a diff summary
* commit changes
* push branch
* optionally dispatch GitHub workflow or create PR
* report exact changed paths and commit SHA
* clean up or retain workspace according to policy

Suggested repository descriptor:

```ts
export interface PlatformRepositoryDescriptor {
  provider: "github";
  owner: string;
  name: string;
  defaultBranch: string;
  cloneUrl: string;
  writeMode: "branch" | "direct" | "pull_request";
  pathPolicies: PlatformRepositoryPathPolicy[];
}
```

## API Changes

### Remove direct local file writing

Remove API request-handler calls that write to:

```text
process.cwd()/src/content/**
```

Replace direct filesystem helpers with job-creation endpoints.

Current local-content write routes should become intent endpoints:

```http
POST /v1/projects/:projectId/local-content/decisions/from-proposals
POST /v1/projects/:projectId/local-content/:collection
POST /v1/projects/:projectId/local-content/:collection/related
```

Replace implementation behavior:

```text
Before:
  validate request
  write MD/MDX file under process.cwd()
  update related local files
  return created record

After:
  validate request
  create platform operation job
  return { ok, job }
  runner executes SDK repository operation
  API exposes job events and result
```

These routes may keep their URL shape temporarily for UI compatibility, but internally they should enqueue platform operations.

### Add platform operation endpoints

Add explicit platform operation endpoints:

```http
GET  /v1/platform/operations
POST /v1/platform/operations
GET  /v1/platform/operations/:operationId
GET  /v1/platform/operations/:operationId/events
POST /v1/platform/operations/:operationId/cancel
POST /v1/platform/operations/:operationId/retry
```

Admin/system scoped endpoints for runner use:

```http
POST /v1/platform/runners/register
POST /v1/platform/runners/heartbeat
POST /v1/platform/runners/jobs/claim
POST /v1/platform/runners/jobs/:operationId/events
POST /v1/platform/runners/jobs/:operationId/checkpoint
POST /v1/platform/runners/jobs/:operationId/complete
POST /v1/platform/runners/jobs/:operationId/fail
```

These should use platform service credentials, not team capacity-provider API keys.

### Add operation creation helpers

API should create jobs through SDK contracts, not hand-built JSON.

Example:

```ts
await platformOperations.create({
  namespace: "repository",
  operation: "create_related_content",
  target: "market_operations_runner",
  idempotencyKey,
  input: {
    projectId,
    collection,
    parent: { collection: parentCollection, slug: parentSlug },
    child: payload,
    repository: marketRepositoryDescriptor,
  },
  requestedBy: principal,
});
```

### Permission model

API validates human/team permissions before creating jobs.

Runner validates platform service auth before claiming jobs.

Recommended scopes:

```text
platform:operations:create
platform:operations:read
platform:operations:cancel
platform:operations:retry
platform:runners:register
platform:runners:claim
platform:runners:update
platform:repository:write
platform:deploy:write
platform:database:migrate
```

Do not reuse capacity-provider membership scopes such as:

```text
provider:availability:write
provider:assignments:read
provider:assignments:write
provider:usage:write
provider:credentials:rotate
```

### UI behavior

For repo-writing actions, UI should move from immediate mutation to job-aware state:

```text
submit action
  -> API returns operation id
  -> UI shows queued/running state
  -> UI streams or polls events
  -> UI shows result: created record, branch, commit, PR/workflow link, changed paths
```

For local development, keep the same job path. Do not preserve a special API direct-write mode unless absolutely necessary for tests. If a local fast path is required, implement it in the local Treeseed operations runner, not in the API request handler.

## Treeseed Operations Runner Package

### Location

Current location:

```text
packages/sdk/src/operations/runner-core.ts
packages/api/src/api/platform-operation-routes.ts
packages/api/src/operations-runner/
  entrypoint.js
  config.js
  registry.js
  runner.js
  health.js
```

TypeScript source uses the same package-local shape:

```text
packages/api/src/operations-runner/
  entrypoint.ts
  config.ts
  registry.ts
  runner.ts
  health.ts
```

The runner is part of the `packages/api` deployment, but not part of the API process.

### Runtime modes

```bash
npm -w packages/api run start:runner
npm -w packages/api run dev:runner -- --market local --once --operation-id op_...
npm -w packages/api run dev:runner -- healthcheck
npm -w packages/api run dev:runner -- version
```

### Required environment

```bash
TREESEED_API_BASE_URL=https://api.treeseed.ai
TREESEED_MANAGER_ID=prod
TREESEED_PLATFORM_RUNNER_ID=treeseed-ops-prod-1
TREESEED_PLATFORM_RUNNER_SECRET=...
TREESEED_PLATFORM_RUNNER_DATA_DIR=/data
TREESEED_PLATFORM_RUNNER_ENVIRONMENT=production
```

Repository/deploy credentials should be supplied as deployed secrets:

| Registry name | Kind |
| --- | --- |
| `TREESEED_GITHUB_TOKEN` | secret |
| `TREESEED_RAILWAY_API_TOKEN` | secret |
| `TREESEED_CLOUDFLARE_API_TOKEN` | secret |
| `TREESEED_CLOUDFLARE_ACCOUNT_ID` | plain config |

For Cloudflare, use the dashboard permission names when creating the token. The account-wide set is Pages Write, Workers Scripts Write, Workers KV Storage Write, Workers R2 Storage Write, D1 Write, Queues Write, Turnstile Sites Write, Account Rulesets Write, and Account Rule Lists Write. The target zone needs Zone Read, DNS Write, Cache Settings Write, and SSL and Certificates Write. Cloudflare API docs may call Cache Settings the Cache Rules permission, and Account Rule Lists the Account Filter Lists permission.

Database credentials target the Treeseed PostgreSQL control-plane database. Local development derives `TREESEED_DATABASE_URL` from the managed local API Postgres settings; operators should not enter it manually for local seed/apply or local dev. Staging and production receive the reconciled PostgreSQL connection URL as a service secret:

```bash
TREESEED_DATABASE_URL=postgres://...
```

### Runner loop

```text
boot
  load config
  register or heartbeat
  load operation registry
  ensure workspace root exists

loop
  claim next runnable operation
  renew lease while running
  execute SDK operation
  emit events/checkpoints
  mark succeeded or failed
  respect cancellation
  sleep/backoff when no work

shutdown
  stop claiming work
  finish or release active job according to policy
  final heartbeat
```

### Deployment topology

Add a separate Railway service:

```yaml
services:
  api:
    enabled: true
    provider: railway
    rootDir: packages/api
    railway:
      serviceName: treeseed-api
      rootDir: packages/api
      buildCommand: npm run build
      startCommand: npm run start:api
      healthcheckPath: /healthz
    environments:
      staging:
        serviceName: treeseed-api-staging
      prod:
        serviceName: treeseed-api-production

  operationsRunner:
    enabled: true
    provider: railway
    rootDir: packages/api
    railway:
      serviceName: treeseed-api-operations-runner-01
      rootDir: packages/api
      buildCommand: npm run build
      startCommand: npm run start:runner
      healthcheckPath: /healthz
      runtimeMode: service
      volumeMountPath: /data
    environments:
      staging:
        serviceName: treeseed-api-operations-runner-staging-01
      prod:
        serviceName: treeseed-api-operations-runner-production-01
```

This is not a processing/agent service. It is a platform operations service.

## Deployment and Operations

### Staging

Staging should have its own runner identity and workspace.

```text
TREESEED_MANAGER_ID=staging
TREESEED_PLATFORM_RUNNER_ID=treeseed-ops-staging-1
TREESEED_PLATFORM_RUNNER_ENVIRONMENT=staging
```

Staging operations may write to the `staging` branch or staging-specific release branches.

### Production

Production should use stricter approval and release policy.

```text
TREESEED_MANAGER_ID=prod
TREESEED_PLATFORM_RUNNER_ID=treeseed-ops-prod-1
TREESEED_PLATFORM_RUNNER_ENVIRONMENT=production
```

Production operations that mutate the Market repo or database should support approval gates.

Examples requiring approval:

* production Treeseed PostgreSQL migration
* production release
* production infrastructure reconciliation that destroys/replaces resources
* direct push to protected branch

### GitHub Actions integration

Some platform operations may be better delegated to GitHub Actions.

The Treeseed operations runner can either:

* execute the full operation itself, or
* dispatch a GitHub workflow and monitor it, recording progress in Market.

This should be a per-operation target choice.

```text
selected_target = market_operations_runner
selected_target = github_actions
selected_target = railway_job
selected_target = cli
```

## Database Direction

The Market control plane is PostgreSQL-only. It includes users, sessions, teams, projects, hosts, deployments, credentials, capacity providers, tasks, events, approvals, catalog, artifacts, reports, and operation state.

Schema ownership is split by runtime:

* Market control-plane schema lives in `packages/sdk/src/db/market-schema.ts`.
* Treeseed PostgreSQL migration SQL is generated into `packages/sdk/drizzle/market` with `npm run db:generate:market`.
* Market startup and deploy workflows apply generated Drizzle SQL with `npm -w packages/api run db:migrate` against `TREESEED_DATABASE_URL`.
* SDK/Core D1 schema remains only for unauthenticated static knowledge-hub form storage: `subscribers` and `contact_submissions`. It is generated into `packages/sdk/drizzle/d1` with `npm -w packages/sdk run db:generate:d1`; D1 is not an agent runtime database.

The top-level `migrations/` directory and hand-authored Market SQL migrations are retired. Market runtime code must fail clearly when PostgreSQL migrations cannot be applied; it must not create or repair Market tables ad hoc.

## Migration Sequence

### Phase 1 — Lock boundary and remove direct API writes

* Add a boundary test that fails on API filesystem writes under `src/content`.
* Replace direct local-content write handlers with operation creation.
* Preserve current UI behavior through job polling where possible.
* Keep direct filesystem write helpers only inside SDK repository operations or tests.

Acceptance:

* API request handlers do not call `fs.writeFile` for repository content.
* API request handlers do not write under `process.cwd()/src/content`.
* UI can submit content mutations and receive an operation id.

### Phase 2 — Add SDK platform operation contracts

* Add typed platform operation contracts.
* Add operation status/event schemas.
* Add platform runner client.
* Add job creation/claim/update helpers.
* Add idempotency helpers.

Acceptance:

* API can create platform jobs through SDK contracts.
* Runner can claim and update jobs through SDK contracts.
* Tests cover serialization and state transitions.

### Phase 3 — Extract reusable runner core

* Extract claim/lease/event/heartbeat logic from worker-runner patterns.
* Rename generically so it does not imply agent capacity.
* Add cancellation and retry semantics.
* Add bounded concurrency.

Acceptance:

* Unit tests cover claim, lease renewal, completion, failure, retry, cancellation, and idempotency.

### Phase 4 — Implement operations-runner

* Add runner entrypoint.
* Add config schema.
* Add healthcheck/version commands.
* Add operation registry.
* Add local `once` mode for tests.
* Add daemon `run` mode for Railway.

Acceptance:

```bash
node ./dist/operations-runner/entrypoint.js version
node ./dist/operations-runner/entrypoint.js healthcheck
node ./dist/operations-runner/entrypoint.js once --operation-id op_test
node ./dist/operations-runner/entrypoint.js run
```

### Phase 5 — Move repository operations to SDK execution

* Port local-content create/update/relation logic into SDK repository operations.
* Add branch/worktree support.
* Add path policies.
* Add commit/push/PR or workflow dispatch support.
* Return changed paths, branch, commit SHA, PR/workflow links.

Acceptance:

* Existing content creation flows work through platform operations.
* No local API filesystem writes remain.
* Runner can mutate a checkout and report a commit/branch.

### Phase 6 — Add Railway deployment service

* Add `operationsRunner` service to topology.
* Add build script.
* Add Railway env sync for runner secrets.
* Add volume for `/data`.
* Add staging/prod service identities.

Acceptance:

* Staging runner claims and completes a no-op operation.
* Staging runner executes a safe repository read operation.
* Staging runner executes a test repository write operation on a non-production branch.

### Phase 7 — PostgreSQL migration hardening

* Keep Market runtime on the PostgreSQL adapter.
* Keep generated Drizzle migration artifacts checked in.
* Add migration/export/import tooling where operationally useful.
* Add rollback and restore runbooks for production PostgreSQL.

Acceptance:

* API and operations runner run against PostgreSQL in staging and production.
* D1 references are limited to SDK/Core static-hub form storage.

## Boundary Tests

Add or update tests:

```text
test/lib/web-runtime-boundaries.test.ts
test/api/api-platform-operations.test.ts
test/lib/platform-operation-runner.test.ts
packages/sdk/test/utils/platform-operations.test.ts
packages/sdk/test/utils/repository-save-orchestrator.test.ts
```

Assertions:

* API does not import `@treeseed/agent` runtime modules.
* API does not start manager/worker/runner loops.
* API does not call content filesystem write helpers in request handlers.
* API creates platform operation jobs for repo mutations.
* Platform runner can claim, lease, execute, complete, fail, and retry jobs.
* Platform runner uses platform service auth, not provider API keys.
* Capacity-provider API keys cannot claim platform operations.
* Platform runner does not register as a team capacity provider.
* SDK repository operations enforce path policy.
* SDK repository operations report changed paths and commit metadata.

## Acceptance Criteria

This change is done when:

1. API exposes complete Market operations through DB/job-backed contracts.
2. API no longer writes local repository files.
3. API does not embed the old worker runner or capacity-provider runtime.
4. A TreeSeed-owned `operations-runner` exists outside the API process.
5. The runner claims deterministic platform jobs and invokes SDK operations.
6. SDK operations include complete non-repo Market operations.
7. SDK operations include complete repo-bound Market operations.
8. Team capacity providers remain internal to teams and are not used for Market self-maintenance.
9. Platform jobs have events, retries, cancellation, and idempotency.
10. Staging can execute a safe repo operation through the runner.
11. Production repo/database operations can require approval.
12. Market control-plane database migration is PostgreSQL/Drizzle-owned and does not block runner extraction.

## Implementation Notes

The conceptual reuse from the old worker-runner architecture should be high, but naming and trust boundaries matter.

Reuse:

* job/event ledger pattern
* claim/lease/heartbeat pattern
* queue depth and scaling pattern
* repository claim/workspace pattern
* progress reporting pattern
* SDK workflow operation implementations

Do not reuse directly:

* agent handler execution
* workday manager loop
* capacity-provider registration
* provider API key scopes
* task credit/capacity reservation model for platform jobs
* team/provider budget and lane UI concepts

The clean result is a Market that can operate itself through deterministic platform jobs while keeping the knowledge-coop execution model intact: teams get capacity providers for their project work; TreeSeed gets a platform runner for Market operations.
