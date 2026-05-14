# @treeseed/market

`@treeseed/market` is the canonical TreeSeed marketplace site and the top-level unified development workspace for the current TreeSeed system.

This repo is not just the market site. It can also act as the integration workspace for four freestanding package repositories mounted as git submodules:

- [`packages/sdk`](/home/adrian/Projects/treeseed/market/packages/sdk)
- [`packages/core`](/home/adrian/Projects/treeseed/market/packages/core)
- [`packages/cli`](/home/adrian/Projects/treeseed/market/packages/cli)

The goal is simple:

- building TreeSeed sites should be easy
- developing TreeSeed packages together should also be easy
- package authorship must still work cleanly from each standalone package repo

## Unified Agent Hosting

Treeseed now supports a split agent-hosting architecture:

- Cloudflare is the data and queue plane.
  - D1 is the canonical operational store.
  - Queues are the transient execution transport.
- Railway is the API and execution plane.
  - `manager` is an always-on coordinator that owns the work-day lifecycle and graph runtime.
  - `worker` is an always-on bounded execution process.
  - `workdayStart` and `workdayReport` are short-lived cron services.

The important operational consequence is that local and hybrid deployments still work:

- Cloudflare site + local manager on your laptop: supported
- Cloudflare site + local worker on your laptop: supported
- Railway manager + Railway worker: supported
- fully local development: still supported

The local hybrid path is first-class. The intended shape is:

```text
Cloudflare site + D1 + Queue
            ^
            |
    local or Railway services
      (manager / worker / cron)
```

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
```

The market site consumes the package runtime like a normal TreeSeed application. It is not an installable framework package for the CLI.

Important boundaries:

- `sdk` owns shared data-access and typed runtime helpers.
- `core` owns the integrated Treeseed runtime for Astro/Starlight sites, Hono API surfaces, agent and worker services, and integrated local dev orchestration.
- `cli` owns the `treeseed` command, scaffold/sync behavior, and CLI-facing template integration while delegating integrated runtime startup to `core`.
- the market site owns marketplace content, presentation, and eventually the remote template catalog API

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

### Agent Hosting Package Roles

- `sdk` owns the typed operational models, remote clients, queue client, and D1-backed state transitions.
- `core` owns the published Treeseed HTTP API runtime, the internal control-plane routes, and the integrated local platform startup flow.
- `agent` owns the Node service entrypoints for `manager`, `worker`, `workday-start`, and `workday-report`.
- `core` and the Treeseed deploy tooling own how these services are represented in `treeseed.site.yaml` and deploy state.

### Current Template Architecture

The template system is intentionally split:

- remote template availability and metadata are sourced from the market API endpoint, configured through the CLI machine config or `TREESEED_TEMPLATE_CATALOG_URL`
- CLI-local template artifacts remain the runtime source for scaffold and sync behavior
- tests in the CLI use a file fixture endpoint such as `file:./src/template-catalog/catalog.fixture.json`

That means:

- the market API is the source of truth for what templates exist
- the CLI package still ships the local template payloads it needs to create and reconcile tenant projects

## Repo Layout

Top-level workspace responsibilities:

- market site source: `src/`, `public/`, `migrations/`, `treeseed.site.yaml`
- unified workspace scripts: root `package.json`
- integration lockfile: root `package-lock.json`
- package submodules: `packages/*`
- integrated local process orchestration: `@treeseed/core` via `treeseed dev`

Submodule responsibilities:

- each package keeps its own `package.json`, `package-lock.json`, CI, release flow, and standalone README
- package publishing and standalone verification belong to the package repos, not to the root workspace

Read the package-level docs when you are working primarily inside one package:

- [SDK README](/home/adrian/Projects/treeseed/market/packages/sdk/README.md)
- [Core README](/home/adrian/Projects/treeseed/market/packages/core/README.md)
- [CLI README](/home/adrian/Projects/treeseed/market/packages/cli/README.md)

## Choose Your Workflow

### Registry Mode From The Root

Use registry mode when:

- you are developing the market site or a normal Treeseed tenant
- you do not need to edit `sdk`, `core`, `cli`, or `api`
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
- you are testing how the market site interacts with `core`, `cli`, or `sdk`
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

If you are working on the integrated worker hosting stack, also verify the package-local paths:

```bash
cd packages/sdk && npm run build && npm test
cd ../core && npm run verify
```

If you are contributing mainly to a package, also install in that package directly:

```bash
cd packages/cli
npm install
npm test
```

Use the root `npm install` as the bootstrap for whichever mode is active. Do not treat it as the authoritative package-publishing workflow for `sdk`, `core`, `cli`, or `api`.

## Daily Development

### Unified Workspace Commands

From the repo root:

```bash
npm install
treeseed status
treeseed config
treeseed switch feature/my-change --plan
treeseed switch feature/my-change --preview
treeseed dev
treeseed save "feat: describe your change"
treeseed stage "feat: describe the resolution"
treeseed release --patch
```

What they mean here:

- `npm install`: install root deps and run the root bootstrap/postinstall chain
- `treeseed status`: show project health, current branch/task, runtime readiness, preview state, package drift, workflow locks, and next commands
- `treeseed config`: configure and test the local/staging/production runtime foundation
- `treeseed switch`: create or resume a task branch from `staging`, mirroring checked-out package repos in the full workspace
- `treeseed dev`: run the local Cloudflare, API, and integrated worker runtime for iterative development
- `treeseed save`: recursively verify, commit, sync, and push dirty package repos before saving the market repo and refreshing the branch preview when enabled
- `treeseed stage`: squash-merge the task into package `staging` branches first, then market `staging`, wait for staging automation, archive the task tag, and clean up the task branches
- `treeseed release`: promote changed packages plus dependents first, then promote market `staging` to `main`, tag the release, and sync market production to package `main` heads

To abandon a task without merging it, run:

```bash
treeseed close "reason this task was closed"
```

`close` creates a resurrection tag at `deprecated/<slug>/<sha>` before deleting the branch. To resurrect it later:

```bash
git switch -c feature/my-change deprecated/<slug>/<sha>
```

Before any multi-repo mutation, use planning mode:

```bash
treeseed save --plan "feat: describe your change" --json
treeseed stage --plan "feat: describe the resolution" --json
treeseed release --patch --plan --json
```

If a recursive workflow is interrupted, inspect and resume it through the journaled interface instead of retrying blindly:

```bash
treeseed recover
treeseed resume <run-id>
```

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

### I Want To Change Worker Hosting Or Control Plane Behavior

Work from:

- [`packages/sdk`](/home/adrian/Projects/treeseed/market/packages/sdk)
- [`packages/core`](/home/adrian/Projects/treeseed/market/packages/core)

Recommended path:

```bash
cd packages/sdk && npm run build && npm test
cd ../core && npm run verify
```

Minimum verification:

- SDK build and tests pass
- Core API runtime build and tests pass
- Core worker entrypoints build and smoke cleanly
- if you changed process wiring, smoke the relevant service entrypoint locally

## Operator Workflows

### Local Agent Orchestration With Cloudflare Site

Use this when the site is deployed to Cloudflare and you want orchestration on your laptop.

Set these environment variables before starting the services:

- `TREESEED_AGENT_REPO_ROOT`
- `CLOUDFLARE_ACCOUNT_ID`
- `TREESEED_QUEUE_ID`
- `TREESEED_QUEUE_PUSH_TOKEN` or `CLOUDFLARE_API_TOKEN`
- `TREESEED_QUEUE_PULL_TOKEN` if you also want a local worker

Start a local worker:

```bash
cd packages/core
npm run dev:worker
```

Trigger the work day:

```bash
cd packages/core
npm run dev:workday-start
```

Produce a report at the end:

```bash
cd packages/core
npm run dev:workday-report
```

### Railway Deployment Shape

The intended managed-service mapping in `treeseed.site.yaml` is:

- `api`: Railway public/auth/admin API
- `worker`: Railway service
- `workdayStart`: Railway cron service
- `workdayReport`: Railway cron service

### Convenient Package Commands

`packages/core` now exposes the operational entrypoints directly:

- `npm run dev:worker`
- `npm run dev:workday-start`
- `npm run dev:workday-report`
- `npm run start:worker`
- `npm run start:workday-start`
- `npm run start:workday-report`

### I Want To Change Market-Site Rendering Or Content

Work from:

- repo root

Recommended path:

```bash
npm install
treeseed status
treeseed dev
treeseed save "feat: describe your change"
```

Minimum verification:

- `treeseed dev` starts
- `treeseed save "..."` passes verification before pushing
- run `npm run build` if you touched site structure or runtime integration

### I Want To Change Template Catalog Or Scaffold Behavior

Work from:

- [`packages/cli`](/home/adrian/Projects/treeseed/market/packages/cli) for scaffold/sync/runtime
- repo root or market API implementation for remote catalog behavior

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
