# @treeseed/market

`@treeseed/market` is the canonical TreeSeed marketplace site and the top-level unified development workspace for the current TreeSeed system.

This repo is not just the market site. It can also act as the integration workspace for the freestanding package repositories mounted as git submodules:

- [`packages/sdk`](/home/adrian/Projects/treeseed/market/packages/sdk)
- [`packages/core`](/home/adrian/Projects/treeseed/market/packages/core)
- [`packages/agent`](/home/adrian/Projects/treeseed/market/packages/agent)
- [`packages/api`](/home/adrian/Projects/treeseed/market/packages/api)
- [`packages/cli`](/home/adrian/Projects/treeseed/market/packages/cli)
- [`packages/treedx`](/home/adrian/Projects/treeseed/market/packages/treedx)

The goal is simple:

- building TreeSeed sites should be easy
- developing TreeSeed packages together should also be easy
- package authorship must still work cleanly from each standalone package repo

## Hosting And Runtime Architecture

Treeseed uses a strict split between the root Market web app and the separately deployed API backend package:

- the root Market repo owns the Astro web UI, knowledge hub, auth UI, management UI, Market UI, and HTTP proxy/client surfaces
- `packages/api` owns the API backend API, Treeseed PostgreSQL adapter, migrations, backend auth helpers, operation store, and Treeseed operations runner
- `packages/sdk` owns shared platform/config/hosting/readiness primitives
- `packages/core` owns integrated local dev orchestration and the Astro/Starlight starter runtime
- `packages/agent` owns capacity-provider runtime and container lifecycle
- `packages/treedx` owns the TreeDX implementation

Hosted Market services are configured from `treeseed.site.yaml`:

- Cloudflare is the web edge and static knowledge-hub plane.
  - D1 is limited to unauthenticated static knowledge-hub form/contact storage.
  - The root `/v1/*` route is a web proxy to the API, not the backend implementation.
- Railway hosts the API backend package.
  - `api`: root directory `packages/api`, build `npm run build`, start `npm run start:api`, health `/healthz`, runtime mode `serverless`.
  - `operationsRunner`: root directory `packages/api`, build `npm run build`, start `npm run start:runner`, health `/healthz`, runtime mode `service`, volume `/data`.
  - `treeseedDatabase`: Railway PostgreSQL, with `TREESEED_DATABASE_URL` targeted only to `api` and `operationsRunner`.

The operational shape is:

```text
Cloudflare web UI / knowledge hub
            |
      /v1/* HTTP proxy
            |
Railway packages/api API service
            |
 Railway Treeseed PostgreSQL
            |
Railway packages/api operations runner
            |
TreeDX bootstrap and provider workflows
```

Capacity-provider execution remains separate from the API split. Use the `trsd capacity ...` commands for provider lifecycle owned by `@treeseed/agent`.

## Capacity Provider Operations

The market UI includes two capacity operations surfaces:

- Team Capacity configures provider infrastructure, security codes, lanes, pooled grants, and project grants.
- Project Capacity is the dense project console for provider readiness, lane pressure, active reservations, routing decisions, learned estimate profiles, usage actuals, approval-required work, checkpointed interruptions, and manual budgeted work submission through the admitted `/v1/projects/:projectId/agent-tasks` path.

The project UI manages work through capacity providers. Provider infrastructure remains team-scoped, and the UI does not expose force-run actions that bypass capacity admission.

## Architecture

This workspace has two layers:

1. The market site at the repo root.
2. The standalone package repos in `packages/`.

The high-level package dependency graph is:

```text
sdk -> core
sdk -> cli
sdk -> api
sdk -> agent
core -> sdk
cli -> sdk + core
api -> sdk
agent -> sdk
```

The market site consumes the package runtime like a normal TreeSeed application. It is not an installable framework package for the CLI.

Important boundaries:

- `sdk` owns shared data-access, typed runtime helpers, hosting graph/readiness/live-check primitives, and SDK/core static-hub D1 form-storage schema.
- `api` owns the API backend API, Treeseed PostgreSQL store adapter, migrations, seeds that apply through the backend store, backend auth logic, operation lifecycle, route descriptors, and operations runner.
- `core` owns the integrated Treeseed runtime for Astro/Starlight sites and integrated local dev orchestration.
- `cli` owns the `treeseed` command, scaffold/sync behavior, and CLI-facing template integration while delegating integrated runtime startup to `core`.
- `agent` owns capacity-provider runtime, container assets, templates, and provider lifecycle behavior.
- the root Market site owns marketplace content, presentation, auth/management/market UI pages, and the `/v1/*` HTTP proxy only.

## Shared Fixture Model

The workspace uses `.fixtures/treeseed-fixtures` as the canonical integrated Treeseed project. That fixture is shared across `sdk`, `core`, and `cli`.

Important consequences:

- packages must adapt to the shared fixture, not rewrite it
- package verification is still package-scoped even when the fixture is integrated
- fixture-time shims or package injection do not imply package ownership or dependency coupling
- `core` can validate the shared Astro site against a narrow Core agent-contract shim without reviving a separate agent runtime package

SDK owns the shared fixture support utilities and the canonical package-injection model used during isolated package verification.

Read [AGENTS.md](./AGENTS.md) for the current shared fixture contract and workspace development rules.

## Graph-First Context Retrieval

The SDK graph runtime now supports graph-first AI context retrieval over MDX content:

- MDX files remain the canonical authored node
- section nodes are indexed as first-class retrieval targets
- frontmatter can declare stable `id` values plus typed graph relationships such as `related`, `dependsOn`, `implements`, `supersedes`, and `about`
- search is used to find starting nodes; graph traversal is used to assemble deterministic context

The preferred SDK graph workflow is:

- `parseGraphDsl`
- `queryGraph`
- `buildContextPack`

Lower-level graph primitives such as `searchFiles`, `searchSections`, `getNeighbors`, and `getSubgraph` still exist, but they are now considered advanced tools rather than the primary public graph story.

The SDK surface hierarchy is:

- `AgentSdk`: main public SDK
- `ScopedAgentSdk`: operational wrapper for permission-enforced agent execution
- `ContentGraphRuntime`: advanced graph runtime

The public graph-query syntax is now the `ctx` command language. Example:

```text
ctx "market architecture" for plan in /knowledge via related,references depth 1 budget 600 as brief
```

Full documentation:

- [SDK Interface Reference](./src/content/knowledge/sdk/interface-reference.mdx)
- [Graph API Guide](./src/content/knowledge/sdk/graph-api-guide.mdx)
- [ctx Query Language](./src/content/knowledge/sdk/ctx-query-language.mdx)
- [How ctx Works](./src/content/knowledge/sdk/ctx-query-engine.mdx)

### Runtime Package Roles

- `sdk` owns typed operational models, remote clients, hosting graph compilation, deployment readiness checks, live hosted-service checks, runner smoke helpers, and static-hub D1 form-storage contracts.
- `api` owns the deployed API and Treeseed operations runner entrypoints.
- `core` owns the integrated local platform startup flow and web runtime integration.
- `agent` owns capacity-provider runtime entrypoints and provider images.
- `cli` exposes the operator workflow commands that coordinate these package-owned capabilities.

### Current Template Architecture

The template system is intentionally split:

- remote template availability and metadata are sourced from the API endpoint, configured through the CLI machine config or `TREESEED_TEMPLATE_CATALOG_URL`
- CLI-local template artifacts remain the runtime source for scaffold and sync behavior
- tests in the CLI use a file fixture endpoint such as `file:./src/template-catalog/catalog.fixture.json`

That means:

- the API is the source of truth for what templates exist
- the CLI package still ships the local template payloads it needs to create and reconcile tenant projects

## Repo Layout

Top-level workspace responsibilities:

- market web source: `src/`, `public/`, `treeseed.site.yaml`
- Drizzle migration artifacts: `packages/sdk/drizzle/market` for Treeseed PostgreSQL and `packages/sdk/drizzle/d1` for SDK/Core static-hub D1 form storage
- unified workspace scripts: root `package.json`
- integration lockfile: root `package-lock.json`
- package submodules: `packages/*`
- integrated local process orchestration: `@treeseed/core` via `npx trsd dev`

