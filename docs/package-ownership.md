# Treeseed Package Ownership

## Seeded operating environments

`@treeseed/sdk` owns portable seed/runtime-prerequisite contracts, deterministic prerequisite ordering, and local reconciliation. `@treeseed/api` owns durable seed membership claims, verified-email attachment, team/project/TreeDX records, capacity grants, allocations, sessions, and audit events. `@treeseed/agent` remains the only owner of the running provider manager, runner, AgentKernel, and execution-provider adapters. `@treeseed/cli` launches these canonical operations and does not duplicate their lifecycle logic. Scene setup consumes ordered seeds before browser or Agent Lab execution; team-scoped Agent Lab runs retain production records, while ephemeral runs clone and clean isolated resources.

This document is the canonical current-state map for where Treeseed functionality belongs. Use it when deciding where to add code, configuration, documentation, tests, package workflows, or hosting resources.

For capacity-provider and agent completion work, [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md) is the active cross-package execution ledger. It preserves the ownership boundaries in this document while replacing the incomplete single-team registration, allocation, kernel, handler, and starter implementations.

For Guide-specific editorial roles, deterministic layered context, review independence, and exact-revision publication, see [TreeSeed Guide Editorial Agent System](./guide-editorial-agent-system.md).

## System Overview

Treeseed is a unified system made from independently releasable projects, a public Platform integration workspace, and a separately operated singleton Market.

`treeseed-ai/platform` is the canonical installer and integration workspace. It bundles Admin, API, Agent, AI, CLI, Core, Reviewer, SDK, TreeDX, UI, and the Engineering and Research templates. It never checks out, provisions, deploys, or reconciles Market or Market API. Content repositories are logical TreeDX/R2 bindings rather than submodules.

The immutable Market profile is `treeseed` at `https://api.treeseed.dev`. Default deployments use that gateway for both Market and hosted control-plane calls. Sovereign deployments route control-plane calls to an external or Platform-managed Admin API while continuing to send registry, ecommerce, licensing, and ecosystem-governance calls to the singleton Market gateway.

The root `@treeseed/market` app is currently the hosted Treeseed-operated tenant. During the staged separation it still composes:

- `@treeseed/core` for the Astro/Starlight runtime and site layering
- `@treeseed/admin` for the administration portal until Market route extraction completes
- `@treeseed/ui` for reusable components and styles
- `@treeseed/api` over HTTP/proxy surfaces; commerce has not yet moved to the private Market API repository
- `@treeseed/sdk` through package-owned public APIs for platform primitives
- `@treeseed/agent` through capacity-provider workflows, not in-process runtime imports
- `@treeseed/reviewer` as a local-only operator tool, not a hosted runtime
- `packages/treedx` through SDK/API integration, not product-specific UI code

The root market app owns the real hostable web tenant `treeseed.site.yaml` in this workspace. Deployable package apps may own package-local hostable manifests when they operate an independently released runtime surface; `packages/api/treeseed.site.yaml` owns only the API control plane, Treeseed PostgreSQL, provider protocol bindings, and public TreeDX federation topology; agent and platform-operation execution services are capacity providers owned by `@treeseed/agent`, never API sibling processes. SDK/CLI workflows compose the root and package manifests into one integrated desired-state graph, but the web and API release pipelines remain independently deployable.

Project architecture is logical and split by default. Every primary software repository has a separately governed `{repository}-content` repository. Content repositories are never Market workspace submodules. Git stores content history, TreeDX owns operational content access and mutation, and R2 serves immutable publications. See [Project Architecture Migration](./project-architecture-migration.md).

First-party package repositories declare the live split-content project shape in `treeseed.package.yaml` under `projectArchitecture`: `split_site_content`, content-repository path `src/content`, R2 staging plus preview overlays, and no implicit local materialization. This metadata does not change package release gates: missing `docs/` sites report `site_not_prepared`, while package CI and publishing continue to follow the manifest's existing `verify`, `releaseGate`, and artifact settings.

