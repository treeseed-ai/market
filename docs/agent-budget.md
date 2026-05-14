# TreeSeed Capacity Scheduling & Estimation Architecture

## Comprehensive Implementation Plan

Last updated: 2026-05-13

---

# Purpose

This document defines a coherent implementation plan for evolving TreeSeed into:

> a cooperative operating system for bounded autonomous work

The focus of this plan is:

* capacity scheduling
* task estimation
* planning orchestration
* admission control
* budget governance
* probabilistic execution
* agent graph coordination
* adaptive workload learning

This document aligns the current TreeSeed architecture with the intended runtime behavior discussed in the capacity scheduling design review.

---

# Core Architectural Principle

TreeSeed should NOT behave like:

* a static DAG compiler
* a naive autonomous swarm
* a queue that blindly executes agent outputs
* an infinite compute orchestrator

TreeSeed SHOULD behave like:

> an operating-system-style scheduler for bounded cooperative autonomous work

This distinction is critical.

The graph of work is:

* emergent
* partially unknown
* probabilistic
* adaptive
* dynamically discovered during execution

Therefore:

```text
planning is iterative
budgeting is probabilistic
execution is admitted progressively
```

---

# Existing Structural Foundations

TreeSeed already contains most of the schema foundations required for this architecture.

Important existing structures:

## Workday Layer

* `work_days`
* `work_policies`
* `tasks`
* `task_events`
* `reports`

## Capacity Layer

* `capacity_providers`
* `capacity_provider_lanes`
* `capacity_grants`
* `capacity_reservations`
* `capacity_routing_decisions`
* `capacity_ledger_entries`

## Estimation Layer

* `task_estimates`
* `task_usage_actuals`
* `task_estimate_profiles`

## Execution Layer

* `worker_runners`
* `runner_scale_decisions`
* `repository_claims`

The architecture direction is already strongly aligned with the target model.

The implementation now covers the primary runtime responsibilities:

* runtime orchestration
* estimation policy
* planning lifecycle
* admission control
* adaptive learning
* event graph coordination

---

# The Target Runtime Model

## High-Level Execution Flow

```text
Work Policy
  ↓
Workday Manager
  ↓
Seed Root Tasks
  ↓
Trigger/Event Graph
  ↓
Agent Activation
  ↓
Work Classification
  ↓
Estimate Lookup
  ↓
Capacity Admission
  ↓
Execution
  ↓
Usage Reconciliation
  ↓
Profile Learning
```

---

# The Critical Distinction

## Events Are Cheap

```text
objective_priority_updated
architecture_updated
review_failed
proposal_approved
```

Events should:

* wake agents
* notify subscribers
* create lightweight activation tasks
* allow agents to inspect state

Events should NOT automatically:

* mutate repositories
* reserve large budgets
* trigger expensive execution
* fan out uncontrollably

---

# Runtime Lifecycle

# Phase 1 — Work Policy Definition

The work policy defines:

```yaml
project:
  environment: production

  daily_credit_budget: 1000
  max_queued_credits: 300

  max_runners: 4
  max_workers_per_runner: 8

  approval_threshold: 50
  planning_threshold: 20
```

The work policy becomes the top-level economic envelope for the workday.

---

# Phase 2 — Workday Initialization

The manager starts the workday.

Responsibilities:

* create workday record
* initialize budget envelope
* initialize queue state
* seed root tasks
* launch graph refresh

Example:

```text
Manager
  ├─ refresh_project_graph
  ├─ planner.startup
  ├─ notifier.startup
  ├─ architect.schedule
  └─ researcher.schedule
```

Important:

The manager does NOT allocate the entire DAG budget upfront.

The manager only initializes:

* workday lifecycle
* initial budget envelope
* root execution graph

---

# Phase 3 — Trigger Resolution

Agents subscribe to events.

Example:

```yaml
engineer:
  triggers:
    message:
      - architecture_updated
      - review_failed
      - release_failed
```

When an event is emitted:

```text
architecture_updated
  ↓
Trigger Resolver
  ↓
Engineer activation task created
```

Activation tasks should be:

* lightweight
* inexpensive
* bounded
* non-mutating

This is effectively:

```text
inspect context
```

NOT:

```text
perform implementation
```

---

# Phase 4 — Agent Activation

An activated agent:

* reads context
* reads event payload
* inspects repo state
* examines graph state
* evaluates objectives
* determines whether work is required

The output of activation is:

```text
proposed work
```

NOT immediate execution.

---

# Proposed Work Classification

This is the most important architectural stage.

Agents should classify:

* scale
* risk
* mutation scope
* concurrency class
* expected fan-out
* confidence level

The output becomes a normalized:

```text
task_signature
```

Examples:

```text
engineer.small_fix
engineer.multi_file_refactor
engineer.generate_tests
architect.full_review
planner.large_change_plan
review.verify
```

