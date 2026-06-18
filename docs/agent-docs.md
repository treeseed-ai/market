# TreeSeed Agent-Driven Documentation Automation Implementation Plan

## Purpose

This plan defines how TreeSeed should reach a fully governed, background-running AI documentation system using TreeSeed agents themselves.

The target outcome is:

> Running the fixed local dev runtime with the package-owned capacity provider starts a local governed workday that analyzes the TreeSeed codebase, builds and updates a detailed knowledge base, proposes supporting content, routes changes through review and approval, and exposes the process in the TreeSeed control app.

This plan is intentionally scoped to the current TreeSeed repository shape:

* top-level `market` application
* `packages/agent`
* `packages/sdk`
* `packages/cli`
* `packages/core`

The plan does not introduce a separate documentation automation system. It completes the loop around the existing TreeSeed agent runtime, knowledge pipeline, workday services, worktree lifecycle, Codex docs mutation path, content model, and control app.

## Current Processing Parity Note

The hosted/local processing runtime now centers on the `@treeseed/agent`
package. That package owns provider API, provider manager, provider runner,
AgentKernel execution, mode scheduling, provider plan/doctor, runtime path
resolver, built-in handlers, and testing harnesses. The top-level Market repo
still owns tenant Markdown specs and executable test catalog entries under
`src/content/agents` and `src/content/agent-tests`.

Current capacity coordination records are API-owned: provider availability
sessions, assignment leases, mode runs, usage actuals, and ledger settlement
belong in `@treeseed/api` and use SDK contracts. See
[agent-capacity-implementation-roadmap.md](agent-capacity-implementation-roadmap.md)
for the canonical rearchitecture.

Documentation automation work that runs in parity mode should use the
containerized role commands and `/data` worker layout. `.agent-worktrees` remain
acceptable only for fast-dev/test harness behavior and should appear as
non-parity if detected by `parity-plan`.

---

## Current Foundation

TreeSeed already has most of the lower-level ingredients needed for this system:

* agent runtime exports for kernel, registry, runtime providers, handlers, workday manager, worker loop, workday start/report, runtime readiness, research-knowledge workdays, context processing, Codex docs mutation lifecycle, agent worktrees, and knowledge pipeline serialization;
* handlers for researcher, knowledge generator, knowledge optimizer, engineer, reviewer, and releaser;
* a research-to-knowledge pipeline that can produce research notes, knowledge drafts, optimization reports, and serialized content;
* a dogfood harness that generates platform knowledge artifacts from seeded TreeSeed questions;
* worktree mutation infrastructure with allowed/forbidden path enforcement;
* tests for research/knowledge handlers, research workdays, worktree mutation, Codex docs mutation, worker, manager, orchestration, runtime readiness, and Market knowledge dogfooding;
* top-level Market content directories for agents, books, decisions, knowledge, notes, objectives, pages, people, proposals, questions, templates, workdays, and knowledge packs;
* app UI now organized around Start, Hosts, Projects, Capacity, Work, and Knowledge controls;
* database migrations for workdays, tasks, events, outputs, reports, work policies, priority overrides, approvals, capacity, runners, governance summary items, operational summaries, remote jobs, and hub/repository topology.

The missing work is not “invent agents.” The missing work is to make the existing pieces operate as a complete product loop: seed code-aware documentation work, execute it safely, persist outputs, present them in governance UI, and allow approved content mutations to become canonical knowledge.

---

## Product Objective

Build a TreeSeed-native documentation automation process where agents continuously convert project implementation into useful open knowledge.

The system should:

1. inspect code and existing content;
2. maintain an evolving knowledge map for TreeSeed itself;
3. generate research notes from implementation evidence;
4. generate draft knowledge articles from those notes;
5. optimize and score drafts;
6. request governance decisions for promotion, rewrite, defer, or reject;
7. mutate documentation only in isolated worktrees and approved paths;
8. surface every artifact and decision in the Work and Knowledge areas of the control app;
9. run locally through `trsd dev` plus `trsd capacity` and later remotely through the same provider assignment model;
10. leave a durable audit trail of what agents saw, wrote, recommended, changed, and could not verify.

---

## Definition of Done

The plan is complete when all of the following are true:

* `trsd dev` and `trsd capacity` can start a local workday for the top-level Market operational context.
* The manager discovers enabled documentation automation agents from `src/content/agents` or a normalized agent spec source.
* Startup tasks are seeded automatically for codebase scan, graph refresh, knowledge gap detection, research, draft generation, optimization, review, and promotion request creation.
* Workers execute documentation tasks without ad hoc human instruction.
* Agents read code context from `market`, `packages/agent`, `packages/sdk`, `packages/cli`, and `packages/core`.
* Agents produce content under governed documentation surfaces only.
* Generated outputs include source maps that point back to implementation files.
* Promotion requires an approval request unless the work policy explicitly allows low-risk auto-promotion.
* The Work and Knowledge areas show active workday state, queued/running/completed tasks, generated notes, drafts, optimization scores, source maps, proposed mutations, approvals, verification state, and audit trail.
* A reviewer can approve, request changes, defer, or reject generated documentation from the UI.
* Approved documentation mutations run through the existing worktree and verification lifecycle.
* Failed verification creates a visible repair task and preserves the failed snapshot.
* Release remains human-approved.
* Tests cover the local manager loop, seeded docs workday, UI governance surfaces, approval transitions, path safety, and generated content validation.

---

## Architecture Overview

The final system should use six cooperating layers.

### 1. Agent Definitions

Top-level Market should define its own agents in `src/content/agents/*.mdx`. These are product-visible agent records and runtime specs.

### 2. Workday Manager

The provider assignment loop should run a local workday manager that:

* loads the Market operational runtime;
* resolves work policy;
* starts or resumes the active local workday;
* refreshes repository context;
* seeds startup tasks;
* periodically schedules follow-up tasks;
* records workday summaries and governance summary items;
* exposes state through the API/UI.

### 3. Worker Loop

The worker loop claims tasks and executes handlers with adapters for:

* research/context retrieval;
* local branch or worktree mutations;
* local verification;
* Codex execution for implementation mutations;
* SDK message and artifact recording;
* task event logging.

### 4. Knowledge Pipeline

The knowledge pipeline turns code-aware context into durable content:

* codebase inventory;
* documentation map;
* knowledge gaps;
* research notes;
* knowledge drafts;
* optimization reports;
* promotion requests;
* approved canonical knowledge files.

