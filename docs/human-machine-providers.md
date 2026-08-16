# Human-Machine Execution Providers

**Status:** Proposed architecture and migration guide for unifying AI, deterministic automation, and human-team execution providers
**Date:** 2026-06-19
**Audience:** SDK, API, agent runtime, provider runtime, Admin, CLI, and integration implementers

This document defines the migration from narrow prompt execution adapters to a unified human-machine execution provider architecture. It extends the canonical capacity architecture in [Capacity Provider Agent Coordination Architecture](./capacity_provider_agent_coordination_architecture.md), [Agent Capacity Domain Model](./agent-capacity-domain-model.md), [Agent Kernel Mode Runtime](./agent-kernel-mode-runtime.md), [Agent Capacity Implementation Roadmap](./agent-capacity-implementation-roadmap.md), [Agent Capacity Operator Surfaces](./agent-capacity-operator-surfaces.md), [Capacity Provider Runtime](../packages/agent/docs/capacity-provider-runtime.md), and [Package Ownership](./package-ownership.md).

It does not replace those documents. It describes how AI agents, deterministic automation, and human project teams fit the same assignment, lease, mode-run, usage, and settlement model.

## Executive Summary

The target flow is:

```text
Project agents define work semantics in MDX.
Project handlers shape bounded work packages.
TreeSeed API matches demand to provider supply.
Provider runners lease assignments.
Execution provider adapters execute or coordinate the work.
AgentKernel validates mode, scope, outputs, and capability bounds.
API records mode runs, usage, lifecycle, and settlement.
```

This is not a new scheduler. This is not a new task system. Jira, Linear, GitHub Issues, local workflow queues, model threads, and provider-local job systems are execution surfaces, not Treeseed's source of truth.

Human teams, deterministic workflows, and AI agents use the same control-plane lifecycle:

```text
membership-scoped availability session -> next assignment -> lease renewal -> mode-run telemetry -> complete/return/fail -> usage settlement
```

Handlers are provider-independent algorithms. Providers are execution mechanisms. First-party agents use activity profiles over the clean handler set `writer`, `actor`, `estimate`, `releaser`, and `reporter`; project agent classes and profile contracts carry role semantics such as implementation, documentation review, release readiness, or codebase research. The same handlers can work across AI, deterministic automation, and human issue queues when their capability requirements match provider supply.

TreeDX-backed content access is the default SDK and assignment runtime path. Execution provider invocations may include redacted `agent_tool` descriptors when the agent content definition allows those tools and the assignment has the required scoped handles. AI providers such as Codex use the catalog through assignment-scoped MCP configuration metadata; human issue queues such as GitHub Issues render safe route templates, allowed operations, allowed paths, and required header names into the issue body. Model-aware content tools expose generic `treeseed.content.*` commands plus generated model presets while sharing one SDK-backed renderer and validator. No execution provider prompt, issue, snapshot, log, or artifact should contain raw TreeDX credentials, provider API keys, GitHub tokens, or repository deploy keys.

Codex live proof uses an isolated temporary `CODEX_HOME` with copied auth and sanitized config. The live proof must not edit a developer's real `~/.codex/config.toml`; unsupported local values such as `service_tier = "default"` are reported as readiness warnings and bypassed by the isolated live-test home.

GitHub Copilot live proof uses the Copilot SDK native custom-tool interface. TreeSeed assignment tools are translated from the same execution-provider descriptors into Copilot custom tools, and the handlers call the shared `callAgentToolWithTelemetry()` runtime. Copilot authentication prefers the account-scoped `TREESEED_GITHUB_COPILOT_TOKEN`, translated at the managed tool boundary; if it is absent, the adapter can fall back to `TREESEED_GITHUB_TOKEN` for compatibility. The token must be accepted by GitHub Copilot and fine-grained PATs need the Copilot Requests permission.

The design goal is that it must be easy for capacity providers to orchestrate humans and machines to achieve common objectives through cooperative decisions. That means humans, AI providers, and deterministic workflows should all receive the same bounded assignments, report comparable status and usage, and remain governed by the same decision readiness, capacity plan, and assignment lifecycle records.

## Core Principle

```text
activity profile = the bounded run contract
handler = the provider-independent algorithm
agent class = what the work means
execution provider adapter = how and where the work runs
capacity provider = who supplies execution capacity
assignment = what Treeseed authorized now
```

Projects own work semantics:

- agent MDX definitions
- activity profiles
- handler selection
- prompts and persona
- content access
- tool permissions
- branch policy
- question policy
- required capabilities
- output contracts
- planning and acting policy needs

Providers own execution mechanics:

- execution surfaces
- native capacity
- external queues, jobs, threads, and issues
- local runner pressure
- observations
- provider-local enforcement

The API owns durable coordination:

- assignment selection
- decisions and readiness
- capacity plans
- provider sessions
- assignments and leases
- reservations
- explanations
- mode runs
- settlement

Admin and CLI expose state and diagnostics. They must not become hidden schedulers, provider runners, or assignment selectors.

## Integration Mandate

This architecture must integrate with existing Treeseed systems instead of creating parallel ones.

Do use:

- existing provider availability-session and assignment lifecycle routes
- existing `ProviderAvailabilitySession`, `ProviderAssignment`, `ProviderAssignmentExplanation`, `AgentModeRun`, usage, reservation, and ledger records
- existing AgentKernel execution boundary
- existing project agent MDX definitions
- existing clean handlers and activity profiles
- existing Admin and CLI inspection surfaces
- existing capability handle and TreeDX proxy boundaries
- existing `trsd capacity` lifecycle commands

Do not add:

- a second scheduler
- a second assignment queue
- Jira-owned approval semantics
- provider-local project work synthesis
- provider task claim/event/complete/fail routes
- a default `human_delegation` handler fork
- raw provider credentials in MDX, assignment payloads, logs, Admin, or CLI

## Current State

Agent definitions are project content. In the root Market project they live under `src/content/agents` as MDX files. In package projects they live under `docs/src/content/agents`. Their frontmatter is normalized into SDK agent definition and runtime contracts. Runtime execution configuration lives under `activityProfiles.<activity>.execution`; top-level execution, tool, content, prompt, and output fields are legacy and should be rejected by authoring diagnostics.

