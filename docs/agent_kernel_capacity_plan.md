# TreeSeed Two-Mode Agent Kernel and Capacity Planning Implementation Canvas

**Working status:** Architecture implementation plan  
**Date:** 2026-06-07  
**Audience:** TreeSeed architecture, SDK/API/agent, hosted control plane, capacity provider, Admin, CLI, and Market UI implementation teams
**Scope:** TreeSeed SDK, CLI, Agent, hosted/API layer, capacity providers, Admin, Core web runtime integration, and Market UI integration
**Important caveat:** This plan is intentionally architecture-first. The implementation source of truth is now [agent-capacity-implementation-roadmap.md](agent-capacity-implementation-roadmap.md), with domain terms in [agent-capacity-domain-model.md](agent-capacity-domain-model.md), runtime behavior in [agent-kernel-mode-runtime.md](agent-kernel-mode-runtime.md), and operator surfaces in [agent-capacity-operator-surfaces.md](agent-capacity-operator-surfaces.md). Treat older package/module names and endpoint sketches in this document as conceptual design input when they conflict with those canonical docs.

**Coordination refinement:** See [capacity_provider_agent_coordination_architecture.md](capacity_provider_agent_coordination_architecture.md) for the durable provider/team coordination model, provider-initiated check-in, allocation policy layers, and the boundary between project-bundled agents and capacity-provider-bundled execution providers.

**Ownership correction:** Earlier drafts used "Core" and "manager" broadly. Current package ownership is sharper: `@treeseed/agent` owns AgentKernel execution, mode scheduling, provider manager/runner behavior, runtime images, and provider-local lifecycle; `@treeseed/sdk` owns shared contracts; `@treeseed/api` owns durable coordination records and assignment functions; `@treeseed/core` owns web runtime composition only. Read unqualified "manager" in this document as a legacy term that must be replaced during implementation with provider manager, API assignment function, or human/team capacity policy.

---

## 1. Executive Summary

TreeSeed’s agent architecture should be adjusted so that every agent has a **kernel-level split between planning and acting capacity**.

This should not be implemented as a handler convention, an agent prompt trick, or a Market UI workflow. It should be a first-class scheduling and capacity contract inside the agent kernel and capacity provider system.

The proposed model:

```text
Direction graph
  Objectives + Questions
        ↓
  Proposals
        ↓
  Human-approved Decisions
        ↓
  Agent planning inputs / estimates
        ↓
  Manager capacity plan
        ↓
  Acting workday
        ↓
  Change lanes / verification / releases / packages
```

The agent kernel should have two fundamental operating modes:

```text
Planning mode
  estimates decisions
  evaluates unresolved proposals
  generates proposal ideas
  compares approaches
  improves agent-local documentation when planning work is exhausted

Acting mode
  executes approved, manager-planned work
  reacts to authorized environment inputs
  supports verification / release work
  creates weakness proposals when assigned acting work is exhausted
```

The manager and capacity providers then allocate capacity across these modes before dispatching work.

The result is a system where:

- proposals and decisions remain the governance substrate;
- agents contribute structured estimates before capacity is committed;
- approved decisions become plan-ready only after needed agent inputs are complete;
- capacity allocation becomes a deterministic manager function;
- agents can continuously improve the project and themselves without violating the human-approved decision boundary;
- the Market UI can show plain-language readiness states without owning scheduling logic.

---

## 2. Strategic Fit

TreeSeed is not primarily a chatbot, a project tracker, or an autonomous agent platform. Its differentiator is governed knowledge work:

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

This agent architecture strengthens that chain.

The core rule remains:

> All binding work happens through human-approved decisions.

Agents may draft, summarize, compare, estimate, review, and propose. They should not approve decisions or independently start binding work.

This plan therefore treats agents as **capacity-aware helpers inside a cooperative governance loop**, not as autonomous actors that discover and execute tasks directly.

---

## 3. Architectural North Star

### 3.1 The desired system behavior

For any team-owned project, the system should be able to answer:

1. Which objectives and questions matter most right now?
2. Which proposals are unresolved, weak, duplicated, stale, or ready for decision?
3. Which decisions are approved but not yet estimated?
4. Which agents need to provide planning input before work can be allocated?
5. What credits, capabilities, environments, and agent roles are required?
6. Which approved decisions are ready for acting capacity?
7. What should each agent do with idle planning or acting capacity?
8. Which outputs were generated by planning capacity vs. acting capacity?
9. How accurate were the estimates after actual execution?
10. What should improve in future planning cycles?

### 3.2 The central architectural change

Today, it is easy to think of agents as task handlers that receive a task and run a tool. This plan changes the framing.

The agent runtime should become:

```text
Agent Kernel
  observes eligible work
  receives a capacity envelope
  splits capacity by mode
  selects planning or acting work
  runs bounded mode work
  emits structured outputs
  records telemetry
  falls back safely when no primary work is available
```

Handlers should only execute after the kernel has made a mode decision.

```text
Bad:
  Handler decides whether it is planning or acting.

Good:
  Kernel decides mode, selected input, capacity budget, output contract.
  Handler executes the selected work under that contract.
```

---

## 4. High-Level System Boundaries

Because the current code has changed around hosting and API separation, this plan uses conceptual system boundaries rather than assuming exact current modules.

### 4.1 Market Web UI

The Market web UI should remain the human-facing cooperative workspace.

Responsibilities:

- show objectives, questions, proposals, decisions, workstreams, releases, agents, and share flows;
- display decision readiness and planning status;
- request proposals, estimates, comparisons, and summaries;
- show agent planning and acting capacity in plain language;
- show approved decisions that are waiting on estimates;
- show capacity plans awaiting manager acceptance;
- show workdays and agent outputs;
- never own scheduling, metering, capacity ledger logic, or capability enforcement.

The Market UI should consume stable API contracts rather than reaching into runtime implementation details.

### 4.2 API / Hosted Control Plane

The hosted/API layer should be the system of record for team-owned operational coordination.

Responsibilities:

- teams and projects;
- direction graph records;
- decision policies and approval records;
- agent pool registration;
- agent capacity envelopes;
- workday creation and summaries;
- capacity plans;
- capability grants;
- remote job coordination;
- environment status;
- planning input requests;
- planning input completion status;
- telemetry aggregation;
- inbox/attention items.

The API layer should expose stable operations that both the Market UI and CLI can use.

### 4.3 SDK

The SDK should define the programmable domain and stable contract surface.

Responsibilities:

- typed primitives for Objective, Question, Proposal, Decision, Note, ChangeLane, Release, Template, KnowledgePack;
- typed primitives for Agent, AgentKernelPolicy, CapacityEnvelope, DecisionExecutionInput, CapacityPlan, Workday;
- safe operations for decision-linked work;
- query helpers for direction graph traversal;
- event contracts;
- client methods used by the Market UI, CLI, and hosted/control-plane components.

