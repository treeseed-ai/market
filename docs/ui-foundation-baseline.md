# UI Foundation Baseline

This is the reusable UI foundation baseline for `@treeseed/ui`.

## Accessibility Baseline

- Shells preserve a skip link to `#main-content`, one primary navigation landmark, and visible focus treatment through `--ts-*` tokens.
- `AuthShell`, public single-column shell behavior, authenticated app shell behavior, and operational market shell behavior accept `helpContext` and `feedbackContext` without requiring route-local help or feedback UI. Contextual help and feedback are shell-level shared components.
- Shell help drawers use dialog semantics, visible labels, Escape dismissal, focus entry, and focus return to the opener.
- Help content must be policy-safe before it reaches the browser. Private topic titles, snippets, disabled-action remediation, and search data are resolved in route/controller/view-model code, not by raw client-side role checks.
- `ActionBar` exposes a named navigation region, renders hidden actions as absent, and renders unavailable actions as disabled controls with visible reason text.
- `PermissionBoundary` renders normal content for `allowed` and `readOnly`, and uses an `EmptyState` for denied, setup-required, entitlement, sign-in, or upgrade states.
- Templates must receive resolved actions and permission states from route/controller/view-model code. They must not infer access by reading raw roles.
- Collection rows must remain readable without color. Status and metadata are text-first, with badge color as supplemental styling only.
- Route pages keep page headings in the shell or template and avoid duplicate hero-scale headings inside nested panels.
- `DashboardTemplate` renders context, status, setup/readiness, next actions, primary resources, alerts, and recent activity from a resolved `DashboardViewModel`. It is not a provider console and must not render unresolved raw service objects.

## Bundle Budget Baseline

- The foundation is Astro-first and static by default. Templates, cards, action bars, and permission boundaries must not hydrate client JavaScript.
- Help search, screenshot capture, overlay editing, and rich schema editors must be lazy-loaded behind explicit user actions or route-level need. Phase 6 help search loads only after search focus/input.
- Feedback screenshot capture remains opt-in and lazy-loaded after explicit capture intent.
- Shared shells may include only lightweight theme and appearance behavior already required by product/auth/public surfaces.
- `@treeseed/ui` foundation contracts and templates must not import admin, core, market, API, or agent implementation.
- Template components must not call `fetch`, import service facades/API clients, read `Astro.request`, or perform raw role checks.
- Dashboard routes must keep expensive charting, monitoring, search, editor, screenshot, and overlay interactions out of the base shell/template bundle unless the user explicitly opens that surface.
- Distribution routes use `DistributionSummary` and `OverlayStatus` for release/listing/entitlement/delivery/overlay state. Overlay editor/session modules must remain dynamically imported only after explicit authorized edit intent.

## Route Convention

`/app/work/questions` is the Phase 1 proof route.

- The Astro route owns authentication redirects and calls existing view-model/data loaders.
- The route-local mapper `packages/admin/src/view-models/ui-foundation/questions.vm.ts` converts loaded governance, knowledge, and content data into `PageViewModel`, collection rows, resolved actions, help context, and feedback context.
- `TreeseedAppLayout` composes the current authenticated app shell primitives and passes shell-level help/feedback context through.
- `CollectionTemplate` renders the primary question collection from view-model data. `PermissionBoundary` renders the resolved read state before the template.
- Service calls stay outside UI templates. Templates receive display-ready data and resolved actions only.

## Contextual Dashboard Convention

Phase 7 proves `DashboardTemplate` on `/app`, `/app/teams`, `/app/projects/[projectId]`, and `/market`.

- Dashboard routes answer the canonical UI architecture questions: where am I, what is this about, what can I do here, and what changed recently.
- Route/controller/view-model code resolves actor context, scope, resource counts, policy-safe actions, help context, feedback context, alerts, and recent activity before rendering the template.
- `DashboardTemplate` is shared `@treeseed/ui` UI. It must not import admin/core/API/agent implementation, call services, inspect roles, or render private identifiers.
- Personal, team, project, market, seller, and services dashboards are current active surfaces. They replace the older controls-first Start guidance while preserving focused drilldown routes for Hosts, Projects, Capacity, Work, and Knowledge.

