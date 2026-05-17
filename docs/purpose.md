# TreeSeed Purpose and Operational Positioning

## Working title

**TreeSeed: governable operational infrastructure for organizational continuity.**

## One-sentence product promise

TreeSeed helps organizations turn objectives into supervised workdays, reviewed outputs, and durable operational memory.

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

The authenticated app should remain centered on five sections:

```text
/app                 Mission Control
/app/workdays        Workdays
/app/governance      Governance
/app/knowledge       Knowledge
/app/infrastructure  Infrastructure
```

No retired section-first navigation should return to the primary app experience. Organizations and projects remain real operational context in the backend, but the app should present them through subdued context selectors, workday relationships, governance metadata, and Infrastructure panels.

## Section purposes

### Mission Control

Mission Control is the operational overview of the organization.

It should immediately show:

* current objective
* operational summary
* active workdays
* queued operational work
* pending approvals
* repository health
* recent knowledge produced
* recent decisions and releases
* operational metrics

Mission Control should communicate that AI-supported work is structured, visible, and governable.

### Workdays

Workdays are the center of the product.

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

The workday detail page should be the canonical operational surface. It should be phase-first and organized around Research, Implementation, Verification, Governance, and Knowledge.

### Governance

Governance is a first-class review system.

It should expose:

* pending approvals
* escalations
* review queues
* severity and risk classification
* policy constraints
* audit history
* capacity and budget constraints
* deliberate approval, rejection, revision, or escalation actions

Governance should feel serious, inspectable, and trustworthy.

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

1. Open Mission Control at `/app` and establish seeded operational context.
2. Open Workdays and inspect a real manager/worker timeline.
3. Review Governance and show pending review state, risk, policy, and auditability.
4. Open Knowledge and show generated artifacts becoming operational memory.
5. Open Infrastructure and show seeded projects, repositories, capacity, workers, hosts, resources, seeds, and policies as advanced operator context.

The demo should reinforce:

```text
Goal -> Execution -> Governance -> Knowledge
```

Never lead with prompting, code generation spectacle, or fake agent conversation. The system coordinates durable organizational work.

## Product principles

1. Mission Control is the entry point.
2. Workdays are the core product abstraction.
3. Governance is a trust system, not a hidden queue.
4. Knowledge is an output of operations.
5. Infrastructure is powerful but secondary.
6. Resources and imports are ecosystem infrastructure, not the main product frame.
7. Automation should appear through operational state, artifacts, verification, and decisions.
8. Primary UX should not expose raw prompts, task payload JSON, runner tokens, or agent IDs.
9. Missing data should render calm empty operational states.
10. Every surface should improve the user’s confidence in continuity, observability, and control.

## Current completion status

The UI migration has completed its numbered phases:

* Phase 1 simplified navigation around the five primary app sections.
* Phase 2 made workday detail the canonical operational surface.
* Phase 3 elevated Governance into a first-class review system.
* Phase 4 unified Knowledge as operational memory.
* Phase 5 isolated Infrastructure as advanced operator tooling.
* Phase 6 stayed documentation-only for demo rehearsal.
* Phase 7 polished the operational visual identity and accessibility layer.

There is no compatibility route layer for deprecated section-first app navigation. Future product work should extend the operational IA rather than reviving the old section model.
