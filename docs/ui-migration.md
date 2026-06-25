# TreeSeed UI Migration Plan

## Canonical Status

This document is the canonical current implementation path for migrating TreeSeed UI surfaces toward [TreeSeed UI Architecture](./ui-architecture.md).

The current migration uses thin vertical slices, not broad horizontal platform phases. The goal is to prove the architecture through small complete user-facing paths before generalizing registry, schema, template, content runtime, overlay, contextual help, feedback, notification, deployment, and allocation machinery.

Older content below [Historical Archive: Prior UX Migration Plan](#historical-archive-prior-ux-migration-plan) is preserved as historical context. It is not the current migration sequence unless a current phase explicitly references it.

Supporting specs:

- [Content Runtime Architecture](./content-runtime-architecture.md)
- [Auth And Content Proxy](./auth-and-content-proxy.md)
- [Overlay Editing Architecture](./overlay-editing-architecture.md)
- [Notification Architecture](./notification-architecture.md)

## Migration Principles

- Prove abstractions with real pages before generalizing them.
- Keep explicit route controllers until three to five similar resources prove the same page shape.
- Do not build a UI meta-framework before the first vertical slices validate it.
- Move routes through the maturity model incrementally.
- Add only the schema facets needed by the current slice; do not implement unused schema surfaces speculatively.
- Build each cross-cutting subsystem as a first proof route before expanding it across all pages.
- Preserve existing public URLs through redirects, wrappers, or compatibility controllers while pages migrate.
- Add enforcement and tests with each slice instead of waiting until the end.
- Separate UI architecture from runtime security, content delivery, auth/proxy, overlay editing, and notifications through focused specs.

## Service Journey Backbone

The current migration is organized around the canonical service journeys from [TreeSeed UI Architecture](./ui-architecture.md):

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

The migration must prove these as a setup lifecycle, recurring operating loop, and distribution loop:

```text
setup lifecycle:
  join -> team -> services/capacity -> project portfolio launch

recurring operating loop:
  guide direction -> allocate capacity -> supervise workdays -> update knowledge -> revise direction

distribution loop:
  package/distribute -> acquire/reuse -> feedback/activity -> improve and redistribute
```

## UI Maturity Levels

- **Level 0:** Legacy route, no new sprawl allowed.
- **Level 1:** Uses canonical shell and UI primitives.
- **Level 2:** Uses canonical template.
- **Level 3:** Uses resolved actions and policy display states.
- **Level 4:** Has capability registry entry.
- **Level 5:** Uses UI resource schemas for collection/detail/create/edit flows.
- **Level 6:** Fully schema/registry-driven with generated navigation, command entries, audit labels, responsive behavior, and tests.

Migration does not require every route to jump directly to Level 6. New pages should target the highest practical level and must at least avoid new sprawl.

## Legacy Containment And Cleanup Strategy

The migration uses a controlled strangler strategy. It must not move current pages and components into broad `tmp`, `backup`, `old`, or archive directories inside buildable source trees and then rebuild the UI beside them.

Git history is the backup. Large in-repository backup directories are forbidden because they can be imported accidentally, scanned by Astro/build tooling, fail lint/type/audit checks, confuse future implementation work, and become permanent dead code.

Allowed coexistence pattern:

```text
inventory current route/component
  -> assign target shell/template/capability/maturity
  -> migrate one vertical slice
  -> keep compatibility wrapper only when needed
  -> verify behavior and tests
  -> retire/delete replaced legacy code immediately
```

If legacy code must remain temporarily, it must be quarantined behind an explicit boundary:

- `legacy/**` may exist only when the route/component inventory records owner, reason, replacement capability, deletion blocker, and target phase.
- Canonical routes, templates, UI schemas, and new components must not import from `legacy/**`.
- Compatibility wrappers may call into legacy code only while a specific route remains unmigrated.
- No new feature work may be added to legacy surfaces except production bug fixes needed to keep the current system working during migration.
- Legacy code must be deleted as soon as its replacement passes the acceptance tests for that slice.

External or non-buildable archives may exist only outside source/build inputs, such as `.treeseed/archive/ui-legacy/<date>/`, and must not be used as an implementation dependency. Prefer Git branches, tags, and commits over copied source.

Every route/component inventory row must include:

- current owner and path
- target capability
- target shell/template
- maturity level
- legacy status: `active`, `wrapped`, `replaced`, or `deleted`
- compatibility wrapper path when applicable
- deletion blocker
- required tests before deletion
- target deletion phase

## Phase 0: Inventory And Freeze Rules

Purpose: create a route migration board and prevent new drift while the first vertical slices are built.

Deliverables:

- route inventory table
- component inventory table for route-local and reusable UI candidates
- route maturity level
- current shell
- target shell
- target template
- resource type
- policy needs
- data source
- page-local components
- page-local CSS
- reusable components already used
- migration difficulty
- user value
- risk
- legacy status
- compatibility wrapper path when applicable
- deletion blocker
- required tests before deletion
- target deletion phase

Freeze rules:

- no new page-local visual systems
- no new raw role checks in templates
- no new direct API calls from templates
- no new color-mode or color-scheme systems outside the `@treeseed/ui` YAML-backed theme system
- no broad `tmp`, `backup`, `old`, or archive directories inside buildable source trees
- no new canonical code importing from `legacy/**`
- no new feature work on legacy surfaces except production bug fixes required during migration
- no new public remote content backed by local collections
- no new private content route without Market/session/proxy model
- no new page without inherited global feedback availability or an explicit exception
- no new page without inherited contextual help availability or an explicit exception
- no new page-local help content systems
- no feedback screenshot path without redaction, preview, size/type validation, and public/private attachment policy
- new pages must at least reach Level 1 maturity

Acceptance:

- all current human-facing UI routes are inventoried
- each route has a target shell/template/resource classification
- each route has a migration level and risk score
- route inventory identifies first vertical-slice candidates
- freeze rules are documented for reviewers
- theme audit confirms dynamic color schemes remain owned by `@treeseed/ui` YAML schemes and `--ts-*` tokens
- every legacy route/component has an owner, deletion blocker, required test list, and target deletion phase
- build/source exclusions for any non-source archive path are documented

## Phase 1: Minimal UI Foundation

Purpose: build only the reusable foundation needed for the first vertical slices.

Do not build every template, overlay, notification system, allocation system, deployment monitor, or page factory in this phase.

Deliverables:

- token contract
- `AuthShell`
- `PublicShell`
- `ProductShell`
- `CollectionTemplate`
- `DetailTemplate`
- `ReaderTemplate`
- `SettingsTemplate`
- `PageHeader`
- `ActionBar`
- `ResourceCard`
- `EmptyState`
- `PermissionBoundary`
- resolved action state shape
- route/controller/view-model convention
- minimal capability metadata shape
- minimal UI schema shape
- shell-level contextual help action slot
- help context shape
- shell-level feedback action slot
- feedback context shape
- accessibility baseline
- bundle budget baseline
- route inventory check scaffold
- dependency-boundary check scaffold
- UI token/theme audit check scaffold
- template no-direct-API check scaffold

Acceptance:

- one route can render through shell/template/view model
- resolved action states render consistently
- templates do not fetch service data
- no service facades are called directly from templates
- shell-level feedback action can submit policy-safe page context without page-local code
- shell-level contextual help can render a policy-safe topic summary without page-local code
- accessibility baseline is documented
- bundle budget baseline is documented
- initial enforcement checks run locally even if CI thresholds are warning-only
- public/auth/product shells preserve `ThemeScript`, `ThemeSelector` where applicable, `colorScheme`, `themeMode`, and `--ts-*` token behavior

## Phase 2: First Direction Resource Vertical

Purpose: prove the registry/schema/template model with the first operating-loop resource before expanding.

Canonical first resource: project questions. This proves the **Team guides and directs the project portfolio** journey.

Implement end-to-end:

- capability definition
- UI resource schema
- collection page
- detail page
- create flow
- edit flow
- filters
- status/visibility display
- policy/action resolution
- generated navigation entry
- empty/loading/error/denied states
- mobile/tablet/desktop behavior
- activity/audit labels
- tests

Acceptance:

- question collection/detail/create/edit uses canonical shell, template, and reusable components
- route reaches maturity Level 5
- no page-local CSS system is introduced
- no raw role checks remain in template markup
- tests cover allowed, read-only, denied, and unauthenticated states
- explicit route controller remains acceptable; `PageFromCapability` is not required
- only schema facets used by the question vertical are implemented
- registry/schema patterns are not promoted to a generic page factory until at least three similar resources repeat the same shape

## Phase 3: First Public Runtime Reader And Acquisition Vertical

Purpose: prove public R2/CDN runtime reading and reusable knowledge acquisition before migrating the full content/distribution system.

Canonical first reader: an R2-backed `/knowledge/*` book/page route. This supports **Creator updates, packages, and distributes knowledge and capabilities** and **User acquires reusable knowledge and capabilities**.

Implement:

- R2 published manifest loading
- `ReaderTemplate`
- Starlight-style navigation from runtime data
- public CDN-safe route behavior
- local-only fallback for development
- staging/production gate rejecting `local_collections`
- generated book/download metadata

Acceptance:

- public reader route does not require site rebuild for content changes
- anonymous route is CDN-eligible
- ordinary anonymous read does not call the Market API
- Starlight-style navigation comes from runtime manifest
- local development still works with local content or fixture/runtime data
- manifest load failures produce safe error/empty states
- public reader preserves dynamic theme/color-mode behavior without page-local color systems
- runtime reader implementation is not generalized to all content routes until cache, manifest failure, purge, and Starlight-style navigation tests pass for the proof route

## Phase 4: Private Knowledge Hub Access Vertical

Purpose: prove private Knowledge Hub access and security before broad private project support.

Implement:

- private manifest
- private content proxy
- Market session validation
- team/project membership check
- denied/not-found behavior
- audit event
- no raw R2 URL exposure
- conservative cache headers

Acceptance:

- private book/page can be read by authorized team member
- anonymous request redirects or denies safely
- unauthorized signed-in user cannot infer private metadata
- private R2 object cannot be fetched directly
- audit event is recorded for read, denied, and not-found outcomes
- safe return URL behavior is tested
- private proxy behavior is not reused for private artifacts or packs until denied/not-found and cache-header tests pass for the private book/page proof route

## Phase 5: Global Feedback Vertical

Purpose: prove global feedback as a shell-level capability before broad rollout.

Implement:

- `FeedbackButton` and `FeedbackDialog` reusable components
- feedback type selector for bug, feature suggestion, question, content issue, and UX issue
- route/capability/page context collection
- anonymous public feedback submission path
- authenticated ProductShell feedback submission path
- Core Knowledge Hub feedback submission path routed to the configured Market/API
- optional DOM screenshot capture with explicit user opt-in
- screenshot preview, remove, and retake controls
- sensitive-region redaction attributes/components
- private attachment storage policy for private project screenshots
- feedback-derived notification or triage queue event

Acceptance:

- every canonical shell can expose feedback without page-local implementations
- feedback payload includes current URL, capability when available, shell/context, viewport, build/environment, and policy-safe resource identifiers
- anonymous public feedback works without loading authenticated product chrome
- authenticated/private feedback validates Market session and policy before exposing private context or screenshots
- exact browser capture is not represented as silent capture; any exact capture uses browser-mediated permission
- screenshot capture libraries are lazy-loaded only after explicit user intent
- screenshot attachments are size/type validated, previewed, redacted, and stored under the correct public/private policy
- feedback notifications or triage records do not leak private metadata
- screenshot capture does not expand beyond the proof surfaces until redaction, attachment privacy, bundle-loading, and notification-leak tests pass

## Phase 6: Contextual Help Vertical

Purpose: prove embedded contextual help using the same route/capability/page context foundation created for feedback.

This phase must build on Phase 5. The help resolver should reuse the page context collector, shell action slot, capability metadata, policy/action states, and feedback handoff instead of creating a separate page-local help system.

Implement:

- `HelpButton`, `HelpPopover`, and `HelpDrawer` reusable components
- `ContextualHelpPanel`, `HelpTopicLink`, and `HelpActionList`
- minimal `HelpDefinition` capability metadata
- minimal `ResourceHelpSchema`
- help context resolver for shell, route, capability, template, resource, action state, and page state
- public help topic rendering from runtime content for one `/knowledge/*` or `/help/*` topic
- private/policy-filtered help topic lookup for one authenticated project page
- help-to-feedback handoff that preserves topic id, route, and capability context
- lazy-loaded help search scoped to current context
- accessibility behavior for keyboard search, drawer/popover focus, topic navigation, and dismissal

Acceptance:

- every canonical shell can expose contextual help without page-local implementations
- at least one authenticated project page resolves capability/resource help
- at least one public Knowledge Hub or reader page resolves public runtime help
- help explains unavailable actions using resolved action reason/remediation
- private help topics, snippets, search results, and remediation are policy-filtered
- help search and richer help content lazy-load after explicit user intent
- users can submit feedback from a help topic with topic/capability/page context attached
- help UI passes accessibility checks for keyboard navigation, focus management, and screen-reader labels
- contextual help does not expand to broad route coverage until public help runtime, private help filtering, feedback handoff, and lazy-loading tests pass

## Phase 7: Team, Membership, Project Portfolio, And Launch

Purpose: prove the setup lifecycle: user productivity, team membership, project portfolio creation, and project launch monitoring without building every dashboard.

First contextual dashboard: `/app/projects/[projectId]`.

Launch monitoring touchpoints:

- `/app`
- `/app/teams`
- `/app/teams/new`
- `/app/teams/[teamId]`
- `/app/teams/[teamId]/members`
- `/app/projects/new`
- `/app/projects/deployment/[id]`
- project dashboard summary

Include:

- personal context and onboarding next action
- team context, membership summary, invites, and roles
- project portfolio summary
- project context
- readiness summary
- deployment monitor summary
- content runtime status
- R2/CDN readiness
- Market auth/private proxy readiness
- recent activity
- next actions
- allocation summary placeholder
- notification summary placeholder

Acceptance:

- dashboard answers the four page questions
- dashboard has active context and next action
- launch flow shows deployment status and recovery
- advanced operations do not dominate the default dashboard
- deployment UI consumes view models, not provider orchestration logic
- failed, retried, successful, and partially ready launches have defined UI states
- deployment monitoring does not become a generic provider orchestration UI; it remains view-model driven until multiple launch surfaces prove the same monitor shape

## Phase 8: Services And Capacity Readiness

Purpose: prove the service-readiness journey for hosts, integrations, capacity providers, diagnostics, and credentials without making infrastructure dominate ordinary flows.

Implement:

- team services dashboard
- host collection/detail/settings
- capacity provider collection/detail/settings
- integration readiness summaries
- credentials/unlock flow integration where needed
- diagnostics and recovery actions
- project services readiness panel used by project launch and project dashboard

Acceptance:

- service pages use `ProductShell`, reusable templates, resolved actions, help, feedback, empty/error/setup states, and advanced-mode disclosure
- ordinary project/team dashboards show readiness summaries and next actions, not raw infrastructure by default
- hosts and capacity providers are represented as reusable resources with collection/detail/settings patterns
- private/service-sensitive details are policy-filtered
- services/capacity-provider pages do not become schedulers or provider orchestration code

## Phase 9: Allocation And Workday Operating Loop

Purpose: prove the recurring operating loop where users guide direction, allocate capacity, supervise agents/workdays, review exceptions, and fold output back into knowledge.

Implement:

- project direction workspace beyond first questions proof
- objectives, notes, decisions, and proposals as repeated direction resources
- team portfolio allocation
- project allocation
- workstream/mode allocation
- agent-class and agent allocation views
- workday collection/detail/workspace
- agent run status
- review queue, blocked work, failures, approvals, reruns
- activity/audit timeline across direction, allocation, agents, and workdays

Nested allocation proof must use:

```text
team portfolio
  -> projects
  -> workstreams/modes
  -> agent classes
  -> agents
  -> capacity providers / provider grants
```

Acceptance:

- repeated direction/workday/allocation resources use shared templates and UI schemas
- capability modules are package-owned
- repeated resources define help schemas where users need contextual guidance
- route controllers remain explicit unless repetition justifies a page factory
- collection/detail/create/edit behavior stays consistent
- command entries and audit labels are generated or configured from schemas
- expansion happens resource-by-resource and stops when a resource requires a new template, policy state, or schema facet that has not been proven
- `DynamicPieAllocationInput` is used inside reusable allocation panels
- inherited limits are visible
- overrides are explicit, audited, and reversible
- desired allocation, scheduled reservation, active assignment, and actual usage are visually distinct
- workday supervision distinguishes running, blocked, failed, completed, and needs-review states

## Phase 10: Knowledge And Capability Distribution

Purpose: prove updating, packaging, distributing, acquiring, and reusing knowledge/capabilities after project/content workflows are stable.

Implement:

- knowledge management dashboard
- books and pages
- Knowledge Hub overlay proof expansion
- release manager
- release review
- knowledge pack listing
- template listing
- capability listing
- install/download/import flow
- seller onboarding
- entitlement-aware private/paid download paths

Acceptance:

- public packs use CDN-backed artifact delivery
- private, paid, entitlement-gated, or team-only packs use content proxy or short-lived signed URLs after policy checks
- release/listing notifications are policy-filtered
- publish actions use release governance
- install/download/import actions are resolved by policy before exposing artifact URLs
- marketplace/release flows do not bypass the public/private content delivery, entitlement, notification, help, or feedback rules proven in earlier phases
- generated knowledge packs are treated as runtime artifacts, not software build outputs
- distribution flows combine public profiles/books, generated packs, templates, listings, visibility, entitlement, and reuse actions without duplicating publish concepts

## Target Interfaces

Documentation-only change. No runtime APIs change.

The docs define illustrative target contracts for future implementation:

- `CapabilityDefinition`
- `ResourceUiSchema`
- `ResourceDisplaySchema`
- `ResourceCollectionSchema`
- `ResourceFormSchema`
- `ResourceActionSchema`
- `ResourceOverlaySchema`
- `ResourceAuditSchema`
- `ResolvedAction`
- `PageViewModel`
- `DashboardViewModel`
- `ContentRuntimeContext`
- `OverlayViewModel`
- `NotificationViewModel`
- `HelpDefinition`
- `HelpContext`
- `ResourceHelpSchema`
- `FeedbackContext`
- `FeedbackSubmission`
- `FeedbackScreenshotAttachment`
- `DeploymentMonitorViewModel`
- `AllocationViewModel`

## Enforcement And Test Strategy

Each phase must add enforcement appropriate to the slice.

Required enforcement categories:

- dependency boundary checks
- route inventory checks
- legacy quarantine/import checks
- forbidden buildable backup directory checks
- no page-local visual system checks
- no raw role checks in templates
- no direct template API facade calls
- component examples for primitives/components/templates
- visual regression for canonical templates
- accessibility checks
- Playwright tests for critical journeys
- public/private R2 security tests
- bundle budget checks
- contextual help resolution, policy filtering, runtime topic, and accessibility tests
- feedback redaction, screenshot attachment, and policy-safe notification tests

Enforcement rollout:

- Phase 0 records inventory and freeze rules.
- Phase 1 adds warning-only local checks for route inventory shape, legacy quarantine/import rules, forbidden buildable backup directories, dependency boundaries, token/theme usage, and template API calls.
- Phases 2 through 4 turn checks to failure for files touched by the vertical slice.
- Phases 5 through 7 add shell-level help/feedback/dashboard checks and bundle lazy-loading checks.
- Phases 8 through 10 add service readiness, allocation/workday, and distribution/acquisition checks package-by-package as resources migrate.

Owner defaults:

- `@treeseed/ui`: token/theme audits, component examples, visual regression, accessibility fixtures, reusable bundle surfaces.
- `@treeseed/admin`: ProductShell routes, route controllers, view models, policy/action display tests, dashboard and workflow integration tests.
- `@treeseed/core`: public reader routes, Starlight-style runtime navigation, public help topics, content runtime integration, public bundle/cache behavior.
- root `@treeseed/market`: tenant composition, public acquisition pages, marketplace presentation, public route compatibility.
- `@treeseed/api` and `@treeseed/sdk`: authorization contracts, entitlement contracts, policy inputs, operation/deployment contracts, content proxy contracts.

No phase is complete when its implementation works manually but its relevant enforcement remains absent. A missing enforcement check may be accepted only with an explicit follow-up owner and removal date.

## Compatibility And Rollback

Existing public URLs must keep working through redirects, wrappers, or compatibility controllers while pages migrate.

Compatibility wrappers are temporary migration tools, not architecture. Each wrapper must name the legacy route/component it protects, the replacement capability, the tests required before removal, and the target deletion phase.

Rollback rules:

- vertical slices must be independently revertible when practical
- new registries/schemas must not remove working route controllers until replacement behavior is proven
- public content URLs must preserve SEO-safe redirects or canonical URLs
- auth/private content failures must fail closed
- release/marketplace download changes must preserve entitlement safety over convenience
- rollback must use Git history, feature flags, or compatibility wrappers rather than copied source trees inside buildable project folders
- replaced legacy code must be deleted in the same slice that proves the replacement unless the inventory records a specific blocker and owner

## Canonical First Slices

Defaults chosen for this migration:

- first direction resource: project questions
- first public acquisition/runtime reader: R2-backed `/knowledge/*` route
- first private Knowledge Hub path: private book/page through content proxy
- first feedback proof: public shell plus ProductShell plus one Core Knowledge Hub route
- first contextual help proof: public runtime help topic plus one authenticated project questions page
- first setup lifecycle proof: `/app`, team creation/membership, project creation, project launch monitor
- first service-readiness proof: team services dashboard with one host and one capacity provider path
- first allocation proof: team portfolio to project to agent class
- first workday proof: project workday status/review/exception workspace
- first distribution proof: generated knowledge pack/listing with entitlement-aware install/download/import

---

# Historical Archive: Prior UX Migration Plan

The content below is preserved as historical context. It is not the current implementation sequence unless explicitly referenced by the canonical plan above.

# TreeSeed UX Migration Implementation Plan

## Current Package Ownership Note

This document includes historical migration context. The current split is:

- reusable layout-down UI lives in `@treeseed/ui`
- admin pages, middleware, view models, and route behavior live in `packages/admin`
- root market keeps content, public messaging, page overrides, Treeseed branding, and future ecommerce
- backend API and operations runner behavior live in `packages/api`
- old root implementation paths should be read as pre-admin/UI split history unless they already point to `packages/admin/...`

See [Package Ownership](./package-ownership.md) for the current map.

## Current Implementation Status

The authenticated app has been simplified again after the operational-dashboard migration. The current product UI is now a controls-first flow:

```text
Start -> Hosts -> Projects -> Capacity -> Work -> Knowledge
```

Team creation, editing, deletion, membership, and switching are handled through the persistent sidebar team selector and `/app/teams`, not as a primary Start-page or sidebar step.

The earlier Mission Control, Workdays, Governance, and Infrastructure app sections are retained below as historical migration context only. They are not the current routed app IA. The current routes are:

```text
/app
/app/hosts
/app/projects
/app/projects/[projectId]/settings
/app/capacity
/app/work/objectives
/app/work/decisions
/app/work/questions
/app/knowledge/artifacts
/app/knowledge/[category]/[slug]
```

The current app should prioritize one-purpose controls for configuring hosts, launching hosted projects, managing capacity, guiding project work, recording decisions and questions, and publishing or packaging knowledge artifacts. It should not reintroduce dashboard-first routes, compatibility redirects, observability-style overview pages, duplicate team-management entry points, or JSON credential inputs.

## Purpose

This document defines the implementation strategy for migrating TreeSeed from a fragmented feature-oriented interface into a cohesive operational coordination system aligned with the platform’s long-term positioning:

> Governable AI Infrastructure for Organizational Continuity.

The goal is not merely to redesign the interface.

The goal is to:

* restructure the entire operational mental model,
* align the UI with the product strategy,
* simplify navigation,
* improve demo coherence,
* improve onboarding clarity,
* and make TreeSeed feel like durable operational infrastructure instead of a collection of experimental AI tooling surfaces.

This plan is intentionally comprehensive and architecture-aware.

---

# Strategic UX Principles

## 1. Operational Flow Over Feature Exposure

The current interface exposes too many implementation concepts simultaneously:

* projects,
* teams,
* agents,
* pools,
* marketplaces,
* templates,
* capacity providers,
* worker internals,
* knowledge packs,
* repository hosts,
* deployment topology,
* and runtime systems.

This forces users to learn:

* the backend architecture,
* database model,
* infrastructure model,
* and package topology

before understanding the product value.

The new UX must instead optimize around:

```text
Objective
→ Workday
→ Execution
→ Governance
→ Knowledge
```

The system should feel operational and continuous.

Not modular and fragmented.

---

## 2. Workday Becomes The Core Product Abstraction

The current UX over-emphasizes:

* projects,
* agents,
* and infrastructure.

The strongest differentiated abstraction is:

# Workday

A workday encapsulates:

* objective intake,
* repository analysis,
* task decomposition,
* execution,
* approvals,
* generated artifacts,
* operational traceability,
* and knowledge production.

Everything in the application should orbit workdays.

---

## 3. Agents Become Implementation Details

Users should not think in terms of:

* planner agents,
* reviewer agents,
* notifier agents,
* releaser agents.

The UX should instead present:

* research,
* implementation,
* verification,
* release,
* governance,
* knowledge generation.

Agents remain internally important.

They should rarely be first-class UX entities.

---

## 4. Knowledge Is An Output Of Operations

Knowledge should not feel like:

* a publishing platform,
* a documentation site,
* or a content system.

It should feel like:

# institutional memory produced by operational work.

This is one of TreeSeed’s strongest differentiators.

The UI must reinforce:

```text
Operational work compounds into durable organizational knowledge.
```

---

## 5. Governance Must Feel Serious

Governance is not a secondary queue.

Governance is a trust system.

The interface should visually resemble:

* deployment review,
* incident response,
* security approval,
* audit systems,
* CI/CD verification,
* or regulated operational tooling.

Avoid:

* playful AI aesthetics,
* noisy interfaces,
* chat-first interaction,
* or prompt-centric workflows.

---

# Target Information Architecture

# Primary Navigation

The entire application should collapse into:

```text
Mission Control
Workdays
Governance
Knowledge
Infrastructure
```

No additional primary sections.

Everything else becomes contextual.

---

# Application Surface Redesign

---

# 1. Mission Control

## Purpose

Mission Control becomes:

# the operational overview of the organization.

This replaces:

* team home,
* project overview,
* seeds,
* status pages,
* operational summaries,
* and fragmented dashboards.

---

## Mission Control Layout

### Top Section

```text
Current Objective
Operational Summary
Current Workday Status
```

---

### Middle Section

```text
Active Workdays
Queued Operational Work
Pending Approvals
Repository Health
```

---

### Bottom Section

```text
Recent Knowledge Produced
Recent Decisions
Recent Releases
Operational Metrics
```

---

## Mission Control Design Principles

### Must Communicate Immediately

```text
AI work is structured, visible, and governable.
```

---

### Avoid

* chatbot framing,
* generic dashboard cards,
* excessive widgets,
* and infrastructure-first language.

---

## Existing Components To Reuse

Potential reusable primitives:

* `MetricCard.astro`
* `MetricGrid.astro`
* `Panel.astro`
* `DataTable.astro`
* `PageHeader.astro`
* `AppShell.astro`
* `TopBar.astro`

Existing project/team overview data loaders should be consolidated into:

* unified operational summary queries,
* workday summaries,
* approval state,
* and knowledge generation summaries.

---

# 2. Workdays

## Purpose

Workdays become:

# the center of the product.

Not projects.
Not agents.
Not repositories.

Workdays.

---

# Workday Surface Architecture

## Workday Overview

### Header

```text
Objective
Repository Context
Operational State
Budget
Risk Classification
Current Phase
```

---

### Main Execution Timeline

The primary UI should be:

# a continuous operational timeline.

Example:

```text
Goal Received
Repository Inspection
Research Started
Task Decomposition
Implementation Running
Verification Running
Approval Requested
Knowledge Generated
Published
```

This timeline should become:

* visually dominant,
* calm,
* information-dense,
* and operational.

---

## Timeline Event Types

### Research Events

```text
Repository Analysis
Referenced Decisions
Referenced Documentation
Dependency Discovery
```

---

### Execution Events

```text
Implementation Started
Verification Running
Patch Generated
Tests Completed
```

---

### Governance Events

```text
Approval Requested
Escalated
Reviewed
Approved
Rejected
```

---

### Knowledge Events

```text
Architecture Update Generated
Operational Report Published
Release Notes Created
Knowledge Hub Updated
```

---

## Critical UX Rule

Do NOT expose:

* raw prompts,
* token streams,
* conversational agent chatter,
* autonomous agent theatrics,
* or verbose reasoning dumps.

The system should resemble:

* operations tooling,
* workflow systems,
* CI/CD systems,
* deployment pipelines,
* or incident management.

Not:

* AI chat.

---

## Workday Subsections

```text
Overview
Execution Timeline
Artifacts
Repository Context
Governance
Knowledge Outputs
```

No additional nesting.

---

## Existing Systems To Integrate

The current architecture already models most required concepts.

Relevant existing structures:

* `work_days`
* `tasks`
* `task_events`
* `task_outputs`
* `reports`
* `project_workday_summaries`
* `approval_requests`
* `capacity_ledger_entries`
* `capacity_routing_decisions`

The migration should focus on:

* UX consolidation,
* query consolidation,
* and operational framing.

Not rebuilding backend systems.

---

# 3. Governance

## Purpose

Governance becomes:

# a first-class operational review system.

Not a hidden inbox.

---

# Governance Surface Structure

## Primary Sections

```text
Pending Approvals
Risk Classifications
Escalations
Review Timeline
Audit Trail
Policies
```

---

## Governance Design Requirements

### Visually Calm

Avoid:

* excessive colors,
* clutter,
* and animation-heavy interfaces.

Use:

* structured review panels,
* timeline systems,
* approval states,
* and operational metadata.

---

## Governance Actions

```text
Approve
Request Revision
Escalate
Pause Execution
Reject
Publish
```

These actions should feel:

* deliberate,
* operational,
* and trustworthy.

---

## Existing Systems To Reuse

Current models already support much of this:

* `approval_requests`
* `team_inbox_items`
* `audit_events`
* `task_events`
* `reports`

The migration should unify these into:

# a coherent governance workflow.

---

# 4. Knowledge

## Purpose

Knowledge becomes:

# institutional operational memory.

Not a separate publishing product.

---

# Knowledge Information Architecture

```text
Architecture
Operations
Research
Implementation
Decisions
Reports
Releases
```

---

## Key UX Principle

Every knowledge object should visibly connect back to:

* originating workdays,
* repositories,
* approvals,
* and operational events.

Knowledge must feel:

# generated from real organizational work.

---

## Knowledge Entry Layout

### Header

```text
Produced By
Related Workday
Repositories Referenced
Generated During
Approval Status
```

---

### Main Body

Structured operational content.

Avoid AI-document aesthetics.

---

### Sidebar

```text
Related Decisions
Related Deployments
Related Reports
Related Research
```

---

## Existing Content Systems To Reuse

Current content architecture is strong.

Relevant structures:

* `src/content/knowledge`
* books system
* decisions
* proposals
* reports
* published artifacts
* content runtime
* generated knowledge pipelines

The migration should:

* improve presentation,
* unify operational context,
* and reduce navigation fragmentation.

---

# 5. Infrastructure

## Purpose

Infrastructure becomes:

# advanced operator tooling.

Not core product UX.

---

# Infrastructure Sections

```text
Repositories
Deployments
Capacity
Workers
Hosts
Integrations
Policies
```

---

## Important UX Rule

Infrastructure should intentionally feel:

* secondary,
* advanced,
* and operator-focused.

Most users should rarely need these surfaces.

---

## Existing Systems To Move Here

Current sections that should migrate into Infrastructure:

* capacity providers
* worker pools
* repository hosts
* deployments
* project environments
* routing decisions
* marketplace inventory
* topology views
* integration management

---

# Market UX Repositioning

## Current Problem

The marketplace currently appears too central.

This conflicts directly with strategic positioning.

The marketplace is:

# ecosystem infrastructure.

Not:

# the product core.

---

# New Positioning

Rename conceptual framing from:

```text
Marketplace
```

to:

```text
Resources
Imports
Extensions
Operational Assets
```

---

# Move Out Of Primary Navigation

These should no longer be top-level:

* templates
* products
* knowledge packs
* catalog
* marketplace inventory

These belong under:

```text
Infrastructure → Resources
```

or:

```text
Knowledge → Imports
```

---

# Team + Project Consolidation

## Current Problem

Current structure:

```text
Team
  → Project
    → Section
```

creates excessive hierarchy.

---

# New Model

Projects become contextual metadata.

The operational hierarchy becomes:

```text
Mission Control
  → Workday
    → Artifacts
```

Teams and projects remain in the backend model.

But they should no longer dominate navigation.

---

# Routing Migration Plan

## Existing Routes

Earlier app routes included team/project-first, project-section, market, template, and knowledge-pack entrypoints.

Those route families are deprecated as user-facing app navigation.

---

# New Route Structure

## Primary App

```text
/app
/app/hosts
/app/projects
/app/capacity
/app/work/objectives
/app/work/decisions
/app/knowledge/artifacts
```

---

## Work

```text
/app/work/objectives
/app/work/objectives/new
```

---

## Decisions

```text
/app/work/decisions
/app/work/decisions/[approvalId]
/app/work/questions
```

---

## Knowledge

```text
/app/knowledge/[category]/[slug]
```

---

## Hosts, Projects, And Capacity

```text
/app/hosts
/app/projects
/app/capacity
```

---

# UI Component Migration

## Components To Preserve

The current Astro UI primitives are largely reusable.

Strong reusable systems:

* cards,
* panels,
* tables,
* app shell,
* typography,
* layout systems.

---

## Components To Create

### Operational Timeline

New reusable component:

```text
OperationalTimeline.astro
```

Capabilities:

* chronological events,
* event categories,
* repository references,
* artifact links,
* governance markers,
* and execution status.

---

### WorkdaySummaryCard

Used throughout Mission Control.

Displays:

* objective,
* current phase,
* active tasks,
* approvals,
* generated artifacts.

---

### GovernancePanel

Structured review interface.

---

### KnowledgeArtifactCard

Operational knowledge summary card.

---

### RepositoryContextPanel

Displays:

* repositories,
* referenced files,
* related decisions,
* linked operational history.

---

# Visual Design System Direction

## Desired Emotional Tone

The product should feel like:

* operational infrastructure,
* mission control,
* CI/CD systems,
* governance tooling,
* deployment systems,
* observability systems.

---

## Avoid

* chatbot aesthetics,
* floating prompt interfaces,
* neon AI branding,
* excessive motion,
* playful agent avatars,
* or terminal-roleplay interfaces.

---

## Recommended Design Language

### Typography

Strong hierarchy.

Dense operational readability.

---

### Layout

* structured grids,
* timelines,
* operational traces,
* and stable panels.

---

### Color System

Muted operational palette.

Use color primarily for:

* severity,
* risk,
* status,
* and governance state.

---

### Motion

Minimal.

Use motion only for:

* state transitions,
* execution progress,
* and operational continuity.

---

# Backend Consolidation Work

## Query Layer Consolidation

Current UI likely issues many fragmented queries.

The new UX requires:

# operational aggregate endpoints.

---

# Recommended Aggregate APIs

## Mission Control API

```text
GET /api/mission-control
```

Returns:

* active workdays,
* operational state,
* approvals,
* knowledge generation,
* deployment summaries,
* repository health.

---

## Workday API

```text
GET /api/workdays/:id
```

Returns:

* timeline,
* tasks,
* repository references,
* outputs,
* approvals,
* reports,
* generated knowledge.

---

## Governance API

```text
GET /api/governance
```

Returns:

* pending approvals,
* escalations,
* audit trails,
* review states.

---

## Knowledge API

```text
GET /api/knowledge
```

Returns:

* operational artifacts,
* generated reports,
* architecture outputs,
* release notes,
* and relationships.

---

# Demo Optimization Strategy

The interface should explicitly optimize for:

# the 20-minute operational demo.

---

# Demo Flow Mapping

## Step 1 — Mission Control

Establish:

```text
This is operational infrastructure.
```

---

## Step 2 — Workday Creation

Introduce objective.

---

## Step 3 — Execution Timeline

Show:

* research,
* repository analysis,
* execution,
* verification.

---

## Step 4 — Governance

Show:

* approval requests,
* review flow,
* auditability.

---

## Step 5 — Knowledge Output

Show:

* generated operational assets,
* reports,
* release guidance,
* architecture updates.

---

## Step 6 — Close

End on:

```text
Every workday improves organizational memory.
```

---

# Migration Phases

# Phase 1 — Navigation Simplification

## Goals

* collapse navigation,
* remove fragmentation,
* establish new operational hierarchy.

## Deliverables

* new application sidebar,
* removal of marketplace-first navigation,
* consolidation of team/project navigation,
* Mission Control landing surface,
* infrastructure relegation,
* simplified route hierarchy.

## Technical Tasks

### Navigation Refactor

Refactor:

* `RailNav.astro`
* `BottomNav.astro`
* `AppShell.astro`
* `TopBar.astro`

into:

```text
Mission Control
Workdays
Governance
Knowledge
Infrastructure
```

---

### Route Migration

Introduce:

```text
/app
/app/hosts
/app/projects
/app/capacity
/app/work/objectives
/app/work/decisions
/app/knowledge/artifacts
```

Begin deprecating:

* nested project section routing,
* direct marketplace entrypoints,
* and section-oriented project navigation.

---

### Data Loader Consolidation

Create:

```text
mission-control.ts
workday-summary.ts
governance-summary.ts
knowledge-summary.ts
```

These become operational aggregate loaders.

---

## Success Criteria

Users can understand:

* what the organization is doing,
* what work is active,
* and what requires attention

within 30 seconds of entering the app.

---

# Phase 2 — Workday-Centric UX Migration

## Goals

* make workdays the primary operational abstraction,
* unify execution state,
* and eliminate fragmented execution views.

---

## Deliverables

* operational timeline system,
* workday overview page,
* unified artifact model,
* repository context integration,
* operational state visualization.

---

## Technical Tasks

### Create Operational Timeline System

New component:

```text
OperationalTimeline.astro
```

Capabilities:

* chronological operational events,
* grouped execution phases,
* artifact references,
* governance references,
* repository references,
* and execution state visualization.

---

### Workday Aggregate API

Implement:

```text
GET /api/workdays/:id
```

Aggregates:

* tasks,
* task events,
* reports,
* approvals,
* outputs,
* generated knowledge,
* capacity summaries,
* repository references.

---

### Replace Agent-Centric Views

Current agent-oriented surfaces should be reframed into:

```text
Research
Implementation
Verification
Governance
Knowledge
```

Agents remain backend execution actors.

They are no longer dominant UX objects.

---

### Artifact Consolidation

Unify:

* generated docs,
* reports,
* release notes,
* patches,
* verification output,
* and knowledge updates

under:

# operational artifacts.

---

## Success Criteria

A single workday page clearly communicates:

* what the system is doing,
* why it is doing it,
* what repositories were involved,
* what artifacts were produced,
* and what governance actions occurred.

Without requiring prompt inspection.

---

# Phase 3 — Governance System Elevation

## Goals

* transform governance into a first-class operational workflow,
* improve trust,
* improve auditability,
* and improve executive/demo clarity.

---

## Deliverables

* governance dashboard,
* approval workflows,
* escalation visualization,
* audit timeline,
* policy views.

---

## Technical Tasks

### Governance Dashboard

Current decision route:

```text
/app/work/decisions
```

Displays:

* pending approvals,
* escalations,
* review queues,
* severity state,
* policy violations,
* and audit history.

---

### Governance Timeline Integration

Governance events become embedded directly into workday timelines.

This visually reinforces:

```text
Execution is supervised.
```

---

### Audit System Integration

Unify:

* `audit_events`
* `approval_requests`
* `task_events`
* and `reports`

into a coherent operational audit stream.

---

### Policy Visibility

Expose:

* approval policy,
* escalation policy,
* budget thresholds,
* and operational constraints

in human-readable form.

---

## Success Criteria

Governance surfaces communicate:

* safety,
* traceability,
* and operational control

without feeling bureaucratic.

---

# Phase 4 — Knowledge System Unification

## Goals

* unify operational outputs and knowledge systems,
* eliminate publishing fragmentation,
* and reinforce institutional continuity.

---

## Deliverables

* unified knowledge index,
* operational knowledge relationships,
* workday-linked knowledge entries,
* operational report surfaces.

---

## Technical Tasks

### Knowledge Navigation Consolidation

Collapse:

* knowledge packs,
* books,
* generated docs,
* reports,
* and release notes

into:

```text
/app/knowledge
```

---

### Knowledge Relationship Graph

Each knowledge artifact should display:

* related workdays,
* related repositories,
* related deployments,
* related approvals,
* and related operational history.

---

### Operational Metadata Layer

All knowledge artifacts receive:

```text
Produced During
Generated By
Approved By
Repositories Referenced
Related Decisions
```

---

### Content Runtime Consolidation

Unify:

* generated reports,
* content runtime,
* books,
* operational notes,
* and release artifacts

under a consistent operational presentation layer.

---

## Success Criteria

Knowledge surfaces feel like:

# accumulated organizational memory.

Not:

# disconnected generated content.

---

# Phase 5 — Infrastructure Isolation

## Goals

* isolate advanced systems,
* reduce cognitive overload,
* preserve operational depth without exposing complexity by default.

---

## Deliverables

* Infrastructure section,
* advanced operator tooling,
* deployment administration surfaces,
* runtime diagnostics.

---

## Technical Tasks

### Move Advanced Systems

Relocate:

* capacity providers,
* worker pools,
* repository hosts,
* deployment topology,
* integrations,
* runtime internals,
* and marketplace inventory

into:

```text
/app/hosts
/app/projects
/app/capacity
```

---

### Infrastructure UX Design

Infrastructure intentionally becomes:

* dense,
* technical,
* operational,
* and advanced.

This is acceptable because it is no longer the onboarding experience.

---

### Runtime Visualization

Provide:

* queue health,
* worker status,
* deployment state,
* routing summaries,
* and system diagnostics.

But only within Infrastructure.

---

## Success Criteria

Operational administrators retain full visibility.

Primary users no longer experience infrastructure overload.

---

# Phase 6 — Demo Runbook And Operational Rehearsal

## Goals

* optimize the product for strategic demos through documentation and rehearsal,
* reinforce positioning,
* and maximize narrative coherence.

---

## Deliverables

* canonical demo runbook,
* seeded local demo prerequisites,
* app-surface walkthrough,
* operational storytelling guidance,
* troubleshooting guidance.

---

## Technical Tasks

### Demo Runbook

Create:

```text
docs/demo.md
```

The runbook demonstrates TreeSeed through the real seeded TreeSeed portfolio, local API, workday manager, worker runner, capacity system, governance records, and existing app surfaces.

Do not add demo-specific app functionality.

---

### Seeded Local Environment

Use:

```bash
npx trsd dev start --web-runtime local --setup auto
npx trsd auth:login --market local
npx trsd seed treeseed --environments local --validate
npx trsd seed treeseed --environments local --plan
npx trsd seed treeseed --environments local --apply --json
npm -w packages/agent run capacity-provider:test-local
```

The demo environment should be real:

* seeded TreeSeed team and market project,
* seeded repository metadata,
* seeded local capacity provider, lanes, grants, and work policy,
* real manager and worker records,
* real approvals, artifacts, reports, and capacity records.

---

### Demo Walkthrough

Document the walkthrough across:

```text
/app
/app/hosts
/app/projects
/app/capacity
/app/work/objectives
/app/work/decisions
/app/knowledge/artifacts
```

---

### Explicit Non-Goals

Do not implement:

* special demo app routes,
* special demo API endpoints,
* fake demo projections,
* demo seed manifests,
* simulated agent chatter,
* manually fabricated operational state.

---

## Success Criteria

A 20-minute walkthrough using the real local system naturally communicates:

```text
Goal
→ Execution
→ Governance
→ Knowledge
```

without requiring explanation-heavy narration.

---

# Phase 7 — UX Polish And Operational Identity

## Goals

* finalize operational visual identity,
* remove remaining AI-tool aesthetics,
* and establish long-term product tone.

---

## Deliverables

* final design system,
* typography refinement,
* motion refinement,
* operational visual language,
* accessibility improvements.

---

## Technical Tasks

### Typography Refinement

Prioritize:

* operational readability,
* dense information hierarchy,
* and calm visual rhythm.

---

### Motion Refinement

Use motion only for:

* execution transitions,
* operational continuity,
* and governance state changes.

Avoid decorative motion.

---

### Color System Finalization

Color becomes:

* severity signaling,
* status communication,
* risk communication,
* and operational context.

Avoid vibrant AI-tool palettes.

---

### Accessibility Pass

Ensure:

* keyboard accessibility,
* screen reader support,
* timeline accessibility,
* operational contrast standards,
* and scalable dense layouts.

---

## Success Criteria

The final system feels like:

* durable infrastructure,
* operational coordination software,
* and institutional tooling.

Not:

* experimental AI software.

---

# Migration Completion Status

The numbered UX migration phases are complete.

Implemented status:

* Phase 1 through Phase 5 were superseded by the controls-first simplification after operational dashboards proved too complex for the product task.
* The current authenticated app navigation is Start, Hosts, Projects, Capacity, Work, and Knowledge.
* Team management remains available through the persistent sidebar team selector and `/app/teams`.
* Work objectives, workday requests, decisions, and questions are managed under Work.
* Generated artifacts, templates, packs, releases, and publishing are managed under Knowledge.
* Phase 6 is documentation-only demo rehearsal through the real seeded local system.
* Phase 7 finalized the compact control-console visual identity, accessibility pass, and product tone.

There is no compatibility route layer for the old team/project section hierarchy.

Deprecated authenticated app routes, project-section controllers, team-section controllers, and agent-first UI components are intentionally retired rather than preserved.

---

# Recommended Implementation Order

## Highest Priority

1. Navigation simplification
2. Mission Control
3. Workday timeline system
4. Governance elevation

These produce the largest strategic UX improvements.

---

## Medium Priority

5. Knowledge unification
6. Infrastructure isolation
7. Aggregate APIs

---

## Final Priority

8. Demo optimization
9. Visual polish
10. Advanced operational tooling refinement

---

# Major Risks

## 1. Over-Exposing Backend Concepts

Avoid leaking:

* runtime models,
* agent topology,
* and infrastructure abstractions

into primary UX.

---

## 2. Reverting To Chat UX

The moment the product feels like:

* prompting,
* chatbot orchestration,
* or autonomous AI theatrics

TreeSeed loses differentiation.

---

## 3. Dashboard Fragmentation

Avoid returning to:

* many unrelated dashboards,
* feature silos,
* and disconnected operational surfaces.

---

# Frontend Architecture Migration Strategy

## Goals

* support gradual UX migration,
* preserve operational continuity during rollout,
* avoid large-scale route breakage,
* and reduce frontend architectural fragmentation.

---

# Astro Application Migration Strategy

## Existing Constraints

The current application likely mixes:

* route-level data loading,
* component-local fetching,
* nested layout state,
* operational dashboards,
* and marketplace-era navigation assumptions.

The migration must:

* preserve production stability,
* reduce cognitive complexity,
* and support progressive rollout.

---

# Recommended Frontend Architecture

## Core Principle

The frontend should become:

# operationally state-driven.

Not:

# route-fragment driven.

---

# Recommended Application Layers

```text
UI Components
→ Operational View Models
→ Aggregate APIs
→ Domain Services
→ Persistence
```

---

# View Model Layer

Introduce:

```text
packages/admin/src/view-models/
```

Examples:

```text
mission-control.vm.ts
workday.vm.ts
governance.vm.ts
knowledge.vm.ts
```

Responsibilities:

* aggregate formatting,
* UI-specific normalization,
* operational status shaping,
* and timeline transformation.

---

# State Management Strategy

## Avoid

* deeply nested component state,
* duplicated operational queries,
* and fragmented loading behavior.

---

## Recommended

Use:

* route-level aggregate loaders,
* event-stream updates,
* and lightweight reactive stores.

Prefer:

```text
Operational aggregate → UI projection
```

over:

```text
Many small independent API requests
```

---

# Real-Time Update Strategy

## Workday Timeline Requirements

The timeline becomes the central operational primitive.

Therefore it requires:

* event streaming,
* partial hydration,
* optimistic operational updates,
* and incremental rendering.

---

## Recommended Transport

Use:

* SSE,
* websocket streams,
* or operational event polling.

---

## Timeline Update Model

```text
Operational Event
→ Event Stream
→ Timeline Projection
→ UI Update
```

Avoid:

* full-page refreshes,
* and full timeline rerenders.

---

# Progressive Route Migration

## Migration Strategy

Do not preserve deprecated app routes for compatibility.

Introduce:

```text
/app/hosts
/app/projects
/app/capacity
/app/work/objectives
/app/work/decisions
/app/work/questions
/app/knowledge/artifacts
```

Keep `/app/teams` for the persistent team selector's management target, but do not make Team a primary navigation step. Remove dashboard route controllers as the clean control IA lands.

---

# Compatibility Layer

Introduce:

```text
LegacyRouteAdapter.ts
```

Responsibilities:

* old route redirects,
* legacy parameter normalization,
* and transition-state routing.

---

# Hydration Strategy

## Server First

Operational pages should render meaningful content server-side.

Hydrate only:

* timelines,
* live state,
* approvals,
* and operational progress indicators.

Avoid over-hydrating dashboard surfaces.

---

# Operational Domain Model

# Core Domain Entities

## Workday

Canonical operational coordination object.

Represents:

* organizational objective,
* operational execution,
* governance state,
* and generated organizational outputs.

---

## Workday State Machine

### States

```text
Draft
Queued
Planning
Researching
Executing
Verifying
Awaiting Approval
Publishing
Completed
Paused
Rejected
Failed
```

---

## Workday Transition Rules

### Example

```text
Planning
→ Researching
→ Executing
→ Verifying
→ Awaiting Approval
→ Publishing
→ Completed
```

---

## Governance Intercepts

Governance may transition workdays into:

```text
Paused
Escalated
Rejected
```

at any stage.

---

# Operational Artifact Model

## Artifact Types

```text
Patch
Report
Architecture Update
Verification Checklist
Deployment Guidance
Research Summary
Operational Decision
Release Note
Knowledge Entry
```

---

## Artifact Lifecycle

```text
Generated
Reviewed
Approved
Published
Archived
Superseded
```

---

# Governance Lifecycle

## Approval States

```text
Pending
Under Review
Approved
Rejected
Escalated
Superseded
Expired
```

---

## Governance Severity Levels

```text
Low
Moderate
High
Critical
```

Severity affects:

* escalation routing,
* approval requirements,
* and publication permissions.

---

# Repository Context Model

Repositories should not simply be treated as:

* git sources,
* or file containers.

Repositories become:

# operational context sources.

---

## Repository Context Includes

* implementation history,
* architectural rationale,
* deployment history,
* prior operational reports,
* related workdays,
* and governance history.

---

# Operational Read Model Architecture

## Core Principle

The UI should not reconstruct operational state from fragmented entities.

Instead:

# backend systems should materialize operational projections.

---

# Recommended Read Models

## MissionControlProjection

Materialized aggregate containing:

* active workdays,
* pending approvals,
* operational health,
* generated knowledge,
* deployment state.

---

## WorkdayProjection

Contains:

* timeline events,
* artifacts,
* governance state,
* repository context,
* operational metrics.

---

## GovernanceProjection

Contains:

* pending reviews,
* escalation state,
* policy violations,
* audit history.

---

## KnowledgeProjection

Contains:

* operational relationships,
* originating workdays,
* related repositories,
* publication state.

---

# Event Sourcing Strategy

## Recommended Operational Events

```text
WorkdayCreated
TaskPlanned
RepositoryAnalyzed
ExecutionStarted
VerificationCompleted
ApprovalRequested
ApprovalGranted
KnowledgePublished
DeploymentReleased
```

---

## Event Stream Benefits

Supports:

* timeline rendering,
* operational auditability,
* replayable execution history,
* and durable organizational memory.

---

# Design System Specification

# Design Principles

## Desired Feel

The interface should feel:

* operational,
* calm,
* inspectable,
* reliable,
* and serious.

---

## Emotional Targets

Users should feel:

* confidence,
* continuity,
* observability,
* and trust.

Not:

* novelty,
* autonomy theater,
* or AI spectacle.

---

# Typography System

## Scale

```text
Hero: 40–48px
Section Headers: 28–32px
Operational Headers: 20–24px
Body: 14–16px
Dense Operational Data: 12–13px
```

---

## Typography Characteristics

* high readability,
* strong hierarchy,
* compact operational density,
* minimal decorative styling.

---

# Spacing System

## Base Scale

```text
4px
8px
12px
16px
24px
32px
48px
64px
```

Operational layouts should prioritize:

* predictable rhythm,
* and dense readability.

---

# Operational Color System

## Semantic Colors

### Informational

Used for:

* research,
* neutral operational state,
* and informational traces.

---

### Success

Used for:

* approvals,
* completed verification,
* and successful publication.

---

### Warning

Used for:

* escalations,
* pending review,
* operational caution.

---

### Critical

Used for:

* blocked execution,
* failed verification,
* policy violations.

---

# Motion System

## Allowed Motion

* timeline progression,
* operational state transitions,
* artifact generation transitions,
* governance approval completion.

---

## Disallowed Motion

* decorative floating UI,
* animated agent avatars,
* excessive loading theatrics,
* or autonomous AI-style motion.

---

# Accessibility Standards

## Required Accessibility

* keyboard navigation,
* semantic timeline rendering,
* screen reader support,
* color contrast compliance,
* reduced motion support,
* scalable operational density.

---

# User Journey Specifications

# Platform Engineering Flow

## Goal

Support:

* deployment governance,
* operational verification,
* and release coordination.

---

## Journey

```text
Mission Control
→ Active Workday
→ Verification Review
→ Governance Approval
→ Knowledge Publication
```

---

# Research Organization Flow

## Goal

Preserve:

* inquiry,
* rationale,
* operational investigation,
* and institutional learning.

---

## Journey

```text
Objective
→ Research Workday
→ Repository Discovery
→ Generated Findings
→ Knowledge Publication
```

---

# Governance Reviewer Flow

## Goal

Provide:

* traceable review,
* policy visibility,
* and operational oversight.

---

## Journey

```text
Governance Queue
→ Review Timeline
→ Repository Context
→ Approval Decision
→ Audit Preservation
```

---

# Consulting Team Flow

## Goal

Enable:

* reusable organizational memory,
* client operational continuity,
* and knowledge reuse.

---

## Journey

```text
Client Objective
→ Workday Execution
→ Artifact Generation
→ Knowledge Packaging
→ Future Reuse
```

---

# Onboarding Flow

## Goal

New users should understand:

* operational coordination,
* governance,
* and durable organizational memory

within the first session.

---

## Onboarding Sequence

```text
Mission Control
→ Open Workday
→ Observe Timeline
→ Review Governance
→ Open Generated Knowledge
```

---

# Rollout Strategy

# Migration Principles

## Avoid Big Bang Rewrites

The migration should occur incrementally.

---

# Recommended Rollout Order

## Stage 1

* new navigation,
* Mission Control,
* operational framing.

---

## Stage 2

* workday timeline,
* aggregate APIs,
* governance integration.

---

## Stage 3

* knowledge consolidation,
* infrastructure isolation,
* route deprecation.

---

## Stage 4

* demo optimization,
* visual polish,
* operational refinement.

---

# Feature Flag Strategy

Introduce:

```text
ENABLE_MISSION_CONTROL
ENABLE_WORKDAY_V2
ENABLE_GOVERNANCE_V2
ENABLE_KNOWLEDGE_V2
```

Supports:

* gradual rollout,
* internal testing,
* and rollback safety.

---

# Telemetry & Success Metrics

## UX Metrics

Track:

* navigation depth,
* operational page engagement,
* governance completion rates,
* artifact publication rates,
* and knowledge reuse.

---

## Strategic Metrics

Track:

* workday completion quality,
* governance trust adoption,
* repository context utilization,
* operational continuity metrics,
* and generated knowledge retention.

---

# Demo Runbook Specification

This is documentation and rehearsal guidance only.

The canonical demo uses the real `treeseed` seed, local API, workday manager, worker runner, capacity records, governance records, and existing app surfaces.

Do not create a separate demo environment or demo-only runtime behavior.

# Canonical Demo Scenario

## Objective

```text
Improve deployment reliability documentation and operational verification guidance.
```

---

# Demo Repository Context

The seeded TreeSeed portfolio should expose:

* infrastructure repo,
* deployment repo,
* operational docs repo,
* release tooling repo.

---

# Demo Timeline Structure

## Real Workday Timeline To Narrate

```text
Objective Intake
Repository Inspection
Operational Research
Verification Discovery
Implementation Guidance
Approval Request
Knowledge Publication
```

---

# Demo Artifacts

When real work produces them, highlight:

* architecture rationale,
* deployment checklist,
* operational report,
* release notes,
* verification guidance,
* knowledge update.

---

# Demo Governance Events

When real work produces them, highlight:

* medium-risk approval,
* operational review,
* publication approval,
* audit timeline.

---

# Demo Presentation Rules

## Never Lead With

* prompting,
* code generation,
* or autonomous agent spectacle.

---

## Always Reinforce

```text
This system coordinates durable organizational work.
```

---

# Marketplace / Resource Ecosystem Architecture

# New Conceptual Framing

Replace:

```text
Marketplace
```

with:

```text
Operational Resources
```

---

# Resource Categories

## Reusable Workflows

Examples:

* deployment verification,
* release review,
* operational audit,
* architecture analysis.

---

## Knowledge Imports

Examples:

* operational playbooks,
* infrastructure guidance,
* governance templates.

---

## Execution Extensions

Examples:

* repository connectors,
* deployment integrations,
* operational automation adapters.

---

# Resource UX Placement

Resources should appear:

* contextually within workdays,
* inside Infrastructure,
* or within Knowledge imports.

Never as the primary onboarding experience.

---

# Explicit UX Governance Rules

# Hard Product Constraints

## Never Expose Raw Prompts In Primary UX

Prompt internals are implementation details.

---

## Never Expose Agent Chatter As Operational State

Operational systems should communicate:

* actions,
* artifacts,
* and outcomes.

Not simulated conversation.

---

## Never Require Runtime Topology Understanding

Users should not need to understand:

* worker pools,
* runtime orchestration,
* or execution topology

in order to coordinate operational work.

---

## Never Center Marketplace Concepts In Onboarding

Marketplace functionality is ecosystem infrastructure.

Not core positioning.

---

## Never Use Conversational UX As The Primary Workflow

Conversation may assist operational work.

It should not become the dominant operational interaction model.

---

## Never Sacrifice Governance Visibility For Autonomy Theater

Trust is strategically more important than apparent autonomy.

---

# Final UX Vision

The final TreeSeed experience should feel like:

# a governable operational system coordinating durable organizational work.

Users should continuously experience:

* operational continuity,
* repository grounding,
* execution traceability,
* governance,
* and accumulating institutional memory.

The product should never primarily feel like:

* an AI coding assistant,
* an autonomous agent playground,
* or a chatbot platform.

It should feel like:

# infrastructure for running organizational knowledge work.