### 5. Governance Plane

The governance plane owns:

* approval requests;
* human decisions;
* path safety;
* work policy;
* capacity budget;
* verification requirements;
* audit events;
* release gates.

### 6. Control App

The control app should make the automation inspectable and steerable:

* Work objectives and workday request controls;
* Work decision review queue;
* generated artifact review surfaces under Knowledge;
* approval decision forms under Work;
* Capacity provider and grant controls;
* project guidance controls;
* knowledge base diffs and source maps.

---

## Content Model Target

The automation should generate and maintain these top-level Market content families.

### Canonical Knowledge

Path:

```text
src/content/knowledge/treeseed/**
src/content/knowledge/agent-runtime/**
src/content/knowledge/sdk/**
src/content/knowledge/cli/**
src/content/knowledge/core/**
src/content/knowledge/market/**
src/content/knowledge/governance/**
src/content/knowledge/operations/**
```

Purpose:

* stable documentation for how TreeSeed works;
* implementation-grounded explanations;
* reusable open knowledge for users and future agents.

### Research Notes

Path:

```text
src/content/notes/agent-research/**
```

Purpose:

* preserve exploratory findings;
* cite source code paths;
* make uncertainty visible;
* keep discarded findings accessible.

### Questions

Path:

```text
src/content/questions/**
```

Purpose:

* define open documentation questions;
* seed future research tasks;
* connect implementation ambiguity to knowledge work.

### Objectives

Path:

```text
src/content/objectives/**
```

Purpose:

* track documentation goals;
* prioritize automation work;
* create a visible planning layer for human governance.

### Proposals

Path:

```text
src/content/proposals/**
```

Purpose:

* propose structural knowledge changes;
* propose new books/sections;
* propose governance policy changes.

### Decisions

Path:

```text
src/content/decisions/**
```

Purpose:

* record approved documentation architecture decisions;
* capture why a generated content path or taxonomy was accepted.

### Agent Pages

Path:

```text
src/content/agents/**
```

Purpose:

* define runtime-visible documentation automation agents;
* explain each agent’s role, triggers, permissions, and governance boundaries.

### Workday Reports

Path:

```text
src/content/workdays/**
```

Purpose:

* summarize what agents did during each workday;
* provide durable daily/weekly reports;
* link tasks, artifacts, approvals, and verification outcomes.

---

## Required Top-Level Market Agents

Create these agent definitions in the top-level Market project under `src/content/agents`.

Each agent page should include:

* `name`
* `slug`
* `handler`
* `enabled`
* `description`
* `summary`
* `operator`
* `runtimeStatus`
* `capabilities`
* `tags`
* `systemPrompt`
* `persona`
* `triggers`
* `permissions`
* `execution`
* `outputs`
* `governance`

### 1. TreeSeed Documentation Planner

Suggested file:

```text
src/content/agents/treeseed-docs-planner.mdx
```

Runtime slug:

```text
treeseed-docs-planner
```

Handler:

```text
planner
```

Purpose:

* inspect current objectives, questions, existing knowledge, and code inventory;
* maintain the documentation backlog;
* seed research tasks for high-priority gaps;
* avoid duplicate documentation work.

Triggers:

* startup;
* schedule;
* objective priority changed;
* knowledge gap detected;
* review requested changes.

Permissions:

* read objectives, questions, notes, knowledge, decisions, proposals, agents, workdays;
* create questions, objectives, notes, messages, tasks;
* no direct canonical knowledge mutation.

Outputs:

* `documentation_gap_detected`
* `research_task_requested`
* `documentation_plan_updated`
* `task_waiting`

Governance:

* may create backlog and research tasks automatically;
* may not promote content;
* may not mutate code.

### 2. TreeSeed Codebase Cartographer

Suggested file:

```text
src/content/agents/treeseed-codebase-cartographer.mdx
```

Runtime slug:

```text
treeseed-codebase-cartographer
```

Handler:

```text
researcher
```

Purpose:

* build a current map of TreeSeed packages, modules, runtime seams, tests, and content surfaces;
* produce source-grounded research notes;
* keep package/module ownership and relationships visible.

Triggers:

* startup;
* graph refreshed;
* documentation gap detected;
* file surface changed;
* manual rescan.

Context scopes:

```text
packages/agent/src/**
packages/agent/test/**
packages/sdk/src/**
packages/sdk/test/**
packages/cli/src/**
packages/cli/scripts/**
packages/core/src/**
packages/core/test/**
src/**
docs/**
packages/sdk/drizzle/**
AGENTS.md
README.md
package.json
```

Permissions:

* read graph/context/code;
* create notes and messages;
* create draft source-map artifacts;
* no mutation.

Outputs:

* `codebase_inventory_completed`
* `research_note_created`
* `source_map_created`
* `knowledge_gap_detected`

Governance:

* fully automatic;
* source maps required;
* uncertainty required when implementation evidence is incomplete.

### 3. TreeSeed Knowledge Generator

Suggested file:

```text
src/content/agents/treeseed-knowledge-generator.mdx
```

Runtime slug:

```text
treeseed-knowledge-generator
```

Handler:

```text
knowledge-generator
```

Purpose:

* convert approved research notes into draft knowledge articles;
* write drafts with frontmatter, source maps, related objectives/questions, and review state;
* target canonical books and sections without directly promoting them.

Triggers:

* research note created;
* research task completed;
* manual draft requested.

Permissions:

* read research notes, questions, objectives, existing knowledge;
* create draft artifacts;
* create messages;
* may write only to draft/staging paths unless invoked through approved mutation lifecycle.

Outputs:

* `knowledge_draft_created`
* `draft_requires_context`
* `task_failed`

Governance:

* must set `review_state: pending_review`;
* must include `Source map` section;
* must not claim unsupported facts;
* must label missing or ambiguous evidence.

### 4. TreeSeed Knowledge Optimizer

Suggested file:

```text
src/content/agents/treeseed-knowledge-optimizer.mdx
```

Runtime slug:

```text
treeseed-knowledge-optimizer
```

Handler:

```text
knowledge-optimizer
```

Purpose:

* score generated drafts;
* improve structure and future agent usefulness;
* recommend promote, revise, defer, or reject;
* create governance-ready optimization reports.

Triggers:

* knowledge draft created;
* reviewer requested rewrite;
* scheduled quality sweep.

Permissions:

* read drafts, notes, source maps, existing knowledge;
* create optimization reports;
* create promotion requests;
* no direct canonical mutation.