Capacity acceptance follows the same independent-project rule. `starters/engineering` and `starters/research` are separately versioned Git repositories selected explicitly by the SDK reconciliation verifier and seeded into separate TreeDX repositories. A live run creates a disposable API project bound to the selected TreeDX repository; it does not turn the Market root into the project or create a synthetic source repository. Agent definitions come from project MDX through TreeDX, while engineering source mutations use exact-ref isolated worktrees in the selected starter checkout.

## Package Responsibility Table

| Package | Audience-Level Purpose | Implementation Ownership |
| --- | --- | --- |
| Platform | Public installer and integration workspace | Customer repository/content orchestration, optional Admin portal and sovereign Admin API topology, Core, CLI, capacity, TreeDX, and AI composition. It owns no Market resource. |
| `@treeseed/market` | Public singleton Market web application | Market branding, public content, catalog and commerce presentation, ecosystem-governance presentation, and the public Market web manifest. It is deployed only by protected singleton workflows. |
| `@treeseed/admin` | Freestanding Apache-2.0 administration application | Independently buildable and deployable Admin UI, auth/session glue, routed API client facades, project/knowledge/capacity/operations/secret-management views, and a package-local hostable manifest. It contains no Market implementation. |
| `@treeseed/ui` | Reusable Treeseed UI system | Layout-down Astro/React components, current shell primitives, public stacked-section and knowledge-profile components, tabs, forms, controls, cards, dashboards, CSS/theme primitives, canonical account-time-zone-aware timestamp rendering, and the canonical enhanced form submission, field-validation, and toast lifecycle |
| `@treeseed/core` | Installable Astro/Starlight Treeseed web runtime | Site layering, public content/runtime integration through UI public layouts, tenant config loading, plugin hooks, web-only runtime composition, foreground dev entrypoint delegation; does not own authenticated app chrome, agent scheduling, or provider execution |
| `@treeseed/sdk` | Programmatic platform substrate | Config, reconciliation, workflow engine, hosting graph, package workflow discovery, SDK-managed local dev supervisor, shared contracts, canonical repository identity and custody contracts, graph/content APIs, TreeDX changeset clients, the canonical content-publication manifest and R2 provider, model-aware content operation contracts/rendering/validation, portable agent-capacity and artifact-reference contracts, the canonical TreeDX proxy-handle policy evaluator, and pure native accounting-window policy. SDK owns save/update/stage/close/release/recover/worktree safety; `stage` must merge staging down before mutation, preserve failed feature branches/worktrees, and clean up only after staging refs are verified. |
| `@treeseed/api` | Public Admin and platform control-plane API, AGPL-3.0-only with a commercial alternative | Identity, teams, projects, tenant governance, TreeDX authorization, knowledge publication, capacity, operations, audit, realtime, PostgreSQL state, and operations runner. Commerce does not belong here. |
| Market API | Private singleton commerce implementation and Admin-compatible gateway | `treeseed-ai/market-api` owns `/v1/market/**` and passes every other supported `/v1/**` route to the separately deployed hosted Admin API. It is proprietary and never imported or provisioned by Platform. |
| `@treeseed/cli` | Human/operator command surface | `treeseed`/`trsd` command parsing, help, command handlers, terminal reporting, workflow entrypoints over SDK/Core/Agent. CLI exposes stage options and reporting but must not reimplement SDK-owned save/stage/release orchestration. |
| `@treeseed/reviewer` | Local guarantee run review and AI workplan packaging | Standalone local web app, guarantee run selection/review UI, reviewer notes, evidence browsing, copied local evidence bundles, directive/workplan schemas, and Codex-ready handoff packages. It invokes existing CLI guarantee commands and must not own guarantee execution or release gating. |
| `@treeseed/agent` | Capacity-provider and agent runtime | Provider manager/runner runtime, sole-entrypoint AgentKernel execution, canonical mode-run lifecycle telemetry, activity-profile and research-stage resolution, execution-provider adapters, required replay-safe provider telemetry delivery, assignment-scoped fail-closed tool catalogs, model-aware content and governed research tools, exact-ref worktree/checkpoint execution, provider-local capacity enforcement, runtime images/templates |
| `@treeseed/ai` | Installable local AI appliance | Owns the appliance manifest, hardware/VM diagnostics, SDK-reconciled vLLM Compose resource, authenticated loopback OpenAI-compatible gateway, management/status API, systemd service, Debian artifact, and provider profile catalog. Axolotl training, experience curation, adapter competition, and governed LoRA promotion remain planned. It owns no project scheduler, assignment authority, or repository mutation. |
| `packages/treedx` | Generic repository data/index/query service consumed by Treeseed | TreeDX API, atomic unified-diff changeset application, storage, Git/repository graph/indexing, federation, Docker image, language SDKs; no Treeseed product semantics |

