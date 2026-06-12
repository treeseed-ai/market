# Treeseed Market

Treeseed is a hosted administration and marketplace platform for teams that want governable AI work, content operations, deployment workflows, and repository intelligence in one system.

This repository is the Treeseed-operated market site and the canonical integration workspace for the package repositories under `packages/`. Most people use it to run or operate Treeseed. Package contributors use it to prove that the independently released packages still wire together as one system.

## What You Can Do

- Use Treeseed as an organization administration portal for teams, projects, hosts, knowledge, decisions, approvals, and operational work.
- Run the Treeseed market site locally with the same admin surfaces used by hosted deployments.
- Deploy and verify the Treeseed web app, API, operations runner, PostgreSQL, capacity providers, and TreeDX-backed repository intelligence through `trsd`.
- Use `@treeseed/sdk` in scripts, services, and agents that need typed Treeseed content, graph, workflow, and reconciliation primitives.
- Use TreeDX for generic repository storage, indexing, graph search, snapshots, artifacts, and federation.
- Develop Treeseed itself across the package repositories mounted in `packages/`.

## Choose Your Path

| Goal | Start Here |
| --- | --- |
| Use or evaluate the hosted admin/market product | Run the root app and read [Package Ownership](./docs/package-ownership.md) to understand the system shape. |
| Build an internal admin deployment | Use `@treeseed/admin` layered on `@treeseed/core` and `@treeseed/ui`; see [Admin README](./packages/admin/README.md). |
| Build a Treeseed-compatible web site | Use `@treeseed/core`; see [Core README](./packages/core/README.md). |
| Compose UI surfaces | Use `@treeseed/ui`; see [UI README](./packages/ui/README.md). |
| Write automation or integrations | Use `@treeseed/sdk`; see [SDK README](./packages/sdk/README.md). |
| Run the backend API and operations runner | Use `@treeseed/api`; see [API README](./packages/api/README.md). |
| Operate Treeseed from a terminal or CI | Use `treeseed` / `trsd`; see [CLI README](./packages/cli/README.md). |
| Run capacity providers | Use `@treeseed/agent`; see [Agent README](./packages/agent/README.md). |
| Run repository intelligence/federation | Use TreeDX; see [TreeDX README](./packages/treedx/README.md). |

## System Packages

| Package | Audience-Level Purpose | Implementation Ownership |
| --- | --- | --- |
| `@treeseed/market` | Treeseed-operated public site, marketplace, hosted tenant, docs/content, future ecommerce | Root app, `treeseed.site.yaml`, content, public messaging, overrides, marketplace/ecommerce business logic |
| `@treeseed/admin` | Distributable AGPLv3 administration portal for organizations | Admin routes, auth/session glue, middleware, API client facades, admin view models, catalog display, secret-manager UI/contracts |
| `@treeseed/ui` | Reusable Treeseed UI system | Layout-down Astro/React components, shells, forms, controls, cards, dashboards, CSS/theme primitives |
| `@treeseed/core` | Installable Astro/Starlight Treeseed web runtime | Site layering, content/runtime integration, tenant config loading, plugin hooks, web-only hosting integration, local dev supervisor |
| `@treeseed/sdk` | Programmatic platform substrate | Config, reconciliation, workflow engine, hosting graph, package workflow discovery, shared contracts, graph/content APIs, TreeDX client integration |
| `@treeseed/api` | Deployed backend control-plane API | Hono API, PostgreSQL adapter/migrations, backend auth, operation lifecycle, operations runner, route descriptors |
| `@treeseed/cli` | Human/operator command surface | `treeseed`/`trsd` command parsing, help, command handlers, terminal reporting, workflow entrypoints over SDK/Core/Agent |
| `@treeseed/agent` | Capacity-provider and agent runtime | Provider API, manager/runner/worker runtime, capacity scheduling, runtime images/templates |
| `packages/treedx` | Generic repository data/index/query service consumed by Treeseed | TreeDX API, storage, Git/repository graph/indexing, federation, Docker image, language SDKs; no Treeseed product semantics |

The dependency direction is intentionally sharp:

```text
ui -> consumed by admin/core/market
sdk -> core/admin/api/cli/agent
core -> sdk + ui
admin -> core + sdk + ui
market -> admin + core + ui
api -> sdk
cli -> sdk + core + selected public agent surfaces
agent -> sdk
treedx -> consumed through sdk clients and api hosting
```

See [Package Ownership](./docs/package-ownership.md) for where new functionality belongs.

## Hosted Runtime Shape

The root market repository is the only hosted web tenant in this workspace. It owns the real `treeseed.site.yaml`.

```text
Cloudflare web app: root market
  - public site, docs, content, overrides, future ecommerce
  - admin routes contributed by @treeseed/admin
  - reusable UI from @treeseed/ui
  - web runtime from @treeseed/core
  - /v1/* proxy/client surfaces

Railway backend app: packages/api
  - API service
  - operations runner
  - Treeseed PostgreSQL
  - public TreeDX federation services

Capacity providers: packages/agent
  - provider API, manager, runner, worker runtime
  - started only through trsd capacity workflows

TreeDX: packages/treedx
  - generic repository service and Docker image
  - consumed by API/SDK, not by product UI directly
```

The admin package does not own hosting. It contributes routes, middleware, contracts, and CSS/plugin hooks to whichever host site installs it.

