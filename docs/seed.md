# Environment Seed Reconciliation System Implementation Plan

## Purpose

Implement a first-class environment seed reconciliation system for the `treeseed/market` project so TreeSeed can define ready-made, deployable combinations of market teams, projects, repository mappings, products, and capacity providers as named manifests.

The system should support local development, staging, and production maintenance through a single declarative workflow:

```bash
trsd seed <seed-name> --environments <env[,env...]>
```

The initial goal is to add a `treeseed` seed that provisions the TreeSeed team, the market project, proof projects, project architecture bindings, development capacity providers, execution-provider limits, grants, work policies, repository hosts, and catalog products.

## Current Package Ownership

- `@treeseed/sdk` owns seed schema, validation, normalization, and shared contracts.
- `@treeseed/api` owns backend seed application into Treeseed PostgreSQL/control-plane state.
- `@treeseed/admin` may expose seed, catalog, and portfolio management surfaces.
- root `@treeseed/market` owns tenant content, public catalog messaging, and future marketplace policy.
- TreeDX may store and index repository-backed content, but it does not interpret Treeseed product semantics.

See [Package Ownership](./package-ownership.md) for the current package map.

---

## Goals

1. Add a `seeds/` directory to the market project.
2. Define one or more named seed manifests.
3. Add a `trsd seed` command that accepts a seed name and optional environment list.
4. Implement dry-run planning and idempotent apply behavior.
5. Use reconciliation semantics rather than one-shot insert scripts.
6. Support local development setup and production-safe maintenance.
7. Allow AI agents to propose seed changes and run safe seed plans under policy control.
8. Seed the TreeSeed portfolio so the UI contains the relevant teams, projects, products, capacity providers, grants, and repository relationships.

---

## Non-Goals

1. Do not expose raw database mutation scripts as the primary interface.
2. Do not let agents directly write production records without a plan, authorization, and audit trail.
3. Do not require every seed to include every resource type.
4. Do not store secrets directly in seed manifests.
5. Do not couple local seed data to production-only credentials.
6. Do not create duplicate records on repeated runs.

---

## Desired User Experience

### Basic local seed

```bash
trsd seed treeseed
```

Default behavior in local development:

* load `seeds/treeseed.yaml`
* target `local` unless the current runtime declares another default
* produce a plan
* apply automatically if local and no destructive changes are present
* print a concise summary of created, updated, unchanged, skipped, and failed resources

### Explicit environment selection

```bash
trsd seed treeseed --environments local,staging
```

Applies only resources that target `local` or `staging`.

### Production dry-run

```bash
trsd seed treeseed --environments prod --plan
```

Required before production apply. Produces a deterministic plan and exits without mutation.

### Production apply

```bash
trsd seed treeseed --environments prod --apply
```

Production apply should require:

* authenticated user or service identity
* required permissions
* explicit apply flag
* approval policy if invoked by an agent
* audit event creation

### Validation only

```bash
trsd seed treeseed --validate
```

Checks manifest shape, environment filters, resource references, duplicate keys, unresolved dependencies, and unsupported resource kinds.

---

## Proposed Directory Structure

Current backend seed application belongs in `packages/api`. The root Market app may keep UI-safe seed previews or projections, but it must not import the API package or write directly to Treeseed PostgreSQL.

```text
seeds/
  README.md
  treeseed.yaml
  local-dev.yaml
  demo-coop.yaml

packages/api/src/market/seeds/
  index.ts
  schema.ts
  loader.ts
  normalize.ts
  planner.ts
  apply.ts
  diff.ts
  references.ts
  errors.ts
  types.ts

packages/api/src/api/
  seed-routes.ts             # optional API extension routes

packages/cli/src/cli/handlers/
  seed.ts                    # if command lives in CLI package
```

If the command is implemented through the shared operation registry, add corresponding operation definitions in the SDK/CLI operation registry rather than making it a market-only script.

---

## Seed Manifest Format

Use YAML for human readability.

### Top-level shape

```yaml
name: treeseed
version: 1
description: TreeSeed platform development and operations portfolio

defaultEnvironments:
  - local

environments:
  - local
  - staging
  - prod

resources:
  teams: []
  repositoryHosts: []
  projects: []
  hubRepositories: []
  products: []
  capacityProviders: []
  capacityGrants: []
  workPolicies: []
  agentPools: []
```