### 4.4 Agent Runtime

`@treeseed/agent` should own the reusable agent runtime and policy execution logic.

Responsibilities:

- AgentKernel execution;
- mode scheduling;
- queue observation inputs consumed through API/SDK contracts;
- policy evaluation at runtime;
- mode fallback behavior;
- agent-local documentation support;
- runtime output validation;
- telemetry event emission;
- guardrail enforcement hooks;
- provider manager and provider runner integration.

`@treeseed/sdk` should own provider-neutral capacity contracts. `@treeseed/api` should own durable assignment, reservation, lease, mode-run, and ledger records. `@treeseed/core` should not assume that Market UI is colocated with runtime/API implementation and should not own agent scheduling or provider execution.

### 4.5 CLI

The CLI should remain deterministic and scriptable.

Responsibilities:

- inspect direction and decision state;
- request or submit planning inputs;
- inspect capacity plans;
- start or inspect workdays;
- run local agents when supported;
- produce JSON output compatible with API/control-plane ingestion;
- expose technical detail for stewards without requiring ordinary users to see it.

### 4.6 Capacity Providers

Capacity providers should allocate, reserve, meter, and report capacity. They should not define TreeSeed governance rules.

Responsibilities:

- receive workday and agent capacity envelopes;
- reserve planning and acting budgets;
- enforce credit limits;
- provide execution slots;
- report consumed credits and attempts;
- support local, hosted, self-hosted, and hybrid postures;
- integrate with agent pools;
- return unused capacity;
- report provider-specific failures in provider-neutral telemetry.

### 4.7 Agent Pools / Runners

Agent pools execute kernel-selected work.

Responsibilities:

- run agent kernels;
- execute tool calls or handlers inside assigned mode budgets;
- enforce runtime constraints;
- emit ModeRun records;
- stream status and messages;
- report failures and blockers;
- never bypass decision/capability gates.

---

## 5. Core Domain Model Additions

This section names conceptual records. Exact names can change during implementation.

### 5.1 AgentKernelProfile

Defines what an agent is for.

```ts
type AgentKernelProfile = {
  agentId: string;
  teamId: string;
  projectId: string;

  displayName: string;
  role: string;
  focusAreas: string[];

  eligiblePlanningQueues: PlanningQueueName[];
  eligibleActingQueues: ActingQueueName[];

  requiredCapabilities: CapabilityRef[];
  allowedEnvironments: EnvironmentRef[];

  defaultKernelPolicyId: string;
};
```

Purpose:

- make each agent’s scope explicit;
- allow the manager to decide which decisions require this agent’s input;
- prevent general-purpose agents from expanding into every domain;
- support role-specific capacity allocation.

### 5.2 AgentKernelPolicy

Defines mode allocation and fallback behavior.

```ts
type AgentKernelPolicy = {
  policyId: string;

  planningShare: number; // e.g. 0.25
  actingShare: number;   // e.g. 0.75

  minPlanningCredits?: number;
  minActingCredits?: number;
  maxPlanningCredits?: number;
  maxActingCredits?: number;

  planningFallback: "agent_local_documentation" | "return_capacity";
  actingFallback: "weakness_proposal" | "return_capacity";

  maxFallbackProposalDraftsPerWorkday: number;
  maxAgentLocalDocWritesPerWorkday: number;

  staleEstimateAfterHours: number;
  requireDecisionScopeHash: boolean;
  requireCapabilityCheckBeforeActing: boolean;
};
```

Important: this still preserves two fundamental modes. Self-improvement is not a third peer mode; it is planning-mode fallback. Weakness discovery is not unapproved acting; it is acting-mode fallback that can only produce proposal drafts or notes.

### 5.3 WorkdayCapacityEnvelope

Represents the manager’s allocation for a workday.

```ts
type WorkdayCapacityEnvelope = {
  workdayId: string;
  teamId: string;
  projectId: string;

  totalCredits: number;
  planningCredits: number;
  actingCredits: number;

  reserveCredits?: number;

  maxPlanningAttempts: number;
  maxActingAttempts: number;

  maxPlanningFanout: number;
  maxActingFanout: number;

  agentAllocations: AgentCapacityEnvelope[];

  createdFrom: {
    prioritySnapshotId: string;
    directionGraphSnapshotId: string;
    capacityPlanId?: string;
  };
};
```

### 5.4 AgentCapacityEnvelope

The per-agent allocation.

```ts
type AgentCapacityEnvelope = {
  workdayId: string;
  agentId: string;

  planning: {
    credits: number;
    maxAttempts: number;
    eligibleQueues: PlanningQueueName[];
    fallbackAllowed: boolean;
  };

  acting: {
    credits: number;
    maxAttempts: number;
    eligibleQueues: ActingQueueName[];
    fallbackAllowed: boolean;
  };

  hardStops: {
    maxRuntimeMs?: number;
    maxToolCalls?: number;
    maxChildTasks?: number;
  };
};
```

### 5.5 DecisionExecutionInput

The core planning output used for capacity allocation.

```ts
type DecisionExecutionInput = {
  inputId: string;
  decisionId: string;
  proposalIds: string[];
  objectiveIds: string[];
  questionIds: string[];

  agentId: string;
  agentRole: string;

  decisionScopeHash: string;

  summary: string;
  interpretedScope: string;

  proposedWorkUnits: AgentWorkUnitEstimate[];

  requiredCapabilities: CapabilityRef[];
  requiredEnvironments: EnvironmentRef[];

  estimatedCredits: {
    low: number;
    expected: number;
    high: number;
  };

  estimatedAttempts: {
    seedTasks?: number;
    childTaskFactor?: number;
    maxDepth?: number;
    retryRate?: number;
    expectedTaskAttempts: number;
  };

  assumptions: string[];
  dependencies: string[];
  blockers: string[];
  risks: string[];

  confidence: "low" | "medium" | "high";

  status:
    | "submitted"
    | "needs_revision"
    | "accepted"
    | "stale"
    | "superseded";

  createdAt: string;
};
```

This record is the bridge from approved decision to capacity plan.

### 5.6 AgentWorkUnitEstimate

```ts
type AgentWorkUnitEstimate = {
  workUnitId?: string;
  title: string;
  outputType:
    | "proposal"
    | "decision_estimate"
    | "implementation"
    | "review"
    | "verification"
    | "release_support"
    | "documentation"
    | "market_packaging"
    | "weakness_proposal";

  description: string;

  estimatedCredits: {
    low: number;
    expected: number;
    high: number;
  };

  expectedAttempts: number;
  expectedDependencies: string[];

  requiredCapabilities: CapabilityRef[];
  requiredEnvironment?: EnvironmentRef;

  canRunInParallel: boolean;
  mustPrecede?: string[];
  mustFollow?: string[];

  confidence: "low" | "medium" | "high";
};
```