Agent definitions separate permission from tool exposure inside each activity profile. The profile permission matrix grants per-model TreeDX operations and filters plus bounded repository, network, shell, and commit authority. `tools.allowed` grants execution-provider callable tools. A handler may use SDK content operations only within the same frozen permissions without exposing every permitted operation to Codex, Copilot, GitHub Issues, or another execution provider.

The retired agent execution adapter was prompt-centric:

```ts
legacyPromptExecution(input: {
  agent: AgentRuntimeSpec;
  runId: string;
  prompt: string;
}): Promise<ExecutionRunSnapshot>;
```

That shape works for a synchronous or near-synchronous model prompt. It is too narrow for:

- Jira or Jira-like human issue queues
- async workflow runs
- resumable provider-local jobs
- exact external references
- cancellation
- polling
- usage collection
- artifact collection
- provider observation and capability reporting

The provider runtime is already assignment-only. The provider runner leases work through the capacity provider API and executes it through `AgentKernel.runAssignment`. That boundary should remain. The migration should improve how the kernel and handlers invoke execution surfaces, not introduce legacy task claim routes or provider-local work synthesis.

## Target Runtime Model

The canonical target layering is:

```text
Agent MDX
  -> ProjectAgentClass
  -> DecisionExecutionInput / CapacityPlan work unit
  -> ProviderAssignment
  -> AgentKernel.runAssignment
  -> AgentHandler builds AgentWorkPackage
  -> ExecutionProviderAdapter starts/coordinates work
  -> ProviderRunner renews/polls/records lifecycle
  -> API mode runs + assignment completion + ledger settlement
```

The provider runner must not bypass the kernel. It must not execute arbitrary provider work. It leases one authorized assignment, calls the kernel, renews the lease while the execution provider is running or waiting, records mode-run telemetry, and completes, returns, or fails the assignment through API lifecycle routes.

## Agent MDX Role

Agent MDX remains the project-owned definition of the agent. Existing fields remain meaningful:

- `slug`
- `handler`
- `systemPrompt`
- `persona`
- `permissions`
- `execution`
- `outputs`
- `capabilities`
- `tags`

The `execution` frontmatter should evolve from a prompt-provider selector into a semantic execution demand and preference block. Existing fields continue to work while the target schema is introduced incrementally.

Target shape:

```md
execution:
  provider: codex
  model: gpt-5.5
  sandboxMode: workspace_write
  allowedPaths:
    - docs/**
  forbiddenPaths:
    - .env*
  providerProfile:
    requiredCapabilities:
      - planning
      - repo_read
      - repo_write
      - verification
    preferredLanes:
      - provider: codex
        weight: 80
      - provider: human_issue_queue
        weight: 20
    acceptableFallbacks:
      - provider: human_issue_queue
        maxQualityPenalty: 0.2
    fallbackPolicy: fail_if_unavailable
```

The semantic rules are:

- MDX declares demand and preferences.
- MDX does not manually assign today's provider.
- MDX does not define Jira projects or provider credentials.
- MDX does not authorize acting work by itself.
- MDX path and tool constraints become part of assignment and work-package constraints.
- Acting still requires readiness, accepted capacity-plan provenance, reservation, capability coverage, and scoped handles.

## Capability Demand And Supply

Capability matching must become explicit and explainable. The platform should compile project demand and provider supply into normalized records before the assignment function evaluates eligibility.

### Capability Demand

Target DTO:

```ts
export interface ExecutionCapabilityDemand {
  required: string[];
  preferred?: string[];
  mode: 'planning' | 'acting';
  resourceNeeds?: ExecutionResourceNeed[];
  outputTypes?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExecutionResourceNeed {
  kind: 'repository' | 'treedx_workspace' | 'workflow' | 'secret' | 'external_issue' | 'external_job';
  operations: string[];
  paths?: string[];
  required?: boolean;
  metadata?: Record<string, unknown>;
}
```

Demand is compiled from:

```text
Agent MDX execution.providerProfile.requiredCapabilities
+ Agent MDX allowed/forbidden paths and output contract
+ ProjectAgentClass.requiredCapabilities
+ handler-declared work-package requirements
+ DecisionExecutionInput metadata
+ accepted CapacityPlan work-unit requirements
+ assignment capability-handle/resource needs
```

Project agent classes remain human-facing capacity/accounting categories. They are not provider queues. They contribute requirements such as `repo_read`, `repo_write`, `human_review`, `qa_validation`, `workflow_dispatch`, or `planning`, but the API still decides whether a checked-in provider can satisfy those requirements.

### Capability Supply

Target DTO:

```ts
export interface ExecutionCapabilitySupply {
  capacityProviderId: string;
  executionProviderId: string;
  kind: string;
  capabilities: string[];
  aliases?: string[];
  grants: string[];
  availability?: Record<string, unknown>;
  pressure?: 'idle' | 'normal' | 'busy' | 'throttled' | 'exhausted';
  maxConcurrentAssignments?: number;
  nativeUnit?: string;
  quotaVisibility?: 'opaque' | 'partial' | 'exact';
  metadata?: Record<string, unknown>;
}
```

Supply is compiled from:

```text
provider adapter descriptor
+ provider config
+ provider capabilities file
+ execution provider records
+ provider availability-session payload
+ grants
+ native limits
+ observations
+ runner pressure
```

Provider capabilities are facts about execution capacity and local constraints. They do not define project agent classes or project work semantics.

### Matching Rule

The deterministic eligibility rule is:

```ts
missing = demand.required - supply.capabilities - supply.aliases

eligible =
  missing.length === 0
  && grantMatches
  && availabilityMatches
  && runnerPressureAllows
  && budgetAllows
  && readinessAllows
  && capabilityHandlesCanBeIssued
```

The API assignment explanation must record:

- required capabilities
- available capabilities
- missing capabilities
- selected provider
- selected execution provider
- grant id and scope
- readiness gate
- allocation and budget gate
- capability-handle issue result
- reason codes for blocked candidates