## Install And Run

### Registry Mode

Use this path when you are running the market site or a normal Treeseed tenant and do not need to edit package source.

```bash
git clone git@github.com:treeseed-ai/market.git
cd market
npm install
npx trsd dev start --web-runtime local --json
```

The root bootstrap uses published `@treeseed/*` packages and skips local package builds.

### Workspace Mode

Use this path when you are changing behavior across packages.

```bash
git clone git@github.com:treeseed-ai/market.git
cd market
git submodule update --init --recursive
npm install
npx trsd status --json
npx trsd ready local --json
```

Workspace mode links checked-out package repositories into the root install and builds packages in dependency order.

### Standalone Package Mode

Use this path when validating package CI or publish behavior for one package.

```bash
cd packages/admin
npm install
npm run verify:local
```

Package-local installs, lockfiles, workflows, and release scripts are authoritative for package publishing.

## Daily Operator Commands

```bash
npx trsd status --json
npx trsd ready local --json
npx trsd dev start --web-runtime local --json
npx trsd dev status --json
npx trsd dev logs --follow
npx trsd save --verify local --json "describe the checkpoint"
npx trsd stage --plan --json "describe the staging change"
npx trsd release --patch --verify-deployed-resources --plan --json
```

Hosted readiness and repair:

```bash
npx trsd ready staging --json
npx trsd hosting plan --environment staging --service api --json
npx trsd hosting verify --environment staging --service operationsRunner --live --json
npx trsd operations smoke --environment staging --service operationsRunner --json
```

Capacity providers:

```bash
npx trsd capacity build
npx trsd capacity up
npx trsd capacity status
npx trsd capacity logs
npx trsd capacity down
```

TreeDX image workflow:

```bash
npx trsd package image --package treedx --branch staging --plan --json
npx trsd package image --package treedx --branch staging --sync-config --json
npx trsd package image --package treedx --branch staging --execute --json
```

## Where Functionality Belongs

| If You Are Adding... | Put It In |
| --- | --- |
| Public marketing pages, content, docs, tenant messaging, future checkout/billing/licensing | Root market |
| Admin pages, auth/session flow, host/project/team/work/knowledge views, admin middleware | `packages/admin` |
| Reusable components, shells, forms, panels, charts, app controls, CSS tokens/themes | `packages/ui` |
| Astro/Starlight runtime integration, plugin loading, site layering, web-only config | `packages/core` |
| Shared contracts, config, reconciliation, workflow logic, graph/content APIs, TreeDX client | `packages/sdk` |
| Backend HTTP routes, PostgreSQL storage, auth backend, operations runner, migrations | `packages/api` |
| Terminal command parsing/help/reporting and operator workflows | `packages/cli` |
| Capacity provider runtime, provider images, manager/runner/worker services | `packages/agent` |
| Generic repository storage, Git inspection, graph indexing, snapshots, artifacts, federation | `packages/treedx` |

Root web code may call backend APIs through HTTP/proxy/client surfaces. It must not import backend implementation from `@treeseed/api`.

## Build And Verification

Recommended package verification after integrated changes:

```bash
npm -w packages/sdk run verify:local
npm -w packages/ui run verify:local
npm -w packages/core run verify:local
npm -w packages/admin run verify:local
npm -w packages/api run verify:local
npm -w packages/cli run verify:local
npm -w packages/agent run verify:local
npm run check
npm run build
npx trsd ready local --json
```

Integrated package build order is:

```text
sdk -> ui -> core -> admin -> api -> cli -> agent
```

Public npm release order excludes the private/deploy-only API package:

```text
sdk -> ui -> core -> admin -> cli -> agent
```

TreeDX is a non-Node service/image workflow and is verified through its package scripts and `trsd package image`.

## Configuration And Secrets

Use `trsd config` or provider secret managers for provider credentials. Do not write plaintext provider secrets into env files.

Important package credential conventions:

- repository-scoped GitHub tokens use `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>`
- admin package token: `TREESEED_GITHUB_TOKEN_TREESEED_AI_ADMIN`
- TreeDX package token: `TREESEED_GITHUB_TOKEN_TREESEED_AI_TREEDX`
- public npm package tokens belong in each package repository's GitHub `production` environment as `NPM_TOKEN`

See [Package Ownership](./docs/package-ownership.md#secret-and-config-ownership) for ownership details.

## Troubleshooting

Submodules missing:

```bash
git submodule update --init --recursive
```

Stale package builds:

```bash
npm -w packages/sdk run build:dist
npm -w packages/ui run build
npm -w packages/core run build:dist
npm -w packages/admin run build:dist
npm -w packages/cli run build:dist
npm -w packages/agent run build:dist
```

Workflow interruption:

```bash
npx trsd recover --json
npx trsd resume <run-id> --json
```

## Documentation Map

- [Package Ownership](./docs/package-ownership.md)
- [Reconciliation Platform](./docs/reconciliation-platform.md)
- [Local Dev Instances](./docs/local-dev-instances.md)
- [UI Components](./docs/ui-components.md)
- [API Deploy](./docs/api-deploy.md)
- [Project Web Deployment](./docs/project-web-deployment.md)
- [Capacity Providers](./docs/capacity-providers.md)
- [TreeDX README](./packages/treedx/README.md)

If a workflow feels harder than using a normal Treeseed site, treat that as a product bug or documentation gap.
