# Agent Kernel Mode Runtime

**Status:** Canonical runtime design and implemented Phase 3 runtime boundary for planning and acting modes
**Date:** 2026-06-16  
**Audience:** Agent runtime, SDK/API contract, provider runtime, Admin, and CLI implementers  

The AgentKernel is owned by `@treeseed/agent`. SDK owns portable contracts used by the kernel, and API owns durable assignment, mode-run, and usage records. Core remains the reusable web runtime and must not own agent scheduling or provider execution.

The human-machine execution provider architecture extends this runtime boundary so handlers build provider-neutral work packages and execution provider adapters perform or coordinate the work across AI, deterministic automation, and human issue queues. The kernel still validates assignment mode, readiness, capability coverage, scoped handles, and output contracts before provider-assigned work can complete. See [Human-Machine Execution Providers](./human-machine-providers.md).

## Runtime Goal

Every bounded agent execution is either planning or acting.

Planning mode prepares work:

- estimates approved decisions
- compares approaches
- summarizes unresolved direction
- drafts proposals
- identifies missing inputs
- improves agent-local documentation when primary planning work is exhausted

Acting mode executes approved work:

- performs decision-linked changes
- runs verification or release work
- updates project content or repositories through scoped tools
- reports blockers
- creates weakness proposals when assigned acting work is exhausted

Handlers do not choose whether they are planning or acting. In the implemented Phase 3 runtime, the provider runner leases an existing `ProviderAssignment`, then calls `AgentKernel.runAssignment`. The kernel validates the mode-bounded scope and invokes the project-owned handler with optional capacity context on `AgentContext`.

## Kernel Input

The kernel receives:

- `ProviderAssignment`
- `AgentCapacityEnvelope`
- `DecisionExecutionInput`
- `AgentKernelProfile` when available from the project agent class
- `AgentKernelPolicy` when available from the project agent class
- project agent definition and handler mapping
- provider execution context
- TreeDX proxy handle when assignment workspace context provides one

The assignment decides the outer scope. The envelope decides budget and capability bounds. The input decides the governance context. The profile and policy decide runtime behavior.

The implemented `AgentContext.capacity` field is optional so existing handlers continue to run outside provider assignment execution. When present, it includes assignment id, provider id, selected mode, capacity envelope, decision input, project agent class/profile/policy metadata, source assignment, readiness metadata, and TreeDX proxy handle metadata.

The implemented `AgentContext.treeDx` field is also optional. Provider runners hydrate it only from assignment proxy handles, apply handle-bound repository/workspace/path/operation defaults locally, and call TreeSeed `/v1/dx/projects/:projectId/...` proxy routes with provider auth, assignment id, and proxy handle id. Handlers can build context, read repository files, search workspaces, write workspace files, commit workspaces, and read back results through that adapter without seeing raw TreeDX service credentials. Model-aware content commands sit above this raw adapter: they render and validate SDK content records before calling the assignment-scoped TreeDX workspace routes.

TreeDX is the default SDK content and repository backend, including local environments. Missing TreeDX configuration is a setup error for content operations; local filesystem content is available only when a caller explicitly passes `contentRepository: { adapter: 'local' }`. Provider runners may still use explicit local mode to bootstrap project-bundled agent specs and tenant handler modules from a synced checkout, but assignment content reads and writes should use TreeDX proxy handles when those handles are present.

Execution provider invocations carry a redacted `agent_tool` catalog derived from the agent content definition and the assignment handles available to the provider runner. Codex receives the same assignment-scoped tool catalog through a local stdio MCP server, while GitHub Issues receives credential-free tool descriptions, route templates, and required header names for human or external automation executors. Descriptors never contain raw TreeDX bearer tokens, provider API keys, GitHub tokens, repository deploy keys, or unredacted proxy payloads.

Agent tool availability is fail-closed. `tools.allowed` is the source of truth for execution-provider callable tools, but a listed tool is exposed only when its runtime requirements are present. TreeDX tools require a scoped proxy handle; model-aware content tools also require matching `contentAccess` model/action policy; worktree tools require a prepared assignment worktree; SDK dispatch tools require a dispatch-capable SDK context. Missing requirements omit the tool from the callable catalog and are recorded in `agentToolCatalog.omitted` metadata. MCP calls validate tool input before execution and emit assignment-scoped tool-call telemetry.

Agent content access is separate from provider tool access. `contentAccess.read`, `contentAccess.write`, and `contentAccess.commit.allowed` define which content models and actions an agent or handler may use. Handlers can call SDK content operations when `contentAccess` allows them without exposing those operations to the execution provider. Execution providers receive only the intersection of `tools.allowed`, `contentAccess`, and assignment runtime handles.

