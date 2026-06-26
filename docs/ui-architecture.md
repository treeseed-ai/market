# TreeSeed UI Architecture

## Canonical Status

This document is the timeless canonical architecture for TreeSeed human-facing UI surfaces across the root `@treeseed/market` tenant, `@treeseed/admin`, `@treeseed/core`, and `@treeseed/ui`.

It governs UI shape, page anatomy, reusable components, layout shells, page templates, capability metadata, UI resource schemas, policy display states, accessibility, performance, and design governance. Machine/API endpoints are out of scope except where UI view models, action forms, content proxies, or service controllers consume them to render or mutate a human-facing page.

Implementation sequencing belongs in [UI Migration](./ui-migration.md). Package boundaries belong in [Package Ownership](./package-ownership.md). Design tokens and reusable component ownership are also supported by [TreeSeed UI Theme And Components](./ui-components.md). Control-console product IA context remains in [TreeSeed Control App UI Specification](./market_ui_spec.md), but future UI architecture decisions must align with this document.

Focused operational specs define cross-cutting runtime details:

- [Content Runtime Architecture](./content-runtime-architecture.md)
- [Auth And Content Proxy](./auth-and-content-proxy.md)
- [Overlay Editing Architecture](./overlay-editing-architecture.md)
- [Notification Architecture](./notification-architecture.md)

This document is a binding architecture standard. New UI work must follow the canonical stack, default shells, default templates, UI schemas, capability metadata, policy model, accessibility requirements, performance budgets, package ownership rules, and enforcement rules defined here.

## Purpose

TreeSeed must evolve from handcrafted page surfaces into a unified, service-design-centered UI system for managing, growing, reviewing, publishing, and distributing durable knowledge.

The product must not be built as isolated pages with custom layout, custom components, custom permissions, and custom actions. The product must be built as contextual capabilities rendered through shared shells, templates, UI schemas, policy resolution, and reusable UI components.

The core principle is:

```text
Every page is a contextual rendering of a capability inside a scope.
```

Every meaningful TreeSeed page must help users understand:

```text
Where am I?
What is this about?
What can I do here?
What changed recently?
```

Those four questions drive page anatomy, navigation, action placement, permissions, empty states, responsive behavior, and service journeys.

## Target Architecture Stack

Future UI work must follow this stack:

```text
Capability Registry
  -> Route Context
  -> Policy Context
  -> Layout Shell
  -> Page Template
  -> Domain Components
  -> Primitive Components
```

### Capability Registry

Responsibility: define user-facing capabilities, route identity, scope, template, resource type, navigation, actions, empty states, search facets, responsive behavior, audit events, analytics events, command entries, and optional overlay support.

Owner: package-owned capability modules composed into a product registry:

```text
@treeseed/admin/capabilities
@treeseed/core/capabilities
@treeseed/market/capabilities
```

Allowed dependencies: SDK/API public contracts, package-owned route metadata, UI schema definitions, policy/action identifiers.

Forbidden responsibilities: fetching live page data, rendering UI, mutating providers, or becoming one giant global map that every package edits directly.

Explicit route controllers remain preferred during early migration. `PageFromCapability` is a later optimization after three to five similar resources prove the same loading, policy, error, cache, hydration, and rendering shape.

### Route Context

Responsibility: resolve URL params, current principal, active team, active project, market asset, resource identity, query params, request mode, and content/runtime source.

Owner: `@treeseed/admin` for product/auth/market control routes, `@treeseed/core` for content/runtime routes, root `@treeseed/market` for tenant overrides.

Allowed dependencies: Astro context, package route params, API facades, content runtime utilities, session helpers.

Forbidden responsibilities: visual layout, raw role-based rendering decisions, long-lived business logic, or reusable component state.

### Policy Context

Responsibility: resolve permissions, action states, entitlements, setup requirements, object lifecycle constraints, visibility, confirmation requirements, and remediation guidance.

Owner: `@treeseed/admin` for browser-facing admin policy adapters; `@treeseed/api` owns authoritative backend authorization; `@treeseed/sdk` may own portable policy/action contracts when shared across CLI/UI/API.

Allowed dependencies: principal, roles, permissions, membership, resource state, entitlements, setup state, API authorization results.

Forbidden responsibilities: rendering buttons directly, hiding content through scattered template conditionals, or becoming a hidden scheduler or infrastructure orchestrator.

### Layout Shell

Responsibility: provide the structural frame for auth, public, and authenticated product contexts.

Owner: `@treeseed/ui` for reusable shells; `@treeseed/admin` may own thin TreeSeed-specific composition wrappers until equivalent shell configuration is available in UI.

Allowed dependencies: UI tokens, theme utilities, navigation items, actions, resolved appearance, context summary.

Forbidden responsibilities: resource fetching, mutation logic, route-specific forms, or page-specific CSS systems.

### Page Template

Responsibility: render repeatable page archetypes such as dashboard, profile, collection, detail, reader, workspace, settings, and wizard.

Owner: `@treeseed/ui`.

Allowed dependencies: view models, resolved actions, navigation, slots declared by the capability registry, UI schemas.

Forbidden responsibilities: direct API calls, raw role checks, package-specific workflow orchestration, or route-local layout inventions.

### Domain Components

Responsibility: render TreeSeed concepts such as projects, knowledge objects, agents, workdays, releases, listings, hosts, capacity providers, allocation, deployment, and content overlays inside templates.

Owner: `@treeseed/ui` when reusable; `@treeseed/admin` while specific to one route or not yet generalized.

Allowed dependencies: typed view models, display-only domain metadata, resolved actions.

Forbidden responsibilities: service fetching, policy evaluation, mutation side effects, or custom shell/layout behavior.

### Primitive Components

Responsibility: render domain-neutral layout, typography, controls, overlays, forms, states, and interaction primitives.

Owner: `@treeseed/ui`.

Allowed dependencies: tokens, theme utilities, accessibility helpers.

Forbidden responsibilities: TreeSeed product semantics, service calls, business policy, route awareness, or package-specific behavior.

## Package Ownership

- `@treeseed/ui`: tokens, primitives, components, patterns, layouts, templates, reusable domain UI components, theme utilities, React widgets, and shared UI behavior.
- `@treeseed/admin`: route controllers, admin view models, policy/action resolution adapters, auth/session glue, API facades, temporary route-local composition, and admin-specific pages while they migrate.
- `@treeseed/core`: site runtime, content route injection, plugin/layering, tenant config loading, Starlight/docs integration, public content rendering runtime, and public content utilities.
- root `@treeseed/market`: hosted tenant, public site content, page overrides, Treeseed branding, marketplace business messaging, public acquisition pages, and future ecommerce presentation.
- `@treeseed/sdk` and `@treeseed/api`: contracts, data, reconciliation, authorization, operation lifecycle, and control-plane behavior. They must not own UI composition.

## Surface Contexts

TreeSeed has five surface contexts. They are not separate apps. They are contextual render modes for one component system.

### Public Context

Purpose: anonymous browsing, public profiles, public projects, public books, marketplace listings, discoverable knowledge, and public pages inside private projects.

Examples: `/`, `/market`, `/market/templates`, `/market/knowledge-packs`, `/u/:userSlug`, `/t/:teamSlug`, public content routes, future `/explore`, future `/search`.

