# TreeSeed Capacity Provider, Agent Execution, and Coordination Architecture

**Status:** Architecture specification for next implementation iteration  
**Date:** 2026-06-08  
**Scope:** TreeSeed API/control plane, SDK capacity model, Market UI, project-bundled agents, capacity provider runtime, execution providers, provider managers/runners  
**Audience:** TreeSeed architecture, SDK/API, agent runtime, provider runtime, Market UI, and CLI implementation teams  

**Important caveat:** This document refines the architecture in [agent_kernel_capacity_plan.md](agent_kernel_capacity_plan.md). It assumes capacity providers may be unreachable by inbound network calls and therefore coordinates through provider-initiated check-in and durable API records.

**Canonical implementation set:** Use this document as the durable coordination architecture together with [agent-capacity-implementation-roadmap.md](agent-capacity-implementation-roadmap.md), [agent-capacity-domain-model.md](agent-capacity-domain-model.md), [agent-kernel-mode-runtime.md](agent-kernel-mode-runtime.md), and [agent-capacity-operator-surfaces.md](agent-capacity-operator-surfaces.md).

For the execution-provider migration that unifies AI model providers, deterministic automation, and human issue queues behind the same assignment lifecycle, see [Human-Machine Execution Providers](./human-machine-providers.md).

**Package ownership:** `@treeseed/agent` owns provider runtime, provider manager/runner behavior, AgentKernel execution, and mode scheduling. `@treeseed/sdk` owns shared contracts. `@treeseed/api` owns durable coordination records and assignment functions. `@treeseed/core` owns web runtime composition and does not own provider scheduling or agent execution.

---

## 1. Executive Summary

TreeSeed capacity coordination should be organized around a durable API/control-plane assignment model, not a new central long-running scheduler service. The TreeSeed API knows team/project demand, governance state, allocation policy, decision readiness, and ledger history. Capacity providers know their local execution surfaces, native budgets, availability windows, runner pressure, and provider-local constraints.

The target flow is:

```text
Humans allocate capacity policy.
Projects define agents and agent classes.
Providers check in when available.
TreeSeed API matches project demand to provider supply.
Provider managers claim leased assignments.
Project-bundled agents execute on provider execution surfaces.
Usage is reported back to the TreeSeed ledger.
Telemetry improves future estimates and routing.
```

The key boundary correction is:

```text
Agents are bundled with projects, not capacity providers.
Capacity providers bundle execution providers, runners, native capacity, and availability.
```

This means capacity providers do not bring TreeSeed work semantics such as "research", "writing", "implementation", "testing", or "security review". Those are project-owned agent definitions, project agent classes, generic handler selections, and project-specific domain mappings. A capacity provider brings runnable execution capacity, such as an OpenAI Pro subscription, an OpenRouter/OpenCode budget, a GitHub Copilot budget, a local model runner, a human review pool, or custom automation runners.

The TreeSeed API coordinates the match between:

- project demand: objectives, proposals, approved decisions, planning inputs, capacity plans, and workday priorities;
- project execution intent: agent classes, handlers, prompts/configuration, output types, and required execution capabilities;
- provider supply: execution providers, native limits, runner concurrency, availability windows, grants, and recent observations;
- policy envelopes: team workday schedules, portfolio allocation, project agent-class allocation, planning/acting splits, reserves, soft caps, hard caps, and borrowing rules.

---

## 2. Core Principles

1. **No new central long-running coordinator service.** Cross-provider coordination happens through deterministic API assignment logic invoked during provider check-in, provider next-assignment requests, and normal API state transitions.
2. **TreeSeed API is a durable coordination and assignment surface.** It stores demand, policies, provider sessions, assignments, leases, reservations, ledgers, and telemetry.
3. **Providers initiate contact through outbound check-in.** The API must not require inbound network reachability to local laptops, firewalled hosts, or self-hosted provider networks.
4. **Providers are authoritative for native capacity, local runner availability, and provider-local constraints.** TreeSeed can derive and summarize availability, but providers can always report pressure, reject work, return work, or reduce supply when native conditions change.
5. **TreeSeed is authoritative for team/project demand, governance, decisions, allocation policies, reservations, and ledger settlement.** Providers cannot approve decisions, mutate allocation policies, or decide cross-provider team priorities.
6. **Projects own agent definitions and work semantics.** Project content/configuration defines agent classes, agent definitions, handlers, prompts, class-to-handler mappings, output expectations, and required execution capabilities.
7. **Capacity providers own execution surfaces and runner mechanics.** They bundle execution providers, runner pools, native quota/spend limits, local availability, and provider-local enforcement.
8. **Workdays are TreeSeed-side coordination/accounting windows, not provider-owned calendars.** A provider may participate in all, part, or none of a TreeSeed workday.
9. **Provider availability windows constrain participation in a workday.** Provider sessions and assignment leases must fit the provider's reported availability and grant policy.
10. **Planning and acting remain separate execution modes.** Planning prepares estimates, comparisons, summaries, and proposal drafts. Acting executes approved, capacity-planned work.
11. **Human allocation policies create budgets and targets, not hard task prescriptions unless explicitly configured.** Allocation slices are target envelopes by default. Soft caps and hard caps must be explicit.
12. **All execution must be traceable.** Every reservation, assignment, mode run, and usage actual must be traceable to project, decision/proposal context, agent class, mode, provider, execution provider, lease/reservation, and ledger entry.

---

## 3. System Boundary Definitions

### TreeSeed API / Control Plane

The TreeSeed API/control plane is the durable coordination authority for team and project work.

Responsibilities:

- teams, projects, and portfolios;
- objectives, questions, proposals, and decisions;
- decision readiness and planning-input status;
- workday schedules and workday summaries;
- allocation policies and allocation-set versions;
- provider registrations and grants;
- provider check-in sessions;
- provider availability snapshots;
- assignment selection and leased assignment records;
- capacity reservations and routing decisions;
- capacity ledgers and settlement;
- task/mode run telemetry;
- UI and CLI API contracts.

Non-responsibilities:

- hosting provider-local runners;
- initiating inbound calls to providers;
- owning native provider credentials;
- owning project agent definitions;
- running a separate scheduler daemon for cross-provider coordination;
- directly controlling provider-local model, tool, or runner internals.

The API's assignment function is request-scoped. It can run during provider check-in, next-assignment requests, or explicit user/admin actions. It is deterministic, idempotent, bounded, and explainable. The implemented function rejects candidates unless the provider is active, the provider has an open availability session inside any reported availability window, required work-unit and project-agent-class capabilities are covered by provider/session capabilities, at least one active matching grant is also reported in the provider session check-in, attached workdays are active, acting work has accepted/scheduled/active capacity-plan provenance and ready or waived readiness, and runner pressure has room for another lease.

### TreeDX Access Boundary

TreeSeed agents and capacity-provider runners should not receive raw TreeDX service URLs and bearer tokens as their normal content-repository interface. The TreeSeed API/control plane should expose authenticated, project-scoped DX routes, such as `/v1/dx/projects/:projectId/...`, and should perform the following responsibilities before forwarding to TreeDX:

- authenticate the caller as either a TreeSeed user/service principal with project access or a same-team capacity provider with the required provider task scopes;
- for provider callers, require `x-treeseed-assignment-id` and `x-treeseed-treedx-proxy-handle-id`, then verify the provider owns the active leased assignment and the handle matches team, project, assignment, repository, workspace, expiry, revocation state, allowed operation, and allowed path scope;
- resolve the project library and repository topology to the correct private or public TreeDX node;
- hold and rotate the TreeDX node credential or node-to-node trust token;
- verify that repository and workspace operations are scoped to the project binding;
- forward only allowed TreeDX operations such as file read/write, workspace search, commit, context build, and repository readback;
- record project-visible TreeDX proxy audit rows for successful and denied provider calls;
- redact TreeDX credentials from provider assignment payloads, audit logs, reports, and UI surfaces.

Local and production TreeDX authentication should use the same connected-auth process. TreeDX verifies a scoped JWT or configured trust token issued for a TreeSeed API service principal; local development must not depend on TreeDX dev-token shortcuts or hardcoded demo principals. The SDK/reconciler declares the TreeDX issuer, audience, signing secret reference, bootstrap trust actor, tenant, and capability envelope for each local or hosted TreeDX instance. TreeDX remains product-neutral: it only consumes the configured trust grant, while TreeSeed owns the mapping from authenticated TreeSeed users/capacity providers to project-scoped DX proxy calls.

The provider assignment payload should therefore include a DX proxy handle rather than a TreeDX credential:

```json
{
  "workspace": {
    "treeDx": {
      "apiBaseUrl": "http://127.0.0.1:3000",
      "proxyBasePath": "/v1/dx/projects/project_123",
      "projectId": "project_123",
      "repoId": "repo_456",
      "workspaceId": "workspace_789"
    }
  }
}
```

Provider runners call this proxy using `TREESEED_CAPACITY_PROVIDER_API_KEY` plus the active assignment id and proxy handle id. The package-owned runner hydrates `AgentContext.treeDx` from the assignment handle, applies handle-bound defaults locally, and rejects out-of-scope handler requests before calling the API. Project handlers can read injected markdown context, stage content changes, commit workspaces, and verify readback through the same path a production private TreeDX deployment will use.

Provider assignments also carry a redacted `capabilityHandles` bundle for repository access, TreeDX workspace access, workflow-operation dispatch, and secret-use references. The provider runner hydrates `AgentContext.capacity.capabilityHandles` and `workspaceAccessMode` from that bundle. Workflow operations use the assignment-scoped provider route and a matching handle id; providers must not receive GitHub App installation tokens, deploy keys, TreeDX node credentials, or customer project secret values.

TreeDX is the SDK default content backend. SDK callers that omit `contentRepository.adapter` are in TreeDX-required mode, and missing `TREESEED_TREEDX_BASE_URL` or `TREESEED_TREEDX_URL` causes content operations to fail fast rather than falling back to local files. Explicit local filesystem content remains available for tests, local fixture bootstrap, and project spec loading through `contentRepository: { adapter: 'local' }`.

When an assignment has an allowed tool catalog and a valid TreeDX proxy handle, the provider runner attaches redacted `agent_tool` descriptors to `ExecutionProviderInvocation.tools`. TreeDX-backed tools use the TreeSeed API proxy routes plus provider runtime headers; SDK-backed operation tools call `AgentSdk.dispatch`, using API passthrough when configured and local execution only for operations whose dispatch policy permits it. Model-aware content tools use SDK content rendering and validation before writing through TreeDX workspace routes, so agents do not hand-author frontmatter for questions, proposals, notes, books, knowledge pages, people, agents, or other content-backed models. Content writes must use TreeDX workspace write and commit when workspace access is granted. Local file writes remain reserved for code, verification artifacts, temporary worktrees, package files, and other non-content artifacts.

Allowed tools are filtered by runtime requirements before they reach an execution provider. The provider runner records `{ requested, exposed, omitted }` catalog metadata so operators can see when a content definition allowed a tool but the assignment lacked a TreeDX proxy handle, `contentAccess` model/action policy, writable workspace, commit capability, worktree, SDK dispatch context, or provider-local git capability. Omitted tools are not callable.

