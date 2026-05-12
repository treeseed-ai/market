# TreeSeed Purpose and Market Positioning Canvas

## Working title

**TreeSeed: a cooperative knowledge system for turning direction into approved, reusable, distributable knowledge work.**

## One-sentence product promise

TreeSeed helps teams grow knowledge through objectives and questions, compare proposals, approve decisions together, and only then turn approved choices into change lanes, releases, templates, knowledge packs, and shared market outputs.

## Executive framing

TreeSeed should not be positioned as only a content management system, only a project tracker, only a developer workflow, only a marketplace, or only an AI-agent platform.

TreeSeed is a **TreeSeed operating system**: a connected set of tools that helps teams decide what knowledge should exist, produce it safely, verify it, release it, and distribute it in reusable forms.

The core product distinction is the **direction-to-release chain**:

```text
Objectives + Questions
        ↓
     Proposals
        ↓
     Decisions
        ↓
 Approved change lanes
        ↓
      Releases
        ↓
 Shared market outputs
```

This chain is the heart of TreeSeed. It gives the project a clear product identity and should guide the architecture, UX, CLI, SDK, API, data model, agent model, and market strategy.

## Core purpose

TreeSeed exists to help teams turn collaborative knowledge work into trusted, reusable, and distributable outputs.

The practical purpose is to make the following easy:

1. **Set direction** through objectives and questions.
2. **Generate possible approaches** through human and agent proposals.
3. **Make human-approved decisions** before binding work starts.
4. **Do the work in traceable change lanes** linked to the approved decision chain.
5. **Verify and release safely** with clear summaries of what changed and why.
6. **Package and distribute knowledge** as templates, knowledge packs, releases, and market listings.
7. **Preserve provenance and trust** so adopters know who made something, why it exists, what decisions shaped it, and how it can be reused.

## The central rule

**All binding work happens through human-approved decisions.**

This rule should remain a hard product and architecture boundary.

Agents may draft proposals. Humans may draft proposals. Agents may summarize notes, compare options, and suggest decision structures. But agents should not approve decisions or start binding work on their own.

A change lane must link to an approved decision. A release should summarize which decisions were implemented. A shared market output should be able to expose the public provenance that shaped it.

This makes TreeSeed a human-governed knowledge system rather than an autonomous content generator.

## Why this matters

Most teams already have tools for writing, chatting, storing files, assigning tasks, publishing websites, and running AI assistants. What they usually lack is a calm, shared system for answering:

* What are we trying to achieve?
* What questions are still open?
* What approaches have been proposed?
* Who approved the chosen path?
* What work came from that approval?
* What changed in the release?
* What can safely be shared or reused?
* Why should another team trust this template, pack, or published output?

TreeSeed should own this gap.

The strongest market position is not “we help you make content faster.” It is:

**TreeSeed helps teams make knowledge work governable, reusable, and distributable.**

## Primary users

TreeSeed should focus first on teams that repeatedly produce, revise, approve, and share knowledge outputs.

Strong early audiences include:

* civic organizations
* education teams
* nonprofit program teams
* research groups
* community organizers
* open-source knowledge projects
* curriculum teams
* policy and advocacy groups
* cooperative networks
* internal enablement teams
* documentation-heavy product teams

The best early users will have three or more of these traits:

* they publish guides, playbooks, toolkits, curricula, reports, or reusable internal knowledge
* multiple people review or approve changes
* they need to show why something changed
* they reuse similar project structures across teams or locations
* they care about trust, provenance, authorship, or public credibility
* they want to package knowledge so others can adopt or remix it
* they have limited technical capacity but sophisticated coordination needs

## Primary buyer or champion personas

### Knowledge steward

A person responsible for keeping shared knowledge accurate, useful, and reusable.

They care about clarity, provenance, adoption, and trust.

### Program lead

A person responsible for turning team learning into operational guides, public toolkits, training material, or reusable program assets.

