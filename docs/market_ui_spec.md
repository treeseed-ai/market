# Knowledge Coop Market UI

## Product thesis

A TreeSeed market should feel like one simple place for teams to launch, guide, approve, release, and distribute knowledge work without exposing the user to the full CLI workflow unless they ask for it.

The UI should present TreeSeed in human language first:

- **Project** = Knowledge Hub
- **Workstream** = Change lane
- **Release** = Published version
- **Template** = Starting shape
- **Knowledge Pack** = Shareable knowledge bundle
- **Agent** = Working helper
- **Environment** = Local, Staging, Production

The portal treats **teams** as the top-level owner of all projects, releases, and market listings.

## Core ownership and direction model

### Team ownership model

- Only teams own Knowledge Hubs and market listings.
- Individuals act through team membership.
- People can contribute, review, vote, approve, release, and publish according to role.

### Direction chain model

The UI should reflect a cooperative chain of direction and approval:

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

### Objective

Defines overall project direction.

Role:

- sets desired outcomes
- anchors long-running priorities
- contributes to knowledge growth by defining what the project is trying to achieve

Examples:

- Publish a youth climate toolkit
- Create a reusable civic engagement starter template
- Improve onboarding for first-time team leads

### Question

Defines research direction.

Role:

- opens an inquiry
- drives research and knowledge growth
- can inform one or more objectives

Examples:

- What information do first-time team leads get stuck on?
- Which publishing format is easiest for schools to adopt?
- What evidence should be included in a public trust summary?

### Proposal

A proposed way to meet an objective, answer a question, or move the project forward.

Role:

- can be created by humans or agents
- can respond to one or more objectives or questions
- can be compared against other proposals
- is not executable work yet

Examples:

- Create a teacher-facing printable bundle
- Test a lightweight hosted starter template
- Add a guided release summary flow before public publish

### Decision

The human-approved record that authorizes work.

Role:

- references one or more proposals
- creates permission to start work
- may be a yes / no decision if there is one proposal
- may be a ranked poll if there are multiple proposals
- may involve selected team members, roles, or the whole team
- is the only entity from which change lanes can be created

Examples:

- Approve Proposal A
- Rank proposals A, C, B and pursue A first
- Reject current proposal and request revision
- Approve a proposal only if Project Lead and Reviewer both agree

### Note

Contextual annotation attached to any directional item.

Role:

- never acts as the approval mechanism
- always belongs to something else
- helps explain context, answers, feedback, amendment requests, or status

Examples by parent type:

- Objective note: extra context, dependency, or gotcha
- Question note: answer, clarification, evidence, or source link
- Proposal note: amendment request, critique, support, or implementation concern
- Decision note: status update, risk, success/failure feedback, or retrospective signal

## Hard workflow rule

**All work happens via human-approved Decisions.**

That means:

- agents may draft proposals
- humans may draft proposals
- agents may suggest decision options
- agents may not start binding work on their own
- change lanes must link to an approved decision
- releases should summarize which decisions were implemented

## Decision system design

### Supported decision types

#### 1. Yes / No decision

Best when there is one proposal.

Use when:

- a single proposal is ready
- the team mainly needs approval or rejection

Fields:

- proposal reference
- voting group
- decision deadline
- required approvers
- result: approved / rejected

#### 2. Ranked proposal decision

Best when multiple proposals exist.

Use when:

- several competing approaches are available
- the team wants to compare tradeoffs before work starts

Fields:

- ordered proposal set
- ranking method
- voting group
- quorum
- tie-break rule
- result: ranked outcome and selected proposal(s)

#### 3. Lead approval decision

Best when input is broad but final approval is narrow.

Use when:

- the team comments broadly
- a lead or role holder makes the final call

Fields:

- proposal reference(s)
- advisory comments
- final approver role or named person
- result: approved / rejected / needs revision

### Team-aware decision controls

A decision can take team structure into account.

Suggested controls:

- eligible voters
- required roles
- named approvers
- quorum rule
- decision deadline
- visibility: team-wide / project-lead only / invited people
- pass rule: simple majority / ranked outcome / unanimous / lead decides

### Decision policy presets

To keep setup simple, every Knowledge Hub should be able to choose a default policy preset:

- **Fast yes/no** — simple majority from selected people
- **Lead approval** — broad input, one final approver
- **Team poll** — team-wide yes/no or ranked vote
- **Role-gated** — specific roles must approve before work starts

## Core product structure

### 1. Team Home

The first screen after sign-in.

Purpose:

- show the team’s active projects
- show what is ready, blocked, waiting on proposals, or waiting on decisions
- make launch, continue, approve, release, and share the most obvious actions

Sections:

- Team switcher
- Global search
- Primary action: **Launch new project**
- Continue working strip
- Waiting on decision strip
- Ready to start from approved decision strip
- Ready to release strip
- Recent agent activity strip
- Distributed products strip
- Billing / entitlement / hosting posture strip

### 2. Market

A discovery and distribution surface.

Tabs:

- Projects
- Templates
- Knowledge Packs
- Publishers

Main behaviors:

- browse cards
- search and filter
- compare
- preview trust details
- install or fork into a team
- buy / request / claim access

### 3. Project workspace

A project should have one stable home and a small set of views.

Top nav inside a project:

- Overview
- Direct
- Workstreams
- Agents
- Releases
- Share
- Settings

### Direct means “Direction and Decisions”

This is the cooperative board where teams:

- define objectives
- open questions
- review proposals
- approve decisions
- attach notes in context

## Golden workflows

### A. Launch project

A guided wizard.

Steps:

1. Choose source
   - Start from template
   - Start from knowledge pack
   - Start blank
2. Choose team
3. Name the Knowledge Hub
4. Choose hosting posture
   - Managed by TreeSeed
   - Self-hosted
   - Hybrid
5. Choose environments
   - Local only
   - Local + staging
   - Local + staging + production
6. Add starter direction
   - first objective
   - first question
   - optional decision policy preset
7. Review and launch

Result:

- project created
- default change lane template available
- default agents enabled
- team lands in Project Overview with a clear next step
- no real change lane starts until a decision is approved

### B. Research and direction

Flow:

1. Create objective(s)
2. Create question(s)
3. Gather notes and evidence
4. Ask agents or humans for proposal(s)
5. Compare proposals
6. Create decision
7. Approve decision
8. Start change lane from approved decision

### C. Propose and decide

This becomes a first-class workflow.

Flow:

1. Open Direct
2. Select an objective or question
3. Click **Request proposal** or **Add proposal**
4. Review proposal cards from agents and humans
5. Create a decision
6. Choose yes/no or ranked poll
7. Select participating people or roles
8. Approve decision
9. Send approved decision into work

### D. Work on change

Simplest path:

1. Open project
2. Click **Start change**
3. Pick an approved decision
4. System shows:
   - environment status
   - linked objective / question / proposal / decision chain
   - current lane state
5. User edits through their normal tools
6. UI offers one obvious action: **Save progress**

The UI should translate CLI complexity into plain-language progress:

- Local ready
- Platform configured
- Verification passing
- Saved locally
- Synced remotely

### E. Release project

Release should be visible, safe, and boring.

Flow:

1. Open Releases
2. See current staging state and unreleased change lanes
3. Review release report
4. Review **Decisions included**
5. Confirm version bump
6. Publish to production
7. See shareable release summary

The release screen should separate:

- what changed
- which decisions were implemented
- what was verified
- what is blocked
- what will become public

### F. Share project

This is the distribution workflow.

Actions:

- Export project
- Package as template
- Package as knowledge pack
- Configure offer
- Configure publisher info
- Configure trust details
- Publish to market

Optional public provenance:

- which objectives shaped the project
- which decisions produced the packaged result
- which trust notes or summaries should be public

## Navigation model

### Global left rail

Keep it short:

- Home
- Market
- Teams
- Inbox
- Settings

### Team switcher

Pinned at top left.

Selecting a team changes:

- visible projects
- billing
- member permissions
- published products
- activity feeds

### Project header

Contains:

- project name
- environment chips: Local / Staging / Prod
- health status
- quick actions: Start change, Release, Share

## Page-by-page design

## Team Home

### Hero strip

- team name
- one sentence posture summary
- Launch project button
- Invite member button

### Priority panels

#### Continue working

Shows active change lanes with:

- name
- linked decision
- current status
- last save
- open action

#### Waiting on decision

Shows:

- proposal sets ready for decision
- decisions waiting on required approvers
- decisions waiting on your vote

#### Ready to start from approved decision

Shows approved decisions that are not yet in work.

#### Ready to release

Shows staging items waiting for production.

#### Active agents

Shows agent count, current tasks, proposal output, failures, and message volume.

#### Published by this team

Shows templates and knowledge packs already in market.

## Market

### Primary layout

Top search bar, filter row, grid of large cards.

Filters:

- Product type
- Audience
- Hosting model
- Price model
- Verified publisher
- Compatible CLI / core version
- Reconcile support
- Built-in hooks only

### Card anatomy

For each listing show:

- title
- one-line summary
- publisher
- product type
- trust badges
- latest release version
- install / preview button

### Trust drawer on each listing

Every product card should open a lightweight trust drawer showing:

- publisher identity
- verification posture
- compatibility
- fulfillment source
- hooks policy
- reconcile support
- update cadence

## Project Overview

This is the project cockpit.

### Top summary row

- active objectives
- open questions
- open proposals
- decisions waiting for vote
- approved decisions in progress
- latest production release

### Main panels

#### Project health

Plain language statuses:

- Setup needed
- Waiting on proposals
- Ready for vote
- Approved and ready for work
- Verification failing
- Release ready
- Sharing draft

#### Next best action

One single recommended action card. Examples:

- Gather proposals for Objective A
- Vote on Decision D-14
- Start work from approved decision
- Review release summary
- Complete publisher details

#### Recent activity

Chronological feed combining:

- saves
- releases
- agent messages
- proposal events
- decision events
- share actions

#### Direction snapshot

Shows:

- currently active objectives
- open research questions
- proposals ready for decision
- approved decisions feeding active work

#### Release snapshot

Shows latest production and current staging state.

## Direct

A humane project direction board.

### Layout

A split screen with:

- left: filters and saved views
- center: direction chain board
- right: selected item detail and contextual notes

### Direction chain board

Recommended structure:

```text
Objectives → Questions → Proposals → Decisions
```

Use visual linking rather than pure isolated columns.

### Default saved views

- Now
- Needs research
- Needs proposal
- Ready for decision
- Waiting on vote
- Approved for work
- Blocked
- Release-linked

### Quick add bar

Input supports:

- New objective
- New question
- New proposal
- New decision

### Direction item cards

#### Objective card

- title
- status chip
- priority chip
- linked questions count
- linked proposals count
- linked decisions count
- last updated

#### Question card

- title
- status chip
- linked objective
- answer state
- linked proposals count
- last updated

#### Proposal card

- title
- proposed by: human / agent
- linked objective/question
- current state: draft / under review / ready for decision / superseded
- referenced notes count
- last updated

#### Decision card

- title
- decision type: yes/no / ranked / lead approval
- proposal reference count
- voters / approvers
- current state: draft / voting / approved / rejected / needs revision
- resulting action: start work / revise proposal / defer

### Detail panel tabs

Each selected Objective, Question, Proposal, or Decision should have:

- Overview
- Notes
- Activity
- Links

### Notes behavior

Notes are created from inside the selected record, not as a detached peer lane by default.

Composer prompts change by parent type:

- Objective note: “Add context, dependency, or gotcha”
- Question note: “Add answer, evidence, or clarification”
- Proposal note: “Add feedback or amendment request”
- Decision note: “Add status, outcome, or retrospective feedback”

## Start Change modal / flow

Purpose:

- make local work obvious and safe
- bridge to CLI workflow without exposing it by default

### Flow rules

- a change lane must start from an approved decision
- the modal should show the full upstream chain before work starts

### Core sections

- Choose approved decision
- Create new change lane or open existing one
- Show linked objective / question / proposal chain
- Show environment checks
- Show one primary action: **Start change**

## Workstreams

The workstream view should feel like task lanes with explicit lifecycle.

### Columns

- Drafting
- Active locally
- Verifying
- Saved remotely
- In staging
- Archived

### Workstream card fields

- title
- linked decision
- upstream proposal
- upstream objective / question
- owner
- local readiness
- verification result
- last updated
- open details

### Workstream detail

Shows:

- summary
- environment checks
- full decision chain
- changes
- linked notes
- verification history
- save history
- archive action

## Agents

The agents area should be understandable to non-technical users.

### Default table columns

- agent name
- role in plain English
- current task
- working on
- output type: proposal / review / summary / note
- status

### Toggle views

- Overview
- Message log
- Failures needing attention

### Agent actions

- Draft proposal
- Summarize question notes
- Compare proposals
- Draft decision summary

### Hard boundary

Agents cannot approve decisions or start work without human approval.