---

# Classification Decision Tree

## Small Predictable Work

Example:

```text
review_failed
  ↓
Engineer activation
  ↓
one failing test
one file changed
small diff
```

Classification:

```text
engineer.small_fix
```

---

## Medium Known Work

Example:

```text
architecture_updated
  ↓
5 impacted files
API surface change
```

Classification:

```text
engineer.multi_file_refactor
```

---

## Large Uncertain Work

Example:

```text
proposal_approved
  affects:
    migrations
    deployment
    auth
    APIs
```

Classification:

```text
engineer.plan_large_change
```

Important:

Planning itself is a task.

Planning itself consumes budget.

---

# Estimate Architecture

# Estimate Sources

TreeSeed should support multiple estimate sources.

## Source 1 — Static Defaults

```yaml
engineer.small_fix:
  default_p50: 2
  default_p90: 4
```

Used when:

* no profile exists
* cold start
* no telemetry available

---

## Source 2 — Learned Profiles

Primary runtime estimate source.

```text
task_signature
  ↓
lookup profile
  ↓
p50 / p90 estimate
```

Example:

| Task Signature               | p50 | p90 |
| ---------------------------- | --: | --: |
| engineer.small_fix           |   2 |   4 |
| engineer.multi_file_refactor |  20 |  60 |
| reviewer.verify              |   5 |   8 |

---

## Source 3 — Agent Refinement

Only used when:

* uncertainty is high
* risk is high
* fan-out is unknown
* historical confidence is weak

The agent may refine:

```json
{
  "estimatedCreditsP50": 12,
  "estimatedCreditsP90": 25,
  "expectedFanout": 3,
  "requiresApproval": false
}
```

---

# Capacity Admission Layer

This is the authority layer.

Important principle:

```text
Agents may propose work.
The runtime admits work.
```

Agents do NOT own global budget.

The runtime owns:

* reservation authority
* concurrency control
* budget exhaustion
* approval escalation
* provider routing

---

# Admission Flow

```text
Task Proposal
  ↓
Estimate Lookup
  ↓
Reservation Request
  ↓
Capacity Router
  ↓
Decision
```

---

# Capacity Router Inputs

The router evaluates:

## Budget

```text
remaining workday credits
remaining grant credits
monthly provider budget
```

## Provider State

```text
lane congestion
subscription saturation
quota pressure
concurrency
```

## Task Characteristics

```text
risk
fanout
repo mutation
production impact
confidence
```

## Policy

```text
approval thresholds
environment restrictions
overflow policy
```

---

# Admission Outcomes

## Immediate Execution

```text
cheap
predictable
high confidence
```

Example:

```text
engineer.small_fix
p90 = 4
remaining budget = 100
```

Outcome:

```text
reserve
execute immediately
```

---

## Planning Required

```text
unknown
large
high-risk
```

Outcome:

```text
run planning task first
```

---

## Approval Required

```text
estimated work exceeds threshold
```

Outcome:

```text
approval_required
```

---

## Budget Blocked

```text
remaining budget insufficient
```

Outcome:

```text
budget_blocked
```

---

# Planning Tasks

Planning tasks should:

* inspect repo
* estimate downstream work
* identify graph fan-out
* classify subtasks
* generate probabilistic DAG proposals

Planning tasks should NOT:

* mutate repositories
* perform implementation
* run expensive verification

---

# Example Planning Output

```json
{
  "tasks": [
    {
      "signature": "engineer.schema_migration",
      "estimateP90": 15
    },
    {
      "signature": "engineer.api_refactor",
      "estimateP90": 20
    },
    {
      "signature": "reviewer.verify",
      "estimateP90": 8
    }
  ],
  "totalP90": 43
}
```

The graph becomes explicit only after planning.

---

# Progressive Admission

Important:

The runtime should NOT reserve the entire DAG upfront by default.

Instead:

```text
admit progressively
```

Example:

```text
Remaining budget = 40
Planned DAG total = 50
```

Policy options:

## Option A — Partial Admission

```text
schema_migration admitted
api_refactor deferred
review queued
```

## Option B — Approval

```text
large plan exceeds budget
human approval required
```

## Option C — Multi-Workday Spillover

```text
phase work across multiple workdays
```

---

# Execution Layer

Only admitted tasks become execution tasks.

Execution tasks:

* claim repositories
* mutate files
* run builds/tests
* generate patches
* create reports
* emit events

Execution consumes:

* reserved credits
* provider quota
* worker capacity
* concurrency slots

---

# Usage Reconciliation

After execution:

```text
actual usage recorded
```

Examples:

```json
{
  "taskSignature": "engineer.small_fix",
  "actualCredits": 3,
  "wallMinutes": 2,
  "filesChanged": 1,
  "testRuns": 1
}
```