### 5.7 CapacityPlan

The manager-created aggregation of planning inputs.

```ts
type CapacityPlan = {
  capacityPlanId: string;
  teamId: string;
  projectId: string;

  sourceDecisionIds: string[];
  sourceInputIds: string[];

  status:
    | "draft"
    | "needs_more_inputs"
    | "ready_for_manager"
    | "accepted"
    | "scheduled"
    | "in_progress"
    | "completed"
    | "blocked"
    | "superseded";

  totalCredits: {
    planningAlreadySpent: number;
    actingExpected: number;
    actingHigh: number;
    reserve: number;
  };

  allocations: CapacityAllocation[];

  capabilityRequirements: CapabilityRequirement[];
  environmentRequirements: EnvironmentRequirement[];

  blockers: string[];
  assumptions: string[];
  priorityRationale: string;

  createdFromSnapshotId: string;
};
```

### 5.8 CapacityAllocation

```ts
type CapacityAllocation = {
  allocationId: string;
  decisionId: string;
  agentId?: string;
  agentRole?: string;

  mode: "acting";

  workUnits: AgentWorkUnitEstimate[];

  creditsReserved: number;
  creditsHighWatermark: number;

  requiredCapabilities: CapabilityRef[];
  requiredEnvironment?: EnvironmentRef;

  dispatchPolicy: "local" | "remote" | "hybrid" | "manager_selected";

  status:
    | "pending"
    | "reserved"
    | "assigned"
    | "running"
    | "completed"
    | "blocked"
    | "cancelled";
};
```

Planning allocations exist in the workday envelope. The CapacityPlan mostly concerns acting work that can be scheduled after estimates are accepted.

### 5.9 AgentModeRun

Every kernel run should produce this.

```ts
type AgentModeRun = {
  modeRunId: string;
  workdayId: string;
  agentId: string;

  mode: "planning" | "acting";
  fallbackKind?:
    | "agent_local_documentation"
    | "weakness_proposal"
    | "return_capacity";

  selectedInputType:
    | "objective"
    | "question"
    | "proposal"
    | "decision"
    | "capacity_allocation"
    | "environment_event"
    | "agent_local_doc";

  selectedInputId: string;

  outputIds: string[];

  creditsReserved: number;
  creditsConsumed: number;

  attempts: number;

  status:
    | "completed"
    | "blocked"
    | "failed"
    | "cancelled"
    | "returned_unused_capacity";

  telemetry: {
    startedAt: string;
    endedAt: string;
    providerId?: string;
    modelId?: string;
    toolCallCount?: number;
    retryCount?: number;
  };
};
```

---

## 6. Decision and Planning State Machine

### 6.1 Decision state extension

Existing decision states should remain human-governance states. Add execution-readiness states alongside, not as replacements.

```text
Decision governance state:
  draft
  voting
  approved
  rejected
  needs_revision

Decision execution readiness:
  not_applicable
  needs_planning_inputs
  planning_inputs_requested
  planning_inputs_partial
  planning_inputs_complete
  capacity_plan_ready
  capacity_plan_accepted
  scheduled
  in_progress
  completed
  blocked
```

This keeps approval and execution separate.

### 6.2 Decision readiness progression

```text
Decision approved
  ↓
System identifies required agent input roles
  ↓
Planning input requests created
  ↓
Agents consume planning capacity
  ↓
DecisionExecutionInputs submitted
  ↓
Inputs validated and accepted
  ↓
Decision becomes planning_inputs_complete
  ↓
Manager aggregates into CapacityPlan
  ↓
CapacityPlan accepted
  ↓
Decision can feed acting workday
```

### 6.3 Staleness and invalidation

Decision estimates must become stale when important upstream context changes.

Invalidate or mark stale when:

- the approved decision changes;
- linked proposal text changes;
- linked objective/question scope changes materially;
- required capabilities change;
- environment posture changes;
- an estimate exceeds its freshness window;
- telemetry shows estimates for this class are consistently wrong;
- a blocker appears that invalidates the assumed approach.

Use `decisionScopeHash` so an agent input can be tied to the exact scope it estimated.

---

## 7. Planning Mode

### 7.1 Planning mode purpose

Planning mode turns unresolved direction into structured options and turns approved decisions into actionable capacity inputs.

It should not perform binding work.

### 7.2 Planning mode input queues

Recommended queue priority:

1. **Approved decisions missing required agent estimates**
2. **Approved decisions with stale or rejected estimates**
3. **Proposals ready for decision but missing comparison/summary**
4. **Under-review proposals needing critique or amendment suggestions**
5. **Objectives/questions with no viable proposals**
6. **Questions with notes needing summary**
7. **Agent-local documentation improvement**
8. **Return capacity**

Queue item examples:

```ts
type PlanningQueueItem =
  | ApprovedDecisionNeedsEstimate
  | DecisionEstimateNeedsRevision
  | ProposalNeedsComparison
  | ProposalNeedsCritique
  | ObjectiveNeedsProposalIdeas
  | QuestionNeedsSummary
  | AgentLocalDocNeedsUpdate;
```

### 7.3 Planning mode outputs

Planning mode may emit:

- `DecisionExecutionInput`;
- proposal draft;
- proposal critique;
- proposal comparison;
- decision summary draft;
- question summary;
- risk note;
- blocker note;
- capability requirement suggestion;
- agent-local runbook note.

Planning mode may not emit:

- approved decision;
- started change lane;
- direct environment mutation;
- release;
- publication;
- capability grant;
- production deployment.

### 7.4 Decision estimation workflow

For an approved decision:

```text
1. Agent observes an approved decision requiring its role.
2. Kernel verifies the decision is eligible for planning.
3. Kernel reserves planning capacity.
4. Agent reads:
   - objective chain
   - linked questions
   - linked proposals
   - decision record
   - decision notes
   - relevant prior work/telemetry
   - capabilities and environment posture
5. Agent creates DecisionExecutionInput:
   - scope interpretation
   - work unit estimates
   - credit range
   - capabilities
   - dependencies
   - blockers
   - confidence
6. Input is validated.
7. Decision readiness updates.
8. Manager aggregates accepted inputs.
```

### 7.5 Planning fallback: agent-local documentation

When all eligible planning work is estimated or blocked, planning capacity may fall back to improving the agent’s own operating context.

Allowed outputs:

- update agent-local runbook;
- summarize repeated failures;
- document better estimation heuristics;
- record role-specific gotchas;
- improve prompt/tool usage notes;
- identify missing capability assumptions;
- create a proposal suggesting shared process improvement.

