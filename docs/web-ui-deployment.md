# TreeSeed Web UI Deployment and Monitoring Completion Plan

**Status:** Historical completion plan plus current operational notes
**Scope:** root market, `packages/admin`, `packages/ui`, `packages/api`, `packages/sdk`, `packages/cli`, `packages/core`
**Primary goal:** Reach 100% working completion for project web deployment and monitoring through the Market web UI, API, Treeseed operations runner, SDK operations, and CLI.
**Explicit non-goal:** Do not implement or require capacity providers, provider lanes, worker grants, provider budgets, or hosted processing/runtime deployment for this milestone.

Current architecture note:

- the root Market repo is UI-only plus `/v1/*` proxy/client surfaces
- admin pages and deployment UI live in `packages/admin/src/pages/...`
- reusable controls live in `@treeseed/ui`
- the API and Treeseed operations runner live in `packages/api`
- backend deployment state lives in `@treeseed/api`
- CLI parity lives in `@treeseed/cli`
- reconciliation logic lives in `@treeseed/sdk`
- root market owns buyer marketplace, checkout, service, capacity, Commons participant, and business-facing pages, not generic admin deployment UI
- Railway builds API and runner from `packages/api`
- hosted readiness is checked through `npx trsd ready <environment> --json`
- targeted hosting repair uses `npx trsd hosting plan/apply/verify --environment <environment> --service <api|operationsRunner> --json`
- runner readiness is checked through `npx trsd operations smoke --environment <environment> --service operationsRunner --json`

For the current deploy/release runbook, prefer [API Deploy Runbook](./api-deploy.md) and [Project Web Deployment](./project-web-deployment.md). The implementation checklist below remains useful for understanding feature intent, but command references should follow the current runbooks.

See [Package Ownership](./package-ownership.md) for the current package map.

---

## 1. Target Outcome

A TreeSeed operator can use the Market UI to:

1. Configure repository, web, and optional email hosts.
2. Create a hosted project from blank/template/knowledge-pack input.
3. Watch launch phases from the project page.
4. Deploy the project web surface to staging.
5. Monitor the workflow and deployed host state from the UI.
6. Publish content where applicable.
7. Promote/deploy to production deliberately.
8. Retry, resume, cancel, or inspect failed operations.
9. Use equivalent CLI commands for every UI action.
10. Trust that all state is persisted in the Market control plane and shown consistently across UI/API/CLI.

The user experience should feel like:

```text
Project
  -> Deploy
  -> Observe workflow and host state
  -> Publish or promote
  -> Monitor
  -> Retry or inspect when blocked
```

Not like:

```text
Project
  -> Find hidden GitHub workflow
  -> Guess if Cloudflare deployed
  -> Manually inspect logs
  -> Manually repair control-plane state
```

---

## 2. Current Foundation

The current repo already has the major lower-level pieces:

### 2.1 Project launch UI exists

`packages/admin/src/pages/app/projects/new.astro` already collects project name, slug, source kind, managed hosting mode, repository host, web host, email host, credential sessions, and public site intent.

### 2.2 Project launch API exists

`POST /v1/teams/:teamId/projects/launch` already creates project control-plane records, environments, repository records, pending workflow jobs, and hub launch state.

### 2.3 Hosted workflow templates exist

`packages/sdk/templates/github/hosted-project.workflow.yml` and `packages/core/templates/github/hosted-project.workflow.yml` support dispatching tenant `deploy-web.yml` with:

```text
action_kind = deploy_web | publish_content | monitor
environment = staging | prod
project_id
```

### 2.4 Tenant deploy workflow action exists

`packages/sdk/scripts/tenant-workflow-action.ts` already parses:

```text
--action deploy_web|publish_content|monitor
--environment staging|prod
--project-id <id>
--preview-id <id>
--plan
```

and calls `runProjectPlatformAction`.

### 2.5 Platform operation polling exists

`@treeseed/ui/lib/app/platform-operation-status` already queues operations, polls operation status, polls operation events, renders progress messages, handles terminal states, and redirects after success.

### 2.6 Platform runner APIs exist

The API already has platform-runner endpoints for:

```text
POST /v1/platform/runners/jobs/claim
GET  /v1/platform/runners/jobs/:operationId
POST /v1/platform/runners/jobs/:operationId/events
POST /v1/platform/runners/jobs/:operationId/checkpoint
POST /v1/platform/runners/jobs/:operationId/complete
```

### 2.7 Existing project controls lack Deploy

`@treeseed/ui/components/astro/app/controls/ProjectControlNav.astro` currently includes:

```text
Settings
Hosts
Guidance
Decisions
Workdays
Agents
Artifacts
Delete
```

It should gain a first-class `Deploy` tab.

### 2.8 Project host view is read-only

`packages/admin/src/pages/app/projects/[projectId]/hosts.astro` currently displays repository records and host records, but does not expose deployment action, launch status, workflow state, deployment history, or monitoring.

---

## 3. Completion Definition

This work is complete only when all of the following are true.

### 3.1 UI completion

* Project control nav includes `Deploy`.
* `/app/projects/:projectId/deploy` exists.
* Deploy page shows launch state, environment state, latest deployment, active operation, recent workflow runs, deployment URLs, host records, and event timeline.
* Deploy page has action buttons for:

  * Deploy staging web
  * Publish content to staging
  * Monitor staging
  * Deploy production web
  * Publish content to production
  * Monitor production
  * Retry failed operation
  * Resume failed launch/deploy where supported
  * Cancel queued/running operation where supported
* UI never exposes raw secrets, runner tokens, capacity-provider controls, or raw task payloads.

### 3.2 API completion

* API exposes project deployment read routes.
* API exposes project deployment action routes.
* API validates team/project access and host readiness.
* API creates platform operations with idempotency keys.
* API records deployment intent, events, output, failures, external workflow IDs, URLs, and environment state.
* API supports retry/resume/cancel semantics for deploy operations.
* API responses are normalized and usable by UI and CLI.

### 3.3 Runner completion

* Treeseed operations runner can claim project web deployment operations.
* Runner can either:

  * execute a direct SDK operation for local/dev mode, or
  * dispatch GitHub Actions for hosted project mode.
* Runner monitors GitHub workflow progress and records compact event updates.
* Runner records final success/failure and output.
* Runner updates deployment records and environment state.
* Runner never registers as a capacity provider and never uses capacity-provider secrets.

### 3.4 SDK completion

* SDK exposes typed contracts for project deployment actions.
* SDK implements dispatch and monitor helpers for hosted project web workflows.
* SDK keeps `deploy_web`, `publish_content`, and `monitor` web-plane actions as the canonical action enum.
* SDK tests cover local direct action, hosted workflow dispatch, monitoring, failure formatting, and idempotency.

### 3.5 CLI completion

The CLI supports parity commands for UI/API deployment flows:

```bash
trsd projects deploy <project-id> --environment staging
trsd projects publish <project-id> --environment staging
trsd projects monitor <project-id> --environment staging
trsd projects deployments <project-id>
trsd projects deployment <project-id> <deployment-id>
trsd projects deployment retry <project-id> <deployment-id>
trsd projects deployment cancel <project-id> <deployment-id>
```

Equivalent aliases are acceptable, but the command family must be documented and tested.

### 3.6 Verification completion

* Unit tests pass for API, store, view models, SDK operations, workflow rendering, and CLI handlers.
* Acceptance tests exercise the web/API deployment flow.
* At least one local mocked end-to-end flow proves that a UI-triggered deploy creates an operation, a runner claims it, progress events appear, and project deployment state updates.
* Hosted workflow templates remain web-only and do not include capacity-provider/runtime deployment secrets.

---

## 4. Architecture Direction

Use the existing platform operation model as the durable execution contract.

```text
Market UI
  -> API deployment action route
  -> platform_operation queued
  -> operations-runner claims operation
  -> SDK executor dispatches or runs web action
  -> GitHub Actions / Cloudflare / content publish
  -> runner records events/checkpoints/result
  -> API read model updates
  -> UI / CLI display the same state
```

### 4.1 Responsibilities

| Layer                    | Responsibility                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Market UI                | Operator controls, status, timeline, safe retry/cancel actions                     |
| API               | Auth, validation, operation creation, read models, idempotency, state mutation     |
| Treeseed operations runner | Claims operations, dispatches/executes, monitors, records progress                 |
| SDK operations           | Deterministic deployment, GitHub workflow dispatch, Cloudflare/web/content actions |
| GitHub Actions           | Tenant workflow execution target for hosted web actions                            |
| CLI                      | Operator parity with UI/API actions                                                |
| Core                     | Shared workflow templates and hosted project web deployment support                |

### 4.2 Boundary rule

This feature must remain a **web/control-plane deployment loop**, not a processing-capacity loop.

Hard exclusions:

* No capacity provider registration.
* No provider lanes.
* No capacity grants.
* No worker budgets.
* No processing deployment action.
* No Railway capacity-provider secrets in tenant deploy workflows.
* No runner token exposure in UI.

Allowed execution targets:

```text
market_operations_runner
github_actions
cli local plan/test path
```

---

## 5. Data and Contract Model

Before adding code, define stable contracts. Prefer extending existing Market store tables and platform operation records. Add new tables only where existing project environment, host, deployment, and operation state cannot express the required read model cleanly.

### 5.1 Deployment action enum

Canonical action values:

```ts
type ProjectWebDeploymentAction =
  | 'deploy_web'
  | 'publish_content'
  | 'monitor';
```

### 5.2 Deployment environment enum

Canonical environment values:

```ts
type ProjectDeploymentEnvironment = 'staging' | 'prod';
```

UI labels may render `prod` as `Production`, but contracts should stay aligned with the workflow templates.

### 5.3 Deployment operation state

Normalize state for UI/API/CLI:

```text
queued
claimed
dispatching
running
monitoring
succeeded
failed
cancelled
timed_out
```

Map GitHub states into this model:

```text
requested     -> dispatching
queued        -> running
in_progress   -> running
completed + success -> succeeded
completed + failure|cancelled|timed_out -> failed/cancelled/timed_out
```

### 5.4 Project deployment record

Each deployment action should produce or update a record shaped like:

```ts
interface ProjectDeploymentRecord {
  id: string;
  projectId: string;
  teamId: string;
  environment: 'staging' | 'prod';
  action: 'deploy_web' | 'publish_content' | 'monitor';
  status: 'queued' | 'claimed' | 'dispatching' | 'running' | 'monitoring' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out';
  platformOperationId: string | null;
  source: 'market_ui' | 'market_api' | 'cli' | 'launch_flow' | 'runner_monitor';
  repository: {
    provider: 'github' | string;
    owner: string;
    name: string;
    branch: string;
    workflowFile: string;
  } | null;
  externalWorkflow: {
    provider: 'github_actions';
    runId: number | null;
    runUrl: string | null;
    workflowFile: string | null;
    status: string | null;
    conclusion: string | null;
    headSha: string | null;
    activeStep: string | null;
  } | null;
  target: {
    provider: 'cloudflare' | string;
    hostId: string | null;
    url: string | null;
    previewUrl: string | null;
    pagesProjectName: string | null;
    workerName: string | null;
  } | null;
  summary: string | null;
  error: {
    message: string;
    code?: string;
    inspectCommand?: string;
    url?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
```

### 5.5 Idempotency

Deployment action creation should use deterministic idempotency keys:

```text
project:<projectId>:web:<environment>:<action>:<sourceRef>
```

`sourceRef` should be one of:

```text
manual:<timestamp-or-request-id>
launch:<launch-id>
workflow:<github-run-id>
commit:<sha>
```

Do not deduplicate all manual deploys forever. Deduplicate only repeat submissions for the same request window or explicit idempotency key.

### 5.6 Event schema

Use platform operation events, but standardize deployment event kinds:

```text
deployment.requested
deployment.preflight.started
deployment.preflight.completed
deployment.workflow.dispatching
deployment.workflow.dispatched
deployment.workflow.waiting
deployment.workflow.running
deployment.workflow.still_active
deployment.workflow.completed
deployment.cloudflare.detected
deployment.host.updated
deployment.monitor.started
deployment.monitor.completed
deployment.failed
deployment.succeeded
deployment.cancelled
```

Event data should be presentation-safe and never include secrets.

---

## 6. API Implementation Plan

### 6.1 Route ownership decision

Implement deployment routes in a dedicated module and mount it from the main API app:

```text
packages/api/src/api/project-deployment-routes.js
packages/api/src/api/app.js
packages/api/src/api/route-descriptors.js
```

Route handlers should be thin. Validation, read-model assembly, operation creation, and store writes should live in helpers so UI/API parity tests can call them without HTTP when useful.

Required helper modules:

```text
packages/api/src/market/deployment-actions.ts
packages/api/src/market/deployment-readiness.ts
packages/api/src/market/deployment-projection.ts
packages/api/src/market/deployment-errors.ts
```

If the project keeps these helpers in JavaScript rather than TypeScript, keep the same module boundaries and document the runtime shapes with JSDoc typedefs.

### 6.2 Standard API error envelope

All deployment routes should use the same error envelope:

```ts
interface ProjectDeploymentErrorResponse {
  ok: false;
  error: {
    code:
      | 'not_authenticated'
      | 'not_authorized'
      | 'project_not_found'
      | 'deployment_not_found'
      | 'invalid_environment'
      | 'invalid_action'
      | 'deployment_not_ready'
      | 'host_not_ready'
      | 'repository_not_ready'
      | 'runner_not_ready'
      | 'operation_conflict'
      | 'operation_not_cancellable'
      | 'operation_not_retryable'
      | 'external_provider_failed'
      | 'validation_failed';
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
}
```

HTTP status mapping:

| Case                                                    | Status |
| ------------------------------------------------------- | ------ |
| Missing auth                                            | `401`  |
| Insufficient project/team permission                    | `403`  |
| Project or deployment missing                           | `404`  |
| Invalid action/environment/body                         | `400`  |
| Readiness blocker, conflict, duplicate active operation | `409`  |
| External provider failure while handling request        | `502`  |
| Unexpected server/store error                           | `500`  |

### 6.3 Add read routes

Add:

```http
GET /v1/projects/:projectId/deployment-state
GET /v1/projects/:projectId/deployments
GET /v1/projects/:projectId/deployments/:deploymentId
GET /v1/projects/:projectId/deployments/:deploymentId/events
```

`GET /deployment-state` returns the complete UI-ready aggregate:

```ts
interface ProjectDeploymentStateResponse {
  ok: true;
  project: ProjectSummary;
  launch: HubLaunchSummary | null;
  environments: Array<ProjectEnvironmentSummary>;
  repositories: Array<ProjectRepositorySummary>;
  hosts: Array<ProjectHostSummary>;
  runner: {
    status: 'online' | 'offline' | 'stale' | 'unknown';
    lastHeartbeatAt: string | null;
    capabilities: string[];
    activeJobCount: number | null;
  };
  latestDeployments: {
    staging: ProjectDeploymentRecord | null;
    prod: ProjectDeploymentRecord | null;
  };
  latestMonitors: {
    staging: ProjectWebMonitorResult | null;
    prod: ProjectWebMonitorResult | null;
  };
  activeOperations: ProjectDeploymentRecord[];
  recentDeployments: ProjectDeploymentRecord[];
  readiness: ProjectDeploymentReadiness;
  actions: ProjectDeploymentActionAvailability[];
}
```

`GET /deployments` supports query parameters:

```text
environment=staging|prod
action=deploy_web|publish_content|monitor
status=queued|claimed|dispatching|running|monitoring|succeeded|failed|cancelled|timed_out
limit=1..100
cursor=<opaque cursor>
```

Default ordering is newest first by `createdAt`.

`GET /events` returns deployment events in ascending event time order and supports:

```text
after=<event id or timestamp>
limit=1..200
```

### 6.4 Add action route

Add:

```http
POST /v1/projects/:projectId/deployments/web
```

Request body:

```ts
interface CreateProjectWebDeploymentRequest {
  environment: 'staging' | 'prod';
  action: 'deploy_web' | 'publish_content' | 'monitor';
  source?: 'market_ui' | 'market_api' | 'cli' | 'launch_flow';
  reason?: string;
  idempotencyKey?: string;
  previewId?: string | null;
  planOnly?: boolean;
  confirmProduction?: boolean;
}
```

Reject any request body containing capacity-provider/runtime-processing fields:

```text
capacityProviderId
laneId
grantId
workerPoolId
runtimeHostId
railwayServiceId
runnerToken
```

Response body:

```ts
interface CreateProjectWebDeploymentResponse {
  ok: true;
  deployment: ProjectDeploymentRecord;
  operation: DecoratedPlatformOperation;
  pollUrl: string;
  eventsUrl: string;
  stateUrl: string;
}
```

Operation payload should be deterministic and presentation-safe:

```ts
interface ProjectWebDeploymentOperationPayload {
  namespace: 'project';
  operation: 'web_deployment';
  projectId: string;
  teamId: string;
  deploymentId: string;
  environment: 'staging' | 'prod';
  action: 'deploy_web' | 'publish_content' | 'monitor';
  source: 'market_ui' | 'market_api' | 'cli' | 'launch_flow';
  repositoryId: string;
  webHostId: string;
  workflowFile: 'deploy-web.yml';
  dispatchStrategy: 'runner_direct_github_dispatch' | 'market_hosted_project_workflow';
  previewId?: string | null;
  planOnly?: boolean;
}
```