Outputs:

* `knowledge_optimization_completed`
* `promotion_request_created`
* `revision_requested`
* `draft_rejected`

Score dimensions:

* factual grounding;
* book fit;
* structure;
* future agent usefulness;
* human reviewability;
* link quality;
* uncertainty visibility.

Governance:

* promotion requires threshold score and source-map presence;
* low-score drafts must route back to generator or planner.

### 5. TreeSeed Documentation Engineer

Suggested file:

```text
src/content/agents/treeseed-docs-engineer.mdx
```

Runtime slug:

```text
treeseed-docs-engineer
```

Handler:

```text
engineer
```

Purpose:

* apply approved documentation mutations;
* run the Codex docs mutation lifecycle when appropriate;
* update content paths in an isolated worktree;
* execute verification commands;
* create repair tasks when verification or merge fails.

Triggers:

* promotion approved;
* implementation task approved;
* reviewer requested concrete changes;
* repair task created.

Allowed paths:

```text
docs/**
src/content/knowledge/**
src/content/notes/**
src/content/questions/**
src/content/objectives/**
src/content/proposals/**
src/content/decisions/**
src/content/agents/**
src/content/workdays/**
packages/*/README.md
```

Forbidden paths for documentation tasks:

```text
.env*
**/.env*
**/node_modules/**
**/.git/**
packages/*/src/**
src/lib/**
src/pages/api/**
packages/sdk/drizzle/**
```

Code paths may be read for context but not mutated by documentation tasks unless the task is explicitly escalated to an implementation workstream.

Outputs:

* `docs_mutation_completed`
* `docs_mutation_waiting_for_review`
* `docs_mutation_failed`
* `repair_task_created`

Governance:

* requires approval for canonical content writes;
* must run verification;
* must stage through a feature branch/worktree;
* must report changed paths;
* must block forbidden path mutations.

### 6. TreeSeed Documentation Reviewer

Suggested file:

```text
src/content/agents/treeseed-docs-reviewer.mdx
```

Runtime slug:

```text
treeseed-docs-reviewer
```

Handler:

```text
reviewer
```

Purpose:

* review generated drafts and mutations before human approval;
* check source-map fidelity;
* check content taxonomy;
* detect hallucinated implementation claims;
* summarize review risk for humans.

Triggers:

* optimization completed;
* docs mutation completed;
* verification completed;
* human requested review.

Permissions:

* read all generated artifacts;
* read changed paths;
* read source maps;
* create review reports and approval recommendations;
* no mutation.

Outputs:

* `review_passed`
* `review_failed`
* `human_approval_recommended`
* `revision_requested`

Governance:

* must produce a clear recommendation;
* must highlight unsupported claims;
* must identify exact files changed.

### 7. TreeSeed Governance Steward

Suggested file:

```text
src/content/agents/treeseed-governance-steward.mdx
```

Runtime slug:

```text
treeseed-governance-steward
```

Handler:

```text
reviewer
```

Purpose:

* convert review recommendations into approval requests;
* maintain governance summary items;
* ensure promotion requests have enough evidence for humans;
* enforce policy boundaries.

Triggers:

* promotion request created;
* review passed;
* verification completed;
* approval expired;
* policy violation detected.

Permissions:

* read approval requests, reports, artifacts, tasks;
* create governance summary items;
* create approval requests;
* update approval request state when a human decision is recorded;
* no content mutation.

Outputs:

* `approval_request_created`
* `governance_item_created`
* `policy_violation_detected`
* `approval_ready_for_human`

Governance:

* cannot approve its own requests;
* must route decisions to human UI unless policy explicitly allows auto-approval.

### 8. TreeSeed Workday Reporter

Suggested file:

```text
src/content/agents/treeseed-workday-reporter.mdx
```

Runtime slug:

```text
treeseed-workday-reporter
```

Handler:

```text
reporter
```

Purpose:

* summarize daily/background agent work;
* write workday reports;
* update operational summary snapshots;
* create concise Work decision entries.

Triggers:

* workday closeout;
* schedule;
* significant event batch;
* manual report requested.

Permissions:

* read tasks, task events, outputs, approvals, reports, and governance summary items;
* create workday reports;
* create notes/messages;
* update operational summary snapshots.

Outputs:

* `workday_report_created`
* `operational_summary_updated`
* `governance_summary_item_created`

Governance:

* automatic;
* no canonical knowledge mutation;
* should link to source artifacts rather than duplicate them.

### 9. TreeSeed Releaser

Suggested file:

```text
src/content/agents/treeseed-releaser.mdx
```

Runtime slug:

```text
treeseed-releaser
```

Handler:

```text
releaser
```

Purpose:

* prepare release notes for approved documentation updates;
* verify staging state;
* keep release human-approved.

Triggers:

* staging merge completed;
* release requested;
* scheduled release preparation.

Permissions:

* read staged changes, reports, decisions, approvals;
* create release notes and messages;
* no production release without human approval.

Outputs:

* `release_candidate_created`
* `release_waiting_for_approval`
* `release_failed`

Governance:

* release remains human-approved;
* no automatic production publishing in the first implementation phase.

---

## Agent Definition Frontmatter Template

Use a shared shape like this for each top-level Market agent:

```mdx
---
name: TreeSeed Documentation Planner
slug: treeseed-docs-planner
handler: planner
enabled: true
description: Plans TreeSeed documentation work from codebase evidence, objectives, and knowledge gaps.
summary: Maintains the documentation backlog and seeds research tasks without directly mutating canonical knowledge.
operator: TreeSeed platform
runtimeStatus: active
capabilities:
  - planning
  - documentation backlog
  - knowledge gap detection
  - task seeding
tags:
  - agent
  - documentation
  - governance
systemPrompt: |
  You are the TreeSeed Documentation Planner. Keep documentation work grounded in current TreeSeed code, existing knowledge, objectives, and governance policy. Prefer small traceable tasks over broad undocumented mutation. Create research tasks when evidence is missing. Do not mutate canonical content directly.
persona: Careful, prioritizing, source-grounded, and governance-aware.
triggers:
  - type: startup
  - type: schedule
    cron: "*/30 * * * *"
  - type: message
    messageTypes:
      - objective_priority_updated
      - knowledge_gap_detected
      - review_failed
permissions:
  - model: objective
    operations: [search, get, create]
  - model: question
    operations: [search, get, create]
  - model: note
    operations: [search, get, create]
  - model: knowledge
    operations: [search, get]
  - model: task
    operations: [create]
  - model: message
    operations: [create]
execution:
  maxConcurrency: 1
  timeoutSeconds: 900
  cooldownSeconds: 60
  leaseSeconds: 300
  retryLimit: 3
  branchPrefix: docs-planner
outputs:
  messageTypes:
    - documentation_gap_detected
    - research_task_requested
    - documentation_plan_updated
    - task_waiting
  modelMutations:
    - question:create
    - objective:create
    - note:create
    - task:create
    - message:create
governance:
  mutationClass: planning_only
  approvalRequiredForCanonicalContent: true
  approvalRequiredForCode: true
---

The planner keeps background documentation automation focused on the highest-value, evidence-backed work.
```