### Environment targeting

Every resource should support an optional `environments` field.

```yaml
environments: [local, staging]
```

If omitted, the resource applies to all selected environments unless its type has stricter defaults.

### Stable identity keys

Every resource must have a stable identity key. The reconciler should use these keys for idempotency.

Examples:

```yaml
teams:
  - key: team:treeseed
    slug: treeseed
    displayName: TreeSeed
```

```yaml
projects:
  - key: project:treeseed/market
    team: team:treeseed
    slug: market
```

```yaml
capacityProviders:
  - key: capacity-provider:treeseed/local-dev
    team: team:treeseed
    name: treeseed-local-dev
```

Native-capacity providers declare execution providers and native limits directly. Humans enter facts they can forecast, such as wall minutes, USD, tokens, concurrency, reset cadence, quota visibility, and reserve buffers. Static provider credit budgets are compatibility data only.

```yaml
capacityProviders:
  - key: capacity-provider:treeseed/local-dev
    environments: [local]
    team: team:treeseed
    name: treeseed-local-dev
    kind: local
    provider: local
    billingScope: team
    creditBudgetMode: derived
    maxConcurrentWorkers: 4
    executionProviders:
      - id: treeseed-local-codex
        name: Local Codex capacity
        kind: codex_subscription
        nativeUnit: wall_minute
        quotaVisibility: opaque
        maxConcurrentWorkers: 4
        resetCadence: daily
        nativeLimits:
          - scope: daily
            nativeUnit: wall_minute
            limitAmount: 600
            reserveBufferPercent: 20
            resetCadence: daily
            confidence: estimated
            source: configured
```

---

## Initial `treeseed.yaml` Seed

The first canonical seed should create the TreeSeed self-development portfolio.

### Team

```yaml
teams:
  - key: team:treeseed
    slug: treeseed
    name: treeseed
    displayName: TreeSeed
    profileSummary: TreeSeed platform, market, SDK, CLI, core, and agent operations.
```

### Project Architecture Bindings

Seeds should describe projects with logical architecture instead of one required filesystem shape. A project source is the remote repository plus:

* `topology`: `single_repository_site`, `split_site_content`, or `parent_workspace`
* `rootPath`: repository-relative project root, defaulting to `.`
* `sitePath`: repository-relative site implementation path; Market uses `.`, first-party package projects use `docs`
* `contentPath`: optional repository-relative local content path
* `contentRuntimeSource`: `local_directory`, `treedx_snapshot`, `r2_published_manifest`, or `r2_preview_overlay`
* `localContentMaterialization`: `none`, `existing_path`, `managed_clone`, or `submodule`
* `contentPublishTarget`: durable content publication target, currently Cloudflare R2 for hosted content

Submodules are still supported, but only as one local materialization strategy. They must not be required for imported projects. Projects should be easy to create from templates and easy to import from live projects without restructuring.

`checkoutPath` and `submodulePath` remain compatibility fields for local development workspaces and existing package mounts. They do not define the canonical project source, and they must not replace the remote Git URL or the architecture fields.

### Projects

Projects must be seeded from remote sources with valid Git URLs. Local paths such as `.` or `packages/sdk` may be used only as local checkout or submodule mount metadata; they are not valid project source identities by themselves.

Each project repository definition should include:

* `gitUrl`: canonical clone URL, preferably HTTPS for portability
* `provider`: repository provider, such as `github`
* `owner`: remote owner or organization
* `name`: remote repository name
* `defaultBranch`: expected default branch
* `checkoutPath`: local development checkout path, when applicable
* `submodulePath`: compatibility path where the remote is mounted as a submodule, when applicable
* `role`: project repository role
* `architecture`: canonical project topology and path binding

