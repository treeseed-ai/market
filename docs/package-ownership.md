# Treeseed Package Ownership

This document is the canonical current-state map for where Treeseed functionality belongs. Use it when deciding where to add code, configuration, documentation, tests, package workflows, or hosting resources.

## System Overview

Treeseed is a unified system made from independently releasable package projects plus the root hosted market tenant.

The root `@treeseed/market` app is the hosted Treeseed-operated site. It composes:

- `@treeseed/core` for the Astro/Starlight runtime and site layering
- `@treeseed/admin` for the distributable administration portal
- `@treeseed/ui` for reusable components and styles
- `@treeseed/api` over HTTP/proxy surfaces for backend control-plane state
- `@treeseed/sdk` through package-owned public APIs for platform primitives
- `@treeseed/agent` through capacity-provider workflows, not in-process runtime imports
- `packages/treedx` through SDK/API integration, not product-specific UI code

The root market app owns the single real hostable `treeseed.site.yaml` in this workspace.

## Package Responsibility Table

| Package | Audience-Level Purpose | Implementation Ownership |
| --- | --- | --- |
| `@treeseed/market` | Treeseed-operated public site, marketplace, hosted tenant, docs/content, future ecommerce | Root app, `treeseed.site.yaml`, content, public messaging, overrides, marketplace/ecommerce business logic |
| `@treeseed/admin` | Distributable AGPLv3 administration portal for organizations | Admin routes, auth/session glue, middleware, API client facades, admin view models, catalog display, secret-manager UI/contracts |
| `@treeseed/ui` | Reusable Treeseed UI system | Layout-down Astro/React components, shells, forms, controls, cards, dashboards, CSS/theme primitives |
| `@treeseed/core` | Installable Astro/Starlight Treeseed web runtime | Site layering, content/runtime integration, tenant config loading, plugin hooks, web-only runtime composition, foreground dev entrypoint delegation |
| `@treeseed/sdk` | Programmatic platform substrate | Config, reconciliation, workflow engine, hosting graph, package workflow discovery, SDK-managed local dev supervisor, shared contracts, graph/content APIs, TreeDX client integration |
| `@treeseed/api` | Deployed backend control-plane API | Hono API, PostgreSQL adapter/migrations, backend auth, operation lifecycle, operations runner, route descriptors |
| `@treeseed/cli` | Human/operator command surface | `treeseed`/`trsd` command parsing, help, command handlers, terminal reporting, workflow entrypoints over SDK/Core/Agent |
| `@treeseed/agent` | Capacity-provider and agent runtime | Provider API, manager/runner/worker runtime, capacity scheduling, runtime images/templates |
| `packages/treedx` | Generic repository data/index/query service consumed by Treeseed | TreeDX API, storage, Git/repository graph/indexing, federation, Docker image, language SDKs; no Treeseed product semantics |

## Dependency Direction

Allowed dependency direction:

```text
ui -> consumed by admin/core/market
sdk -> core/admin/api/cli/agent
core -> sdk + ui
admin -> core + sdk + ui
market -> admin + core + ui + HTTP/API client surfaces
api -> sdk
cli -> sdk + core + selected public agent surfaces
agent -> sdk
treedx -> consumed through sdk clients and api hosting
```

Boundary rules:

- `sdk` must not import from `core`, `admin`, `api`, `agent`, `ui`, `cli`, TreeDX source, or root market source.
- `ui` must not import from root market, `admin`, `core`, `api`, `agent`, or `cli`.
- `core` may depend on `sdk` and `ui`; it must not depend on `admin`, `api`, `cli`, or `agent`.
- `admin` may depend on `sdk`, `core`, and `ui`; it must not import root market source. `api` belongs behind HTTP/API facades or optional dev/test-only helpers.
- `market` may consume public exports from `admin`, `core`, `ui`, and `sdk`, and may call the API through HTTP/proxy/client surfaces. It must not import backend implementation from `api`.
- `api` may depend on `sdk`; it must not own web UI, admin routes, or reusable component primitives.
- `cli` may depend on `sdk`, `core`, and narrow public `agent` surfaces where command execution requires them.
- `agent` may depend on `sdk`; it must not depend on `core`, `admin`, root market, or API implementation.
- TreeDX must remain product-neutral and must not encode Treeseed market/admin/agent semantics.

## Hosted Runtime Topology

```text
Cloudflare
  root market web app
    @treeseed/core runtime
    @treeseed/admin routes and middleware
    @treeseed/ui components/styles
    /v1/* proxy/client surfaces

Railway
  packages/api API service
  packages/api operations runner
  Treeseed PostgreSQL
  public TreeDX federation services

Capacity providers
  packages/agent provider image and runtime roles

TreeDX
  packages/treedx images consumed by API hosting
```

`@treeseed/admin` does not own a package-local `treeseed.site.yaml`. It is a site layer/plugin consumed by a host application. In this workspace, the root market app is the host.

## Local Development Topology

`trsd dev` starts the integrated local development surface. Managed background supervision is SDK-owned; Core contributes the web runtime composition and delegates managed process state to SDK:

- web from the root market repository
- admin as package-provided routes layered into the root web app
- UI as package-provided components/styles
- API and operations runner from `packages/api`
- local state, process supervision, worktree-family indexing, port allocation, stale PID detection, and log discovery through `@treeseed/sdk`

Capacity providers are not started by default. Use `trsd capacity ...` when provider runtime work is needed.