---

## Workday Task Model

Add or normalize documentation-specific task kinds.

### Startup/Planning Tasks

```text
refresh_project_graph
scan_codebase_documentation_surface
detect_documentation_gaps
plan_documentation_workday
```

### Research Tasks

```text
research_code_surface
research_runtime_flow
research_package_api
research_cli_command
research_ui_governance_flow
```

### Knowledge Tasks

```text
generate_knowledge_draft
optimize_knowledge_draft
review_knowledge_draft
create_promotion_request
```

### Mutation Tasks

```text
apply_approved_docs_mutation
verify_docs_mutation
stage_docs_mutation
create_repair_task
```

### Governance Tasks

```text
create_approval_request
record_approval_decision
sync_governance_summary
summarize_governance_state
```

### Reporting Tasks

```text
write_workday_report
update_operational_summary_snapshot
publish_agent_activity_summary
```

---

## Local Provider Behavior

### Current Desired Command Contract

When running the local dev runtime and capacity provider:

```bash
trsd dev start --web-runtime local
trsd capacity up --execute --json
```

TreeSeed should:

1. load local Market operational config;
2. ensure local Treeseed PostgreSQL schema state exists;
3. run migrations if needed;
4. load agent specs from `src/content/agents`;
5. load work policy;
6. collect runtime readiness;
7. start or resume a local workday;
8. seed startup tasks;
9. start manager scheduling loop;
10. optionally start or connect to a local worker;
11. expose state to the operational app.

### Manager Startup Algorithm

```text
resolve project root
resolve local environment
load treeseed.site.yaml, src/manifest.yaml, src/content/agents
resolve AgentSdk local runtime
run runtime readiness
start or resume active workday
refresh repository context
seed documentation startup tasks
record manager lease
run scheduling loop
write manager events
update operational summary snapshot
sync governance summary
```

### Local Development Modes

Use the fixed local dev runtime for Market web/API/operations-runner surfaces:

```bash
trsd dev start --web-runtime local
```

Capacity provider lifecycle is intentionally separate:

```bash
trsd capacity status --json
trsd capacity up --execute --json
```

End-to-end governance tests should start the fixed web/API runtime first, then start or inspect the capacity provider through `trsd capacity` when provider execution is part of the scenario.

### Required Runtime Controls

Runtime controls should remain split across the fixed local dev command and the package-owned capacity provider lifecycle. Do not reintroduce `dev:manager`, `--with-worker`, or surface-selection flags on `trsd dev`.

Default for local development should be:

```text
docs-automation: on
approval-policy: manual
mutation: local_branch/worktree
release: manual
```

---

## Code-Aware Context Packs

The most important technical change is making documentation work code-aware by default.

### Required Context Pack Types

#### Package Surface Pack

Summarizes a package:

```text
package name
purpose
entrypoints
public exports
commands
runtime services
tests
related docs
known gaps
```

#### Module Surface Pack

Summarizes a directory/module:

```text
module path
responsibilities
important files
exported symbols
internal dependencies
inbound callers
outbound dependencies
tests
open questions
```

#### Flow Pack

Summarizes a process:

```text
flow name
entry command or UI action
services involved
data stores involved
tasks/messages emitted
approval points
failure modes
verification commands
```

#### UI Governance Pack

Summarizes a UI surface:

```text
route/component path
models shown
actions available
API endpoints used
approval state transitions
missing UI affordances
```

#### Source Map Pack

Maps generated knowledge claims to code paths:

```text
claim
source files
source symbols or sections
evidence strength
uncertainty
last observed commit/ref
```

### Initial Context Queries

Seed queries around these areas:

```text
agent runtime and handler registry
research knowledge workday pipeline
Codex docs mutation lifecycle
agent worktree path safety
local dev manager and worker loop
Work decision UI
Knowledge artifact UI
content model and knowledge routes
SDK graph and context query engine
CLI dev command surfaces
Core knowledge hub rendering and content runtime
```

### Context Scope Rules

For documentation automation:

* agents may read code paths broadly inside the scoped TreeSeed packages;
* agents may write only content/documentation paths;
* code mutation requires a separate implementation task and approval;
* generated content must include source maps;
* source maps must reference package-relative paths, not absolute local machine paths.

---

## Knowledge Base Taxonomy

Create a coherent TreeSeed knowledge base instead of letting agents scatter content.

### Proposed Books/Sections

```text
TreeSeed Overview
  purpose
  project model
  knowledge coop model
  automation philosophy

Agent Runtime
  kernel
  handlers
  registry
  messages
  tasks
  workdays
  workers
  capacity
  approvals
  reports

Documentation Automation
  research-to-knowledge pipeline
  code-aware context packs
  source maps
  knowledge drafts
  optimization reports
  promotion governance
  Codex docs mutation lifecycle

SDK
  local SDK
  graph API
  context queries
  operations
  stores
  workflow state
  templates

CLI
  dev
  capacity
  workflow commands
  workspace commands
  release commands
  diagnostics

Core Knowledge Hub
  content model
  Astro rendering
  books
  public content routes
  forms
  caching
  deployment

Control app
  Start
  Hosts
  Projects
  Capacity
  Work
  Knowledge
  decisions
  artifacts

Governance
  work policies
  approval requests
  path safety
  verification
  audit trail
  release gates

Operations
  local development
  deployment
  worker runners
  manager scheduling
  Cloudflare/Railway surfaces
  failure recovery
```

### Required Frontmatter for Generated Knowledge

