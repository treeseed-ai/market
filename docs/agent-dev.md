| Change type                                                                                  | Required verification                                                       |     |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --- |
| Operations tool contract                                                                     | `cd packages/sdk && npm test` plus `cd packages/agent && npm run test:unit` |     |
| Operations lifecycle in handlers                                                             | `cd packages/agent && npm run test:unit && npm run test:smoke`              | --- |
| title: TreeSeed Agent Research, Knowledge Generation, and Codex Provider Implementation Plan |                                                                             |     |
| status: implementation-complete; verification harnesses and UI operations implemented         |                                                                             |     |
| created: 2026-05-13                                                                          |                                                                             |     |
| scope:                                                                                       |                                                                             |     |

* treeseed/market
* packages/agent
* packages/sdk
* packages/core integration seams
* market web/API supervision UI
  primary_goal: Enable TreeSeed agents to research, generate, optimize, and publish TreeSeed book-based knowledge while the backend agent processing platform runs locally and through the API/web UI.
  secondary_goal: Add a Codex subscription-backed execution provider using the Codex TypeScript SDK, with ChatGPT Pro used as the example entitlement tier.
  mutation_policy: documentation-first, agent-writable canonical files through feature/staging branches, human-gated production release

---

# TreeSeed Agent Research, Knowledge Generation, and Codex Provider Implementation Plan

## 1. Purpose

This plan describes how to make TreeSeed’s top-level `market` project dogfood its own agent processing platform.

The immediate goal is to get the **research and knowledge generation loop** working well enough that TreeSeed agents can begin writing TreeSeed book-based knowledge about the platform itself.

The longer goal is that, after this plan is complete, the TreeSeed top-level market will have:

* agents that can research the TreeSeed repo and knowledge graph;
* agents that can generate draft TreeSeed book knowledge;
* an optimization loop for improving generated knowledge;
* a backend agent processing runtime that works through the API;
* a web UI where humans can supervise workdays, approvals, research outputs, knowledge drafts, and verification;
* a Codex subscription-backed execution provider implemented with the Codex TypeScript SDK rather than shelling out to the Codex CLI;
* a safe path for agents to eventually alter the agent processing platform itself under structured human supervision.

The core loop should become:

```text
human objective
  -> planner prioritizes research questions
  -> researcher builds context packs and evidence notes
  -> knowledge generator writes TreeSeed book-based knowledge changes in a feature worktree/branch
  -> optimizer/reviewer improves structure, citations, links, and usefulness
  -> architect drafts implementation proposals where needed
  -> engineer uses Codex provider for branch-scoped documentation/code work
  -> reviewer verifies outputs
  -> verified feature branch may merge automatically into staging
  -> human gates production release by approving release from staging
  -> workday report records what changed, what reached staging, what is pending release, and what should happen next
```

The first production-quality success condition is not autonomous code writing. It is this:

> TreeSeed agents can use TreeSeed’s own project graph and content model to produce useful, reviewable, book-based knowledge about TreeSeed.

---

## 2. Non-goals

This plan does not authorize autonomous production release. Agents may write canonical files and merge verified feature branches into staging when the relevant operation grants, branch policy, and verification requirements are satisfied.

It does not make agents approve decisions.

It does not replace human maintainers.

It does not start with a hosted production capacity provider.

It does not require Codex CLI invocation from TreeSeed code. The implementation must call the Codex TypeScript SDK from server-side TypeScript. If the SDK internally coordinates with local Codex components, TreeSeed still treats the SDK as the integration boundary.

It does not assume the first version can generate perfect public documentation. Draft quality, traceability, reviewability, and repeatability matter more than polish.

---

## 3. Architectural target

### 3.0 Operations command layer

TreeSeed operations commands are not incidental developer conveniences. They are the deterministic tool layer that gives agents reliable software and content update capabilities.

The agent execution process must integrate tightly with SDK operations commands such as:

```text
switch
  prepare or change the active project/worktree/session context before work begins

dev
  start or inspect local web/API/processing runtimes before and during verification

save
  persist a coherent local change snapshot with generated metadata

stage
  prepare a reviewed set of changed files for verification, review, or release

close
  close a work item, workday, proposal loop, or implementation session with a structured summary

release
  create or prepare the release-ready artifact after human approval and verification
```

These commands should be available through the SDK operations layer, but **state-changing operations should be handler-controlled by default** rather than freely callable by the AI model. The agent handler owns the deterministic lifecycle. The AI provider owns reasoning, patch generation, and suggested verification. The git worktree owns isolation. Operations commands own reliable state transitions.

The purpose is to let agents reliably generate software and content updates while staying inside TreeSeed’s workflow model:

```text
approved work package
  -> handler switches/creates isolated agent worktree
  -> handler runs dev/readiness check when needed
  -> agent researches and edits only inside its assigned worktree
  -> agent may run or request verification inside that worktree
  -> handler runs canonical verification deterministically
  -> if verification passes, handler saves coherent changes
  -> handler stages only approved paths
  -> handler attempts deterministic merge into staging
  -> if staging merge succeeds, handler closes task as staged
  -> if verification or merge fails, handler saves failure context and creates retry/repair input
  -> release from staging to production only after human approval
```

The operations command layer should be implemented in two complementary ways:

1. **Handler-controlled deterministic steps**: handlers run mandatory operations before and after AI work. For example, the engineer handler creates/switches to an isolated worktree before mutation, runs canonical verification after mutation, saves a coherent snapshot only after useful work, stages approved paths only after verification passes, attempts the feature-to-staging merge, and closes the task with structured results.
2. **Assignable read/verify tools**: agents may be granted safe tools such as readiness checks, status checks, local verification, and save requests inside their own worktree. These tools must still be mediated by the handler or operation adapter.

State-changing shared-repository operations are not model-directed by default. Agents do not directly stage shared branches, merge to staging, close workdays, or release. Handlers do those things deterministically and record every operation in task events and workday reports.

### 3.1 Runtime layers

TreeSeed should run the agent research/knowledge system through these layers:

```text
TreeSeed operational app
  -> API / v1 routes
  -> @treeseed/agent API routes
  -> manager/workday control plane
  -> task queue/state stores
  -> worker runner
  -> AgentKernel
  -> planner/researcher/knowledge/optimizer/reviewer handlers
  -> provider adapters
  -> SDK graph/content/stores
  -> content artifacts and workday reports
```

### 3.2 Research and knowledge flow

```text
Objective
  -> Questions
  -> Planner priority snapshot
  -> Research task
  -> Context query
  -> Context pack
  -> Evidence note
  -> Knowledge draft or canonical content change in feature worktree
  -> Knowledge optimization pass
  -> Review and verification
  -> Automatic merge to staging when checks pass
  -> Human-approved release from staging to production
```

The important gate is **release**, not every write to a canonical content file. Because TreeSeed uses git worktrees, `switch`, feature branches, and staging, agents should be allowed to write canonical book files in isolated feature branches and merge verified changes into staging automatically. Humans should gate the release operation that promotes staging into production.

### 3.3 Codex provider flow

```text
Approved work package
  -> worker claims task
  -> AgentKernel invokes engineer/implementation handler
  -> handler creates/switches to isolated feature worktree
  -> handler may run dev/readiness checks
  -> execution adapter selects codex provider
  -> provider starts/resumes Codex SDK thread with worktree as writable scope
  -> Codex produces plan, patch, or implementation output
  -> mutation adapter applies changes only inside the assigned worktree
  -> agent may run/request flexible verification inside the worktree
  -> verification adapter runs canonical package/content checks deterministically
  -> if verification passes, handler saves coherent snapshot
  -> handler stages only approved changed paths
  -> handler attempts deterministic merge into staging
  -> reviewer validates scope, evidence, staged files, operation events, and verification
  -> handler closes task/workday with staged or failed result
  -> if verification or staging merge fails, handler creates structured retry/repair context
  -> release operation from staging to production remains human-approved
  -> task/workday report records result, staging status, merge failures, and release readiness
```

---

## 4. Package boundaries

### 4.1 `packages/agent`

Owns:

* agent runtime contracts;
* handler lifecycle;
* shared handler context processing for declarative `ctx` queries loaded from agent/content definitions;
* provider registry;
* Codex execution provider adapter;
* research/knowledge generation handlers;
* workday manager and worker integration;
* local dogfood scripts and tests;
* processing API routes;
* task/workday reports;
* runtime safety policy.

### 4.2 `packages/sdk`

Owns:

* declarative context query contracts that can be embedded in YAML/MD/MDX content definitions;
* operations command contracts and dispatch surfaces for `switch`, `dev`, `save`, `stage`, `close`, and `release`;
* operation permission schemas and capability grants;
* deterministic operation result envelopes for agent use;
* graph DSL parsing;
* graph query and context-pack primitives;
* run/task/message/workday stores;
* operational store contracts;
* content/store primitives;
* dispatch contracts;
* capacity provider contracts;
* shared provider-neutral schemas.