TreeDX is not an ordinary web dev process. It is run through TreeDX service workflows or consumed through SDK/API configuration when repository intelligence is enabled.

## Where New Functionality Belongs

| New Functionality | Owner |
| --- | --- |
| Treeseed public messaging, product pages, docs content, marketplace business pages | root market |
| Checkout, billing, coupons, invoices, subscriptions, licensing, seller payouts | root market or future market-commerce plugin |
| Generic admin pages, host/project/team/work/knowledge screens, admin middleware | `@treeseed/admin` |
| Admin reusable visual components once they are generic | `@treeseed/ui` |
| Theme tokens, app shell controls, cards, form controls, charts, status panels | `@treeseed/ui` |
| Site runtime, plugin loading, Astro/Starlight integration, content model wiring | `@treeseed/core` |
| Reconciliation, package workflows, config, hosting graph, provider adapters, managed local dev supervision | `@treeseed/sdk` |
| Backend persistence, API routes, auth backend, operations runner, migrations | `@treeseed/api` |
| CLI commands, help, terminal reports, workflow command entrypoints | `@treeseed/cli` |
| Capacity provider manager/runner/worker runtime and provider images | `@treeseed/agent` |
| Generic repository storage, indexing, graph search, snapshots, artifacts | `packages/treedx` |

## Where New Documentation Belongs

- User/adopter/operator overview: root `README.md` or package README.
- Package ownership and cross-package boundaries: this document and `AGENTS.md`.
- Agent/contributor workflow rules: `AGENTS.md`.
- Operational procedures and failure handling: runbooks under `docs/`.
- Deep implementation plans: focused design docs under `docs/`.
- Package-specific usage and verification: package README.
- TreeDX service internals: `packages/treedx/docs/`.

## Secret And Config Ownership

- `sdk` owns config schema loading, environment registry merging, reconciliation primitives, and provider credential routing.
- `core` owns web runtime env schema for generic site behavior.
- `admin` owns reusable admin env expectations, secret-manager selection UI, host credential forms, unlock/passphrase UX, and diagnostics views.
- `api` owns backend service credentials, database configuration, operations runner secrets, backend auth, and credential-session persistence.
- `agent` owns capacity-provider runtime env entries and provider registration/heartbeat settings.
- `market` owns tenant-specific values, branding, future ecommerce secrets, and the real hosted site manifest.
- `ui` owns no secrets.
- TreeDX owns TreeDX service configuration, auth mode, storage paths, and image workflow credentials.

Repository-scoped GitHub tokens use:

```text
TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>
```

Examples:

- `TREESEED_GITHUB_TOKEN_TREESEED_AI_ADMIN`
- `TREESEED_GITHUB_TOKEN_TREESEED_AI_TREEDX`

Public npm package publish tokens belong in the package repository GitHub `production` environment as `NPM_TOKEN`. Deploy-only/private packages may still use GitHub environments for deployment secrets, but they are not part of the public npm release list.

## Ecommerce Boundary

`@treeseed/admin` is not an ecommerce package.

Admin may display catalog, free, private, contact, and externally fulfilled offer metadata. Payment processing, checkout, billing, subscriptions, coupons, license grants, seller payouts, entitlement enforcement, and commercial support packaging belong in root market or a future market-commerce plugin layered above admin.

Internal deployments must be able to use admin without Treeseed checkout or billing machinery.

## TreeDX Boundary

TreeDX is a generic repository data, storage, query, graph, artifact, and federation service.

TreeDX may store and index files that contain Treeseed content, but it must not interpret Treeseed product concepts such as teams, projects, admin workflows, billing, capacity grants, or marketplace policy. Those meanings belong in SDK, API, admin, market, or agent code.

## Capacity Provider Boundary

Admin and market may display capacity provider state and expose configuration workflows.

`@treeseed/agent` owns provider runtime code, provider images, manager/runner/worker services, and runtime tests. `@treeseed/sdk` owns shared contracts and reconciliation. `@treeseed/cli` owns the operator command surface. `@treeseed/api` owns backend control-plane routes and operation state.

## Verification Matrix

| Change | Minimum Verification |
| --- | --- |
| Root market content/pages/overrides | `npm run check`, `npm run build`, `npx trsd ready local --json` |
| Admin package | `npm -w packages/admin run verify:local` |
| UI package | `npm -w packages/ui run verify:local` |
| Core runtime | `npm -w packages/core run verify:local` |
| SDK workflow/reconciliation | `npm -w packages/sdk run verify:local`, focused workflow tests |
| API backend/runner | `npm -w packages/api run verify:local` |
| CLI command behavior | `npm -w packages/cli run verify:local` |
| Agent/provider runtime | `npm -w packages/agent run verify:local`, capacity provider runtime tests |
| TreeDX service/image | TreeDX package release gate or targeted TreeDX runbook commands |
| Cross-package integration | affected package verifies plus `npm run check`, `npm run build`, `npx trsd ready local --json` |

## Documentation Style

READMEs are user/adopter/operator first. They should be task-oriented, include concrete commands, explain what the package does not do, and put contributor details near the bottom.

`AGENTS.md` is implementation-rule documentation for humans and AI agents. It should focus on boundaries, workflow discipline, verification, and mutation safety.

Runbooks should contain operational steps, expected outputs, failure modes, and recovery commands.

Design docs should capture intent, architecture, tradeoffs, and current-state notes when older implementation plans are superseded.