### Project

A project owns work semantics and the agents that express those semantics.

Responsibilities:

- agent definitions;
- agent classes;
- handler mappings;
- prompts/configuration;
- class-to-capability requirements;
- project-specific work taxonomies;
- allowed modes by class;
- project-local execution rules;
- content-driven specialization.

Example:

```text
Project class: Security Engineering
  handlers: review, act
  domains: security_review, security_fix
  allowed modes: planning, acting
  required capabilities: repo_read, repo_write optional, shell optional, security_review
```

The project does not own native provider quota. It declares what kind of execution capacity its agents need.

### Capacity Provider

A capacity provider is an economic/runtime container for one or more execution providers.

Responsibilities:

- economic/policy container for execution providers;
- team/project grants;
- native budget policy;
- availability windows;
- runner pool limits;
- provider-local reservation enforcement;
- check-in and assignment polling;
- usage reporting;
- native capacity observations.

Non-responsibilities:

- defining project agents;
- approving TreeSeed decisions;
- deciding cross-provider routing;
- owning portfolio-level project priorities;
- mutating team allocation policy;
- starting unapproved project work.

### Execution Provider

An execution provider is the concrete runnable surface behind a capacity provider.

Examples:

- OpenAI Pro subscription seat;
- OpenRouter/OpenCode budget;
- GitHub Copilot budget;
- local model runner;
- human review pool;
- custom automation runner.

Responsibilities:

- native unit model;
- concurrency;
- model/tool surface;
- spend/quota/throttle behavior;
- supported runtime protocol;
- observed usage.

Execution providers can be opaque, partially observable, or exactly metered. TreeSeed should support all three through native limits, observations, derived credits, and confidence levels.

### Provider Manager

A provider manager is the provider-local supervisor for one capacity provider runtime.

Responsibilities:

- check in with TreeSeed API;
- report availability;
- receive assignments;
- claim leases;
- dispatch provider-local runners;
- renew leases;
- complete/fail/return assignments;
- report usage actuals.

The provider manager is not the TreeSeed cross-provider planning authority. It decides how to use its own provider-local runners and native execution surfaces, but it does not decide whether a TreeSeed decision is approved, whether another provider should be used, or whether a team can borrow from another team's allocation.

### Provider Runner

A provider runner executes a leased assignment under provider-local constraints.

Responsibilities:

- execute assigned project-bundled agent/handler;
- enforce local runtime constraints;
- stream/record mode run status;
- report outputs and actual usage;
- respect lease and assignment boundaries.

The runner receives a scoped project agent assignment context. It should not infer arbitrary additional project work or expand beyond the assignment's allowed output types, mode, and capabilities.

---

## 4. Terminology Cleanup

Docs and code should avoid using "manager" without a qualifier.

| Ambiguous Term | Replacement | Meaning |
| --- | --- | --- |
| manager | provider manager | provider-local runner supervisor |
| manager | assignment function | API-side deterministic selection invoked during check-in |
| manager | team capacity policy | human/admin allocation settings |
| capacity provider | capacity provider | economic/runtime container |
| execution provider | execution provider | native runnable surface |
| agent | project agent | project-owned configured role/handler |
| workday | TreeSeed workday | team/project accounting window |

The prior agent kernel plan uses "manager" to describe cross-provider planning behavior. In this refined architecture, that behavior belongs to API-side assignment and policy functions, not the provider-local manager service.

---

## 5. End-To-End Architecture Flow

The end-to-end flow is:

```text
1. Team admins define workday schedule and allocation policies.
2. TreeSeed derives team workday allowances from monthly capacity and workday count.
3. Portfolio allocation divides team allowance across projects.
4. Project allocation divides project allowance across agent classes.
5. Agent-class policy divides class allowance across planning and acting.
6. Project decisions/proposals create demand.
7. Capacity providers check in at the start of an availability window.
8. Provider check-in reports execution providers, capabilities, grants, availability, native limits, and runner pressure.
9. API records an availability session.
10. API runs deterministic assignment selection for that provider/session.
11. API returns leased assignments.
12. Provider manager claims and dispatches work locally.
13. Project-bundled agent executes through provider execution surface.
14. Provider reports status, outputs, usage actuals, blockers, and returned capacity.
15. API settles the ledger and updates summaries.
16. Telemetry improves future estimates, conversion profiles, and assignment selection.
```

```text
Project demand
  objectives / proposals / approved decisions
        |
        v
TreeSeed API assignment function
  allocation policies + readiness + provider sessions
        |
        v
Provider assignment leases
        |
        v
Capacity provider manager
        |
        v
Execution provider + runner
        |
        v
Mode run outputs + usage actuals
        |
        v
TreeSeed ledger + telemetry
```

The API does not call providers directly. Providers create availability sessions by checking in. The API returns initial assignments in the check-in response and may return additional assignments when the provider asks for more work.

---

## 6. Workday And Availability Model

The architecture uses three distinct time concepts.

### TreeSeed Workday

A TreeSeed workday is a team/project coordination and accounting period.

It contains:

- scheduled date/window;
- team allowance;
- portfolio budgets;
- project budgets;
- agent-class budgets;
- planning/acting budgets;
- assignments;
- reservations;
- usage actuals;
- summary.

A TreeSeed workday is the period the organization plans, monitors, and summarizes. It is not a guarantee that any specific provider is online for the full period.

### Provider Availability Window

