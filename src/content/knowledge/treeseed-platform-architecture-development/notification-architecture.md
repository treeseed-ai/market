---
schemaVersion: treeseed.knowledge-page/v1
id: architecture.notification-architecture
bookId: treeseed-platform-architecture-development
slug: notification-architecture
title: Notification architecture
summary: Notification scope, preference, filtering, digest, and interface behavior.
status: published
visibility: public
order: 60
tags:
  - architecture
  - notification
  - architecture
contributors: []
relatedBookIds: []
relatedKnowledgeIds:
  - guide.foundation.architecture
  - guide.security.monitoring-auditing
  - guide.security.authentication
  - guide.security.accounts
  - guide.security.teams
  - architecture.ui-architecture
  - architecture.ui-foundation-baseline
  - architecture.content-runtime-architecture
  - architecture.auth-and-content-proxy
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
capabilityIds: []
routePatterns: []
resourceTypes:
  - platform-architecture
actionIds: []
keywords:
  - notification
  - architecture
documentationUrls: []
---

# TreeSeed Notification Architecture

## Canonical Status

This document specifies TreeSeed notification scopes, preferences, digest behavior, policy filtering, and UI presentation.

It supports [TreeSeed UI Architecture](./ui-architecture.md) and the generated [UI Architecture Inventory](./ui-architecture-inventory.md).

## Core Rule

Notifications must be capability-driven, scope-aware, preference-aware, and policy-filtered. They must not be one-off page alerts or ad hoc email triggers.

Notification events are derived from durable product events: activity, audit, actions, deployment, review, publish, overlay editing, content runtime, contextual help feedback, feedback, capacity, workday, membership, and security events.

## Current Identity-Slice Implementation

The account redesign implements the first notification slice from one SDK content-capability registry: objectives, questions, notes, proposals, decisions, and agents. The account has one global content-type set, optional authorized-project replacements, one IANA timezone, and one email cadence (`immediate`, `daily`, or `weekly`). An override replaces the global set; deleting it restores inheritance.

Durable content-publish events create policy-filtered recipient projections and suppress the actor. In-app notifications are immediately visible through the shared shell bell regardless of email cadence. The operations runner drains an idempotent outbox: immediate messages are event-keyed; daily and weekly deliveries are period-keyed and scheduled for approximately 08:00 local time (Monday for weekly). Access is checked during projection and again when listing notifications or following their safe target.

Existing users begin with no selected content types and therefore receive no new notification mail; cadence defaults to daily. Preference replacement is one database transaction. Events outside the SDK registry are rejected.

## Scopes

Supported notification scopes:

- global
- user
- team
- project
- resource
- deployment
- workday
- capacity
- feedback
- help

## Event Dimensions

Supported content/event dimensions:

- objectives
- questions
- notes
- books
- book pages
- decisions
- proposals
- artifacts
- releases
- marketplace listings
- deployment status
- content publish status
- service readiness status
- allocation status
- overlay review/publish status
- feedback submission status
- feedback triage status
- feedback follow-up status
- help topic feedback status
- help content update status
- capacity provider status
- workday status
- membership/invite status
- security/account status

## Periods

Supported notification periods:

- immediate
- hourly
- daily
- weekly
- muted

## Preference Inheritance

Notification preferences resolve by inheritance:

```text
global account content types
  -> optional exact project replacement
```

This intentionally simple inheritance is the complete account slice. Team/resource watch and mute layers remain future redesign work and must not be added as parallel preference paths.

## Policy Filtering

Notifications must be policy-filtered before display or delivery.

A user must never receive or inspect a notification that reveals a private project, private content title, object key, deployment detail, capacity detail, member identity, or entitlement-gated artifact beyond that user's authorization.

Notification links must route to policy-safe pages. If access changes after delivery, the destination page must render a denied/not-found state without leaking private metadata.

## UI Components

Notification UI should use reusable components:

- `NotificationBell`
- `NotificationDigest`
- `NotificationPreferencePanel`
- `ActivityFeed`
- `Timeline`

Notifications may appear in dashboards, context rails, command palette actions, settings, and digest views.

Feedback-derived notifications must use the same components. They may notify platform maintainers, support roles, team owners, or project leads when policy permits. Private feedback and screenshot attachments must never be exposed through notification previews beyond the recipient's authorization.

Help-derived notifications must also use the same components. They may notify maintainers when users mark help as missing, stale, confusing, or incorrect. Private help-topic feedback must not expose private route/resource context beyond recipient authorization.

Distribution-derived notifications follow the same policy-filtered model. Release review, listing publication, install/import/download, seller onboarding, and entitlement changes may produce notifications only after the event payload has been stripped of raw artifact keys, private URLs, credentials, and unauthorized listing or project metadata.

Commerce and Commons notifications follow the same model. Checkout, service quote, capacity inquiry, seller readiness, proposal backing/voting, and steward decision events may notify only the users or teams authorized for the event context. Notification previews must not include raw payment identifiers, connected-account internals, entitlement secrets, governance weight internals beyond participant-visible summaries, private object keys, or steward-only evidence.

## Notification Item Contract

Every notification must define:

- id
- scope
- event type
- resource type
- resource id
- actor
- title
- summary
- timestamp
- severity
- delivery state
- read/unread state
- target URL
- policy visibility
- digest period
- attachment sensitivity when applicable

## Actions

Notification commands and actions must come from the capability registry.

Examples:

- open project
- review change
- open deployment
- open draft
- approve decision
- rerun diagnostics
- open settings
- mute project
- watch content type
- open feedback
- triage feedback
- link feedback to roadmap item
- request more information
- open help topic
- improve help topic

## Required Tests

Implementations must add tests proving:

- private events are hidden from unauthorized users
- project mute overrides team default
- content-type preference overrides project preference
- digest period is honored
- notification links route to policy-safe pages
- access changes after delivery still produce safe denied/not-found behavior
- feedback notifications do not expose private screenshot attachments or private project metadata to unauthorized recipients
- feedback triage actions are policy-checked before a user can inspect, route, or link the submission
- help-topic feedback is policy-filtered before maintainers can inspect private route/resource context