```yaml
id: knowledge:<slug>
title: <Title>
type: guide | architecture | reference | operations | governance | api | cli | ui
status: draft | pending_review | canonical | deprecated
generated_by: treeseed-agent
agent_role: <role>
source_question: question:<slug>
source_research:
  - research:<slug>
review_state: pending_review
book_target: <book>
section_target: <section>
confidence: low | medium | high
source_map:
  - path: packages/agent/src/services/research-knowledge-workday.ts
    evidence: direct | supporting | inferred
updated: YYYY-MM-DD
related:
  objectives: []
  questions: []
  proposals: []
  decisions: []
```

### Required Body Sections

Every generated knowledge article should include:

```markdown
# Title

## What this explains

## Current implementation

## Main flow

## Important files

## Source map

## Governance and safety boundaries

## Open questions

## Verification notes
```

---

## Governance Workflow

### State Machine

```text
research_note_created
  -> knowledge_draft_created
  -> knowledge_optimization_completed
  -> promotion_request_created
  -> reviewer_agent_recommended
  -> human_approval_pending
  -> approved | changes_requested | deferred | rejected
  -> docs_mutation_started
  -> verification_running
  -> verification_passed | verification_failed
  -> staged_for_review
  -> merged_to_staging
  -> release_waiting_for_approval
```

### Approval Request Types

```text
promote_knowledge_draft
apply_docs_mutation
change_knowledge_taxonomy
create_new_book_or_section
escalate_to_code_change
release_documentation_update
```

### Approval Request Fields

```text
id
team_id
project_id
work_day_id
task_id
kind
state
severity
title
summary
recommendation
options
policy_snapshot
artifact_refs
source_map_refs
changed_paths
verification_plan
expires_at
created_at
updated_at
```

### Approval Options

```text
approve
request_changes
defer
reject
escalate_to_implementation
```

### Manual by Default

For the first implementation, all canonical knowledge promotion and all docs mutation should require human approval.

Later, low-risk auto-promotion can be enabled for:

* notes only;
* draft-only paths;
* typo fixes;
* index updates generated from already-approved content;
* workday reports.

---

## Worktree and Mutation Policy

Documentation mutations should use the existing worktree lifecycle.

### Lifecycle

```text
normalize docs mutation input
check approval
create or resume agent worktree
run Codex or deterministic writer
collect changed paths
check allowed/forbidden path policy
run verification commands
save snapshot on failure
stage successful changes
merge to staging if policy allows
close worktree when complete
record task outputs and events
```

### Allowed Paths for Docs Automation

```text
docs/**
src/content/knowledge/**
src/content/notes/**
src/content/questions/**
src/content/objectives/**
src/content/proposals/**
src/content/decisions/**
src/content/agents/**
src/content/workdays/**
packages/*/README.md
```

### Forbidden Paths

```text
.env*
**/.env*
**/.git/**
**/node_modules/**
.treeseed/worktrees/**
.treeseed/exports/**
packages/*/src/**
src/lib/**
src/pages/api/**
packages/sdk/drizzle/**
```

### Escalation Rule

If an agent discovers that documentation cannot be accurate without changing implementation code, it should not patch code in the docs workstream. It should create an implementation proposal or task with:

```text
problem
source evidence
required code paths
suggested owner agent
risk
verification command
```

---

## Operational App Integration

The UI is essential. The goal is not just background automation; the goal is governed automation humans can inspect, trust, and steer.

### Work And Knowledge Views

Enhance the control app surfaces to show:

* current workday phase;
* repository context;
* timeline events;
* generated artifact count;
* approval count;
* capacity and readiness warnings;
* actions: review approval, inspect artifacts, view policy.

### Agent Detail Panel

For each agent, show:

* role and system prompt;
* triggers;
* permissions;
* allowed paths;
* recent tasks;
* recent outputs;
* failures;
* governance boundaries.

### Workday Timeline

Add a project workday timeline:

```text
workday opened
manager lease acquired
graph refreshed
planner seeded tasks
research task started/completed
knowledge draft generated
optimization completed
approval requested
human decision recorded
mutation started
verification passed/failed
staged
closed
```

### Generated Knowledge Review Table

Columns:

```text
title
book/section target
source question
source research
confidence
optimization score
review state
recommendation
changed paths
approval state
actions
```

Actions:

```text
view draft
view source map
view optimization report
approve promotion
request changes
reject
defer
open mutation diff
```

### Approval Detail Page or Modal

Show:

* request summary;
* recommendation;
* source map;
* generated draft;
* proposed changed paths;
* verification plan;
* policy snapshot;
* task history;
* decision buttons.

### Governance Summary Integration

Create governance summary items for:

* approval required;
* verification failed;
* policy violation;
* workday completed;
* high-value knowledge gap discovered;
* release waiting for approval.

### Codex/Provider Readiness Card

Show:

* provider selected;
* SDK installed;
* auth detected;
* default model;
* sandbox mode;
* approval policy;
* last readiness check;
* warnings;
* allowed mutation paths.

### Operational Summary Snapshot

Show:

* current docs automation state;
* active workday;
* generated drafts;
* pending approvals;
* recent canonical knowledge changes;
* unresolved gaps;
* capacity used.

---

## API Endpoints

Add or complete endpoints for UI integration.

### Agent State

```text
GET /v1/projects/:projectId/agents
GET /v1/projects/:projectId/agents/:agentSlug
POST /v1/projects/:projectId/agents/:agentSlug/run
POST /v1/projects/:projectId/agents/:agentSlug/pause
POST /v1/projects/:projectId/agents/:agentSlug/resume
```

### Work

```text
GET /v1/projects/:projectId/workdays
GET /v1/projects/:projectId/workdays/:workdayId
POST /v1/projects/:projectId/workdays/start
POST /v1/projects/:projectId/workdays/:workdayId/close
```

### Tasks

```text
GET /v1/projects/:projectId/tasks
GET /v1/projects/:projectId/tasks/:taskId
GET /v1/projects/:projectId/tasks/:taskId/events
POST /v1/projects/:projectId/tasks/:taskId/retry
POST /v1/projects/:projectId/tasks/:taskId/cancel
```

### Artifacts

```text
GET /v1/projects/:projectId/agent-artifacts
GET /v1/projects/:projectId/agent-artifacts/:artifactId
GET /v1/projects/:projectId/agent-artifacts/:artifactId/source-map
GET /v1/projects/:projectId/agent-artifacts/:artifactId/diff
```

### Approvals

```text
GET /v1/projects/:projectId/approvals
GET /v1/projects/:projectId/approvals/:approvalId
POST /v1/projects/:projectId/approvals/:approvalId/decision
```