```yaml
projects:
  - key: project:treeseed/market
    team: team:treeseed
    slug: market
    name: TreeSeed Market
    description: Top-level market application and control plane.
    kind: market_app
    repository:
      role: primary
      provider: github
      owner: treeseed
      name: market
      gitUrl: https://github.com/treeseed/market.git
      defaultBranch: main
      checkoutPath: .
    architecture:
      topology: single_repository_site
      rootPath: .
      sitePath: .
      contentRuntimeSource: r2_published_manifest
      localContentMaterialization: existing_path

  - key: project:treeseed/sdk
    team: team:treeseed
    slug: sdk
    name: TreeSeed SDK
    description: SDK package for platform operations and project automation.
    kind: package
    repository:
      role: package
      provider: github
      owner: treeseed
      name: sdk
      gitUrl: https://github.com/treeseed/sdk.git
      defaultBranch: main
      checkoutPath: packages/sdk
      submodulePath: packages/sdk
    architecture:
      topology: single_repository_site
      rootPath: .
      sitePath: docs
      contentRuntimeSource: r2_published_manifest
      localContentMaterialization: none

  - key: project:treeseed/core
    team: team:treeseed
    slug: core
    name: TreeSeed Core
    description: Core Knowledge Hub runtime, templates, and web platform package.
    kind: package
    repository:
      role: package
      provider: github
      owner: treeseed
      name: core
      gitUrl: https://github.com/treeseed/core.git
      defaultBranch: main
      checkoutPath: packages/core
      submodulePath: packages/core
    architecture:
      topology: single_repository_site
      rootPath: .
      sitePath: docs
      contentRuntimeSource: r2_published_manifest
      localContentMaterialization: none

  - key: project:treeseed/cli
    team: team:treeseed
    slug: cli
    name: TreeSeed CLI
    description: Command-line interface for TreeSeed operations.
    kind: package
    repository:
      role: package
      provider: github
      owner: treeseed
      name: cli
      gitUrl: https://github.com/treeseed/cli.git
      defaultBranch: main
      checkoutPath: packages/cli
      submodulePath: packages/cli
    architecture:
      topology: single_repository_site
      rootPath: .
      sitePath: docs
      contentRuntimeSource: r2_published_manifest
      localContentMaterialization: none

  - key: project:treeseed/agent
    team: team:treeseed
    slug: agent
    name: TreeSeed Agent
    description: Agent execution, workday orchestration, and processing runtime.
    kind: package
    repository:
      role: package
      provider: github
      owner: treeseed
      name: agent
      gitUrl: https://github.com/treeseed/agent.git
      defaultBranch: main
      checkoutPath: packages/agent
      submodulePath: packages/agent
    architecture:
      topology: single_repository_site
      rootPath: .
      sitePath: docs
      contentRuntimeSource: r2_published_manifest
      localContentMaterialization: none
```

### Capacity Providers

```yaml
capacityProviders:
  - key: capacity-provider:treeseed/local-dev
    environments: [local]
    team: team:treeseed
    name: treeseed-local-dev
    kind: local
    provider: local
    billingScope: team
    creditBudgetMode: derived
    maxConcurrentWorkdays: 2
    maxConcurrentWorkers: 4
    executionProviders:
      - id: treeseed-local-codex
        name: Local Codex capacity
        kind: codex_subscription
        nativeUnit: wall_minute
        quotaVisibility: opaque
        maxConcurrentWorkers: 4
        resetCadence: daily
        nativeLimits:
          - scope: daily
            nativeUnit: wall_minute
            limitAmount: 600
            reserveBufferPercent: 20
            resetCadence: daily
            confidence: estimated
            source: configured

  - key: capacity-provider:treeseed/production
    environments: [staging, prod]
    team: team:treeseed
    name: treeseed-production
    kind: managed
    provider: railway
    billingScope: team
    creditBudgetMode: derived
    maxConcurrentWorkdays: 2
    maxConcurrentWorkers: 8
    executionProviders:
      - id: treeseed-production-openrouter
        name: Production OpenRouter budget
        kind: openrouter
        nativeUnit: usd
        quotaVisibility: exact
        maxConcurrentWorkers: 8
        resetCadence: monthly
        nativeLimits:
          - scope: monthly
            nativeUnit: usd
            limitAmount: 75
            reserveBufferPercent: 10
            resetCadence: monthly
            confidence: exact
            source: configured
```

### Capacity Grants