The canonical assignment explanation capability gate shape is:

```ts
gates: {
  requiredCapabilities: string[];
  preferredCapabilities: string[];
  availableCapabilities: string[];
  aliasCapabilities: string[];
  missingCapabilities: string[];
  selectedProvider: string;
  selectedExecutionProvider: string;
  executionProviderKind: string;
  demand: ExecutionCapabilityDemand;
  supply: ExecutionCapabilitySupply;
  eligibility: ExecutionProviderEligibilityResult;
}
```

The AgentKernel remains a backstop. It must reject assignments whose eligibility metadata does not cover required capabilities, even if the API previously leased the assignment.

Capability names are not credentials. For example, `repo_write` means the provider can perform repository writes. A repository access handle means this exact assignment may write scoped paths under a live lease. Capability handles remain separate, scoped, and validated before execution provider adapters start external work.

## Unified Execution Provider Adapter

The executable adapter interface is anchored in `@treeseed/agent`. Portable DTOs should be exported from SDK only where API, CLI, Admin, or client boundaries need them.

Target runtime interface:

```ts
export interface ExecutionProviderAdapter {
  describe(): ExecutionProviderDescriptor | Promise<ExecutionProviderDescriptor>;

  observe(input: ExecutionProviderObserveInput): Promise<ExecutionProviderObservation>;

  prepare?(input: ExecutionProviderInvocation): Promise<ExecutionPreparationResult>;

  start(input: ExecutionProviderInvocation): Promise<ExecutionRunSnapshot>;

  poll?(input: ExecutionRunRef): Promise<ExecutionRunSnapshot>;

  resume?(input: ExecutionRunRef): Promise<ExecutionRunSnapshot>;

  cancel?(input: ExecutionRunRef & { reason: string }): Promise<ExecutionRunSnapshot>;

  collectUsage?(input: ExecutionRunRef): Promise<ExecutionUsageActual[]>;

  collectArtifacts?(input: ExecutionRunRef): Promise<ExecutionArtifactRef[]>;
}
```

Support types:

```ts
export interface ExecutionProviderDescriptor {
  id: string;
  kind: 'ai_model' | 'human_issue_queue' | 'deterministic_workflow' | 'local_process' | string;
  capabilities: string[];
  capabilityAliases?: string[];
  nativeUnit: string;
  quotaVisibility: 'opaque' | 'partial' | 'exact';
  maxConcurrentAssignments: number;
  supportsAsync: boolean;
  supportsCancel: boolean;
  supportsResume: boolean;
  supportsUsage: boolean;
  supportsArtifacts: boolean;
  metadata?: Record<string, unknown>;
}

export interface ExecutionProviderInvocation {
  assignment: ProviderAssignment;
  capacityEnvelope: AgentCapacityEnvelope;
  decisionInput: DecisionExecutionInput;
  agent: AgentRuntimeSpec;
  workPackage: AgentWorkPackage;
  leaseToken: string | null;
  runnerId: string;
  projectAgentClass?: ProjectAgentClass | null;
  workspace?: ExecutionWorkspaceContext | null;
  metadata?: Record<string, unknown>;
}

export interface ExecutionRunRef {
  assignmentId: string;
  executionProviderId?: string | null;
  runId: string;
  externalRef?: string | null;
  externalUrl?: string | null;
  leaseToken?: string | null;
  runnerId?: string | null;
  metadata?: Record<string, unknown>;
}

export type ExecutionRunStatus =
  | 'accepted'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'returned'
  | 'failed'
  | 'cancelled';

export interface ExecutionRunSnapshot {
  status: ExecutionRunStatus;
  summary: string;
  runId?: string | null;
  externalRef?: string | null;
  externalUrl?: string | null;
  outputs?: Record<string, unknown>;
  usage?: ExecutionUsageActual[];
  artifacts?: ExecutionArtifactRef[];
  retryable?: boolean;
  code?: string | null;
  metadata?: Record<string, unknown>;
}
```

`ExecutionProviderObserveInput`, `ExecutionProviderObservation`, `ExecutionPreparationResult`, `ExecutionUsageActual`, `ExecutionArtifactRef`, and `ExecutionWorkspaceContext` should remain provider-neutral. They should not contain raw service credentials.

## Work Package Contract

`AgentWorkPackage` is the provider-neutral handoff from handler to adapter:

```ts
export interface AgentWorkPackage {
  kind:
    | 'planning'
    | 'implementation'
    | 'review'
    | 'test'
    | 'release'
    | 'research'
    | 'report'
    | string;
  title: string;
  summary: string;
  instructions: string;
  context: Record<string, unknown>;
  expectedOutputs: AgentExpectedOutput[];
  constraints: AgentWorkPackageConstraints;
  metadata?: Record<string, unknown>;
}

export interface AgentExpectedOutput {
  type: string;
  required: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface AgentWorkPackageConstraints {
  mode: 'planning' | 'acting';
  requiredCapabilities: string[];
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  allowedOperations?: string[];
  deadline?: string | null;
  maxAttempts?: number | null;
  metadata?: Record<string, unknown>;
}
```

Handlers must build work packages instead of prompt-only execution calls. AI adapters may render a work package into a structured prompt. Human issue queue adapters may render it into an issue. Workflow adapters may render it into job inputs. The handler should receive a normalized execution snapshot and interpret it according to project semantics.

## Handler Contract After Migration

Current prompt-centric pattern:

```ts
legacyPromptExecution({ agent, runId, prompt })
```

Target pattern:

```ts
context.execution.start({
  assignment,
  capacityEnvelope,
  decisionInput,
  agent,
  workPackage,
  leaseToken,
  runnerId,
  projectAgentClass,
  workspace,
});
```

Handlers remain semantic and provider-independent.

Handlers own:

- resolving project input
- gathering context
- shaping work packages
- defining expected outputs
- interpreting normalized provider output
- emitting Treeseed outputs

Handlers do not own:

- provider selection
- provider credentials
- Jira project routing
- capacity policy
- allocation borrowing
- approval state
- raw TreeDX credentials
- unassigned external task creation

The migration should not introduce a generic `human_delegation` handler as the default path. Human teams should execute assignments produced by the same activity-profile contracts and clean handlers (`writer`, `actor`, `estimate`, `releaser`, `reporter`) when their provider capabilities match the assignment; role semantics come from project agent class, prompts, content/tool permissions, branch policy, question policy, and output contracts.

## AgentKernel Integration

The new kernel flow is:

```text
AgentKernel.runAssignment
  validates assignment mode, lease, readiness, capability eligibility, handles, and output bounds
  loads selected AgentRuntimeSpec from MDX
  resolves selected handler
  injects ExecutionProviderAdapter selected by assignment/provider context
  handler builds AgentWorkPackage
  adapter starts or coordinates execution
  kernel/provider runner records mode-run telemetry
  output validator checks assignment output contract
  provider runner completes, returns, or fails assignment
```

Implementation guidance:

- AgentKernel should expose `context.execution` as `ExecutionProviderAdapter` or a narrowed handler-facing facade over it.
- The retired prompt-only adapter should be removed or renamed as part of the hard replacement.
- Existing Codex and Copilot implementations should become `ExecutionProviderAdapter` implementations. Manual print-only and stub execution adapters must not remain selectable server capacity providers; `plan` validates intended execution without selecting any fallback execution provider.
- `AgentRunTrace` remains lower-level trace detail.
- `AgentModeRun` remains the durable assignment-level record.
- Kernel validation must continue to reject invalid acting work, expired leases, output contract violations, missing capability coverage, invalid capability handles, invalid TreeDX proxy handles, and unsupported modes.

## Provider Runner Integration

The target runner loop is:

```text
check in with provider descriptor/observations
poll next assignment
resolve execution provider adapter
renew lease while running/waiting
call adapter.start
record mode run running/waiting/completed
poll adapter if async
collect artifacts and usage
complete/return/fail assignment
report usage actuals
```

The provider runner must support:

- synchronous AI execution
- asynchronous Jira issue lifecycle
- asynchronous workflow or job lifecycle
- returned and retryable blocked states
- non-retryable failed states
- cancellation where the provider supports it
- stale external refs
- idempotent re-entry after runner restart

Adapter selection should be based on the leased assignment and provider-local registry, using these inputs in order:

1. `assignment.executionProviderId`
2. execution provider kind from the capacity envelope or API payload
3. assignment/capacity metadata
4. provider-local adapter registry
5. explicit fallback policy from agent MDX or provider config

The provider runner still owns lease renewal and lifecycle calls. Adapters own only provider-local execution/coordination mechanics.

The runner-level lifecycle wrapper is intentionally provider-local runtime behavior. It does not make external queues authoritative. External refs are telemetry and idempotency aids; the leased `ProviderAssignment` remains the work authorization.

## Jira Reference Provider

Jira is the first concrete human-team reference provider.

Descriptor mapping:

```text
ExecutionProviderDescriptor.kind = human_issue_queue
capabilities = human_review, manual_execution, qa_validation, project_management, issue_queue
nativeUnit = issue_hour or story_point or wall_minute
quotaVisibility = partial
supportsAsync = true
supportsCancel = true
supportsResume = true
```

Start mapping:

```text
AgentWorkPackage.title -> Jira summary
AgentWorkPackage.instructions -> Jira description
expectedOutputs -> checklist or required fields
assignment id -> external idempotency key / issue property
capacity envelope -> hidden issue metadata
decision/proposal refs -> linked metadata
allowed operations/path scope -> ticket acceptance criteria
```

Poll mapping:

```text
To Do / Backlog -> waiting
In Progress -> running
Blocked -> returned if retryable, failed if terminal
Done -> completed
Cancelled / Won't Do -> failed or returned based on lifecycle reason
```

Jira outputs include:

- issue key
- issue URL
- assignee
- status
- comments
- attachments
- PR links
- verification evidence
- time tracking or story points
- blocker reason
- completion summary

Jira must not:

- create Treeseed-approved acting work by itself
- bypass capacity plans
- approve decisions
- mutate allocation policy
- start unleased work
- receive raw TreeDX, GitHub, or secret credentials

The Jira adapter should store the Treeseed assignment id as an idempotency key, issue property, or stable label so duplicate `start` calls after runner restart reuse the existing issue.

Phase F uses:

```text
label = treeseed-assignment-<assignment-id>
issue property = treeseedAssignment
```

Default Jira status mapping is:

```text
Done / Resolved / Closed -> completed
In Progress -> running
Blocked -> blocked, retryable
Cancelled / Won't Do / Wont Do -> failed, terminal
Backlog / To Do / Open / Selected for Development / unknown active status -> waiting
```

## GitHub Issues Reference Provider

GitHub Issues is a human issue queue provider, like Jira, for teams that already coordinate work in GitHub.

Descriptor mapping:

```text
ExecutionProviderDescriptor.kind = human_issue_queue
capabilities = human_review, manual_execution, qa_validation, project_management, issue_queue, github_issue_queue
nativeUnit = issue_activity
quotaVisibility = partial
supportsAsync = true
supportsCancel = true
supportsResume = true
```

Start mapping:

```text
AgentWorkPackage.title -> GitHub issue title
AgentWorkPackage.instructions -> GitHub issue body
expectedOutputs -> required outputs section
assignment id -> stable treeseed-assignment-<assignment-id> label
allowed operations/path scope -> issue acceptance criteria
```

Poll mapping:

```text
open -> waiting
open + configured in-progress label -> running
open + configured blocked label -> blocked, retryable
closed -> completed
configured cancelled label -> failed, terminal
```

GitHub Issues outputs include:

- issue number
- issue URL
- labels
- assignee
- comments
- linked issue and PR references
- blocker reason
- completion summary

GitHub Issues must not use the broad platform `TREESEED_GITHUB_TOKEN` by default. The provider uses `TREESEED_GITHUB_ISSUES_TOKEN`, scoped to the issue queue repository, and adapter snapshots must not expose the token.