### Book knowledge ownership

- `@treeseed/sdk` owns `treeseed.book/v2`, `treeseed.knowledge-page/v1`, book-collection and immutable knowledge-pack contracts, derived routes, content-sync safety, and deterministic snapshot artifacts.
- `@treeseed/ui` owns reusable library, outline, authoring, review, relationship, and pack presentation. Admin routes compose these primitives and do not create page-local editor or collection systems.
- `@treeseed/core` owns the single Starlight-based reader and the policy-filtered published-content consumption boundary.
- `@treeseed/admin` owns authenticated authoring, review, linking, publication, and pack workbench routes over API contracts.
- `@treeseed/api` owns authorization, TreeDX workspace/review/publication admission and orchestration, workflow metadata, capacity assignment coordination, operations-runner execution, and policy-filtered knowledge APIs. Markdown remains in Git and TreeDX rather than PostgreSQL.
- Knowledge delivery performance follows the same boundary: SDK owns compact wire and hosting-resource contracts; API owns incremental publication, authorization projections, and bounded publication-object loading; Core owns anonymous reader request coalescing; Admin must preserve shared-cache eligibility for public responses; TreeDX owns repository, graph, storage-index, worker-pool, and profiler performance. No layer may compensate by adding a second content-serving path.
- `@treeseed/cli` owns `trsd content sync`; the SDK owns its exact-ref comparison and fast-forward-only mutation policy.
- Git is canonical history, TreeDX is the operational content and graph plane, and PostgreSQL stores workflow metadata. An atomic published manifest is the required serving plane but is still release-blocking; exact-ref runtime reads are not accepted as a substitute. The removed filesystem book exporter is not a supported fallback.
- `@treeseed/sdk` owns the editorial context, audience declaration, and structured editorial review contracts; `@treeseed/agent` owns TreeDX-backed context resolution and trace provenance; `@treeseed/api` owns independent editorial review state and exact-revision publication enforcement; root Market content owns the Guide agents, editorial cores, chapter briefs, and evidence.
- Repository custody is physical as well as logical. Developer checkouts, capacity-provider assignment checkouts, and TreeDX repository workspaces never share a writable checkout, Git common directory, or service volume. SDK contracts normalize repository identity; Agent owns provider-local materialization; the API owns no repository storage or execution checkout; TreeDX owns its product-neutral repository store.

## Dependency Direction

Allowed dependency direction:

```text
ui -> consumed by admin/core/market
sdk -> core/admin/api/cli/agent
core -> sdk + ui
admin -> core + sdk + ui + Admin-compatible HTTP
market -> admin + core + sdk + ui + current API HTTP (transition)
market -> core + sdk + ui + Market API HTTP (target)
market-api -> sdk + Admin API HTTP (target)
api -> sdk
cli -> sdk + core + selected public agent surfaces
reviewer -> cli + sdk + ui
agent -> sdk
ai -> sdk
treedx -> consumed through sdk clients and api hosting
```

Boundary rules:

- `sdk` must not import from `core`, `admin`, `api`, `agent`, `ui`, `cli`, TreeDX source, or root market source.
- `ui` must not import from root market, `admin`, `core`, `api`, `agent`, or `cli`.
- `core` may depend on `sdk` and `ui`; it must not depend on `admin`, `api`, `cli`, or `agent`.
- `admin` may depend on `sdk`, `core`, and `ui`; it must not import root market source. `api` belongs behind HTTP/API facades or optional dev/test-only helpers.
- During migration, `market` may consume public Admin exports but must not add new Admin coupling. The target removes Admin imports and retains only `core`, `ui`, `sdk`, and Market API HTTP surfaces.
- The future Market API extends Admin API by HTTP/protocol composition, never by importing Admin API implementation.
- `api` may depend on `sdk`; it must not own web UI, admin routes, or reusable component primitives.
- `cli` may depend on `sdk`, `core`, and narrow public `agent` surfaces where command execution requires them.
- `reviewer` may depend on `cli`, `sdk`, and `ui`; it must remain local-only and must not become a release gate or hosted control plane.
- `agent` may depend on `sdk`; it must not depend on `core`, `admin`, root market, or API implementation.
- `ai` may depend on portable `sdk` contracts. Agent and API integrations use public contracts and HTTP/provider protocols rather than importing appliance internals.
- TreeDX must remain product-neutral and must not encode Treeseed market/admin/agent semantics.

## Hosted Runtime Topology

This is the target topology, not an authorization to deploy it. Push-triggered Market/API deployment and hosted capacity acceptance are suspended until the reviewed Railway/Cloudflare OpenTofu design restores them. `trsd release` must remain fail-closed while the root production deployment workflow is absent.

```text
Cloudflare
  root market web app
    @treeseed/core runtime
    @treeseed/admin routes and middleware
    @treeseed/ui components/styles
    /v1/* proxy/client surfaces

Railway
  packages/api API service
  Treeseed PostgreSQL
  public TreeDX federation services

Capacity providers
  packages/agent agent and platform-operation provider manager/runner roles
  packages/ai local model inference appliance (inference foundation implemented; training planned)

TreeDX
  packages/treedx images consumed by API hosting
```

Development and staging package manifests use exact GitHub commit refs for internal Treeseed dependencies. Staging Railway deploys `packages/api` as a control-plane-only service, independently deploys declared `packages/agent` provider classes, and deploys `packages/treedx` public federation nodes from GitHub source at the selected branch/commit. Production release rewrites installable package dependencies to npm semantic versions and deploys Docker-backed services from semantic Docker image tags. Routine staging saves and promotions must not create dev Git tags or publish development Docker images.

`@treeseed/admin` owns a package-local `treeseed.site.yaml` for its independently buildable application while continuing to expose the Admin plugin consumed by Market during migration. Its logical package project still uses `docs/` as the knowledge-hub site; deployable app ownership does not move project content into the app root. Hosted deployment remains suspended.

## Local Development Topology

`trsd dev` starts the integrated local development surface. Managed background supervision is SDK-owned; Core contributes the web runtime composition and delegates managed process state to SDK:

- web from the root market repository
- admin as package-provided routes layered into the root web app
- UI as package-provided components/styles
- API control plane from `packages/api`
- isolated agent and platform-operation provider stacks from `packages/agent`
- local state, process supervision, worktree-family indexing, port allocation, stale PID detection, and log discovery through `@treeseed/sdk`

`trsd run` starts every provider declared by the exact selected seed set. The `agents` seed declares one agent-class provider with Codex, OpenCode, and GitHub Copilot execution adapters; the `platform` seed declares the privileged platform-operation provider. Selecting both runs them concurrently with separate identities, configuration generations, data/checkouts, and readiness status. Use `trsd capacity ...` only for standalone provider lifecycle work.

TreeDX is not an ordinary web dev process. It is run through TreeDX service workflows or consumed through SDK/API configuration when repository intelligence is enabled.

## Where New Functionality Belongs