They care about coordination, approval, deadlines, and adoption across contexts.

### Research steward

A person responsible for questions, evidence, notes, synthesis, and research-backed recommendations.

They care about inquiry, source context, and how research becomes decisions.

### Market steward

A person responsible for publishing templates, knowledge packs, and listings.

They care about trust details, compatibility, packaging, licensing, support, and distribution.

### Technical steward

A person responsible for making the system run reliably.

They care about CLI flows, hosting, environments, verification, deployment, capabilities, runners, and integrations.

## Product posture

TreeSeed should feel like a **calm cooperative workshop**.

That means:

* human language first
* technical detail available but secondary
* one primary action per screen
* direction and decisions always visible
* local, staging, and production always visible in project context
* approval boundaries clear
* agents framed as helpers, not authorities
* every card answers: what is it, what state is it in, and what can I do now?
* every major action shows what happens next

## Naming system

TreeSeed should consistently use human-facing language in the UI and technical language only as supporting detail.

| Technical / internal term | User-facing term             | Meaning                                                                             |
| ------------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| Project                   | Knowledge Hub                | A team-owned home for knowledge work                                                |
| Workstream                | Change lane                  | A decision-linked lane where approved work happens                                  |
| Release                   | Published version            | A verified version promoted for use                                                 |
| Template                  | Starting shape               | A reusable project structure                                                        |
| Knowledge Pack            | Shareable knowledge bundle   | A packaged body of reusable knowledge                                               |
| Agent                     | Helper                       | A working assistant that drafts, reviews, summarizes, or compares                   |
| Environment               | Local / Staging / Production | Where work runs or is published                                                     |
| Proposal                  | Suggested approach           | A possible way forward                                                              |
| Decision                  | Approved choice              | The human-approved authorization to act                                             |
| Note                      | Contextual annotation        | Evidence, context, feedback, or retrospective detail attached to something specific |

## Core capabilities required to fulfill the purpose

## 1. Team ownership and membership

TreeSeed must treat teams as the top-level owner of projects, releases, and market listings.

Individuals act through team membership.

Important capabilities:

* team creation and switching
* team-owned Knowledge Hubs
* team-owned listings
* team-owned billing and entitlements
* member roles
* plain-language permissions
* project-level access control
* market steward roles
* decision approver roles
* technical steward roles

Development guidance:

* Do not let the product drift into individual-owned projects as the default mental model.
* Team context should be visible in every authenticated workflow.
* Permissions should be shown in human language, not raw permission strings.

## 2. Direction model: objectives and questions

Objectives and Questions are the roots of cooperative knowledge growth.

Objectives define desired outcomes. Questions define research direction.

Important capabilities:

* create objective
* create question
* link question to objective
* attach notes and evidence
* show active direction in Project Overview
* show status: active, needs research, answered, blocked, archived
* let agents summarize question notes without changing approval state
* expose selected public objectives in market provenance when appropriate

Development guidance:

* Objectives and Questions should not feel like ordinary tasks.
* They are direction primitives.
* They should anchor the reasoning for proposals, decisions, work, releases, and packages.

## 3. Proposal model

A Proposal is a suggested way to meet an objective, answer a question, or move the project forward.

Important capabilities:

* human-authored proposals
* agent-drafted proposals
* proposals linked to objectives and/or questions
* proposal states: draft, under review, ready for decision, superseded
* proposal cards with author type, linked direction, notes count, and last updated
* proposal comparison
* amendment requests through notes
* proposal-to-decision conversion

Development guidance:

* A proposal should not automatically become executable work.
* Proposal generation is where agents can be powerful.
* Proposal approval is where human governance matters.

## 4. Decision system

The Decision is the authorizing record. It is the product’s most important governance primitive.

Supported decision types:

1. **Yes / No decision**

   * best for one proposal
   * result: approved or rejected

2. **Ranked proposal decision**

   * best for multiple competing proposals
   * result: ranked outcome and selected proposal(s)