Constraints:

- agent-local documentation is scoped to the agent, role, team, and project;
- writes are logged as planning-mode fallback;
- agent-local docs do not change team-wide process;
- promotion from agent-local doc to shared workflow requires a proposal and decision;
- fallback writes should have quotas to avoid self-improvement loops.

---

## 8. Acting Mode

### 8.1 Acting mode purpose

Acting mode executes approved, manager-planned work.

Acting mode should only run when:

- a human-approved decision exists;
- required planning inputs are complete or waived by an authorized human/manager policy;
- a capacity plan has been accepted;
- capability checks pass;
- environment checks pass;
- the work unit applies to the agent;
- credits are reserved.

### 8.2 Acting mode input queues

Recommended queue priority:

1. **Assigned work units from accepted capacity plans**
2. **Verification failures tied to approved decisions**
3. **Release-support work tied to implemented decisions**
4. **Environment events requiring action under an approved decision**
5. **Continuation of active assigned work**
6. **Acting fallback: weakness proposal**
7. **Return capacity**

Queue item examples:

```ts
type ActingQueueItem =
  | AssignedCapacityPlanWorkUnit
  | DecisionLinkedVerificationFailure
  | DecisionLinkedReleaseSupport
  | ApprovedEnvironmentEvent
  | ActiveWorkContinuation
  | WeaknessProposalOpportunity;
```

### 8.3 Acting mode outputs

Acting mode may emit:

- work result;
- implementation artifact;
- verification result;
- release support artifact;
- status update;
- blocker;
- failure;
- note attached to workstream or decision;
- fallback weakness proposal draft.

Acting mode may not emit:

- new approved decision;
- unapproved change lane;
- capability grant;
- production release without release authorization;
- global process mutation;
- unscoped environment change.

### 8.4 Acting fallback: weakness proposals

When acting capacity has no eligible assigned work, the agent should not silently perform improvements. Instead, it should inspect its focus area for weaknesses and create proposals.

Allowed fallback outputs:

- proposal draft;
- risk note;
- objective/question suggestion;
- duplicate/stale work warning;
- capability gap note;
- verification gap proposal;
- documentation gap proposal.

Constraints:

- fallback proposals must be linked to an objective, question, decision, workstream, or clear evidence note;
- duplicate detection should run before creating a proposal;
- proposals should start in `draft` or `under_review`, not `ready_for_decision`;
- no change lane starts from a fallback proposal until humans approve a resulting decision;
- quotas should prevent proposal spam.

---

## 9. Manager and Capacity Provider Integration

### 9.1 Manager role

The manager should not estimate everything itself. It should orchestrate the estimation and allocation process.

Manager responsibilities:

- load project priority snapshot;
- identify unresolved proposal/decision planning needs;
- identify approved decisions eligible for estimation;
- determine which agents need to provide input;
- create planning input requests;
- allocate planning capacity;
- validate incoming estimates;
- aggregate estimates into capacity plans;
- allocate acting capacity;
- start or schedule workdays;
- reconcile telemetry against estimates.

### 9.2 Capacity provider role

The capacity provider should expose provider-neutral capacity primitives:

```text
reserve credits
grant per-agent envelopes
meter attempts
report consumption
enforce hard stops
return unused capacity
report failures
```

It should not decide whether a decision is approved or whether a proposal should be accepted.

### 9.3 Capacity allocation lifecycle

```text
Manager starts planning cycle
  ↓
Capacity provider reserves planning budget
  ↓
Agent kernels run planning mode
  ↓
DecisionExecutionInputs arrive
  ↓
Manager validates completeness
  ↓
Manager creates capacity plan
  ↓
Capacity provider reserves acting budget
  ↓
Agent kernels run acting mode
  ↓
Telemetry updates estimate accuracy
  ↓
Unused capacity returns or moves to allowed fallback
```

### 9.4 Two-pool allocation model

Every workday should split capacity explicitly:

```text
Workday capacity
  Planning pool
    decision estimation
    proposal generation
    proposal comparison
    summaries
    planning fallback docs

  Acting pool
    approved work
    verification
    release support
    environment events
    acting fallback proposals
```

Recommended initial defaults:

```text
Planning share: 20–30%
Acting share:   70–80%
```

But this should be dynamic.

Increase planning share when:

- many approved decisions are missing estimates;
- proposal backlog is weak or stale;
- prior estimates are inaccurate;
- new project area has low confidence;
- major capability/environment posture changed.

Increase acting share when:

- many accepted capacity plans are ready;
- estimates are fresh and high-confidence;
- verification/release queue is backing up;
- planning backlog is low.

Always keep a planning minimum so the system does not become purely reactive.

### 9.5 Capacity reservation semantics

Use a ledger with clear states:

```text
authorized
reserved_planning
consumed_planning
reserved_acting
consumed_acting
returned_unused
expired
overrun_blocked
```

Planning credits are spent to produce estimates and proposals. Acting credits are spent to execute approved work.

Do not let unused acting credits automatically become unbounded planning credits. Fallback behavior should be explicit and policy-constrained.

---

## 10. Agent Kernel Architecture

### 10.1 Required kernel lifecycle

Each agent kernel cycle should follow this shape:

```text
observe()
  load eligible queues and current capacity envelope

prioritize()
  rank eligible planning and acting inputs

chooseMode()
  select planning or acting based on envelope, policy, queue pressure, and manager priority

reserveCapacity()
  reserve mode-specific credits/attempts

prepareContext()
  load bounded context for selected input

runMode()
  execute planning or acting driver

validateOutput()
  ensure output type matches mode and policy

emitOutput()
  create structured records

recordTelemetry()
  log credits, attempts, accuracy inputs, status

fallbackOrReturnCapacity()
  use allowed fallback or return unused capacity
```

### 10.2 Kernel-internal components

Recommended conceptual components:

```text
AgentKernel
  ModeScheduler
  QueueObserver
  PriorityResolver
  CapacityLedgerClient
  CapabilityEvaluator
  ContextAssembler
  PlanningModeDriver
  ActingModeDriver
  FallbackController
  OutputValidator
  TelemetryRecorder
  AgentLocalDocumentationStore
```

### 10.3 ModeScheduler

The ModeScheduler should answer:

- Is planning capacity available?
- Is acting capacity available?
- Which queues have eligible work?
- Which queue pressure is highest?
- Which work is highest priority?
- Is fallback allowed?
- Should capacity be returned?

It should produce an `AgentModeDecision`.

```ts
type AgentModeDecision = {
  mode: "planning" | "acting";
  selectedInputId: string;
  selectedInputType: string;
  capacityGranted: number;
  expectedOutputType: string;
  reason: string;
  fallbackKind?: string;
};
```

