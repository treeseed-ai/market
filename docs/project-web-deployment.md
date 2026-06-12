# Project Web Deployment

Market web deployment is the operator path for launching, deploying, publishing, and monitoring a hosted project web surface. The implementation uses the existing project, host, repository, environment, platform operation, deployment, deployment event, runner, and audit records. It does not introduce a separate deployment system.

## Architecture

```text
Deploy page / CLI
  -> /v1/projects/:projectId/deployment-state
  -> /v1/projects/:projectId/deployments/web
  -> project_deployments + platform_operations
  -> Treeseed operations runner
  -> project_deployment_events + platform operation events
  -> deployment state, history, monitor result, audit_events
```

The API owns validation, readiness, idempotency, production confirmation, authorization, and audit request records. The Treeseed operations runner owns execution, checkpoints, deployment progress events, mocked or real workflow interaction, monitor checks, terminal deployment state, and terminal audit records.

The deployed API and runner live in `packages/api`, not in the root Market app. Admin deployment pages and view models live in `packages/admin`; reusable controls live in `@treeseed/ui`; CLI parity lives in `@treeseed/cli`; reconciliation logic lives in `@treeseed/sdk`. The root web app hosts the tenant, content, page overrides, and future ecommerce/business overlays.

See [Package Ownership](./package-ownership.md) for the current package map.

Hosted service shape:

```text
Cloudflare root web app
  -> /v1/* proxy
  -> Railway api service
       rootDir: packages/api
       buildCommand: npm run build
       startCommand: npm run start:api
  -> Railway operationsRunner service
       rootDir: packages/api
       buildCommand: npm run build
       startCommand: npm run start:runner
```

## Operator Flow

1. Configure repository and web hosts from `/app/hosts`.
2. Create or open a project from `/app/projects`.
3. Open `/app/projects/:projectId/deploy`.
4. Inspect launch progress, readiness blockers, runner status, staging and production cards, active operation timeline, monitor status, and deployment history.
5. Queue staging deploy, publish, or monitor actions from the page or CLI.
6. Use production deploy and publish only with the explicit confirmation control or CLI `--yes`.

Without JavaScript, the Deploy page still renders current state, blockers, latest deployments, monitor summaries, and history. With JavaScript, active operations poll progressively and refresh on terminal state.

## API Routes

Canonical project deployment routes:

```text
GET  /v1/projects/:projectId/deployment-state
GET  /v1/projects/:projectId/deployments
GET  /v1/projects/:projectId/deployments/:deploymentId
GET  /v1/projects/:projectId/deployments/:deploymentId/events
POST /v1/projects/:projectId/deployments/web
POST /v1/projects/:projectId/deployments/:deploymentId/retry
POST /v1/projects/:projectId/deployments/:deploymentId/resume
POST /v1/projects/:projectId/deployments/:deploymentId/cancel
```

`deploy_web`, `publish_content`, and `monitor` actions all create project-scoped deployment records. Deploy and publish actions queue a `project:web_deployment` platform operation; monitor actions use the same operation type and skip workflow dispatch in the runner.

## CLI Commands

Project deployment parity lives under `trsd projects`:

```bash
trsd projects deploy <project-id> --environment staging --market local --wait
trsd projects publish <project-id> --environment staging --market local --wait
trsd projects monitor <project-id> --environment staging --market local --wait
trsd projects deployments <project-id> --market local
trsd projects deployment <project-id> <deployment-id> --market local
trsd projects deployment retry <project-id> <deployment-id> --market local --wait
trsd projects deployment cancel <project-id> <deployment-id> --market local
```

Production deploy and publish require `--yes` before the CLI sends the API request.

## Hosted Readiness

Before using hosted deploy/publish workflows, run the fail-fast hosting checks:

```bash
npx trsd ready staging --json
npx trsd hosting plan --environment staging --service api --json
npx trsd hosting plan --environment staging --service operationsRunner --json
npx trsd hosting verify --environment staging --service api --live --json
npx trsd hosting verify --environment staging --service operationsRunner --live --json
npx trsd operations smoke --environment staging --service operationsRunner --json
```

