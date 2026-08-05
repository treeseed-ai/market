# Treeseed Package Ownership

## Seeded operating environments

`@treeseed/sdk` owns portable seed/runtime-prerequisite contracts, deterministic prerequisite ordering, and local reconciliation. `@treeseed/api` owns durable seed membership claims, verified-email attachment, team/project/TreeDX records, capacity grants, allocations, sessions, and audit events. `@treeseed/agent` remains the only owner of the running provider manager, runner, AgentKernel, and execution-provider adapters. `@treeseed/cli` launches these canonical operations and does not duplicate their lifecycle logic. Scene setup consumes ordered seeds before browser or Agent Lab execution; team-scoped Agent Lab runs retain production records, while ephemeral runs clone and clean isolated resources.

This document is the canonical current-state map for where Treeseed functionality belongs. Use it when deciding where to add code, configuration, documentation, tests, package workflows, or hosting resources.

For capacity-provider and agent completion work, [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md) is the active cross-package execution ledger. It preserves the ownership boundaries in this document while replacing the incomplete single-team registration, allocation, kernel, handler, and starter implementations.

For Guide-specific editorial roles, deterministic layered context, review independence, and exact-revision publication, see [TreeSeed Guide Editorial Agent System](./guide-editorial-agent-system.md).

## System Overview

Treeseed is a unified system made from independently releasable package projects plus the root hosted market tenant.

The root `@treeseed/market` app is the hosted Treeseed-operated site. It composes:

- `@treeseed/core` for the Astro/Starlight runtime and site layering
- `@treeseed/admin` for the distributable administration portal
- `@treeseed/ui` for reusable components and styles
- `@treeseed/api` over HTTP/proxy surfaces for backend control-plane state
- `@treeseed/sdk` through package-owned public APIs for platform primitives
- `@treeseed/agent` through capacity-provider workflows, not in-process runtime imports
- `@treeseed/reviewer` as a local-only operator tool, not a hosted runtime
- `packages/treedx` through SDK/API integration, not product-specific UI code

The root market app owns the real hostable web tenant `treeseed.site.yaml` in this workspace. Deployable package apps may own package-local hostable manifests when they operate an independently released runtime surface; today `packages/api/treeseed.site.yaml` owns the API, operations runner, Treeseed PostgreSQL, capacity-provider service bindings, and public TreeDX federation topology. SDK/CLI workflows compose the root and package manifests into one integrated desired-state graph, but the web and API release pipelines remain independently deployable.

Project architecture is logical, not submodule-first. A project is described by repository identity plus `rootPath`, optional `sitePath`, optional `contentPath`, `contentRuntimeSource`, and `localContentMaterialization`. The Market project uses `sitePath: "."`; first-party package projects default to `sitePath: "docs"` even when a docs site is not prepared yet. Submodules are allowed as one local materialization strategy, but projects should be easy to create from templates and easy to import from live projects without restructuring.

First-party package repositories declare their future project shape in `treeseed.package.yaml` under `projectArchitecture`. That metadata prepares packages for Admin/seed integration without changing package release gates: missing `docs/` sites report `site_not_prepared`, while package CI and publishing continue to follow the manifest's existing `verify`, `releaseGate`, and artifact settings.

Capacity acceptance follows the same independent-project rule. `starters/engineering` and `starters/research` are separately versioned Git repositories selected explicitly by the SDK reconciliation verifier and seeded into separate TreeDX repositories. A live run creates a disposable API project bound to the selected TreeDX repository; it does not turn the Market root into the project or create a synthetic source repository. Agent definitions come from project MDX through TreeDX, while engineering source mutations use exact-ref isolated worktrees in the selected starter checkout.

## Package Responsibility Table