---

# Profile Learning

Profiles evolve continuously.

Lifecycle:

```text
estimate
  ↓
execute
  ↓
record actuals
  ↓
update profile distribution
```

The system should maintain:

* rolling p50
* rolling p90
* variance
* confidence score
* outlier tracking

---

# Example Learning Loop

```text
engineer.small_fix

old:
  p50 = 2
  p90 = 4

new actuals:
  2
  3
  5
  1
  3

updated:
  p50 = 3
  p90 = 5
```

---

# Attention Modeling (Future)

Credits alone are insufficient.

TreeSeed should eventually model:

```text
attention saturation
```

Examples:

| Task                 | Attention Weight |
| -------------------- | ---------------: |
| small fix            |                1 |
| architecture review  |                5 |
| multi-repo migration |               20 |

This becomes critical for:

* subscription-backed providers
* human-attached execution
* long-context systems
* cooperative orchestration

---

# Provider Architecture

Providers should represent:

```text
bounded execution surfaces
```

NOT merely:

```text
token APIs
```

Examples:

```text
openai-api
anthropic-api
codex-pro-seat
human-review
local-runner
```

Each provider may expose multiple lanes.

---

# Lane Examples

```yaml
lanes:
  - architectural-analysis
  - lightweight-review
  - repo-refactor
  - human-approval
  - local-build
```

Lanes support:

* differentiated quotas
* differentiated economics
* differentiated concurrency
* differentiated routing policy

---

# Fan-Out Control

One of the biggest architectural risks is uncontrolled graph expansion.

TreeSeed should enforce:

## Fan-Out Limits

```text
max downstream tasks
max planning recursion depth
max concurrent descendants
```

## Budget-Aware Expansion

Agents should NOT recursively emit unlimited work.

Every downstream task must pass admission.

---

# The Correct Responsibility Split

| Responsibility        | Owner                |
| --------------------- | -------------------- |
| work discovery        | agents               |
| task classification   | agents               |
| historical estimates  | runtime profiles     |
| reservation authority | capacity router      |
| lifecycle management  | workday manager      |
| execution             | workers              |
| telemetry             | reconciliation layer |
| learning              | estimate profiler    |

This separation is essential.

---

# Recommended Runtime Components

# 1. Trigger Resolver

Responsibilities:

* subscription matching
* event fan-out
* activation task creation

---

# 2. Classification Runtime

Responsibilities:

* normalize proposed work
* assign task signatures
* infer confidence class
* determine planning necessity

---

# 3. Estimate Service

Responsibilities:

* profile lookup
* p50/p90 calculation
* confidence scoring
* default fallback estimation

---

# 4. Capacity Router

Responsibilities:

* budget admission
* reservation creation
* provider selection
* approval escalation
* concurrency control

---

# 5. Planning Executor

Responsibilities:

* bounded graph planning
* DAG proposal generation
* downstream estimate synthesis

---

# 6. Usage Reconciler

Responsibilities:

* actual usage recording
* profile updates
* variance tracking
* anomaly detection

---

# Recommended Phased Implementation

Implementation status:

* Phase 1 through Phase 5 are implemented in the SDK, agent runtime, and market control-plane surfaces.
* Post-phase roadmap items are implemented as metadata-driven capacity extensions without additional schema migrations.
* Comprehensive capacity scheduling E2E coverage now verifies classification, admission, routing, estimate learning, bounded planning, interruption recovery, backfill/idling, attention/utility metadata, and hybrid escalation behavior.
* Market UI operator surfaces now include team-level provider/grant administration and a project-level Capacity console for readiness, pressure, routing decisions, active reservations, learned estimates, usage actuals, approvals, checkpointed interruptions, and manual budgeted work submission through admission.

# Phase 1 — Runtime Classification

Implemented:

* task signatures
* runtime estimate lookup
* lightweight activation tasks
* admission control before execution

This is the highest leverage step.

---

# Phase 2 — Estimate Learning

Implemented:

* rolling p50/p90 updates
* confidence scoring
* variance tracking
* profile aging

---

# Phase 3 — Planning Tasks

Implemented:

* bounded planning agents
* DAG proposal outputs
* downstream estimate synthesis
* progressive admission

---

# Phase 4 — Multi-Provider Routing

Implemented:

* provider arbitration
* lane congestion awareness
* subscription saturation modeling
* spillover routing

---

# Phase 5 — Attention Scheduling

Implemented:

* attention load modeling
* context saturation tracking
* coordination overhead accounting
* cooperative balancing

---

# Completion Verification

Capacity scheduling completion is verified by deterministic SDK, agent, market, and E2E checks.

Primary checks:

```bash
cd packages/sdk && npm run test -- --run test/utils/capacity.test.ts
cd packages/agent && npm run test:unit
cd packages/agent && npm run test:capacity-scheduling-e2e
cd packages/agent && npm run test:local-e2e-verification
npm run test:unit
cd packages/sdk && npm run verify:local
cd packages/agent && npm run verify:local
npm run verify:local
```

The capacity scheduling E2E harness proves:

* activation/root tasks are classified before executable queueing;
* admissions record estimates, route candidates, reservations, and capacity envelopes;
* learned `taskSignature + executionProfileId` profiles override static defaults;
* planning tasks remain non-mutating and progressively materialize children through admission;
* budget-blocked/deferred work is not queued;
* worker usage records completed cost separately from interrupted partial work;
* checkpoint/continuation events prevent dirty ambiguous failure states;
* backfill admits useful work by utility and idles when no useful work remains;
* attention, context, utility, predictive reserve, cooperative routing, and hybrid phase metadata survive into route and usage records.
* the project Capacity UI exposes provider/lane pressure, reservations, learned profiles, approval and continuation states, and submits manual work through `/v1/projects/:projectId/agent-tasks` without bypassing admission.

Implemented behavior:

* routing candidates carry attention estimates and attention/context pressure
* work policy metadata can bound attention load and context saturation
* task reservations, routing decisions, worker usage, and workday summaries preserve attention telemetry

---

# Workday Backfill and Idle Policy

One of the most important scheduling behaviors is what happens when:

```text
all currently admitted work completes
BUT
remaining workday budget still exists
```

TreeSeed should NOT attempt to consume all remaining budget automatically.

Unused budget is NOT a failure condition.

The runtime should instead transition into:

```text
opportunistic bounded backfill mode
```

---

# Core Principle

The scheduler should:

* continue useful bounded work when appropriate
* preserve idle capacity when no meaningful work exists
* avoid generating artificial execution merely to consume credits

The system should optimize for:

```text
useful work density
```

NOT:

```text
maximum budget exhaustion
```

---

# Backfill Lifecycle

```text
Root graph execution completes
  ↓
Manager evaluates remaining budget
  ↓
Manager checks:
  - queued backlog
  - deferred tasks
  - low-cost planning opportunities
  - quality maintenance work
  - graph refresh opportunities
  ↓
Eligible work classified and admitted
  ↓
Remaining budget reevaluated
```

The scheduler may repeat this cycle until:

* budget exhaustion
* idle timeout
* workday end
* no admissible work remains

---

# Backfill Sources

TreeSeed should support multiple classes of opportunistic work.

---

# 1. Deferred Tasks

Previously rejected or deferred tasks may become admissible.

Example:

```text
Earlier:
  api_refactor deferred
  remaining budget insufficient

Later:
  several tasks complete under estimate
  budget freed

Result:
  api_refactor may now be admitted
```

---

# 2. Backlog Pull

The manager may admit high-priority queued work.

Example:

```text
Remaining budget: 25

Eligible backlog:
  docs.update_architecture = 8
  reviewer.verify = 5
  engineer.small_fix = 4
```

These tasks may be admitted opportunistically.

---

# 3. Maintenance Work

The runtime may prioritize low-risk maintenance tasks.

Examples:

```text
refresh dependency graph
refresh embeddings
cleanup stale branches
run lightweight verification
refresh architectural summaries
```

These are ideal backfill tasks because they:

* improve future execution quality
* are bounded
* are low-risk
* improve graph accuracy

---

# 4. Exploration and Planning

If no clear execution work exists:

The system may spend small bounded budgets on:

```text
research
proposal generation
dependency analysis
future planning
architectural review
```

Important:

Exploration work should remain:

* bounded
* low-cost
* non-recursive
* non-explosive

---

# 5. Strategic Reserve Preservation

The scheduler should preserve remaining budget when:

* future events are likely
* production incidents may occur
* planner confidence is low
* provider quotas are degrading
* workday is nearing close

This creates:

```text
adaptive reserve management
```

rather than:

```text
aggressive budget exhaustion
```

---

# Safety Buffer Policy

The runtime should reserve a configurable safety margin.

Example:

```yaml
workday:
  daily_credit_budget: 100
  reserve_buffer_percent: 15
```

This yields:

```text
100 total credits
15 reserved safety credits
85 actively allocatable credits
```

The reserve buffer supports:

* unexpected work
* incident response
* planner underestimation
* late high-priority tasks

---

# Backfill Admission Priority

The manager should rank candidate backfill tasks by:

| Factor                     | Description                  |
| -------------------------- | ---------------------------- |
| objective priority         | strategic importance         |
| estimated utility          | expected impact              |
| confidence                 | estimate reliability         |
| boundedness                | low fan-out risk             |
| maintenance value          | future execution improvement |
| provider efficiency        | lane utilization quality     |
| remaining workday duration | time sensitivity             |

---

# Example Backfill Decision