### Readiness

```text
GET /v1/projects/:projectId/agents/readiness
GET /v1/projects/:projectId/providers/codex/readiness
```

### Inbox

```text
GET /v1/teams/:teamId/inbox
POST /v1/teams/:teamId/inbox/:itemId/acknowledge
```

---

## Persistence Requirements

Use the existing database concepts and fill gaps rather than inventing a parallel store.

### Must Persist

```text
workdays
tasks
task events
task outputs
reports
approval requests
approval decisions
governance summary items
operational summary snapshots
capacity estimates
usage actuals
worker runners
manager leases
```

### Artifact Payload Types

```text
codebase_inventory
source_map
research_note
knowledge_draft
optimization_report
review_report
promotion_request
docs_mutation_result
verification_result
workday_report
```

### Artifact Storage Strategy

Local development:

```text
Treeseed PostgreSQL for metadata and governance state
static-hub D1/local sqlite only for unauthenticated form submissions
repo content files for generated content
.agent-worktrees for isolated mutations
```

Hosted/runtime later:

```text
Treeseed PostgreSQL for metadata
static-hub D1 only for unauthenticated form submissions
R2 for large artifact bodies
repository branches/worktrees for mutations
API for governance state
```

---

## Manager Scheduling Policy

### Startup Seeds

Every docs automation workday should seed:

```text
refresh_project_graph
scan_codebase_documentation_surface
detect_documentation_gaps
plan_documentation_workday
```

### Gap-Based Seeds

For each high-priority gap:

```text
research_code_surface
```

When research completes:

```text
generate_knowledge_draft
```

When a draft completes:

```text
optimize_knowledge_draft
```

When optimization recommends promotion:

```text
review_knowledge_draft
create_approval_request
```

When approval is granted:

```text
apply_approved_docs_mutation
verify_docs_mutation
stage_docs_mutation
```

At closeout:

```text
write_workday_report
update_operational_summary_snapshot
sync_governance_summary
```

### Budget Defaults

Work policy credit budgets are project/workday governance caps. Provider inventory is configured through native execution-provider limits and derived availability, not through daily/monthly provider credit budgets.

Local dev defaults:

```yaml
workPolicy:
  enabled: true
  dailyCreditBudget: 100
  maxQueuedTasks: 50
  maxRunners: 1
  maxWorkersPerRunner: 2
  approvalPolicy: manual
  docsAutomation:
    enabled: true
    maxResearchTasksPerWorkday: 8
    maxDraftsPerWorkday: 5
    maxMutationsPerWorkday: 2
    requireHumanApprovalForPromotion: true
    requireHumanApprovalForRelease: true
```

---

## Implementation Phases

## Phase 1: Normalize Top-Level Market Agent Definitions

### Goal

Make the top-level Market project define documentation automation agents as first-class content and runtime specs.

### Tasks

1. Add `src/content/agents/treeseed-docs-planner.mdx`.
2. Add `src/content/agents/treeseed-codebase-cartographer.mdx`.
3. Add `src/content/agents/treeseed-knowledge-generator.mdx`.
4. Add `src/content/agents/treeseed-knowledge-optimizer.mdx`.
5. Add `src/content/agents/treeseed-docs-engineer.mdx`.
6. Add `src/content/agents/treeseed-docs-reviewer.mdx`.
7. Add `src/content/agents/treeseed-governance-steward.mdx`.
8. Add `src/content/agents/treeseed-workday-reporter.mdx`.
9. Add `src/content/agents/treeseed-releaser.mdx`.
10. Ensure content config validates all agent frontmatter fields.
11. Ensure the agent spec loader can read these top-level documentation automation agents.

### Acceptance Criteria

* `listAgentSpecs` returns the new Market agents.
* Disabled agents are ignored.
* Startup-trigger agents are seeded on workday start.
* Automation records render in the operational app.

---

## Phase 2: Add Codebase Documentation Surface Scanner

### Goal

Agents need a structured inventory of TreeSeed code surfaces before they can write high-quality documentation.

### Tasks

1. Add a scanner service under `packages/agent/src/services` or `packages/sdk/src/graph`.
2. Scan only approved TreeSeed paths.
3. Produce package/module inventories.
4. Detect existing docs coverage.
5. Compare code surfaces to knowledge paths.
6. Emit `codebase_inventory` artifact.
7. Emit `knowledge_gap_detected` messages.

### Initial Inventory Targets

```text
packages/agent/src/index.ts
packages/agent/src/agents/**
packages/agent/src/services/**
packages/agent/src/api/**
packages/sdk/src/**
packages/cli/src/cli/**
packages/core/src/**
@treeseed/ui/components/astro/app/operations/**
packages/admin/src/pages/app/**
packages/admin/src/pages/v1/**
src/content/**
docs/**
packages/sdk/drizzle/**
```

### Acceptance Criteria

* Scanner produces deterministic output.
* Scanner output links code paths to existing knowledge files.
* Scanner can run as a startup task.
* Scanner does not read ignored worktree/export paths.

---

## Phase 3: Make Research Workdays Code-Aware

### Goal

Research tasks should retrieve code context, existing docs, and prior generated artifacts.

### Tasks

1. Extend context query contracts to support code scopes.
2. Add package/module/flow context pack builders.
3. Add source-map generation to researcher outputs.
4. Seed initial TreeSeed platform documentation questions.
5. Add top-level Market questions for each major package and flow.
6. Ensure research notes include implementation evidence and uncertainty.

### Seed Questions

```text
How does the TreeSeed agent runtime execute a workday?
How does the research-to-knowledge pipeline convert code evidence into docs?
How does Codex docs mutation stay inside worktree and path boundaries?
How does `trsd dev` supervise local surfaces?
How should the capacity provider assignment loop handle local docs automation work?
How does the TreeSeed app expose operational governance?
How do approval requests move through the system?
How does Work summarize decision needs?
How does the SDK graph/context query system support agent research?
How does the Core Knowledge Hub render and publish content?
```

### Acceptance Criteria

* Research notes include source maps.
* Research notes can cite code and existing knowledge.
* Research tasks are seeded from planner/gap outputs.
* Research output is visible in UI artifact list.

---

## Phase 4: Complete Knowledge Draft Generation and Optimization Loop

### Goal

Turn research notes into reviewable, structured knowledge drafts.

### Tasks