### 10.4 OutputValidator

Output validation is critical because it prevents mode leakage.

Examples:

- planning mode can emit `DecisionExecutionInput`;
- planning mode cannot emit `ChangeLaneStarted`;
- acting mode can emit `WorkResult`;
- acting mode fallback can emit `ProposalDraft`;
- acting mode fallback cannot directly apply the proposed fix.

### 10.5 Handler contract

Handlers should receive a mode-bound execution context:

```ts
type AgentExecutionContext = {
  mode: "planning" | "acting";
  selectedInput: PlanningQueueItem | ActingQueueItem;
  capacityBudget: ModeBudget;
  allowedOutputTypes: OutputType[];
  capabilities: CapabilityGrant[];
  environment: EnvironmentContext;
  provenance: DirectionChainContext;
};
```

Handlers should not be able to request arbitrary additional capacity outside the mode envelope.

---

## 11. Planning Inputs for Decisions

### 11.1 Required agent input selection

When a decision is approved, the manager should determine required agent inputs based on:

- linked proposal domains;
- decision type;
- affected project areas;
- required capabilities;
- target environment;
- release/package implications;
- prior workstream ownership;
- team policy;
- agent focus areas.

Example:

```text
Decision: Approve Proposal A to add guided release summary flow

Required inputs:
  Product/design helper
    estimate UI/UX work and user-facing states

  Core/runtime helper
    estimate data and release provenance model impact

  API/control-plane helper
    estimate API/event/status changes

  Publisher/market helper
    estimate Share/Market trust drawer impact

  Verification helper
    estimate testing and release readiness work
```

### 11.2 Input completeness policy

A decision should not become `planning_inputs_complete` until required input roles are satisfied.

Possible policy:

```text
Required:
  at least one owner/manager input
  all critical domain agents
  one verification/security/release-readiness input if production-facing

Optional:
  market/publishing input when output may be packaged
  cost/revenue input when billing or credits are affected
```

### 11.3 Handling missing or blocked inputs

If an agent cannot estimate:

- submit a blocker, not an empty estimate;
- explain missing context;
- request clarification;
- mark confidence low;
- identify required human decision or capability.

The manager can then:

- request more context;
- route to another agent;
- waive the input with human authorization;
- split the decision;
- return to proposal revision;
- block capacity planning.

---

## 12. Capacity Plan Construction

### 12.1 Aggregation inputs

The manager aggregates:

- approved decision priority;
- accepted DecisionExecutionInputs;
- capability requirements;
- environment requirements;
- team budget/credits;
- agent pool availability;
- historical telemetry;
- outstanding workstreams;
- release deadlines;
- dependency graph.

### 12.2 Aggregation process

```text
1. Group estimates by decision.
2. Normalize work units.
3. Detect duplicate or overlapping work.
4. Identify dependencies.
5. Identify capabilities and environment targets.
6. Resolve sequencing.
7. Apply retry/risk reserve.
8. Compute expected and high credit needs.
9. Compare against available credits.
10. Create draft CapacityPlan.
11. Ask manager/human steward to accept, revise, or defer.
```

### 12.3 Credit calculation model

Use ranges, not single-point estimates.

```text
Expected acting credits =
  sum(expected work unit credits)
  + provider overhead
  + expected retry allowance
  + coordination overhead

High acting credits =
  sum(high work unit credits)
  + worst reasonable retry allowance
  + blocker reserve
```

Estimate accuracy should improve from telemetry over time.

Telemetry dimensions:

- agent role;
- output type;
- mode;
- provider;
- environment;
- capability;
- decision category;
- proposal category;
- estimated credits;
- consumed credits;
- expected attempts;
- actual attempts;
- blocker frequency.

### 12.4 Allocation result

A capacity plan should produce:

- prioritized acting allocations;
- per-agent acting envelopes;
- credit reserve;
- required capabilities;
- environment checks;
- blockers;
- manager summary;
- plain-language UI summary.

Example UI wording:

```text
Ready to plan:
  4 agent estimates complete.
  Expected acting cost: 310 credits.
  High estimate: 470 credits.
  Required capabilities: Agent execution, Project runner, Workflow operations.
  Required environment: Local + Staging.
  Main risk: verification impact is uncertain.
```

---

## 13. UI Integration

### 13.1 Project Overview

Add or refine status cards:

```text
Approved — needs estimates
Planning inputs underway
Capacity plan ready
Scheduled for workday
Acting in progress
Blocked by capability
Blocked by environment
Estimate stale
```

The "Next best action" card should understand these states.

Examples:

```text
Request estimates for Decision D-14
Review capacity plan for Decision D-14
Enable remote jobs for planned work
Start workday for approved plan
Review agent blocker on Decision D-14
```

### 13.2 Direct / Direction board

Decision cards should show execution-readiness independently from approval state.

Decision card fields:

- governance status;
- execution readiness;
- required agent inputs;
- estimates complete count;
- expected credits;
- blockers;
- linked capacity plan;
- next action.

Detail panel tabs:

```text
Overview
Notes
Activity
Links
Planning
Capacity
```

The Planning tab should show:

- required agent inputs;
- submitted inputs;
- missing inputs;
- confidence;
- estimated credit range;
- blockers;
- stale warnings;
- request/re-request input action.

### 13.3 Agents page

The Agents page should show the two-mode model in human language.

Default table additions:

- planning capacity today;
- acting capacity today;
- current mode;
- selected input;
- output type;
- fallback activity;
- estimate accuracy trend;
- blockers.

Example:

```text
Agent: Release Helper
Role: prepares release summaries and trust notes
Current mode: Planning
Working on: estimating Decision D-14
Output type: decision estimate
Planning budget: 18 / 40 credits used
Acting budget: 0 / 120 credits used
Status: running
```

Toggle views:

```text
Overview
Planning queue
Acting queue
Estimates
Messages
Failures
Local docs
```

### 13.4 Start Change modal

Start Change should require an approved decision and should show planning readiness.

If estimates are incomplete:

```text
This decision is approved, but not ready for work.
2 of 4 required agent estimates are complete.
Next: request missing estimates.
```

If complete:

```text
This decision is approved and ready to plan.
Expected acting cost: 310 credits.
High estimate: 470 credits.
Required capabilities: Agent execution, Project runner.
Next: review capacity plan.
```

If capacity plan is accepted:

```text
This decision is ready for work.
Capacity has been reserved.
Next: start workday.
```

### 13.5 Workstreams

Workstream detail should show:

- linked decision;
- capacity plan;
- acting allocation;
- estimates that informed the allocation;
- actual consumed credits;
- variance from estimate;
- agent outputs.

### 13.6 Settings

Add plain-language policy controls:

- default planning/acting split;
- minimum planning reserve;
- maximum fallback proposal drafts per day;
- agents allowed to estimate decisions;
- agents allowed to act;
- which roles can accept capacity plans;
- stale estimate window;
- automatic fallback enabled/disabled;
- capability grants for agent execution and remote jobs.

---

## 14. API Contract Sketches

These are conceptual API operations, not final route names.

### 14.1 Direction graph and readiness

```http
GET /projects/{projectId}/direction-graph?include=readiness
GET /projects/{projectId}/decisions?status=approved&readiness=needs_planning_inputs
GET /decisions/{decisionId}/planning-status
```

### 14.2 Planning input requests

```http
POST /decisions/{decisionId}/planning-input-requests
GET /decisions/{decisionId}/planning-input-requests
POST /planning-input-requests/{requestId}/cancel
```

Request body sketch:

```json
{
  "requiredAgentRoles": ["core-runtime", "api-control-plane", "verification"],
  "priority": "high",
  "reason": "Decision approved and ready for capacity planning"
}
```

### 14.3 Agent outputs

```http
POST /decision-execution-inputs
GET /decisions/{decisionId}/execution-inputs
POST /decision-execution-inputs/{inputId}/accept
POST /decision-execution-inputs/{inputId}/request-revision
```

### 14.4 Capacity plans

```http
POST /capacity-plans
GET /projects/{projectId}/capacity-plans
GET /capacity-plans/{capacityPlanId}
POST /capacity-plans/{capacityPlanId}/accept
POST /capacity-plans/{capacityPlanId}/schedule
POST /capacity-plans/{capacityPlanId}/supersede
```

### 14.5 Workdays

```http
POST /workdays
GET /workdays/{workdayId}
POST /workdays/{workdayId}/start
POST /workdays/{workdayId}/pause
POST /workdays/{workdayId}/complete
GET /workdays/{workdayId}/summary
```

### 14.6 Agent kernel runs

```http
POST /agent-mode-runs
PATCH /agent-mode-runs/{modeRunId}
GET /agents/{agentId}/mode-runs
GET /agents/{agentId}/capacity-envelope
```

### 14.7 Telemetry

```http
POST /telemetry/agent-mode-run
POST /telemetry/estimate-accuracy
GET /projects/{projectId}/estimate-accuracy
GET /agents/{agentId}/estimate-accuracy
```

---

## 15. SDK Surface Sketch

The SDK should hide transport details and expose safe operations.

Example conceptual client methods:

```ts
sdk.decisions.requestPlanningInputs(decisionId, policy);
sdk.decisions.listExecutionInputs(decisionId);
sdk.decisions.acceptExecutionInput(inputId);

sdk.capacity.createPlan(projectId, sourceDecisionIds);
sdk.capacity.acceptPlan(capacityPlanId);
sdk.capacity.scheduleWorkday(capacityPlanId);

sdk.agents.getCapacityEnvelope(agentId);
sdk.agents.runKernelCycle(agentId, workdayId);
sdk.agents.submitModeRun(modeRun);

sdk.telemetry.recordEstimateAccuracy(event);
```

Domain helpers:

```ts
sdk.direction.getUpstreamChain(decisionId);
sdk.direction.computeDecisionScopeHash(decisionId);
sdk.capacity.aggregateDecisionInputs(inputs);
sdk.capacity.validateCapabilityRequirements(plan);
sdk.agents.selectRequiredInputRoles(decision);
```

---

## 16. CLI Integration

CLI commands should be deterministic, scriptable, and JSON-friendly.

Conceptual examples:

```bash
treeseed decisions planning-status D-14 --json

treeseed decisions request-estimates D-14 \
  --roles core-runtime,api-control-plane,verification

treeseed agents run-planning \
  --agent release-helper \
  --workday WD-2026-06-07 \
  --json

treeseed capacity plan \
  --decision D-14 \
  --json

treeseed workday start \
  --capacity-plan CP-22 \
  --json

treeseed agents telemetry \
  --workday WD-2026-06-07 \
  --json
```

The CLI should support local/self-hosted workflows without requiring Market UI.

---

## 17. Provider Contract

Capacity providers should implement a stable contract.

### 17.1 Required operations

```ts
interface CapacityProvider {
  reservePlanningCapacity(request: PlanningCapacityReservation): Promise<CapacityReservation>;
  reserveActingCapacity(request: ActingCapacityReservation): Promise<CapacityReservation>;

  grantAgentEnvelope(request: AgentEnvelopeRequest): Promise<AgentCapacityEnvelope>;

  startModeRun(request: StartModeRunRequest): Promise<ModeRunHandle>;
  reportModeRun(event: AgentModeRun): Promise<void>;

  returnUnusedCapacity(request: ReturnCapacityRequest): Promise<void>;

  getProviderStatus(): Promise<ProviderStatus>;
}
```

### 17.2 Provider neutrality

Provider implementations may vary:

- local runner;
- hosted runner;
- self-hosted runner;
- hybrid;
- test/simulation provider;
- paid compute provider.

But they must agree on:

- planning vs. acting credit categories;
- attempts;
- run status;
- returned unused capacity;
- mode run telemetry;
- error/failure shape;
- capability enforcement points.

### 17.3 Capability enforcement

Before acting-mode dispatch:

```text
Check approved decision
Check accepted capacity plan
Check assigned work unit
Check agent eligibility
Check capability grants
Check environment posture
Check credit reservation
```

If any check fails, do not run acting mode. Emit a blocker/inbox item.

---

## 18. Telemetry and Learning Loop

### 18.1 Estimate accuracy

For every completed acting work unit, record:

- estimated low/expected/high credits;
- actual consumed credits;
- estimated attempts;
- actual attempts;
- estimated dependencies;
- actual blockers;
- confidence rating;
- agent role;
- output type;
- provider;
- environment;
- decision category.

Use this to improve future planning.

### 18.2 Agent self-improvement

Planning fallback should be driven by telemetry.

Examples:

```text
If estimates are consistently low:
  update agent-local estimation heuristic.

If verification blockers recur:
  create a weakness proposal.

If proposal drafts are often superseded:
  improve proposal checklist.

If capability blockers recur:
  draft capability policy improvement proposal.
```

### 18.3 Manager-level summaries

Workday summary should include:

- planning credits spent;
- acting credits spent;
- fallback credits spent;
- estimates produced;
- decisions made plan-ready;
- capacity plans created;
- work units completed;
- proposals generated from weaknesses;
- estimate variance;
- blockers;
- returned unused capacity.

---

## 19. Safety and Governance Guardrails

### 19.1 Non-negotiable rules