| Package | Audience-Level Purpose | Implementation Ownership |
| --- | --- | --- |
| `@treeseed/market` | Treeseed-operated hosted tenant, docs/content, configuration, and future business-policy presentation | Root app, `treeseed.site.yaml`, content, public messaging, and tenant configuration. It temporarily owns no route files while the UI is redesigned. |
| `@treeseed/admin` | Distributable AGPLv3 identity and team administration foundation | Typed auth/account/team route registry, auth/session and CSRF glue, focused API facades/controllers, five focused account routes including account time-zone selection and session metadata presentation, active-team management, privacy-safe public knowledge-profile composition, and retained non-UI commerce/secret-manager contracts |
| `@treeseed/ui` | Reusable Treeseed UI system | Layout-down Astro/React components, current shell primitives, public stacked-section and knowledge-profile components, tabs, forms, controls, cards, dashboards, CSS/theme primitives, canonical account-time-zone-aware timestamp rendering, and the canonical enhanced form submission, field-validation, and toast lifecycle |
| `@treeseed/core` | Installable Astro/Starlight Treeseed web runtime | Site layering, public content/runtime integration through UI public layouts, tenant config loading, plugin hooks, web-only runtime composition, foreground dev entrypoint delegation; does not own authenticated app chrome, agent scheduling, or provider execution |
| `@treeseed/sdk` | Programmatic platform substrate | Config, reconciliation, workflow engine, hosting graph, package workflow discovery, SDK-managed local dev supervisor, shared contracts, canonical repository identity and custody contracts, graph/content APIs, model-aware content operation contracts/rendering/validation, TreeDX client integration, portable agent-capacity contracts, the canonical TreeDX proxy-handle policy evaluator, and pure native accounting-window policy. SDK owns save/update/stage/close/release/recover/worktree safety; `stage` must merge staging down before mutation, preserve failed feature branches/worktrees, and clean up only after staging refs are verified. |
| `@treeseed/api` | Deployed backend control-plane API | Hono API, package-local backend `treeseed.site.yaml`, PostgreSQL adapter/migrations, backend auth/provider state/reauthentication, account policy and time-zone persistence, trusted session client metadata, personal themes, notification projections/outbox, operation lifecycle, operations runner, one strict capacity mutation request-object boundary, governed workday scheduling as a read-only policy consumer, exact run-owned workday envelopes and required scheduling-failure recovery, one request-scoped durable demand compiler and assignment function, engineering graph/review projection, finite cyclic eleven-stage research workflow coordination with durable review-attempt and limit-blocked projection, typed admission/demand/participation/repository/lease/lifecycle services, strict workday-run and usage-evidence persistence, one lease-authority evaluator, one settlement-before-transition workday terminalizer, durable pre-admission capacity audit evidence, assignment-scoped idempotent mode-run/fallback persistence, token-owned admission/sole task-usage settlement transactions, recoverable post-admission TreeDX workspace/handle provisioning and authorization, reservation/phase-unique capacity ledger coordination, native-window reservation/settlement aggregation, and bounded diagnostic evidence |
| `@treeseed/cli` | Human/operator command surface | `treeseed`/`trsd` command parsing, help, command handlers, terminal reporting, workflow entrypoints over SDK/Core/Agent. CLI exposes stage options and reporting but must not reimplement SDK-owned save/stage/release orchestration. |
| `@treeseed/reviewer` | Local guarantee run review and AI workplan packaging | Standalone local web app, guarantee run selection/review UI, reviewer notes, evidence browsing, copied local evidence bundles, directive/workplan schemas, and Codex-ready handoff packages. It invokes existing CLI guarantee commands and must not own guarantee execution or release gating. |
| `@treeseed/agent` | Capacity-provider and agent runtime | Provider manager/runner runtime, sole-entrypoint AgentKernel execution, canonical mode-run lifecycle telemetry, activity-profile and research-stage resolution, execution-provider adapters, required replay-safe provider telemetry delivery, assignment-scoped fail-closed tool catalogs, model-aware content and governed research tools, exact-ref worktree/checkpoint execution, provider-local capacity enforcement, runtime images/templates |
| `packages/treedx` | Generic repository data/index/query service consumed by Treeseed | TreeDX API, storage, Git/repository graph/indexing, federation, Docker image, language SDKs; no Treeseed product semantics |

### Book knowledge ownership