Users must understand: what they are viewing, why it is credible, what they can inspect, and what public action is available.

Navigation behavior: `PublicShell`, public navigation, discovery/search entry, sign-in/register prompts when useful.

Access behavior: anonymous visitors can read public content and public listings; signed-in users receive contextual actions such as open in Manager, import, install, save, follow, or edit if policy allows.

### Personal Context

Purpose: personal mission control, account settings, connected accounts, notifications, saved assets, sessions, and profile management.

Examples: `/app`, `/me`, `/app/account`, future personal dashboard, future saved assets.

Users must understand: who they are signed in as, what needs attention, which teams/projects are available, and what changed recently.

Navigation behavior: `ProductShell` with personal/account entries, command palette, notifications, context switcher, and account menu.

Access behavior: signed-in principal only.

### Team Context

Purpose: team profile, team dashboard, members, roles, invites, team knowledge library, hosts, capacity, billing, allocation, and team-level settings.

Examples: `/app/teams`, `/app/teams/:teamId/...`, future `/t/:teamSlug/...`.

Users must understand: active team, team role, team readiness, team projects, team notifications, allocation summary, and team-level actions.

Navigation behavior: `ProductShell`, team switcher, generated team navigation, contextual side nav.

Access behavior: signed-in team members see team-scoped content; team owners/admins receive management actions through policy resolution.

### Project Context

Purpose: guidance, objectives, questions, notes, books, people, agents, decisions, proposals, workdays, artifacts, releases, hosts, capacity, deployments, allocation, notifications, and project settings.

Examples: `/app/projects/:projectId`, future `/t/:teamSlug/p/:projectSlug/...`.

Users must understand: active project, project visibility, project readiness, content runtime state, deployment state, allocation state, recent activity, and next useful action.

Navigation behavior: generated project navigation grouped by knowledge, work, releases, settings, and advanced operations.

Access behavior: anonymous users may see public project content; signed-in project members see private/project-scoped content and actions based on role and policy.

### Market Context

Purpose: discovery, listing pages, templates, knowledge packs, asset install/download/import, seller onboarding, seller listings, and paid/free distribution.

Examples: `/market`, `/marketplace`, `/market/products/:productId`, `/cart`, `/checkout/:checkoutId`, `/capacity/*`, `/services/*`, `/market/templates`, `/market/knowledge-packs`, `/app/market/seller`, and `/app/teams/:teamId/commerce`.

Users must understand: what the asset is, who produced it, what it costs or requires, whether they are entitled to it, and how to use it.

Navigation behavior: `PublicShell` for public market discovery; `ProductShell` for seller and authenticated management surfaces.

Access behavior: anonymous visitors can inspect public listings; install/download/import/seller actions are entitlement- and policy-aware.

## Commerce, Commons, And Platform Stewardship Capability Families

Ecommerce, Commons governance, and platform stewardship are first-class capability families in the canonical UI stack. They are not standalone client mini-apps and must not own visual shells, browser-side authority, direct template fetches, or page-local styling systems.

### Commerce Capability Family

Commerce spans public buyer discovery, checkout, scoped services, capacity inquiries, ProductShell seller readiness, and platform steward review.

Canonical public routes use `PublicShell` through the TreeSeed public layout:

- `/marketplace` renders a marketplace dashboard and listing collection.
- `/market/products/:productId` renders a product detail page with buyer-visible offers, ownership, stewardship, and resolved actions.
- `/cart` and `/checkout/:checkoutId` render checkout dashboards/details. Stripe.js is allowed only in the tiny payment-confirmation helper after the server has resolved checkout and payment group state.
- `/capacity`, `/capacity/:listingId`, `/services/new`, `/services/:requestId`, and `/services/:requestId/checkout` render through collection, detail, and settings templates with API-authoritative service/capacity state.

Canonical authenticated routes use `ProductShell`:

- `/app/market/seller` renders the seller dashboard.
- `/app/teams/:teamId/commerce` renders team seller readiness, Stripe status, ownership evidence, marketplace governance, and required next actions.

Commerce view models may display seller readiness, entitlement state, checkout/payment group state, ownership/stewardship summaries, service quote state, capacity inquiry state, and audit/status timelines. The UI never trusts client-provided seller, price, amount, connected account, entitlement, fulfillment, or ownership terms. Mutations use resolved action states such as `requiresSignIn`, `requiresEntitlement`, `requiresSetup`, `readOnly`, `disabledWithReason`, and `allowed`, then submit to API-authoritative endpoints.

### Commons Governance Capability Family

Commons governance spans anonymous public reading, signed-in participant actions, and steward ProductShell operations.

Canonical public routes use `PublicShell`:

- `/commons` renders Commons dashboard signal.
- `/commons/proposals/:proposalId` renders proposal detail, vote/backing signal, timeline, and policy-safe actions.
- `/commons/proposals/new` and `/commons/questions/new` render settings/form templates whose submissions flow through route controllers and API authority.

Canonical steward routes use `ProductShell`:

- `/app/commons` renders the steward dashboard for participant questions, proposals, voting signal, decisions, and governance events.

Commons participation is advisory governance. It is not legal membership, payout governance, automatic roadmap authority, or operational scheduling. UI view models display proposal state, backing/vote signal, decision state, stewardship events, and resolved participant/steward actions. API persistence remains authoritative for participants, weights, votes, decisions, and audit events.

### Platform Stewardship Capability Family

Platform stewardship covers deliberate review of seller readiness, public listings, release/distribution state, Commons decisions, capacity inquiries, service disputes, entitlement exceptions, and operational safety concerns. Steward actions are ProductShell dashboards/details/settings with audit timelines and policy snapshots. They must be deliberate review actions, never hidden browser mutations or role checks embedded in templates.

## Canonical Shells

The following shells are the canonical default shells. All pages must start from these shells. A page may use a new shell only when the capability declares an exception with design rationale, owner, review date, accessibility/performance obligations, and promotion path back into reusable patterns.

### `AuthShell`

Used by auth and device approval flows.

Required regions:

- centered form area
- brand/context panel
- minimal navigation
- help/recovery links
- security messaging
- lightweight feedback/help link when the user cannot complete auth

Rules:

- Auth pages must use `AuthShell`.
- Auth pages must not use product navigation.
- Auth pages must preserve selected appearance and security messaging.
- Auth forms must use reusable form primitives and standard error/loading states.

### `PublicShell`

Used by anonymous and public-facing surfaces.

Required regions:

- public navigation
- search/discovery entry
- public profile/listing/project/page rendering
- contextual help action
- global feedback action
- call-to-action area
- footer
- SEO/open graph metadata
- optional sign-in/register prompts

Rules:

- Public pages must use `PublicShell` unless rendered by Core public content layouts normalized under public shell behavior.
- Public pages must not duplicate product app navigation.
- Public calls to action must be resolved through policy/action state when the action depends on identity or entitlement.

### `ProductShell`

Used by authenticated app surfaces.

Required regions:

- app navigation
- context switcher
- breadcrumbs
- command palette
- search
- contextual help action
- notifications
- global feedback action
- account/team switcher
- contextual side navigation
- mobile drawer or bottom navigation
- main content region
- optional right-side context rail

Rules:

- Authenticated product pages must use `ProductShell`.
- Product shell variants must be configuration, not separate shell implementations.
- Team, project, seller, and platform admin modes must come from context and policy, not independent app shells.