```text
Daily budget: 100

Initial graph consumed: 62
Reserve buffer: 15

Remaining allocatable budget:
  23
```

Candidate tasks:

| Task                     | Estimate |
| ------------------------ | -------: |
| reviewer.verify          |        5 |
| docs.update_architecture |        8 |
| dependency_refresh       |        3 |
| engineer.small_fix       |        4 |
| exploratory_research     |       12 |

Scheduler may admit:

```text
reviewer.verify = 5
docs.update_architecture = 8
dependency_refresh = 3
engineer.small_fix = 4
```

Total:

```text
20 credits
```

Remaining:

```text
3 allocatable
15 reserve
```

---

# Idle Workday Behavior

When:

```text
no admissible work remains
```

The runtime should transition into:

```text
idle state
```

NOT:

```text
forced autonomous activity
```

Idle state behavior may include:

* lightweight event listening
* low-cost graph refresh
* periodic queue checks
* waiting for approvals
* waiting for external triggers

---

# Important Principle

TreeSeed should optimize for:

```text
bounded useful cognition
```

NOT:

```text
maximal autonomous activity
```

The system should be comfortable with:

* unused capacity
* deferred execution
* partial workdays
* strategic waiting
* reserve preservation

This is essential for:

* cooperative governance
* subscription-backed providers
* bounded economic systems
* human-aligned execution

---

# Workday Closure

The manager may close the workday when:

* all admitted tasks complete
* no admissible work remains
* remaining budget is below threshold
* idle timeout reached
* workday schedule ends

Closure responsibilities:

* finalize ledger entries
* reconcile reservations
* release claims
* persist telemetry
* generate reports
* snapshot estimate updates

---

# Post-Phase Roadmap — Implemented

Backfill scheduling now includes:

## Utility Scoring

Estimate:

```text
expected utility per credit
```

for backlog prioritization.

Implemented through route utility estimates, utility-per-credit ranking, and worker usage telemetry.

---

## Cooperative Market Scheduling

Allow:

* projects
* teams
* providers
* contributors

to compete for unused capacity.

Implemented as cooperative provider/lane/grant arbitration using existing market capacity plan metadata.

---

## Predictive Reserve Allocation

Predict:

* likely future incidents
* expected trigger bursts
* provider degradation
* deployment windows

to dynamically adjust reserve buffers.

Implemented through predictive reserve policy metadata that preserves budget for likely future work.

---

# Capacity Exhaustion, Checkpointing, and Dirty-State Recovery

Capacity exhaustion is different from ordinary task failure.

A task may be making valid progress but still become unable to continue because:

* the workday credit budget is exhausted
* a provider quota is exhausted
* a subscription plan hits a daily, weekly, or session limit
* the task exceeds its reservation
* a runner is interrupted
* a human approval threshold is reached mid-execution

In these cases, TreeSeed should not allow the task to fail raw or leave the repository in an ambiguous dirty state.

The task should transition into a managed interrupt state.

---

# Core Principle

Budget or quota exhaustion should usually be treated as:

```text
execution interrupted
```

NOT automatically:

```text
task failed
```

The runtime must preserve enough state for the work to be:

* resumed
* reviewed
* split into smaller tasks
* handed off
* rolled back
* deferred to a later workday

---

# Managed Interrupt Flow

```text
Running mutating task
  ↓
Budget / quota pressure detected
  ↓
Early warning threshold crossed
  ↓
Worker enters checkpoint mode
  ↓
Dirty state is captured
  ↓
Continuation estimate is generated
  ↓
Repository claim is preserved or safely parked
  ↓
Task transitions to continuation_required
  ↓
Manager decides next action
```

---

# Dirty State Must Be Explicit

A repository should never be left in an ambiguous dirty state.

Dirty work should become one of the following explicit states:

```text
checkpointed_dirty
ready_for_continuation
needs_human_review
rollback_required
abandoned_branch_preserved
```

These states allow the manager, agents, and humans to reason about what happened.

---

# Checkpoint Contract

Every mutating execution task should periodically produce a checkpoint artifact.

A checkpoint should include:

```yaml
task_id: task_123
branch: treeseed/feature-x-attempt-1
base_commit: abc123
current_commit: def456

current_goal: implement feature X
current_phase: implementation

files_changed:
  - packages/core/src/foo.ts
  - packages/sdk/src/bar.ts

commands_run:
  - pnpm test
  - pnpm build

test_status: failing
known_failures:
  - sdk test fails because generated type is incomplete

completed_work:
  - added schema field
  - updated core model
  - partially updated sdk wrapper

remaining_work_estimate:
  p50: 20
  p90: 45

rollback_strategy: revert branch or reset to base_commit
continuation_strategy: resume from branch and complete sdk/test updates
```

The checkpoint should be stored as durable task metadata and should also be visible in reports or approval inboxes.