```yaml
capacityGrants:
  - key: capacity-grant:treeseed/local/market
    environments: [local]
    provider: capacity-provider:treeseed/local-dev
    team: team:treeseed
    project: project:treeseed/market
    environment: local
    grantScope: project
    portfolioAllocationPercent: 50
    reservePoolPercent: 10
    priorityWeight: 1
    overflowPolicy: soft_grant

  - key: capacity-grant:treeseed/local/sdk
    environments: [local]
    provider: capacity-provider:treeseed/local-dev
    team: team:treeseed
    project: project:treeseed/sdk
    environment: local
    grantScope: project
    portfolioAllocationPercent: 6
    reservePoolPercent: 10
    priorityWeight: 1
    overflowPolicy: soft_grant

  - key: grant:treeseed/prod/market
    environments: [prod]
    provider: capacity-provider:treeseed/production
    team: team:treeseed
    project: project:treeseed/market
    grantScope: project
    portfolioAllocationPercent: 40
    reservePoolPercent: 10
    maxDailyProjectCredits: 2500
    priorityWeight: 10
    overflowPolicy: approval_required

  - key: grant:treeseed/prod/sdk
    environments: [prod]
    provider: capacity-provider:treeseed/production
    team: team:treeseed
    project: project:treeseed/sdk
    grantScope: project
    dailyCreditLimit: 1000
    monthlyCreditLimit: 10000
    priorityWeight: 6
    overflowPolicy: approval_required

  - key: grant:treeseed/prod/core
    environments: [prod]
    provider: capacity-provider:treeseed/production
    team: team:treeseed
    project: project:treeseed/core
    grantScope: project
    dailyCreditLimit: 1000
    monthlyCreditLimit: 10000
    priorityWeight: 6
    overflowPolicy: approval_required

  - key: grant:treeseed/prod/cli
    environments: [prod]
    provider: capacity-provider:treeseed/production
    team: team:treeseed
    project: project:treeseed/cli
    grantScope: project
    dailyCreditLimit: 500
    monthlyCreditLimit: 5000
    priorityWeight: 4
    overflowPolicy: approval_required

  - key: grant:treeseed/prod/agent
    environments: [prod]
    provider: capacity-provider:treeseed/production
    team: team:treeseed
    project: project:treeseed/agent
    grantScope: project
    dailyCreditLimit: 1000
    monthlyCreditLimit: 10000
    priorityWeight: 8
    overflowPolicy: approval_required
```

### Work Policies

Work policy `dailyCreditBudget` and queued-credit limits are governance caps for a project workday. They are not provider inventory. Capacity provider availability is seeded through `capacityProviders[].executionProviders[].nativeLimits[]` and converted to credits by the Market capacity model.

```yaml
workPolicies:
  - key: work-policy:treeseed/local/market
    environments: [local]
    project: project:treeseed/market
    environment: local
    enabled: true
    startCron: "0 9 * * 1-5"
    durationMinutes: 480
    maxRunners: 1
    maxWorkersPerRunner: 4
    dailyCreditBudget: 5000
    maxQueuedTasks: 100
    maxQueuedCredits: 10000

  - key: work-policy:treeseed/prod/market
    environments: [prod]
    project: project:treeseed/market
    environment: prod
    enabled: true
    startCron: "0 9 * * 1-5"
    durationMinutes: 480
    maxRunners: 1
    maxWorkersPerRunner: 4
    dailyCreditBudget: 2500
    maxQueuedTasks: 50
    maxQueuedCredits: 5000
```

---

## Reconciliation Model

The system should follow desired-state reconciliation:

```text
load manifest
  -> validate
  -> normalize
  -> resolve references
  -> read current state
  -> diff
  -> produce plan
  -> apply plan
  -> verify result
  -> write audit/report
```

### Plan actions

Supported actions:

* `create`
* `update`
* `unchanged`
* `skip`
* `delete` only if explicitly enabled in a later phase
* `error`

Deletion should not be part of v1 except for explicitly marked ephemeral local resources.

### Idempotency

Repeated runs must be safe.

The reconciler should rely on stable keys and natural unique constraints:

* team slug
* project team + slug
* provider team + name
* grant provider + team + project + environment
* work policy project + environment
* repository host team + provider + name
* hub repository hub + role

### Ownership marker

Records created by seeds should include metadata such as:

```json
{
  "seed": {
    "name": "treeseed",
    "resourceKey": "project:treeseed/market",
    "version": 1,
    "lastAppliedAt": "..."
  }
}
```

This allows safe future reconciliation and audit visibility.

---

## Schema and Validation

Implement a strict schema with clear errors.

Recommended files:

```text
packages/sdk/src/seeds/schema.ts
packages/sdk/src/seeds/types.ts
packages/sdk/src/seeds/errors.ts
packages/api/src/market/seeds/apply.js
```

Validation should catch:

* duplicate resource keys
* unsupported manifest version
* unknown environments
* invalid references
* missing required fields
* missing project repository `gitUrl`
* invalid project repository Git URLs
* repository metadata mismatches, such as `gitUrl` owner/name not matching `owner` and `name`
* local-only paths incorrectly used as project source identities
* incompatible resource/environment combinations
* secret-looking values in manifests
* unsupported destructive operations
* production apply without explicit mode

Use a runtime validator such as Zod if available in the project. Otherwise implement a small validation layer that returns structured diagnostics.

---

## CLI Implementation

Add:

```bash
trsd seed <name>
```

Options:

```text
--environments local,staging,prod
--plan
--apply
--validate
--json
--yes
--strict
--allow-destructive
```

### CLI behavior

1. Parse seed name and environment list.
2. Resolve market project root.
3. Load `seeds/<name>.yaml`.
4. Validate and normalize manifest.
5. Connect to target runtime/control plane.
6. Generate plan.
7. Print human-readable plan.
8. If `--apply`, apply plan.
9. Print summary and exit code.

### Exit codes

```text
0 success / no changes
1 validation error
2 plan contains blocked changes
3 apply failed
4 auth/permission failure
5 partial apply
```

---

## API / Operation Surface

Expose seed reconciliation as a controlled operation.

Possible endpoint:

```http
POST /v1/seeds/:name/plan
POST /v1/seeds/:name/apply
```

Request:

```json
{
  "environments": ["local", "prod"],
  "mode": "plan",
  "manifestRef": "seeds/treeseed.yaml"
}
```

Response:

```json
{
  "seed": "treeseed",
  "mode": "plan",
  "environments": ["prod"],
  "summary": {
    "create": 4,
    "update": 2,
    "unchanged": 12,
    "skip": 0,
    "error": 0
  },
  "actions": []
}
```

For production, the apply endpoint should require stronger authorization than local planning.

---

## Agent Integration

Agents should interact with the seed system at the operation level.

Allowed agent behaviors:

1. Inspect current seed manifests.
2. Propose changes to manifests.
3. Run validation.
4. Generate a plan.
5. Summarize the plan.
6. Request human approval for production apply.
7. Apply local development seeds when allowed by local policy.

Blocked or gated behaviors:

1. Production apply without approval.
2. Secret creation or secret value insertion from manifest.
3. Destructive changes without explicit approval.
4. Cross-team mutation outside granted scope.
5. Direct database writes bypassing the reconciler.

---

## Security and Secrets

Seed manifests must not contain raw secrets.

Allowed:

```yaml
credentialRef: env:TREESEED_RAILWAY_TOKEN
credentialRef: secret:treeseed/railway-production
credentialRef: provider-session:github-production
```

Disallowed:

```yaml
token: <raw provider token>
apiKey: <raw API key>
privateKey: <raw private key>
```

Validation should flag likely secrets.

Production credential attachment should use existing provider credential/session mechanisms or team host credential storage.

---

## Resource Reconciliation Details

### Teams

Reconcile by slug.

Create/update fields:

* slug
* name
* display name
* logo URL
* profile summary
* metadata

Do not delete teams in v1.

### Projects

Reconcile by team + slug.

Create/update fields:

* name
* description
* metadata
* project kind
* hosting configuration
* environment configuration
* canonical repository source
* repository provider
* repository owner
* repository name
* repository Git URL
* default branch
* topology
* root path
* site path
* content path
* content runtime source
* local content materialization
* content publish target
* checkout path
* submodule path

Project reconciliation must treat the remote Git URL as required source metadata. The canonical architecture fields describe how Treeseed should interpret the project without forcing a repository restructure. The local `checkoutPath` and `submodulePath` describe where the repository is mounted for development and worktree operations; they must not replace the remote source URL or become required for hosted deploy, seed import, content publish, or capacity-provider execution.

### Repository Hosts

Reconcile by team + provider + name.

Create/update fields:

* ownership
* account label
* organization/owner
* default visibility
* repository name templates
* branch policy
* workflow policy
* allowed project kinds
* status