3. **Lead approval decision**

   * best when broad input is useful but final approval is narrow
   * result: approved, rejected, or needs revision

Important capabilities:

* decision builder
* proposal reference(s)
* voting group
* required approvers
* quorum
* deadline
* pass rule
* visibility rule
* decision status
* decision result
* decision notes
* decision audit trail
* start-work authorization
* release inclusion summary

Development guidance:

* Decision status must always be visible in plain language.
* Ranked poll and yes/no flows should feel equally simple.
* Decision policy presets should exist so teams do not need to configure governance from scratch.
* A change lane cannot start without an approved decision.

## 5. Contextual notes

Notes help preserve context, feedback, evidence, and retrospective learning.

Important capabilities:

* notes attached to Objective, Question, Proposal, or Decision
* different composer prompts by parent type
* note activity history
* source links and evidence notes
* amendment requests
* decision retrospectives
* public trust summaries derived from selected notes

Development guidance:

* Notes should never be the approval mechanism.
* Notes should not become detached peer lanes by default.
* Notes should make the direction chain richer without weakening the decision boundary.

## 6. Change lanes / workstreams

A Change lane is where approved work happens.

Important capabilities:

* start change from approved decision
* show upstream chain before work starts
* create new lane or open existing lane
* show environment checks
* lifecycle columns: Drafting, Active locally, Verifying, Saved remotely, In staging, Archived
* workstream detail with summary, environment checks, decision chain, changes, notes, verification history, save history, archive action
* save progress
* run verification
* send to staging

Development guidance:

* The UI should translate CLI complexity into plain-language progress.
* Never show branch names by default unless the user expands technical details.
* Keep the relationship between decision and work visible at all times.

## 7. Verification and release

Release should be visible, safe, and boring.

Important capabilities:

* environment state: Local, Staging, Production
* release candidates
* unreleased change lanes
* decisions included
* verification report
* release notes draft
* version selector
* publish to production
* rollback
* export notes
* shareable release summary

Development guidance:

* A release should clearly separate what changed, which decisions were implemented, what was verified, what is blocked, and what will become public.
* The release page is operational, not decorative.
* Release trust is a major part of market trust.

## 8. Share, package, and publish

TreeSeed’s distribution loop depends on making knowledge reusable.

Important capabilities:

* export project snapshot
* export change lane bundle
* export release artifact
* package as template
* package as knowledge pack
* configure offer
* configure publisher info
* configure compatibility
* configure hooks policy
* configure reconcile support
* configure public provenance
* trust checklist
* listing preview
* publish to market
* archive listing

Development guidance:

* Share should merge export, packaging, and publishing.
* Public provenance should be optional and deliberate.
* Templates and knowledge packs should be treated as market-grade products, not only files.

## 9. Market discovery and trust

The Market is a discovery and distribution surface.

Important capabilities:

* browse listings
* search and filter
* product cards
* product detail pages
* publisher profiles
* trust drawer
* install or fork into a team
* buy, request, or claim access
* compare listings
* compatibility details
* update cadence
* fulfillment source
* publisher verification

Key filters:

* product type
* audience
* hosting model
* price model
* verified publisher
* compatible CLI / core version
* reconcile support
* built-in hooks only

Development guidance:

* Market trust details should be lightweight but always accessible.
* The Market should not become a generic app store.
* It should distribute reusable knowledge structures, templates, packs, and trusted outputs created through the TreeSeed direction chain.

## 10. Agent helpers

Agents should be understandable to non-technical users and constrained by human governance.

Important capabilities:

* draft proposal
* summarize question notes
* compare proposals
* draft decision summary
* draft release summary
* draft market description
* show current task
* show output type
* show status
* message log grouped by information, warning, action requested, proposal readiness, decision readiness, release readiness
* failures needing attention

Development guidance:

* Agents are helpers, not owners.
* Agents cannot approve decisions.
* Agents cannot start binding work.
* Agent outputs should feed proposals, summaries, reviews, and notes.
* The UI should explain agent role in plain English.