## Discord Reference Provider

Discord is a human coordination provider rather than a full project-management queue. It is useful for announcements, feedback requests, and lightweight required-action threads.

Descriptor mapping:

```text
ExecutionProviderDescriptor.kind = human_issue_queue
capabilities = human_coordination, announcement, feedback_request, decision_action, human_review, manual_execution
nativeUnit = thread_activity
quotaVisibility = partial
supportsAsync = true
supportsCancel = true
supportsResume = true
```

Start mapping:

```text
AgentWorkPackage.title -> Discord assignment message heading
AgentWorkPackage.instructions -> Discord assignment message body
assignment id -> deterministic thread name
expectedOutputs and constraints -> thread instructions
```

Discord v1 uses bot-created assignment threads and exact control replies:

```text
treeseed: running -> running
treeseed: blocked <reason> -> blocked, retryable
treeseed: complete <summary> -> completed
treeseed: cancel <reason> -> failed, terminal
```

Discord outputs include:

- source message id
- thread id
- thread URL when guild id is configured
- reply count
- control message metadata
- thread message artifact refs

Discord must not become Treeseed's source of truth. It supplies human coordination signals and artifacts for a leased assignment. The assignment lifecycle, readiness, capability checks, mode-run telemetry, usage, and settlement remain Treeseed records.

## Deterministic Automation Reference Provider

Deterministic execution providers cover processes whose behavior is mostly programmatic rather than model- or human-driven.

Examples:

- GitHub Actions workflow dispatch
- local verification scripts
- release checklist runner
- build/test/deploy diagnostic job
- TreeDX import/export or validation process

Mapping:

```text
AgentWorkPackage -> workflow/job input
externalRef -> workflow run id / job id
artifacts -> logs, reports, changed files, generated evidence
usage -> wall time, CPU time, runner minutes, USD if known
```

Workflow dispatch must use assignment-scoped workflow-operation handles. Missing handles must produce a bounded denied result such as `assignment_workflow_operation_denied`; they must not cause the adapter to reach for raw GitHub tokens or unrelated credentials.

The Phase G reference adapter is selected with `workflow`, `workflow_operation`, `deterministic_workflow`, `github_actions`, or `github_actions_workflow`. It is specifically a GitHub Actions workflow dispatcher, but the agent provider does not receive GitHub credentials. It calls the remote TreeSeed API provider route with its capacity-provider bearer key, leased assignment id, lease token, and workflow handle id. The API dispatch boundary enforces workflow trust policy and resolves repository authority server-side. When the TreeSeed GitHub App is configured, the API resolves the active GitHub App repository grant attached to the assignment project, such as the TreeSeed Test app in staging and the TreeSeed GitHub App in production, and mints a short-lived installation token. When the API is running without GitHub App credentials, it can fall back to approved environment token references: project repository `credentialRef` values such as `env:TREESEED_GITHUB_TOKEN_TREESEED_AI_AGENT`, then the canonical repository-scoped `TREESEED_GITHUB_TOKEN_<OWNER>_<REPO>`, and finally `TREESEED_GITHUB_TOKEN`. It requires an active assignment-scoped `workflow_operation` handle whose operation scope permits `dispatch_workflow`. Capability names make a provider eligible, but the handle plus API-owned repository credential resolution are the execution authorization.

Default deterministic workflow status mapping is:

```text
completed / success / succeeded -> completed
running / in_progress -> running
queued / dispatched / pending / waiting / unknown active status -> waiting
failed / failure / cancelled / timed_out -> failed
```

Workflow usage maps runner minutes, wall time, and duration fields to normalized `ExecutionUsageActual` entries. Workflow artifacts map external job refs, logs URLs, artifacts URLs, reports, and changed-file evidence to normalized `ExecutionArtifactRef` entries. Adapter payloads, snapshots, mode-run metadata, logs, Admin, and CLI output must not contain raw GitHub tokens, workflow secrets, TreeDX proxy handles, or provider credentials.

## AI Provider Reference Provider

Codex is the reference AI provider.

Mapping:

```text
AgentWorkPackage -> structured model prompt
constraints.allowedPaths -> sandbox/worktree path restrictions
constraints.requiredCapabilities -> descriptor capabilities
outputs -> model final response, changed paths, verification hints
usage -> tokens, wall minutes, files changed
```

Existing Codex execution should use `ExecutionProviderAdapter.start`. The adapter should expose descriptors such as `ai_model`, `codex`, `repo_read`, `repo_write`, `planning`, `implementation`, and `verification` as applicable. It should report wall time, token usage when available, changed paths, commands proposed or run, and verification hints as normalized usage and artifacts.

## API And SDK Additions

### SDK Portable DTOs

Add or extend SDK types for:

- `ExecutionCapabilityDemand`
- `ExecutionCapabilitySupply`
- `AgentWorkPackage`
- `AgentExpectedOutput`
- `ExecutionRunSnapshot`
- `ExecutionArtifactRef`
- `ExecutionUsageActual`
- assignment explanation capability gates

SDK should own pure DTOs and pure matching helpers. SDK must not import executable runtime classes from `@treeseed/agent`.

### API Durable Records

Prefer existing records first:

- Continue using `ProviderAvailabilitySession`.
- Continue using `ProviderAssignment`.
- Continue using `AgentModeRun`.
- Continue using canonical `CapacityUsageActual` and ledger settlement records.
- Continue using `ProviderAssignmentExplanation`.

Add durable fields only if existing JSON metadata is insufficient:

- `capacity_provider_assignments.external_ref`
- `capacity_provider_assignments.external_url`
- `capacity_provider_assignments.execution_run_ref_json`
- `agent_mode_runs.external_refs_json`
- `agent_mode_runs.artifacts_json`

Default implementation should store external refs and adapter metadata in existing JSON columns where present. Add typed columns only after query patterns are proven.

### API Matching

Add or formalize pure helpers:

```ts
compileExecutionCapabilityDemand(...)
compileExecutionCapabilitySupply(...)
evaluateExecutionProviderEligibility(...)
buildExecutionProviderAssignmentExplanation(...)
```