## Canonical Page Templates

The following templates are the canonical default page templates. New user-facing pages must start from one of them. A complex page may use custom domain composition only inside a standard shell/template and only when the capability registry declares an exception with owner, rationale, review date, accessibility/performance obligations, and promotion path.

### `DashboardTemplate`

Purpose: summarize a scope and drive users to the next useful action.

Reusable pieces:

- context summary
- status summary
- recent activity
- suggested next actions
- primary object cards
- alerts
- setup progress
- metrics
- work queue
- notification summary
- deployment/readiness summary when relevant
- allocation summary when relevant
- empty state

Required context contract: every dashboard must declare active scope, primary resource, actor context, role/action context, recent changes, setup/readiness state, next recommended actions, and relevant alerts. A dashboard without resolved context is not a dashboard; it must become public content, a profile, or a collection/detail page.

Dashboard context by surface:

- personal dashboard: active principal, active team/project suggestions, saved assets, notifications, recent sessions, next actions
- team dashboard: team profile/status, team projects, members/invites, team notifications, portfolio allocation summary, billing/setup status, recent activity
- project dashboard: project profile/status, knowledge readiness, deployment status, content runtime state, overlay status, workdays, releases, allocation summary, recent activity
- market dashboard: discovery/search context, listing categories, entitlements, install/import actions, seller state when signed in
- seller dashboard: seller profile/status, listings, releases, sales/downloads, review queue, payout/setup state

Must not be customized page-by-page: metric styling, alert pattern, empty setup flow, activity feed, notification summary, allocation summary, deployment summary, and action placement.

### `ProfileTemplate`

Purpose: render public or private identity/resource profile pages.

Reusable pieces: profile header, avatar/logo, bio/description, credibility signals, featured projects, featured releases, public books/knowledge, contact/follow actions, role-aware edit controls.

### `CollectionTemplate`

Purpose: render repeatable lists of resources.

Reusable pieces: collection header, search, filters, sort, card/list/table toggle, bulk actions, empty state, create/import action, pagination/infinite loading, permission-aware action bar.

`CollectionTemplate` is the highest-leverage template. It must be used for repeated resources such as objectives, questions, notes, people, agents, books, projects, teams, releases, marketplace listings, hosts, capacity providers, members, invites, artifacts, workdays, decisions, and proposals.

### `DetailTemplate`

Purpose: render one resource in view/edit/review context.

Reusable pieces: detail header, status/visibility, metadata, main body, related objects, activity timeline, comments/review, actions menu, edit/view mode switch, context panel.

### `ReaderTemplate`

Purpose: render long-form knowledge and documentation-like project content.

Reusable pieces: book navigation, page table of contents, page body, previous/next page, related knowledge, citation/source area, edit page action, public/private rendering mode.

Starlight-style reader UI may be used as an implementation adapter, but reader data in staging and production must come from runtime content manifests. Reader behavior must not require a software rebuild for content changes.

Authenticated content management overlays may be exposed through `ContentManagementOverlaySlot` only after Market session validation and team/project policy resolution. Anonymous reader pages must not load overlay/editor bundles or write-path client logic.

### `WorkspaceTemplate`

Purpose: render active project work, review, analysis, approval, or diagnostics.

Reusable pieces: project navigation, main working canvas, guidance/action panel, related context panel, agent/workday status, recent changes, draft/review states, approval actions.

### `SettingsTemplate`

Purpose: render configuration, preferences, setup state, and danger zones.

Reusable pieces: settings section navigation, form sections, save/cancel controls, inline validation, permission gates, danger zone, audit references, setup status.

### `WizardTemplate`

Purpose: render multi-step flows with validation and resumability.

Reusable pieces: stepper, current step body, review step, validation summary, back/next/finish actions, save draft/resume later, setup checklist, success screen with next action.

## UI Architecture Maturity Model

Routes migrate incrementally. A legacy route does not need to jump directly to full schema/registry automation.

- **Level 0:** Legacy route, no new sprawl allowed.
- **Level 1:** Uses canonical shell and UI primitives.
- **Level 2:** Uses canonical template.
- **Level 3:** Uses resolved actions and policy display states.
- **Level 4:** Has capability registry entry.
- **Level 5:** Uses UI resource schemas for collection/detail/create/edit flows.
- **Level 6:** Shared shell-level help and feedback with policy-safe context handoff, lazy help/search/feedback behavior, and accessibility coverage.
- **Level 7:** Contextual dashboards for personal, team, project, and market contexts.
- **Level 8:** Service readiness dashboards and drilldowns with hosts and capacity providers as contextual resources.
- **Level 9:** Work operating loop, allocation, agents, workdays, review queues, blockers, failures, approvals, and audit timelines.
- **Level 10:** Knowledge and capability distribution, marketplace acquisition, seller readiness, entitlement-aware delivery, release review, and overlay bootstrap boundaries.

New pages must target the highest practical level for their capability. The completed migration reference implementation is Level 10 where a surface belongs to knowledge distribution, marketplace acquisition, or overlay-capable readers; lower levels remain valid only for active surfaces whose capability does not include those later-phase concerns.

## UI Package Layering

The target `@treeseed/ui` structure is:

```text
@treeseed/ui
  /tokens
  /primitives
  /components
  /patterns
  /layouts
  /templates
  /domain
  /icons
  /theme
  /utils
```

### `/tokens`

Design-system constants using the `--ts-*` semantic token contract: colors, spacing, radius, typography, elevation, z-index, breakpoints, motion, semantic status, and density.

### `/primitives`

Domain-neutral layout and interaction building blocks such as `Box`, `Stack`, `Grid`, `Container`, `Text`, `Heading`, `Link`, `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Badge`, `Avatar`, `Card`, `Divider`, `Tabs`, `Accordion`, `Tooltip`, `Popover`, `Modal`, `Drawer`, `Toast`, `Skeleton`, `EmptyState`, and `ErrorState`.

Primitives must know nothing about TreeSeed domains.

### `/components`

Product-aware but domain-neutral components such as `PageHeader`, `ContextHeader`, `ActionBar`, `ActionMenu`, `Breadcrumbs`, `SearchInput`, `FilterBar`, `SortControl`, `ViewToggle`, `DataList`, `DataTable`, `CardGrid`, `MetadataList`, `StatusBadge`, `VisibilityBadge`, `ActivityFeed`, `Timeline`, `SettingsSection`, `DangerZone`, `FormSection`, `Stepper`, `CommandPalette`, `NotificationBell`, `NotificationDigest`, `NotificationPreferencePanel`, `HelpButton`, `HelpPopover`, `HelpDrawer`, `HelpSearch`, `ContextualHelpPanel`, `HelpTopicLink`, `HelpActionList`, `FeedbackButton`, `FeedbackDialog`, `FeedbackTypeSelect`, `FeedbackContextSummary`, `ScreenshotCaptureControl`, `FeedbackAttachmentPreview`, `ResponsiveNav`, `ContextRail`, `AuthenticatedToolbar`, `CreateMenu`, `EditorStatusBar`, `DeploymentTimeline`, `ReadinessSummary`, `AllocationTree`, and `AllocationBreadcrumbs`.

Components may understand product concepts such as status, action states, density, layout variants, and responsive behavior. They must not encode TreeSeed resource-specific behavior.