A provider availability window is a provider-specific time period when the provider can accept and run assignments.

Examples:

```text
OpenAI Pro: weekdays 9 AM - 1 PM for Team A
OpenRouter: all day while monthly spend remains
Copilot: weekdays 1 PM - 5 PM
Laptop local runner: whenever provider manager checks in
```

A provider can expose different availability windows and grant slices for different teams.

### Assignment Lease Window

An assignment lease window is a short-lived claimable/running lease for concrete work.

Rules:

- assignments expire unless claimed;
- running assignments require renewal;
- expired assignments return to assignable pool;
- completed assignments settle actuals;
- returned assignments release unused budget.

A TreeSeed workday is not a promise that every provider is available for the entire window. It is the umbrella accounting period into which provider availability windows and assignment leases fit.

---

## 7. Allocation Policy Layers

TreeSeed should keep allocation unified through one hierarchy:

```text
Provider native capacity
  -> derived TreeSeed credits
  -> team monthly capacity
  -> scheduled workday allowance
  -> project portfolio allocation
  -> project agent-class allocation
  -> planning/acting mode allocation
  -> provider/session assignment
```

Each layer narrows the allowable spend for the next layer. The lower layers should not create independent budgeting systems.

### Team Workday Schedule

Team admins configure:

- workday calendar;
- reset cadence;
- workdays per month;
- monthly capacity source;
- reserves;
- carryover policy;
- emergency allocation.

Example:

```text
Monthly projected capacity: 2,000 credits
Scheduled workdays: 20
Base allowance per workday: 100 credits
Emergency reserve: 5%
```

TreeSeed derives scheduled workday allowances from team-level monthly capacity and the configured workday calendar. The monthly capacity may be assembled from derived provider availability, explicit governance caps, or a hybrid policy, depending on existing dynamic capacity settings.

### Portfolio Allocation

Admins allocate workday allowance across projects or portfolio buckets.

Example:

```text
Project A: 50%
Project B: 30%
Maintenance: 15%
Emergency: 5%
```

Portfolio allocations apply after provider native availability has been converted into derived TreeSeed credits. Humans allocate capacity shares; they do not manually enter provider inventory credits.

### Project Agent-Class Allocation

Each project defines its own agent classes.

Example:

```text
Research: 15%
Design: 10%
Standards Development: 10%
Feature Development: 30%
Bug Fixes: 10%
Testing: 10%
Documentation: 5%
Security Engineering: 5%
Performance Optimization: 5%
```

Agent classes are human-facing budget categories. They are not provider-specific queues. They map project demand to project agents/handlers and required execution capabilities.

### Planning/Acting Allocation

Planning/acting allocation can be global, per project, per class, or per agent.

Example:

```text
Feature Development:
  planning target: 25%
  acting target: 75%
  planning min: 15%
  planning max: 40%

Research:
  planning target: 80%
  acting target: 20%
```

These percentages are usually targets or soft caps. Hard caps must be explicit. The assignment function may shift between planning and acting within configured min/max bounds when demand changes, such as increasing planning when approved decisions lack estimates or increasing acting when accepted capacity plans are waiting.

---

## 8. Unified AllocationSet Model

TreeSeed should use one reusable SDK/API concept for percentage allocation.

```ts
type AllocationSetScope =
  | "team_workday"
  | "project_portfolio"
  | "project_agent_class"
  | "agent_mode";

type AllocationSet = {
  allocationSetId: string;
  teamId: string;
  projectId?: string;
  scope: AllocationSetScope;
  parentAllocationSetId?: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  status: "draft" | "active" | "superseded" | "archived";
  slices: AllocationSlice[];
  policy: AllocationPolicy;
  metadata?: Record<string, unknown>;
};

type AllocationSlice = {
  id: string;
  name: string;
  percentage: number;
  minPercentage?: number;
  maxPercentage?: number;
  locked?: boolean;
  targetKind:
    | "project"
    | "portfolio_bucket"
    | "agent_class"
    | "mode"
    | "reserve";
  targetId: string;
  metadata?: Record<string, unknown>;
};

type AllocationPolicy = {
  enforcement: "target" | "soft_cap" | "hard_cap";
  allowBorrowing: boolean;
  borrowingRequiresApproval: boolean;
  carryover: "none" | "same_period" | "next_workday" | "monthly";
  overflowTargetId?: string;
};
```

The existing `/home/adrian/Projects/pie` component already uses a compatible primitive:

```ts
{ id, name, percentage, minPercentage, maxPercentage, locked }
```

TreeSeed should keep the component generic and domain-neutral. SDK and UI adapters can add TreeSeed-specific metadata, target kinds, labels, explanations, and validation rules.

Allocation sets should be versioned. Active allocation sets should not be mutated in a way that rewrites history for already-created reservations. Supersession should create a new active policy version and preserve auditability for prior workdays.

---

## 9. Project Agent Class Model

Project-owned agent classes connect human capacity policy to project-bundled agents and execution requirements.

```ts
type ProjectAgentClass = {
  classId: string;
  projectId: string;
  name: string;
  description?: string;
  allowedModes: ("planning" | "acting")[];
  preferredHandlers: string[];
  fallbackHandlers?: string[];
  requiredExecutionCapabilities: ExecutionCapabilityRef[];
  optionalExecutionCapabilities?: ExecutionCapabilityRef[];
  defaultModeAllocation?: {
    planningPercentage: number;
    actingPercentage: number;
    minPlanningPercentage?: number;
    maxPlanningPercentage?: number;
  };
  outputTypes: string[];
  riskProfile: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
};
```

Examples:

```text
Research
  handlers: research, report
  domains: source_research, knowledge_draft
  modes: planning
  required capabilities: reasoning, long_context, browser optional

Feature Development
  handlers: act
  domains: software_implementation
  modes: planning, acting
  required capabilities: coding, repo_read, repo_write, shell

Testing
  handlers: review, act
  domains: verification_review, test_repair
  modes: planning, acting
  required capabilities: shell, test_runner, repo_read

Security Engineering
  handlers: review, act
  domains: security_review, security_fix
  modes: planning, acting
  required capabilities: security_review, repo_read, shell optional
```

Project agent classes can vary by project. A content-heavy project might emphasize research, writing, editorial review, and publication. A software project might emphasize feature development, testing, security engineering, documentation, and performance optimization. The capacity system should not hard-code a universal taxonomy.

---

## 10. Agent Handler Boundary

Handlers are project assets. Providers supply compatible execution surfaces.

```text
Project agent definition:
  identity, role, prompt/config, class mapping, output expectations

Handler:
  executable strategy for one type of agent work

Provider:
  runtime capacity and execution surface that can run compatible handlers
```

Assignments must include enough project context for a provider runner to execute without taking ownership of project semantics:

```ts
type ProjectAgentAssignmentContext = {
  projectId: string;
  agentId: string;
  agentClassId: string;
  handlerId: string;
  mode: "planning" | "acting";
  selectedInputType: string;
  selectedInputId: string;
  allowedOutputTypes: string[];
  requiredExecutionCapabilities: ExecutionCapabilityRef[];
};
```

The assignment context should also carry provenance references such as decision IDs, proposal IDs, objective/question chain references, capacity plan IDs, and workday IDs when applicable.

Provider runners should execute the assignment's project-bundled handler/config. They should not substitute a provider-owned agent taxonomy. Provider-local routing can choose which execution provider, model, or runner instance satisfies the assignment, but the project owns the agent identity and handler semantics.

---

## 11. Provider Check-In Protocol

Provider coordination is provider-initiated. A provider manager checks in at the start of an availability period and can ask for more assignments as local runner capacity becomes free.

Implemented Phase 2 endpoint:

```http
POST /v1/provider/check-in
```

Provider request:

```ts
type CapacityProviderCheckInRequest = {
  providerId: string;
  idempotencyKey: string;
  availabilitySessionId?: string;
  availableFrom: string;
  availableUntil?: string;
  providerTimeZone?: string;
  grants: ProviderGrantAvailability[];
  executionProviders: ExecutionProviderSnapshot[];
  lanes: CapacityLaneSnapshot[];
  capabilities: ExecutionCapabilityRef[];
  maxConcurrentAssignments: number;
  activeAssignmentIds: string[];
  pressure: "idle" | "normal" | "busy" | "throttled" | "exhausted";
  observations?: ProviderObservation[];
};
```

Response:

```ts
type CapacityProviderCheckInResponse = {
  availabilitySessionId: string;
  recordedAt: string;
  nextCheckInAfterSeconds: number;
  policyVersion: string;
};
```

The API records the check-in as a provider availability session. A session is soft supply until assignments are leased through `/v1/provider/assignments/next`. If the provider disappears after check-in, leases expire and uncompleted assignments return to the assignable pool.

Provider managers may use a loop like:

```text
check in at start of availability window
poll next assignment when runner capacity is available
dispatch provider-local runners
renew leases while running
complete/fail/return assignments
check out at end of availability window
```

The implemented next-assignment route performs bounded request-scoped synthesis, then leases one eligible assignment for provider-local pull:

```http
POST /v1/provider/assignments/next
```

This route runs bounded deterministic selection against `ProviderAssignment` records for the authenticated provider. Before selection, the API can synthesize idempotent assignments from open planning input requests and accepted capacity-plan work units. Accepted decision execution inputs must first be aggregated into a durable capacity plan and accepted before acting synthesis. Acting synthesis creates a reservation, attaches allocation policy version context when known, records the checked-in grant id in reservation metadata, and requires referenced workdays to be active. It does not synthesize assignments from legacy task queues or create a central long-running scheduler daemon.

Assignment responses and explanation records include selected and blocked eligibility metadata. Stable reason codes include `missing_required_capability`, `missing_checked_in_grant`, `outside_availability_window`, `runner_pressure_exhausted`, `capacity_plan_not_ready`, `decision_readiness_not_ready`, `workday_not_active`, and `allocation_exhausted`. Eligible assignments are sorted by priority descending, assigned/created time ascending, and id ascending.

Legacy provider task routes are removed. Providers use check-in, next assignment, renew lease, create mode run, complete assignment, return assignment, fail assignment, and usage report endpoints as the runtime contract.

---

## 12. Provider Assignment / Lease Model

Assignments are leased records connecting TreeSeed demand to a provider session.

```ts
type ProviderAssignmentStatus =
  | "offered"
  | "leased"
  | "claimed"
  | "running"
  | "completed"
  | "failed"
  | "returned"
  | "expired"
  | "cancelled";
```

```ts
type ProviderAssignment = {
  assignmentId: string;
  providerId: string;
  availabilitySessionId: string;
  teamId: string;
  projectId: string;
  workdayId: string;
  decisionId?: string;
  proposalId?: string;
  agentClassId: string;
  agentId: string;
  handlerId: string;
  mode: "planning" | "acting";
  selectedInputType: string;
  selectedInputId: string;
  expectedOutputTypes: string[];
  reservedCredits: number;
  reservedNative?: {
    executionProviderId: string;
    nativeUnit: string;
    amount: number;
  };
  leaseExpiresAt: string;
  requiredCapabilities: ExecutionCapabilityRef[];
  status: ProviderAssignmentStatus;
};
```

