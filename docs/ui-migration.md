# TreeSeed UX Migration Implementation Plan

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

The runbook demonstrates TreeSeed through the real seeded TreeSeed portfolio, local Market API, workday manager, worker runner, capacity system, governance records, and existing app surfaces.

Do not add demo-specific app functionality.

---

### Seeded Local Environment

Use:

```bash
npx trsd dev --surfaces web,api --setup auto
npx trsd auth:login --market local
npx trsd seed treeseed --environments local --validate
npx trsd seed treeseed --environments local --plan
npx trsd seed treeseed --environments local --apply --json
npx trsd dev:manager --with-worker --docs-automation dry-run --approval-policy manual --workday-id local-docs-1 --capacity-budget 500
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
src/view-models/
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
