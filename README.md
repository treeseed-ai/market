# @treeseed/market

`@treeseed/market` is the canonical TreeSeed marketplace site and the top-level unified development workspace for the current TreeSeed system.

This repo is not just the market site. It is also the integration workspace for four freestanding package repositories mounted as git submodules:

- [`packages/sdk`](/home/adrian/Projects/treeseed/market/packages/sdk)
- [`packages/core`](/home/adrian/Projects/treeseed/market/packages/core)
- [`packages/cli`](/home/adrian/Projects/treeseed/market/packages/cli)
- [`packages/agent`](/home/adrian/Projects/treeseed/market/packages/agent)

The goal is simple:

- building TreeSeed sites should be easy
- developing TreeSeed packages together should also be easy
- package authorship must still work cleanly from each standalone package repo

## Unified Agent Hosting

Treeseed now supports a split agent-hosting architecture:

- Cloudflare is the control and data plane.
  - D1 is the canonical operational store.
  - Queues are the transient execution transport.
  - one gateway Worker owns authenticated D1 writes and producer-side queue enqueueing.
- Railway is the execution plane.
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
Cloudflare site + gateway Worker + D1 + Queue
                    ^
                    |
             local laptop manager
                    |
             optional local worker
```

## Architecture

This workspace has two layers:

1. The market site at the repo root.
2. The standalone package repos in `packages/`.

The high-level package dependency graph is:

```text
sdk -> core -> cli
          -> agent