| New Functionality | Owner |
| --- | --- |
| Singleton Market messaging, docs, catalog, commerce, licensing, and ecosystem-governance presentation | `treeseed-ai/market` |
| Authentication, account, team management, active-team selection, invitations, and public user/team identity profiles | `@treeseed/admin` |
| Public homepage, books, and Knowledge Hub content during the redesign foundation | `@treeseed/core` |
| Commerce backend records, route orchestration, Stripe server calls, webhooks, refunds, fulfillment, seller monitoring, commercial licensing, and ecosystem-governance APIs | private `treeseed-ai/market-api` under `/v1/market/**` |
| Theme-native commerce/governance panels, cards, timelines, and status components | `@treeseed/ui` |
| Generic admin pages, host/project/team/work/knowledge screens, admin middleware | `@treeseed/admin` |
| Admin reusable visual components once they are generic | `@treeseed/ui` |
| Theme tokens, app shell controls, public stacked sections, `SurfaceTabs`, cards, badges, key/value lists, responsive tables, disclosures, pagination, confirmations, form controls, charts, status panels | `@treeseed/ui` |
| Site runtime, plugin loading, Astro/Starlight integration, content model wiring | `@treeseed/core` |
| Reconciliation, package workflows, config, hosting graph, provider adapters, managed local dev supervision | `@treeseed/sdk` |
| Backend persistence, API routes, auth backend, assignment coordination, migrations | `@treeseed/api` |
| CLI commands, help, terminal reports, workflow command entrypoints | `@treeseed/cli` |
| Local guarantee review, screenshot/log triage, reviewer notes, and AI workplan packaging | `@treeseed/reviewer` |
| Capacity provider manager/runner runtime, sole-entrypoint AgentKernel execution, activity-profile resolution, and provider images | `@treeseed/agent` |
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
- `admin` owns the Services UI, provider guidance, and browser-side vault ceremonies over SDK contracts.
- `api` owns backend service credentials, database configuration, backend auth, encrypted service envelopes, vault grants, operation leases, provider sessions, assignment leases, mode-run records, and usage settlement. It has no provider-credential decryption path.
- `agent` owns capacity-provider runtime env entries, provider identity/connection and availability-session settings, provider-local lifecycle, and runtime execution settings.
- `market` owns singleton branding, buyer-facing marketplace copy, and its public hosted site manifest. Protected Market deployment authority remains outside Platform.
- `ui` owns no secrets.
- TreeDX owns TreeDX service configuration, auth mode, storage paths, and image workflow credentials.

First-party repositories use one organization-wide credential:

```text
TREESEED_GITHUB_TOKEN
```

Repository-scoped overrides are reserved for imported third-party projects and must not be declared by `treeseed-ai/*` projects.

Public npm package publish tokens belong in the package repository GitHub `production` environment as `NPM_TOKEN`. Deploy-only/private packages may still use GitHub environments for deployment secrets, but they are not part of the public npm release list.

## Ecommerce And Commons Boundary

`@treeseed/admin` is not a buyer checkout or payment package.

The target ecommerce architecture is split by surface. Existing API/Admin commerce code is migration inventory, not target ownership:

- `treeseed-ai/market` owns buyer-facing Market and ecosystem-governance presentation, including the extracted `/market` and `/app/market` families.
- private `treeseed-ai/market-api` owns vendors, products, offers, prices, ownership, stewardship, contributions, ecosystem-governance policies, orders, payment groups, subscriptions, entitlements, refunds, fulfillment, scoped services, capacity listings/inquiries, marketplace aggregation, seller monitoring, webhooks, and commercial-license entitlements under `/v1/market/**`.
- `@treeseed/api` owns hosted or sovereign Admin control-plane state only. Its complete versioned route descriptor is pinned by exact API ref and passed through the singleton gateway without transferring implementation ownership. The gateway admits only descriptor-declared method/path pairs; an arbitrary non-Market `/v1/**` prefix is not a pass-through contract.
- Singleton reconciliation owns only the declared gateway, descriptor, verification, and manifest overlay inside `treeseed-ai/market-api`. Private Market application files are repository-owned: the reconciler bootstraps the extension entrypoint once, preserves all paths outside its manifest, and blocks managed-file drift instead of replacing the private application tree.
- `@treeseed/admin` retains identity, teams, projects, project governance, knowledge, capacity/workday operations, services, secrets, audit, and control-plane administration. It contains no Market implementation after extraction.
- `@treeseed/ui` owns reusable, Stripe-free, theme-native commerce and governance components.

