# TreeSeed Purpose and Operational Positioning

## Working title

**TreeSeed: governable operational infrastructure for organizational continuity.**

## One-sentence product promise

TreeSeed helps organizations turn objectives into supervised workdays, reviewed outputs, and durable operational memory.

## What Organizations Use TreeSeed For

Organizations use TreeSeed to coordinate AI-assisted operational work without losing governance, context, or continuity. The product gives teams a place to define objectives, connect hosts and repositories, supervise work, review decisions, publish knowledge, and retain institutional memory.

TreeSeed is delivered as a hosted market/admin platform and as a package-based system:

- Market is the Treeseed-operated public site, public content surface, authenticated operational marketplace, and Commons participant layer.
- Admin is the distributable organization portal for teams, projects, hosts, work, knowledge, and operations.
- API is the backend control plane and operations runner.
- Agent runs external capacity providers.
- TreeDX supplies product-neutral repository intelligence, graph/query, snapshots, artifacts, and federation.
- SDK, Core, UI, and CLI provide the platform substrate, web runtime, visual system, and operator command surface.

See [Package Ownership](./package-ownership.md) for the implementation map.

## Executive framing

TreeSeed should not be positioned as a content management system, project tracker, chatbot, autonomous agent playground, or resource-discovery-first product.

TreeSeed is an operational coordination system. It gives organizations a structured way to start knowledge work, inspect execution, apply governance, publish approved artifacts, and retain the memory produced by that work.

The core product distinction is the operational continuity chain:

```text
Objective
  -> Workday
  -> Execution
  -> Governance
  -> Knowledge
```

This chain should guide product strategy, app navigation, CLI flows, SDK contracts, APIs, data modeling, and agent/runtime presentation. Backend systems may still use precise implementation vocabulary, but the authenticated app should present the operational model first.

## Core purpose

TreeSeed exists to make organizational knowledge work visible, governable, reusable, and durable.

The practical purpose is to make the following easy:

1. Define an objective.
2. Run a workday grounded in repositories, prior decisions, policies, and capacity.
3. Track research, implementation, verification, approvals, and publication as operational events.
4. Route decisions through deliberate governance instead of ad hoc chat.
5. Produce artifacts that are linked to their originating workday, repositories, approvals, reports, and releases.
6. Preserve generated outputs as institutional memory.
7. Keep advanced infrastructure available to operators without making it the first thing every user must understand.

## The central rule

**Binding work remains governable and traceable.**

Agents, workers, and automation may research, implement, verify, summarize, and prepare recommendations. They should not become the visible authority in the product experience, and they should not obscure approval boundaries. The app must communicate actions, artifacts, outcomes, risk, and governance state.

A workday should show what the system is doing, why it is doing it, what context it used, what artifacts it produced, and what approvals were required. Knowledge entries should show the operational work that produced them.

## Why this matters

Most organizations already have tools for chat, tickets, documents, repositories, publishing, and AI assistance. What they usually lack is a calm shared system for answering:

* What objective is active?
* What work is currently running?
* What repositories and prior decisions are relevant?
* What requires approval?
* What changed, what was verified, and what was released?
* What durable knowledge was produced?
* How can another team trust and reuse the resulting operational assets?

TreeSeed should own this gap.

The strongest position is:

**TreeSeed coordinates durable organizational work through workdays, governance, and accumulated operational memory.**

## Primary users

TreeSeed should focus first on teams that repeatedly produce, revise, approve, and reuse operational knowledge.

Strong early audiences include:

* platform engineering teams
* documentation-heavy product teams
* research groups
* consulting teams
* civic and nonprofit program teams
* education and curriculum teams
* policy and advocacy groups
* open-source infrastructure projects
* internal enablement teams
* cooperative networks

The best early users will have three or more of these traits:

* they coordinate work across repositories, documents, decisions, and approvals
* multiple people review or approve changes
* they need to show why something changed
* they reuse similar operational patterns across teams or clients
* they care about provenance, auditability, and trust
* they want generated work to become durable institutional memory
* they have sophisticated coordination needs and limited tolerance for noisy tooling

## Primary personas

### Operational steward

A person responsible for keeping organizational work visible, coordinated, and trustworthy.

They care about current objectives, active workdays, approvals, risk, and outcomes.

### Governance reviewer

A person responsible for reviewing decisions, policy constraints, publication readiness, and operational risk.

They care about traceability, context, severity, and deliberate approval actions.

### Knowledge steward

A person responsible for turning operational work into durable architecture notes, reports, decisions, release guidance, and reusable memory.

They care about provenance, relationships, accuracy, and reuse.

### Platform operator

A person responsible for repositories, capacity, workers, hosts, integrations, seeds, policies, and diagnostics.

They care about reliability, budget, queue health, deployment state, and safe runtime operation.

### Program or consulting lead

A person responsible for applying operational patterns across clients, programs, or teams.

They care about repeatability, governance clarity, artifacts, and future reuse.

## Product posture

TreeSeed should feel like **calm industrial operations tooling**.

That means:

* operational language first
* dense but readable surfaces
* objective and workday state always visible
* governance boundaries clear
* repository context available without overwhelming the primary flow
* automation framed through actions and outcomes, not spectacle
* advanced infrastructure intentionally secondary
* every major surface answers: what is happening, what needs attention, and what durable memory was produced?

Avoid:

* chatbot-first workflows
* prompt-centric screens
* simulated agent chatter
* playful automation theater
* user-facing raw payloads, runner tokens, or topology internals
* making users understand backend architecture before understanding product value