### `/patterns`

Reusable behavior patterns that compose primitives and components: `CollectionView`, `DetailView`, `ReaderView`, `SettingsView`, `WizardView`, `ReviewView`, `ApprovalFlow`, `DiagnosticsView`, `EmptySetupFlow`, `PermissionBoundary`, `EntitlementBoundary`, `RoleAwareActionSlot`, `ResponsiveContextPanel`, `ContextualHelpFlow`, `HelpTopicResolver`, `GlobalFeedbackFlow`, `FeedbackScreenshotFlow`, `ContentManagementOverlay`, `InlineEditorOverlay`, and `DraftPreviewFlow`.

Patterns own reusable UX behavior, not route-specific data access.

### `/layouts`

Structural shells and layout primitives: `AuthShell`, `PublicShell`, `ProductShell`, `TwoPaneLayout`, `ThreePaneLayout`, `ReaderLayout`, `SettingsLayout`, and `WizardLayout`.

Most pages must not define layout manually.

### `/templates`

Concrete page archetypes: `DashboardTemplate`, `ProfileTemplate`, `CollectionTemplate`, `DetailTemplate`, `ReaderTemplate`, `WorkspaceTemplate`, `SettingsTemplate`, and `WizardTemplate`.

Templates accept structured configuration and view models. They must not fetch service data directly.

### `/domain`

TreeSeed-specific reusable rendering such as `UserProfileHeader`, `TeamProfileHeader`, `ProjectHeader`, `KnowledgeObjectCard`, `KnowledgeObjectDetail`, `KnowledgeCreateMenu`, `KnowledgePageEditor`, `KnowledgeMetadataEditor`, `BookPageRenderer`, `AgentCard`, `ProposalCard`, `DecisionRecord`, `WorkdaySummary`, `ReleaseCard`, `MarketplaceListingCard`, `CapacityProviderCard`, `HostStatusCard`, `PortfolioAllocationPanel`, `ProjectAllocationPanel`, `AgentClassAllocationPanel`, `AgentAllocationPanel`, `ProjectDeploymentMonitor`, and `ProjectLaunchMonitor`.

Domain components must stay small and must still use shared templates, patterns, primitives, and policy/action inputs.

### `/icons`

Icon mapping and icon wrappers. Use a consistent icon library and expose stable TreeSeed icon names for UI schemas and actions.

### `/theme`

Theme utilities, YAML-backed color scheme definitions, appearance persistence helpers, and token generation.

Color schemes must be defined through the canonical `@treeseed/ui` theme system. Dynamic tenant/product schemes use YAML scheme definitions that compile to generated `--ts-*` token values for `html[data-ts-scheme][data-ts-mode]` selectors. Pages and packages must consume semantic tokens and must not define independent color-mode systems.

### `/utils`

Display-only utilities for formatting, routes, content status, SEO, theme normalization, and other UI-safe helpers.

## Capability Registry

The capability registry is the source of truth for route identity, labels, navigation, actions, template choice, command entries, audit labels, and responsive behavior.

Each capability should define:

- id
- label
- scope
- path
- template
- resource type
- nav group
- access requirements
- primary and secondary actions
- empty-state action
- search facets
- display modes
- mobile behavior
- audit events
- analytics events
- command palette entries
- contextual help topics
- feedback context fields
- optional overlay support

Capability modules must be package-owned and then composed. Do not centralize every capability in one hand-edited global file before package boundaries are stable.

The registry must grow through proven vertical slices. Early route controllers should remain explicit while capability metadata supplies navigation, help, feedback context, action identifiers, audit labels, and template choice. A generic page factory or code generation layer may be introduced only after three to five similar resources prove the same loading, error, cache, hydration, policy, and rendering shape.

Example:

```ts
export const projectQuestionCapability = {
  id: "project.questions",
  label: "Questions",
  scope: "project",
  path: "/t/:teamSlug/p/:projectSlug/questions",
  template: "collection",
  resourceType: "question",
  navGroup: "Knowledge",
  access: ["anon.public", "team.member", "team.viewer", "project.viewer"],
  actions: ["question.create", "question.edit", "question.delete", "question.link", "question.export"],
  primaryAction: "question.create",
  secondaryActions: ["question.import", "question.export"],
  searchFacets: ["status", "priority", "visibility", "agentGenerated"],
  displayModes: ["cards", "list", "table"],
  responsive: {
    mobile: "stacked-cards",
    tablet: "list-with-drawer",
    desktop: "list-with-context-rail"
  },
  auditEvents: ["question.created", "question.updated", "question.archived"],
  analyticsEvents: ["question.collection.viewed"],
  commandEntries: ["question.create", "question.search"],
  help: {
    topicIds: ["project.questions", "knowledge.questions"],
    summary: "Questions focus project research, agent planning, and durable knowledge capture.",
    relatedDocs: ["/help/knowledge/questions"],
    relatedActions: ["question.create", "question.import"],
    feedbackType: "question"
  },
  feedbackContext: ["team", "project", "resourceType", "resourceId", "visibility"]
} satisfies CapabilityDefinition;
```

## UI Resource Schemas

UI schemas describe rendering, interaction, form rendering, action placement, and audit labels. They are not backend persistence schemas and must not pretend to own domain invariants.

Use composed schemas:

```ts
type ResourceUiSchema = {
  type: string;
  display: ResourceDisplaySchema;
  collection?: ResourceCollectionSchema;
  form?: ResourceFormSchema;
  actions?: ResourceActionSchema;
  help?: ResourceHelpSchema;
  overlay?: ResourceOverlaySchema;
  audit?: ResourceAuditSchema;
};
```

Schema responsibilities:

- `ResourceDisplaySchema`: labels, icon, summary fields, metadata, status/visibility mapping, card/detail display.
- `ResourceCollectionSchema`: filters, sort options, display modes, empty state, bulk action support.
- `ResourceFormSchema`: create/edit fields, validation presentation, field help, editor type.
- `ResourceActionSchema`: primary actions, secondary actions, danger actions, review actions, setup actions.
- `ResourceHelpSchema`: contextual help topics, field help, related docs, examples, and next-step guidance.
- `ResourceOverlaySchema`: editable fields, overlay editor, draft mode, create menu, write path.
- `ResourceAuditSchema`: audit labels, activity labels, actor/resource wording, timeline grouping.

From UI schemas, TreeSeed may generate or configure collection pages, detail pages, create forms, edit forms, filters, empty states, action menus, audit labels, overlay create menus, command palette commands, and responsive behavior.

UI schemas must also grow through proven repetition. A schema must not become a backend persistence model, validation authority, or catch-all metadata object. If a resource needs only display metadata in an early slice, only `ResourceDisplaySchema` should be implemented. Form, collection, action, help, overlay, and audit schemas are added when the resource actually uses those surfaces.

## Policy And Role-Aware UI

Policy is display context. It must not be scattered through templates as raw conditionals.

Canonical policy concept:

```ts
can(user, action, resource, context)
```

Templates receive resolved permissions and actions. Templates must not perform raw role checks.

Canonical resolved action states:

- `allowed`
- `readOnly`
- `hidden`
- `disabledWithReason`
- `requiresSignIn`
- `requiresUpgrade`
- `requiresSetup`
- `requiresEntitlement`

Resolved actions must support explanations and obligations:

- reason
- remediation
- required setup
- required entitlement
- required role
- audit sensitivity
- confirmation requirement
- destructive consequence text
- disabled-until state

Policy inputs include authentication state, ownership, team membership, project role, team role, platform admin permission, seller status, subscription/tier, asset entitlement, public/private visibility, device approval, release status, object lifecycle status, and setup prerequisites.

## Standard Page Anatomy

Every meaningful TreeSeed page must follow this anatomy:

```text
Shell
  Context header
  Navigation / breadcrumbs
  Page header
  Primary content
  Contextual side panel / drawer
  Activity / status / metadata
  Action system
```

### Context Header

Answers: Where am I?

Must show context name, type, visibility, status, role, current scope, and primary contextual action when available.

### Navigation / Breadcrumbs

Answers: How did I get here and what else is nearby?

Must be generated from capability metadata where possible.

### Page Header

Answers: What is this page?

Must show title, description, primary action, secondary actions, status badges, and search/filters when relevant.

### Primary Content

Answers: What am I working with?

Must be one of the canonical default templates or an approved exception.

### Contextual Side Panel / Drawer

Answers: What else matters here?

May contain metadata, related objects, recent activity, permissions, visibility, agent status, release status, diagnostics, suggested next actions, notification controls, deployment state, or allocation summary.

### Activity / Status / Metadata

Answers: What changed recently?

Must use reusable activity/timeline/status components where available.

### Action System

Answers: What can I do?

Actions must be centralized, role-aware, and consistent across cards, detail pages, command palette, menus, overlays, and dashboards.

## Responsive System

Responsive behavior must be defined at the template level, not handcrafted per page.

Mobile defaults: single column, compact top bar, context switcher, page title/action, main content, inline metadata, bottom/floating action, mobile drawer.

Tablet defaults: top bar, context nav, main content, metadata/context drawer.

Desktop defaults: top bar, left nav, main content, optional right context rail.

## Contextual Slots

TreeSeed uses controlled variation through slots, not arbitrary page UI.

Example:

```tsx
<CollectionTemplate
  headerSlot={<CapabilityHeader />}
  filterSlot={<ResourceFilters />}
  emptySlot={<ResourceEmptyState />}
  itemSlot={<ResourceCard />}
  bulkActionSlot={<BulkActionBar />}
  contextSlot={<CollectionContextPanel />}
  overlaySlot={<ContentManagementOverlay />}
/>
```

Most routes must not manually pass slots. The capability registry and UI schemas should declare slots. Overlay slots must remain empty unless policy resolution returns an allowed overlay action state. Overlay hydration must be lazy and must not load editor bundles for anonymous or unauthorized display pages.

## Easy Mode And Advanced Mode

Progressive disclosure is a structural product rule.

Easy mode shows readiness, connected systems, missing setup, current budget/capacity, summary allocation, deployment/readiness state, and next recommended action.

Advanced mode shows hosts, capacity providers, keys, diagnostics, agent allocation, workday dry runs, execution traces, detailed usage, runtime tests, and detailed allocation trees.

Infrastructure and capacity must not dominate ordinary user flows. Ordinary users see status, readiness, and next actions. Advanced operators can drill down.

## Separation Of UX From Service Logic

UI must use this separation:

```text
Route
  resolves params

Page Controller
  resolves context, policy, loaders, actions

Template
  renders page structure

Domain Components
  render TreeSeed concepts

UI Components
  render reusable interface elements

Service Layer
  handles API calls, mutations, cache invalidation
```

Templates consume view models. Templates must not fetch teams, projects, releases, permissions, hosts, capacity, content manifests, notifications, or deployment operations directly. Domain components must not call service facades directly.

## Generated Navigation

Navigation must come from the same registry as routes.

Each route or capability must define parent context, nav group, label, icon, visibility rule, active route pattern, order, and mobile priority.

The registry must generate desktop side nav, mobile drawer nav, breadcrumbs, command palette entries, create menu entries, and search scopes.

## Reusable Create/Edit/Delete Flows

CRUD must use standard flows:

- **Fast create:** modal on desktop, drawer on tablet, full-screen sheet on mobile.
- **Full create:** `WizardTemplate`.
- **Inline edit:** inline field or compact popover with standard validation.
- **Full edit:** `SettingsTemplate`.
- **Danger action:** standard danger zone, confirmation, consequence summary, permission check, audit event.

Policy behavior must be resolved before opening or submitting any flow. Audit behavior must be emitted through the service/action layer.

## Service Journeys

Every page must support one or more core service journeys. A page that does not improve one of these journeys must be delayed, hidden in advanced mode, or removed.

Canonical service journeys:

1. User joins and becomes productive.
2. User creates a team and manages membership.
3. Team connects hosts, integrations, and capacity providers.
4. Team creates and launches a project portfolio.
5. Team guides and directs the project portfolio.
6. Team allocates capacity across projects, workstreams, agent classes, and agents.
7. Team supervises agents, workdays, reviews, and exceptions.
8. Creator updates, packages, and distributes knowledge and capabilities.
9. User acquires reusable knowledge and capabilities.
10. User submits feedback that improves the platform.

These journeys are not a strict linear sequence. They form three loops:

- **Setup lifecycle:** join, create team, connect services/capacity, create and launch project portfolio.
- **Recurring operating loop:** guide direction, allocate capacity, supervise agents/workdays, review results, update knowledge, then revise direction.
- **Distribution loop:** package/distribute knowledge and capabilities, acquire/reuse them, collect feedback/activity, and redistribute improved knowledge.

The authenticated product experience must center the recurring operating loop. The primary day-to-day surfaces are direction, allocation, workdays, knowledge, service readiness, notifications, help, and feedback.

Journey-to-surface mapping:

- **User joins and becomes productive:** `AuthShell`, personal dashboard, account settings, notifications, saved assets, onboarding/setup checklist.
- **User creates a team and manages membership:** team dashboard, team creation wizard, members, roles, invites, team settings.
- **Team connects hosts, integrations, and capacity providers:** service readiness, hosts, integrations, capacity providers, credentials, diagnostics, project launch service checks.
- **Team creates and launches a project portfolio:** team projects, project creation wizard, launch monitor, portfolio dashboard, project dashboard.
- **Team guides and directs the project portfolio:** direction workspace, objectives, questions, notes, proposals, decisions, priorities, review queues.
- **Team allocates capacity across projects, workstreams, agent classes, and agents:** portfolio allocation, project allocation, workstream/mode allocation, agent-class allocation, provider grants, desired/scheduled/active/actual usage.
- **Team supervises agents, workdays, reviews, and exceptions:** workday dashboard, agent runs, failures, blocked work, reviews, approvals, reruns, activity/audit.
- **Creator updates, packages, and distributes knowledge and capabilities:** Knowledge Hub overlay, books, pages, releases, generated packs, templates, listings, visibility, entitlement-aware distribution.
- **User acquires reusable knowledge and capabilities:** market discovery, templates, knowledge packs, capability listings, public profiles, public books, install/import/download/save/follow actions.
- **User submits feedback that improves the platform:** shell-level feedback, screenshots, help-topic feedback, triage, notifications, roadmap/support follow-up.

## Unified Resource Cards

TreeSeed must use one generic `ResourceCard` pattern with minimal domain variants.