These helpers should live in SDK if pure. API should call them during synthesis and lease eligibility so assignment explanations use the same matching rules as runtime validation.

## Admin And CLI Surfaces

Admin `/app/capacity/runtime` should show:

- selected execution provider kind
- provider adapter kind
- required capabilities
- available capabilities
- missing capabilities
- external ref and external URL
- async status
- blocker reason
- output artifacts
- usage actuals

CLI should extend existing commands, not add a scheduler:

- `trsd capacity assignments --json` includes execution provider kind and external refs.
- `trsd capacity assignment-explanation --json` includes demand/supply capability match.
- `trsd capacity mode-runs --json` includes adapter status and artifacts where present.
- Provider lifecycle commands remain lifecycle commands only.

Operator surfaces must label configuration, live observation, durable runtime records, and reconciler-backed lifecycle separately.

## Migration Plan

The lettered phases in this section are the actual implementation sequence for the project:

```text
Phase A -> Phase B -> Phase C -> Phase D -> Phase E -> Phase F -> Phase G -> Phase H -> Phase I
```

Numbered lists elsewhere in this document are inventories or checklists, not alternate implementation phases.

### Phase A: Documentation And Vocabulary

- Add this guide.
- Cross-link it from the agent capacity roadmap, kernel runtime guide, capacity provider runtime guide, and package ownership guide.
- Define the hard replacement strategy for the retired prompt-only adapter.

Acceptance:

- Docs clearly state handler/provider separation.
- Docs include AI, deterministic, and Jira reference flows.
- Docs prohibit new schedulers and task systems.
- The lettered phases are identified as the only implementation phase sequence.
- Numbered lists are labeled as inventories or checklists, not phases.
- The cooperative human-machine orchestration principle is stated explicitly.
- All canonical capacity architecture docs link to this guide.

Verification:

- Run `git diff --check` for changed docs.
- Run `rg -n "[^\\x00-\\x7F]"` on changed docs to keep ASCII-only documentation unless a file already requires Unicode.
- Run `rg -n "Human-Machine Execution Providers|human-machine-providers" docs packages/agent/docs -g "*.md"` to confirm cross-link coverage.
- Review `docs/human-machine-providers.md` headings to confirm only `Phase A` through `Phase I` are implementation phases.

### Phase B: Contract Types

- Add work-package and execution-run DTOs.
- Add capability demand/supply DTOs.
- Add adapter descriptor and observation DTOs.
- Update agent execution config type to include provider capability profile if missing.

Acceptance:

- Types compile.
- Existing agent MDX normalization remains backward-compatible for current frontmatter.
- SDK does not import agent runtime.

### Phase C: Runtime Adapter Replacement

- Replace the retired prompt-only adapter with `ExecutionProviderAdapter` in `packages/agent/src/agents/runtime-types.ts`.
- Migrate `CopilotExecutionAdapter` and `CodexExecutionProviderAdapter`; remove selectable stub/manual execution providers. A `plan` operation validates intended execution without constructing a fake provider, while live execution fails closed when no provider is available.
- Update `agent-runtime.ts` provider registry to register execution-provider adapters.
- Update handlers to call work-package execution instead of legacy prompt execution.

Implementation note: existing semantic handlers that do not delegate work to an execution provider do not need artificial adapter calls. They should keep emitting normalized handler outputs. Handlers that do delegate execution should build an `AgentWorkPackage` and call `context.execution.start(...)`.

Because the migration style is hard replacement, do not keep a long-term legacy prompt-execution bridge. Temporary local helper functions are allowed only inside a single migration patch and must be removed before completion.

Acceptance:

- No production handler calls legacy prompt execution.
- Runtime provider registry returns `ExecutionProviderAdapter`.
- AgentKernel compiles with the new execution context.

### Phase D: Capability Compilation

- Implement `compileExecutionCapabilityDemand`.
- Include MDX `execution.providerProfile.requiredCapabilities`.
- Include `ProjectAgentClass.requiredCapabilities`.
- Include decision/capacity-plan work-unit required capabilities.
- Include handler/work-package required capabilities.
- Include resource needs from workspace/capability handles.
- Implement `compileExecutionCapabilitySupply`.
- Include adapter descriptor capabilities.
- Include provider capability file.
- Include execution provider record kind/capabilities.
- Include check-in capabilities.
- Include aliases, grants, pressure, and concurrency.

Implementation note: Phase D adds pure SDK helpers for demand compilation, supply compilation, eligibility evaluation, and explanation construction. The helpers reuse `ProviderAssignmentExplanation.gates` and assignment metadata first; typed DB columns remain future work until query patterns justify them.

Acceptance:

- Assignment explanations show required, available, and missing capabilities.
- Kernel backstop rejects assignments whose eligibility metadata does not cover requirements.

### Phase E: Provider Runner Async Lifecycle

- Update provider runner to resolve adapter by assignment and execution provider metadata.
- Add async lifecycle support for `start`, `poll`, lease renewal, `resume`, and cancellation where supported.
- Persist external refs in assignment lifecycle output/metadata first.

Implementation note: Phase E implements async adapter lifecycle support by wrapping the selected `ExecutionProviderAdapter` inside the provider runner before injecting it into `AgentKernel`. The wrapper records adapter-level mode-run telemetry, renews the assignment lease while adapter snapshots are `accepted`, `running`, `waiting`, or retryable `blocked`, polls adapter refs when `poll` is supported, and collects normalized usage/artifacts. It does not introduce a second scheduler or queue, and final assignment completion/return/failure remains owned by the existing AgentKernel and provider assignment lifecycle routes.

Acceptance:

- Existing Codex assignment proof still passes.
- A disposable real async-provider account can return `waiting`, then `completed`; this is required before the lifecycle is accepted as provider evidence.
- Lease renewal continues while async execution is in progress.

### Phase F: Jira Reference Adapter