Codex and other AI-focused execution providers should receive assignment-scoped tools directly where their harness supports tool calling. A handler should not require a magic output string to ask the runtime for a tool; missing capability is reported as a structured blocked result. Provider runners capture execution-provider messages, usage, and artifacts as assignment/mode-run telemetry so UI surfaces can follow long-running agent work.

## Mode Selection

Mode selection is API- and kernel-coordinated:

- API selects eligible demand and issues an assignment with a target mode.
- `ModeScheduler`, `QueueObserver`, and `PriorityResolver` provide the kernel-local decision point for planning, acting, fallback, or idle behavior within the assignment envelope.
- Kernel validates that the project agent profile supports the mode.
- Kernel maps assignment context into a bounded handler invocation.
- Kernel applies fallback only within the assignment's allowed mode and output types.

If the assignment is invalid, unsupported, expired, missing acting reservation capacity, outside provider capability, or past retry policy, the kernel returns a structured bounded result instead of widening scope. Provider runner maps retryable bounded results to assignment return when the provider client supports return semantics, and maps non-retryable results to assignment failure.

## Planning Budget

Planning budget can be used for:

- required estimates before acting capacity is committed
- proposal comparison
- readiness analysis
- risk and dependency discovery
- summarization for human decision makers
- proposal drafting when no required planning inputs remain
- agent-local documentation improvements when configured by policy

Planning outputs do not approve work. They feed proposal governance, immutable decisions, allocation policy, and later capacity plans.

## Acting Budget

Acting budget can be used for:

- immutable accepted decision execution
- repository or content edits through scoped project tools
- verification and release steps authorized by the assignment
- diagnostic or repair work explicitly included in the assignment
- producing blockers and weakness proposals when acting cannot continue

Acting mode must stay tied to approved work or explicit runtime authorization. It cannot discover arbitrary project work and begin execution.

## Capacity Envelope Enforcement

The kernel must enforce:

- mode
- budget
- reserved acting capacity
- lease window
- output contract
- capability grants and assignment eligibility metadata
- tool access
- repository/workspace scope
- acting readiness state when supplied by the assignment
- TreeDX proxy handle project/assignment scope and expiry
- explicit output contracts on the assignment, such as allowed statuses and output types
- maximum attempts
- fallback limits

The provider runner enforces provider-local runtime limits as well, such as concurrency, model availability, local queue pressure, and native subscription constraints.

## Handler Contract

Handlers receive a mode-bounded execution context. They should treat it as the only source of allowed work.

Handlers may:

- read selected context
- execute allowed tools
- produce allowed outputs
- report uncertainty, blockers, estimates, usage, and validation results

Handlers must not:

- approve proposals or mutate governance outcomes
- mutate allocation policy
- create unscoped provider work
- request raw TreeDX credentials
- widen mode or capability scope
- hide usage or retries from the mode run

Project agent configuration is the central source for permissions and prompt policy. Handlers may validate and serialize outputs, but they must not widen content, repository, or tool permissions beyond the assignment and agent configuration.

## Fallback Behavior

Fallback is policy-driven and observable.

Planning fallback examples:

- required estimate missing context -> produce missing-input output
- no required estimates -> compare weak proposals
- no proposal work -> draft a proposal idea
- no project planning work -> improve configured agent-local docs

Acting fallback examples:

- approved work blocked -> report blocker
- verification unavailable -> produce diagnostic output
- no acting work in assignment -> return assignment
- repeated failure -> create weakness proposal if policy allows

Every fallback emits a reason on the `AgentModeRun`. When the provider runner maps a bounded fallback to assignment return or failure, the same fallback can be persisted as an `AgentFallbackOutput` for operator review.

Permissions failures are not a pause reason at assignment execution time. Work that the assigned agent cannot access should be rejected before lease. Runtime pauses are reserved for time or capacity shortage and must preserve assignment state for continuation.

## Telemetry

Every bounded attempt emits an `AgentModeRun` record with:

- assignment id
- mode
- selected input
- handler id
- output references
- trace references
- status
- fallback reason
- usage actuals
- validation result

`AgentRunTrace` can remain as lower-level trace detail while the system migrates. `AgentModeRun` is the durable cross-package record for assignment/mode/usage accounting.

The implemented Phase 3 path emits a running mode-run event before handler execution and a terminal mode-run event after success, failure, cancellation, or bounded fallback. Terminal records include trace references to the lower-level `AgentRunTrace` when handler execution reaches the trace path.

## Verification Expectations

Runtime verification should continue to prove:

- planning and acting runs are distinguishable in records and reports
- handlers cannot silently widen assignment scope
- unsupported assignments are returned with reason
- expired leases stop or renew before continuing
- fallback paths are bounded and visible
- usage actuals settle against the assignment and mode run