Provider action endpoints:

```http
POST /v1/provider-assignments/{assignmentId}/claim
POST /v1/provider-assignments/{assignmentId}/heartbeat
POST /v1/provider-assignments/{assignmentId}/complete
POST /v1/provider-assignments/{assignmentId}/fail
POST /v1/provider-assignments/{assignmentId}/return
```

These are normal API routes, not a new backend service. They mutate durable records and can be implemented through the existing Treeseed API/control-plane pattern.

Claiming should be idempotent. Heartbeats should renew leases and update mode-run status. Completion should include output references and native usage facts. Failure should include a structured reason. Return should release unused reservation capacity and record whether the work can be retried, rerouted, or must be blocked.

---

## 13. Assignment Selection Function

The assignment selection function is deterministic API-side logic invoked during provider check-in or next-assignment requests.

Inputs:

- provider check-in session;
- provider grants;
- provider capabilities;
- provider native availability;
- provider current pressure;
- workday schedules;
- allocation policies;
- project agent class budgets;
- planning/acting budgets;
- decision readiness;
- existing reservations;
- active assignments;
- priority and risk policy.

Output:

- zero or more leased assignments for the checking-in provider.

Selection rules:

1. Only assign work for grants included in provider check-in.
2. Only assign work whose project agent/handler requirements match provider execution capabilities.
3. Respect provider availability window.
4. Respect team workday allowance.
5. Respect project portfolio remaining allowance.
6. Respect project agent-class remaining allowance.
7. Respect planning/acting remaining allowance.
8. Prefer approved decisions needing planning estimates before acting work that lacks readiness.
9. Prefer accepted capacity plan acting work when planning requirements are complete.
10. Avoid assigning work above provider concurrency.
11. Use leases to avoid stale assignment.
12. Allow soft-cap overflow only when policy permits.
13. Require approval for hard-cap or emergency reserve borrowing.

The function should be bounded. It should not globally optimize every team and provider on every check-in. It should select from indexed demand for grants the provider is authorized to serve, rank eligible candidates, create reservations/leases for the best candidates, and return an explainable result.

---

## 14. Planning And Acting With Allocation Classes

Planning/acting mode remains a kernel-level execution boundary, but available budget is shaped by agent class allocation.

Example:

```text
Feature Development class has 20 credits today.
Planning target is 25%, acting target is 75%.

Eligible planning:
  estimate approved decisions
  produce implementation approach
  identify dependencies

Eligible acting:
  implement assigned work unit
  fix verification failure
  perform release support
```

Dynamic adjustment can happen inside configured bounds:

- increase planning if decisions lack estimates;
- increase acting if capacity plans are accepted and waiting;
- keep within configured min/max;
- record auto-shifts as policy-derived events.

Planning mode should never perform binding work. Acting mode should never run without the required decision, readiness, capacity plan, capability, environment, and reservation gates.

---

## 15. Multi-Provider Example

### Providers

```text
OpenAI Pro provider
  execution provider: OpenAI Pro subscription
  Team A grant: 50%
  Team B grant: 50%
  strengths: reasoning, planning, summaries, review
  quota visibility: opaque/partial

OpenCode/OpenRouter provider
  execution provider: OpenRouter budget
  Team A grant: $150/month
  strengths: code tasks, configurable models
  quota visibility: exact

GitHub Copilot provider
  execution provider: Copilot budget
  Team A grant: $500/month
  strengths: repo-local coding/review
  quota visibility: partial/exact depending integration
```

### Team Workday

```text
Team A workday allowance: 100 credits
Project Market allocation: 50 credits
Feature Development allocation: 17.5 credits
Testing allocation: 5 credits
Research allocation: 7.5 credits
```

### Check-In Example

OpenAI Pro checks in first:

```text
Capabilities: reasoning, long_context, planning
API assigns:
  research planning estimate
  decision summary
  proposal comparison
```

Copilot checks in later:

```text
Capabilities: repo_read, repo_write, code_review
API assigns:
  feature acting work
  testing/review work
```

OpenRouter checks in all day:

```text
Capabilities: coding, shell, long_context depending lane
API assigns:
  overflow implementation
  API estimate
  documentation acting work
```

These providers do not coordinate directly with each other. They coordinate through TreeSeed records: availability sessions, assignments, reservations, mode runs, usage actuals, and ledger entries.

---

## 16. Shared Provider Across Multiple Teams

Shared provider fairness is provider-side for native capacity and TreeSeed-side for team-scoped assignment.

Rules:

- provider global native ledger is provider-authoritative;
- TreeSeed team sees only team-scoped grant availability;
- provider check-in can include multiple team grants;
- API assignment must only assign within returned grant availability;
- provider can reject or return assignments if global pressure changes;
- TreeSeed should not expose Team B state to Team A.

Example:

```text
OpenAI Pro subscription
  Team A grant: 50%
  Team B grant: 50%

Provider reports Team A available share separately from Team B.
TreeSeed Team A assignment function cannot consume Team B's share.
```

If a provider serves multiple teams during one availability session, the provider check-in should report per-team grant availability. The API can assign work for any grant represented in the check-in, but each assignment must remain scoped to that grant and must not reveal other teams' demand or consumption.

---

## 17. Ledger And Settlement

TreeSeed should keep one capacity ledger. Do not create separate ledgers for every allocation layer.

Each reservation/actual should include dimensions:

```text
teamId
projectId
workdayId
providerId
executionProviderId
grantId
assignmentId
decisionId
proposalId
agentClassId
agentId
handlerId
mode
reservedCredits
consumedCredits
reservedNative
consumedNative
allocationSetIds
```

Summaries can roll up by:

- team;
- project;
- workday;
- provider;
- execution provider;
- agent class;
- mode;
- decision;
- handler;
- native unit;
- allocation policy.

Provider actuals are facts. TreeSeed settlement converts those facts into normalized credits using the SDK capacity model, learned conversion profiles, native limits, observations, reservations, and allocation policy. This preserves the dynamic capacity architecture where humans configure native/provider policy and TreeSeed derives credit availability.

Assignment lifecycle settlement is automatic at the API boundary. Lease/start writes `task_started` and moves a reserved reservation into consuming state. Completion links mode-run and usage actuals, writes `task_completed_actual_settlement`, updates consumed credits/native usage/USD, and releases unused reserved capacity. Return and retryable failure write `reservation_released`; nonretryable failure writes `task_failed_refund`. Allocation/grant exhaustion blocks reservation creation with an explanation unless the active grant's overflow policy requires approval, in which case the API creates an overrun hold instead of leasing runnable work.

---

## 18. UI Integration

### Team Capacity Settings

The team capacity settings UI should expose:

- workday schedule;
- monthly capacity projection;
- reserve policy;
- portfolio allocation pie.

### Project Capacity Settings

The project capacity settings UI should expose:

- project agent-class allocation pie;
- class definitions;
- handler mappings;
- allowed modes;
- default planning/acting split.

### Agent Class Detail

Agent class detail should show:

- description;
- handlers;
- capabilities;
- mode split;
- recent usage;
- estimate accuracy;
- allocation target vs actual.

### Capacity Provider Page

The capacity provider page should show:

- check-in status;
- availability sessions;
- execution providers;
- native limits;
- grants;
- provider observations;
- recent assignments;
- usage by team/project/class/mode.

### Workday Page

The workday page should show:

- total allowance;
- portfolio allocation;
- project allocation;
- class allocation;
- provider sessions;
- assignments;
- actuals vs targets;
- blocked/deferred work.

### Pie Component Integration

Use the component from `/home/adrian/Projects/pie` as a generic control with adapters for:

```text
PortfolioAllocationInput
AgentClassAllocationInput
ModeAllocationInput
```

Keep the generic component domain-neutral. TreeSeed-specific wrappers should provide labels, descriptions, target metadata, persistence, validation, permission checks, and audit messages.

---

## 19. API Contract Sketch

These are conceptual routes, not final route names.

Allocation:

```http
GET /v1/teams/{teamId}/allocation-sets
POST /v1/teams/{teamId}/allocation-sets
PATCH /v1/allocation-sets/{allocationSetId}
POST /v1/allocation-sets/{allocationSetId}/activate
POST /v1/allocation-sets/{allocationSetId}/supersede
```

Project agent classes:

```http
GET /v1/projects/{projectId}/agent-classes
POST /v1/projects/{projectId}/agent-classes
PATCH /v1/projects/{projectId}/agent-classes/{classId}
```

Provider check-in:

```http
POST /v1/provider/check-in
POST /v1/provider/assignments/next
```

Assignments:

```http
GET /v1/provider/assignments/{assignmentId}
POST /v1/provider/assignments/{assignmentId}/renew
POST /v1/provider/assignments/{assignmentId}/complete
POST /v1/provider/assignments/{assignmentId}/fail
POST /v1/provider/assignments/{assignmentId}/return
POST /v1/provider/assignments/{assignmentId}/mode-runs
```

Summaries:

```http
GET /v1/workdays/{workdayId}/summary
GET /v1/projects/{projectId}/capacity-summary
GET /v1/capacity-providers/{providerId}/sessions
```

All write routes should use idempotency keys where retries are plausible, especially check-in, assignment creation, claim, complete, fail, and return.

---

## 20. SDK Surface

Conceptual SDK exports/types:

```text
AllocationSet
AllocationSlice
AllocationPolicy
ProjectAgentClass
ProviderAvailabilitySession
CapacityProviderCheckInRequest
CapacityProviderCheckInResponse
ProviderAssignment
ProviderAssignmentStatus
ExecutionCapabilityRef
```

Conceptual SDK functions:

```ts
normalizeAllocationSet(input)
validateAllocationSet(input)
deriveWorkdayAllowance(...)
derivePortfolioAllowances(...)
deriveAgentClassAllowances(...)
deriveModeAllowances(...)
selectAssignmentsForProviderCheckIn(...)
settleProviderAssignmentActuals(...)
summarizeAllocationActuals(...)
```

Reuse existing capacity model concepts where possible:

- `capacity_providers`;
- `capacity_provider_lanes`;
- `capacity_grants`;
- `capacity_reservations`;
- `capacity_routing_decisions`;
- `capacity_ledger_entries`;
- `execution_providers`;
- `execution_provider_native_limits`;
- `execution_provider_observations`.

The SDK should remain the canonical place for shared allocation math, assignment eligibility, credit derivation, settlement, and summaries. The API should call SDK helpers rather than duplicating selection and settlement math.

---

## 21. Failure Modes

### Provider Goes Offline After Check-In

- leases expire;
- assignments return to assignable state;
- UI shows provider session stale/offline;
- no permanent budget consumption unless actuals were reported.

### Provider Rejects Assignment

- assignment marked returned or failed;
- reason recorded;
- capacity released;
- future routing penalizes incompatible path when appropriate.

### Allocation Slice Exhausted