Credentials must be references only.

### Hub Repositories / Project Repositories

Reconcile by project + role.

Create/update fields:

* provider
* owner
* name
* Git URL
* web URL
* default branch
* current branch
* checkout path
* submodule path
* access policy
* release policy
* publish policy
* project architecture role when the same repository supplies software, site, and content paths

For the TreeSeed seed, these should model the market repository and package repositories as remote Git sources with logical project architecture. Submodule paths may point to where those remotes are mounted inside the market checkout today, but the reconciler should still preserve the canonical remote `gitUrl` and architecture fields for cloning, validation, runner checkout, import, production automation, and future non-submodule workspaces.

### Capacity Providers

Reconcile by team + provider/name.

Create/update fields:

* kind
* status
* billing scope
* monthly credit budget
* daily credit budget
* max concurrent workdays
* max concurrent workers
* capacity model metadata

### Capacity Grants

Reconcile by provider + team + project + environment.

Create/update fields:

* grant scope
* daily/weekly/monthly limits
* USD limits
* quota limits
* priority weight
* overflow policy
* state

### Work Policies

Reconcile by project + environment.

Create/update fields:

* enabled
* start cron
* duration minutes
* max runners
* max workers per runner
* daily credit budget
* max queued tasks
* max queued credits
* autoscale policy
* credit weights

### Products / Catalog Items

Reconcile by team + kind + slug.

Create/update fields:

* title
* summary
* visibility
* listing enabled
* offer mode
* manifest/artifact keys
* metadata

This lets seeds create ready-made market offerings.

---

## Planner Output

Human-readable plan example:

```text
Seed: treeseed
Environments: local

CREATE team treeseed
CREATE project treeseed/market
CREATE project treeseed/api
CREATE project treeseed/treedx
CREATE project treeseed/sdk
CREATE project treeseed/ui
CREATE project treeseed/cli
CREATE project treeseed/core
CREATE project treeseed/admin
CREATE project treeseed/agent
CREATE capacity provider treeseed-local-dev
CREATE grant treeseed/local-dev -> treeseed portfolio
CREATE work policy treeseed portfolio/local
CREATE repository host github/treeseed-ai
CREATE repository host github/treeseed-ai
CREATE product template/treeseed-market
CREATE catalog artifact treeseed/market-template@1.0.0

Summary:
  create: 39
  update: 0
  unchanged: 0
  skipped: 2
  errors: 0
```

JSON output should expose the same plan for tests and agent use.

## Final Catalog And Repository Initialization Proof

The project architecture migration is complete only when the `treeseed` seed is integrated into the local control-plane data catalog and linked repositories can be initialized through platform operations.

Final proof requirements:

* `npx trsd seed treeseed --environments local --apply --yes --json` creates or updates the exact-nine TreeSeed portfolio: Market plus API, TreeDX, SDK, UI, CLI, Core, Admin, and Agent.
* The repeat seed plan is idempotent and contains no Karyon resources, stale `repositoryTopology`/`contentRoot` metadata, raw GitHub token values, or `TREESEED_GITHUB_TOKEN=` assignments.
* Products, catalog artifacts, repository hosts, projects, work policies, capacity grants, content-source bindings, and TreeDX/project bindings are queryable from the same store surfaces used by API, Admin, CLI, and tests.
* Project creation from templates shows the selected template, repository host requirements, and canonical architecture defaults without requiring repository restructuring.
* Linked repository initialization is queued through the API and executed by the Treeseed operations runner as `repository:initialize_linked_repository`.
* Imported repositories are adopted without file changes by default. Template-created repositories may write only explicit template scaffold files.
* The seed and repository initialization proof must not expose token values, passphrases, deploy keys, runner workspace paths, or API-decryptable customer secrets.

---

## Persistence and Audit

For every apply run, write an audit record or operational event containing:

* seed name
* seed version
* selected environments
* actor type
* actor ID
* started at
* completed at
* plan summary
* action count
* failures
* manifest hash

If a dedicated table is warranted later, add:

```sql
CREATE TABLE seed_runs (
  id TEXT PRIMARY KEY,
  seed_name TEXT NOT NULL,
  seed_version INTEGER NOT NULL,
  environments_json TEXT NOT NULL,
  mode TEXT NOT NULL,
  state TEXT NOT NULL,
  actor_type TEXT,
  actor_id TEXT,
  manifest_hash TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  result_json TEXT,
  error_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
```