Admin must remain Stripe-free, checkout-free, payout-free, commission-free, and capacity-execution-free. It may link sellers or stewards to root-market buyer flows where appropriate, but it must not initialize Stripe Elements, create PaymentIntents, handle webhooks, or mutate provider execution resources.

Internal deployments must be able to use admin without Treeseed checkout or billing machinery.

The ecommerce model intentionally does not include commissions, application fees, seller payout ledgers, revenue splits, benefit payout allocation, generalized capacity credits, marketplace capacity reservations, marketplace grants, routing decisions, hosted third-party execution, legacy `paid` offer mode, or compatibility aliases. Contributor `benefitWeight` is attribution/governance metadata, not a payout allocation rule.

TreeSeed Commons governance creates participant signal, questions, proposals, votes, delegations, and steward decisions. Registration creates a governance identity, not legal cooperative membership, patronage rights, equity-like claims, or unbounded roadmap authority.

Project and tenant governance is provider-backed. `@treeseed/sdk` owns portable governance contracts and built-in voting math. A selected Admin control plane owns durable project/tenant governance policies, proposal versions, electorates, votes, delegations, events, and immutable decisions; `@treeseed/admin` owns the corresponding project/work UI. Singleton ecosystem governance and commerce-linked stewardship belong to Market. Operational `approval_requests` remain separate from proposal governance and must not be presented as decisions.

## TreeDX Boundary

TreeDX is a generic repository data, storage, query, graph, artifact, and federation service.

TreeDX may store and index files that contain Treeseed content, but it must not interpret Treeseed product concepts such as teams, projects, admin workflows, billing, capacity grants, or marketplace policy. Those meanings belong in SDK, API, admin, market, or agent code.

## Capacity Provider Boundary

Admin and market may display capacity provider state and expose configuration workflows.

`@treeseed/agent` owns provider runtime code, provider images, agent and `platform-operation` provider classes, provider manager/runner services, sole-entrypoint AgentKernel execution, activity-profile and research-stage execution, canonical mode-run lifecycle telemetry, execution-provider adapters, assignment tool-policy intersection, exact-ref worktree/checkpoint behavior, stable assignment-attempt fallback identity, provider-local capacity enforcement, and runtime tests. The provider-local API, duplicate project-runner task queue, manager leases, worker runners, repository claims, runner scale decisions, agent pools, pool registrations, direct worker-pool scalers, and runtime-workday/work-policy/task-credit compatibility stack are retired under resolved CAP-072; providers coordinate outbound with the TreeSeed API assignment lifecycle. `@treeseed/sdk` owns shared contracts, reconciliation, the canonical Drizzle schema, research-source and artifact policy, and pure policy/accounting primitives. `@treeseed/cli` owns developer checkouts and the operator command surface. `@treeseed/api` owns backend control-plane routes and deterministic assignment, lease, reservation, cancellation, usage, settlement, and audit coordination; it executes no tools and owns no repository clone or checkout. TreeDX owns team-governed content repositories; capacity providers own assignment clones.

Provider runtime execution is assignment-only. Do not add provider or project-runner task claim/event/complete/fail HTTP routes, public task clients, or task-queue tables; provider assignments and mode runs are the sole agent execution lifecycle.

Capacity providers supply execution capacity, native budget observations, local runner pressure, availability windows, and execution-provider capabilities. Projects supply agent definitions, agent classes, handlers, prompts, output contracts, and work semantics. The API coordinates the match between project demand and provider supply through durable records; the provider manager only supervises one provider's local runtime.

Human-machine execution provider adapters follow the same boundary. AI providers, deterministic workflow providers, and human issue queue providers are execution surfaces behind capacity providers. Project handlers remain semantic and provider-independent; adapters only perform or coordinate bounded assignment work. See `docs/human-machine-providers.md`.

