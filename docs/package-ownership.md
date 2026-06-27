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

The root market app owns the real hostable web tenant `treeseed.site.yaml` in this workspace. Deployable package apps may own package-local hostable manifests when they operate an independently released runtime surface; today `packages/api/treeseed.site.yaml` owns the API, operations runner, Treeseed PostgreSQL, capacity-provider service bindings, and public TreeDX federation topology. SDK/CLI workflows compose the root and package manifests into one integrated desired-state graph, but the web and API release pipelines remain independently deployable.

Project architecture is logical, not submodule-first. A project is described by repository identity plus `rootPath`, optional `sitePath`, optional `contentPath`, `contentRuntimeSource`, and `localContentMaterialization`. The Market project uses `sitePath: "."`; first-party package projects default to `sitePath: "docs"` even when a docs site is not prepared yet. Submodules are allowed as one local materialization strategy, but projects should be easy to create from templates and easy to import from live projects without restructuring.

First-party package repositories declare their future project shape in `treeseed.package.yaml` under `projectArchitecture`. That metadata prepares packages for Admin/seed integration without changing package release gates: missing `docs/` sites report `site_not_prepared`, while package CI and publishing continue to follow the manifest's existing `verify`, `releaseGate`, and artifact settings.

## Package Responsibility Table

| Package | Audience-Level Purpose | Implementation Ownership |
| --- | --- | --- |
| `@treeseed/market` | Treeseed-operated public site, buyer marketplace, hosted tenant, docs/content, and Commons participant surfaces | Root app, `treeseed.site.yaml`, content, public messaging, overrides, buyer marketplace/cart/checkout/service/capacity/Commons pages |
| `@treeseed/admin` | Distributable AGPLv3 administration portal for organizations | Admin routes, auth/session glue, middleware, API client facades, admin view models, catalog display, secret-manager UI/contracts |
| `@treeseed/ui` | Reusable Treeseed UI system | Layout-down Astro/React components, shells, forms, controls, cards, dashboards, CSS/theme primitives |
| `@treeseed/core` | Installable Astro/Starlight Treeseed web runtime | Site layering, content/runtime integration, tenant config loading, plugin hooks, web-only runtime composition, foreground dev entrypoint delegation; does not own agent scheduling or provider execution |
| `@treeseed/sdk` | Programmatic platform substrate | Config, reconciliation, workflow engine, hosting graph, package workflow discovery, SDK-managed local dev supervisor, shared contracts, graph/content APIs, model-aware content operation contracts/rendering/validation, TreeDX client integration, portable agent-capacity contracts |
| `@treeseed/api` | Deployed backend control-plane API | Hono API, package-local backend `treeseed.site.yaml`, PostgreSQL adapter/migrations, backend auth, operation lifecycle, operations runner, route descriptors, provider sessions, assignment leases, mode-run persistence, capacity ledger coordination |
| `@treeseed/cli` | Human/operator command surface | `treeseed`/`trsd` command parsing, help, command handlers, terminal reporting, workflow entrypoints over SDK/Core/Agent |
| `@treeseed/agent` | Capacity-provider and agent runtime | Provider manager/runner runtime, AgentKernel execution, mode scheduling, execution-provider adapters, assignment-scoped agent tool catalogs, model-aware content tool serving over TreeDX proxy handles, provider-local capacity enforcement, runtime images/templates |
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
  packages/agent provider manager and runner runtime roles

TreeDX
  packages/treedx images consumed by API hosting