- if target: assignment may continue if priority warrants;
- if soft cap: overflow allowed only under policy;
- if hard cap: block or require approval.

### Provider Native Capacity Exhausted

- provider reports pressure/exhausted;
- API stops assigning to that session/grant;
- work may route elsewhere or defer.

### No Provider Available For Required Agent Class

- work remains pending;
- UI shows blocked by provider availability/capability;
- administrator may adjust grants, providers, class mappings, or schedule.

### Stale Assignment

- lease expiry returns work;
- mode run heartbeat absence marks assignment stale;
- provider can resume only through renewed claim policy.

### Provider Reports Conflicting Actuals

- actuals are stored as provider facts with source metadata;
- settlement should reject impossible negative or duplicate consumption;
- repeated inconsistencies should reduce provider confidence and surface an admin warning.

### Allocation Policy Changes During Workday

- already leased assignments keep the allocation policy version they were created under unless cancelled or returned;
- new assignments use the active policy version;
- summaries should show policy-version boundaries when a workday spans a policy change.

---

## 22. Observability

Required summaries:

```text
Team workday allowance vs actual
Project allocation target vs actual
Agent-class target vs actual
Planning vs acting target vs actual
Provider availability sessions
Provider assignment success/failure
Native usage by execution provider
Credits by class/mode/provider
Borrowing/overflow events
Hard-cap blocks
Returned unused capacity
Estimate variance by class/handler/provider
```

Required event dimensions:

```text
teamId
projectId
workdayId
providerId
executionProviderId
availabilitySessionId
assignmentId
agentClassId
agentId
handlerId
mode
decisionId
proposalId
allocationSetId
grantId
nativeUnit
reservedCredits
consumedCredits
status
```

The UI should distinguish:

- target allocation;
- reserved capacity;
- consumed capacity;
- returned unused capacity;
- blocked work;
- overflow/borrowed capacity.

---

## 23. Security And Governance

Rules:

1. Provider check-in authenticates as a capacity provider.
2. Provider may only report/receive assignments for grants it owns or is authorized to serve.
3. Provider cannot create decisions or approve work.
4. Provider cannot mutate allocation policy.
5. Project agent definitions are served through scoped assignment context.
6. Secrets remain provider-local where possible.
7. Provider actuals are recorded as facts, then centrally settled.
8. Assignment leases prevent abandoned local providers from holding work forever.
9. Admin overrides are audited.
10. Borrowing from reserve or another slice is audited.

Provider authentication should be scoped to provider actions. Project assignment context should expose only the information needed for the leased assignment. Acting assignments should still require decision readiness, accepted capacity plan, required capabilities, and environment checks.

---

## 24. Compatibility With Existing Dynamic Capacity Budget

This architecture preserves the dynamic capacity model described in [dynamic-capacity-budget.md](dynamic-capacity-budget.md).

It preserves:

- derived provider capacity;
- avoidance of human-entered provider credits;
- native capacity and observed usage as the basis for derived TreeSeed credits;
- portfolio percentages as governance allocation;
- existing capacity concepts such as providers, lanes, grants, reservations, routing decisions, ledger entries, execution providers, native limits, and observations.

This document extends the model with:

- scheduled workday allowances;
- project agent-class allocations;
- planning/acting allocation under each class;
- provider check-in sessions;
- project-bundled agent assignment;
- provider-local execution leases;
- class/mode/provider settlement dimensions.

The allocation hierarchy should not compete with dynamic capacity. It should sit on top of derived availability and express how humans want available capacity used across the portfolio, project classes, and execution modes.

---

## 25. Implementation Sequencing Guidance

Recommended sequence:

1. Document terminology and boundaries in code comments, API descriptions, and follow-on docs.
2. Add/confirm SDK types for allocation sets and project agent classes.
3. Integrate generic pie allocation UI for portfolio and class allocations.
4. Add provider check-in availability session records.
5. Add leased provider assignments.
6. Add deterministic assignment selection on provider check-in.
7. Wire project-bundled agent/handler context into assignments.
8. Add provider claim/heartbeat/complete/fail/return flow.
9. Add workday/project/class/mode summaries.
10. Add dynamic planning/acting adjustment within configured bounds.

This sequencing intentionally avoids a central scheduler daemon. It adds durable API records and request-time assignment behavior first, then expands provider runtime integration and UI summaries.

---

## 26. Acceptance Criteria For The Architecture

The architecture is successful when:

- a team admin can configure workday schedules;
- a team admin can allocate workday capacity across project portfolio slices;
- a project admin can allocate project capacity across project-defined agent classes;
- a project can map agent classes to project-bundled handlers;
- a provider can check in without inbound API calls from TreeSeed;
- the API can return assignments immediately during provider check-in;
- assignments include project agent context and provider execution requirements;
- providers can claim, run, renew, complete, fail, or return leased assignments;
- the ledger can report usage by provider, project, agent class, and planning/acting mode;
- shared providers can enforce separate team grants;
- no additional central long-running backend service is required.

---

## 27. Explicit Assumptions And Defaults

- Workdays are TreeSeed-side accounting windows.
- Provider availability windows are provider-side constraints inside a workday.
- Agents are project-bundled.
- Capacity providers bundle execution providers.
- Provider managers are provider-local.
- API-side coordination happens synchronously during provider check-in / next-assignment requests.
- Allocation percentages are targets by default.
- Hard caps require explicit configuration.
- Provider check-in availability is soft until assignments are leased and claimed.
- Leases expire unless renewed.
- One central capacity ledger remains the source for settlement and summaries.
- The generic pie component should stay domain-neutral and be adapted by TreeSeed UI wrappers.