1. Ensure `knowledge-generator` accepts code-aware research notes.
2. Ensure drafts include required frontmatter.
3. Ensure drafts include required body sections.
4. Ensure `knowledge-optimizer` scores drafts.
5. Add promotion recommendation thresholds.
6. Add draft rewrite loop when score is low.
7. Persist draft and optimization artifacts.

### Promotion Thresholds

```text
promote: total score >= 28 and no critical grounding issues
revise: total score 20-27 or source map incomplete
reject: total score < 20 or unsupported core claims
defer: missing implementation evidence or unresolved taxonomy question
```

### Acceptance Criteria

* Drafts are deterministic enough to test.
* Drafts always include source maps.
* Optimization reports are persisted.
* Promotion requests are created only for eligible drafts.

---

## Phase 5: Build Governance Approval Loop

### Goal

Generated documentation must be governed before canonical mutation.

### Tasks

1. Add approval request creation from optimization/review outputs.
2. Add approval detail payloads with artifact refs and source-map refs.
3. Add decision recording endpoint.
4. Add approval state transitions.
5. Add governance summary items for pending approvals.
6. Add approval policy snapshot to each request.
7. Add tests for approve/request changes/defer/reject.

### Acceptance Criteria

* Pending approval appears in the operational app.
* Approval decision is persisted.
* Approved requests enqueue docs mutation.
* Requested changes enqueue revision task.
* Rejected requests close the draft loop.
* Deferred requests remain visible but inactive.

---

## Phase 6: Wire Approved Docs Mutation Lifecycle

### Goal

Approved content changes should be applied safely through existing mutation/worktree infrastructure.

### Tasks

1. Normalize docs mutation input from approval request.
2. Reuse Codex docs mutation lifecycle for non-deterministic edits.
3. Use deterministic writer for simple promotion of already-serialized drafts.
4. Enforce allowed/forbidden path checks.
5. Run verification commands.
6. Save failure snapshots.
7. Stage or merge only if verification passes and policy allows.
8. Create repair tasks on failure.

### Verification Commands

Local initial set:

```bash
npm run test:unit
npm run build
```

Optional targeted set:

```bash
npm run test -- packages/agent/test/agents/knowledge-handlers.test.ts
npm run test -- packages/agent/test/services/research-knowledge-workday.test.ts
npm run test -- test/lib/operational-ia.test.ts
```

### Acceptance Criteria

* Mutation fails on forbidden path change.
* Mutation records changed paths.
* Verification result is visible in UI.
* Failed verification creates repair task.
* Approved draft content lands in expected content path.

---

## Phase 7: Operational App Governance Surfaces

### Goal

Make the entire automation loop visible and testable in the web UI.

### Tasks

1. Extend Workday detail view.
2. Add operational timeline panel.
3. Add Generated Knowledge Review table.
4. Add Approval detail page.
5. Add provider readiness and policy cards.
6. Add Work decision summary.
8. Add operational summary docs automation widget.
9. Add mutation diff viewer.
10. Add task event log viewer.

### Acceptance Criteria

* User can see operational work progressing after `trsd dev` and `trsd capacity`.
* User can open a generated draft.
* User can inspect source map.
* User can approve/request changes/reject/defer.
* UI action changes backend approval state.
* Approved action queues mutation task.
* Verification status updates in UI.

---

## Phase 8: Workday Reports and Knowledge Base Publishing

### Goal

The background system should leave durable records that teach future humans and agents what happened.

### Tasks

1. Generate workday report content under `src/content/workdays`.
2. Link report to tasks, artifacts, approvals, and mutations.
3. Update operational summary snapshot.
4. Create Work summary.
5. Optionally generate a weekly documentation automation digest.

### Workday Report Template

```markdown
---
id: workday:<id>
title: TreeSeed Documentation Automation Workday - YYYY-MM-DD
status: completed | partial | failed
work_day_id: <id>
generated_by: treeseed-agent
updated: YYYY-MM-DD
---

# Summary

## What agents analyzed

## Knowledge created

## Drafts pending review

## Approved changes

## Verification outcomes

## Governance decisions

## Open questions

## Next workday recommendations
```

### Acceptance Criteria

* Workday report appears in content.
* Work shows the latest report context.
* Work decisions has a review item.
* Report references generated artifacts.

---

## Phase 9: Background Automation Hardening

### Goal

Move from demo loop to reliable governed background operation.

### Tasks

1. Add manager lease handling for local and hosted modes.
2. Add worker runner registration and heartbeat visibility.
3. Add retry/backoff policy.
4. Add stale task recovery.
5. Add idempotency keys for all seeded tasks.
6. Add capacity reservation/ledger integration.
7. Add policy-based queue limits.
8. Add pause/resume controls.
9. Add observability around task duration and failures.

### Acceptance Criteria

* Restarting the local capacity provider resumes safely.
* Duplicate startup tasks are not created.
* Crashed tasks can be retried.
* UI shows stuck/stale tasks.
* Capacity budget prevents runaway automation.

---

## Phase 10: Remote/Hosted Parity

### Goal

The same governed process should eventually run in hosted environments.

### Tasks

1. Ensure local workday manager and Railway/hosted manager use same code path.
2. Ensure local worker and hosted worker use same task contract.
3. Store large artifacts in R2 for hosted mode.
4. Keep repository mutation behind provider capability grants.
5. Integrate Capacity provider settings.
6. Preserve human approval gates in hosted UI.

### Acceptance Criteria

* Local and hosted workdays produce compatible records.
* Hosted mode can run manager/worker without local-only assumptions.
* Hosted mutation respects repository/provider grants.
* UI does not care whether work happened locally or remotely.

---

## Testing Plan

### Unit Tests

Add or extend tests for:

```text
agent spec loading from top-level Market content
codebase scanner
context pack builders
source map validation
knowledge draft validation
optimization report validation
approval request creation
approval decision state transitions
path policy enforcement
workday task seeding idempotency
```

### Integration Tests

Add tests for:

```text
start local docs automation workday
seed startup tasks
run planner -> researcher -> generator -> optimizer
create approval request
approve request
apply docs mutation
run verification
write workday report
surface artifacts through API state collector
```

### UI Tests

Add tests for:

```text
Workday detail renders operational phases
Generated Knowledge Review table renders artifacts
Approval modal records decision
Governance queue shows review items
Work shows workday request context
Codex readiness card shows warnings
```

### E2E Dogfood Test

Create a test like:

```text
market-docs-automation-governance.test.ts
```