### Message log UX

Messages should be grouped by:

- informational
- warning
- action requested
- proposal readiness
- decision readiness
- release readiness

## Releases

Release must be the clearest operational page.

### Main layout

#### Left column

- current environments
- latest production release
- release candidates in staging

#### Center column

- change summary
- unreleased change lanes
- decisions included
- verification report
- release notes draft

#### Right column

- version selector
- publish button
- rollback button
- export notes button

### Release statuses

- Drafting release
- Waiting on verification
- Ready to publish
- Published
- Rolled back

## Share

This page should merge export, packaging, and publishing.

### Sections

#### Export

- export project snapshot
- export change lane bundle
- export release artifact

#### Package as template

- title
- summary
- category
- compatibility
- hooks policy
- reconcile support
- offer settings
- optional public objectives and decisions

#### Package as knowledge pack

- source selection
- preview contents
- audience tags
- trust details
- offer settings
- optional public notes/trust summaries

#### Publish to market

- draft listing
- preview card
- trust checklist
- publish / archive

## Settings

Make settings shallow and understandable.

### Groups

- General
- Team access
- Hosting
- Environments
- Connections
- Decision policies
- Capabilities
- Danger zone

### Decision policy settings

Translate governance rules into plain language.

Example rows:

- Default voting method
- Required approver roles
- Team poll visibility
- Start work permission

Each row shows:

- what it controls
- who participates
- when it applies
- who can approve it

### Capability settings

Translate technical grants into human language.

Example rows:

- Graph refresh
- Agent execution
- Remote jobs
- Project runner
- Workflow operations

Each row shows:

- what it allows
- where it can run
- whether it is enabled
- who can approve it

## Team members and roles

Top-level model:

- only teams own projects and market listings
- individuals act through team membership

### Suggested roles

- Team owner
- Market steward
- Project lead
- Contributor
- Reviewer
- Research steward
- Proposal reviewer
- Decision approver
- Finance / licensing

### UI behavior

Non-technical users should never see raw permission strings. They should see statements like:

- Can launch projects
- Can create proposals
- Can vote on decisions
- Can approve decisions
- Can start work from approved decisions
- Can publish releases
- Can publish market listings
- Can manage billing
- Can approve remote execution

## Inbox / attention center

Purpose:

- collect warnings, requested approvals, and ready items

High-priority types:

- Proposal needs feedback
- Decision waiting on your vote
- Decision waiting on required approver
- Approved decision ready to start
- Release ready to publish
- Listing missing trust details

## Absolute simplicity rules

1. One primary action per page.
2. Objectives and Questions set direction.
3. Proposals suggest how to act.
4. Decisions approve whether to act.
5. No change lane starts without an approved decision.
6. Notes always belong to something specific.
7. Never show branch names by default unless the user expands technical details.
8. Use human labels first, technical labels second.
9. Keep Local / Staging / Prod always visible.
10. Always show what happens next after every major action.
11. Put all destructive actions behind clearly named confirmations.
12. Make every card and row answer: what is it, what state is it in, what can I do now?
13. Decision status must always be visible in plain language.
14. Ranked poll and yes/no flows should feel equally simple.

## Best naming system

### User-facing names

- Knowledge Hub
- Change lane
- Release
- Share pack
- Helper
- Team
- Objective
- Question
- Proposal
- Decision
- Note

### Friendly subtitles where helpful

- Proposal = Suggested approach
- Decision = Approved choice

### Technical detail labels in secondary text

- Project ID
- Workstream ID
- Environment
- Capability grant
- Runner connection
- API key

## Recommended v1 information architecture

### Public market

- Market home
- Templates
- Knowledge packs
- Publishers
- Product detail page

### Authenticated team portal

- Team home
- Project workspace
- Releases
- Share
- Agents
- Team members
- Billing and entitlements

### Admin / steward surface

- Listing moderation
- Trust review
- Publisher verification
- Catalog quality review

## What to build first

### Phase 1

- Team Home
- Launch project wizard
- Project Overview
- Direct
- Workstreams
- Releases
- Share

### Phase 2

- richer Market search and filters
- publisher profiles
- decision policy management
- remote runner setup flow
- billing and entitlement surfaces

### Phase 3

- advanced analytics
- listing moderation queue
- team-level activity intelligence
- side-by-side proposal compare flows

## One-sentence product promise

TreeSeed Market should feel like a calm cooperative workshop where teams grow knowledge through objectives and questions, compare proposals, approve decisions together, and only then turn approved choices into work, releases, and shared products.

## Screen-by-screen wireframe map

## 0. Public entry: Market Home

Purpose:

- explain what TreeSeed Market is
- let visitors discover products quickly
- provide a clear path into team-owned workspaces

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Top bar: Logo | Market | Publishers | Templates | Knowledge Packs   │
│                     Search ____________________   Sign in   Get started │
├──────────────────────────────────────────────────────────────────────┤
│ Hero                                                               │
│ [Headline: Launch, guide, approve, release, and share knowledge]   │
│ [Subhead]                                                          │
│ [Browse market] [Launch project]                                   │
├──────────────────────────────────────────────────────────────────────┤
│ Featured rows                                                      │
│ [Featured templates] [Featured knowledge packs] [Trusted teams]    │
├──────────────────────────────────────────────────────────────────────┤
│ How it works                                                       │
│ 1 Start with a template  2 Guide with your team  3 Release/share   │
├──────────────────────────────────────────────────────────────────────┤
│ Footer                                                             │
└──────────────────────────────────────────────────────────────────────┘
```

Notes:

- keep this page warm and obvious
- one strong CTA for new visitors
- one strong CTA for existing teams

## 1. Auth landing: Team Home

Purpose:

- be the default landing page after sign-in
- show what matters now
- provide one obvious next action

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Team switcher ▼   Search ____________________   Inbox   Help   User │
├───────────────┬──────────────────────────────────────────────────────┤
│ Left rail     │ Team Home                                            │
│ - Home        │ [Team name]                                          │
│ - Market      │ [Launch project] [Invite member]                     │
│ - Teams       ├──────────────────────────────────────────────────────┤
│ - Inbox       │ Status strip: 3 active projects | 2 waiting on vote │
│ - Settings    │                1 ready to start | 1 release ready   │
│               ├──────────────────────────────────────────────────────┤
│               │ Continue working                                     │
│               │ [Lane card] [Lane card] [Lane card]                  │
│               ├──────────────────────────────────────────────────────┤
│               │ Waiting on decision                                  │
│               │ [Decision card] [Decision card]                      │
│               ├──────────────────────────────────────────────────────┤
│               │ Ready to start from approved decision                │
│               │ [Decision card] [Decision card]                      │
│               ├──────────────────────────────────────────────────────┤
│               │ Ready to release                                     │
│               │ [Release card] [Release card]                        │
│               ├──────────────────────────────────────────────────────┤
│               │ Active agents                                        │
│               │ [Agent row] [Agent row] [Agent row]                  │
│               ├──────────────────────────────────────────────────────┤
│               │ Published by this team                               │
│               │ [Template card] [Knowledge pack card]                │
└───────────────┴──────────────────────────────────────────────────────┘
```