---

# Emergency Recovery Budget

TreeSeed should reserve a small amount of budget exclusively for safe shutdown and recovery.

Example:

```yaml
workday:
  daily_credit_budget: 100
  execution_budget: 85
  reserve_buffer: 10
  recovery_budget: 5
```

The recovery budget may only be used for:

* checkpointing
* summarizing work
* committing or stashing WIP
* producing continuation context
* rolling back unsafe changes
* releasing or preserving repository claims

It should NOT be used for normal feature implementation.

This prevents:

```text
quota exhausted before the agent can explain what happened
```

---

# Early Warning Thresholds

Long-running tasks should not discover exhaustion only at the hard limit.

The runtime should monitor:

* consumed credits
* consumed provider units
* wall-clock time
* quota minutes
* retry count
* failed command count
* remaining reservation

Example policy:

```yaml
interrupt_thresholds:
  reservation_used_percent: 80
  quota_remaining_minutes: 20
  recovery_budget_remaining_minimum: 3
```

When an early warning threshold is crossed, the worker should decide whether to:

```text
continue
request extension
checkpoint and pause
split remaining work
rollback
```

---

# Over-Budget Execution Flow

Example:

```text
Task: implement feature X
Initial reservation: 100 credits
Actual progress: 92 credits consumed
Remaining reservation: 8 credits
Estimated remaining work: 30–60 credits
```

The runtime should not blindly continue.

Instead:

```text
checkpoint
pause
request continuation decision
```

The task becomes:

```text
continuation_required
```

with metadata:

```json
{
  "reason": "reservation_exhaustion_risk",
  "initialReservation": 100,
  "consumedCredits": 92,
  "remainingReservation": 8,
  "estimatedRemainingP50": 30,
  "estimatedRemainingP90": 60,
  "repoState": "checkpointed_dirty"
}
```

---

# Provider Quota Exhaustion Flow

Example:

```text
Task: implement feature X
Provider: codex-pro-seat
External limit: 5 hour quota
Task state: repository dirty
```

When the provider becomes unavailable:

```text
capacity interrupt detected
  ↓
worker uses recovery budget
  ↓
checkpoint branch state
  ↓
produce continuation summary
  ↓
mark provider lane unavailable
  ↓
transition task to continuation_required
```

Possible manager actions:

```text
continue tomorrow on same provider
spill over to API lane
request human approval for more capacity
split remaining work into smaller tasks
handoff to human
rollback
```

---

# Continuation Tasks

A continuation is not the same as starting over.

A continuation task should include:

* original task id
* checkpoint id
* branch or worktree location
* current repo state
* completed work summary
* remaining work estimate
* known failures
* continuation prompt/context
* prior reservation and actual usage

Example:

```text
engineer.continue_feature_implementation
```

The continuation task must pass normal admission control.

```text
continuation_required
  ↓
Estimate remaining work
  ↓
Capacity router evaluates budget/provider availability
  ↓
Admit, defer, approve, spill over, or rollback
```

---

# Repository Claim Handling

When a mutating task is interrupted, repository claims must be handled deliberately.

Options:

## Preserve Claim

Use when continuation is imminent.

```text
repo claim remains active
branch remains checked out
```

## Park Claim

Use when work may continue later.

```text
commit or stash WIP
record branch
release active runner
mark repository as checkpointed_dirty
```

## Release Claim After Rollback

Use when work is unsafe or abandoned.

```text
rollback to base_commit
release claim
mark task rollback_complete
```

---

# Human Review and Approval

Some interrupted tasks should create an approval inbox item.

Examples:

```text
feature is over budget
repo is dirty
continuation exceeds remaining workday budget
provider quota exhausted
production files changed
migration partially implemented
```

Approval options should include:

```text
continue with more budget
continue tomorrow
spill over to different provider
split remaining work
request human review
rollback
abandon branch but preserve artifact
```

---

# Reconciliation for Interrupted Work

Interrupted tasks still produce useful telemetry.

The system should record:

* consumed credits
* consumed provider units
* wall minutes
* files changed
* tests run
* failure/interruption reason
* remaining work estimate
* checkpoint quality

This should update estimate profiles carefully.

Important:

An interrupted task should not simply count as a completed task with high cost.

Profile learning should distinguish:

```text
completed_actual_cost
```

from:

```text
partial_cost_before_interrupt
estimated_remaining_cost
```

---

# Example: Feature Goes Way Over Budget

```text
Daily budget: 150
Feature reservation: 80
Provider quota: 5 hours
```

Execution:

```text
0h: task starts
2h: implementation expands in scope
4h: reservation 80% consumed
4h 20m: tests still failing
4h 30m: remaining estimate = 40–70 credits
4h 35m: checkpoint mode triggered
4h 50m: WIP committed to branch
5h: provider quota exhausted
```