## 11. Hosting, environments, and operations

TreeSeed must support different operational postures without making ordinary users manage complexity.

Important capabilities:

* managed by TreeSeed
* self-hosted
* hybrid
* Local only
* Local + Staging
* Local + Staging + Production
* environment chips
* health status
* runner registration
* capability grants
* remote jobs
* project hosting topology
* infrastructure resources
* deployments
* monitor and rollback posture

Development guidance:

* Technical details should hide behind “show technical details.”
* Environment posture should remain visible in project context.
* CLI and SDK should preserve full power, while the app translates operations into plain-language states.

## 12. Capability and permission model

TreeSeed needs a strong capability model because it coordinates local work, remote execution, agents, publishing, and market distribution.

Important capabilities:

* capability grants
* execution class
* allowed targets
* dispatch mode
* enabled/disabled state
* who can approve capability use
* where capability can run
* plain-language capability descriptions

Example capability language:

* Graph refresh: refreshes project graph data.
* Agent execution: allows helpers to run approved tasks.
* Remote jobs: allows team-approved remote execution.
* Project runner: connects a hosted or self-hosted project runner.
* Workflow operations: allows staging, release, rollback, or publish actions.

Development guidance:

* Capability settings should translate technical grants into human language.
* Approval and execution should be separate concepts.
* Capability boundaries should reinforce the human-approved decision rule.

## System-by-system development focus

## Market web application

The Market app should be the human-facing TreeSeed portal.

Primary responsibilities:

* public discovery
* authenticated team home
* project workspace
* direction and decision board
* launch wizard
* workstream lifecycle views
* release flow
* share and packaging flow
* market listing detail
* team members and roles
* inbox and attention center
* settings and capability presentation

Development focus:

* implement the end-to-end prototype path first
* use the decision chain as the central organizing model
* keep one primary action per page
* keep technical details secondary
* make trust and provenance visible in market flows

## SDK

The SDK should be the programmable foundation for TreeSeed workflows.

Primary responsibilities:

* TreeSeed domain primitives
* graph and query model
* workflow state
* operations runtime
* template catalog
* packaging services
* project platform services
* reconcile support
* remote dispatch
* verification support
* store abstractions

Development focus:

* make Objectives, Questions, Proposals, Decisions, Notes, Change lanes, Releases, Templates, and Knowledge Packs first-class concepts
* expose safe operations for decision-linked work
* preserve enough metadata for provenance and market trust
* make packaging and compatibility checks reliable
* give the Market app stable APIs rather than leaking implementation details

## Core

Core should provide the reusable runtime, site generation, content model, API, platform integration, and agent infrastructure.

Primary responsibilities:

* content rendering and publishing
* tenant runtime
* API routes
* auth and RBAC
* agent runtime
* platform resources
* templates
* public Knowledge Hub runtime
* hosted project support
* forms and public site functionality

Development focus:

* keep public hubs cheap and reliable
* support static or heavily cached public delivery wherever possible
* keep forms, preview, authenticated, and workflow-driven surfaces dynamic where needed
* align content types with the TreeSeed model
* make release and publish behavior traceable
* keep agent behavior constrained by the decision boundary

## CLI

The CLI should remain the power-user and automation interface, while the Market app translates CLI complexity into beginner-safe language.

Primary responsibilities:

* init
* config
* status
* dev
* workflow
* save
* sync
* stage
* release
* rollback
* export
* template commands
* workspace operations
* doctor and repair flows

Development focus:

* keep CLI workflows deterministic and scriptable
* make CLI output compatible with UI status language
* support decision-linked work without making branch mechanics user-facing by default
* provide JSON outputs for app/control-plane integration
* expose technical details for stewards without forcing them on ordinary users

## Hosted control plane and operations

The hosted layer should coordinate team-owned projects, runners, environments, capabilities, jobs, deployments, and reporting.