For v1, existing audit/runtime records may be sufficient if they already cover operation execution.

---

## Tests

### Unit tests

Add tests for:

* manifest loading
* schema validation
* environment filtering
* reference resolution
* duplicate key detection
* secret detection
* normalized resource generation
* diff generation
* idempotent planning

### Integration tests

Add tests for:

* local `treeseed` seed plan
* local apply into test database
* repeated apply produces unchanged plan
* update manifest produces update plan
* project grants resolve provider/team/project references
* production apply blocked without explicit flag
* agent actor blocked from production apply without approval

### CLI tests

Add tests for:

```bash
trsd seed treeseed --validate
trsd seed treeseed --plan
trsd seed treeseed --environments local --apply
trsd seed treeseed --environments prod --plan
```

---

## Rollout Plan

### Phase 1: Manifest and planner

* Add `seeds/` directory.
* Add schema/types.
* Add loader and validator.
* Add normalization and environment filtering.
* Add plan-only diff for teams, projects, capacity providers, execution-provider limits, grants, and work policies.
* Add `trsd seed <name> --plan`.

Deliverable: deterministic plans from seed manifests.

### Phase 2: Local apply

* Implement apply for local/test database.
* Add idempotent upserts.
* Add metadata ownership markers.
* Add local `treeseed` seed.
* Add integration test proving repeated local apply is safe.

Deliverable: `trsd seed treeseed --environments local --apply` creates a ready local TreeSeed portfolio.

### Phase 3: Production-safe operation

* Add permission checks.
* Add audit records.
* Add production dry-run enforcement.
* Add approval gate for agent-driven production apply.
* Add JSON plan output for UI/agent review.

Deliverable: production seed maintenance is possible but governed.

### Phase 4: UI and agent workflow

* Add a UI surface showing seed plans and previous seed runs.
* Let agents propose seed manifest PRs.
* Let agents run validation and plan operations.
* Add approval workflow for production apply.

Deliverable: TreeSeed can maintain its own market development portfolio with human-governed agent support.

### Phase 5: Productized seed bundles

* Add additional seeds for demo teams, starter coops, template products, and partner scenarios.
* Support exporting a current team/project portfolio into a seed manifest.

Deliverable: ready-made deployable market bundles.

---

## Acceptance Criteria

1. `trsd seed treeseed --validate` succeeds.
2. Validation fails when any project repository is missing a valid remote `gitUrl`.
3. `trsd seed treeseed --environments local --plan` prints a deterministic plan.
4. `trsd seed treeseed --environments local --apply` creates the TreeSeed team and projects.
5. Re-running the same apply reports resources as unchanged.
6. The UI shows the TreeSeed team and projects after local seed apply.
7. Each seeded project shows its canonical remote Git source in project/repository details.
8. Capacity providers, execution-provider limits, grants, and work policies are present after apply.
9. Production apply is blocked unless explicitly requested and authorized.
10. Agents can run validation and plan operations.
11. Agents cannot apply production seeds without approval.
12. Seed-created resources include metadata linking them back to the seed resource key.

---

## Open Questions

1. Should the command be `trsd seed` or `treeseed seed` in packaged CLI surfaces?
2. Should seed manifests live only in the market repo, or can packages ship their own seed fragments?
3. Should production seed apply require a persisted approval request in v1?
4. Should destructive reconciliation ever be supported, or only create/update/disable?
5. Should there be a `trsd seed export` command to snapshot existing state into a manifest?
6. Should capacity provider credentials be attached during seed apply or handled as a separate host/credential setup flow?
7. How much of canonical project architecture should be represented directly in `projects` versus dedicated repository/content-source resource types?

---

## Recommended First PR

Build the smallest useful slice:

1. Add `seeds/treeseed.yaml` with team, projects using canonical remote Git URLs, local capacity provider, execution-provider limits, local grant, and local work policies.
2. Add seed schema and loader.
3. Add environment filtering.
4. Add plan generation only.
5. Add `trsd seed treeseed --environments local --plan`.
6. Add tests for validation, filtering, and plan output.

Then follow immediately with a second PR adding local apply and idempotent upserts.