- `@treeseed/sdk` owns `treeseed.book/v2`, `treeseed.knowledge-page/v1`, book-collection and immutable knowledge-pack contracts, derived routes, content-sync safety, and deterministic snapshot artifacts.
- `@treeseed/ui` owns reusable library, outline, authoring, review, relationship, and pack presentation. Admin routes compose these primitives and do not create page-local editor or collection systems.
- `@treeseed/core` owns the single Starlight-based reader and the policy-filtered published-content consumption boundary.
- `@treeseed/admin` owns authenticated authoring, review, linking, publication, and pack workbench routes over API contracts.
- `@treeseed/api` owns authorization, TreeDX workspace/review/publication orchestration, workflow metadata, operations-runner execution, and policy-filtered knowledge APIs. Markdown remains in Git and TreeDX rather than PostgreSQL.
- Knowledge delivery performance follows the same boundary: SDK owns compact wire and hosting-resource contracts; API owns incremental publication, authorization projections, and bounded publication-object loading; Core owns anonymous reader request coalescing; Admin must preserve shared-cache eligibility for public responses; TreeDX owns repository, graph, storage-index, worker-pool, and profiler performance. No layer may compensate by adding a second content-serving path.
- `@treeseed/cli` owns `trsd content sync`; the SDK owns its exact-ref comparison and fast-forward-only mutation policy.
- Git is canonical history, TreeDX is the operational content and graph plane, and PostgreSQL stores workflow metadata. An atomic published manifest is the required serving plane but is still release-blocking; exact-ref runtime reads are not accepted as a substitute. The removed filesystem book exporter is not a supported fallback.
- `@treeseed/sdk` owns the editorial context, audience declaration, and structured editorial review contracts; `@treeseed/agent` owns TreeDX-backed context resolution and trace provenance; `@treeseed/api` owns independent editorial review state and exact-revision publication enforcement; root Market content owns the Guide agents, editorial cores, chapter briefs, and evidence.
- Repository custody is physical as well as logical. Developer checkouts, capacity-provider assignment checkouts, operations-runner integration checkouts, and TreeDX repository workspaces never share a writable checkout, Git common directory, or service volume. SDK contracts normalize repository identity; Agent owns provider-local materialization; API owns durable operation claims; the operations runner owns integration execution; TreeDX owns its product-neutral repository store.

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
reviewer -> cli + sdk + ui
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
- `reviewer` may depend on `cli`, `sdk`, and `ui`; it must remain local-only and must not become a release gate or hosted control plane.
- `agent` may depend on `sdk`; it must not depend on `core`, `admin`, root market, or API implementation.
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
| Treeseed tenant messaging, docs content, and future redesigned business pages | root market |
| Authentication, account, team management, active-team selection, invitations, and public user/team identity profiles | `@treeseed/admin` |
| Public homepage, books, and Knowledge Hub content during the redesign foundation | `@treeseed/core` |
| Commerce backend records, route orchestration, Stripe server calls, webhooks, refunds, fulfillment, seller monitoring, Commons governance APIs | `@treeseed/api` |
| Theme-native commerce/governance panels, cards, timelines, and status components | `@treeseed/ui` |
| Generic admin pages, host/project/team/work/knowledge screens, admin middleware | `@treeseed/admin` |
| Admin reusable visual components once they are generic | `@treeseed/ui` |
| Theme tokens, app shell controls, public stacked sections, `SurfaceTabs`, cards, badges, key/value lists, responsive tables, disclosures, pagination, confirmations, form controls, charts, status panels | `@treeseed/ui` |
| Site runtime, plugin loading, Astro/Starlight integration, content model wiring | `@treeseed/core` |
| Reconciliation, package workflows, config, hosting graph, provider adapters, managed local dev supervision | `@treeseed/sdk` |
| Backend persistence, API routes, auth backend, operations runner, migrations | `@treeseed/api` |
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
- `api` owns backend service credentials, database configuration, operations runner secrets, backend auth, encrypted service envelopes, vault grants, operation leases, provider sessions, assignment leases, mode-run records, and usage settlement. It has no provider-credential decryption path.
- `agent` owns capacity-provider runtime env entries, provider identity/connection and availability-session settings, provider-local lifecycle, and runtime execution settings.
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

- root Market remains the policy owner for future redesigned buyer-facing marketplace and Commons presentation, but currently owns no route files.
- `@treeseed/api` owns backend ecommerce and Commons state: vendors, products, offers, prices, ownership, stewardship, contributions, governance policies, orders, payment groups, subscriptions, entitlements, refunds, fulfillment, scoped services, capacity listings/inquiries, marketplace aggregation, seller monitoring, webhooks, and governance events.
- `@treeseed/admin` retains generic HTTP/API and extension contracts for seller, governance, secret-manager, and operations domains, but their legacy presentation routes are retired redesign targets.
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