Primary responsibilities:

* team/project registry
* project connections
* capability grants
* remote jobs
* hosting topology
* environments
* deployments
* agent pools
* workday summaries
* inbox items
* reporting snapshots

Development focus:

* make remote execution auditable and capability-gated
* make environment status reliable
* make team inbox items actionable
* connect operational events back to the direction chain
* support managed, self-hosted, and hybrid project postures

## Recommended v1 product spine

The first coherent version of TreeSeed should optimize for this path:

```text
Team Home
→ Launch Knowledge Hub
→ Add Objective and Question
→ Add or request Proposal
→ Create and approve Decision
→ Start Change from approved Decision
→ Save and verify work
→ Release with Decisions included
→ Package as Template or Knowledge Pack
→ Publish to Market with trust details
```

This path should drive data model priorities, UI implementation, CLI support, SDK APIs, and demo development.

## What to build first

## Phase 1: complete the core loop

Build enough to tell the full story from team-owned direction to shared output.

Priority surfaces:

1. Team Home
2. Launch project wizard
3. Project Overview
4. Direct
5. Start Change modal
6. Workstreams
7. Releases
8. Share
9. Market listing detail
10. Inbox

Priority primitives:

1. Team
2. Knowledge Hub
3. Objective
4. Question
5. Proposal
6. Decision
7. Note
8. Change lane
9. Release
10. Template
11. Knowledge Pack
12. Market Listing

## Phase 2: deepen trust and governance

Build the governance and market features that make TreeSeed more defensible.

Priority capabilities:

* decision policy management
* richer proposal comparison
* publisher profiles
* richer market search and filters
* compatibility checks
* remote runner setup
* billing and entitlements
* provenance controls
* market trust drawer
* team role management

## Phase 3: intelligence and ecosystem growth

Build features that help the network learn from distributed knowledge work.

Priority capabilities:

* analytics
* listing moderation queue
* team-level activity intelligence
* side-by-side proposal compare flows
* catalog quality review
* publisher verification
* recommendation and discovery loops
* reusable capability packs

## Positioning against alternatives

## Versus a CMS

A CMS manages content. TreeSeed manages the chain from direction to approved change to release to reusable knowledge product.

TreeSeed should say:

**“We do not just publish content. We preserve why the content changed and who approved the change.”**

## Versus a project tracker

A project tracker manages tasks. TreeSeed manages knowledge direction, proposals, decisions, and release provenance.

TreeSeed should say:

**“We do not start with tasks. We start with objectives, questions, and human-approved decisions.”**

## Versus a document workspace

A document workspace helps people write together. TreeSeed helps teams turn writing, research, and discussion into governed, reusable outputs.

TreeSeed should say:

**“The document is not enough. Teams need the decision chain behind the document.”**

## Versus an AI-agent platform

An AI-agent platform may generate work. TreeSeed uses agents as helpers inside a human-governed cooperative workflow.

TreeSeed should say:

**“Agents can draft, summarize, and compare. Humans approve what becomes real.”**

## Versus a marketplace

A marketplace lists products. TreeSeed’s Market distributes knowledge products with provenance, compatibility, and trust details.

TreeSeed should say:

**“The listing is the end of a trusted knowledge workflow, not just an upload.”**

## Best demo narrative

The strongest single demo is the direction-to-release-to-share loop.

Demo story:

A team wants to publish a reusable onboarding toolkit for community organizers.

Flow:

1. Open Team Home.
2. Launch a Knowledge Hub.
3. Add Objective: “Publish a reusable onboarding toolkit.”
4. Add Question: “What do first-time organizers get stuck on?”
5. Ask a helper to draft a proposal.
6. Compare the helper proposal with a human proposal.
7. Create a Decision.
8. Approve the Decision.
9. Start Change from the approved Decision.
10. Show the full chain: Objective → Question → Proposal → Decision.
11. Save progress and run verification.
12. Open Releases and show Decisions included.
13. Publish the release.
14. Open Share and package as a Knowledge Pack.
15. Publish a market listing with trust details.