`operations smoke` creates a diagnostic platform operation and verifies that the runner claims, checkpoints, and completes it. If this fails, do not run TreeDX bootstrap or project web deployment actions until the runner, database, or service credentials are repaired.

For targeted repair:

```bash
npx trsd hosting plan --environment staging --service operationsRunner --json
npx trsd hosting apply --environment staging --service operationsRunner --execute --json
```

## Local Development

From the Market repo root, `trsd dev` is the foreground local development surface. `trsd dev start` runs the same surface as a managed, worktree-scoped background instance. Both start the web UI, the API, a Treeseed-managed local PostgreSQL control-plane database, API migrations, and the Treeseed operations runner with `project:web_deployment` capability.

```bash
npx trsd dev start --web-runtime local --json
npx trsd dev status --json
npx trsd dev logs --follow
```

Non-provider local values have defaults and are centrally resolved through `trsd config`/local launch environment. Provider credentials such as GitHub and Cloudflare credentials remain explicit configuration values because they authorize real external side effects.

Use foreground `npx trsd dev --web-runtime local` when you want shell-owned lifecycle. Managed instances write `.treeseed/dev/instances/<scope>.json`, `.treeseed/dev/pids/<scope>.pid`, and `.treeseed/logs/dev-<scope>.jsonl` in the current worktree; `npx trsd dev status --all --json` discovers sibling worktree instances through the repository-family index. See [Worktree-Scoped Dev Instances](./local-dev-instances.md).

The stable standalone runner command remains available for focused acceptance and debugging:

```bash
npm -w packages/api run dev:runner -- --market local --watch --operation project:web_deployment --mock-external
npm -w packages/api run dev:runner -- --market local --once --operation project:web_deployment --mock-external
```

Use `--mock-external` for release acceptance. It exercises API, store, platform operation claim, checkpoints, deployment events, monitor output, audit records, UI polling, and CLI wait behavior without real GitHub or Cloudflare side effects.

## State Machine

Deployment records use the normalized statuses:

```text
queued -> claimed -> dispatching -> running -> monitoring -> succeeded
queued -> claimed -> dispatching/running/monitoring -> failed
queued/running -> cancelled
queued/running -> timed_out
```

Monitor-only deployments move through queued, claimed, monitoring, and a terminal state. Resume returns the stable not-supported shape until a safe checkpoint exists.

## Monitoring

Monitor results are stored on the deployment record and exposed through API, UI, and CLI. Checks normalize latest workflow state, workflow file presence, web host readiness, target URL presence, bounded HTTP probe status, content publish status, D1 migration status, and form/API route probes. Results are `healthy`, `degraded`, `failed`, or `unknown`; check statuses are `passed`, `warning`, `failed`, or `skipped`.

## Security And Audit

Deployment mutations use deployment governance rather than broad project management access. Staging deploy/publish requires staging release permission. Production deploy/publish requires publish permission plus explicit confirmation. Monitor creation is allowed to project-readable operators; retry, resume, and cancel require the matching environment admin level.

Audit events target `targetType: "project"` and include safe deployment fields only. Deployment events, audit payloads, and deployment JSON presentation fields pass through recursive redaction before persistence or display. Raw secrets, runner tokens, API keys, private keys, provider credentials, and capacity-provider/runtime fields are removed.

## Troubleshooting

Missing repository, host, workflow, runner heartbeat, launch state, and deployment history are explicit blockers or empty states, not server errors. For normal local development, start or reuse the integrated runtime once:

```bash
npx trsd dev status --json
npx trsd dev start --web-runtime local --json
```

For mocked acceptance outside the integrated dev supervisor, start the web/API runtime, seed local data, queue an action, and run:

```bash
npm -w packages/api run dev:runner -- --market local --once --operation project:web_deployment --mock-external
```

For real external staging proof, use only disposable GitHub and Cloudflare targets. If safe credentials or disposable targets are unavailable, record the blocker and keep mocked acceptance as the automated release gate.
