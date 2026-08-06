# TreeSeed Operations Runner

## Canonical role

The operations runner is an API-owned control-plane worker. It claims durable platform operations, invokes their SDK-owned reconciliation operations, checkpoints progress, and records verified results through the API/PostgreSQL operation lifecycle.

It is not a repository host, Git integration worker, content editor, capacity provider, provider manager, or agent runner. It must never clone, mirror, scaffold, commit, merge, or push project repositories. That older repository executor and its repository-claim lifecycle have been removed.

Current ownership:

- `packages/api/src/api/**` owns routes, authorization, durable operation state, runner health, and PostgreSQL persistence.
- `packages/api/src/operations-runner/**` owns the claim/checkpoint/complete loop and the bounded executor registry.
- `@treeseed/sdk` owns reconciliation contracts and provider adapters used by registered executors.
- `@treeseed/admin` and `@treeseed/cli` expose operation status and controls.

## Data segregation

The runner receives operation IDs and bounded inputs from the API. It may use a private operational scratch directory for logs, transient provider payloads, and checkpoints, but that directory is not a repository-custody domain. It must not contain Git repositories or be shared with developer, TreeDX, or capacity-provider storage.

Repository and content custody is split as follows:

- `trsd` owns developer checkouts and repository-track save, stage, and release workflows.
- TreeDX owns its own repository copies and content workspaces. TreeSeed content mutations use atomic TreeDX changesets; TreeDX commits and pushes those changes without `trsd save`.
- Capacity providers own mirrors and assignment-specific checkouts used by AgentKernel execution.
- The API stores operational assignments, leases, reservations, usage, settlements, and platform-operation records in PostgreSQL. It stores no Discussion history or content bodies there.

No service passes a writable filesystem path to another custody domain. Handoffs use repository identity, exact commit/ref, digests, changeset receipts, publication receipts, and typed artifact references.

## Registered work

The runner is appropriate for API-owned, non-agent control-plane operations such as:

- reconciled provider and service configuration;
- GitHub workflow/configuration operations through SDK reconciliation;
- content-publication orchestration using exact TreeDX/Git revisions and SDK R2 publication receipts;
- feedback retention and other API maintenance jobs;
- secret-management operations;
- Agent Lab orchestration and workday control-plane maintenance;
- diagnostics and readiness verification.

Repository mutation is not an operation-runner capability. New executors that need repository files must instead use TreeDX for content, a capacity-provider assignment checkout for agent work, or an explicit `trsd` repository workflow for developer work.

## Capacity boundary

In database-transport mode, the runner performs the API-owned capacity-workday maintenance sweep on a bounded interval. The sweep terminalizes elapsed verification runs, settles unfinished reservations exactly once, closes unfinished mode runs and assignments, and expires run-scoped grants. This is record maintenance only. The runner does not receive provider assignments or execute handlers.

`TREESEED_CAPACITY_WORKDAY_MAINTENANCE_INTERVAL_MS` controls the interval and defaults to 30 seconds.

## Runtime shape

The hosted API and operations runner are separate services built from `packages/api`:

```text
api
  startCommand: npm run start:api
  healthcheckPath: /healthz

operationsRunner
  startCommand: npm run start:runner
  healthcheckPath: /healthz
  runtimeMode: service
  operational scratch: /data
```

The `/data` mount is private operational storage, not repository storage. Local runtime uses `.treeseed/local-operations-runner/data` with the same restriction.

Useful diagnostics:

```bash
npm -w packages/api run dev:runner -- --market local --watch
npx trsd operations smoke --environment local --service operationsRunner --json
npx trsd operations smoke --environment staging --service operationsRunner --json
npx trsd hosting verify --environment staging --service operationsRunner --live --json
```

`operations smoke` verifies API health, database health, diagnostic operation creation, claim/checkpoint/completion, and event visibility. It does not validate repository access because the runner has none.

## Security invariants

- Runner credentials are scoped to the registered control-plane executors and are never committed to Git, TreeDX, Discussion events, or artifact references.
- Every provider mutation flows through SDK reconciliation and requires live postcondition verification.
- Operation outputs contain stable IDs, exact refs, digests, and secret-free receipts; they do not expose local paths or signed URLs.
- The runner cannot grant itself agent capacity, approve governance decisions, widen allocations, or bypass TreeDX path authorization.
- Hosted and local runners use the same executor contracts and custody boundaries.