## Authenticated app information architecture

The authenticated app should remain centered on contextual dashboards plus focused drilldowns:

```text
/app                         Personal dashboard
/app/services                Services
/app/projects                Projects
/app/capacity                Capacity
/app/work/objectives         Work objectives
/app/work/decisions          Work decisions
/app/work/questions          Work questions
/app/knowledge/artifacts     Knowledge artifacts
```

No retired section-first navigation should return to the primary app experience. Teams remain real operational context in the backend and are managed through the persistent sidebar team selector and `/app/teams`. Provider connections are active-team scoped under `/app/services`.

Project detail controls should keep deployment inside the selected project context. `/app/projects/:projectId/deploy` is the canonical place to inspect launch progress, readiness, staging and production deployment actions, monitor output, runner diagnostics, history, and events.

## Section purposes

### Start

Start has been replaced by the personal dashboard, which sends users to Services, Projects, Capacity, Work, or Knowledge.

It should immediately show:

* active team context
* host setup entry point
* project setup entry point
* capacity setup entry point
* work entry point
* knowledge entry point

Start has been replaced by a personal contextual dashboard. It should avoid duplicate team-management controls and retired Mission Control/provider-console patterns.

### Work

Work is where users create objectives and workday requests, answer decisions, and track questions.

A workday should encapsulate:

* objective intake
* repository analysis
* research
* task decomposition
* implementation
* verification
* approvals
* artifacts
* reports
* knowledge production

It should expose:

* pending approvals
* review queues
* policy constraints
* capacity and budget constraints
* deliberate approval, rejection, revision, or escalation actions

Work should feel serious, inspectable, and trustworthy without becoming a dashboard.

### Knowledge

Knowledge is institutional operational memory.

It should unify:

* architecture notes
* operational reports
* research summaries
* implementation guidance
* decisions
* release notes
* imports
* generated artifacts

Every knowledge object should show operational metadata where available: produced during, generated by, approved by, repositories referenced, related workdays, related approvals, related deployments, related reports, and related decisions.

### Infrastructure

Infrastructure is advanced operator tooling.

It should hold:

* teams and projects as operational context
* repositories
* deployments
* capacity and budget
* workers and queues
* hosts and integrations
* operational resources and imports
* seeds
* policies and diagnostics

Infrastructure may be technical and dense, but it should not expose secrets, raw execution payloads, prompts, or unnecessary topology internals.

## Resource ecosystem

TreeSeed still needs a resource ecosystem for reusable workflows, imports, templates, packs, extensions, and public assets. That ecosystem should be framed as operational resources and imports, not as the core app onboarding model.

User-facing resource language should emphasize:

* reusable workflows
* knowledge imports
* execution extensions
* operational assets
* provenance
* compatibility
* trust

Public resource surfaces and backend catalog APIs may keep precise implementation names when they are real contracts. The authenticated app should keep resource discovery contextual under Knowledge and Infrastructure.

## Naming guidance

Use operational language in the UI and docs that describe current product experience.

| Internal or technical concept | Preferred user-facing framing |
| --- | --- |
| Project | Operational context or repository context |
| Team | Organization context |
| Agent | Automation, worker, or execution role when needed |
| Task payload | Operational event or artifact summary |
| Marketplace | Operational resources or imports |
| Listing | Resource record or published operational asset |
| Inbox | Governance review queue |
| Workstream | Workday phase or execution lane |
| Generated document | Knowledge artifact |
| Runtime topology | Infrastructure diagnostics |

Use exact technical names only when documenting backend contracts, database fields, API routes, SDK types, or package runtime internals.

## Demo narrative

The primary demo should be a real operational walkthrough, not a fabricated demo mode.

The 20-minute story:

1. Open Start at `/app` and establish the active team through the sidebar selector.
2. Open Services and Projects to show the seeded local configuration.
3. Open Capacity and show provider, lane, and grant controls.
4. Open Work to show objectives, workday requests, decisions, and questions.
5. Open Knowledge and show generated artifacts, templates, packs, releases, and publish actions.

The demo should reinforce:

```text
Setup -> Project -> Work -> Knowledge
```

The project step includes service readiness and Deploy controls so a newly launched project can move from setup to staged web deployment without sending the operator to an infrastructure dashboard.

Never lead with prompting, code generation spectacle, or fake agent conversation. The system coordinates durable organizational work.

## Product principles

1. Start is the entry point.
2. Team management lives in the sidebar selector.
3. Services and Projects are explicit setup controls.
4. Work owns objectives, workday requests, decisions, and questions.
5. Knowledge owns generated artifacts, templates, packs, releases, and publishing.
6. Capacity owns provider, lane, key, and grant controls.
7. Automation should appear through operational state, artifacts, verification, and decisions.
8. Primary UX should not expose raw prompts, task payload JSON, runner tokens, or agent IDs.
9. Missing data should render calm empty operational states.
10. Every surface should improve the user’s confidence in continuity, observability, and control.

## Current completion status

The UI architecture has settled into the current operational model:

* Navigation is organized around the primary authenticated app sections.
* Workday detail is the canonical operational surface.
* Governance is a first-class review system.
* Knowledge is unified as operational memory.
* Infrastructure remains advanced operator tooling.
* Demo rehearsal remains documentation-driven.
* The operational visual identity and accessibility layer are part of the shared UI architecture.

There is no compatibility route layer for deprecated section-first app navigation. Future product work should extend the operational IA rather than reviving the old section model.