1. Agents cannot approve decisions.
2. Agents cannot start change lanes without an approved decision.
3. Acting mode cannot run without an accepted capacity plan unless explicitly allowed by a human-controlled emergency policy.
4. Planning fallback cannot mutate shared process directly.
5. Acting fallback can draft proposals but cannot perform the proposed fix.
6. Capability grants must be checked before execution.
7. Environment posture must be checked before execution.
8. All agent outputs must be linked to direction/provenance records.
9. Capacity consumption must be metered by mode.
10. Estimate staleness must be visible.

### 19.2 Anti-spam controls

Fallback proposal generation needs quotas:

```text
max fallback proposals per agent per workday
max duplicate proposals per objective
min evidence requirement
cooldown after rejected proposal
manager review before ready-for-decision
```

### 19.3 Human override

Humans with appropriate roles should be able to:

- waive a missing agent input;
- request a new estimate;
- reject an estimate;
- accept a low-confidence plan knowingly;
- change planning/acting split;
- disable fallback;
- block an agent from acting;
- approve additional capability use.

Overrides should be audited.

---

## 20. Migration and Implementation Roadmap

### Phase 0 — Reconcile With Current Codebase

Goal: map this architecture onto the latest hosting/API-separated implementation.

Tasks:

- identify current package boundaries across SDK, CLI, Core, API/hosted layer, and Market UI;
- identify where agent runtime currently lives;
- identify existing capacity provider abstractions;
- identify current decision/proposal/objective schemas;
- identify existing hosted runner/agent pool mechanisms;
- identify current API contracts used by Market UI;
- identify whether workday/capacity summaries already exist;
- identify current telemetry/event model;
- document mismatch between this plan and current implementation.

Deliverable:

```text
Architecture reconciliation memo:
  current location
  target location
  migration risk
  owner
  sequencing dependency
```

### Phase 1 — Domain Model and Status Extensions

Goal: introduce planning readiness without changing acting execution yet.

Add conceptual primitives:

- Decision execution readiness;
- PlanningInputRequest;
- DecisionExecutionInput;
- AgentKernelPolicy;
- AgentCapacityEnvelope;
- AgentModeRun;
- CapacityPlan draft shape.

Implementation focus:

- SDK types;
- API persistence;
- migrations;
- event names;
- UI read-only display;
- CLI inspection commands.

Acceptance criteria:

- an approved decision can be marked as needing planning inputs;
- required agent input roles can be recorded;
- a DecisionExecutionInput can be stored and retrieved;
- estimate staleness can be represented;
- Market UI can display readiness separately from approval.

### Phase 2 — Planning-Only Kernel Path

Goal: make planning mode real before acting mode changes.

Build:

- AgentKernel with planning mode;
- planning queues;
- decision estimation handler contract;
- output validation for DecisionExecutionInput;
- planning capacity envelope;
- mode run telemetry;
- planning fallback to agent-local documentation.

Do not yet allow acting dispatch through the new model.

Acceptance criteria:

- manager can request estimates for an approved decision;
- eligible agents consume planning capacity;
- agents submit structured estimates;
- estimates link to decision scope hash;
- planning fallback writes are scoped and logged;
- no binding work can be triggered from planning mode.

### Phase 3 — Manager Capacity Plan

Goal: aggregate estimates into actionable capacity plans.

Build:

- capacity plan builder;
- estimate normalization;
- dependency grouping;
- credit range calculation;
- capability requirement aggregation;
- environment requirement aggregation;
- manager/human acceptance flow.

Acceptance criteria:

- multiple agent estimates can become one draft plan;
- plan shows expected/high credit ranges;
- plan shows missing capabilities and blockers;
- plan can be accepted or sent back for revision;
- accepted plan does not yet need to execute acting work.

### Phase 4 — Acting Mode Integration

Goal: route approved work through acting capacity.

Build:

- acting capacity envelopes;
- acting queues;
- work unit assignment;
- capability checks;
- environment checks;
- acting mode run records;
- acting output validation;
- integration with workstreams/change lanes.

Acceptance criteria:

- acting mode only runs from accepted capacity plans;
- acting outputs link to approved decisions;
- consumed acting credits are metered separately;
- capability/environment failures create blockers;
- workstream detail shows linked plan and estimates.

### Phase 5 — Fallback Behavior

Goal: make idle capacity productive without violating governance.

Build:

- planning fallback to agent-local docs;
- acting fallback to weakness proposals;
- duplicate proposal detection;
- fallback quotas;
- fallback telemetry;
- UI display of fallback outputs.

Acceptance criteria:

- idle planning capacity can improve agent-local docs;
- idle acting capacity can draft weakness proposals;
- fallback proposals do not start work;
- fallback activity is visible and auditable;
- quotas prevent noisy proposal generation.

### Phase 6 — Market UI Readiness Experience

Goal: make the process understandable for non-technical users.

Build:

- Project Overview readiness cards;
- Direct decision Planning tab;
- capacity plan review UI;
- Agents capacity split view;
- Start Change readiness checks;
- workstream estimate/actual comparison;
- inbox items for blockers.

Acceptance criteria:

- users can see why an approved decision is not yet actionable;
- users can request missing estimates;
- users can review capacity plans in plain language;
- users can see agent planning vs. acting work;
- users can start work only when governance and capacity gates pass.

### Phase 7 — Telemetry and Estimation Learning

Goal: make estimates improve.

Build:

- estimate accuracy telemetry;
- variance reports;
- per-agent/per-output-type calibration;
- manager summaries;
- stale estimate warnings;
- feedback into agent-local documentation.

Acceptance criteria:

- actuals are compared to estimates;
- repeated estimate bias is visible;
- agents can improve estimation heuristics through planning fallback;
- managers can see which agents/roles estimate reliably.

### Phase 8 — Hardening and Policy Controls

Goal: make the architecture safe enough for managed/self-hosted/hybrid projects.

Build:

- policy management;
- role-based overrides;
- capability approval flows;
- emergency pause;
- provider failure handling;
- idempotency and concurrency controls;
- audit trail;
- admin/steward views.

Acceptance criteria:

- no handler can bypass mode selection;
- no acting run can bypass decision/capability checks;
- mode runs are idempotent;
- concurrent estimates do not corrupt readiness state;
- self-hosted and hosted providers report compatible telemetry.

---

## 21. Concurrency and Idempotency

This architecture will create many asynchronous records. It needs strong idempotency.

Recommended patterns:

- immutable decision scope snapshots for estimation;
- idempotency keys for planning input requests;
- idempotency keys for mode runs;
- optimistic locking on decision readiness;
- append-only event log for agent output;
- explicit supersession of stale estimates;
- plan versioning;
- no in-place mutation of accepted capacity plans except status transitions.

Example:

```text
Decision D-14 approved
  scope hash = abc123

Agent estimate input submitted
  decisionId = D-14
  decisionScopeHash = abc123

Proposal changed after approval
  new scope hash = def456
  prior estimates become stale
```