- Implement Jira adapter as the first human-team provider.
- Use provider-local secrets/config, not MDX, for Jira credentials and project routing.
- Store Treeseed assignment id as an idempotency key in Jira.
- Implement `start`, `poll`, `cancel`, `collectUsage`, and `collectArtifacts`.
- Map Jira statuses to normalized execution statuses.
- Return issue key and URL as external refs.

Implementation note: Phase F adds a provider-local Jira `ExecutionProviderAdapter`. Jira credentials and project routing come from provider runtime configuration, not MDX or assignment payloads. The adapter creates or reuses issues by Treeseed assignment id, returns issue key/URL as external refs, maps Jira statuses to normalized execution statuses, and relies on the Phase E runner wrapper for polling, lease renewal, mode-run telemetry, usage, and artifact collection. Jira remains an execution surface; the leased `ProviderAssignment` remains the authorization record.

Acceptance:

- Planning assignment can create a Jira planning/review ticket.
- Acting assignment can create a Jira implementation/review ticket only after accepted capacity-plan and readiness gates pass.
- Jira blocked status returns assignment with retryable blocker by default.
- Jira done status completes assignment with artifacts and usage.

### Phase G: Deterministic Workflow Adapter

- Implement a minimal deterministic workflow adapter using existing assignment-scoped workflow operation handles.
- Support workflow dispatch, polling, artifacts, and usage.
- Do not expose raw GitHub tokens or workflow secrets to provider runners.

Implementation note: Phase G adds a deterministic workflow `ExecutionProviderAdapter` that dispatches workflow jobs only through existing assignment-scoped `workflow_operation` capability handles. The adapter is selected through the same execution-provider registry as AI and Jira providers, relies on the Phase E runner lifecycle wrapper for mode-run telemetry and lease renewal, and uses the existing provider client dispatch route instead of adding a scheduler, queue, API route, or database schema. Missing or invalid workflow handles produce `assignment_workflow_operation_denied` before any external work starts.

Acceptance:

- Adapter dispatches only when assignment has a valid workflow-operation handle.
- Missing handle produces `assignment_workflow_operation_denied`.
- Logs and artifacts are visible in mode-run metadata.

### Phase H: Operator Visibility

- Extend Admin runtime panels and CLI JSON payloads to show execution provider kind, external refs, adapter status, artifacts, usage, and capability match explanation.
- Do not add scheduling controls to Admin or CLI.

Implementation note: Phase H adds read-only operator projections for execution-provider visibility. Admin and CLI render selected execution provider kind, adapter status, external refs, artifacts, usage, and capability demand/supply gates from existing assignment, explanation, and mode-run records. The projection is SDK-owned and pure. No scheduling controls, lifecycle routes, queues, or schema changes are introduced.

Acceptance:

- Steward can explain why a human, AI, or workflow provider received an assignment.
- Developer can debug an external Jira assignment without reading provider-local files directly.
- Raw secrets are never displayed.

### Phase I: Verification And Live Proof

- Add unit tests for capability demand/supply matching.
- Add adapter contract tests for sync, async, blocked, failed, cancelled, and resumed execution.
- Add AgentKernel tests proving handlers remain provider-independent.
- Add provider runner tests for async lease renewal.
- Add Jira adapter tests with mocked Jira API.
- Extend live acceptance only after local mocked proof passes.

Implementation note: Phase I closes the migration by adding a repeatable verification layer over the unified execution provider framework. It consolidates adapter contract tests across AI, human issue queue, and deterministic workflow providers; asserts that removed or unknown execution provider names do not silently fall back to stub work; adds AgentKernel provider-independence coverage; extends provider runner lifecycle tests for cancelled, prepare-rejected, poll-failed, lease-renewal-failed, and poll-incomplete states; and makes the local Docker capacity-provider proof mandatory. Hosted live acceptance remains outside this phase unless staging credentials and disposable provider targets are explicitly available.

Run the complete package-local Phase I proof with:

```bash
npm -w packages/agent run test:human-machine-providers
```

Phase I local live proof requires Docker. If Docker is unavailable, `capacity-provider:test-local` fails with a clear diagnostic instead of skipping. The local smoke also checks Docker storage headroom before building images and points operators to an explicit cleanup command, for example `docker system prune -a --volumes`, instead of pruning shared Docker state automatically.

Acceptance:

- Existing capacity-provider runtime tests pass.
- Existing AgentKernel mode runtime tests pass.
- New human-machine provider tests pass.
- `npm -w packages/agent run test:human-machine-providers` passes.
- `capacity-provider:test-local` fails when Docker is unavailable.
- `capacity-provider:test-local` reports low Docker storage before expensive image builds.
- No legacy prompt-execution usage remains.

## Failure Modes

Required handling:

- provider unavailable after check-in
- assignment lease expires while external Jira issue is open
- external issue deleted
- external workflow cancelled
- adapter cannot map external status
- provider reports capability but cannot issue scoped handle
- handler produces work package requiring unavailable capability
- human provider completes work without required evidence
- AI provider returns output outside assignment contract
- deterministic provider exceeds timeout
- duplicate start request after runner restart
- completion race between poller and webhook
- cancellation after external work has already completed

Default behavior:

- Retryable transient external issues return assignment.
- Terminal provider failures fail assignment.
- Missing readiness blocks acting.
- Missing capability blocks assignment before lease.
- Missing handle blocks execution before external work starts.
- Stale external refs are reported in assignment explanation and mode-run metadata.

## Security And Credentials

Hard requirements:

- External provider credentials stay provider-local or in Treeseed machine config/secret managers.
- Agent MDX must not contain Jira tokens, GitHub tokens, TreeDX credentials, or provider API keys.
- Provider adapters receive only scoped assignment handles and provider-local credentials.
- Repository, workspace, and write operations require assignment-scoped handles.
- Deterministic workflow adapters must dispatch only through assignment-scoped `workflow_operation` handles and must not receive raw GitHub tokens, workflow secrets, or TreeDX proxy handle payloads.
- Human issue queues may see work-package content but must not receive raw secret material.
- External URLs and issue keys are not secrets, but comments and attachments may contain sensitive project context and must respect project/team visibility.
- Logs, Admin, CLI, and assignment payloads must redact credentials and secret-like material.