```

The market site consumes the package runtime like a normal TreeSeed application. It is not an installable framework package for the CLI.

Important boundaries:

- `sdk` owns shared data-access and typed runtime helpers.
- `core` owns the Treeseed runtime for Astro/Starlight sites.
- `cli` owns the `treeseed` command, scaffold/sync behavior, and CLI-facing template integration.
- `agent` owns the agent runtime and `treeseed-agents`.
- the market site owns marketplace content, presentation, and eventually the remote template catalog API

### Agent Hosting Package Roles

- `sdk` owns the typed operational models, gateway client, queue client, and D1-backed state transitions.
- `api` owns both the public Treeseed HTTP API and the private Cloudflare gateway app.
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

Submodule responsibilities:

- each package keeps its own `package.json`, `package-lock.json`, CI, release flow, and standalone README
- package publishing and standalone verification belong to the package repos, not to the root workspace

Read the package-level docs when you are working primarily inside one package:

- [SDK README](/home/adrian/Projects/treeseed/market/packages/sdk/README.md)
- [Core README](/home/adrian/Projects/treeseed/market/packages/core/README.md)
- [CLI README](/home/adrian/Projects/treeseed/market/packages/cli/README.md)
- [Agent README](/home/adrian/Projects/treeseed/market/packages/agent/README.md)

## Choose Your Workflow

### Unified Development From The Root

Use the root workspace when:

- you are changing behavior across multiple packages
- you are testing how the market site interacts with `core`, `cli`, `sdk`, or `agent`
- you want a single checkout with all package repos mounted in place

This is the best path for integrated system work.

### Standalone Package Development From `packages/*`

Use the package root when:

- you are primarily changing one package
- you want the package’s own install/build/test/release flow
- you are validating what CI or npm publishing will actually do for that package

This is the best path for package authorship and publish readiness.

## Onboarding And Setup

Requirements:

- Node `>=20`
- npm `>=11`
- git with submodule support

Clone and initialize the workspace:

```bash
git clone git@github.com:treeseed-ai/market.git
cd market
git submodule update --init --recursive
```

Recommended first commands:

```bash
npm install
npm run test:unit
npm run check
```

If you are working on the agent hosting stack, also verify the package-local paths:

```bash
cd packages/sdk && npm run build && npm test
cd ../api && npm run build && npm test
cd ../agent && npm run build
```

If you are contributing mainly to a package, also install in that package directly:

```bash
cd packages/cli
npm install
npm test
```

Use the root `npm install` as a convenience bootstrap for integrated development. Do not treat it as the authoritative package-publishing workflow for `sdk`, `core`, `cli`, or `agent`.

## Daily Development

### Unified Workspace Commands

From the repo root:

```bash
npm install
npm run dev
npm run check
npm run build
npm run test:unit
```

What they mean here:

- `npm install`: install root deps and run the root bootstrap/postinstall chain
- `npm run dev`: run the market site through the installed Treeseed CLI
- `npm run check`: run Treeseed site checks for the market app
- `npm run build`: build the market app
- `npm run test:unit`: run root vitest coverage for the market site

### Package-Local Commands

Run these from the relevant package root when you are working mainly inside that package:

```bash
cd packages/sdk && npm install && npm run build && npm test
cd packages/core && npm install && npm run verify
cd packages/cli && npm install && npm test
cd packages/agent && npm install && npm run release:verify
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

### I Want To Change Agent Hosting Or Control Plane Behavior

Work from:

- [`packages/sdk`](/home/adrian/Projects/treeseed/market/packages/sdk)
- [`packages/api`](/home/adrian/Projects/treeseed/market/packages/api)
- [`packages/agent`](/home/adrian/Projects/treeseed/market/packages/agent)

Recommended path:

```bash
cd packages/sdk && npm run build && npm test
cd ../api && npm run build && npm test
cd ../agent && npm run build
```

Minimum verification:

- SDK build and tests pass
- API build and tests pass
- Agent build passes
- if you changed process wiring, smoke the relevant service entrypoint locally

## Operator Workflows

### Local Manager With Cloudflare Site

Use this when the site and gateway are deployed to Cloudflare, but you want orchestration on your laptop.

1. Copy the example env file:

```bash
cp packages/agent/.env.local-manager-cloudflare.example packages/agent/.env.local-manager-cloudflare
```

2. Fill in at least:

- `TREESEED_AGENT_REPO_ROOT`
- `TREESEED_GATEWAY_BASE_URL`
- `TREESEED_GATEWAY_BEARER_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `TREESEED_QUEUE_ID`
- `TREESEED_QUEUE_PULL_TOKEN` if you also want a local worker

3. Start the manager:

```bash
cd packages/agent
npm run start:local-manager-cloudflare
```

4. Optionally start a local worker in another shell:

```bash
cd packages/agent
set -a; source ./.env.local-manager-cloudflare; set +a
npm run dev:worker
```

5. Trigger the work day:

```bash
cd packages/agent
set -a; source ./.env.local-manager-cloudflare; set +a
npm run dev:workday-start
```

6. Produce a report at the end:

```bash
cd packages/agent
set -a; source ./.env.local-manager-cloudflare; set +a
npm run dev:workday-report
```

### Railway Deployment Shape

The intended managed-service mapping in `treeseed.site.yaml` is:

- `gateway`: Cloudflare Worker
- `manager`: Railway service
- `worker`: Railway service
- `workdayStart`: Railway cron service
- `workdayReport`: Railway cron service
- optional `api`: public Railway API service

### Convenient Package Commands

`packages/agent` now exposes the operational entrypoints directly:

- `npm run dev:manager`
- `npm run dev:worker`
- `npm run dev:workday-start`
- `npm run dev:workday-report`
- `npm run start:manager`
- `npm run start:worker`
- `npm run start:workday-start`
- `npm run start:workday-report`
- `npm run start:local-manager-cloudflare`

### I Want To Change Market-Site Rendering Or Content

Work from:

- repo root

Recommended path:

```bash
npm install
npm run dev
npm run check
```

Minimum verification:

- market dev flow starts
- market check passes
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

### Root `postinstall` Is An Integration Bootstrap

The root `postinstall` currently does more than install packages. It also:

1. builds `sdk`
2. builds `core`
3. builds `agent`
4. builds `cli`
5. runs the CLI Starlight patch step for the market site

That behavior exists to make integrated development easier from the root workspace.

### Root `npm install` Is Convenient But Fragile

The root install path is currently more fragile than the package-local install paths.

Known reality:

- package-local `npm install` and package-local build/test flows are more reliable for package authorship
- root `npm install` may expose `dist` bootstrapping or build-order issues in the submodule packages
- if root install behaves differently from package install, trust the package-local workflow first for the package repo you are editing

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