`@treeseed/agent` owns provider runtime code, provider images, provider manager/runner services, sole-entrypoint AgentKernel execution, activity-profile and research-stage execution, canonical mode-run lifecycle telemetry, execution-provider adapters, assignment tool-policy intersection, exact-ref worktree/checkpoint behavior, stable assignment-attempt fallback identity, provider-local capacity enforcement, and runtime tests. The provider-local API, duplicate project-runner task queue, manager leases, worker runners, project-runner repository claims, runner scale decisions, agent pools, pool registrations, direct worker-pool scalers, and runtime-workday/work-policy/task-credit compatibility stack are retired under resolved CAP-072; providers coordinate outbound with the TreeSeed API assignment lifecycle. `platform_repository_claims` remains solely an operations-runner workspace lifecycle and must not be reused for agent capacity. `@treeseed/sdk` owns shared contracts, reconciliation, the canonical Drizzle schema for planning/decision-graph/deliverable/demand/participation/research-workflow persistence, typed finite research revision policy, research-source and artifact policy, pure policy/accounting primitives, and the supervised assignment-checkpoint integration operation. `@treeseed/cli` owns the operator command surface, including bounded capacity-audit inspection, tick/cancel/requeue operations, and the explicit `checkpoint-integrate` plan/execute handoff; it does not publish the result. `@treeseed/api` owns backend control-plane routes, one strict capacity request-object boundary, provider availability sessions, one request-scoped durable demand compiler, one assignment function, engineering graph and finite cyclic research workflow coordination, project-authorized selected-deliverable-manifest reads, typed admission/demand/participation and strict workday/assignment/usage persistence/lease/lifecycle services, fail-closed TreeDX project-context compilation, governed scheduling with exact run-owned envelopes and required recovery evidence, the sole lease-authority evaluator, durable pre-admission audit evidence, required replay-safe mode-run/fallback records, reservations, the sole task-usage writer inside capacity ledger settlement, one workday terminalization/recovery primitive, SQL accounting aggregates, and bounded diagnostic evidence windows.

Provider runtime execution is assignment-only. Do not add provider or project-runner task claim/event/complete/fail HTTP routes, public task clients, or task-queue tables; provider assignments and mode runs are the sole agent execution lifecycle.

Capacity providers supply execution capacity, native budget observations, local runner pressure, availability windows, and execution-provider capabilities. Projects supply agent definitions, agent classes, handlers, prompts, output contracts, and work semantics. The API coordinates the match between project demand and provider supply through durable records; the provider manager only supervises one provider's local runtime.

Human-machine execution provider adapters follow the same boundary. AI providers, deterministic workflow providers, and human issue queue providers are execution surfaces behind capacity providers. Project handlers remain semantic and provider-independent; adapters only perform or coordinate bounded assignment work. See `docs/human-machine-providers.md`.

Infrastructure lifecycle and runtime assignment are separate concerns. `trsd capacity build/up/status/logs/down/test-local` manage provider runtime lifecycle and diagnostics through reconciliation. Provider availability sessions, assignments, leases, mode runs, usage actuals, and ledger entries are API control-plane records, not reconciled infrastructure resources.

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

The active first-party starter set is `engineering` and `research`. `information-hub` is not an active starter; its knowledge-pack packaging purpose is currently owned by the research starter. Starter catalog, release graph, and template validation must not reintroduce `information-hub` without a new product decision and distinct deterministic packaging workflow.

## Guarantee Ownership

`@treeseed/api` owns endpoint-family guarantees and route descriptor acceptance coverage for every active API endpoint. `@treeseed/admin` and Market UI guarantees should declare dependencies on those API guarantees through `dependsOnGuarantees`. `@treeseed/agent` owns contract-level runtime guarantees and real execution-provider guarantees; no mock or synthetic adapter may claim autonomous execution proof. `@treeseed/reviewer` owns local reviewer guarantees for loading guarantee run artifacts, attaching human notes, copying local evidence, and producing agent-ready workplans.