### 4.3 `packages/core`

Owns:

* content model rendering;
* book rendering/export surfaces;
* public docs and content UI;
* local integrated web runtime;
* web package verification.

Core must not become the owner of generic agent runtime behavior.

### 4.4 top-level `market`

Owns:

* integrated product web app;
* control app views for Start, Hosts, Projects, Capacity, Work, and Knowledge;
* work objective and decision controls;
* approval request UI;
* generated knowledge/proposal UI;
* control-plane composition;
* dogfooding the top-level TreeSeed platform.

---

## 5. First-class artifacts

The system should treat every major agent output as a structured artifact.

### 5.1 Research question

```yaml
id: question:agent-runtime-research-loop
kind: question
title: How should TreeSeed agents research the platform before generating book knowledge?
state: open
priority: 90
related_objectives:
  - objective:tree-seed-agent-self-development
expected_outputs:
  - research_note
  - knowledge_draft
  - proposal
```

### 5.2 Research note

```yaml
id: research:agent-runtime-research-loop-v1
kind: research_note
question_id: question:agent-runtime-research-loop
state: draft
context_queries:
  - id: runtime-research-loop
    purpose: research
    query: agent runtime research knowledge generation
    scope: /knowledge
    relations:
      - related
      - references
    depth: 2
    budget: 6000
    format: full
source_refs:
  - packages/agent/src/agents/kernel/agent-kernel.ts
  - packages/agent/src/services/worker.ts
  - packages/sdk/src/graph/dsl.ts
observed_facts: []
inferences: []
uncertainties: []
recommended_next_artifacts:
  - knowledge:agent-runtime/research-loop
```

### 5.3 Knowledge draft

```yaml
id: knowledge:agent-runtime/research-loop
kind: knowledge_article
book: architecture
section: runtime
state: draft
source_question_id: question:agent-runtime-research-loop
source_research_ids:
  - research:agent-runtime-research-loop-v1
review_state: pending_review | verified_for_staging | staged | release_pending_human_approval
optimization_passes:
  - structure
  - evidence
  - links
  - usefulness_for_future_agents
```

### 5.4 Work package

```yaml
id: task:write-agent-runtime-research-loop-knowledge
kind: knowledge_generation
agent_role: knowledge_generator
state: queued
human_gate: none_for_draft
allowed_outputs:
  - research_note
  - knowledge_draft
forbidden_outputs:
  - code_patch
  - production_release
operations:
  allowed: []
  deterministic_steps: []
verification:
  - content schema validation
  - link validation
  - review metadata validation
```

Implementation work packages should include an explicit operations capability block:

```yaml
id: task:implement-codex-provider-skeleton
kind: implementation
agent_role: engineer
human_gate: release_only; feature_branch_mutation_and_staging_allowed_by_policy
operations:
  handler_controlled:
    - switch
    - save
    - stage
    - close
    - merge_to_staging
  agent_visible:
    - dev:readiness
    - verify
    - save_request
  forbidden:
    - release
  deterministic_steps:
    before_mutation:
      - switch:create_or_resume_isolated_worktree
      - dev:readiness
    during_mutation:
      - agent_edits_only_assigned_worktree
      - agent_may_run_flexible_verification
    after_mutation:
      - canonical_verification
    after_verification_passes:
      - save:verified_snapshot
      - stage:approved_paths_only
      - merge_to_staging
      - close:staged
    after_verification_fails:
      - save:failure_snapshot
      - close:failed_or_retry_waiting
    after_staging_merge_fails:
      - save:merge_failure_snapshot
      - create_repair_task
      - close:merge_failed
  auto_merge_to_staging_when_verified: true
  release_requires_human_approval: true
allowed_paths:
  - packages/agent/src/agents/adapters/execution-codex.ts
  - packages/agent/test/agents/codex-provider.test.ts
forbidden_paths:
  - packages/sdk/src/operations/**
  - packages/agent/src/services/worker.ts
verification:
  - cd packages/agent && npm run test:unit
  - cd packages/agent && npm run test:smoke
```

The operations block is part of the task contract. If the handler lacks the required operation grant, the task must return `waiting` with `reason: operation_permission_required`. If the AI model asks to run a state-changing operation directly, the handler should ignore the direct request and either perform the deterministic operation at the appropriate lifecycle step or return `waiting` if policy does not allow it.

### 5.5 Approval request

```yaml
id: approval:promote-knowledge-agent-runtime-research-loop
kind: promote_knowledge_draft
state: pending
title: Promote agent runtime research loop knowledge draft
options:
  - approve_as_book_content
  - request_more_research
  - reject
  - split_into_smaller_articles
```

---

## 6. Human supervision model

### 6.1 Human-only decisions

Humans must approve:

* use of `release` by any agent-controlled workflow;
* production release from staging;
* operation grants that can affect production deployment or release state;
* objectives that steer major workday direction;
* capacity/credit budget increases beyond policy.

Humans do **not** need to approve every canonical file write. Agent-written canonical content and code changes should happen in isolated git worktrees and feature branches, then flow into staging automatically when policy, verification, review, and path checks pass.

Humans also do **not** need to approve every feature-branch-to-staging merge. Verified feature branches may merge into staging automatically when:

* the task has the required operation grants;
* changes are scoped to allowed paths;
* tests and content validation pass;
* reviewer policy passes;
* the work package allows automatic staging;
* no release operation is attempted.

### 6.2 Agent-allowed actions before approval

Agents may:

* run read-only operations such as `dev --plan`, runtime readiness checks, status checks, and operation dry-runs when granted by policy;
* inspect repository files through approved context retrieval;
* build context packs;
* create or reprioritize questions;
* create research notes;
* draft knowledge;
* propose book placement;
* propose implementation tasks;
* ask for clarification;
* produce workday summaries.

### 6.3 Agent actions requiring approval

Agents may only do these after an explicit human decision record exists:

* run `release` or any operation that promotes staging into production;
* exceed configured capacity/credit budgets;
* change production deployment configuration;
* modify protected release policy;
* access credentials or secrets outside the granted runtime.

Handlers may perform these without per-change human approval when granted by role, work package, and branch policy:

* run state-changing `switch`, `save`, `stage`, and `close` operations in feature/staging workflows;
* create feature branches or worktrees;
* write canonical content files inside feature branches through the assigned worktree;
* apply approved-scope patches;
* call Codex for implementation tasks;
* merge verified feature branches into staging;
* run verification required by the work package;
* change processing runtime, SDK, or market files within an allowed path set and staging policy.

Agents may directly edit and test only inside their assigned isolated worktree. The handler performs shared-state operations such as staging, merging to staging, closing, and release checks.

The release boundary is the hard human gate.

---

## 7. Agent role design

### 7.0 Operations capabilities by role

Operations commands should be assignable to agents as explicit capabilities.

Recommended first policy:

| Agent role          | Allowed operations                                                                                                               | Notes                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Planner             | `dev:plan`, status/readiness only                                                                                                | Can inspect runtime and propose work, but cannot mutate.                                                                         |
| Researcher          | read-only context/status operations                                                                                              | No repository mutation.                                                                                                          |
| Knowledge generator | assigned worktree write, flexible verify/save request                                                                            | May write TreeSeed book files directly in its feature worktree; handler saves/stages/merges when verified.                       |
| Knowledge optimizer | assigned worktree update, flexible verify/save request                                                                           | May improve canonical book changes in its feature worktree; handler prepares staging.                                            |
| Architect           | `dev:plan`, status/readiness, proposal artifact writes                                                                           | Produces proposals and operation requirements.                                                                                   |
| Engineer            | assigned worktree write, flexible verify/save request; handler controls `switch`, `save`, `stage`, `close`, and merge-to-staging | Mutates only approved paths inside the assigned worktree; handler records operations and may merge verified branches to staging. |
| Reviewer            | verification/status, staging-readiness check                                                                                     | Checks staged files, verification results, operation events, and automatic staging eligibility.                                  |
| Releaser            | release-readiness summary; handler controls `release` after human approval                                                       | Promotes staging to production only after human release approval; does not self-approve.                                         |

Each operation invocation should be recorded in task events:

```yaml
operation_event:
  operation: stage
  mode: deterministic_handler_step
  agent_role: engineer
  task_id: task:implement-codex-provider-skeleton
  permission_grant_id: grant:engineer-stage-local-docs
  input_summary:
    allowed_paths:
      - packages/agent/src/agents/adapters/execution-codex.ts
  result:
    status: completed
    changed_paths:
      - packages/agent/src/agents/adapters/execution-codex.ts
  created_at: 2026-05-13T00:00:00-04:00
```

### 7.1 Planner

Purpose: select the highest-value questions and objectives for the workday.

Inputs:

* active objectives;
* open questions;
* recent workday reports;
* previous research notes;
* pending approval requests;
* runtime readiness summary.

Outputs:

* priority snapshot;
* planned work package list;
* dependency notes;
* questions that block action.

Acceptance:

```text
The planner can explain why a research/knowledge task should happen next.
```

### 7.2 Researcher

Purpose: collect evidence and answer questions with traceable context.

Inputs:

* work package;
* priority question;
* `ctx` query;
* context pack;
* relevant files and content nodes.

Outputs:

* research note;
* observed facts;
* inferences;
* source references;
* unresolved uncertainties;
* recommended knowledge drafts.

Acceptance:

```text
The research note distinguishes evidence from inference and records the context query used.
```

### 7.3 Knowledge generator

Purpose: convert research into durable TreeSeed book-based knowledge.

Inputs:

* research note;
* target book and section;
* current book index;
* related content;
* style guide.

Outputs:

* knowledge draft;
* book placement metadata;
* related links;
* glossary terms;
* future-agent summary.

Acceptance:

```text
The draft can be reviewed as TreeSeed book content and is useful to future agents.
```

### 7.4 Knowledge optimizer

Purpose: improve generated knowledge before human review.

Inputs:

* knowledge draft;
* source research;
* book structure;
* review checklist;
* target audience.

Optimization passes:

1. structure;
2. factual grounding;
3. links and cross-references;
4. future-agent usefulness;
5. concision and clarity;
6. book fit;
7. human decision readiness.

Outputs:

* optimized draft;
* optimization report;
* remaining issues;
* promotion recommendation.

Acceptance:

```text
The optimizer makes the draft easier to review and safer to promote.
```

### 7.5 Architect

Purpose: turn knowledge into implementation proposals when runtime changes are needed.

Inputs:

* optimized knowledge;
* unresolved gaps;
* runtime map;
* package boundaries.

Outputs:

* proposal draft;
* implementation scope;
* allowed paths;
* forbidden paths;
* verification matrix;
* risks and tradeoffs.

Acceptance:

```text
A human can approve, reject, or narrow the proposal without reverse-engineering the task.
```

### 7.6 Engineer

Purpose: implement approved docs/code tasks inside an isolated worktree. The engineer agent may reason, edit, and test in that worktree, but the handler owns `switch`, canonical verification, `save`, `stage`, merge-to-staging, and `close`.

Inputs:

* approved decision;
* allowed mutation scope;
* work package;
* context pack;
* execution provider selection.

Outputs:

* branch-scoped diff from the isolated worktree;
* suggested verification commands and local test results;
* operation events for handler-controlled `switch`, `dev`, `save`, `stage`, merge-to-staging, and `close` when used;
* changed paths;
* canonical verification result;
* task completion, retry, merge-failed, or waiting message.

Deterministic operation sequence for mutation tasks:

```text
1. handler creates or resumes the approved isolated worktree/feature branch
2. handler runs dev/readiness check or confirms runtime assumptions
3. AI provider performs approved mutation only inside the assigned worktree
4. AI may run flexible tests or request verification inside the worktree
5. handler runs canonical verification deterministically
6. if verification passes, handler saves a verified snapshot
7. handler stages only approved changed paths
8. handler attempts deterministic merge into staging
9. if staging merge succeeds, handler closes task as staged
10. if verification fails, handler saves failure snapshot and returns failure context for retry
11. if staging merge fails, handler saves merge-failure snapshot and creates a repair task
12. production release remains human-approved
```

Acceptance:

```text
The engineer never mutates outside the assigned worktree or approved path scope. The handler records operation events, runs canonical verification, stages approved paths only after verification passes, and creates structured retry/repair context on failures.
```

### 7.7 Reviewer

Purpose: verify artifacts and implementation changes.

Inputs:

* task output;
* changed paths;
* source research;
* approved decision;
* verification logs.

Outputs:

* review result;
* findings;
* promotion or rejection recommendation.

Acceptance:

```text
The reviewer catches unsupported claims, scope violations, weak verification, and unclear writing.
```

---

## 8. TreeSeed book-based knowledge model

### 8.1 Target books

Initial TreeSeed-generated knowledge should target these book families:

```text
Research
  - inquiry practices
  - evidence handling
  - research-to-knowledge workflow

Architecture
  - agent runtime
  - processing platform
  - market/control-plane topology
  - package boundaries

Developer
  - local workflow
  - verification loop
  - Codex provider integration
  - dogfood harness

Operations
  - local workdays
  - capacity provider operations
  - capacity and approval gates
  - release checks
```

### 8.2 Canonical-file and staging policy

Generated knowledge may be written directly to canonical TreeSeed book paths when the write happens inside an isolated feature worktree or feature branch.

Recommended canonical target path:

```text
src/content/knowledge/{book}/{section}/{slug}.mdx
```

The safety boundary is not "never write canonical files." The safety boundary is:

```text
feature worktree/branch -> verified automatic merge to staging -> human-approved release to production
```

Handlers may automatically merge verified feature branches into staging when:

* the work package allows automatic staging;
* the AI only changed files inside the assigned worktree;
* the changed paths are allowed;
* content schema validation passes;
* link/book validation passes;
* canonical verification passes;
* reviewer policy passes;
* workday capacity policy allows it;
* no production release is attempted.

If the staging merge fails, the handler must not ask a human to manually resolve it by default. It should capture a structured merge-failure message and create a repair task that gives the AI the conflict context for another deterministic merge attempt.

Optional draft paths may still be useful for exploratory or low-confidence output:

```text
src/content/knowledge-drafts/{book}/{section}/{slug}.mdx
src/content/notes/agent-generated/**
.treeseed/tmp/agent-artifacts/**
```

Use draft paths when research confidence is low or the system is generating exploratory alternatives. Use canonical paths in feature branches when the work package is explicitly about improving TreeSeed book content.

### 8.3 Required frontmatter for generated knowledge

```yaml
title: Local Agent Research and Knowledge Generation Loop
summary: How TreeSeed agents research the platform and turn evidence into book-based knowledge.
status: draft | feature_branch | staged | released
generated_by: treeseed-agent
agent_role: knowledge_generator
source_question: question:agent-runtime-research-loop
source_research:
  - research:agent-runtime-research-loop-v1
review_state: pending_human_review
book_target: architecture
section_target: runtime
confidence: medium
updated: 2026-05-13
related:
  objectives:
    - objective:tree-seed-agent-self-development
  questions:
    - question:agent-runtime-research-loop
  proposals: []
```

### 8.4 Knowledge body structure

Every generated article should follow this structure:

```markdown
# Title

## Why this matters

## What currently exists

## How the loop should work

## Implementation constraints

## Human supervision points

## Open questions

## Recommended next step

## Source map
```

The `Source map` section should list repository paths and content ids, not raw citations pasted from a chat session.

---

## 9. Context retrieval and research optimization

### 9.1 Declarative context query workflow

Context graph queries should be declared in agent/content definitions and integrated by shared handler context processing functionality.

Handlers should not need to hard-code context graph queries. Instead, an agent spec, content entry, work package, objective, question, proposal, or task should be able to declare one or more `ctx` entries in YAML/frontmatter/MD/MDX. The shared handler context processor then normalizes those entries, compiles them into SDK graph queries, runs the SDK graph/context flow, and injects the resulting context packs into the handler input.

The standard runtime flow becomes:

```text
agent/content definition
  -> declarative ctx entries
  -> shared handler context processor
  -> normalize ctx key/value object
  -> compile to graph query
  -> parseGraphDsl or direct query builder
  -> queryGraph
  -> buildContextPack
  -> handler receives named context packs
```

The `ctx` definition should not need to be a coded query string. It is primarily natural-language key/value metadata, which fits YAML and Markdown frontmatter well.

Preferred YAML shape:

```yaml
context:
  queries:
    - id: runtime-research-loop
      purpose: research
      query: agent runtime research knowledge generation
      scope: /knowledge
      relations:
        - related
        - references
      depth: 2
      budget: 6000
      format: full
```

Equivalent compact string form should remain supported for humans and debugging:

```text
ctx "agent runtime research knowledge generation" for research in /knowledge via related,references depth 2 budget 6000 as full
```

The shared processor is responsible for converting the YAML form into the canonical graph query. The handler should request context by id, purpose, or default role context rather than constructing query strings inline.

### 9.2 Context query templates

These templates should be stored as reusable YAML/frontmatter snippets in agent or content definitions, not copied as hard-coded handler strings.

#### Runtime architecture

```yaml
context:
  queries:
    - id: runtime-architecture
      purpose: research
      query: agent runtime manager worker AgentKernel providers workday
      scope: /knowledge
      relations: [related, references]
      depth: 2
      budget: 8000
      format: full
```

#### Book knowledge generation

```yaml
context:
  queries:
    - id: book-knowledge-generation
      purpose: research
      query: TreeSeed books knowledge content model research notes questions objectives
      scope: /knowledge
      relations: [related, references]
      depth: 2
      budget: 7000
      format: full
```

#### Codex provider implementation

```yaml
context:
  queries:
    - id: codex-provider-implementation
      purpose: implement
      query: execution provider adapters Codex TypeScript SDK local branch mutation verification
      scope: /knowledge
      relations: [related, references]
      depth: 2
      budget: 8000
      format: full
```