---

## 22. Testing Strategy

### 22.1 Unit tests

- mode selection policy;
- queue priority ordering;
- fallback eligibility;
- output validation by mode;
- estimate staleness;
- capacity range math;
- capability requirement aggregation.

### 22.2 Integration tests

- approved decision → planning input request → agent estimate → capacity plan;
- stale estimate invalidation;
- missing capability blocker;
- accepted capacity plan → acting run;
- acting fallback proposal;
- planning fallback local doc write;
- Market UI state derived from API readiness.

### 22.3 End-to-end tests

Scenario:

```text
Team creates objective.
Team creates question.
Agent drafts proposal.
Human compares proposal with human proposal.
Decision approved.
Manager requests estimates.
Three agents submit estimates.
Capacity plan created.
Manager accepts plan.
Workday starts.
Acting agents complete work.
Verification runs.
Release includes decision.
Share package includes provenance.
Telemetry updates estimate accuracy.
```

### 22.4 Simulation tests

Use a simulated capacity provider to test:

- credit exhaustion;
- retry inflation;
- child task fanout;
- provider failure;
- returned unused capacity;
- stale estimate after context change;
- proposal spam guardrails.

---

## 23. Observability

Dashboards should include:

```text
Planning capacity consumed by project
Acting capacity consumed by project
Planning backlog
Approved decisions missing estimates
Capacity plans ready for review
Estimate accuracy by agent
Estimate accuracy by output type
Fallback proposals created
Fallback docs written
Unused capacity returned
Capability blockers
Environment blockers
Workdays completed
```

Logs/events should always include:

- teamId;
- projectId;
- agentId;
- workdayId;
- mode;
- selected input;
- output ids;
- decision id if applicable;
- proposal id if applicable;
- capacity reserved/consumed;
- capability checks;
- environment checks;
- provider id;
- status.

---

## 24. Product and UX Language

Use human language first.

Recommended terms:

```text
Planning capacity
  "Time helpers spend preparing options, estimates, and summaries."

Acting capacity
  "Time helpers spend working on approved decisions."

Decision estimate
  "A helper's view of what this approved decision will take."

Capacity plan
  "A manager-reviewed plan for how much helper work is needed."

Weakness proposal
  "A suggested improvement found when a helper had no approved work to do."

Agent-local documentation
  "A helper's private operating notes for doing its role better."
```

Avoid user-facing jargon:

- kernel;
- handler;
- child task factor;
- fanout;
- execution class;
- raw capability strings.

Show technical details behind expansion controls for stewards.

---

## 25. Key Risks and Mitigations

### Risk: agents create too many proposals

Mitigation:

- fallback quotas;
- duplicate detection;
- evidence requirement;
- default draft status;
- manager review before decision-ready.

### Risk: planning capacity crowds out acting capacity

Mitigation:

- minimum acting share;
- dynamic allocation;
- backlog-based tuning;
- manager override.

### Risk: acting capacity starts without full planning

Mitigation:

- separate approval state from execution readiness;
- capacity plan acceptance gate;
- capability checks;
- environment checks;
- audit events.

### Risk: estimates become stale

Mitigation:

- decision scope hash;
- freshness windows;
- automatic staleness after upstream changes;
- UI stale warning.

### Risk: handler bypasses kernel mode

Mitigation:

- mode-bound execution context;
- output validation;
- capability checks in provider/runtime;
- integration tests;
- audit records.

### Risk: Market UI reabsorbs orchestration logic

Mitigation:

- stable API contracts;
- UI reads readiness from API;
- UI sends user intent, not scheduling commands;
- API/control-plane owns orchestration.

### Risk: latest hosting/API split changes target boundaries

Mitigation:

- Phase 0 reconciliation;
- conceptual boundary mapping;
- no low-level package assumptions;
- migration plan before code changes.

### Risk: self-improvement becomes hidden global mutation

Mitigation:

- agent-local docs only;
- promotion requires proposal/decision;
- write quotas;
- visible activity logs.

### Risk: capacity providers diverge

Mitigation:

- provider-neutral contract;
- conformance tests;
- simulated provider;
- common telemetry schema.

---

## 26. Open Architectural Questions

1. Should capacity plans be accepted by a human manager role, an automated manager policy, or both?
2. Which decisions require estimates from all relevant agents vs. a quorum of agents?
3. Should low-risk decisions be allowed to skip some planning inputs?
4. Should planning and acting happen in the same workday or in separate planning/acting workdays?
5. How should capacity be priced across planning vs. acting when planning improves future efficiency?
6. Should agent-local documentation be portable across projects or scoped to each project?
7. How are agent focus areas configured: static roles, learned capabilities, or team templates?
8. Should fallback proposals count against proposal limits differently than human proposals?
9. Should Market listings expose aggregate planning/decision provenance, and at what level?
10. What is the correct boundary between Core agent runtime and hosted control-plane orchestration after the API split?

---

## 27. Recommended First Implementation Slice

The best first slice is not full autonomous acting. It is **decision estimation through planning mode**.

Build this first:

```text
Approved Decision
  → required agent input roles
  → planning input request
  → planning capacity envelope
  → agent planning kernel run
  → DecisionExecutionInput
  → planning readiness status
  → capacity plan draft
```

Do not start with acting fallback, proposal discovery, or complex self-improvement.

Why:

- it directly supports the decision estimation process;
- it reinforces the human-approved decision boundary;
- it gives the manager real inputs for capacity allocation;
- it can be shown clearly in Market UI;
- it can run before acting mode is fully reworked;
- it creates telemetry foundations for later phases.

Acceptance criteria for first slice:

```text
A user approves a decision.
The system says: "This decision needs estimates."
The manager requests agent estimates.
Relevant agents spend planning capacity.
Each agent submits a structured estimate.
The decision becomes "Planning inputs complete."
The manager sees a draft capacity plan with expected/high credits.
No work starts automatically.
```

---

## 28. Final Target Model

The final architecture should feel like this:

```text
Humans set direction.
Humans and agents create proposals.
Humans approve decisions.
Agents estimate approved decisions using planning capacity.
The manager turns estimates into capacity plans.
Agents act only on accepted plans using acting capacity.
Idle planning capacity improves the agent's own operating knowledge.
Idle acting capacity produces new proposals, not unapproved changes.
Telemetry teaches the system how to estimate better next time.
```

This makes TreeSeed’s agents more useful without making them sovereign.

The central product promise remains intact:

```text
No important knowledge work becomes real until the team can see:
  what it supports,
  who proposed it,
  who approved it,
  what capacity it needs,
  what changed,
  what was verified,
  and how it can be shared or reused.
```