Rules:

- show one recommended action near the top
- no technical noise on this page
- all cards answer: what is it, what state is it in, what can I do now

## 2. Launch Project wizard

Purpose:

- translate init/config into one beginner-safe flow
- avoid exposing environment complexity too early

### Screen 2A: choose source

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Launch new Knowledge Hub                                            │
│ Step 1 of 6                                                         │
├──────────────────────────────────────────────────────────────────────┤
│ [Start blank]   [Use template]   [Use knowledge pack]               │
│                                                                      │
│ If template selected:                                               │
│ Search ________   Filter chips                                      │
│ [Template card] [Template card] [Template card]                     │
├──────────────────────────────────────────────────────────────────────┤
│ Back                                     Continue                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen 2B: choose team and name

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Step 2 of 6                                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Team owner: [Team dropdown ▼]                                       │
│ Project name: [Knowledge Hub name ______________________]            │
│ One-line purpose: [____________________________________]            │
├──────────────────────────────────────────────────────────────────────┤
│ Back                                     Continue                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen 2C: hosting posture

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Step 3 of 6                                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Choose hosting                                                      │
│ [Managed by TreeSeed]  [Self-hosted]  [Hybrid]                      │
│ Small plain-language explainer under each                           │
├──────────────────────────────────────────────────────────────────────┤
│ Back                                     Continue                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen 2D: environments

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Step 4 of 6                                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Environments                                                        │
│ [✓] Local                                                           │
│ [✓] Staging                                                         │
│ [✓] Production                                                      │
│                                                                      │
│ Recommended setup: Local + Staging + Production                     │
├──────────────────────────────────────────────────────────────────────┤
│ Back                                     Continue                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen 2E: starter direction

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Step 5 of 6                                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Add a first objective                                               │
│ [____________________________________________]                      │
│ Add an important question                                           │
│ [____________________________________________]                      │
│ Choose a default decision policy                                    │
│ [Fast yes/no ▼]                                                     │
├──────────────────────────────────────────────────────────────────────┤
│ Back                                     Continue                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen 2F: review and launch

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Step 6 of 6                                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Review                                                              │
│ - Source: Starter template                                          │
│ - Team: Coop Studio                                                 │
│ - Hosting: Managed                                                  │
│ - Environments: Local, Staging, Production                          │
│ - Initial objective: Publish a youth climate toolkit                │
│ - Initial question: What format will schools adopt fastest?         │
│ - Decision policy: Fast yes/no                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Back                                     Launch project             │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Project Overview

Purpose:

- be the project cockpit
- summarize direction, decision, work, release state, and share state

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Project header                                                      │
│ Knowledge Hub name     [Local] [Staging] [Prod]     Healthy         │
│ Quick actions: [Start change] [Release] [Share]                     │
├──────────────────────────────────────────────────────────────────────┤
│ Metric cards                                                        │
│ [3 objectives] [5 questions] [4 proposals] [2 waiting on vote]      │
│ [1 approved for work] [1 release ready]                             │
├──────────────────────────────────────────────────────────────────────┤
│ Next best action                                                    │
│ [Large recommendation card: Vote on Decision D-14]                  │
├──────────────────────────────────────────────────────────────────────┤
│ Project health             │ Recent activity                        │
│ - Waiting on proposals     │ saves, proposals, decisions, releases  │
│ - Verification passing     │ agents, share events                   │
│ - Sharing draft ready      │                                        │
├──────────────────────────────────────────────────────────────────────┤
│ Direction snapshot         │ Release snapshot                       │
│ objectives/questions       │ latest prod / current staging          │
│ proposals/decisions        │ decisions included                     │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Direct

Purpose:

- hold the living direction of the project
- keep objectives, questions, proposals, decisions, and notes linked to work

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Direct / Direction                                                  │
│ Quick actions: [New objective] [New question] [New proposal]        │
│                [New decision]                                       │
├──────────────┬──────────────────────────────────────┬───────────────┤
│ Saved views  │ Direction chain board                │ Detail panel  │
│ - Now        │ Objectives → Questions → Proposals  │ selected item │
│ - Research   │ → Decisions                          │ full details  │
│ - Needs vote │ [Card]   [Card]   [Card]   [Card]   │ linked notes  │
│ - Approved   │ [Card]   [Card]   [Card]   [Card]   │ linked work   │
│ - Blocked    │                                      │ decision tools│
└──────────────┴──────────────────────────────────────┴───────────────┘
```

Card structure:

- title
- status chip
- priority or state chip
- linked counts
- last updated

## 5. Start Change modal / flow

Purpose:

- make local work obvious and safe
- bridge to CLI workflow without exposing it by default

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Start change                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ Choose an approved decision                                         │
│ [Decision dropdown ▼]                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Decision chain                                                      │
│ Objective A → Question B → Proposal C → Decision D                 │
├──────────────────────────────────────────────────────────────────────┤
│ Create new lane or open existing                                    │
│ [New change lane]                                                   │
│ [Existing lane row] [Open]                                          │
├──────────────────────────────────────────────────────────────────────┤
│ Environment checks                                                  │
│ Local ready ✓   Platform ready ✓   Verification available ✓         │
├──────────────────────────────────────────────────────────────────────┤
│ Cancel                                   Start change               │
└──────────────────────────────────────────────────────────────────────┘
```

## 6. Workstreams Overview

Purpose:

- visualize the lifecycle of all change lanes
- make save / verify / stage / archive easy to understand

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Workstreams                          [Start change]                  │
├──────────────────────────────────────────────────────────────────────┤
│ Filters: owner | decision | status | verification | environment     │
├──────────────────────────────────────────────────────────────────────┤
│ Drafting     │ Active locally │ Verifying │ In staging │ Archived    │
│ [Card]       │ [Card]         │ [Card]    │ [Card]     │ [Card]      │
│ [Card]       │ [Card]         │           │            │             │
└──────────────────────────────────────────────────────────────────────┘
```

### Workstream card

```text
┌─────────────────────────────┐
│ Change lane title           │
│ Decision: D-14              │
│ Proposal: Teacher bundle    │
│ Supports: Objective A       │
│ Owner: Maya                 │
│ Verification passing ✓      │
│ Last save: 2h ago           │
│ [Open details]              │
└─────────────────────────────┘
```

## 7. Workstream Detail

Purpose:

- give one place for save history, verification, and staging status

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Change lane title                         [Save progress]            │
├──────────────────────────────────────────────────────────────────────┤
│ Summary strip                                                      │
│ Decision D-14 | owner | current state | last updated                │
├──────────────────────────────────────────────────────────────────────┤
│ Decision chain              │ Verification history                  │
│ Objective → Question        │ Run 14 passing                        │
│ Proposal → Decision         │ Run 13 passing                        │
│ Notes linked                │ Run 12 failed                         │
├──────────────────────────────────────────────────────────────────────┤
│ Environment checks          │ Changes                               │
│ Local ✓ Platform ✓ Sync ✓   │ list of changed areas                 │
├──────────────────────────────────────────────────────────────────────┤
│ Save history                │ Archive / send to staging actions     │
└──────────────────────────────────────────────────────────────────────┘
```

## 8. Agents Overview

Purpose:

- make agents understandable to normal humans
- surface logs only when needed

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Agents                                                              │
│ View: [Overview ▼] [Message log] [Failures]                         │
├──────────────────────────────────────────────────────────────────────┤
│ Agent name │ Plain-English role │ Working on │ Output │ Status      │
│ Planner    │ Organizes work      │ Question B │ Summary│ Active      │
│ Reviewer   │ Checks quality      │ Proposal C │ Review │ Needs review│
│ Curator    │ Preps market share  │ Listing L1 │ Draft  │ Idle        │
└──────────────────────────────────────────────────────────────────────┘
```

### Message log wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Filters: info | warning | action requested | proposal | decision    │
├──────────────────────────────────────────────────────────────────────┤
│ [Time] Reviewer                                                     │
│ Proposal C needs amendment before decision                          │
│ [Open direct]                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ [Time] Curator                                                      │
│ Draft market description ready for review                           │
│ [Open share page]                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

## 9. Releases Overview

Purpose:

- make release state obvious
- turn the staging-to-production promotion into one careful workflow

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Releases                                      [Draft new release]    │
├───────────────┬──────────────────────────────────────┬───────────────┤
│ Environments  │ Change summary                       │ Release tools │
│ Local healthy │ - 3 unreleased workstreams           │ version bump  │
│ Staging ready │ - Decisions included: 2             │ [1.3.0 ▼]     │
│ Prod 1.2.4    │ - verification report                │ [Publish]     │
│               │ - draft release notes                │ [Rollback]    │
├───────────────┼──────────────────────────────────────┼───────────────┤
│ Latest prod   │ Previous releases                    │ Share summary │
│ Release list  │ with decisions referenced            │ export notes  │
└───────────────┴──────────────────────────────────────┴───────────────┘
```

### Release candidate row

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Release candidate 1.3.0                                              │
│ 3 change lanes | 2 decisions included | verification passing         │
│ [Review] [Publish to production]                                     │
└──────────────────────────────────────────────────────────────────────┘
```

## 10. Release detail

Purpose:

- let a lead confidently decide whether to publish

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Release 1.3.0                                     [Publish]          │
├──────────────────────────────────────────────────────────────────────┤
│ What changed                                                        │
│ [change group] [change group] [change group]                        │
├──────────────────────────────────────────────────────────────────────┤
│ Which decisions were implemented                                     │
│ [Decision D-14] [Decision D-15]                                     │
├──────────────────────────────────────────────────────────────────────┤
│ What was verified                                                   │
│ checks list with pass/fail                                           │
├──────────────────────────────────────────────────────────────────────┤
│ What will become public                                              │
│ release notes preview                                                │
├──────────────────────────────────────────────────────────────────────┤
│ What is blocked                                                      │
│ blocking issues or “nothing blocked”                                 │
└──────────────────────────────────────────────────────────────────────┘
```

## 11. Share page

Purpose:

- unify export, packaging, listing, and publishing

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Share                                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Tabs: [Export] [Package as template] [Package as knowledge pack]    │
│       [Publish listing]                                              │
├──────────────────────────────────────────────────────────────────────┤
│ Left: form / packaging controls                                     │
│ Right: live listing preview card                                     │
├──────────────────────────────────────────────────────────────────────┤
│ Provenance section                                                   │
│ Objectives used ✓   Decisions referenced ✓   Public trust notes ✓    │
├──────────────────────────────────────────────────────────────────────┤
│ Trust checklist                                                      │
│ ✓ publisher details  ✓ compatibility  ✓ pricing  ✓ support          │
├──────────────────────────────────────────────────────────────────────┤
│ [Save draft]                                   [Publish to market]   │
└──────────────────────────────────────────────────────────────────────┘
```

### Template packaging form

```text
Title ____________________________
Summary __________________________
Category [dropdown]
Audience tags [chip input]
Compatibility [version selector]
Hooks policy [safe / advanced / custom]
Reconcile support [on/off]
Offer type [free / paid / private]
Public provenance [objectives / decisions / notes]
```

## 12. Market listing detail page

Purpose:

- help teams trust and install a product quickly

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Listing hero                                                        │
│ [Product title]  [Type chip]  [Publisher badge]                     │
│ [Install / Fork] [Buy / Request access]                             │
├──────────────────────────────────────────────────────────────────────┤
│ Tabs: Overview | What’s included | Releases | Trust | Compatibility │
├──────────────────────────────────────────────────────────────────────┤
│ Overview text                  │ Trust drawer                        │
│ screenshots / preview          │ publisher                           │
│ included components            │ verification                        │
│ optional provenance            │ hooks policy                        │
│                                │ compatibility                       │
└──────────────────────────────────────────────────────────────────────┘
```

## 13. Team products page

Purpose:

- show everything this team distributes

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Team products                                  [New listing]         │
├──────────────────────────────────────────────────────────────────────┤
│ Filters: type | status | visibility | monetization                  │
├──────────────────────────────────────────────────────────────────────┤
│ Draft listings                                                      │
│ [Card] [Card]                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ Published listings                                                  │
│ [Card] [Card] [Card]                                                │
└──────────────────────────────────────────────────────────────────────┘
```

## 14. Team members and roles

Purpose:

- make team ownership visible and simple

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Team members                                   [Invite member]       │
├──────────────────────────────────────────────────────────────────────┤
│ Name      │ Role              │ Can do                              │
│ Ana       │ Team owner        │ launch, approve, release, billing   │
│ Jay       │ Project lead      │ start work, review, release         │
│ Mei       │ Contributor       │ create proposals, edit, save notes  │
│ Sol       │ Decision approver │ vote, approve, request revision     │
└──────────────────────────────────────────────────────────────────────┘
```

## 15. Project settings

Purpose:

- keep configuration shallow and non-threatening

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Settings                                                            │
├──────────────┬───────────────────────────────────────────────────────┤
│ Groups       │ General                                               │
│ - General    │ Project name                                          │
│ - Team access│ Hosting posture                                       │
│ - Hosting    │ Environment toggles                                   │
│ - Environments│ Connections                                          │
│ - Connections│ Decision policies                                     │
│ - Decision policies│ Capabilities                                    │
│ - Capabilities│ Danger zone                                          │
└──────────────┴───────────────────────────────────────────────────────┘
```

### Capability row pattern

```text
Graph refresh            [Enabled ✓]
What it allows: Refreshes project graph data
Where it runs: Team-approved environments
Who can approve: Team owner, Project lead
```

## 16. Inbox / attention center

Purpose:

- collect warnings, requested approvals, and ready items

### Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Inbox                                                               │
│ Filters: needs action | proposal | decision | release | share       │
├──────────────────────────────────────────────────────────────────────┤
│ [Needs vote] Decision D-14 waiting on your vote                     │
│ [Needs approval] Decision D-15 waiting on Project Lead              │
│ [Ready to start] Approved decision D-16 can start work              │
│ [Release] Release 1.3.0 ready to publish                            │
│ [Share] Listing missing compatibility details                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile adaptation rules

1. Collapse left rail into a bottom tab bar for Home, Market, Inbox, Settings.
2. Keep project quick actions pinned at the bottom on project pages.
3. Convert multi-column boards into stacked sections with a horizontal status switcher.
4. Always keep one visible primary action per screen.

## Interaction principles for every screen

- Primary button always lives in the same place.
- Environment chips are always visible in project context.
- Technical details hide behind “show technical details.”
- Status language should be calm and plain:
  - Needs setup
  - Waiting on proposals
  - Ready for vote
  - Awaiting approver
  - Approved and ready for work
  - Verification passing
  - Ready for staging
  - Ready to publish
  - Published

## Best first clickable prototype path

Build this path first:

1. Team Home
2. Launch project wizard
3. Project Overview
4. Direct
5. Start Change modal
6. Workstreams Overview
7. Release Overview
8. Share page
9. Market listing detail

That gives you a complete end-to-end story from create to approve to distribute.

## Low-fidelity navigation flow for prototype handoff

Use this as a direct Figma prototype map.

### Legend

- **S##** = screen number
- **CT##** = click target number on that screen
- **→** = destination screen
- **Primary** = the one most important action on the screen
- **Back** = expected back behavior in prototype

## Global prototype rules

1. Every project screen keeps the same top project header:
   - project name
   - Local / Staging / Prod chips
   - quick actions: Start change, Release, Share
2. Every team-auth screen keeps the same left rail:
   - Home
   - Market
   - Teams
   - Inbox
   - Settings
3. Technical details are not clickable in the first prototype unless explicitly listed.
4. Use one blue primary button per screen.
5. Every modal can close with X back to the parent screen.

## Prototype overview map

```text
S01 Team Home
 ├─CT01 Launch project → S02
 ├─CT02 Open project → S08
 ├─CT03 Open waiting-on-decision item → S09
 ├─CT04 Open approved decision ready to start → S10
 ├─CT05 Open published listing → S19
 ├─CT06 Market in left rail → S17
 └─CT07 Inbox in left rail → S22

S02 Source → S03
S03 Team & name → S04
S04 Hosting → S05
S05 Environments → S06
S06 Starter direction → S07
S07 Review & launch → S08

S08 Project Overview
 ├─CT01 Start change → S10
 ├─CT02 Open Direct → S09
 ├─CT03 Open Workstreams → S11
 ├─CT04 Open Agents → S13
 ├─CT05 Open Releases → S14
 ├─CT06 Open Share → S16
 └─CT07 Open Settings → S21

S09 Direct
 ├─CT01 New objective → S09A overlay
 ├─CT02 New question → S09A overlay
 ├─CT03 New proposal → S09A overlay
 ├─CT04 New decision → S09B overlay
 ├─CT05 Select card → S09 detail state
 ├─CT06 Start linked change from approved decision → S10
 └─CT07 Open Workstreams → S11

S10 Start Change modal
 ├─CT01 Choose approved decision → selection state on S10
 ├─CT02 Create new lane → S12
 ├─CT03 Open existing lane → S12
 └─CT04 Confirm start change → S12

S11 Workstreams Overview
 ├─CT01 Open lane card → S12
 ├─CT02 Start change → S10
 └─CT03 Send to staging quick action → S14

S12 Workstream Detail
 ├─CT01 Save progress → S12 saved state
 ├─CT02 Run verification → S12 verified state
 ├─CT03 Send to staging → S14
 └─CT04 Archive → S11

S13 Agents
 ├─CT01 Switch to Message log → S13B
 ├─CT02 Open linked proposal → S09 detail state
 └─CT03 Open decision warning → S09 detail state

S14 Releases Overview
 ├─CT01 Open release candidate → S15
 ├─CT02 Draft new release → S15
 └─CT03 Rollback → S14 rollback confirm

S15 Release Detail
 ├─CT01 Publish to production → S15 published state
 ├─CT02 Export notes → S16A
 └─CT03 Back to Releases → S14

S16 Share
 ├─CT01 Switch Export tab → S16A
 ├─CT02 Package as template → S16B
 ├─CT03 Package as knowledge pack → S16C
 ├─CT04 Publish listing → S16D
 └─CT05 Open listing preview → S18

S17 Market Home
 ├─CT01 Open listing card → S18
 ├─CT02 Search/filter result → S18
 └─CT03 Launch project → S02

S18 Listing Detail
 ├─CT01 Install/Fork → S02 or S08
 ├─CT02 Trust tab → S18 trust state
 └─CT03 Publisher/team products → S19

S19 Team Products
 ├─CT01 Open listing draft → S16D
 ├─CT02 New listing → S16
 └─CT03 Open project source → S08

