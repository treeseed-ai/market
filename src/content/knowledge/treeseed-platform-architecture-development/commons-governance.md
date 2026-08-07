---
schemaVersion: treeseed.knowledge-page/v1
id: architecture.commons-governance
bookId: treeseed-platform-architecture-development
slug: commons-governance
title: Commons governance
summary: Participation, governance, voting, and bounded steward decision architecture.
status: published
visibility: public
order: 70
groupIds:
  - architecture
  - commons
  - governance
contributors: []
relatedBookIds: []
relatedKnowledgeIds:
  - guide.foundation.architecture
  - guide.foundation.platform
  - guide.governance
  - guide.governance.cooperative-decisions
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
  - commons
  - governance
documentationUrls: []
---

# TreeSeed Commons Governance

TreeSeed Commons is the participation layer for registered users who want to help shape TreeSeed priorities through questions, proposals, backing, votes, and bounded steward decisions.

The model is deliberately staged. Registration creates a Commons governance identity and read-only TreeSeed team membership. It does not create legal cooperative membership, equity, patronage rights, payout rights, or authority over every operational decision.

## Cooperative Governance And Ownership Model

The Commons uses the same core principle as the ecommerce system: the cooperative governance and ownership model remains the source of truth for trust, stewardship, contribution attribution, decisions, and historical evidence.

Commons records are advisory governance records:

- Participants may ask questions and submit proposals.
- Participants may back proposals to show priority.
- Participants may vote once per proposal with transparent weight snapshots.
- Delegation is scoped and revocable.
- Stewards convert signal into bounded decisions with public reasons.
- Decisions allocate attention and capacity inside documented constraints.

## Authority Boundaries

Registration grants participation, not unbounded control.

Binding authority is earned, scoped, auditable, and constrained by steward review, safety, architecture, legal, and capacity considerations. A steward decision may accept, reject, defer, schedule, implement, or archive a proposal.

The system does not add:

- legal member ledgers
- patronage or dividend ledgers
- revenue splits
- token credits
- payout allocation
- commission or fee logic
- automatic roadmap promises

## Weighting

Commons voting uses transparent modular weights. The initial `commons-v1` policy includes base participation, verified email, contribution, stakeholder, trust-role, and delegated components. Weights are capped, and every backing or vote stores an immutable snapshot of the participant's weight at that moment.

Money can add signal only if a future policy explicitly models it, but it must not dominate legitimacy. Contribution, affected-stakeholder status, trust, and stewardship remain separate concepts.

## Product Integration

The API persists Commons participants, questions, proposals, backings, votes, delegations, decisions, weight snapshots, and governance events.

> UI status: the `/app/commons` and `/commons` presentation routes described below were removed during the legacy UI cleanup. Commons backend contracts and persistence remain active; these route descriptions are historical redesign requirements. See [Legacy Routes](./legacy-routes.md) and [UI Redesign](./ui-redesign.md).

Historically, Admin owned steward operations under `/app/commons` and root Market owned participant-facing Commons pages under `/commons`.

The Commons layer reuses existing team membership, authentication, route descriptors, API acceptance metadata, and UI package components. It does not create a new ecommerce subsystem and does not change marketplace order, entitlement, Stripe, refund, service, or capacity behavior.

## UI Architecture Integration

Commons governance follows the canonical shell/template/view-model/action model.

The retired authenticated participant routes used `TreeseedOperationalMarketLayout`:

- `/commons` renders a `DashboardTemplate` with participant counts, active proposals, open questions, accepted decisions, and recent governance events.
- `/commons/proposals/:proposalId` renders a `DetailTemplate` with proposal body, vote/backing signal, decision timeline, and resolved participant actions.
- `/commons/proposals/new` and `/commons/questions/new` render `SettingsTemplate` forms. Form submissions go through route controllers and API-authoritative endpoints.

The retired authenticated steward routes used `TreeseedAppLayout`:

- `/app/commons` renders a `DashboardTemplate` shaped by an admin-owned governance view model.
- Steward detail/review routes render proposal, decision, participant, and event state through canonical templates and reusable governance components.

Commons UI may display advisory signal, proposal decision state, weight snapshots, participant summaries, and audit events. It must not render raw role checks, hidden policy internals, private payment identifiers, direct API calls in templates, or page-local help/feedback systems. Participant and steward commands must be resolved as `requiresSignIn`, `readOnly`, `denied`, `disabledWithReason`, or `allowed` before rendering.

## Release Boundary

Commons is part of the current TreeSeed governance release, not a future legal membership system. It proves the same cooperative governance and ownership model used by ecommerce products can also guide TreeSeed platform priorities.

Release and staging workflows should treat Commons changes like other cross-surface platform changes:

- SDK owns shared contracts and route metadata.
- API owns persistence and steward/participant route behavior.
- UI owns reusable governance components.
- root Market is the future owner for redesigned participant presentation.
- Admin's legacy steward presentation was removed; backend behavior remains API-owned.

No Commons release may add legal cooperative member ledgers, equity-like rights, patronage ledgers, payout allocation, revenue split behavior, token credits, or automatic roadmap authority.