Final state:

```text
task status: continuation_required
repo state: checkpointed_dirty
branch: treeseed/feature-x-attempt-1
consumed credits: 76
remaining estimate: 40–70
approval: required
```

Manager options:

```text
A. continue tomorrow on same provider
B. spill over to API lane now
C. split into schema/test/review subtasks
D. request human takeover
E. rollback branch
```

---

# Implementation Requirements

TreeSeed should add or formalize:

## Task Statuses

```text
continuation_required
checkpointing
checkpointed
rollback_required
rollback_complete
provider_exhausted
reservation_exhausted
```

## Repository States

```text
clean
claimed_dirty
checkpointed_dirty
parked_dirty
rollback_required
```

## Checkpoint Artifacts

Durable records containing:

* changed files
* branch state
* current objective
* completed work
* remaining work
* commands run
* known failures
* continuation context

## Recovery Budget

Separate budget class for:

* checkpointing
* summarization
* rollback
* claim cleanup

## Continuation Admission

Continuation tasks must be routed through normal capacity admission.

---

# Design Principle

The system should never leave work in the state:

```text
failed and dirty, no context
```

It should transform that into:

```text
paused, checkpointed, explainable, and resumable
```

This is essential for:

* long-running autonomous work
* subscription-backed providers
* cooperative review
* safe repository mutation
* human trust
* multi-day execution

---

# Model Size, Cost Multipliers, and Quality-Aware Routing

Different models and execution surfaces have different:

* costs
* latency
* reasoning quality
* context limits
* reliability
* quota characteristics
* concurrency behavior

TreeSeed must therefore separate:

```text
normalized work estimation
```

from:

```text
provider/model execution cost
```

---

# Core Principle

Credits should represent:

```text
normalized expected work
```

NOT directly:

```text
provider token cost
```

This allows the runtime to reason consistently across:

* APIs
* subscription plans
* local models
* human review
* heterogeneous providers

---

# Two-Layer Cost Model

TreeSeed should model:

## Layer 1 — Work Estimate

Represents intrinsic workload.

Example:

```text
architect.full_review
base estimate = 20 credits
```

This estimate should remain stable regardless of provider.

---

## Layer 2 — Execution Profile

Represents the chosen model/provider execution surface.

Example:

| Execution Profile     | Cost Multiplier |
| --------------------- | --------------: |
| small-code-model      |            0.5x |
| standard-code-model   |            1.0x |
| large-reasoning-model |            3.0x |
| premium-human-review  |           10.0x |

The runtime translates:

```text
base work estimate
```

into:

```text
provider-adjusted reservation
```

---

# Example Cost Translation

Task:

```text
architect.full_review
base estimate = 20 credits
```

Candidate routes:

| Route                 | Multiplier | Final Reservation |
| --------------------- | ---------: | ----------------: |
| small model           |       0.5x |                10 |
| standard model        |       1.0x |                20 |
| large reasoning model |       3.0x |                60 |

The capacity router decides whether the higher-cost route is justified.

---

# Execution Profiles

Execution profiles should become first-class runtime concepts.

Examples:

```text
small-code-model
standard-code-model
large-reasoning-model
cheap-review-model
long-context-architect
human-review
local-fast-model
```

Execution profiles encapsulate:

* provider
* model family
* context limits
* reasoning quality
* latency characteristics
* quota behavior
* cost multiplier
* concurrency behavior

---

# Estimate Profile Keys

Estimate learning should distinguish between:

```text
task_signature
```

and:

```text
execution_profile
```

The true estimate key becomes:

```text
task_signature + execution_profile
```

Examples:

```text
engineer.small_fix + small-code-model
engineer.small_fix + large-reasoning-model
architect.full_review + long-context-architect
review.verify + cheap-review-model
```

This allows the system to learn:

* actual cost differences
* quality differences
* interruption behavior
* latency differences
* retry rates
* success probabilities

---

# Quality-Aware Routing

The capacity router should optimize across:

| Dimension            | Description                     |
| -------------------- | ------------------------------- |
| cost                 | expected credits/provider cost  |
| quality              | expected output reliability     |
| latency              | expected completion time        |
| quota pressure       | provider exhaustion risk        |
| confidence           | estimate reliability            |
| context requirements | token/context needs             |
| risk                 | mutation/production sensitivity |
| concurrency          | current provider saturation     |

Routing therefore becomes:

```text
cost × quality × risk × availability optimization
```

rather than:

```text
lowest cost wins
```

---

# Example Routing Decisions

## Small Predictable Bug Fix

```text
Task:
  engineer.small_fix
```

Characteristics:

* one file
* known pattern
* low risk
* high estimate confidence

Routing:

```text
small-code-model
```

Reason:

```text
cheap model sufficient
```

---

## Architectural Analysis