Submodule responsibilities:

- each package keeps its own `package.json`, `package-lock.json`, CI, release flow, and standalone README
- package publishing and standalone verification belong to the package repos, not to the root workspace

Read the package-level docs when you are working primarily inside one package:

- [SDK README](/home/adrian/Projects/treeseed/market/packages/sdk/README.md)
- [Core README](/home/adrian/Projects/treeseed/market/packages/core/README.md)
- [Agent README](/home/adrian/Projects/treeseed/market/packages/agent/README.md)
- [API README](/home/adrian/Projects/treeseed/market/packages/api/README.md)
- [CLI README](/home/adrian/Projects/treeseed/market/packages/cli/README.md)

## Choose Your Workflow

### Registry Mode From The Root

Use registry mode when:

- you are developing the market site or a normal Treeseed tenant
- you do not need to edit `sdk`, `core`, `agent`, `api`, `cli`, or `treedx`
- you want root commands to use published `@treeseed/*` packages from npm

This is the default plain-clone path. Do not initialize submodules:

```bash
git clone git@github.com:treeseed-ai/market.git
cd market
npm install
```

The root bootstrap will print `Treeseed bootstrap mode: registry` and skip local `packages/*` builds.

### Workspace Mode From The Root

Use workspace mode when:

- you are changing behavior across multiple packages
- you are testing how the market site interacts with `core`, `cli`, `sdk`, `api`, `agent`, or `treedx`
- you want a single checkout with all package repos mounted in place

This is the integrated system path. Initialize all Treeseed package submodules before installing:

```bash
git clone git@github.com:treeseed-ai/market.git
cd market
git submodule update --init --recursive
npm install
```

The root bootstrap will print `Treeseed bootstrap mode: workspace`, build the local packages, and run the Starlight patch through the local CLI build.

### Standalone Package Development From `packages/*`

Use the package root when:

- you are primarily changing one package
- you want the package’s own install/build/test/release flow
- you are validating what CI or npm publishing will actually do for that package

This is the best path for package authorship and publish readiness.

## Onboarding And Setup

Requirements:

- Node `>=22`
- npm `>=11`
- git with submodule support

For normal market-site development, clone and install without submodules:

```bash
git clone git@github.com:treeseed-ai/market.git
cd market
npm install
```

For integrated package development, initialize submodules before installing:

```bash
git submodule update --init --recursive
npm install
```

Recommended first commands:

```bash
npm run test:unit
npm run check
```

If you are working on the integrated hosting stack, also verify the package-local paths you touched:

```bash
npm -w packages/sdk run verify:local
npm -w packages/core run verify:local
npm -w packages/api run verify:local
npm -w packages/cli run verify:local
```

If you are contributing mainly to a package, also install in that package directly:

```bash
cd packages/cli
npm install
npm test
```

Use the root `npm install` as the bootstrap for whichever mode is active. Do not treat it as the authoritative package-publishing workflow for `sdk`, `core`, `agent`, `api`, `cli`, or `treedx`.

## Daily Development

### Unified Workspace Commands

From the repo root:

```bash
npm install
npx trsd status --json
npx trsd ready local --json
npx trsd config --environment staging --preflight --json
npx trsd switch feature/my-change --plan --json
npx trsd dev start --web-runtime local --json
npx trsd save --verify local --json "feat: describe your change"
npx trsd stage --plan --json "feat: describe the resolution"
npx trsd stage --verify-deployed-resources --json "feat: describe the resolution"
npx trsd release --patch --verify-deployed-resources --plan --json
```

What they mean here:

- `npm install`: install root deps and run the root bootstrap/postinstall chain
- `trsd status`: show project health, current branch/task, runtime readiness, preview state, package drift, workflow locks, and next commands
- `trsd ready`: run the fail-fast readiness report before spending time on hosted deploys
- `trsd config`: configure and test the local/staging/production runtime foundation
- `trsd switch`: create or resume a task branch from `staging`, mirroring checked-out package repos in the full workspace
- `trsd dev`: run the local web/API/control-plane runtime as a foreground supervisor
- `trsd dev start`: run the same runtime as a worktree-scoped managed background instance with stable state, ports, URLs, PIDs, and logs
- `trsd save`: recursively verify, commit, sync, and push dirty package repos before saving the market repo; local verification can reuse the successful verification cache
- `trsd stage`: run readiness checks, merge the task into package `staging` branches first, then market `staging`, wait for staging automation, and optionally enforce live hosted checks
- `trsd release`: run readiness checks before version bumps, promote changed packages plus dependents, then promote market `staging` to `main`, tag the release, and optionally enforce live hosted checks

To abandon a task without merging it, run:

```bash
npx trsd close "reason this task was closed" --json
```

`close` creates a resurrection tag at `deprecated/<slug>/<sha>` before deleting the branch. To resurrect it later:

```bash
git switch -c feature/my-change deprecated/<slug>/<sha>
```

Before any multi-repo mutation, use planning mode:

```bash
npx trsd save --plan --json "feat: describe your change"
npx trsd stage --plan --json "feat: describe the resolution"
npx trsd release --patch --plan --json
```

If a recursive workflow is interrupted, inspect and resume it through the journaled interface instead of retrying blindly:

```bash
npx trsd recover --json
npx trsd resume <run-id> --json
```

### Fail-Fast Hosted Verification

Use these commands before expensive staging or release attempts:

```bash
npx trsd ready staging --json
npx trsd hosting plan --environment staging --service api --json
npx trsd hosting plan --environment staging --service operationsRunner --json
npx trsd hosting verify --environment staging --service api --live --json
npx trsd hosting verify --environment staging --service operationsRunner --live --json
npx trsd operations smoke --environment staging --service operationsRunner --json
```

Rules of thumb:

- `ready local` is the fastest preflight and does not require provider credentials.
- `ready staging` and `ready prod` default to stricter live checks when provider credentials are available.
- `stage --verify-deployed-resources` and `release --verify-deployed-resources` block on failed required Railway, Cloudflare, HTTP, database, and runner checks.
- `hosting apply --environment <env> --service <id> --execute --json` is the targeted repair path for one service; use a plan first.
- `operations smoke` proves the Treeseed operations runner can claim and complete a diagnostic operation before TreeDX bootstrap waits.
- TreeDX bootstrap fails fast when a provisioning operation remains queued past the grace window, instead of waiting through a long unclaimed-operation timeout.
- Never run a second `release --minor` after a minor release attempt has created version bumps or tags. Resume the recorded run, or use `release --patch` after repairs.

### Local Dev Instances

Use `npx trsd dev` when you want the existing foreground supervisor in your current shell. Use managed subcommands when a local server should be discoverable to humans and agents across terminals:

```bash
npx trsd dev start --web-runtime local --json
npx trsd dev status --json
npx trsd dev status --all --json
npx trsd dev logs --follow
npx trsd dev stop --json
npx trsd dev restart --web-runtime local --json
```

Managed dev instances are scoped to the physical git worktree. Each worktree writes authoritative state under `.treeseed/dev/instances`, PID files under `.treeseed/dev/pids`, and logs under `.treeseed/logs`. A repository-family index under the git common dir lets agents discover sibling worktree instances without making that index authoritative.

Main, staging, and feature worktrees can run at the same time. The first worktree uses the familiar local ports when free; additional worktrees receive stable alternate port blocks and worktree-specific local PostgreSQL/Mailpit service names. `--force` replaces only the current worktree instance, while `--force-conflicts` is the explicit cross-worktree escape hatch for port owners.

See [Worktree-Scoped Dev Instances](./docs/local-dev-instances.md) for the full architecture and agent workflow.

### Package-Local Commands

Run these from the relevant package root when you are working mainly inside that package:

```bash
cd packages/sdk && npm install && npm run build && npm test
cd packages/core && npm install && npm run verify
cd packages/cli && npm install && npm test
```

Those package-local flows are the canonical behavior for standalone package development.

## Easy Paths

### I Want To Change CLI Behavior

Work from:

- [`packages/cli`](/home/adrian/Projects/treeseed/market/packages/cli)