Every card must support title, type, summary, status, visibility, updated time, owner/source, relationship count, primary action, secondary menu, and role-aware actions.

Allowed variants include `KnowledgeObjectCard`, `ProjectCard`, `ReleaseCard`, `MarketplaceListingCard`, `AgentCard`, `WorkdayCard`, `HostCard`, and `CapacityProviderCard`.

## Unified Status Model

TreeSeed status display must use shared display concepts.

Visibility:

- `public`
- `team`
- `private`
- `unlisted`
- `draft`

Lifecycle:

- `draft`
- `active`
- `inReview`
- `approved`
- `published`
- `archived`
- `deleted`

Work status:

- `notStarted`
- `ready`
- `running`
- `blocked`
- `completed`
- `failed`
- `needsReview`

Setup status:

- `notConfigured`
- `needsAttention`
- `ready`
- `degraded`
- `unavailable`

View models may normalize display state, but underlying domain status should remain precise. Do not erase domain-specific lifecycle distinctions.

## Universal Activity And Audit

Every major resource should have reusable activity and audit presentation. Activity entries must include actor, action, resource, timestamp, summary, diff/reference when useful, and approval/review state when relevant.

Feedback submissions and feedback-derived triage actions must be auditable. Private feedback activity must be visible only to authorized platform, team, project, or support roles.

Reusable components:

- `ActivityFeed`
- `Timeline`

This is required for AI agent legibility and trust.

## Project Launch Deployment Monitoring

Project launch must include deployment monitoring as part of the canonical launch journey. Launch is not complete when a form submits; launch is complete when the project has a resolved runtime state, user-facing next action, and recovery path if deployment fails.

Launch monitoring must distinguish software deployment, content publish, R2 manifest availability, CDN/cache readiness, private content proxy readiness, Market auth/session readiness, domain/DNS readiness, and forms/API readiness when applicable.

Deployment monitoring UI must consume operation/deployment view models. It must not embed provider orchestration logic in templates or components.

## Nested Portfolio Allocation

TreeSeed allocation must support nested portfolio planning from the team portfolio down to project, workstream/mode, agent class, agent, and capacity-provider detail.

Canonical hierarchy:

```text
team portfolio
  -> projects
  -> project workstreams or work modes
  -> agent classes
  -> agents
  -> capacity providers / provider grants
```

`DynamicPieAllocationInput` is the canonical proportional allocation form element. It must be used inside reusable allocation panels, not page-local forms.

Allocation UI must distinguish desired allocation, scheduled reservation, active assignment, and actual usage. Overrides must be explicit, validated, audited, and reversible.

Allocation policy is not scheduling. Editing allocation must not imply direct work assignment.

## Search And Command Architecture

TreeSeed uses one search model with scopes: global, user, team, project, knowledge, books, market, seller, and admin.

Search UI variants: global search page, header search, collection search, command palette, contextual project search, and reader search.

Command palette commands must come from the capability registry and use the same policy/action states as page buttons and menus.

## Subsystem Proof Boundaries

Cross-cutting systems must be implemented as narrow proof slices before becoming platform-wide machinery.

This rule applies to:

- capability registry and page factories
- UI resource schemas
- contextual help
- global feedback and screenshots
- overlay editing
- notifications and digests
- project launch monitoring
- nested allocation
- content runtime and private proxy behavior

Each subsystem must define:

- first page or route that proves it
- minimum user-facing behavior
- allowed package boundaries
- required policy/auth behavior
- loading and bundle conditions
- accessibility expectations
- security/privacy tests when private data is involved
- promotion condition for broader reuse

Do not build full generic frameworks before the first vertical slice works in production-like conditions. Generalization must follow observed repetition, not predicted repetition.

## Contextual Help Architecture

TreeSeed must provide integrated contextual help across user-facing pages. Help is a capability-driven guidance system, not page-local explanatory text scattered through templates.

The contextual help action must be shell-level:

- `PublicShell` exposes public help topics without loading authenticated product chrome.
- `ProductShell` exposes contextual help in the app navigation/help/action area.
- `AuthShell` exposes help/recovery topics for sign-in, registration, device approval, and account recovery.
- Core Knowledge Hub pages use the same help contract through public shell behavior and runtime reader context.

Contextual help must resolve from:

- current route and capability id
- current shell and surface context
- resource UI schema
- resolved policy/action states
- active template
- current empty/error/setup state
- project/team/resource context when policy allows
- user role, entitlement, setup state, and mode when relevant

The help display must answer:

- what this page is for
- what the user can do here
- why an action is unavailable
- what changed or needs attention when the page has status/alerts
- what the recommended next step is
- where the deeper help or knowledge article lives
- how to submit feedback if the help is missing or wrong

Required help UI surfaces:

- global help button
- compact contextual help popover
- drawer or panel for richer help
- help search scoped to current context
- topic links to public, private, or product help content
- action links resolved through policy/action state
- feedback handoff that preserves help topic and page context

Help content may come from public runtime help pages, private team/project help content, product-authored docs, or short inline summaries in capability metadata. In staging and production, published public help content follows the runtime content model in [Content Runtime Architecture](./content-runtime-architecture.md). Private help content follows the Market/session/proxy model in [Auth And Content Proxy](./auth-and-content-proxy.md).

Help must be policy-aware. A user must not see private project names, private object titles, setup details, membership details, billing details, capacity details, or entitlement-gated instructions beyond that user's authorization. When help explains a disabled action, it must use the resolved action reason/remediation instead of raw role checks.

Contextual help must not become an onboarding tour system that blocks the primary workflow. Tours, checklists, and setup flows may link into contextual help, but the help system must remain optional, searchable, dismissible, keyboard accessible, and resilient on mobile.

## Global Feedback Architecture

TreeSeed must provide a global feedback action across user-facing pages. Feedback is a platform-development signal and support surface, not a page-local contact form.

The feedback action must be shell-level:

- `PublicShell` exposes feedback without loading authenticated product chrome.
- `ProductShell` exposes feedback in the app navigation/help/action area.
- `AuthShell` exposes a lightweight help or feedback path for auth blockers.
- Core Knowledge Hub pages use the same feedback contract through public shell behavior.

Feedback submissions must support these types:

- bug report
- feature suggestion
- question
- content issue
- UX issue

Every feedback submission must include policy-safe page context:

- current URL and canonical route path
- page title when available
- capability id when available
- shell and surface context
- team, project, resource type, and resource id when policy allows
- user/session identity when authenticated
- anonymous contact email when provided
- browser, viewport, locale, timezone, appearance mode, and reduced-motion state
- application build/revision and deployment environment

Feedback must submit to the configured Market/API feedback endpoint. Core-based Knowledge Hubs must not create an independent feedback database for authenticated or private project feedback. Public anonymous feedback may use a small dynamic form path, but it must still route into the configured platform feedback system when the hub is connected to a Market.

Feedback screenshots are allowed only as an explicit user action. TreeSeed supports two screenshot modes:

- DOM capture: a low-friction screenshot generated from the current document using an approved client renderer. It may be approximate and must be labeled as such.
- Exact browser capture: a browser-mediated tab/window/screen capture through the Screen Capture API. It requires explicit browser permission and must never be represented as silent capture.

A checkbox may request screenshot inclusion, but exact browser viewport capture must still require the browser permission flow. Server-side screenshots are not a substitute for user viewport screenshots because they do not preserve the user's exact session, viewport, scroll position, private state, or unsaved UI state.