## Service Readiness Convention

Phase 8 proves service readiness on `/app/services`, `/app/hosts`, and `/app/capacity/providers`.

- `/app/services` is the team-scoped dashboard for hosts, integrations, capacity providers, credentials, diagnostics, and recovery paths.
- Hosts and capacity providers are resource drilldowns that use `CollectionTemplate`, `DetailTemplate`, and `SettingsTemplate`; old service `/edit` routes are removed.
- `ReadinessSummary` renders policy-safe setup and diagnostic states. Advanced diagnostics remain linked from Services and provider details instead of dominating ordinary dashboards.

## Operating Loop Convention

Phase 9 proves the recurring operating loop on `/app/work`, direction resource families, allocation drilldowns, project workdays, workday runs, agents, and `/app/work/review`.

- Work is the primary rail target at `/app/work`. Direction collections are drilldowns, not the default product landing point.
- Direction resources use explicit route controllers and canonical collection/detail/settings templates. Generic `/app/work/[collection]/*` handlers are removed.
- Allocation display uses `AllocationPanel`, `AllocationTree`, `AllocationStateLegend`, and `DynamicPieAllocationInput` so desired allocation, inherited limits, overrides, reservations, assignments, and actual usage are text-visible and distinct.
- Workday and agent workspaces use `WorkspaceTemplate` with `WorkQueueSummary`, `ActivityTimeline`, optional allocation context, and related resources.
- Review queues use status language that distinguishes running, waiting, blocked, failed, completed, and needs-review outcomes.
- Admin route controllers call admin view models and small route-scoped client helpers. Shared templates and `@treeseed/ui` operating components must not call services, inspect raw roles, schedule providers, or render credentials/private identifiers.

## Knowledge Distribution Convention

The distribution loop is represented on `/app/knowledge`, app knowledge drilldowns, seller readiness, and public marketplace acquisition routes.

- `/app/knowledge` is the team Knowledge distribution dashboard. It is not a redirect to artifacts.
- App knowledge surfaces use explicit route controllers, `TreeseedAppLayout`, shell help/feedback, and `DashboardTemplate`, `CollectionTemplate`, `DetailTemplate`, or `SettingsTemplate`.
- Marketplace acquisition routes under `/market/knowledge-packs/*` and `/market/templates/*` use `TreeseedOperationalMarketLayout`, canonical templates, shell help/feedback, and entitlement-aware action summaries.
- `DistributionSummary` renders release/listing/package/template/capability/import state with text-visible status, entitlement, delivery, and action labels.
- `OverlayStatus` may expose only policy-safe overlay state. Editor/search bundles are lazy-loaded by `overlay-loader.ts` only after authorized user intent.
- Route templates must not call services, inspect roles, expose raw R2 keys/private URLs, render credentials, or link direct artifact URLs before policy resolution.
- Root `/templates/*` and artifact redirect compatibility routes are removed; canonical marketplace and app knowledge routes own the surface.

## Contextual Help Convention

Contextual help is represented on `/knowledge/*` and `/app/work/questions`.

- Public Knowledge Hub help is resolved by the Core runtime reader view model from the current runtime/local document and navigation metadata, then passed through Core public layouts to public shell behavior.
- Product questions help is resolved by the admin questions view-model mapper from capability metadata, resource schema, route template, and resolved action states, then passed through `TreeseedAppLayout` to authenticated app shell behavior.
- The shared help drawer embeds only policy-safe topics, topic links, and resolved actions. Its scoped search filters that embedded payload after explicit user intent.
- Help-to-feedback handoff reuses the shared feedback dialog and passes only topic id/title, route pattern, capability id, shell, context, resource type, and safe resource id.
- Broad private help search, help authoring, analytics, notifications, and route-wide help coverage are later-phase work.