```text
Task:
  architect.full_review
```

Characteristics:

* long context
* system-wide reasoning
* uncertain scope
* high coordination importance

Routing:

```text
large-reasoning-model
```

Reason:

```text
higher reasoning quality justified
```

---

## Review Escalation

```text
review.verify
```

Initial route:

```text
cheap-review-model
```

If confidence low:

```text
escalate to larger model
```

This creates:

```text
multi-stage quality-aware review
```

---

# Progressive Escalation

TreeSeed should prefer:

```text
cheap-first escalation
```

rather than:

```text
always use largest model
```

Example:

```text
small model attempts task
  ↓
confidence insufficient
  ↓
escalate to larger model
```

This dramatically improves:

* budget efficiency
* throughput
* concurrency
* quota preservation

---

# Subscription Providers vs APIs

The runtime must distinguish:

```text
API-backed providers
```

from:

```text
interactive subscription providers
```

Examples:

| Provider Type     | Characteristics          |
| ----------------- | ------------------------ |
| API               | scalable, token-metered  |
| subscription seat | bounded, session-limited |
| local model       | compute-bound            |
| human review      | attention-bound          |

The router should understand:

* subscription saturation
* session exhaustion
* quota minutes
* interactive concurrency limits
* human-attached throughput

---

# Dynamic Multipliers

Multipliers should not be static forever.

The system should learn:

* actual provider efficiency
* retries
* interruption frequency
* task completion quality
* rollback frequency
* continuation frequency

Example:

```text
small-code-model
```

may appear cheap but produce:

* many retries
* low-quality patches
* frequent continuation tasks

Effective cost may become:

```text
higher than expected
```

The runtime should eventually learn:

```text
effective utility-adjusted cost
```

NOT merely raw token price.

---

# Quality Telemetry

TreeSeed should collect quality-oriented telemetry.

Examples:

* task completion success
* retry frequency
* rollback frequency
* review rejection rate
* continuation rate
* human correction rate
* downstream failure rate

This telemetry should influence routing decisions.

---

# Context-Aware Model Selection

Some work fundamentally requires larger execution profiles.

Examples:

| Work Type                 | Requirement                   |
| ------------------------- | ----------------------------- |
| large architecture review | long context                  |
| repository-wide migration | reasoning depth               |
| lightweight lint fix      | cheap deterministic execution |
| release verification      | reliable review quality       |

The classifier should help infer:

```text
minimum viable execution profile
```

---

# Example End-to-End Flow

```text
Event:
  architecture_updated

Engineer activation
  ↓
Classification:
  engineer.multi_file_refactor

Base estimate:
  20 credits

Candidate routes:
  small model = 10
  standard model = 20
  large model = 60

Router evaluates:
  - remaining budget
  - repo risk
  - provider saturation
  - context size
  - confidence

Decision:
  standard model sufficient

Reservation:
  20 credits

Execution admitted
```

---

# Post-Phase Routing Roadmap — Implemented

Routing now includes:

## Utility-Aware Optimization

Estimate:

```text
expected useful work per credit
```

for each execution profile.

Implemented through utility-aware route scores and persisted routing decision snapshots.

---

## Hybrid Execution

Allow:

```text
planning on large model
implementation on medium model
review on cheap verifier
human escalation only on uncertainty
```

Implemented as normalized phase-aware metadata; each phase remains subject to normal admission.

---

## Cooperative Market Routing

Allow providers to compete dynamically based on:

* price
* latency
* quality
* availability
* trust level

Implemented through cooperative route signals in capacity plans and route candidate score metadata.

---

## Attention-Aware Routing

Integrate:

```text
attention saturation
```

into execution profile selection.

This is particularly important for:

* subscription-backed providers
* human-attached execution
* long-context planning work

Implemented in Phase 5 and included in route candidate scoring.

---

# Post-Roadmap Ideas

Further work may add real-money provider markets, contributor bidding, and full multi-agent hybrid workflow engines. These are intentionally outside the completed capacity scheduling roadmap.

---

# Design Principle

The runtime should think:

```text
What is the cheapest execution profile
that safely achieves the required quality?
```

NOT:

```text
Always use the largest model.
```

This enables:

* bounded autonomous execution
* economic sustainability
* adaptive quality routing
* scalable cooperative orchestration
* heterogeneous provider ecosystems

---

# Final Architectural Summary

TreeSeed should evolve toward:

```text
bounded autonomous orchestration
through progressively admitted probabilistic work
```

NOT:

```text
blind autonomous execution
```

The runtime should:

* allow agents to discover work
* allow planners to propose graphs
* reserve capacity incrementally
* enforce economic governance
* learn from actual execution
* adapt over time

The resulting platform becomes:

> a cooperative scheduler for finite autonomous cognition

rather than merely:

> an AI task queue.