### 6.5 Add retry, resume, and cancel routes

Add:

```http
POST /v1/projects/:projectId/deployments/:deploymentId/retry
POST /v1/projects/:projectId/deployments/:deploymentId/resume
POST /v1/projects/:projectId/deployments/:deploymentId/cancel
```

State rules:

| Action | Allowed source states                                       | Result                                                                              |
| ------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Retry  | `failed`, `timed_out`, `cancelled`                          | Creates a new deployment record linked to the original deployment.                  |
| Resume | `failed`, `timed_out` with checkpoint                       | Creates a new operation for the same deployment record when the checkpoint is safe. |
| Cancel | `queued`, `claimed`, `dispatching`, `running`, `monitoring` | Marks cancellation requested and stops further runner work where possible.          |

Retry response should include both records:

```ts
interface RetryProjectDeploymentResponse {
  ok: true;
  originalDeployment: ProjectDeploymentRecord;
  retryDeployment: ProjectDeploymentRecord;
  operation: DecoratedPlatformOperation;
}
```

Cancel response should be explicit about whether cancellation is immediate or cooperative:

```ts
interface CancelProjectDeploymentResponse {
  ok: true;
  deployment: ProjectDeploymentRecord;
  cancellation: 'completed' | 'requested';
}
```

### 6.6 Validation rules

Before creating or mutating a deployment operation:

1. Ensure authenticated principal exists.
2. Resolve team/project access from the same team context used by existing project routes.
3. Ensure project exists and belongs to the active team context.
4. Enforce action-level permission.
5. Ensure repository records exist for the project.
6. Ensure repository provider is GitHub for hosted workflow dispatch.
7. Ensure the tenant repository has or will receive `.github/workflows/deploy-web.yml`.
8. Ensure selected environment exists or can be initialized.
9. Ensure web host exists and is ready.
10. Ensure Cloudflare/managed web host credential presence is known.
11. Ensure requested action is one of `deploy_web`, `publish_content`, `monitor`.
12. Ensure production deploy/publish includes `confirmProduction: true` from UI/CLI.
13. Reject requests that attempt processing/capacity-provider deployment.
14. Prevent duplicate active operations for the same project/environment/action unless caller supplies an explicit override in a later design.

### 6.7 Action availability read model

The API should compute action availability so UI and CLI do not duplicate readiness rules:

```ts
interface ProjectDeploymentActionAvailability {
  environment: 'staging' | 'prod';
  action: 'deploy_web' | 'publish_content' | 'monitor';
  available: boolean;
  blockedBy: Array<{
    code:
      | 'missing_repository'
      | 'missing_web_host'
      | 'missing_workflow'
      | 'missing_credentials'
      | 'active_operation'
      | 'production_confirmation_required'
      | 'permission_required'
      | 'runner_unavailable';
    message: string;
    href?: string;
  }>;
}
```

### 6.8 Production governance hook

Implement a small policy function now, even if it only enforces deliberate confirmation in the first release:

```ts
function resolveProjectDeploymentPolicy(input): {
  allowed: boolean;
  requiresApproval: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}
```

Initial rules:

* staging deploy: project operator.
* staging publish: project operator.
* staging monitor: project viewer or operator.
* production monitor: project viewer or operator.
* production deploy/publish: project operator plus explicit confirmation.
* future: require approval if project/environment policy says so.

---

## 7. Store and Projection Plan

### 7.1 Schema decision

Default implementation: add a Market-level deployment table unless Phase 0 proves an equivalent deployment table already exists. If an equivalent table exists, map the same logical fields onto it and keep the API/projection contracts unchanged.

Preferred tables:

```text
project_deployments
project_deployment_events
```

If platform operation events already provide sufficient event persistence, `project_deployment_events` may be a view/helper over platform events, but the project deployment API must still return deployment-scoped events.

### 7.2 `project_deployments` logical schema

Required columns or equivalent JSON-backed fields:

```text
id TEXT PRIMARY KEY
team_id TEXT NOT NULL
project_id TEXT NOT NULL
environment TEXT NOT NULL
action TEXT NOT NULL
status TEXT NOT NULL
source TEXT NOT NULL
platform_operation_id TEXT
retry_of_deployment_id TEXT
resumed_from_deployment_id TEXT
idempotency_key TEXT
requested_by_user_id TEXT
repository_json TEXT NOT NULL DEFAULT '{}'
external_workflow_json TEXT NOT NULL DEFAULT '{}'
target_json TEXT NOT NULL DEFAULT '{}'
monitor_json TEXT NOT NULL DEFAULT '{}'
summary TEXT
error_json TEXT NOT NULL DEFAULT '{}'
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
completed_at TEXT
```

Required indexes:

```text
idx_project_deployments_project_created(project_id, created_at DESC)
idx_project_deployments_project_env_created(project_id, environment, created_at DESC)
idx_project_deployments_project_status(project_id, status, updated_at DESC)
idx_project_deployments_operation(platform_operation_id)
idx_project_deployments_team_created(team_id, created_at DESC)
unique_project_deployments_idempotency(project_id, idempotency_key)
```

Only create the idempotency unique index when `idempotency_key` is non-null if the target database supports partial indexes. Otherwise enforce non-null key uniqueness in store logic.

### 7.3 `project_deployment_events` logical schema

Required columns or equivalent platform event mapping:

```text
id TEXT PRIMARY KEY
deployment_id TEXT NOT NULL
project_id TEXT NOT NULL
team_id TEXT NOT NULL
operation_id TEXT
kind TEXT NOT NULL
message TEXT NOT NULL
status TEXT
severity TEXT NOT NULL DEFAULT 'info'
sequence INTEGER NOT NULL
payload_json TEXT NOT NULL DEFAULT '{}'
created_at TEXT NOT NULL
```

Required indexes:

```text
idx_project_deployment_events_deployment_sequence(deployment_id, sequence ASC)
idx_project_deployment_events_project_created(project_id, created_at DESC)
idx_project_deployment_events_operation(operation_id)
```

### 7.4 Store methods

Add or extend store methods:

```ts
createProjectDeployment(input)
findProjectDeploymentById(id)
findProjectDeploymentByOperationId(operationId)
findProjectDeploymentByIdempotencyKey(projectId, idempotencyKey)
listProjectDeployments(projectId, filters)
updateProjectDeployment(id, patch)
markProjectDeploymentCancellationRequested(id, actor)
createProjectDeploymentRetry(originalDeploymentId, input)
appendProjectDeploymentEvent(id, event)
listProjectDeploymentEvents(id, filters)
findLatestProjectDeployment(projectId, environment, action?)
getProjectDeploymentState(projectId)
markProjectEnvironmentDeployment(projectId, environment, patch)
recordProjectDeploymentMonitorResult(id, result)
```

Every store write should update `updated_at`. Terminal writes should set `completed_at` exactly once.

### 7.5 Projection builder

Add:

```text
packages/api/src/market/deployment-projection.ts
packages/admin/src/view-models/deployment.vm.ts
```

Projection responsibilities:

* Normalize deployment records into display-safe cards, rows, and timeline events.
* Merge launch state, environment records, repository records, host records, platform operations, and monitor results.
* Compute blocked actions and next best action.
* Redact secrets and credential identifiers.
* Provide stable empty states.
* Preserve raw IDs only where needed for links/actions.

UI view model shape:

```ts
interface DeploymentViewModel {
  project: ProjectDisplay;
  launch: LaunchDisplay | null;
  runner: RunnerDisplay;
  readiness: ReadinessDisplay;
  environments: EnvironmentDeploymentDisplay[];
  activeOperations: OperationDisplay[];
  timeline: TimelineEventDisplay[];
  actions: DeploymentActionDisplay[];
  recentDeployments: DeploymentTableRow[];
  hostRows: HostTableRow[];
  repositoryRows: RepositoryTableRow[];
  troubleshooting: TroubleshootingHint[];
}
```

### 7.6 Empty states

The projection should produce calm empty states:

* No repository yet: “Repository records appear after launch completes.”
* No web host yet: “Configure a web host before deployment.”
* No workflow yet: “The deploy workflow will be installed during launch or the next repair step.”
* No deployment yet: “Deploy staging to create the first deployment record.”
* Active operation missing runner: “Queued. Waiting for the Treeseed operations runner.”
* GitHub workflow not found yet: “Dispatched. Waiting for GitHub to report the run.”
* Production blocked: “Deploy staging first, then confirm production deploy.”

### 7.7 Data retention

Keep all deployment records indefinitely for now because they form operational memory. Keep full event payloads unless they grow too large; if payloads grow, archive verbose external-provider payloads into artifacts while retaining compact event summaries in the database.

---

## 8. Runner Implementation Plan

### 8.1 Executor registration

Register a platform executor:

```ts
namespace: 'project'
operation: 'web_deployment'
```