#### Market supervision UI

```yaml
context:
  queries:
    - id: market-supervision-ui
      purpose: design
      query: market operational governance workday approvals generated knowledge UI
      scope: /knowledge
      relations: [related, references]
      depth: 2
      budget: 8000
      format: full
```

### 9.3 Shared handler context processor

Add a shared context processor that all agent handlers can use.

Recommended location:

```text
packages/agent/src/agents/context/context-processor.ts
```

Recommended SDK contract location:

```text
packages/sdk/src/graph/context-query-contracts.ts
```

Recommended contract:

```ts
export interface DeclarativeContextQuery {
  id: string;
  purpose: 'plan' | 'research' | 'generate' | 'optimize' | 'implement' | 'review' | 'release' | string;
  query: string;
  scope?: string;
  relations?: string[];
  depth?: number;
  budget?: number;
  format?: 'summary' | 'full' | 'sources' | string;
  filters?: Record<string, unknown>;
  required?: boolean;
}

export interface ResolvedHandlerContextPack {
  id: string;
  purpose: string;
  source: 'agent_spec' | 'content_frontmatter' | 'work_package' | 'task_payload' | 'default_role_context';
  query: DeclarativeContextQuery;
  pack: unknown;
  warnings: string[];
}
```

Processor responsibilities:

* collect `context.queries` from the agent spec;
* collect `context.queries` from relevant content frontmatter;
* collect task/work-package context queries;
* merge duplicate ids deterministically;
* apply role defaults when no explicit query exists;
* validate budget/depth limits;
* compile YAML key/value context into canonical graph queries;
* run SDK graph/context calls;
* inject named context packs into handler input;
* record context ids and source metadata in task events, research notes, and workday reports.

Handlers should consume resolved context packs like this:

```ts
const runtimeContext = ctx.contextPacks.get('runtime-architecture');
const implementationContext = ctx.contextPacks.byPurpose('implement');
```

They should not build context query strings inline unless they are implementing the shared context processor itself.

### 9.4 Research note quality rubric

A research note is acceptable when it includes:

* question id;
* context query ids and declarative context definitions used;
* context pack summary;
* source paths inspected;
* source of each context query, such as agent spec, content frontmatter, work package, task payload, or role default;
* observed facts;
* inferences;
* uncertainty;
* recommended knowledge artifacts;
* recommended implementation proposal, if needed.

A research note is not acceptable when it:

* makes claims without source paths;
* confuses desired architecture with current implementation;
* recommends code mutation before a proposal exists;
* omits uncertainty;
* cannot be consumed by the knowledge generator.

### 9.5 Knowledge optimization scoring

Each generated knowledge draft should receive an optimization score:

```yaml
score:
  factual_grounding: 0-5
  book_fit: 0-5
  structure: 0-5
  future_agent_usefulness: 0-5
  human_reviewability: 0-5
  link_quality: 0-5
  uncertainty_visibility: 0-5
```

Promotion threshold:

```yaml
minimum_total: 26
minimum_each:
  factual_grounding: 4
  human_reviewability: 4
  uncertainty_visibility: 4
```

Drafts below threshold should remain draft and produce a `request_more_research` or `optimize_again` task.

---

## 10. Codex subscription AI provider

## 10.1 Provider purpose

Implement a new execution provider that lets approved TreeSeed agent tasks call Codex through the Codex TypeScript SDK.

The provider should be used for:

* implementation planning;
* docs patch proposals;
* worktree-scoped documentation edits;
* worktree-scoped code edits after approval;
* test and verification repair loops;
* staging merge repair loops;
* review assistance.

It should not be used for:

* production release without human approval;
* automatic staging merge when verification or policy gates fail;
* production secret access;
* bypassing TreeSeed task/workday/capacity tracking;
* replacing the planner/researcher/knowledge generator for content synthesis unless explicitly selected.

## 10.2 Provider naming

Recommended provider id:

```text
codex
```

Provider family:

```text
execution
```

Example entitlement profile:

```yaml
provider_id: codex
provider_label: Codex
subscription_plan_example: chatgpt_pro
auth_mode: local_codex_auth_json_or_api_key
sdk_package: '@openai/codex-sdk'
execution_class: coding_agent
mutation_requires_approval: true
```

Do not hard-code `Pro` as the only plan. Use Pro as the example profile and design the provider so `plus`, `pro`, `business`, `edu`, and `enterprise` style profiles can be represented later.

## 10.3 Important SDK boundary

TreeSeed code must import and use the SDK:

```ts
import { Codex } from '@openai/codex-sdk';
```

TreeSeed code must not shell out to:

```bash
codex exec ...
codex ...
npx codex ...
```

If the SDK internally manages a local Codex process, that is an SDK implementation detail. TreeSeed’s adapter boundary remains TypeScript SDK calls.

## 10.4 Proposed adapter file

```text
packages/agent/src/agents/adapters/execution-codex.ts
```

Alternative if adapter files are consolidated:

```text
packages/agent/src/agents/adapters/execution.ts
```

## 10.5 Execution provider interface

The provider should fit the existing execution adapter shape. If the current execution provider contract is too narrow, extend it carefully with provider-neutral fields.

Recommended execution request shape:

```ts
export interface CodexExecutionRequest {
  taskId: string;
  workDayId?: string;
  agentSlug: string;
  repoRoot: string;
  prompt: string;
  threadId?: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
  sandboxMode: 'read_only' | 'workspace_write';
  approvalPolicy: 'never' | 'on_request' | 'always';
  model?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}
```

Recommended execution result shape:

```ts
export interface CodexExecutionResult {
  provider: 'codex';
  threadId: string;
  status: 'completed' | 'waiting' | 'failed';
  finalResponse?: string;
  summary?: string;
  changedPaths: string[];
  proposedCommands: string[];
  verificationHints: string[];
  rawEventRefs?: string[];
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  usage?: {
    subscriptionPlan?: string;
    estimatedCredits?: number;
    wallMs?: number;
  };
}
```

## 10.6 Minimal SDK implementation sketch

```ts
import { Codex } from '@openai/codex-sdk';

export async function runCodexSubscriptionTask(
  request: CodexExecutionRequest,
): Promise<CodexExecutionResult> {
  assertCodexRequestIsSafe(request);

  const codex = new Codex();
  const thread = request.threadId
    ? codex.resumeThread(request.threadId)
    : codex.startThread();

  const prompt = buildCodexPrompt(request);
  const startedAt = Date.now();

  try {
    const result = await thread.run(prompt);

    return normalizeCodexResult({
      request,
      result,
      wallMs: Date.now() - startedAt,
    });
  } catch (error) {
    return normalizeCodexError({
      request,
      error,
      wallMs: Date.now() - startedAt,
    });
  }
}
```

## 10.7 Codex prompt wrapper

Every Codex call should include a strict TreeSeed wrapper. The wrapper should tell Codex that it may edit and test only inside the assigned worktree, and that the handler controls shared repository operations.

```text
You are operating as a TreeSeed implementation agent.

Goal:
{goal}

Current permission stage:
{permission_stage}

Allowed paths:
{allowed_paths}

Forbidden paths:
{forbidden_paths}

Required behavior:
- Do not modify files outside allowed paths.
- Do not write outside the assigned git worktree.
- Do not stage shared branches.
- Do not merge to staging directly.
- Do not close the task directly.
- Do not approve decisions.
- Do not release.
- Prefer small, reviewable changes.
- Run or suggest verification that is relevant to the change.
- Report uncertainty.
- Record commands you ran or believe should be run.
- If the task requires broader scope, stop and return TASK_WAITING.

Context pack:
{context_pack_summary}

Work package:
{work_package_yaml}
```

## 10.8 Provider configuration

Environment variables:

```bash
TREESEED_EXECUTION_PROVIDER=codex
TREESEED_CODEX_SUBSCRIPTION_PLAN=pro
TREESEED_CODEX_DEFAULT_MODEL=gpt-5.5
TREESEED_CODEX_APPROVAL_POLICY=never
TREESEED_CODEX_SANDBOX_MODE=workspace_write
TREESEED_CODEX_TIMEOUT_MS=900000
TREESEED_CODEX_AUTH_FILE=~/.codex/auth.json
# Optional API-billed fallback:
# CODEX_API_KEY=...
```

For subscription-backed Codex, run Codex login and make sure `~/.codex/auth.json` exists. On a service host, copy that file to a secret-managed location and set `TREESEED_CODEX_AUTH_FILE` when it is not at the default path. Treat `auth.json` like a secret: do not commit it or print it.

For Railway workers, prefer secret bootstrap plus persistent volume storage:
store `TREESEED_CODEX_AUTH_JSON_B64` as a hosted secret, set
`TREESEED_CODEX_AUTH_FILE=/data/codex/auth.json`, and let the package-owned
capacity provider runtime write the file only if missing and set `CODEX_HOME`
for the child Codex process. Use `treeseed config` to store the bootstrap secret
and sync it to the provider host. Do not overwrite the file on every boot; Codex
may refresh `auth.json`, and the refreshed file on `/data` is the source of
truth until an intentional auth rotation.