Recommended path:

```bash
cd packages/cli
npm install
npm run build
npm test
```

Minimum verification:

- rebuild CLI dist
- run CLI tests
- if template behavior changed, run `npm run test:templates`

### I Want To Change SDK Or Core Runtime Behavior

Work from:

- [`packages/sdk`](/home/adrian/Projects/treeseed/market/packages/sdk)
- [`packages/core`](/home/adrian/Projects/treeseed/market/packages/core)

Recommended path:

```bash
cd packages/sdk
npm install
npm run build
npm test

cd ../core
npm install
npm run verify
```

Minimum verification:

- SDK build plus SDK tests
- Core `build:dist`
- Core verify path when changing exported runtime behavior

### I Want To Change Hosting Or Market Control Plane Behavior

Work from:

- [`packages/sdk`](/home/adrian/Projects/treeseed/market/packages/sdk)
- [`packages/core`](/home/adrian/Projects/treeseed/market/packages/core)
- [`packages/api`](/home/adrian/Projects/treeseed/market/packages/api)
- [`packages/cli`](/home/adrian/Projects/treeseed/market/packages/cli)

Recommended path:

```bash
npm -w packages/sdk run verify:local
npm -w packages/core run verify:local
npm -w packages/api run verify:local
npm -w packages/cli run verify:local
npx trsd ready local --json
```

Minimum verification:

- SDK hosting/readiness tests pass
- API package build, unit tests, and release verification pass
- Core local dev plan starts API and runner from `packages/api`
- CLI command/help tests cover changed operator surfaces
- hosted changes have a `trsd hosting plan` for the affected service before staging

## Operator Workflows

### Local API And Runner Development

Use this when you need the web UI, API, local Treeseed PostgreSQL, and Treeseed operations runner on your laptop.

The integrated dev supervisor starts the API and runner from `packages/api`:

```bash
npx trsd dev start --web-runtime local --json
npx trsd dev status --json
npx trsd dev logs --follow
npx trsd dev stop --json
```

For focused backend debugging:

```bash
npm -w packages/api run dev:api
npm -w packages/api run dev:runner -- --market local --watch --operation project:web_deployment --mock-external
```

### Railway Deployment Shape

The intended managed-service mapping in `treeseed.site.yaml` is:

- `api`: Railway service built from `packages/api`, `npm run build`, `npm run start:api`, health `/healthz`
- `operationsRunner`: Railway service built from `packages/api`, `npm run build`, `npm run start:runner`, health `/healthz`, volume `/data`
- `treeseedDatabase`: Railway PostgreSQL service with `TREESEED_DATABASE_URL` targeted to `api` and `operationsRunner`

### Convenient Package Commands

`packages/api` exposes the API backend entrypoints directly:

- `npm run dev:api`
- `npm run dev:runner`
- `npm run start:api`
- `npm run start:runner`
- `npm run db:migrate`
- `npm run test:acceptance`

### I Want To Change Market-Site Rendering Or Content

Work from:

- repo root

Recommended path:

```bash
npm install
npx trsd status --json
npx trsd dev start --web-runtime local --json
npx trsd save --verify local --json "feat: describe your change"
```

Minimum verification:

- `npx trsd dev start --web-runtime local --json` starts, or `npx trsd dev --web-runtime local` starts when you need foreground supervision
- `npx trsd save --verify local --json "..."` passes verification before pushing
- run `npm run build` if you touched site structure or runtime integration

### I Want To Change Template Catalog Or Scaffold Behavior

Work from:

- [`packages/cli`](/home/adrian/Projects/treeseed/market/packages/cli) for scaffold/sync/runtime
- `packages/api` for remote catalog/API behavior

Recommended path for CLI-side work:

```bash
cd packages/cli
npm install
TREESEED_TEMPLATE_CATALOG_URL=file:./src/template-catalog/catalog.fixture.json npm run test:templates
TREESEED_TEMPLATE_CATALOG_URL=file:./src/template-catalog/catalog.fixture.json node ./scripts/run-ts.mjs ./scripts/template-command.ts list
```

Minimum verification:

- template validation passes
- template listing resolves through the configured endpoint
- if scaffold assets changed, run the scaffold smoke path as appropriate

## Known npm / Workspace Quirks

### Root `postinstall` Selects Registry Or Workspace Mode

The root `postinstall` runs the reusable workspace bootstrap shipped by `@treeseed/core` at `node_modules/@treeseed/core/dist/scripts/workspace-bootstrap.js`. The core bootstrap detects whether all Treeseed package submodules are checked out.

In registry mode, the bootstrap:

1. uses published `@treeseed/*` packages from `node_modules`
2. skips local `packages/*` builds
3. runs the Starlight patch through the installed Treeseed CLI

In workspace mode, the bootstrap:

1. builds `sdk`
2. builds `core`
3. builds `agent`
4. builds `api`
5. builds `cli`
6. runs the CLI Starlight patch step for the market site

If only some Treeseed package submodules are checked out, the bootstrap fails with a targeted message. Fix it by either initializing all submodules or removing the partial checkout and using registry mode.

### Root `npm install` Is Mode-Aware

The root install path is valid in both modes:

- registry mode is best for normal market-site or tenant development
- workspace mode is best for package/core development
- the committed root lockfile is registry-oriented so plain clones do not depend on submodule paths
- workspace mode links checked-out `packages/*` into `node_modules/@treeseed/*` during bootstrap
- package-local `npm install` and build/test flows remain authoritative for package authorship

If root install behaves differently from package install, trust the package-local workflow first for the package repo you are editing.

If you only need to refresh the root lockfile without running the full bootstrap chain, prefer:

```bash
npm install --package-lock-only --ignore-scripts
```

### Workspace Lockfiles vs Package Lockfiles

There are multiple lockfile scopes on purpose:

- root `package-lock.json`: the unified workspace lockfile
- `packages/*/package-lock.json`: standalone package lockfiles for those package repos

Do not assume one lockfile replaces the others.

### Submodule Boundaries Matter

The directories under `packages/` are separate git repositories.

Practical consequence:

- editing a file under `packages/cli` changes the CLI repo
- editing a file at the root changes the market repo
- commits may need to happen inside the package repo and then at the root repo to update submodule pointers

Always check both:

```bash
git status
cd packages/cli && git status
```

## Troubleshooting

### Submodules Are Missing Or Empty

Symptom:

- package dirs exist but are incomplete
- package installs or builds fail immediately

Fix:

```bash
git submodule update --init --recursive
```

### Root Install Fails But Package Install Works

Interpretation:

- the integrated bootstrap path is failing
- the standalone package path may still be healthy

Fix path:

1. run the install and verification flow from the affected package root
2. rebuild the needed package locally
3. rerun only the root command you actually need

### `dist/` Outputs Are Missing Or Stale

Symptom:

- import errors against built package paths
- CLI or site commands failing after install or branch changes

Fix:

```bash
cd packages/sdk && npm run build:dist
cd ../core && npm run build:dist
cd ../agent && npm run build:dist
cd ../cli && npm run build:dist
```

### Fixture Or Submodule Expectations Fail

Some package flows assume their own package fixtures or submodules are initialized. This is especially relevant in `core` and package-level smoke tests.

If a package test mentions fixtures, use the package README for that repo and verify its submodules or fixture checkout state from the package root.

### Template Catalog Development Behaves Differently Online vs Offline

Remember the split:

- remote metadata comes from the configured endpoint
- local scaffold assets live in the CLI package

Useful development override:

```bash
TREESEED_TEMPLATE_CATALOG_URL=file:./src/template-catalog/catalog.fixture.json
```

The CLI also caches successful remote catalog responses locally. If you suspect stale metadata, clear the local Treeseed cache in your test environment and rerun the command with the endpoint you expect.

## Process Guidance

The simplest rule is:

- use the root workspace to develop the unified system
- use the package root to develop a package as a package

If a workflow feels harder than building a normal TreeSeed site, treat that as a bug in the development process and document or fix it. The system should be easy both for downstream site builders and for maintainers working across `sdk`, `core`, `cli`, `agent`, and the market site together.