The runner must claim only operations whose payload matches this namespace/operation pair unless explicitly configured for other operation types.

Input:

```ts
interface ProjectWebDeploymentOperationInput {
  projectId: string;
  teamId: string;
  deploymentId: string;
  environment: 'staging' | 'prod';
  action: 'deploy_web' | 'publish_content' | 'monitor';
  repository: GitHubRepositoryTarget;
  tenantRef: string;
  workflowFile: 'deploy-web.yml';
  dispatchStrategy: 'runner_direct_github_dispatch' | 'market_hosted_project_workflow';
  previewId?: string | null;
  planOnly?: boolean;
}
```

### 8.2 Runner command contract

Add or document a canonical runner command for this feature:

```bash
npm -w packages/api run dev:runner -- --market local --once --operation project:web_deployment --mock-external
npm -w packages/api run dev:runner -- --market local --watch --operation project:web_deployment --mock-external
```

The stable release-readiness command is the npm script wrapper over the existing runner entrypoint in mocked-external mode; no new `trsd` command root is added for deployment runner operations.

Mocked release acceptance uses:

```bash
npm -w packages/api run dev:runner -- --market local --once --operation project:web_deployment --mock-external
```

Required flags:

```text
--market <selector>
--once
--watch
--operation project:web_deployment
--poll-interval-ms <number>
--max-jobs <number>
--plan
--mock-external
```

### 8.3 Dispatch strategy decision

Default strategy for first completion:

1. Use `runner_direct_github_dispatch` when the Treeseed operations runner has a GitHub credential that can dispatch the tenant repository workflow.
2. Fall back to `market_hosted_project_workflow` only when central orchestration is explicitly configured.
3. Both strategies must produce the same deployment record, event timeline, and failure shape.

This prevents the UI/API from caring whether the external work was launched directly or through the hosted-project orchestration workflow.

### 8.4 Executor steps

The executor should:

1. Load operation input.
2. Load deployment record and verify it is still runnable.
3. Check for cancellation request before any external call.
4. Mark deployment `claimed`.
5. Emit `deployment.preflight.started`.
6. Validate repository, branch, workflow file, host config, environment, credentials, and action.
7. Emit `deployment.preflight.completed`.
8. If local/direct mode, call `runProjectPlatformAction` directly.
9. If hosted mode, dispatch GitHub Actions according to the selected dispatch strategy.
10. Emit `deployment.workflow.dispatching` and `deployment.workflow.dispatched` with run URL when available.
11. Poll GitHub workflow run status with bounded backoff.
12. Emit compact progress events using active job/step descriptions.
13. Check for cancellation request between polls.
14. On completion, record run ID, URL, conclusion, head SHA, output URLs, and compact provider result.
15. Run post-deploy monitor if action requires it or if configured.
16. Update host/environment/deployment state.
17. Complete platform operation and terminalize the deployment record.

### 8.5 Timeout and backoff rules

Initial rules:

```text
GitHub dispatch timeout: 60 seconds
GitHub run discovery timeout: 120 seconds
Workflow monitor timeout: 45 minutes
Monitor-only action timeout: 5 minutes
HTTP URL check timeout: 10 seconds per URL
Polling interval: start 5 seconds, back off to max 30 seconds
```

Timeouts should produce `timed_out`, not generic `failed`, with retry guidance.

### 8.6 Cancellation behavior

Cancellation is cooperative:

* If operation is queued, API can mark it `cancelled` before runner claim.
* If runner has claimed but not dispatched, runner stops before external dispatch.
* If GitHub workflow is already dispatched, runner should attempt GitHub workflow cancellation when credentials allow it.
* If external cancellation fails, runner records a warning and continues monitoring until terminal state.

### 8.7 Checkpoints

Record checkpoints after:

```text
preflight_completed
workflow_dispatched
workflow_run_discovered
workflow_completed
monitor_completed
environment_updated
```

Resume is only allowed from checkpoints that are safe to replay. Do not replay repository creation or credential mutation in this deployment executor.

### 8.8 Error quality

Failure output must include:

* user-readable summary
* failed external provider if known
* GitHub run URL if known
* inspect command if known
* failed job name if known
* last active step if known
* retry safety
* resume safety
* exact blocker code where possible

### 8.9 Runner health UI support

Expose runner readiness on the deploy page:

```text
Treeseed operations runner: online/offline/stale/unknown
Last heartbeat
Environment
Capabilities
Active jobs
```

Keep this as status context, not as a capacity-provider control.

---

## 9. SDK Implementation Plan

### 9.1 Add typed deployment contracts

Add or extend SDK contracts near platform/operations types:

```text
packages/sdk/src/platform-operations.ts
packages/sdk/src/operations/services/project-platform.ts
packages/sdk/src/project-workflow.ts
```

Required exports:

```ts
export type ProjectWebDeploymentAction = 'deploy_web' | 'publish_content' | 'monitor';
export type ProjectDeploymentEnvironment = 'staging' | 'prod';
export interface ProjectWebDeploymentOperationInput { ... }
export interface ProjectWebDeploymentResult { ... }
export interface ProjectWebMonitorResult { ... }
```

### 9.2 Harden `runProjectPlatformAction`

Ensure `runProjectPlatformAction(action, options)` returns structured data for all actions:

```ts
interface ProjectPlatformActionResult {
  action: ProjectWebDeploymentAction;
  scope: 'staging' | 'prod';
  projectId: string | null;
  previewId: string | null;
  planOnly: boolean;
  changed: boolean;
  urls: string[];
  resources: Array<{ kind: string; name: string; state: string; url?: string }>;
  monitor?: ProjectWebMonitorResult;
  warnings: string[];
}
```

### 9.3 Add GitHub hosted workflow helpers

Add helpers near GitHub automation/API services:

```ts
dispatchHostedProjectWebWorkflow(input)
waitForHostedProjectWebWorkflow(input, onProgress)
inspectHostedProjectWebWorkflow(input)
cancelHostedProjectWebWorkflow(input)
formatHostedProjectWorkflowFailure(input)
```

Helpers should accept a progress callback that can be wired directly to platform operation events.

### 9.4 Add monitor normalization helper

Add:

```ts
normalizeProjectWebMonitorResult(input): ProjectWebMonitorResult
```

The helper should convert GitHub, Cloudflare, HTTP, content, and migration checks into one stable check list. Unknown external-provider details should become `unknown` or `skipped`, not hard failures, unless the deploy action requires that provider.

### 9.5 Preserve workflow template boundary

Tests must assert:

* `deploy-web.yml` includes `deploy_web`, `publish_content`, `monitor`.
* hosted project repos get `deploy-web.yml`.
* market control plane gets `deploy-web.yml` and `hosted-project.yml`.
* web workflows do not include processing/capacity-provider deployment actions.
* hosted project deploy workflow does not include `TREESEED_RAILWAY_API_TOKEN`.
* hosted project deploy workflow does not include capacity-provider secrets.

---

## 10. UI Implementation Plan

### 10.1 Add Deploy nav item

Update:

```text
@treeseed/ui/components/astro/app/controls/ProjectControlNav.astro
```

Change type:

```ts
current:
  | 'settings'
  | 'hosts'
  | 'deploy'
  | 'guidance'
  | 'decisions'
  | 'workdays'
  | 'agents'
  | 'artifacts'
  | 'delete';
```

Add item:

```ts
{ key: 'deploy', label: 'Deploy', href: `/app/projects/${encoded}/deploy` }
```

Recommended order:

```text
Settings
Hosts
Deploy
Guidance
Decisions
Workdays
Agents
Artifacts
Delete
```

### 10.2 Add project deploy page

Create:

```text
packages/admin/src/pages/app/projects/[projectId]/deploy.astro
```

Page sections:

1. Project deployment header
2. Launch status panel
3. Readiness checklist
4. Environment cards
5. Action panel
6. Active operation timeline
7. Recent deployment history
8. Repository and host context
9. Runner diagnostics
10. Troubleshooting hints

### 10.3 Server-side data loading

The deploy page should server-render from:

```text
GET /v1/projects/:projectId/deployment-state
```

or the equivalent in-process view-model helper. The rendered page should be useful without client-side JavaScript.

### 10.4 Header

Header should display:

```text
Project name
Current deployment readiness
Latest staging URL
Latest production URL
Last successful deploy
Active operation state
Last monitor state
```

### 10.5 Launch status panel

Show launch state even before the first deployment exists:

```text
Not launched
Queued
Provisioning repository
Installing workflow
Provisioning web host
Initial deploy running
Launch failed
Launch complete
```

The panel should link to retry/resume only when those actions are actually available.

### 10.6 Readiness checklist

Checklist items:

* Project exists.
* Repository record exists.
* GitHub repository configured.
* `deploy-web.yml` installed or installable.
* Web host configured.
* Cloudflare credentials/session available or managed host ready.
* Staging environment exists.
* Production environment exists or can be created.
* Treeseed operations runner online or queued operations can wait safely.
* No conflicting active deployment operation exists.

### 10.7 Environment cards

One card each:

```text
Staging
Production
```

Each card shows:

* state
* latest deployment status
* latest deployment time
* URL
* workflow run link
* monitor status
* available actions
* blockers

### 10.8 Action panel

Actions should post to:

```text
/v1/projects/:projectId/deployments/web
```

Use `submitPlatformOperationForm` or a deployment-specific wrapper built on it.

Button mapping:

| Button                     | Body                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Deploy staging             | `{ environment: 'staging', action: 'deploy_web', source: 'market_ui' }`                            |
| Publish staging content    | `{ environment: 'staging', action: 'publish_content', source: 'market_ui' }`                       |
| Monitor staging            | `{ environment: 'staging', action: 'monitor', source: 'market_ui' }`                               |
| Deploy production          | `{ environment: 'prod', action: 'deploy_web', source: 'market_ui', confirmProduction: true }`      |
| Publish production content | `{ environment: 'prod', action: 'publish_content', source: 'market_ui', confirmProduction: true }` |
| Monitor production         | `{ environment: 'prod', action: 'monitor', source: 'market_ui' }`                                  |

Buttons should be disabled when action availability says blocked. The disabled state must show the blocker message.

### 10.9 Production confirmation

Production deploy/publish requires a confirmation step with explicit copy:

```text
Deploy production
This will publish the production web surface for this project.
Environment: Production
Project: <project name>
```

The API should still enforce `confirmProduction: true`; the UI confirmation alone is not sufficient.

### 10.10 Timeline

Reuse or create:

```text
@treeseed/ui/components/astro/app/operations/DeploymentTimeline.astro
```

Event display groups:

* Request
* Preflight
* Dispatch
* GitHub workflow
* Cloudflare/web publish
* Monitor
* Completion/failure

Timeline accessibility requirements:

* Use semantic list markup.
* Include text labels for status icons.
* Do not rely on color alone.
* Preserve chronological order for screen readers.

### 10.11 Deployment history table

Columns:

```text
Environment
Action
Status
Started
Completed
Workflow
URL
Requested by
```

Rows should link to deployment detail or operation detail.

### 10.12 Progressive enhancement and polling

Server-render the page with current state. Add light client-side polling for active operations.

Polling strategy:

* Poll active operation every 1 second while newly queued via form helper.
* On deploy page idle, poll every 10–15 seconds if active operation exists.
* Stop polling on terminal state.
* Show refresh fallback.
* Recover gracefully if polling returns `401`, `403`, or `404`.

### 10.13 Sensitive unlock handling

If a deployment action is blocked by missing credential session, show a sensitive unlock panel. The panel should request only the relevant host/session and should never display stored secret values.

---

## 11. CLI Implementation Plan

### 11.1 Extend project handler and parser

Update:

```text
packages/cli/src/cli/handlers/projects.ts
packages/cli/src/cli/operations-registry.ts
packages/cli/src/cli/operations-parser.ts
packages/cli/src/cli/help.ts
packages/cli/src/cli/operations-help.ts
```

Add actions:

```text
deploy
publish
monitor
deployments
deployment
```

### 11.2 Commands

#### Deploy

```bash
trsd projects deploy <project-id> --environment staging
```

Posts:

```json
{
  "environment": "staging",
  "action": "deploy_web",
  "source": "cli"
}
```

#### Publish

```bash
trsd projects publish <project-id> --environment staging
```

Posts:

```json
{
  "environment": "staging",
  "action": "publish_content",
  "source": "cli"
}
```

#### Monitor

```bash
trsd projects monitor <project-id> --environment staging
```

Posts:

```json
{
  "environment": "staging",
  "action": "monitor",
  "source": "cli"
}
```

#### List deployments

```bash
trsd projects deployments <project-id>
```

Calls:

```text
GET /v1/projects/:projectId/deployments
```

#### Inspect deployment

```bash
trsd projects deployment <project-id> <deployment-id>
```

Calls:

```text
GET /v1/projects/:projectId/deployments/:deploymentId
GET /v1/projects/:projectId/deployments/:deploymentId/events
```

#### Retry/resume/cancel

```bash
trsd projects deployment retry <project-id> <deployment-id>
trsd projects deployment resume <project-id> <deployment-id>
trsd projects deployment cancel <project-id> <deployment-id>
```

### 11.3 Shared flags

Deployment action commands support:

```text
--market <selector>
--environment staging|prod
--wait
--timeout-seconds <number>
--poll-interval-ms <number>
--json
--plan
--reason <text>
--idempotency-key <key>
--yes
```

`--yes` is required for production deploy/publish. Without `--yes`, production deploy/publish exits with a clear confirmation error and does not call the API.

### 11.4 CLI output

Use guided output with JSON report support.

Human output example:

```text
Treeseed project deployment queued

Project: market-docs
Environment: staging
Action: deploy_web
Deployment: dep_123
Operation: op_123
Status: queued

Poll:
  trsd projects deployment market-docs dep_123
```

With `--wait`, CLI should poll until terminal state:

```bash
trsd projects deploy <project-id> --environment staging --wait
```

Terminal success output should include URL and workflow run link when known. Terminal failure output should include inspect command and retry suggestion when known.

### 11.5 Exit codes

Use stable exit codes:

```text
0 success
1 validation or usage error
2 authentication/authorization error
3 operation failed
4 operation timed out while waiting
5 cancelled
```

`--json` should still use the same exit codes.

### 11.6 Auth

Use existing Market auth profile flow. Commands should fail clearly if the user has not run:

```bash
trsd auth:login --market <selector>
```

---

## 12. Launch Flow Integration

### 12.1 Integration decision

For first completion, keep the existing project launch job path, but expose it through the deployment state read model. Do not block web deployment completion on rewriting launch into a platform operation.

Target state:

```text
Existing launch job/hub launch state
  -> deployment-state launch summary
  -> deploy page launch panel
  -> retry/resume launch actions where existing job semantics support them
```

Later migration can convert launch into the same `project:web_deployment` platform operation family, but that is not required for this milestone.

### 12.2 Redirect after project creation

After `/app/projects/new` queues launch, redirect to:

```text
/app/projects/:projectId/deploy?launch=<launchId>
```

If project id is not available until API response, update the launch API response to include enough data for the redirect:

```ts
interface ProjectLaunchResponse {
  ok: true;
  projectId: string;
  launchId: string;
  operationId?: string;
  deployHref: string;
}
```

### 12.3 Launch status mapping

Map existing launch/job phases into these UI states:

```text
not_started
queued
repository_provisioning
content_bootstrap
workflow_installing
cloudflare_provisioning
initial_deploy_running
monitoring
complete
failed
cancelled
unknown
```

### 12.4 First deploy action

If launch already queued or ran an initial web deployment, show it as active/latest. If launch only installed infrastructure and workflow, show `Deploy staging` as the next action.

### 12.5 Retry launch

If the original launch job fails, the Deploy page should show:

```text
Launch failed
Retry launch
Resume launch
Inspect failure
```

Use existing job retry/resume semantics for `workflow / launch_project` jobs. If a launch failure is not retryable, show the specific blocker and link to Hosts/Settings.

---

## 13. Monitoring Scope

Monitoring in this milestone means operational deployment monitoring, not full observability.

### 13.1 Required checks

For each environment:

| Check           | Source                           | Healthy                         | Degraded                                         | Failed                                   |
| --------------- | -------------------------------- | ------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| Latest workflow | GitHub Actions                   | latest relevant run succeeded   | run still active or old success                  | latest run failed/cancelled/timed out    |
| Workflow file   | GitHub repository                | `deploy-web.yml` exists         | unknown due credential/read issue                | missing                                  |
| Web host        | Market host records / Cloudflare | host ready with URL             | host configured but not yet verified             | missing or provider error                |
| Public URL      | deployment target                | URL known and valid             | URL known but HTTP check skipped                 | URL missing after deploy success         |
| HTTP response   | direct fetch where safe          | 2xx/3xx                         | 401/403 or transient 5xx with known private mode | DNS/connection failure or persistent 5xx |
| Content publish | SDK/content result               | publish completed or not needed | publish status unknown                           | publish failed                           |
| D1 migration    | SDK/workflow output              | completed or not needed         | unknown                                          | failed                                   |
| Form/API route  | HTTP/API probe where safe        | expected status                 | skipped/private                                  | unexpected failure                       |

### 13.2 Monitor action output

`monitor` should produce:

```ts
interface ProjectWebMonitorResult {
  environment: 'staging' | 'prod';
  status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  checkedAt: string;
  checks: Array<{
    key: string;
    label: string;
    status: 'passed' | 'warning' | 'failed' | 'skipped';
    summary: string;
    source: 'market' | 'github' | 'cloudflare' | 'http' | 'sdk';
    url?: string;
    inspectCommand?: string;
  }>;
  urls: string[];
  warnings: string[];
}
```

### 13.3 Timeout rules

Initial monitor timeouts:

```text
Overall monitor action: 5 minutes
GitHub API read: 15 seconds per request
Cloudflare API read: 15 seconds per request
HTTP URL check: 10 seconds per URL
Max URL checks per monitor run: 5
```

Do not fail the whole monitor run because an optional check is skipped. Use `degraded` when enough information is missing to reduce confidence, and `failed` when a required check fails.

### 13.4 UI presentation

Do not overbuild charts. Use compact operational panels:

```text
Healthy / Degraded / Failed / Unknown
Last checked
Checks passed / warnings / failures
Inspect links
```

### 13.5 CLI presentation

`trsd projects monitor --wait` should print a compact checklist and return exit code `0` for healthy/degraded with warnings, and `3` for failed unless `--allow-degraded` is added in a later design.

---

## 14. Security and Governance

### 14.1 Secret handling

* UI never displays raw secrets.
* Deployment state stores secret presence/credential reference, not values.
* Runner receives credentials through environment/config/credential session mechanisms only.
* GitHub workflow logs should not echo secrets.
* API responses redact credential identifiers unless the identifier is already presentation-safe.
* Event payloads must pass a redaction helper before persistence.

### 14.2 Permissions

Define or reuse permissions:

```text
project:read
project:deploy:staging
project:deploy:production
project:publish:staging
project:publish:production
project:monitor
project:deployment:retry
project:deployment:resume
project:deployment:cancel
```

Initial RBAC mapping:

| Permission          | Owner | Maintainer/operator           | Viewer |
| ------------------- | ----- | ----------------------------- | ------ |
| read                | yes   | yes                           | yes    |
| monitor             | yes   | yes                           | yes    |
| deploy staging      | yes   | yes                           | no     |
| publish staging     | yes   | yes                           | no     |
| deploy production   | yes   | yes, if project policy allows | no     |
| publish production  | yes   | yes, if project policy allows | no     |
| retry/resume/cancel | yes   | yes                           | no     |

If the RBAC layer is not granular yet, map these to existing team/project roles and keep permission constants ready for later refinement.

### 14.3 Audit events

Record audit events for:

```text
project_deployment_requested
project_production_deployment_requested
project_content_publish_requested
project_deployment_retry_requested
project_deployment_resume_requested
project_deployment_cancel_requested
project_deployment_succeeded
project_deployment_failed
project_deployment_cancelled
project_monitor_completed
```

Audit payload should include:

```ts
{
  projectId: string;
  teamId: string;
  deploymentId: string;
  environment: 'staging' | 'prod';
  action: 'deploy_web' | 'publish_content' | 'monitor';
  actorUserId: string | null;
  operationId: string | null;
  status: string;
  summary?: string;
}
```

Never include secrets, tokens, raw provider responses, or full workflow logs in audit payloads.

### 14.4 Production safety

Production buttons should include explicit copy:

```text
Deploy production
Publishes the current production web surface for this project.
```

UI must require confirmation. API must require `confirmProduction: true`. CLI must require `--yes`.

### 14.5 Boundary tests

Security/governance completion requires tests proving:

* Deployment responses contain no known secret patterns.
* Runner tokens never appear in UI/API deployment state.
* Capacity-provider fields are rejected from deployment action bodies.
* Hosted project web workflow templates do not contain processing/capacity-provider secrets.
* Production deploy/publish cannot run without confirmation.

---

## 15. Testing Plan

### 15.1 API tests

Add or extend:

```text
test/api/api.test.ts
test/lib/api-route-descriptors.test.ts
test/lib/processing-runtime-config.test.ts
```

Test cases:

* deployment state route requires auth
* deployment state route requires project access
* create deployment validates environment
* create deployment validates action
* create deployment rejects capacity-provider fields
* create deployment fails clearly without repository host
* create deployment fails clearly without web host
* create deployment creates platform operation
* create deployment creates deployment record
* retry only allowed for failed/cancelled deployment
* cancel only allowed for queued/running deployment
* production deploy permission enforced

### 15.2 Store tests

Add or extend:

```text
test/lib/drizzle-schema.test.ts
test/lib/hosted-deployment-state.test.ts
```

Test cases:

* create/list/update deployment record
* latest deployment per environment
* deployment event order
* operation-to-deployment relationship
* environment state update
* idempotency key behavior

### 15.3 Runner tests

Add or extend:

```text
test/lib/platform-operations.test.ts
packages/sdk/test/utils/github-workflow-wait.test.ts
packages/sdk/test/utils/tenant-workflow-action.test.ts
```

Test cases:

* runner claims project web deployment operation
* runner emits deployment progress events
* runner dispatches mocked GitHub workflow
* runner monitors mocked workflow through success
* runner records failed job and inspect command
* runner marks deployment failed on workflow failure
* runner respects cancellation
* runner leaves no capacity-provider records

### 15.4 UI tests

Add or extend:

```text
test/lib/operational-ia.test.ts
test/lib/api-ui-supervision-parity.test.ts
test/lib/shell-conversion.test.ts
```

Test cases:

* ProjectControlNav includes Deploy
* deploy page renders empty state before launch
* deploy page renders active operation
* deploy page renders staging/prod cards
* deploy page renders retry/cancel actions for failed/active states
* deploy page does not render secrets
* deploy page does not render capacity-provider controls

### 15.5 CLI tests

Add:

```text
packages/cli/scripts/projects-deploy.test.ts
```

or extend existing CLI test harness.

Test cases:

* `trsd projects deploy` posts expected body
* `trsd projects publish` posts expected body
* `trsd projects monitor` posts expected body
* `--wait` polls operation
* list deployments renders human output and JSON report
* auth failure is clear

### 15.6 Workflow template tests

Extend existing workflow tests:

* `deploy-web.yml` includes web-plane action env.
* `hosted-project.yml` supports `deploy_web`, `publish_content`, `monitor`.
* hosted project repos only receive deploy workflow.
* market control plane receives orchestration workflow.
* no capacity provider/processing secrets in hosted web deployment workflow.

### 15.7 Acceptance test

Add scenario to:

```text
scripts/api-acceptance.ts
test/acceptance/api.base.yaml
```

Acceptance flow:

1. Seed local TreeSeed team/project/hosts.
2. Create hosted project or use seeded project.
3. Call deployment state route.
4. Queue staging deploy.
5. Run Treeseed operations runner in once mode with mocked GitHub/Cloudflare.
6. Confirm operation succeeded.
7. Confirm deployment record updated.
8. Confirm UI-facing state shows latest staging deployment.
9. Queue monitor.
10. Confirm monitor result is visible.

---

## 16. Documentation Plan

### 16.1 Add implementation docs

Create:

```text
docs/project-web-deployment.md
```

Include:

* Architecture diagram.
* UI flow.
* API routes.
* CLI commands.
* Runner behavior.
* State machine.
* Troubleshooting.
* Security boundaries.

### 16.2 Update demo runbook

Update:

```text
docs/demo.md
```

Add deployment walkthrough:

```text
/app/projects/:projectId/deploy
Deploy staging
Monitor staging
Publish content
Deploy production
Inspect deployment history
```

### 16.3 Update UI spec

Update:

```text
docs/market_ui_spec.md
docs/purpose.md
```

Add Deploy as a project control, while keeping primary app IA stable.

### 16.4 CLI help

Update CLI help so deploy commands appear under project operations.

---

## 17. Implementation Phases

### Phase 0 — Contract freeze and inventory

Deliverables:

* Confirm existing store fields/tables for deployments, environments, hosts, operations.
* Write deployment contract types.
* Decide whether to extend existing deployment records or add a new table.
* Add route descriptor stubs.

Acceptance:

* Contract tests compile.
* No UI behavior changes yet.
* No capacity-provider dependency introduced.

### Phase 1 — API deployment action and read model

Deliverables:

* `GET /v1/projects/:projectId/deployment-state`
* `GET /v1/projects/:projectId/deployments`
* `POST /v1/projects/:projectId/deployments/web`
* store methods for deployment records
* platform operation creation
* idempotency support

Acceptance:

* API tests prove deployment can be queued.
* API returns operation poll/event URLs.
* Deployment record appears in list route.

### Phase 2 — Runner executor

Deliverables:

* project web deployment executor registered with Treeseed operations runner
* preflight events
* GitHub workflow dispatch helper
* GitHub workflow monitor helper
* deployment success/failure updates

Acceptance:

* Runner once-mode can complete a mocked deployment.
* Operation events show request → preflight → dispatch → running → completion.
* Failed GitHub run records inspect command.