Demo message:

**“TreeSeed helps teams turn questions and proposals into approved knowledge work, then release and share that work with a clear record of what changed and why.”**

## How to choose demo targets

Choose prospects who feel pain around turning messy collaborative knowledge into approved, reusable public or internal outputs.

Best-fit prospect questions:

* Do you publish or maintain reusable knowledge?
* Do multiple people need to approve changes?
* Do you need to show why something changed?
* Do you reuse similar structures across projects, locations, or teams?
* Do you want templates or packs others can adopt?
* Do you struggle to turn research and discussion into released output?
* Do you need public trust, provenance, or verification details?

Ideal early quote from a prospect:

> “We run programs in multiple places, and every team keeps reinventing onboarding docs, facilitator guides, and reporting templates. We need a way to approve, update, and share the best version.”

That prospect is a strong TreeSeed candidate.

## Product principles

1. One primary action per page.
2. Objectives and Questions set direction.
3. Proposals suggest how to act.
4. Decisions approve whether to act.
5. No change lane starts without an approved decision.
6. Notes always belong to something specific.
7. Never show branch names by default unless the user expands technical details.
8. Use human labels first, technical labels second.
9. Keep Local / Staging / Production visible in project context.
10. Always show what happens next after every major action.
11. Put destructive actions behind clearly named confirmations.
12. Make every card and row answer: what is it, what state is it in, what can I do now?
13. Decision status must always be visible in plain language.
14. Ranked poll and yes/no flows should feel equally simple.
15. Agents help; humans approve.
16. Releases explain what changed and why.
17. Market listings expose trust, compatibility, and provenance.

## Development guardrails

## Do not over-index on the Market browser first

A polished market browser is useful, but it is not the most differentiated thing.

The first priority should be proving that a team can create, approve, release, and package trustworthy knowledge work.

## Do not make agents the headline too early

Agents are valuable, but the stronger story is governed knowledge work.

Agents should amplify the cooperative workflow, not replace it.

## Do not bury Decisions

If Decisions are hidden, TreeSeed becomes a generic workflow tool.

Decisions should be visible in Direct, Start Change, Workstreams, Releases, Share, and Market provenance.

## Do not expose CLI complexity by default

TreeSeed should preserve CLI power but translate it in the UI:

* Local ready
* Platform configured
* Verification passing
* Saved locally
* Synced remotely
* Ready for staging
* Ready to publish

## Do not separate packaging from provenance

Templates and Knowledge Packs are more valuable when users can understand where they came from.

Packaging should preserve optional provenance from objectives, questions, proposals, decisions, notes, verification, and releases.

## Strategic north star

TreeSeed should become the trusted path for teams that want to create, govern, release, and distribute open knowledge and reusable capabilities.

The long-term opportunity is a cooperative knowledge network where teams can:

* launch Knowledge Hubs
* guide work through shared direction
* use helpers safely
* approve decisions transparently
* release verified outputs
* publish reusable templates and packs
* adopt and remix trusted work from others
* preserve provenance across the network

The development strategy should keep all systems aligned to that purpose:

* **Market app** makes the workflow humane and discoverable.
* **SDK** makes the domain programmable and stable.
* **Core** makes the runtime, publishing, content, and agents reusable.
* **CLI** makes the workflow powerful, scriptable, and developer-friendly.
* **Hosted control plane** makes teams, environments, runners, capabilities, and market operations reliable.

## Final positioning statement

TreeSeed is a TreeSeed platform for teams that need to turn shared inquiry into approved knowledge work and trusted reusable outputs.

It combines cooperative direction, human decision-making, traceable change lanes, safe releases, helper agents, and a market for templates and knowledge packs.

Its defining promise is simple:

**No important knowledge work becomes real until the team can see what it supports, who proposed it, who approved it, what changed, what was verified, and how it can be shared or reused.**