Use `CODEX_API_KEY` only when API billing is intended. Create or find an API key at `https://platform.openai.com/api-keys`, store it only in the local/hosting secret environment, and never commit or print it. If this is the first API key on the account, OpenAI may require phone verification before key creation.

Configuration object:

```yaml
providers:
  agents:
    execution: codex
  mutation: local_branch
    repository: git
    verification: local
    notification: sdk_message
    research: project_graph
codex:
  subscriptionPlan: pro
  defaultModel: gpt-5.5
  approvalPolicy: never
  sandboxMode: workspace_write
  requireDecisionForProductionRelease: true
  allowFeatureBranchMutation: true
  allowAutomaticStagingMerge: true
  requireAllowedPaths: true
  recordThreadIds: true
```

## 10.9 Auth and subscription handling

First implementation stance:

* assume Codex local authentication is configured outside TreeSeed;
* TreeSeed detects readiness and reports missing auth clearly;
* TreeSeed records the selected subscription profile for capacity/reporting;
* TreeSeed does not store ChatGPT account credentials;
* TreeSeed does not impersonate a human user silently.

Provider readiness check:

```ts
export interface CodexProviderReadiness {
  ok: boolean;
  sdkInstalled: boolean;
  nodeVersionOk: boolean;
  authDetected: boolean;
  subscriptionPlan?: 'plus' | 'pro' | 'business' | 'edu' | 'enterprise' | 'unknown';
  warnings: string[];
  blockingIssues: string[];
}
```

## 10.10 Capacity and usage accounting

Treat subscription-backed Codex use as a capacity lane:

```yaml
capacity_provider:
  kind: codex
  billing_scope: user_or_team_subscription_or_api_key
  plan: pro
  unit: codex_capacity_unit
  daily_credit_budget: configurable
  max_concurrent_workers: 1
  overrun_policy: pause_for_approval
```

Track:

* task id;
* workday id;
* provider id;
* subscription plan label;
* thread id;
* wall time;
* estimated credits;
* changed files;
* verification commands;
* approval requests.

Do not pretend subscription usage maps perfectly to API token usage. Use a provider-specific ledger field until exact usage telemetry is available.

---

## 11. Backend processing runtime requirements

### 11.0 Operations tool runtime

The backend processing runtime must expose SDK operations commands to agents through a controlled operation adapter.

Recommended adapter:

```text
packages/agent/src/agents/adapters/operations.ts
```

Recommended worktree manager:

```text
packages/agent/src/services/agent-worktrees.ts
```

The worktree manager should create, resume, inspect, verify, save, stage, merge, and clean up isolated agent worktrees without exposing shared repository mutation directly to the model.

Recommended SDK contract location:

```text
packages/sdk/src/operations/agent-tools.ts
```

Provider-neutral operation request:

```ts
export interface AgentOperationRequest {
  operation: 'switch' | 'dev' | 'verify' | 'save' | 'stage' | 'merge_to_staging' | 'close' | 'release';
  mode: 'dry_run' | 'read_only' | 'mutating';
  taskId: string;
  workDayId?: string;
  agentSlug: string;
  agentRole: string;
  projectId: string;
  environment: string;
  repoRoot: string;
  worktreeRoot?: string;
  featureBranch?: string;
  stagingBranch?: string;
  approvalId?: string;
  permissionGrantId?: string;
  input: Record<string, unknown>;
}
```

Provider-neutral operation result:

```ts
export interface AgentOperationResult {
  operation: AgentOperationRequest['operation'];
  status: 'completed' | 'waiting' | 'failed' | 'skipped' | 'retry_created';
  summary: string;
  changedPaths: string[];
  stagedPaths: string[];
  mergedToStaging?: boolean;
  mergeFailure?: {
    targetBranch: string;
    featureBranch: string;
    conflictedPaths: string[];
    message: string;
    repairTaskId?: string;
  };
  commandsRun: string[];
  artifacts: Array<{
    kind: string;
    ref: string;
  }>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  metadata: Record<string, unknown>;
}
```

Required behavior:

* Operations must be invoked through SDK operation dispatch, not arbitrary shell commands.
* State-changing shared-repository operations must be handler-controlled by default.
* Every operation invocation must check agent role, task kind, environment, approval state, allowed paths, forbidden paths, feature branch, staging branch, and assigned worktree root.
* Every operation result must be written to task events.
* `release` must always require a human-approved release decision.
* Feature-branch-to-staging merges may run automatically when verification and branch policy pass.
* `stage` must refuse files outside the work package’s allowed paths.
* `save` must produce a coherent snapshot summary that can be reviewed later.
* `switch` must create or resume an isolated worktree before mutation.
* `verify` may be run flexibly by the agent in the worktree, but canonical verification is run by the handler.
* `merge_to_staging` must capture conflicts as structured failure context and create a repair task instead of silently failing.
* `close` must summarize what happened and mark any unresolved follow-up decisions.

### 11.1 Workday manager

The manager must be able to:

* start local workdays;
* seed research tasks;
* seed knowledge generation tasks;
* seed optimization tasks;
* respect work policy budgets;
* create approval requests when production release is requested or when mutation exceeds policy;
* summarize workday state.

### 11.2 Worker runner

The worker must be able to:

* enforce operation permissions before invoking operation tools;
* create or resume isolated agent worktrees for mutation tasks;
* restrict AI provider writes to the assigned worktree;
* run deterministic pre/post operation steps defined in the work package;
* claim research/knowledge tasks;
* build task context;
* run `AgentKernel` for agent tasks;
* call the Codex provider for approved implementation tasks;
* record task events;
* write task outputs;
* record changed paths;
* record verification results;
* save verified or failed worktree snapshots;
* stage approved paths only after canonical verification passes;
* merge verified feature branches into staging when branch policy allows it;
* capture staging merge failures as structured repair tasks;
* pause for approval when a production release or policy exception is required.

### 11.3 Agent API

The API should expose:

* operation permissions and grants;
* operation event history;
* operation dry-run/plan results when safe;
* active workday;
* start/request workday;
* task list;
* task detail;
* task events;
* agent runs;
* generated artifacts;
* approval requests;
* provider readiness;
* Codex provider status;
* workday reports.

Recommended API groups:

```text
GET  /v1/projects/:projectId/operations/grants
GET  /v1/projects/:projectId/operations/events
POST /v1/projects/:projectId/operations/:operation/dry-run
GET  /v1/projects/:projectId/agents/status
GET  /v1/projects/:projectId/workdays/current
POST /v1/projects/:projectId/workdays/requests
GET  /v1/projects/:projectId/tasks
GET  /v1/projects/:projectId/tasks/:taskId
GET  /v1/projects/:projectId/agent-artifacts
GET  /v1/projects/:projectId/approvals
POST /v1/projects/:projectId/approvals/:approvalId/decision
GET  /v1/projects/:projectId/providers/codex/readiness
```

### 11.4 Web UI

The TreeSeed app should expose control surfaces for Work, Knowledge, and Capacity with:

* operation grants by agent role;
* recent operation events;
* pending operation approvals;
* staged files, worktree state, save snapshots, and merge failures for implementation tasks;
* current workday state;
* planner/researcher/knowledge/optimizer/reviewer status;
* queue depth;
* active tasks;
* generated research notes;
* generated knowledge drafts;
* optimization scores;
* pending approvals;
* staging status;
* release readiness;
* Codex provider readiness;
* verification status;
* latest workday report.

Recommended sections:

```text
Work
  - Runtime readiness
  - Operations grants
  - Operations event log
  - Save/stage/close snapshots
  - Current workday
  - Active task queue
  - Research notes
  - Knowledge drafts
  - Optimization reports
  - Pending approvals
  - Codex provider
  - Recent reports
```

---

## 12. Local development workflow

### 12.1 Run the full local system

Until a true `--surface all` exists, use two supervised terminals:

```bash
# Terminal 1: web + API integrated runtime
npm run dev -- --reset

# Terminal 2: processing services
npm run dev -- --surface services
```

Then launch a local workday:

```bash
cd packages/agent
npm run dev:workday-start
```

Generate or inspect the workday report:

```bash
cd packages/agent
npm run dev:workday-report
```

### 12.2 Desired future command

Add an explicit full-stack local command:

```bash
npm run dev -- --surface all --reset
```

It should expand to:

```text
web + api + manager + worker + agents
```

If `agents` remains a legacy direct kernel loop, `all` should either:

1. exclude it by default and call the surface `all-task-runtime`; or
2. include it only when `--include-legacy-agent-loop` is present.

Recommended final design:

```text
integrated = web + api
services = api + manager + worker
agent-cycle = legacy/direct AgentKernel runCycle loop
all = web + api + manager + worker
```