Provider-local Jira configuration uses:

```text
TREESEED_JIRA_BASE_URL
TREESEED_JIRA_EMAIL
TREESEED_JIRA_API_TOKEN
TREESEED_JIRA_PROJECT_KEY
TREESEED_JIRA_ISSUE_TYPE
TREESEED_JIRA_DONE_STATUSES
TREESEED_JIRA_BLOCKED_STATUSES
TREESEED_JIRA_CANCELLED_STATUSES
TREESEED_JIRA_IN_PROGRESS_STATUSES
TREESEED_JIRA_STORY_POINTS_FIELD
```

`TREESEED_JIRA_API_TOKEN` must never appear in logs, mode-run metadata, assignment payloads, Admin, CLI, tests, or serialized adapter snapshots.

Provider-local GitHub Issues configuration uses:

```text
TREESEED_GITHUB_ISSUES_TOKEN
TREESEED_GITHUB_ISSUES_REPOSITORY
TREESEED_GITHUB_ISSUES_LABELS
TREESEED_GITHUB_ISSUES_IN_PROGRESS_LABELS
TREESEED_GITHUB_ISSUES_BLOCKED_LABELS
TREESEED_GITHUB_ISSUES_CANCELLED_LABELS
```

Provider-local Discord configuration uses:

```text
TREESEED_DISCORD_BOT_TOKEN
TREESEED_DISCORD_CHANNEL_ID
TREESEED_DISCORD_GUILD_ID
TREESEED_DISCORD_THREAD_PREFIX
```

`TREESEED_GITHUB_ISSUES_TOKEN` and `TREESEED_DISCORD_BOT_TOKEN` must never appear in logs, mode-run metadata, assignment payloads, Admin, CLI, tests, or serialized adapter snapshots.

## Compatibility Rules

Because migration style is hard replacement:

- Legacy prompt execution is removed from the final architecture.
- `ExecutionRunSnapshot` may be retained only if renamed or narrowed as a normalized execution snapshot compatibility type.
- Existing MDX `execution.provider` remains supported but is interpreted as a provider preference or local default.
- Existing handlers must migrate in the same implementation sequence as runtime types.
- Existing provider assignment lifecycle routes remain unchanged.
- Existing API records remain primary durable state.
- Do not create a second assignment/task queue for Jira or workflows.
- Do not reintroduce provider task claim/event/complete/fail HTTP routes.

## Interface Change Inventory

This section is an inventory of public API and interface changes expected across the migration phases. It is not an implementation sequence.

Expected changes:

1. Replace the retired prompt-only adapter with `ExecutionProviderAdapter`.
2. Add `AgentWorkPackage`.
3. Add `ExecutionProviderDescriptor`.
4. Add `ExecutionRunSnapshot`.
5. Add `ExecutionCapabilityDemand`.
6. Add `ExecutionCapabilitySupply`.
7. Extend assignment explanations with capability demand/supply gates.
8. Extend mode-run or assignment metadata with external refs/artifacts.
9. Keep provider assignment lifecycle API unchanged.
10. Keep `AgentKernel.runAssignment` as the only provider-assigned execution entrypoint.

## Test Cases And Scenarios

### Capability Matching

- AI provider satisfies `planning + repo_read`.
- Jira provider satisfies `human_review + qa_validation`.
- Workflow provider satisfies `verification + workflow_dispatch`.
- Missing required capability blocks assignment and records missing capability.
- Alias capability satisfies demand only when explicitly declared.
- Preferred capabilities affect ranking but not eligibility.

### AgentKernel

- Acting without readiness returns bounded fallback.
- Assignment with missing eligibility metadata is rejected.
- Handler cannot widen scope through work package.
- Output outside allowed assignment output contract fails.
- Capability handles are validated before adapter start.

### Adapter Lifecycle

- Sync AI adapter completes immediately.
- Async Jira adapter starts, returns waiting, renews lease, then completes.
- Async workflow adapter starts, polls, returns artifact.
- Adapter blocked state maps to return when retryable.
- Adapter terminal failure maps to fail.
- Adapter cancel maps to cancelled or failed according to provider semantics.
- Runner restart resumes by external ref.

### Jira

- Duplicate assignment start reuses existing Jira issue.
- Deleted Jira issue returns retryable failure or failed according to configured policy.
- Blocked Jira status returns assignment with blocker details.
- Done Jira status completes assignment with evidence.
- Jira time tracking maps to usage actuals.
- Jira credentials never appear in logs, assignment payloads, or Admin/CLI surfaces.

### Deterministic Automation

- Missing workflow handle denies dispatch.
- Workflow success completes assignment.
- Workflow failure fails assignment with logs/artifacts.
- Workflow timeout returns or fails according to retryability.
- Workflow dispatch is idempotent by assignment id.

### Regression

- Existing Codex provider assignment proof still works after adapter replacement.
- Existing `src/content/agents` MDX specs continue to normalize.
- Existing capacity CLI inspection commands continue to work.
- Existing Admin capacity runtime page can render older assignments without external refs.

## Explicit Assumptions And Defaults

- Jira is the first concrete human-team reference provider.
- The unified executable adapter interface is anchored in `@treeseed/agent`.
- Portable DTOs and pure matching helpers are exported from `@treeseed/sdk` only where API or CLI/Admin clients need them.
- Migration is a hard replacement of the retired prompt-only call shape, not a long-lived bridge.
- Existing handler names remain semantic; do not create `human_delegation` as the default human path.
- Existing provider assignment lifecycle routes remain canonical.
- Existing API durable records are reused before adding new typed DB columns.
- External refs start in JSON metadata unless query/reporting requirements justify schema columns.
- Admin and CLI remain inspection surfaces, not schedulers.
- This guide is additive and cross-linked; it does not replace existing capacity architecture docs.

## Open Non-Blocking Future Work

- webhook-first external provider updates
- multi-assignee human team capacity modeling
- external SLA/cycle-time learning
- provider substitution recommendations
- cross-provider optimization
- richer Admin repair workflows
- typed DB columns for external refs after query patterns stabilize