Flow:

1. create temporary Market-like repo;
2. seed top-level agent definitions;
3. run docs automation workday;
4. generate at least one research note;
5. generate at least one knowledge draft;
6. create approval request;
7. approve it;
8. apply docs mutation to allowed path;
9. verify changed paths;
10. ensure forbidden path mutation fails;
11. write workday report.

---

## First PR Sequence

### PR 1: Top-Level Market Agent Definitions

* Add documentation automation agent pages.
* Validate frontmatter.
* Ensure specs load.
* Render agent pages.

### PR 2: Docs Automation Workday Config

* Add docs automation policy config.
* Add provider-owned docs automation controls.
* Start/resume local workday.
* Seed startup tasks idempotently.

### PR 3: Codebase Scanner and Context Packs

* Add scanner.
* Add package/module/flow packs.
* Add source-map pack shape.
* Add tests.

### PR 4: Research Workday Code Context

* Extend research tasks to use code-aware packs.
* Seed TreeSeed platform documentation questions.
* Persist research artifacts.

### PR 5: Knowledge Draft and Optimization Completion

* Normalize required draft frontmatter/body.
* Persist drafts and optimization reports.
* Create promotion request artifacts.

### PR 6: Governance Approval API

* Add approval list/detail/decision endpoints.
* Add state transition tests.
* Add governance summary item creation.

### PR 7: Docs Mutation from Approval

* Convert approved promotion to docs mutation task.
* Apply deterministic draft promotion.
* Reuse Codex docs mutation lifecycle for complex edits.
* Enforce path safety.
* Run verification.

### PR 8: Operational App Governance

* Extend Work and Knowledge views.
* Add generated artifact review table.
* Add approval modal.
* Add workday timeline.
* Add readiness card.

### PR 9: Workday Reporting

* Generate workday reports.
* Update operational summaries.
* Add governance summary.

### PR 10: Background Hardening

* Add lease recovery.
* Add idempotency improvements.
* Add capacity limits.
* Add pause/resume.
* Add stale task recovery UI.

---

## Initial Content Backlog for Agents

The first documentation workday should generate or improve knowledge for these topics.

### Agent Runtime

```text
Agent kernel and handler execution
Agent registry and spec loading
Task lifecycle
Message contracts
Research/knowledge task kinds
Worker loop
Workday manager
Runtime readiness
Capacity and scheduling
```

### Documentation Automation

```text
Research-to-knowledge pipeline
Knowledge draft contract
Optimization report scoring
Promotion request governance
Codex docs mutation lifecycle
Worktree path safety
Verification and repair tasks
```

### CLI

```text
trsd dev
trsd capacity
workspace commands
save/stage/close/release lifecycle
operations parser and registry
```

### SDK

```text
AgentSdk local runtime
Graph build/query/ranking
Context query contracts
Operation tools
Workflow state
Stores, Treeseed PostgreSQL contracts, and static-hub D1 form storage
```

### Core

```text
Knowledge Hub content model
Books and exports
Published content runtime
Astro route model
Forms runtime
Cache strategy
Cloudflare deployment
```

### Operational App

```text
Work objectives view
Work decision view
Work queue
Approval flow
Capacity provider views
Knowledge output view
Capacity policies
Resources and imports
```

---

## Risks and Constraints

### Risk: Agents Write Plausible But Unsupported Docs

Mitigation:

* require source maps;
* require confidence labels;
* require reviewer check;
* require human approval for canonical promotion.

### Risk: Agents Mutate Code While Doing Docs Work

Mitigation:

* strict allowed/forbidden paths;
* separate docs and implementation task classes;
* fail mutation if changed paths violate policy.

### Risk: Background Loop Runs Away

Mitigation:

* daily credit budgets;
* max queued tasks;
* max drafts per workday;
* manual approval gates;
* manager lease and idempotency keys.

### Risk: UI Shows Too Much Raw Agent Noise

Mitigation:

* separate timeline, artifacts, approvals, and governance summary;
* summarize in operational snapshots;
* keep raw events behind expandable details.

### Risk: Local and Hosted Paths Diverge

Mitigation:

* use same workday/task contracts;
* keep adapters environment-specific;
* test local first, hosted second.

### Risk: Documentation Taxonomy Becomes Incoherent

Mitigation:

* planner owns taxonomy proposals;
* reviewer checks book/section fit;
* taxonomy changes require approval;
* decisions record accepted structure.

---

## Recommended Initial Defaults

```yaml
docsAutomation:
  enabled: true
  mode: governed
  approvalPolicy: manual
  mutationProvider: local_branch
  executionProvider: codex
  researchProvider: project_graph
  verificationProvider: local
  maxResearchTasksPerWorkday: 8
  maxDraftsPerWorkday: 5
  maxMutationsPerWorkday: 2
  requireSourceMap: true
  requireHumanApprovalForCanonicalKnowledge: true
  requireHumanApprovalForRelease: true
  allowedWritePaths:
    - docs/**
    - src/content/knowledge/**
    - src/content/notes/**
    - src/content/questions/**
    - src/content/objectives/**
    - src/content/proposals/**
    - src/content/decisions/**
    - src/content/agents/**
    - src/content/workdays/**
    - packages/*/README.md
  forbiddenWritePaths:
    - .env*
    - '**/.env*'
    - '**/.git/**'
    - '**/node_modules/**'
    - .treeseed/worktrees/**
    - .treeseed/exports/**
    - packages/*/src/**
    - src/lib/**
    - src/pages/api/**
    - packages/sdk/drizzle/**
```

---

## Final Target Experience

A contributor runs:

```bash
trsd dev start --web-runtime local
```

Then, when provider execution is part of the scenario:

```bash
trsd capacity up --execute --json
```

Then TreeSeed:

1. starts a governed documentation workday;
2. loads the Market documentation agents;
3. scans TreeSeed code and existing docs;
4. identifies documentation gaps;
5. researches code-backed questions;
6. generates draft knowledge;
7. scores and optimizes the drafts;
8. opens approval requests;
9. shows pending governance items in the operational app;
10. lets a human approve or request changes;
11. applies approved docs mutations in a safe worktree;
12. runs verification;
13. stages successful changes;
14. writes a workday report;
15. leaves the system ready for the next background workday.

At that point, TreeSeed is dogfooding its core promise: a knowledge coop where open knowledge and capabilities are continuously analyzed, remixed, governed, and improved by agents that remain accountable to human review and project policy.