---

## 13. Implementation milestones

## Milestone 0A: SDK operations-as-agent-tools contract

Goal: make TreeSeed operations commands available as permissioned agent tools.

Tasks:

* Define provider-neutral operation request/result contracts.
* Add operation capability grants by role/task/environment.
* Add deterministic operation step schema to work packages.
* Add task-event recording for operation invocations.
* Add dry-run/read-only mode for safe inspection.
* Add policy tests for `switch`, `dev`, `save`, `stage`, `close`, and `release`.

Deliverables:

```text
packages/sdk/src/operations/agent-tools.ts
packages/agent/src/agents/adapters/operations.ts
packages/agent/test/agents/operations-tools.test.ts
```

Acceptance:

```text
Agents can be granted specific operations commands as tools, and unauthorized operation calls return waiting/denied instead of executing.
```

## Milestone 0B: Deterministic operations in implementation handlers

Goal: wire operations commands into the mutation lifecycle with handler-controlled shared-state transitions and flexible agent testing/saving inside isolated worktrees.

Tasks:

* Engineer handler creates or resumes an isolated git worktree before mutation.
* Engineer handler gives the AI provider only that worktree as its writable root.
* Engineer handler runs `dev:readiness` or `dev --plan` before mutation when runtime assumptions matter.
* AI provider may run flexible tests or request verification inside the worktree.
* Engineer handler runs canonical verification after mutation.
* Engineer handler runs `save` only for verified snapshots or explicit failure snapshots.
* Engineer handler runs `stage` only for approved changed paths after verification passes.
* Engineer handler attempts deterministic merge into staging when policy allows it.
* Engineer handler captures merge failures and creates repair tasks with structured conflict context.
* Reviewer handler checks staged paths, operation events, merge status, and verification results.
* Handler or workday close path runs `close` with a structured summary.
* Releaser exposes `release` only behind explicit human release approval.

Deliverables:

```text
packages/agent/src/agents/handlers/engineer.ts updates
packages/agent/src/agents/handlers/reviewer.ts updates
packages/agent/src/agents/handlers/releaser.ts updates
packages/agent/test/agents/operations-lifecycle.test.ts
```

Acceptance:

```text
Approved implementation tasks automatically create isolated worktrees, let agents edit/test inside those worktrees, run canonical verification, save verified or failed snapshots, stage approved paths only after verification passes, merge verified branches into staging, create repair tasks for merge failures, and close through SDK operations. Release remains human-approved.
```

## Milestone 0: Runtime readiness inventory

Goal: make the current runtime state inspectable before new behavior is added.

Tasks:

* Add or update a local readiness command for top-level market and `packages/agent`.
* Report web/API/manager/worker availability.
* Report current workday policy.
* Report provider registry.
* Report Codex SDK installation status.
* Report graph/context availability.
* Report writable artifact paths.

Deliverables:

```text
packages/agent/src/services/runtime-readiness.ts
packages/agent/scripts/runtime-readiness.ts
```

Acceptance:

```text
A developer can run one command and know whether research/knowledge dogfooding can start.
```

---

## Milestone 1: Research artifact and declarative context contract

Goal: define durable research-note outputs and declarative context query definitions.

Tasks:

* Add `ResearchNote` contract.
* Add `ResearchSourceRef` contract.
* Add `ContextQueryRef` contract.
* Add `DeclarativeContextQuery` contract for YAML/MD/MDX content definitions.
* Add `ResolvedHandlerContextPack` contract for shared handler context processing.
* Add `ResearchInference` and `ResearchUncertainty` fields.
* Add schema tests.
* Add serialization into task outputs.

Deliverables:

```text
packages/sdk/src/graph/context-query-contracts.ts
packages/agent/src/agents/contracts/research.ts
packages/agent/src/agents/context/context-processor.ts
packages/agent/test/agents/research-contract.test.ts
packages/agent/test/agents/context-processor.test.ts
```

Acceptance:

```text
Researcher output is typed, serializable, linked to questions/objectives, and records the declarative context query ids/sources used by shared handler context processing.
```

---

## Milestone 2: Knowledge draft contract

Goal: define generated book knowledge as a first-class artifact.

Tasks:

* Add `KnowledgeDraft` contract.
* Add book/section target metadata.
* Add generated frontmatter schema.
* Add optimization score schema.
* Add promotion state.
* Add validation tests.

Deliverables:

```text
packages/agent/src/agents/contracts/knowledge.ts
packages/agent/test/agents/knowledge-contract.test.ts
```

Acceptance:

```text
Generated knowledge drafts can be validated before writing to content paths.
```

---

## Milestone 3: Researcher handler upgrade

Goal: make the researcher produce source-backed research notes from declarative context packs.

Tasks:

* Ensure researcher receives a priority question.
* Load `context.queries` from agent/content definitions and work packages.
* Resolve context through shared handler context processing.
* Build context packs through SDK graph workflow.
* Record context query ids, source definitions, and resolved pack metadata.
* Record source paths/nodes inspected.
* Emit typed research note.
* Add test fixture for platform research question.

Deliverables:

```text
packages/agent/src/agents/handlers/researcher.ts or existing researcher handler updates
packages/agent/test/agents/researcher.test.ts
```

Acceptance:

```text
A local researcher run produces a research note about the TreeSeed agent runtime with source metadata and declarative context query provenance.
```

---

## Milestone 4: Knowledge generator handler

Goal: turn research notes into TreeSeed book-based knowledge drafts.

Tasks:

* Add or upgrade knowledge generation handler.
* Select target book/section.
* Generate structured MDX body.
* Apply frontmatter.
* Write draft to safe draft path or task output.
* Emit `knowledge_draft_created` message.

Deliverables:

```text
packages/agent/src/agents/handlers/knowledge-generator.ts
packages/agent/test/agents/knowledge-generator.test.ts
```

Acceptance:

```text
A research note can be converted into a draft TreeSeed book article.
```

---

## Milestone 5: Knowledge optimizer handler

Goal: improve generated knowledge before human review.

Tasks:

* Add optimizer role/spec.
* Score draft using rubric.
* Improve structure and clarity.
* Verify source map is present.
* Suggest related links.
* Emit optimization report.
* Keep draft below promotion threshold if evidence is weak.

Deliverables:

```text
packages/agent/src/agents/handlers/knowledge-optimizer.ts
packages/agent/test/agents/knowledge-optimizer.test.ts
```

Acceptance:

```text
Generated knowledge includes an optimization score and review recommendation.
```

---

## Milestone 6: Local dogfood scenario for TreeSeed book knowledge

Goal: run planner, researcher, knowledge generator, and optimizer against the top-level market platform.

Tasks:

* Seed objective: write TreeSeed book knowledge about the agent processing platform.
* Seed questions about research, workdays, provider architecture, Codex provider, API/UI integration.
* Run planner.
* Run researcher.
* Run knowledge generator.
* Run optimizer.
* Emit summary JSON.
* Assert no code mutation.

Deliverables:

```text
packages/agent/src/agents/testing/market-knowledge-dogfood.ts
packages/agent/scripts/test-market-knowledge-dogfood.ts
packages/agent/test/agents/market-knowledge-dogfood.test.ts
```

Acceptance:

```text
npm run test:market-knowledge-dogfood creates optimized draft knowledge about TreeSeed.
```

---

## Milestone 7: Workday/task orchestration for research and knowledge

Goal: route research and knowledge generation through the manager/worker workday runtime.

Tasks:

* Add task kinds:

  * `research_question`
  * `generate_knowledge_draft`
  * `optimize_knowledge_draft`
  * `promote_knowledge_draft_request`
* Update manager task seeding.
* Update worker task execution mapping.
* Persist task events and outputs.
* Include generated artifacts in workday report.

Deliverables:

```text
packages/agent/src/services/manager.ts updates
packages/agent/src/services/worker.ts updates
packages/agent/src/services/workday-report.ts updates
packages/agent/test/services/research-knowledge-workday.test.ts
```

Acceptance:

```text
A local workday can produce research notes, optimized knowledge drafts, and approval requests.
```

---

## Milestone 8: Codex SDK dependency and provider skeleton

Goal: add the Codex TypeScript SDK integration boundary without using CLI calls.

Tasks:

* Confirm Codex execution tasks receive operations permissions from the work package before any mutation attempt.
* Add `@openai/codex-sdk` dependency to `packages/agent`.
* Add `codex` provider id, with `codex_subscription` accepted as a compatibility alias.
* Add provider config schema.
* Add readiness check.
* Add adapter skeleton.
* Add tests that mock the SDK.
* Add guard that no TreeSeed provider code shells out to `codex`.

Deliverables:

```text
packages/agent/src/agents/adapters/execution-codex.ts
packages/agent/src/agents/adapters/codex-readiness.ts
packages/agent/test/agents/codex-provider.test.ts
```

Acceptance:

```text
Provider can be selected and mocked in tests without invoking the Codex CLI.
```

---