### Phase 3 — Deploy page UI

Deliverables:

* ProjectControlNav `Deploy` tab
* `/app/projects/:projectId/deploy.astro`
* deployment view model
* environment cards
* action buttons
* active operation timeline
* deployment history table
* retry/cancel controls

Acceptance:

* UI can queue staging deploy.
* UI shows active operation progress.
* UI refreshes to latest deployment state.
* UI handles empty/missing readiness state calmly.

### Phase 4 — CLI parity

Deliverables:

* CLI project deploy/publish/monitor/list/inspect/retry/cancel commands
* `--wait` support
* JSON report support
* help text

Acceptance:

* CLI tests pass.
* UI and CLI produce equivalent API requests.
* CLI can inspect same state shown in UI.

### Phase 5 — Launch integration

Deliverables:

* project creation redirects to Deploy page
* Deploy page shows hub launch status
* failed launch retry/resume actions exposed safely
* first deploy next-action guidance

Acceptance:

* New project launch has an obvious next step.
* Failed launch no longer strands the operator.
* Existing launch job retry/resume remains supported.

### Phase 6 — Monitoring completeness

Deliverables:

* `monitor` action result normalized
* monitor checks displayed in UI
* monitor command in CLI
* monitor events persisted
* latest monitor status shown per environment

Acceptance:

* Monitor can run independently of deploy.
* Monitor output is visible in UI/API/CLI.
* Degraded/failed state includes actionable detail.

### Phase 7 — Security, governance, and audit pass

Deliverables:

* production confirmation
* audit events
* permission checks
* no secret leakage tests
* no capacity-provider leakage tests

Acceptance:

* Production deploy requires explicit user action.
* Audit trail captures deployment decisions.
* Tests prove hidden boundaries stay hidden.

### Phase 8 — Acceptance, docs, and release readiness

Deliverables:

* acceptance scenario
* docs
* demo update
* release notes
* runbook

Acceptance:

* Full local mocked flow passes.
* Manual local runbook works.
* TreeSeed demo can show deployment without explaining internals.

---

## 18. Manual Verification Runbook

Use local Market surfaces first.

### 18.1 Start local Market development

```bash
cd <market-workspace>
npx trsd status --json
npx trsd install --json
npx trsd dev status --json
npx trsd dev start --web-runtime local --json
```

The root Market dev command starts the web UI, API, managed local Treeseed PostgreSQL, API migrations, and the `project:web_deployment` operations runner. `trsd dev start` runs that surface as a managed worktree-scoped background instance with stable PID, port, URL, and log metadata under `.treeseed/dev` and `.treeseed/logs`; `trsd dev` without a subcommand remains the foreground supervisor. Non-provider local values have defaults through the local launch environment; configure provider credentials through `trsd config` when you want real GitHub/Cloudflare side effects.

### 18.2 Authenticate and seed local data

In another terminal:

```bash
npx trsd auth:login --market local
npx trsd seed treeseed --environments local --validate
npx trsd seed treeseed --environments local --plan
npx trsd seed treeseed --environments local --apply --json
```

### 18.3 Verify deployment API readiness

```bash
npx trsd projects deployments <project-id> --market local --json
curl -s http://127.0.0.1:4321/v1/projects/<project-id>/deployment-state
```

The API should return project, readiness, actions, environments, runner, and recent deployment state. Missing repository/host data should appear as blockers, not server errors.

### 18.4 Runner behavior

The operations runner is already supervised by `npx trsd dev` or `npx trsd dev start` from the Market repo root. The standalone command remains available for focused mocked acceptance or debugging:

```bash
npm -w packages/api run dev:runner -- \
  --market local \
  --watch \
  --operation project:web_deployment \
  --mock-external
```

For one-job verification:

```bash
npm -w packages/api run dev:runner -- \
  --market local \
  --once \
  --operation project:web_deployment \
  --mock-external
```

`--mock-external` completes the flow without real GitHub/Cloudflare side effects while still exercising API, store, operation events, runner claim, checkpoints, and UI polling. For real local staging proof, use the integrated managed `trsd dev start` runner, foreground `trsd dev`, or the standalone command without `--mock-external` after configuring disposable provider credentials.

### 18.5 Verify UI flow

Open:

```text
http://127.0.0.1:4321/app/projects
http://127.0.0.1:4321/app/projects/:projectId/deploy
```

Verify:

1. Deploy tab appears.
2. Launch status is visible.
3. Readiness checklist is understandable.
4. Staging deploy queues an operation.
5. Operation appears active without refresh.
6. Runner claims operation.
7. Timeline updates.
8. Deployment record succeeds or fails with actionable detail.
9. Monitor action works.
10. Production action requires confirmation.
11. CLI sees the same state.

### 18.6 CLI parity verification

```bash
npx trsd projects deployments <project-id> --market local
npx trsd projects deploy <project-id> --environment staging --market local --wait
npx trsd projects monitor <project-id> --environment staging --market local --wait
npx trsd projects publish <project-id> --environment staging --market local --wait
npx trsd projects deploy <project-id> --environment prod --market local --yes --wait
npx trsd projects monitor <project-id> --environment prod --market local --wait
```

### 18.7 Failure verification

Run with a mocked failed workflow result:

```bash
npm -w packages/api run dev:runner -- \
  --market local \
  --once \
  --operation project:web_deployment \
  --mock-external \
  --mock-result failure
```

Verify:

1. Deployment reaches `failed`.
2. UI shows failed step and inspect command.
3. Retry button appears.
4. CLI retry works.
5. Audit event is recorded.
6. No raw provider payload or secret appears in UI/API output.

### 18.8 Real external verification

After mocked flow passes, run against real GitHub/Cloudflare credentials for one disposable project/environment:

```bash
npx trsd projects deploy <project-id> --environment staging --market local --wait
npx trsd projects monitor <project-id> --environment staging --market local --wait
```

Success requires a real workflow run link and a known target URL or an explicit, actionable provider blocker.

---

## 19. 100% Done Checklist

### 19.1 Product behavior

* [x] User can configure repository host from `/app/hosts`.
* [x] User can configure web host from `/app/hosts`.
* [x] User can create project from `/app/projects/new`.
* [x] User lands on Deploy after launch or can immediately navigate there.
* [x] Project nav includes Deploy.
* [x] User sees launch status before first deployment.
* [x] User sees deployment readiness and blockers.
* [x] User sees staging and production environment cards.
* [x] User can deploy staging web.
* [x] User can publish staging content.
* [x] User can monitor staging.
* [x] User can deploy production web deliberately.
* [x] User can publish production content deliberately.
* [x] User can monitor production.
* [x] User can retry failed deployment.
* [x] User can resume checkpointed deployment where supported.
* [x] User can cancel queued/running deployment where supported.
* [x] User can inspect deployment history.
* [x] User can inspect deployment events.
* [x] User can see GitHub workflow links when known.
* [x] User can see public/staging URLs when known.
* [x] User receives actionable guidance when deployment is blocked.

### 19.2 API and contract completeness

* [x] `GET /v1/projects/:projectId/deployment-state` exists.
* [x] `GET /v1/projects/:projectId/deployments` exists.
* [x] `GET /v1/projects/:projectId/deployments/:deploymentId` exists.
* [x] `GET /v1/projects/:projectId/deployments/:deploymentId/events` exists.
* [x] `POST /v1/projects/:projectId/deployments/web` exists.
* [x] Retry route exists.
* [x] Resume route exists or explicitly returns not-supported with stable error shape.
* [x] Cancel route exists.
* [x] API uses the standard success/error envelopes.
* [x] API validates action and environment.
* [x] API validates project/team access.
* [x] API validates repository readiness.
* [x] API validates web host readiness.
* [x] API computes action availability.
* [x] API enforces production confirmation.
* [x] API rejects capacity-provider/runtime-processing fields.
* [x] API creates platform operations with idempotency keys.
* [x] API responses are usable by UI and CLI without duplicate business rules.

### 19.3 Store and data correctness

* [x] Deployment records persist team/project/environment/action/status/source.
* [x] Deployment records persist platform operation relationship.
* [x] Deployment records persist retry/resume relationships.
* [x] Deployment records persist repository target metadata.
* [x] Deployment records persist external workflow metadata when known.
* [x] Deployment records persist target URL metadata when known.
* [x] Deployment records persist monitor result when known.
* [x] Deployment records persist structured error data when failed.
* [x] Deployment event ordering is stable.
* [x] Latest deployment per environment can be queried efficiently.
* [x] Idempotency prevents accidental duplicate submissions.
* [x] Terminal records set `completedAt` exactly once.
* [x] Store works in local and production database modes used by Market.

### 19.4 Runner correctness