Infrastructure lifecycle and runtime assignment are separate concerns. `trsd capacity build/up/status/logs/down/test-local` manage provider runtime lifecycle and diagnostics through reconciliation. Provider availability sessions, assignments, leases, mode runs, usage actuals, and ledger entries are API control-plane records, not reconciled infrastructure resources.

## Local Self-Hosting And Discussion Ownership

`@treeseed/sdk` owns immutable configuration-generation contracts, the common `discussion-v1` chat foundation, Discussion model registry contracts, seed desired-graph primitives, multidimensional capacity budgets, and local reconciliation operations. `@treeseed/cli` owns `config`, `run`, and `platform` command presentation; it does not create a second runtime orchestrator. `@treeseed/api` owns authenticated Discussion intake, generic operational scheduling, governance admission, exactly-once settlement, and projection of operational evidence to TreeDX. `@treeseed/agent` owns Codex/OpenCode execution adapters, provider-local cancellation/streaming/usage receipts, prompt enrichment, and completion evidence. `@treeseed/ui` owns reusable dock, timeline, Markdown, file-reference, trace, and meter components; `@treeseed/admin` composes them into authenticated Agent Lab surfaces.

Agent Atlas follows the same boundary. SDK owns portable topology, replay, event, assignment-lineage, context-reference, and authoring contracts. API freezes exact workday topology in existing parameters and owns live/as-of projections over the canonical workday event store. UI owns presentation-only circuit, replay, dock, DAG, and overlay primitives. Admin owns `/app/work`, authenticated adapters, URL/view state, permissions, and Discussion composition. Agent runtime emits complete forensic evidence through existing workday events. HTML studies under `design/` are reference artifacts and are never runtime imports.

Group and supply boundaries are similarly singular. SDK owns project-local group membership/scope/coordination contracts and portable capacity-supply policy and ranking. API resolves group-filtered signal evidence, freezes membership, selects the team provider portfolio, revalidates acting provenance, and durably requeues safe failover generations. Agent class is capacity allocation only. Agent runtime executes the exact provider selection recorded by API and cannot reinterpret groups, select a substitute provider, or create DAG edges.

Discussion sessions, messages, and events remain project content under `src/content/**` or `docs/src/content/**`; neither API nor Admin may introduce Discussion database tables. PostgreSQL may retain only generic workday/assignment records and opaque content refs needed for scheduling and event projection. TreeDX remains product-neutral.

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
| Reviewer local app/workplan packaging | `npm -w packages/reviewer run verify:local` |
| Agent/provider runtime | `npm -w packages/agent run verify:local`, capacity provider runtime tests |
| TreeDX service/image | TreeDX package release gate or targeted TreeDX runbook commands |
| Cross-package integration | affected package verifies plus `npm run check`, `npm run build`, `npx trsd ready local --json` |

## Documentation Style

READMEs are user/adopter/operator first. They should be task-oriented, include concrete commands, explain what the package does not do, and put contributor details near the bottom.

`AGENTS.md` is implementation-rule documentation for humans and AI agents. It should focus on boundaries, workflow discipline, verification, and mutation safety.

Runbooks should contain operational steps, expected outputs, failure modes, and recovery commands.

Design docs should capture intent, architecture, tradeoffs, and current-state notes when older implementation plans are superseded.

## Starter Ownership

The active first-party template repositories are `treeseed-ai/template-engineering` and `treeseed-ai/template-research`. There is no Information Hub repository project; its former knowledge-pack purpose is owned by the Research template.

## Guarantee Ownership

`@treeseed/api` owns endpoint-family guarantees and route descriptor acceptance coverage for every active API endpoint. `@treeseed/admin` and Market UI guarantees should declare dependencies on those API guarantees through `dependsOnGuarantees`. `@treeseed/agent` owns contract-level runtime guarantees and real execution-provider guarantees; no mock or synthetic adapter may claim autonomous execution proof. `@treeseed/reviewer` owns local reviewer guarantees for loading guarantee run artifacts, attaching human notes, copying local evidence, and producing agent-ready workplans.