Screenshot privacy rules:

- users must see a preview before submission
- users must be able to remove or retake the screenshot
- sensitive regions must be marked with reusable redaction attributes or components
- password fields, secret fields, unlock/passphrase fields, token displays, private object URLs, raw R2 keys, service credentials, and provider credentials must be redacted
- private project screenshots must be stored as private feedback attachments and retrieved only through authenticated, policy-checked routes
- screenshots must not be published to public CDN URLs unless the user explicitly submits public, non-sensitive feedback and the attachment policy permits it
- screenshot attachments must have size limits, MIME/type validation, malware-safe handling, retention policy, and audit records

Feedback submissions may generate notifications, triage queue entries, roadmap candidates, linked issues, content-review tasks, or support follow-up actions. Those downstream actions must come from capability/policy resolution.

## Styling, Tokens, And Variants

TreeSeed-owned UI must use the `--ts-*` token contract defined in [TreeSeed UI Theme And Components](./ui-components.md).

Rules:

- Use `--ts-*` tokens.
- Do not introduce new raw page-local color systems.
- Do not define page-local component CSS for repeated patterns.
- Do not use one-off Tailwind/class soup as product architecture.
- Use semantic variants for buttons, badges, cards, data density, and layout.

Pages must describe intent through variants. The theme defines how those variants look.

## Accessibility Requirements

Every canonical shell, template, pattern, and reusable component must satisfy accessibility requirements:

- keyboard navigation for all interactive controls
- focus management for route changes, drawers, modals, popovers, command palette, overlays, and editors
- correct ARIA semantics for drawers, modals, menus, tabs, notifications, command palette, and validation messages
- reduced-motion support for transitions and animated status changes
- color contrast that meets WCAG AA for normal and large text
- touch targets large enough for mobile operation
- screen-reader text for status badges, visibility badges, timelines, progress, and deployment state
- accessible validation errors associated with fields
- skip links and landmarks in shells
- help popover/drawer semantics, keyboard search, topic navigation, and return focus to the invoking control
- overlay/editor focus trapping, escape behavior, and restoration to the invoking control
- feedback dialog focus trapping, escape behavior, screenshot permission explanation, screenshot preview keyboard access, and return focus to the invoking control

Accessibility failures are architecture failures, not polish.

## Performance Budgets

Performance budgets are part of the architecture because TreeSeed includes public reader surfaces, authenticated product shells, rich editors, overlays, and dashboards.

Budget categories:

- public homepage JavaScript
- anonymous public content page JavaScript
- public reader JavaScript
- authenticated product shell JavaScript
- contextual help bundle and help search bundle
- editor overlay bundle
- feedback dialog and screenshot capture bundle
- command palette bundle
- dashboard hydration
- LCP
- CLS
- INP
- CDN cache hit targets

Anonymous public pages must not load authenticated overlay/editor bundles, write-path client logic, or unnecessary Market API bootstrap calls.

Anonymous public pages may load minimal help and feedback triggers only when they are intentionally part of the public shell budget. Rich help search, authenticated help, feedback dialogs, and screenshot capture libraries must be lazy-loaded after explicit user intent.

Specific numeric budgets should be maintained by the implementation and CI once baseline measurements exist. Until then, any new bundle or hydration surface must name its user-facing need and loading condition.

Initial implementation gates:

- public anonymous pages must not load authenticated app, overlay editor, private help, or screenshot-capture bundles before explicit user intent
- public reader pages must remain CDN-first and must avoid ordinary anonymous Market/API bootstrap calls
- editor, screenshot, rich help search, command palette, and dashboard-interactive bundles must be separately measurable
- every new hydrated island must declare its owner, route/template use, loading condition, and fallback behavior
- CI must record baseline bundle sizes and web-vital smoke values before enforcing numeric thresholds

## Empty, Loading, And Error States

Designed states are required product surfaces. Every collection, dashboard, wizard, setup page, and detail load must have empty, loading, error, permission-denied, and setup-required states when relevant.

Good empty states include what the area is for, why it matters, primary next action, secondary help link, and an example/template when useful.

Missing data must become guidance, not dead space.

## Architecture Enforcement Mechanics

Architecture rules must become enforceable. Required enforcement categories:

- dependency boundary checks
- route inventory checks
- no page-local visual system checks
- no raw role checks in templates
- no direct template API facade calls
- Storybook or equivalent examples for primitives/components/templates
- visual regression for canonical templates
- axe or equivalent accessibility checks
- Playwright tests for critical journeys
- public/private R2 security tests
- bundle budget checks
- contextual help policy/filtering, accessibility, and bundle-loading checks
- feedback screenshot redaction and attachment privacy checks

Enforcement ownership:

- `@treeseed/ui` owns component examples, token/theme audits, accessibility fixtures, visual regression for primitives/components/templates, and bundle surfaces for reusable UI.
- `@treeseed/admin` owns ProductShell route checks, admin view-model boundaries, policy/action display tests, and route-controller/template integration tests.
- `@treeseed/core` owns PublicShell/reader integration, Starlight-style runtime navigation checks, help/content runtime integration, and public/anonymous bundle behavior.
- root `@treeseed/market` owns tenant overrides, public acquisition pages, marketplace presentation checks, and production tenant composition.
- `@treeseed/api` and `@treeseed/sdk` own authoritative authorization, public contracts, and backend/security behavior consumed by UI tests.

Minimum enforcement gates before broad migration:

- route inventory exists and records maturity, shell, template, data source, policy needs, and reusable components
- `npm run audit:ui` or successor blocks raw color systems, retired tokens, disallowed page-local style systems, and unsafe inline styles outside approved dynamic CSS-variable cases
- dependency boundary checks prevent `ui` from importing product/runtime packages and prevent templates from calling API facades
- policy/action tests cover allowed, read-only, denied, unauthenticated, setup-required, and entitlement-required states
- Playwright critical journeys cover join/productivity, team membership, service readiness, project portfolio launch, direction, allocation, workday supervision, knowledge/capability distribution, acquisition, feedback, contextual help, one public runtime reader, and one private content route
- accessibility checks cover shells, templates, dialogs, drawers, command palette, help, feedback, editor overlays, notifications, and allocation controls
- public/private R2 security tests prove public cache eligibility and private no-leak behavior
- bundle checks prove expensive help/search/editor/screenshot bundles lazy-load only after explicit user intent

This document defines the required enforcement targets. The concrete tools and CI wiring are implementation work tracked by [UI Migration](./ui-migration.md).

## Enforcement Rules

Future UI work must follow these rules:

- New routes must declare a capability or explicitly document their maturity level and exception path.
- New repeated resources must declare UI resource schemas when they reach maturity Level 5.
- New pages must start from a canonical shell and template.
- Shell/template exceptions must declare rationale, owner, review date, accessibility/performance obligations, and promotion path.
- Navigation must come from the registry where capability metadata exists.
- Actions must come from policy/action resolution.
- Role checks must not be scattered through template markup.
- Page-local CSS must not define reusable visual systems.
- Domain components must not fetch service data directly.
- Templates must not call API facades directly.
- Infrastructure/capacity details must be advanced-mode unless they are readiness or next-action summaries.
- Every user-facing page must answer the four page questions.
- Every user-facing page must provide or inherit contextual help unless an explicit capability exception explains why help is unavailable.
- Contextual help must come from capability metadata, UI resource schemas, runtime help content, or resolved policy/action states rather than page-local explanatory UI.
- Help content and help search results must be policy-filtered before display.
- Every user-facing page must provide or inherit the global feedback action unless an explicit capability exception explains why feedback is unavailable.
- Feedback must include policy-safe route/capability/page context and must not leak private resource metadata to unauthorized recipients.
- Feedback screenshots must be explicit, previewed by the user, redacted for sensitive regions, size-limited, validated, and stored according to public/private attachment policy.
- Exact browser screenshots must use browser-mediated permission flows and must not be silently captured.
- Local content serving must be used only in the local environment.
- Staging and production public content must be served from R2/CDN-backed runtime storage.
- Staging and production private content must be stored outside the site repository and served only through authenticated, policy-gated application/runtime routes or short-lived signed URLs.
- Public pages inside private projects must be represented as explicit public manifest entries and audited as intentional publication events.
- Generated books and book knowledge packs must be runtime artifacts in R2 or an approved file store, not bundled site assets.
- Public project UI must be CDN-first and must avoid fresh per-request rendering for ordinary anonymous reading traffic when a published artifact or cacheable response can satisfy the request.
- Private project content requests must go through the content proxy before any private R2 object is read or rendered.
- Knowledge Hubs must authenticate against the configured Market API and must not own independent auth databases, auth pages, session stores, or administrative consoles.
- Shared Market session validation must be available to every configured Knowledge Hub before private remote content is enabled.
- Knowledge Hub content management overlays must be declared by capability/UI schema and rendered through approved template slots.
- Overlay editor bundles, create forms, draft state, and write-path logic must not load for anonymous or unauthorized display requests.
- Overlay writes must go through Market/API/content proxy workflows and must never write directly to R2 from browser code.
- Every dashboard must declare and render a resolved context.
- Notifications must be generated from durable events, scoped through capability/resource context, filtered by policy, and governed by user/team/project/content-type period preferences.
- Project launch flows must include deployment monitoring, readiness status, recovery actions, and post-launch next actions before they are considered complete.
- Nested portfolio allocation must start at team portfolio, then drill into projects, workstreams/modes, agent classes, agents, and provider grants.
- Allocation editors must use reusable allocation components and must distinguish desired allocation, scheduled reservations, active assignments, and actual usage.
- Allocation overrides must be explicit, validated, audited, and reversible.

## Target Interfaces

These are illustrative target contracts. They do not change runtime APIs by themselves.

```ts
type CapabilityDefinition = {
  id: string;
  label: string;
  scope: "public" | "personal" | "team" | "project" | "market" | "seller" | "admin";
  path: string;
  template: "dashboard" | "profile" | "collection" | "detail" | "reader" | "workspace" | "settings" | "wizard";
  resourceType?: string;
  navGroup?: string;
  access: string[];
  actions: string[];
  primaryAction?: string;
  secondaryActions?: string[];
  emptyState?: EmptyStateDefinition;
  searchFacets?: string[];
  displayModes?: Array<"cards" | "list" | "table" | "reader">;
  responsive: ResponsiveConfig;
  auditEvents?: string[];
  analyticsEvents?: string[];
  commandEntries?: string[];
  help?: HelpDefinition;
  feedbackContext?: string[];
  overlay?: OverlayCapabilityDefinition;
  exception?: CapabilityException;
};

type CapabilityException = {
  rationale: string;
  owner: string;
  reviewDate: string;
  accessibilityObligations: string[];
  performanceObligations: string[];
  promotionPath: string;
};

type ResourceUiSchema = {
  type: string;
  display: ResourceDisplaySchema;
  collection?: ResourceCollectionSchema;
  form?: ResourceFormSchema;
  actions?: ResourceActionSchema;
  help?: ResourceHelpSchema;
  overlay?: ResourceOverlaySchema;
  audit?: ResourceAuditSchema;
};

type HelpDefinition = {
  topicIds: string[];
  summary?: string;
  relatedDocs?: string[];
  relatedActions?: string[];
  feedbackType?: "bug" | "feature" | "question" | "contentIssue" | "uxIssue";
};

type HelpTopicLink = {
  topicId: string;
  title: string;
  href: string;
  visibility: "public" | "authenticated" | "team" | "project" | "admin";
};

type ResolvedAction = {
  id: string;
  label: string;
  state:
    | "allowed"
    | "readOnly"
    | "hidden"
    | "disabledWithReason"
    | "requiresSignIn"
    | "requiresUpgrade"
    | "requiresSetup"
    | "requiresEntitlement";
  reason?: string;
  remediation?: string;
  requiredSetup?: string[];
  requiredEntitlement?: string;
  requiredRole?: string;
  auditSensitivity?: "normal" | "sensitive" | "danger";
  confirmation?: "none" | "confirm" | "strongConfirm";
  destructiveConsequence?: string;
  disabledUntil?: string;
  href?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
};

type FeedbackContext = {
  url: string;
  canonicalPath?: string;
  title?: string;
  capabilityId?: string;
  shell: "auth" | "public" | "product";
  context: "public" | "personal" | "team" | "project" | "market" | "seller" | "admin";
  teamId?: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  sessionId?: string;
  anonymousContactEmail?: string;
  environment?: "local" | "staging" | "production";
  buildId?: string;
  viewport: { width: number; height: number; devicePixelRatio?: number };
  browser: { userAgent: string; locale?: string; timezone?: string };
  appearance?: { colorScheme?: "light" | "dark" | "system"; reducedMotion?: boolean };
};

type HelpContext = {
  capabilityId?: string;
  topicIds: string[];
  shell: "auth" | "public" | "product";
  context: "public" | "personal" | "team" | "project" | "market" | "seller" | "admin";
  resourceType?: string;
  resourceId?: string;
  template?: "dashboard" | "profile" | "collection" | "detail" | "reader" | "workspace" | "settings" | "wizard";
  summary?: string;
  relatedDocs: HelpTopicLink[];
  relatedActions: ResolvedAction[];
  searchScope: "global" | "public" | "team" | "project" | "market" | "admin";
  visibility: "public" | "authenticated" | "team" | "project" | "admin";
};

type FeedbackSubmission = {
  type: "bug" | "feature" | "question" | "contentIssue" | "uxIssue";
  message: string;
  context: FeedbackContext;
  screenshot?: FeedbackScreenshotAttachment;
};

type FeedbackScreenshotAttachment = {
  mode: "domCapture" | "screenCapture";
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
  redactionApplied: boolean;
  storagePolicy: "public" | "private";
};

type PageViewModel = {
  context: TreeSeedContext;
  resource?: ResourceViewModel;
  collection?: CollectionViewModel;
  content?: ContentRuntimeContext;
  overlay?: OverlayViewModel;
  dashboard?: DashboardViewModel;
  notifications?: NotificationViewModel;
  deployment?: DeploymentMonitorViewModel;
  allocation?: AllocationViewModel;
  help?: HelpContext;
  feedback?: FeedbackContext;
  actions: ResolvedAction[];
  navigation: NavigationItem[];
  breadcrumbs: Breadcrumb[];
  permissions: PermissionMap;
  responsive: ResponsiveConfig;
};
```