## Milestone 9: Codex execution provider implementation

Goal: allow approved implementation tasks to run through Codex SDK.

Tasks:

* Implement SDK thread start/resume.
* Build strict TreeSeed prompt wrapper.
* Normalize SDK result into execution result.
* Capture thread id.
* Capture summary/final response.
* Capture proposed changed paths if available.
* Require allowed paths for mutation tasks.
* Return waiting state when approval is missing.

Deliverables:

```text
packages/agent/src/agents/adapters/execution-codex.ts
packages/agent/test/agents/codex-provider-execution.test.ts
```

Acceptance:

```text
An approved docs task can call the Codex SDK provider and produce a normalized result.
```

---

## Milestone 10: Worktree-scoped docs mutation through Codex

Goal: let Codex help implement documentation changes safely inside isolated agent worktrees.

Tasks:

* Require operation grants for handler-controlled `switch`, `verify`, `save`, `stage`, `merge_to_staging`, and `close`.
* Require release approval only for production release, not feature-branch mutation.
* Require allowed paths.
* Use isolated git worktree mutation provider.
* Run Codex provider with prompt wrapper and assigned worktree root.
* Apply or capture proposed patch according to mutation adapter design.
* Allow Codex to run flexible tests inside the worktree.
* Run canonical content validation and package verification through the handler.
* Record changed paths.
* Run deterministic operation sequence: `switch/create worktree -> dev/readiness -> Codex execution in worktree -> canonical verify -> save verified snapshot -> stage approved paths -> merge_to_staging -> close`.
* On verification failure, save failure snapshot and retry or close failed with structured context.
* On staging merge failure, create repair task with conflict context.
* Reviewer verifies scope, staged files, operation events, merge status, and verification.

Deliverables:

```text
packages/agent/test/agents/codex-docs-mutation.test.ts
```

Acceptance:

```text
A docs task can produce a worktree-scoped documentation diff, pass canonical verification, save a verified snapshot, stage approved paths, merge automatically into staging, or create a structured repair task if the staging merge fails.
```

---

## Milestone 11: API surface for research/knowledge and Codex provider

Goal: expose runtime state to the TreeSeed operational app.

Tasks:

* Add generated artifacts endpoint.
* Add research note endpoint.
* Add knowledge draft endpoint.
* Add optimization report endpoint.
* Add approval request endpoint.
* Add Codex provider readiness endpoint.
* Add workday report endpoint updates.

Deliverables:

```text
packages/agent/src/api/agent-routes.ts updates
packages/admin/src/pages/v1/[...all].ts integration updates if needed
```

Acceptance:

```text
The web app can fetch workday, generated knowledge, approval, and Codex readiness state.
```

---

## Milestone 12: Operational app supervision

Goal: make humans able to supervise the loop from the web UI.

Tasks:

* Update Work, Knowledge, and Capacity views.
* Add runtime readiness cards.
* Add current workday panel.
* Add active tasks table.
* Add research notes list.
* Add knowledge drafts list.
* Add optimization score badges.
* Add pending approvals panel.
* Add Codex provider status card.
* Add workday report timeline.

Deliverables:

```text
@treeseed/ui/components/astro/app/operations updates
packages/admin/src/view-models/workday.vm.ts updates
```

Acceptance:

```text
A human can see what agents generated, what needs approval, and whether Codex execution is ready.
```

---

## Milestone 13: First book-based knowledge workday

Goal: use the system to write its first useful TreeSeed book knowledge.

Initial questions:

```yaml
- What is the TreeSeed agent processing platform?
- How do local workdays run?
- How should agents turn research into book knowledge?
- What does the Codex subscription provider do?
- How does the web UI supervise agent-generated knowledge?
```

Expected generated drafts:

```text
Architecture / runtime / agent-processing-platform.md
Developer / workflow / local-agent-research-workday.md
Developer / providers / codex-subscription-provider.md
Research / evidence / research-to-knowledge-loop.md
Operations / workdays / supervising-agent-workdays.md
```

Acceptance:

```text
A local workday produces at least three optimized draft book articles and pending promotion approvals.
```

---

## Milestone 14: End-to-end local verification

Goal: prove backend, API, and UI work together.

Run:

```bash
npm run dev -- --reset
npm run dev -- --surface services
cd packages/agent && npm run dev:workday-start
cd packages/agent && npm run dev:workday-report
```

Verify:

* web app loads;
* API responds;
* workday starts;
* manager seeds tasks;
* worker executes tasks;
* research notes are produced;
* knowledge drafts are produced;
* optimizer scores drafts;
* approvals appear;
* Codex provider readiness appears;
* workday report includes generated artifacts.

Acceptance:

```text
A maintainer can run the local system and inspect agent-generated TreeSeed book knowledge in the web UI.
```

---

## 14. Testing strategy

### 14.1 Unit tests

Test:

* operation request/result contract validation;
* operation permission grants;
* denied operation calls;
* isolated worktree creation/resume behavior;
* deterministic operation step ordering;
* flexible agent verification versus canonical handler verification;
* `stage` path filtering;
* merge-to-staging success and failure handling;
* repair task creation from merge conflicts;
* `release` human approval requirement;
* research contract validation;
* knowledge draft validation;
* optimization scoring;
* declarative context query schema validation;
* shared handler context processor merging and provenance;
* context query metadata;
* Codex provider readiness;
* Codex provider result normalization;
* mutation policy guard;
* approval gate enforcement.

### 14.2 Service tests

Test:

* worker creates isolated worktrees for mutation tasks;
* worker restricts AI writes to the assigned worktree;
* worker invokes deterministic operations before/after approved mutation;
* operation events are written to task events;
* verification failure snapshots are saved;
* staging merge failures create repair tasks;
* unauthorized operation calls pause tasks instead of executing;
* manager seeding research tasks;
* worker executing research tasks;
* worker executing knowledge tasks;
* workday report including generated artifacts;
* approval request creation;
* capacity ledger entries for Codex provider.

### 14.3 API tests

Test:

* list research notes;
* list knowledge drafts;
* list optimization reports;
* list pending approvals;
* get Codex readiness;
* approve/reject promotion request.

### 14.4 UI tests

Test:

* Workday detail renders readiness;
* generated drafts appear;
* optimization scores appear;
* pending approvals appear;
* provider readiness warnings appear;
* empty states are useful.

### 14.5 Dogfood tests

Add:

```bash
cd packages/agent
npm run test:market-knowledge-dogfood
```

Expected:

```text
planner -> researcher -> knowledge_generator -> optimizer -> approval_request
```

No code mutation in dogfood test.

---

## 15. Verification matrix

| Change type                        | Required verification                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Declarative context query contract | `cd packages/sdk && npm test` plus `cd packages/agent && npm run test:unit`               |
| Shared handler context processor   | `cd packages/agent && npm run test:unit`                                                  |
| Research contract                  | `cd packages/agent && npm run test:unit`                                                  |
| Knowledge contract                 | `cd packages/agent && npm run test:unit`                                                  |
| Researcher handler                 | `cd packages/agent && npm run test:smoke` plus targeted test                              |
| Knowledge generator                | targeted handler test plus dogfood test                                                   |
| Optimizer                          | targeted handler test plus draft scoring fixture                                          |
| Worker task mapping                | service worker tests plus local workday smoke                                             |
| Manager task seeding               | manager tests plus local workday smoke                                                    |
| Codex provider skeleton            | mocked SDK unit tests                                                                     |
| Codex provider execution           | mocked SDK tests plus manual local readiness test                                         |
| API surface                        | API tests                                                                          |
| Work/Knowledge/Capacity app surfaces | UI/render tests and local manual inspection                                             |
| End-to-end local runtime           | `npm run dev -- --reset`, `npm run dev -- --surface services`, launch workday, inspect UI |

---

## 16. Safety and policy rules

### 16.0 Operations permission rules

Operations commands are agent superpowers and must be governed as first-class permissions.

Rules:

* `switch`, `save`, `stage`, `merge_to_staging`, `close`, and `release` require explicit grants when they can change state.
* State-changing shared-repository operations are handler-controlled by default.
* Agents may edit and test only inside their assigned isolated worktree.
* `dev --plan`, readiness checks, status checks, and worktree-local verification may be granted in read-only or worktree-scoped mode.
* Canonical verification must be run by the handler before staging.
* `stage` must only stage files inside the approved path set and only after canonical verification passes.
* `save` must record a coherent change summary and changed paths for verified snapshots, failure snapshots, and merge-failure snapshots.
* `merge_to_staging` must capture conflicts and create structured repair tasks instead of requiring manual human conflict resolution by default.
* `close` must record outcome, unresolved risks, follow-up questions, staging status, repair task ids, and pending approvals.
* `release` must require explicit human release approval every time.
* Agent prompts and work packages must name the operations the handler may run and the tools the agent may use in the worktree.
* Operation calls must be recorded in task events and workday reports.

### 16.1 No mutation without decision

Implementation tasks must check:

```text
approved decision exists
allowed paths exist
forbidden paths exist
work package matches approval scope
provider is allowed for task kind
operation grants exist for requested operations
```

### 16.2 No Codex provider for unapproved mutation

If a task requests Codex execution with mutation and no approval exists, return:

```yaml
state: waiting
reason: approval_required
required_approval_kind: authorize_mutation_scope
```

### 16.3 No hidden production credentials

Codex provider must not store ChatGPT credentials. It may check readiness and record plan/profile labels.

### 16.4 No direct CLI invocation

Tests should scan provider code for disallowed patterns:

```text
child_process.exec('codex')
child_process.spawn('codex')
execa('codex')
`codex exec`
`npx codex`
```

### 16.5 Worktree before staging before release

Research and knowledge agents may write canonical book files, but only inside isolated feature worktrees. Verified feature branches may merge to staging automatically. Production release from staging requires human approval.

The safety rule is:

```text
assigned worktree write -> handler verification -> handler save -> handler stage -> handler merge to staging -> human release
```

Low-confidence or exploratory work may still use draft paths, but canonical file writes do not require human approval as long as they remain within feature/staging policy and do not release to production.

---

## 17. Operational app acceptance design

### 17.1 Runtime readiness card

Fields:

* operations tool readiness;
* operation grants configured;
* latest operation failures;
* active agent worktrees;
* staging merge failures and repair tasks;
* web runtime;
* API runtime;
* manager status;
* worker status;
* active workday;
* queue depth;
* graph/context availability;
* Codex provider readiness.

### 17.2 Generated knowledge table

Columns:

* title;
* target book;
* section;
* branch/worktree;
* state;
* staging status;
* release readiness;
* optimization score;
* source question;
* source research;
* last updated;
* action.

Actions:

* view content change;
* request more research;
* optimize again;
* inspect feature branch;
* inspect staging merge;
* approve production release;
* reject release.

### 17.3 Approval panel

Kinds:

* grant operation permission;
* approve `release` from staging to production;
* request policy exception;
* request more research for staged content;
* increase workday capacity.

### 17.4 Codex provider card

Fields:

* provider selected;
* SDK installed;
* Node version OK;
* auth detected;
* subscription profile;
* default model;
* sandbox mode;
* approval policy;
* last readiness check;
* warnings.

---

## 18. First implementation PR sequence

### PR 1: Operations tool contracts and tests

* Add SDK operation-as-agent-tool request/result contracts.
* Add operation permission grants.
* Add deterministic operation step schema.
* Add policy tests for `switch`, `dev`, `save`, `stage`, `close`, and `release`.

### PR 2: Research and knowledge contracts

* Add research contract.
* Add knowledge draft contract.
* Add optimization score contract.
* Add unit tests.

### PR 3: Researcher context-pack output

* Update researcher to record context query and source refs.
* Add fixture test.

### PR 4: Knowledge generator

* Add knowledge generator handler.
* Add draft frontmatter.
* Add safe output path.

### PR 5: Knowledge optimizer

* Add optimizer handler.
* Add scoring and optimization report.

### PR 6: Dogfood harness

* Add market knowledge dogfood test.
* Seed TreeSeed platform questions.
* Produce draft artifacts.

### PR 7: Workday integration

* Add task kinds.
* Manager seeds tasks.
* Worker executes tasks.
* Report includes generated artifacts.

### PR 8: Codex provider skeleton

* Add `@openai/codex-sdk`.
* Add provider id/config/readiness.
* Add mocked tests.

### PR 9: Codex provider execution

* Implement thread start/resume.
* Normalize results.
* Add approval enforcement.

### PR 10: API endpoints

* Expose artifacts, approvals, provider readiness.

### PR 11: Operational app UI

* Add Work, Knowledge, and Capacity supervision UI.
* Add Codex readiness card.
* Add generated knowledge review table.

### PR 12: Operations lifecycle in handlers

* Wire deterministic worktree creation/switch, `dev`, canonical verification, `save`, `stage`, `merge_to_staging`, and `close` steps into implementation handlers.
* Allow agents to edit/test only inside assigned worktrees.
* Save failure snapshots when verification fails.
* Create repair tasks when staging merges fail.
* Keep `release` human-approved.

### PR 13: First local book workday

* Use the system to generate first TreeSeed book content changes in feature worktrees.
* Automatically merge verified feature branches into staging.
* Require human approval only for release from staging to production.

---

## 18.5 Implemented surfaces

As of 2026-05-13, this plan is implemented across the planned package and Market surfaces, with the remaining work focused on stabilization, review, and release preparation rather than new feature slices.

Implemented coverage includes:

* SDK declarative context query contracts, operation-as-agent-tool contracts, provider metadata, and Codex-related environment metadata.
* Agent context processing, package-owned research/knowledge/optimizer handlers, workday orchestration, runtime readiness, operation adapters, Codex provider readiness/execution, worktree-scoped docs mutation, knowledge promotion, human-gated release approval, artifact APIs, operation observability, reports, and local E2E verification harnesses.
* Capacity provider runtime: `@treeseed/agent` now owns provider API, manager,
  runner, provider plan/doctor, runtime path resolver, built-in handlers, and
  package-closure smoke tests.
* Capacity scheduling runtime from `docs/agent-budget.md`: classify, estimate, route, reserve, execute, reconcile, learn, checkpoint or continue, and preserve idle capacity when no useful admitted work remains.
* Core integrated dev surface support for `--surface all`.
* API delegation, Work/Knowledge supervision UI for runtime/artifacts/approvals, and Capacity UI for provider readiness, grants, lane pressure, routing decisions, reservations, learned estimates, usage actuals, checkpointed interruptions, approval-required work, and manual budgeted task submission through admission.

The intended completion gate is now verification and review organization: package-local `verify:local` checks, targeted Market Agents tests, the capacity scheduling E2E harness, `git diff --check`, review of tracked files, and human approval before any production release.

---

## 19. Done criteria for this plan

The plan is complete when all of these are true:

```text
1. Local market web and API run.
2. Local capacity provider services run through `trsd capacity`.
3. A local workday can be launched.
4. Manager seeds research and knowledge tasks.
5. Worker executes those tasks through AgentKernel.
6. Researcher produces source-backed research notes from declarative ctx queries defined in agent/content YAML/MD/MDX.
7. Knowledge generator produces TreeSeed book-based drafts.
8. Optimizer scores and improves drafts.
9. Drafts appear in the API and web UI.
10. Humans can approve production release, reject release, or request more research from the UI.
11. Operations commands are exposed as permissioned SDK tools for agents.
12. Approved implementation handlers deterministically create/switch isolated worktrees, run canonical verification, save snapshots, stage approved paths, merge to staging, and close.
13. Agents can flexibly test and request saves inside their own worktrees without mutating the shared repository checkout.
14. Verified feature branches can merge automatically into staging, and merge failures create structured repair tasks.
15. `release` from staging to production remains human-approved.
16. Codex subscription provider exists and uses @openai/codex-sdk.
17. Codex provider is selectable and worktree/staging gated.
18. Docs tasks can use Codex provider inside isolated local feature worktrees.
19. Workday reports summarize research, content changes, worktree snapshots, staging merges, merge failures, repair tasks, release approvals, Codex usage, operation events, and verification.
20. At least one TreeSeed book receives reviewed knowledge generated through the loop, merged to staging automatically, and released only after human approval.
```

---

## 20. Stabilization and release checklist

The implementation target is complete. Use this checklist before staging or release:

* Review diffs by subsystem: SDK contracts, agent runtime/workday, Codex/worktrees, API/UI, docs, and tests.
* Confirm intentional compatibility and fallback paths are clear in code and tests:
  * generic `merge_to_staging` in the operations adapter is policy-only;
  * concrete feature-to-staging merge execution lives in implementation and knowledge-promotion lifecycles;
  * promotion requests wait for an approval decision, not for a missing approval surface;
  * `releaseAttempted: false` and `stagingAttempted: false` in disconnected, unavailable, and waiting paths mean no unsafe side effect occurred.
* Ensure no generated temp files, secrets, local auth material, or accidental `.agent-worktrees` artifacts are tracked.
* Run final verification:
  * `cd packages/sdk && npm run verify:local`
  * `cd packages/core && npm run verify:local`
  * `cd packages/agent && npm run verify:local`
  * `npm -w packages/agent run capacity-provider:build`
  * `npm -w packages/agent run capacity-provider:test-local`
  * `npm run test:agent-contracts`
  * `npm run test:agent-handlers`
  * `npm run test:agent-message-chains`
  * `npm run test:manager-worker`
  * `npm -w packages/agent run test:capacity-provider-runtime`
  * `npx vitest run test/api/api.test.ts -t "agents"`
  * `npx vitest run test/lib/operational-ia.test.ts`
  * `git diff --check`
* Run root `npm run verify:local` when package verifies pass and the local runtime cost is acceptable.
* Keep production release human-gated: release may run only through an explicit human release approval.