```

Development and staging package manifests use exact GitHub commit refs for internal Treeseed dependencies. Staging Railway deploys `packages/api` API/runner, `packages/agent` capacity-provider manager/runner, and `packages/treedx` public federation nodes from GitHub source at the selected branch/commit. Production release rewrites installable package dependencies to npm semantic versions and deploys Docker-backed services from semantic Docker image tags. Routine staging saves and promotions must not create dev Git tags or publish development Docker images.

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
| Buyer marketplace, cart, grouped checkout UI, service checkout UI, capacity discovery/inquiry pages, Commons participant pages | root market |
| Commerce backend records, route orchestration, Stripe server calls, webhooks, refunds, fulfillment, seller monitoring, Commons governance APIs | `@treeseed/api` |
| Theme-native commerce/governance panels, cards, timelines, and status components | `@treeseed/ui` |
| Generic admin pages, host/project/team/work/knowledge screens, admin middleware | `@treeseed/admin` |
| Admin reusable visual components once they are generic | `@treeseed/ui` |
| Theme tokens, app shell controls, cards, form controls, charts, status panels | `@treeseed/ui` |
| Site runtime, plugin loading, Astro/Starlight integration, content model wiring | `@treeseed/core` |
| Reconciliation, package workflows, config, hosting graph, provider adapters, managed local dev supervision | `@treeseed/sdk` |
| Backend persistence, API routes, auth backend, operations runner, migrations | `@treeseed/api` |
| CLI commands, help, terminal reports, workflow command entrypoints | `@treeseed/cli` |
| Capacity provider manager/runner runtime, AgentKernel execution, mode scheduling, and provider images | `@treeseed/agent` |
| Generic repository storage, indexing, graph search, snapshots, artifacts | `packages/treedx` |

## Where New Documentation Belongs

- User/adopter/operator overview: root `README.md` or package README.
- Package ownership and cross-package boundaries: this document and `AGENTS.md`.
- Canonical agent capacity implementation roadmap: `docs/agent-capacity-implementation-roadmap.md`.
- Agent capacity domain terms and shared contract intent: `docs/agent-capacity-domain-model.md`.
- Provider coordination architecture: `docs/capacity_provider_agent_coordination_architecture.md`.
- Agent kernel planning/acting runtime behavior: `docs/agent-kernel-mode-runtime.md`.
- Admin/CLI capacity operator surfaces: `docs/agent-capacity-operator-surfaces.md`.
- Agent/contributor workflow rules: `AGENTS.md`.
- Operational procedures and failure handling: runbooks under `docs/`.
- Deep implementation plans: focused design docs under `docs/`.
- Package-specific usage and verification: package README.
- TreeDX service internals: `packages/treedx/docs/`.

## Secret And Config Ownership

- `sdk` owns config schema loading, environment registry merging, reconciliation primitives, provider credential routing, and portable capacity/assignment contracts.
- `core` owns web runtime env schema for generic site behavior.
- `admin` owns reusable admin env expectations, secret-manager selection UI, host credential forms, unlock/passphrase UX, and diagnostics views.
- `api` owns backend service credentials, database configuration, operations runner secrets, backend auth, credential-session persistence, provider sessions, assignment leases, mode-run records, and usage settlement.
- `agent` owns capacity-provider runtime env entries, provider registration/check-in settings, provider-local lifecycle, and runtime execution settings.
- `market` owns tenant-specific values, branding, buyer-facing marketplace copy, and the real hosted site manifest.
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

## Ecommerce And Commons Boundary

`@treeseed/admin` is not a buyer checkout or payment package.

The completed ecommerce architecture is split by surface:

- root market owns buyer-facing marketplace discovery, cart review, Stripe Elements checkout, service request views, service checkout, capacity discovery/inquiry, and Commons participant pages.
- `@treeseed/api` owns backend ecommerce and Commons state: vendors, products, offers, prices, ownership, stewardship, contributions, governance policies, orders, payment groups, subscriptions, entitlements, refunds, fulfillment, scoped services, capacity listings/inquiries, marketplace aggregation, seller monitoring, webhooks, and governance events.
- `@treeseed/admin` owns seller setup, seller operations, governance, readiness, monitoring, fulfillment, refunds, capacity trust gates, service operations, and Commons steward operations through HTTP/API facades.
- `@treeseed/ui` owns reusable, Stripe-free, theme-native commerce and governance components.

Admin must remain Stripe-free, checkout-free, payout-free, commission-free, and capacity-execution-free. It may link sellers or stewards to root-market buyer flows where appropriate, but it must not initialize Stripe Elements, create PaymentIntents, handle webhooks, or mutate provider execution resources.

Internal deployments must be able to use admin without Treeseed checkout or billing machinery.

The ecommerce model intentionally does not include commissions, application fees, seller payout ledgers, revenue splits, benefit payout allocation, generalized capacity credits, marketplace capacity reservations, marketplace grants, routing decisions, hosted third-party execution, legacy `paid` offer mode, or compatibility aliases. Contributor `benefitWeight` is attribution/governance metadata, not a payout allocation rule.

TreeSeed Commons governance creates participant signal, questions, proposals, votes, delegations, and steward decisions. Registration creates a governance identity, not legal cooperative membership, patronage rights, equity-like claims, or unbounded roadmap authority.

Proposal governance is provider-backed. `@treeseed/sdk` owns portable governance provider contracts and built-in voting math, including admin approval, simple majority, absolute threshold, and TreeSeed bicameral providers. `@treeseed/api` owns durable governance policies, proposal versions, electorate snapshots, votes, delegations, events, and immutable decision records. `@treeseed/core` owns proposal/decision content schema fields, and `@treeseed/admin` owns the project/work UI over those records. Operational `approval_requests` remain separate from proposal governance and must not be presented as decisions.

## TreeDX Boundary

TreeDX is a generic repository data, storage, query, graph, artifact, and federation service.

TreeDX may store and index files that contain Treeseed content, but it must not interpret Treeseed product concepts such as teams, projects, admin workflows, billing, capacity grants, or marketplace policy. Those meanings belong in SDK, API, admin, market, or agent code.

## Capacity Provider Boundary

Admin and market may display capacity provider state and expose configuration workflows.

`@treeseed/agent` owns provider runtime code, provider images, provider manager/runner services, AgentKernel execution, mode scheduling, execution-provider adapters, provider-local capacity enforcement, and runtime tests. The provider-local API and legacy worker task queue are retired; providers coordinate outbound with the TreeSeed API assignment lifecycle. `@treeseed/sdk` owns shared contracts and reconciliation. `@treeseed/cli` owns the operator command surface. `@treeseed/api` owns backend control-plane routes, provider availability sessions, assignment leases, mode-run records, reservations, and capacity ledger settlement.

Provider runtime execution is assignment-only. Do not add provider task claim/event/complete/fail HTTP routes or public provider-client methods; local task stores and project runner task APIs are separate non-provider-runtime surfaces.

Capacity providers supply execution capacity, native budget observations, local runner pressure, availability windows, and execution-provider capabilities. Projects supply agent definitions, agent classes, handlers, prompts, output contracts, and work semantics. The API coordinates the match between project demand and provider supply through durable records; the provider manager only supervises one provider's local runtime.

Human-machine execution provider adapters follow the same boundary. AI providers, deterministic workflow providers, and human issue queue providers are execution surfaces behind capacity providers. Project handlers remain semantic and provider-independent; adapters only perform or coordinate bounded assignment work. See `docs/human-machine-providers.md`.

Infrastructure lifecycle and runtime assignment are separate concerns. `trsd capacity build/up/status/logs/down/test-local` manage provider runtime lifecycle and diagnostics through reconciliation. Provider check-ins, assignments, leases, mode runs, usage actuals, and ledger entries are API control-plane records, not reconciled infrastructure resources.

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