* [x] Runner can claim `project:web_deployment` operations.
* [x] Runner ignores unrelated operation types unless configured otherwise.
* [x] Runner records preflight events.
* [x] Runner validates repository, workflow, host, environment, and credentials.
* [x] Runner supports mocked external execution.
* [x] Runner supports direct GitHub dispatch or explicit hosted-project orchestration strategy.
* [x] Runner records GitHub run id and URL when known.
* [x] Runner monitors workflow to terminal state.
* [x] Runner records checkpoints.
* [x] Runner supports cooperative cancellation.
* [x] Runner emits useful failure summaries.
* [x] Runner updates deployment and environment state.
* [x] Runner completes platform operation consistently with deployment state.
* [x] Runner never registers as a capacity provider.
* [x] Runner never requires provider lanes/grants/budgets.

### 19.5 SDK correctness

* [x] SDK exports deployment action/environment types.
* [x] SDK returns structured `ProjectPlatformActionResult` for `deploy_web`.
* [x] SDK returns structured `ProjectPlatformActionResult` for `publish_content`.
* [x] SDK returns structured monitor result for `monitor`.
* [x] SDK exposes GitHub dispatch helper.
* [x] SDK exposes GitHub wait/monitor helper.
* [x] SDK exposes GitHub cancellation helper or returns stable not-supported result.
* [x] SDK formats GitHub workflow failures with inspect command.
* [x] SDK normalizes Cloudflare/content/HTTP monitor checks.
* [x] SDK preserves web-only workflow boundaries.

### 19.6 UI correctness

* [x] Deploy page server-renders useful state without client JS.
* [x] Deploy page progressively polls active operations.
* [x] Deploy page renders launch panel.
* [x] Deploy page renders readiness checklist.
* [x] Deploy page renders action blockers.
* [x] Deploy page renders staging and production cards.
* [x] Deploy page renders timeline events semantically.
* [x] Deploy page renders deployment history.
* [x] Deploy page renders runner diagnostics.
* [x] Deploy page renders troubleshooting hints.
* [x] Production deploy/publish requires confirmation.
* [x] Sensitive unlock appears only when credential session is required.
* [x] UI does not expose raw secrets.
* [x] UI does not expose runner tokens.
* [x] UI does not expose capacity-provider controls.
* [x] UI remains keyboard accessible.
* [x] UI does not rely on color alone for status.

### 19.7 CLI correctness

* [x] `trsd projects deploy` works.
* [x] `trsd projects publish` works.
* [x] `trsd projects monitor` works.
* [x] `trsd projects deployments` works.
* [x] `trsd projects deployment` works.
* [x] `trsd projects deployment retry` works.
* [x] `trsd projects deployment resume` works or reports stable not-supported error.
* [x] `trsd projects deployment cancel` works.
* [x] `--wait` polls to terminal state.
* [x] `--json` returns machine-readable output.
* [x] `--yes` is required for production deploy/publish.
* [x] CLI uses stable exit codes.
* [x] CLI auth failure is clear.
* [x] CLI output matches UI/API state.

### 19.8 Monitoring correctness

* [x] Monitor checks latest workflow state.
* [x] Monitor checks workflow file presence.
* [x] Monitor checks web host readiness.
* [x] Monitor checks target URL presence.
* [x] Monitor performs bounded HTTP checks when safe.
* [x] Monitor records content publish status where relevant.
* [x] Monitor records D1 migration status where relevant.
* [x] Monitor records form/API route status where relevant.
* [x] Monitor distinguishes healthy/degraded/failed/unknown.
* [x] Monitor result is visible in UI/API/CLI.
* [x] Monitor failures include actionable inspect links/commands.

### 19.9 Launch integration correctness

* [x] Launch API response includes project id and deploy href.
* [x] Project creation redirects to Deploy page.
* [x] Deploy page shows launch progress.
* [x] Launch failure shows retry/resume/inspect options when available.
* [x] Existing launch job state is bridged into deployment-state response.
* [x] First deploy next action is obvious after launch completes.

### 19.10 Security, governance, and audit correctness

* [x] Project read permission is enforced.
* [x] Staging deploy/publish permission is enforced.
* [x] Production deploy/publish permission is enforced.
* [x] Monitor permission is enforced.
* [x] Retry/resume/cancel permission is enforced.
* [x] Production deploy/publish audit events are recorded.
* [x] Deployment request/success/failure/cancel audit events are recorded.
* [x] Audit payloads contain no secrets.
* [x] API/event payloads pass redaction helper before persistence.
* [x] Hosted web workflows contain no processing/capacity-provider secrets.

### 19.11 Verification and release readiness

* [x] API tests pass.
* [x] Store tests pass.
* [x] Runner tests pass.
* [x] SDK tests pass.
* [x] CLI tests pass.
* [x] UI/view-model tests pass.
* [x] Workflow template tests pass.
* [x] Security boundary tests pass.
* [x] Acceptance flow passes with mocked external providers.
* [x] Manual local runbook passes.
* [ ] One real external staging deploy is verified. Deferred blocker: provide a disposable project/repository/host target, GitHub credentials with workflow dispatch/read/cancel permission for that repository, Cloudflare credentials with the account and Pages/web-host target available, a target URL/domain when the host requires it, and the Market platform runner secret for the environment. Without those inputs, only mocked local acceptance is release-gating.
* [x] Docs are updated.
* [x] Demo runbook is updated.
* [x] Release notes are written.

---

## 20. First Implementation Slice

The first slice should produce a demoable end-to-end spine without real external side effects.

### 20.1 PR 1 — Contracts, schema, and read model

Deliverables:

1. Add deployment contracts and error envelope.
2. Add deployment store schema or map to existing equivalent records.
3. Add store methods for create/list/update/events/latest.
4. Add deployment projection and readiness helper.
5. Add route descriptors for new endpoints.

Tests:

```text
store tests
route descriptor tests
projection tests
```

Demo result:

```text
GET /deployment-state returns readiness, blockers, empty deployment history, and action availability.
```

### 20.2 PR 2 — Queue deployment operation

Deliverables:

1. Add `POST /v1/projects/:projectId/deployments/web`.
2. Add idempotency handling.
3. Add deployment record creation.
4. Add platform operation creation.
5. Add retry/cancel route stubs where unsupported states return stable errors.

Tests:

```text
API tests for validation, auth, blockers, idempotency, and operation creation
```

Demo result:

```text
CLI or curl can queue a staging deploy and see a queued deployment record.
```

### 20.3 PR 3 — Mock runner executor

Deliverables:

1. Register `project:web_deployment` executor.
2. Add runner command or npm script.
3. Add `--mock-external` execution path.
4. Emit events/checkpoints.
5. Mark deployment succeeded/failed based on mock result.

Tests:

```text
runner claim tests
operation event tests
mock success/failure tests
boundary tests proving no capacity-provider records
```

Demo result:

```text
A queued deployment can be claimed and completed locally without GitHub/Cloudflare.
```

### 20.4 PR 4 — Deploy page UI

Deliverables:

1. Add Deploy nav item.
2. Add `/app/projects/:projectId/deploy.astro`.
3. Render readiness, environment cards, action panel, active operation timeline, and history.
4. Wire staging deploy to the API.
5. Add polling for active operation.

Tests:

```text
UI/view-model tests
no-secret/no-capacity-provider rendering tests
accessibility-focused markup tests
```

Demo result:

```text
User can click Deploy staging and watch mocked operation complete in the UI.
```

### 20.5 PR 5 — CLI parity for first slice

Deliverables:

1. Add `trsd projects deploy`.
2. Add `trsd projects deployments`.
3. Add `trsd projects deployment`.
4. Add `--wait` and `--json`.

Tests:

```text
CLI parser tests
CLI API body tests
wait/poll tests
exit-code tests
```

Demo result:

```text
CLI can queue, wait for, and inspect the same mocked deployment shown in UI.
```

### 20.6 PR 6 — Real external dispatch and monitor

Deliverables:

1. Add GitHub dispatch helper.
2. Add GitHub workflow wait helper.
3. Add monitor checks.
4. Add production confirmation.
5. Add publish and monitor CLI/UI actions.

Tests:

```text
GitHub helper tests with mocked API
monitor normalization tests
production confirmation tests
workflow boundary tests
```

Demo result:

```text
One staging deploy can be run against a real disposable GitHub/Cloudflare target, or the blocker is explicit and actionable.
```

---

## 21. Architectural Rationale

This plan benefits TreeSeed’s knowledge-coop direction because deployment becomes part of the same governable operational memory chain as workdays, decisions, and knowledge artifacts.

A deployment is not just a button. It becomes a durable operational event connected to:

```text
project
repository
host
environment
workflow run
content publish
monitor result
operator action
audit trail
knowledge artifact or release
```

That gives TreeSeed the right long-term shape: open knowledge and capabilities can be launched, observed, remixed, and trusted through a traceable control loop rather than hidden infrastructure steps.