S20 Team Members
 ├─CT01 Invite member → S20 invite modal
 └─CT02 Edit role → S20 role modal

S21 Project Settings
 ├─CT01 Open decision policy group → S21 policy state
 ├─CT02 Open capability group → S21 capability state
 └─CT03 Danger zone → S21 danger confirm

S22 Inbox
 ├─CT01 Open proposal feedback alert → S09 detail state
 ├─CT02 Open decision vote alert → S09 detail state
 ├─CT03 Open approved decision ready to start → S10
 ├─CT04 Open release alert → S15
 └─CT05 Open share alert → S16D
```

## Screen set with click targets

## S01 — Team Home

### Purpose

Default signed-in landing page.

### Primary action

Launch project.

### Main click targets

- **CT01** Launch project button → **S02**
- **CT02** Any project card title → **S08**
- **CT03** Any waiting-on-decision card → **S09**
- **CT04** Any approved-decision-ready card → **S10**
- **CT05** Any published listing card → **S19**
- **CT06** Left rail Market → **S17**
- **CT07** Left rail Inbox → **S22**
- **CT08** Team members / invite → **S20**

### Back behavior

This is the home root for the authenticated prototype.

## S02 — Launch Project / Step 1: Choose source

### Primary action

Continue.

### Click targets

- **CT01** Start blank tile → selected state on **S02**
- **CT02** Use template tile → template browse state on **S02**
- **CT03** Use knowledge pack tile → pack browse state on **S02**
- **CT04** Template card select → selected state on **S02**
- **CT05** Continue → **S03**
- **CT06** Back → **S01**

## S03 — Launch Project / Step 2: Team and name

### Click targets

- **CT01** Team dropdown → dropdown state on **S03**
- **CT02** Project name field → typing state on **S03**
- **CT03** Continue → **S04**
- **CT04** Back → **S02**

## S04 — Launch Project / Step 3: Hosting posture

### Click targets

- **CT01** Managed by TreeSeed → selected state on **S04**
- **CT02** Self-hosted → selected state on **S04**
- **CT03** Hybrid → selected state on **S04**
- **CT04** Continue → **S05**
- **CT05** Back → **S03**

## S05 — Launch Project / Step 4: Environments

### Click targets

- **CT01** Local checkbox → toggled state on **S05**
- **CT02** Staging checkbox → toggled state on **S05**
- **CT03** Production checkbox → toggled state on **S05**
- **CT04** Continue → **S06**
- **CT05** Back → **S04**

## S06 — Launch Project / Step 5: Starter direction

### Click targets

- **CT01** Objective field → typing state on **S06**
- **CT02** Question field → typing state on **S06**
- **CT03** Decision policy dropdown → selection state on **S06**
- **CT04** Continue → **S07**
- **CT05** Back → **S05**

## S07 — Launch Project / Step 6: Review and launch

### Click targets

- **CT01** Launch project → **S08**
- **CT02** Back → **S06**

### Success state

After launch, land on Project Overview with a visible “Next best action” card.

## S08 — Project Overview

### Purpose

Project cockpit.

### Primary action

Start change.

### Click targets

- **CT01** Start change button → **S10**
- **CT02** Quick action Release → **S14**
- **CT03** Quick action Share → **S16**
- **CT04** Top nav Direct → **S09**
- **CT05** Top nav Workstreams → **S11**
- **CT06** Top nav Agents → **S13**
- **CT07** Top nav Releases → **S14**
- **CT08** Top nav Share → **S16**
- **CT09** Top nav Settings → **S21**
- **CT10** Next best action card → destination depends on label, default **S09**
- **CT11** Recent activity item → related detail screen, default **S12** or **S09**

### Back behavior

Return to **S01** only via left rail Home.

## S09 — Direct

### Purpose

Direction and decisions board.

### Primary action

New proposal or new decision, depending on saved view.

### Click targets

- **CT01** New objective → **S09A** overlay in objective mode
- **CT02** New question → **S09A** overlay in question mode
- **CT03** New proposal → **S09A** overlay in proposal mode
- **CT04** New decision → **S09B** overlay
- **CT05** Select card → **S09** detail state
- **CT06** Start linked change from approved decision → **S10**
- **CT07** Open linked release → **S15**
- **CT08** Workstreams tab → **S11**

### Overlay S09A

Simple modal with title field and save button.

Modes:

- objective
- question
- proposal

Actions:

- Save → return to **S09** with new card visible
- Cancel/X → **S09**

### Overlay S09B

Decision builder modal.

Fields:

- decision type: yes/no or ranked
- proposal reference(s)
- participants
- deadline
- pass rule

Actions:

- Save draft → **S09** with new decision card visible
- Cancel/X → **S09**

## S10 — Start Change modal

### Purpose

Bridge approved human workflow to local work.

### Primary action

Start change.

### Click targets

- **CT01** Approved decision dropdown → selection state on **S10**
- **CT02** New change lane → **S12** new lane state
- **CT03** Existing lane row → **S12** existing lane state
- **CT04** Start change → **S12**
- **CT05** Cancel/X → back to parent, default **S08**

## S11 — Workstreams Overview

### Purpose

Lane-based lifecycle view.

### Primary action

Start change.

### Click targets

- **CT01** Start change → **S10**
- **CT02** Any lane card → **S12**
- **CT03** Filter chip → filtered state on **S11**
- **CT04** Send to staging quick action → **S14**
- **CT05** Archived column card → **S12** archived state

## S12 — Workstream Detail

### Purpose

Single source of truth for one change lane.

### Primary action

Save progress.

### Click targets

- **CT01** Save progress → **S12 saved state**
- **CT02** Run verification → **S12 verified state**
- **CT03** Send to staging → **S14**
- **CT04** Archive → **S11**
- **CT05** Open linked decision → **S09** selected-card state
- **CT06** Open verification run → expanded state on **S12**

### State notes

- **Saved state**: show success banner “Saved locally and remotely”
- **Verified state**: show green badge “Verification passing”

## S13 — Agents Overview

### Purpose

Human-readable agent management.

### Primary action

Open issue needing attention.

### Click targets

- **CT01** Overview / Message log toggle → **S13B** for log view
- **CT02** Agent row → expanded state on **S13**
- **CT03** Linked proposal or question → **S09**
- **CT04** Failure / warning item → **S09** or **S15**, default **S09**

## S13B — Agents Message Log

### Click targets

- **CT01** Filter chip → filtered state on **S13B**
- **CT02** Open proposal alert → **S09**
- **CT03** Open decision alert → **S09**
- **CT04** Open share alert → **S16D**
- **CT05** Back to Overview → **S13**

## S14 — Releases Overview

### Purpose

Release hub.

### Primary action

Draft new release.

### Click targets

- **CT01** Draft new release → **S15** draft state
- **CT02** Release candidate row → **S15**
- **CT03** Rollback button → **S14R** confirm state
- **CT04** Previous release row → **S15** published state
- **CT05** Share summary/export notes → **S16A**

### State S14R

Rollback confirm modal.

- Confirm → return **S14** with banner
- Cancel → **S14**

## S15 — Release Detail

### Purpose

Publication decision screen.

### Primary action

Publish to production.

### Click targets

- **CT01** Publish to production → **S15P** published state
- **CT02** Export notes → **S16A**
- **CT03** Open blocked lane → **S12**
- **CT04** Open linked decision → **S09**
- **CT05** Back to Releases → **S14**

### State S15P

Published success state.

- banner: “Release 1.3.0 published”
- CTA: “Open listing/share” → **S16D**

## S16 — Share hub

### Purpose

Unify export, package, and publish.

### Primary action

Publish listing.

### Click targets

- **CT01** Export tab → **S16A**
- **CT02** Package as template tab → **S16B**
- **CT03** Package as knowledge pack tab → **S16C**
- **CT04** Publish listing tab → **S16D**
- **CT05** Listing preview card → **S18**

## S16A — Share / Export

### Click targets

- **CT01** Export project snapshot → success state on **S16A**
- **CT02** Export release artifact → success state on **S16A**
- **CT03** Publish listing tab → **S16D**

## S16B — Share / Package as template

### Click targets

- **CT01** Edit metadata fields → typing state on **S16B**
- **CT02** Provenance toggle → selection state on **S16B**
- **CT03** Save draft → saved state on **S16B**
- **CT04** Publish listing tab → **S16D**

## S16C — Share / Package as knowledge pack

### Click targets

- **CT01** Select source contents → selection state on **S16C**
- **CT02** Public notes/trust toggle → selection state on **S16C**
- **CT03** Save draft → saved state on **S16C**
- **CT04** Publish listing tab → **S16D**

## S16D — Share / Publish listing

### Purpose

Final market listing draft and publish screen.

### Primary action

Publish to market.

### Click targets

- **CT01** Listing title field → typing state on **S16D**
- **CT02** Trust checklist item → focused state on **S16D**
- **CT03** Save draft → saved state on **S16D**
- **CT04** Publish to market → **S18** published listing detail
- **CT05** Open preview card → **S18**

## S17 — Market Home

### Purpose

Browse and discover market products.

### Primary action

Open listing.

### Click targets

- **CT01** Search bar → result state on **S17**
- **CT02** Filter chip → filtered state on **S17**
- **CT03** Any listing card → **S18**
- **CT04** Launch project CTA → **S02**
- **CT05** Home in left rail/top nav → **S01** if authenticated

## S18 — Listing Detail

### Purpose

Trust and install page.

### Primary action

Install / Fork.

### Click targets

- **CT01** Install / Fork → **S02** if starting new, or **S08** if attaching to existing project
- **CT02** Buy / Request access → request state on **S18**
- **CT03** Trust tab → **S18T**
- **CT04** Compatibility tab → **S18C**
- **CT05** Publisher / team link → **S19**

### State S18T

Trust-focused tab state.

- show publisher, verification, hooks policy, compatibility

### State S18C

Compatibility-focused tab state.

- show version support, hosting posture, reconcile support

## S19 — Team Products

### Purpose

All listings owned by a team.

### Primary action

New listing.

### Click targets

- **CT01** New listing → **S16**
- **CT02** Draft listing card → **S16D**
- **CT03** Published listing card → **S18**
- **CT04** Source project link → **S08**

## S20 — Team Members

### Purpose

Simple role and access management.

### Primary action

Invite member.

### Click targets

- **CT01** Invite member → **S20A** modal
- **CT02** Edit role → **S20B** modal
- **CT03** Back to Team Home → **S01**

### Modal S20A

Invite form.

- Send invite → **S20** success banner
- Cancel → **S20**

### Modal S20B

Role editor.

- Save role → **S20** success banner
- Cancel → **S20**

## S21 — Project Settings

### Purpose

Calm, shallow configuration.

### Primary action

Save settings.

### Click targets

- **CT01** Settings group in left subnav → focused group state on **S21**
- **CT02** Decision policy row → **S21P** detail state
- **CT03** Capability row → **S21C** detail state
- **CT04** Save settings → saved state on **S21**
- **CT05** Danger zone → **S21D** confirm state

### State S21P

Decision policy detail.

- show voting method, approvers, visibility, start-work rule

### State S21C

Capability detail.

- show what it allows, where it runs, who can approve

### State S21D

Danger confirm.

- destructive confirmation only, no full delete flow needed in first prototype

## S22 — Inbox

### Purpose

One attention center for approvals and warnings.

### Primary action

Open top priority alert.

### Click targets

- **CT01** Proposal needs feedback alert → **S09**
- **CT02** Decision waiting on your vote → **S09**
- **CT03** Approved decision ready to start → **S10**
- **CT04** Release-ready alert → **S15**
- **CT05** Share incomplete alert → **S16D**
- **CT06** Mark as done → resolved state on **S22**

## Recommended clickable prototype paths

## Path A — Launch and guide a new project

```text
S01 → S02 → S03 → S04 → S05 → S06 → S07 → S08 → S09
```

## Path B — Turn direction into approved work

```text
S08 → S09 → S09A or S09B → S09 approved decision state → S10 → S12
```

## Path C — Release to production

```text
S08 → S14 → S15 → S15P
```

## Path D — Package and publish to market

```text
S08 → S16 → S16B or S16C → S16D → S18
```

## Path E — Discover and install from market

```text
S17 → S18 → S02 → S08
```

## Figma build order

Build in this order for fastest usable prototype:

1. S01 Team Home
2. S02–S07 Launch wizard
3. S08 Project Overview
4. S09 Direct
5. S10 Start Change modal
6. S11 Workstreams Overview
7. S12 Workstream Detail
8. S14 Releases Overview
9. S15 Release Detail
10. S16 Share hub + publish state
11. S17 Market Home
12. S18 Listing Detail
13. S22 Inbox

## Handoff note

For low-fidelity frames, label click targets directly in the mockups with small tags like:

- CT01 Launch project
- CT02 Open project
- CT03 Start change

That makes dev handoff and prototype QA much faster because screen numbers and interactions stay synchronized.

